#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

    if [ "$no_pull" = true ]; then
        docker build --pull=false --cache-from ai4write-$service -t ai4write-$service $context
    else
        docker build --cache-from ai4write-$service -t ai4write-$service $context
    fi

    echo -e "${GREEN}✅ $service 构建完成${NC}"
}

update_service() {
    local service=$1
    local image=$2

    echo -e "${YELLOW}🔄 更新 $service 服务...${NC}"

    if docker ps | grep -q "ai4write-$service"; then
        echo "  停止旧容器..."
        docker stop ai4write-$service 2>/dev/null || true
        docker rm ai4write-$service 2>/dev/null || true
    fi

    echo "  启动新容器..."
    local extra_args=""
    if [ "$service" = "backend" ]; then
        extra_args="-e DATABASE_URL -e MINIO_ENDPOINT -e MINIO_PORT -e MINIO_USE_SSL -e MINIO_ACCESS_KEY -e MINIO_SECRET_KEY -e MINIO_BUCKET -e REDIS_URL -e EMBEDDING_API_URL -e EMBEDDING_MODEL -e DEEPSEEK_BASE_URL -e DEEPSEEK_API_KEY -e DEEPSEEK_MODEL -e JWT_SECRET -e JWT_EXPIRES_IN"
    elif [ "$service" = "frontend" ]; then
        extra_args="-e NUXT_PUBLIC_API_BASE_URL"
    fi

    docker run -d \
        --name ai4write-$service \
        --network ai4write-network \
        --restart unless-stopped \
        $extra_args \
        ai4write-$service 2>/dev/null || {
        echo -e "${RED}❌ $service 启动失败${NC}"
        return 1
    }

    echo -e "${GREEN}✅ $service 更新完成${NC}"
}

if $BUILD_BACKEND; then
    build_service "backend" "../backend" "$NO_PULL"
fi

if $BUILD_FRONTEND; then
    build_service "frontend" "../frontend" "$NO_PULL"
fi

echo ""
echo -e "${GREEN}🚀 启动服务...${NC}"

if [ "$BUILD_BACKEND" = true ] || [ "$BUILD_FRONTEND" = true ]; then
    if [ "$BUILD_BACKEND" = true ]; then
        update_service "backend" "ai4write-backend"
    fi

    if [ "$BUILD_FRONTEND" = true ]; then
        update_service "frontend" "ai4write-frontend"
    fi

    if docker ps | grep -q "ai4write-proxy"; then
        echo -e "${YELLOW}🔄 重启代理...${NC}"
        docker restart ai4write-proxy 2>/dev/null || true
    fi
fi

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${YELLOW}📝 查看日志:${NC} cd docker && docker-compose logs -f"
echo -e "${YELLOW}🔄 重启服务:${NC} cd docker && docker-compose restart"
echo -e "${YELLOW}🛑 停止服务:${NC} cd docker && docker-compose down"
