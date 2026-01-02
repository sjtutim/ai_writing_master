#!/bin/bash

# AI4Write 前后端启动脚本
# 使用方式: ./start.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.pids"
LOG_DIR="$PROJECT_DIR/logs"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 清理旧的 PID 文件
rm -f "$PID_FILE"

echo "🚀 启动 AI4Write 系统..."
echo ""

# 启动后端
echo "📦 启动后端服务 (端口 3001)..."
cd "$PROJECT_DIR/backend"
npm run dev > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "backend:$BACKEND_PID" >> "$PID_FILE"
echo "   ✅ 后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 2

# 启动前端
echo "🎨 启动前端服务 (端口 3000)..."
cd "$PROJECT_DIR/frontend"
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "frontend:$FRONTEND_PID" >> "$PID_FILE"
echo "   ✅ 前端 PID: $FRONTEND_PID"

echo ""
echo "=============================================="
echo "🎉 AI4Write 系统已启动！"
echo ""
echo "   前端地址: http://localhost:3000"
echo "   后端地址: http://localhost:3001"
echo ""
echo "   日志文件:"
echo "   - 后端: $LOG_DIR/backend.log"
echo "   - 前端: $LOG_DIR/frontend.log"
echo ""
echo "   停止服务: ./stop.sh"
echo "   查看日志: tail -f logs/backend.log"
echo "=============================================="
