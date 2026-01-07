#!/bin/bash

#######################################################################
# AI4Write 系统清理脚本
# 功能：清理 Docker 镜像、临时文件、构建缓存等
#######################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"

usage() {
    echo -e "${BLUE}AI4Write 系统清理脚本${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -a, --all           清理所有（默认行为）"
    echo "  -d, --docker        只清理 Docker 资源"
    echo "  -t, --temp          只清理临时文件"
    echo "  -c, --cache         只清理构建缓存"
    echo "  -i, --images        只清理无用镜像"
    echo "  -v, --volumes       只清理无用数据卷"
    echo "  -n, --dry-run       预览模式，不实际删除"
    echo "  -f, --force         强制清理，不提示确认"
    echo "  -h, --help          显示帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0                  # 清理所有"
    echo "  $0 -n               # 预览要清理的内容"
    echo "  $0 -f -d            # 强制清理 Docker 资源"
    echo "  $0 -c               # 只清理构建缓存"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

confirm() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    read -p "$1 [y/N]: " response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

get_docker_size() {
    docker system df --format '{{.Size}}' 2>/dev/null | tail -1 || echo "0B"
}

get_docker_images_size() {
    docker images --format '{{.Size}}' 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0"
}

cleanup_docker_all() {
    log_info "清理 Docker 所有资源..."

    local before_size=$(get_docker_size)
    log_info "清理前 Docker 使用空间: $before_size"

    log_info "清理停止的容器..."
    docker container prune -f 2>/dev/null || true

    log_info "清理网络（不使用的自定义网络）..."
    docker network prune -f 2>/dev/null || true

    log_info "清理构建缓存..."
    docker builder prune -f 2>/dev/null || true

    log_info "清理悬挂镜像..."
    docker image prune -f 2>/dev/null || true

    log_info "清理无用镜像..."
    docker image prune -a -f 2>/dev/null || true

    log_info "清理临时文件..."
    docker system prune -f 2>/dev/null || true

    local after_size=$(get_docker_size)
    log_success "Docker 清理完成"
    log_info "清理后 Docker 使用空间: $after_size"
}

cleanup_docker_images() {
    log_info "清理无用 Docker 镜像..."

    local dangling=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l)
    if [ "$dangling" -gt 0 ]; then
        log_info "删除 $dangling 个悬挂镜像..."
        docker image prune -f 2>/dev/null || true
    fi

    local unused=$(docker images -f "dangling=true" -q 2>/dev/null)
    if [ -n "$unused" ]; then
        log_info "删除未使用的镜像..."
        docker image prune -a -f 2>/dev/null || true
    fi

    log_success "镜像清理完成"
}

cleanup_docker_volumes() {
    log_info "清理无用 Docker 数据卷..."

    local volumes=$(docker volume ls -qf dangling=true 2>/dev/null)
    if [ -n "$volumes" ]; then
        if confirm "删除所有悬挂数据卷？这可能会导致数据丢失！"; then
            docker volume prune -f 2>/dev/null || true
            log_success "数据卷清理完成"
        fi
    else
        log_info "没有需要清理的悬挂数据卷"
    fi
}

cleanup_temp_files() {
    log_info "清理临时文件..."

    local cleaned=0

    if [ -d "$PROJECT_DIR/backend/dist" ]; then
        local size=$(du -sh "$PROJECT_DIR/backend/dist" 2>/dev/null | cut -f1)
        log_info "  删除 backend/dist ($size)..."
        rm -rf "$PROJECT_DIR/backend/dist" 2>/dev/null || true
        cleaned=$((cleaned + 1))
    fi

    if [ -d "$PROJECT_DIR/backend/node_modules" ]; then
        local size=$(du -sh "$PROJECT_DIR/backend/node_modules" 2>/dev/null | cut -f1)
        log_info "  删除 backend/node_modules ($size)..."
        rm -rf "$PROJECT_DIR/backend/node_modules" 2>/dev/null || true
        cleaned=$((cleaned + 1))
    fi

    if [ -d "$PROJECT_DIR/frontend/.nuxt" ]; then
        local size=$(du -sh "$PROJECT_DIR/frontend/.nuxt" 2>/dev/null | cut -f1)
        log_info "  删除 frontend/.nuxt ($size)..."
        rm -rf "$PROJECT_DIR/frontend/.nuxt" 2>/dev/null || true
        cleaned=$((cleaned + 1))
    fi

    if [ -d "$PROJECT_DIR/frontend/node_modules" ]; then
        local size=$(du -sh "$PROJECT_DIR/frontend/node_modules" 2>/dev/null | cut -f1)
        log_info "  删除 frontend/node_modules ($size)..."
        rm -rf "$PROJECT_DIR/frontend/node_modules" 2>/dev/null || true
        cleaned=$((cleaned + 1))
    fi

    if [ -d "$PROJECT_DIR/frontend/.output" ]; then
        local size=$(du -sh "$PROJECT_DIR/frontend/.output" 2>/dev/null | cut -f1)
        log_info "  删除 frontend/.output ($size)..."
        rm -rf "$PROJECT_DIR/frontend/.output" 2>/dev/null || true
        cleaned=$((cleaned + 1))
    fi

    find "$PROJECT_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_DIR" -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_DIR" -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_DIR" -type f -name "*.pyc" -delete 2>/dev/null || true
    find "$PROJECT_DIR" -type f -name "*.pyo" -delete 2>/dev/null || true

    if [ $cleaned -gt 0 ]; then
        log_success "临时文件清理完成"
    else
        log_info "没有需要清理的临时文件"
    fi
}

