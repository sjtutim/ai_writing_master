#!/bin/bash

# AI4Write 前后端停止脚本
# 使用方式: ./stop.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.pids"

echo "🛑 停止 AI4Write 系统..."
echo ""

# 检查 PID 文件是否存在
if [ ! -f "$PID_FILE" ]; then
    echo "⚠️  未找到运行中的服务 (PID 文件不存在)"
    echo ""
    echo "尝试查找并终止相关进程..."
    
    # 尝试通过端口查找并终止进程
    BACKEND_PID=$(lsof -ti:3001 2>/dev/null)
    FRONTEND_PID=$(lsof -ti:3000 2>/dev/null)
    
    if [ -n "$BACKEND_PID" ]; then
        echo "   终止后端进程 (端口 3001): $BACKEND_PID"
        kill -9 $BACKEND_PID 2>/dev/null
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        echo "   终止前端进程 (端口 3000): $FRONTEND_PID"
        kill -9 $FRONTEND_PID 2>/dev/null
    fi
    
    if [ -z "$BACKEND_PID" ] && [ -z "$FRONTEND_PID" ]; then
        echo "   没有找到运行中的服务"
    fi
    
    exit 0
fi

# 读取 PID 文件并终止进程
while IFS=: read -r name pid; do
    if [ -n "$pid" ]; then
        if kill -0 "$pid" 2>/dev/null; then
            echo "   终止 $name (PID: $pid)..."
            kill "$pid" 2>/dev/null
            
            # 等待进程结束
            sleep 1
            
            # 如果还在运行，强制终止
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null
            fi
            
            echo "   ✅ $name 已停止"
        else
            echo "   ⚠️  $name (PID: $pid) 已经停止"
        fi
    fi
done < "$PID_FILE"

# 清理 PID 文件
rm -f "$PID_FILE"

echo ""
echo "=============================================="
echo "✅ AI4Write 系统已停止"
echo "=============================================="
