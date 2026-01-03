#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🚀 开始部署 AI4Write..."

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull

# 构建并启动
echo "🔨 构建镜像（不使用缓存）..."
cd docker
docker-compose build --no-cache

echo "🚀 启动服务..."
docker-compose up -d

echo ""
echo "✅ 部署完成！"
echo ""
echo "📝 查看日志: cd docker && docker-compose logs -f"
echo "🔄 重启服务: cd docker && docker-compose restart"
echo "🛑 停止服务: cd docker && docker-compose down"
