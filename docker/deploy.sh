#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -b, --backend    只构建并部署后端"
    echo "  -f, --frontend   只构建并部署前端"
    echo "  -a, --all        构建并部署所有服务 (默认)"
    echo "  -n, --no-pull    不拉取基础镜像，使用本地缓存"
    echo "  -c, --cache      使用构建缓存 (默认)"
    echo "  -h, --help       显示帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0                    # 构建部署所有服务"
    echo "  $0 -b                 # 只部署后端"
    echo "  $0 -f                 # 只部署前端"
    echo "  $0 -b --no-pull       # 只部署后端，不拉取基础镜像"
}

BUILD_ALL=true
BUILD_BACKEND=false
BUILD_FRONTEND=false
NO_PULL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backend)
            BUILD_ALL=false
            BUILD_BACKEND=true
            shift
            ;;
        -f|--frontend)
            BUILD_ALL=false
            BUILD_FRONTEND=true
            shift
            ;;
        -a|--all)
            BUILD_ALL=true
            shift
            ;;
        -n|--no-pull)
            NO_PULL=true
            shift
            ;;
        -c|--cache)
            NO_PULL=false
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

if $BUILD_ALL; then
    BUILD_BACKEND=true
    BUILD_FRONTEND=true
fi

echo -e "${GREEN}🚀 开始部署 AI4Write...${NC}"
echo ""

cd docker

build_service() {
    local service=$1
    local context=$2
    local no_pull=$3

    echo -e "${YELLOW}📦 构建 $service 服务...${NC}"

    local build_cmd="docker build"
    if [ "$no_pull" = true ]; then
        build_cmd="$build_cmd --pull=false"
    fi

    if docker image inspect ai4write-$service &>/dev/null; then
        build_cmd="$build_cmd --cache-from ai4write-$service"
    fi

    build_cmd="$build_cmd -t ai4write-$service $context"

    if eval "$build_cmd"; then
        echo -e "${GREEN}✅ $service 构建完成${NC}"
    else
        log_warn "构建缓存无效，重新构建..."
        docker build --pull=false -t ai4write-$service $context
        echo -e "${GREEN}✅ $service 构建完成${NC}"
    fi
}

update_service() {
    local service=$1
    local image=$2

    echo -e "${YELLOW}🔄 更新 $service 服务...${NC}"

    cd "$DOCKER_DIR"

    if [ "$service" = "backend" ]; then
        echo "  停止并删除旧容器..."
        docker-compose stop backend 2>/dev/null || true
        docker-compose rm -f backend 2>/dev/null || true
        docker stop ai4write-backend 2>/dev/null || true
        docker rm -f ai4write-backend 2>/dev/null || true
        echo "  启动 backend..."
        docker-compose up -d backend
    elif [ "$service" = "frontend" ]; then
        echo "  停止并删除旧容器..."
        docker-compose stop frontend 2>/dev/null || true
        docker-compose rm -f frontend 2>/dev/null || true
        docker stop ai4write-frontend 2>/dev/null || true
        docker rm -f ai4write-frontend 2>/dev/null || true
        echo "  启动 frontend..."
        docker-compose up -d frontend
    fi

    cd - > /dev/null

    echo -e "${GREEN}✅ $service 更新完成${NC}"
}

check_network() {
    echo -e "${YELLOW}🔍 检查网络...${NC}"
    if ! docker network inspect ai4write-network &>/dev/null; then
        echo "  创建网络 ai4write-network..."
        docker network create ai4write-network 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ 网络检查完成${NC}"
}

if $BUILD_BACKEND; then
    build_service "backend" "../backend" "$NO_PULL"
fi

if $BUILD_FRONTEND; then
    build_service "frontend" "../frontend" "$NO_PULL"
fi

echo ""
echo -e "${GREEN}🚀 启动服务...${NC}"

check_network

if [ "$BUILD_BACKEND" = true ] || [ "$BUILD_FRONTEND" = true ]; then
    if [ "$BUILD_BACKEND" = true ]; then
        update_service "backend" "ai4write-backend"
    fi

    if [ "$BUILD_FRONTEND" = true ]; then
        update_service "frontend" "ai4write-frontend"
    fi

    echo -e "${YELLOW}🔄 确保代理服务运行...${NC}"
    cd "$DOCKER_DIR"
    if docker ps | grep -q "ai4write-proxy"; then
        echo "  重启代理..."
        docker-compose restart proxy
    else
        echo "  启动代理..."
        docker-compose up -d proxy
    fi
    cd - > /dev/null
    echo -e "${GREEN}✅ 代理服务已就绪${NC}"
fi

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${YELLOW}📝 查看日志:${NC} cd docker && docker-compose logs -f"
echo -e "${YELLOW}🔄 重启服务:${NC} cd docker && docker-compose restart"
echo -e "${YELLOW}🛑 停止服务:${NC} cd docker && docker-compose down"
