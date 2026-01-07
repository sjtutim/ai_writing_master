#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"
cd "$DOCKER_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -b, --backend    只构建并部署后端"
    echo "  -f, --frontend   只构建并部署前端"
    echo "  -a, --all        构建并部署所有服务 (默认)"
    echo "  -n, --no-cache   不使用构建缓存"
    echo "  -h, --help       显示帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0                    # 构建部署所有服务"
    echo "  $0 -b                 # 只部署后端"
    echo "  $0 -f                 # 只部署前端"
    echo "  $0 -b --no-cache      # 只部署后端，不使用缓存"
}

BUILD_ALL=true
BUILD_BACKEND=false
BUILD_FRONTEND=false
NO_CACHE=false

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
        -n|--no-cache)
            NO_CACHE=true
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

build_service() {
    local service=$1
    echo -e "${YELLOW}📦 构建 $service 服务...${NC}"

    local build_opts=""
    if [ "$NO_CACHE" = true ]; then
        build_opts="--no-cache"
    fi

    if docker-compose build $build_opts $service; then
        echo -e "${GREEN}✅ $service 构建完成${NC}"
    else
        echo -e "${RED}❌ $service 构建失败${NC}"
        exit 1
    fi
}

update_service() {
    local service=$1
    echo -e "${YELLOW}🔄 更新 $service 服务...${NC}"

    echo "  停止并删除旧容器..."
    docker-compose stop $service 2>/dev/null || true
    docker-compose rm -f $service 2>/dev/null || true
    docker stop ai4write-$service 2>/dev/null || true
    docker rm -f ai4write-$service 2>/dev/null || true

    echo "  启动 $service..."
    docker-compose up -d $service

    echo -e "${GREEN}✅ $service 更新完成${NC}"
}

check_env() {
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            echo -e "${YELLOW}⚠️  未找到 .env 文件，从 .env.example 复制...${NC}"
            cp .env.example .env
        else
            echo -e "${RED}❌ 未找到 .env 文件${NC}"
            exit 1
        fi
    fi
}

check_network() {
    echo -e "${YELLOW}🔍 检查网络...${NC}"
    local network_name="docker_ai4write-network"
    if ! docker network inspect $network_name &>/dev/null; then
        network_name="ai4write-network"
        if ! docker network inspect $network_name &>/dev/null; then
            echo "  创建网络..."
            docker-compose up -d --no-start 2>/dev/null || true
        fi
    fi
    echo -e "${GREEN}✅ 网络检查完成${NC}"
}

check_env
check_network

if [ "$BUILD_BACKEND" = true ]; then
    build_service "backend"
fi

if [ "$BUILD_FRONTEND" = true ]; then
    build_service "frontend"
fi

echo ""
echo -e "${GREEN}🚀 启动服务...${NC}"

if [ "$BUILD_BACKEND" = true ]; then
    update_service "backend"
fi

if [ "$BUILD_FRONTEND" = true ]; then
    update_service "frontend"
fi

echo -e "${YELLOW}🔄 确保代理服务运行...${NC}"
if docker ps --format '{{.Names}}' | grep -q "ai4write-proxy"; then
    echo "  重启代理..."
    docker-compose restart proxy
else
    echo "  启动代理..."
    docker-compose up -d proxy
fi
echo -e "${GREEN}✅ 代理服务已就绪${NC}"

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""

echo -e "${BLUE}📊 服务状态:${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}📝 常用命令:${NC}"
echo "  查看日志: cd docker && docker-compose logs -f"
echo "  重启服务: cd docker && docker-compose restart"
echo "  停止服务: cd docker && docker-compose down"