cleanup_cache() {
    log_info "清理构建缓存..."

    local cleaned=0

    if [ -d "$PROJECT_DIR/backend/.prisma" ]; then
        log_info "  删除 backend/.prisma..."
        rm -rf "$PROJECT_DIR/backend/.prisma" 2>/dev/null || true
        cleaned=$((cleaned + 1))
    fi

    if command -v npm &> /dev/null; then
        log_info " 清理 npm 缓存..."
        npm cache clean --force 2>/dev/null || true
    fi

    if command -v yarn &> /dev/null; then
        log_info " 清理 yarn 缓存..."
        yarn cache clean 2>/dev/null || true
    fi

    if [ -d "$HOME/.cache/pip" ]; then
        log_info " 清理 pip 缓存..."
        rm -rf "$HOME/.cache/pip" 2>/dev/null || true
    fi

    if command -v docker &> /dev/null; then
        log_info " 清理 Docker 构建缓存..."
        docker builder prune -f 2>/dev/null || true
    fi

    log_success "构建缓存清理完成"
}

dry_run() {
    log_info "=== 预览模式 - 以下内容将会被清理 ==="
    echo ""

    echo -e "${YELLOW}Docker 资源:${NC}"
    docker system df 2>/dev/null || true
    echo ""

    echo -e "${YELLOW}临时文件:${NC}"
    [ -d "$PROJECT_DIR/backend/dist" ] && echo "  backend/dist" || true
    [ -d "$PROJECT_DIR/backend/node_modules" ] && echo "  backend/node_modules" || true
    [ -d "$PROJECT_DIR/frontend/.nuxt" ] && echo "  frontend/.nuxt" || true
    [ -d "$PROJECT_DIR/frontend/node_modules" ] && echo "  frontend/node_modules" || true
    [ -d "$PROJECT_DIR/frontend/.output" ] && echo "  frontend/.output" || true
    echo ""

    echo -e "${YELLOW}构建缓存:${NC}"
    [ -d "$PROJECT_DIR/backend/.prisma" ] && echo "  backend/.prisma" || true
    echo ""

    echo -e "${YELLOW}Docker 悬挂镜像:${NC}"
    docker images -f "dangling=true" -q 2>/dev/null | head -5 || true
    echo ""

    echo -e "${YELLOW}Docker 悬挂数据卷:${NC}"
    docker volume ls -qf dangling=true 2>/dev/null | head -5 || true
    echo ""

    log_info "预览完成"
}

cleanup_all() {
    log_info "========================================"
    log_info "     开始全面清理 AI4Write 系统"
    log_info "========================================"
    echo ""

    if ! confirm "确定要清理所有临时文件和 Docker 资源吗？"; then
        log_info "已取消"
        exit 0
    fi

    echo ""
    cleanup_temp_files
    echo ""
    cleanup_cache
    echo ""
    cleanup_docker_all
    echo ""

    log_info "========================================"
    log_success "     系统清理完成！"
    log_info "========================================"
    echo ""
    log_info "建议：重启 Docker 服务以释放更多空间"
    echo "  Linux:   sudo systemctl restart docker"
    echo "  macOS:   通过 Docker Desktop 重启"
}

FORCE=false
DRY_RUN=false
CLEANUP_ALL=true
CLEANUP_DOCKER=false
CLEANUP_TEMP=false
CLEANUP_CACHE=false
CLEANUP_IMAGES=false
CLEANUP_VOLUMES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--all)
            CLEANUP_ALL=true
            shift
            ;;
        -d|--docker)
            CLEANUP_ALL=false
            CLEANUP_DOCKER=true
            shift
            ;;
        -t|--temp)
            CLEANUP_ALL=false
            CLEANUP_TEMP=true
            shift
            ;;
        -c|--cache)
            CLEANUP_ALL=false
            CLEANUP_CACHE=true
            shift
            ;;
        -i|--images)
            CLEANUP_ALL=false
            CLEANUP_IMAGES=true
            shift
            ;;
        -v|--volumes)
            CLEANUP_ALL=false
            CLEANUP_VOLUMES=true
            shift
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    dry_run
    exit 0
fi

if [ "$CLEANUP_ALL" = true ]; then
    cleanup_all
elif [ "$CLEANUP_DOCKER" = true ]; then
    cleanup_docker_all
elif [ "$CLEANUP_TEMP" = true ]; then
    cleanup_temp_files
elif [ "$CLEANUP_CACHE" = true ]; then
    cleanup_cache
elif [ "$CLEANUP_IMAGES" = true ]; then
    cleanup_docker_images
elif [ "$CLEANUP_VOLUMES" = true ]; then
    cleanup_docker_volumes
else
    cleanup_all
fi
