#!/bin/bash

# Travel Assistant 优化版启动脚本
# 用于快速启动优化后的应用

set -e

echo "🚀 Travel Assistant 优化版启动脚本"
echo "====================================="

# 检查依赖
check_dependencies() {
    echo "🔍 检查依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 未安装，请先安装 Python 3.9+"
        exit 1
    fi
    
    echo "✅ 所有依赖检查通过"
}

# 创建必要的目录
create_directories() {
    echo "📁 创建必要的目录..."
    
    mkdir -p logs
    mkdir -p data
    mkdir -p ssl
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    
    echo "✅ 目录创建完成"
}

# 设置环境变量
setup_environment() {
    echo "⚙️  设置环境变量..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "✅ 已创建 .env 文件，请根据需要修改配置"
    fi
    
    # 加载环境变量
    export $(cat .env | grep -v '^#' | xargs)
    
    echo "✅ 环境变量设置完成"
}

# 启动后端服务
start_backend() {
    echo "🔧 启动后端服务..."
    
    # 启动 Redis
    if ! docker ps | grep -q redis; then
        echo "🚀 启动 Redis..."
        docker run -d --name redis \
            -p 6379:6379 \
            -v $(pwd)/redis.conf:/etc/redis/redis.conf \
            redis:7-alpine redis-server /etc/redis/redis.conf
        echo "✅ Redis 启动完成"
    fi
    
    # 启动应用
    echo "🚀 启动优化版应用..."
    python app_optimized.py &
    APP_PID=$!
    echo "✅ 应用启动完成 (PID: $APP_PID)"
    
    # 等待应用启动
    sleep 5
    
    # 检查应用是否正常
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "✅ 应用健康检查通过"
    else
        echo "❌ 应用启动失败，请检查日志"
        exit 1
    fi
}

# 启动前端服务
start_frontend() {
    echo "🎨 启动前端服务..."
    
    cd frontend/user-web
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        echo "📦 安装前端依赖..."
        npm install
    fi
    
    # 构建优化版本
    echo "🔨 构建前端应用..."
    npm run build
    
    # 启动开发服务器
    echo "🚀 启动前端开发服务器..."
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ 前端启动完成 (PID: $FRONTEND_PID)"
    
    cd ../..
}

# 启动监控服务
start_monitoring() {
    echo "📊 启动监控服务..."
    
    # 启动 Prometheus
    if ! docker ps | grep -q prometheus; then
        echo "🚀 启动 Prometheus..."
        docker run -d --name prometheus \
            -p 9090:9090 \
            -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
            prom/prometheus:latest
        echo "✅ Prometheus 启动完成"
    fi
    
    # 启动 Grafana
    if ! docker ps | grep -q grafana; then
        echo "🚀 启动 Grafana..."
        docker run -d --name grafana \
            -p 3000:3000 \
            -v $(pwd)/monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards \
            -v $(pwd)/monitoring/grafana/datasources:/etc/grafana/provisioning/datasources \
            grafana/grafana:latest
        echo "✅ Grafana 启动完成"
    fi
}

# 运行性能测试
run_performance_test() {
    echo "🔥 运行性能测试..."
    
    # 等待服务完全启动
    sleep 10
    
    # 运行性能测试
    python performance_test.py --concurrency 50 --duration 30
    
    echo "✅ 性能测试完成"
}

# 显示服务状态
show_status() {
    echo "📊 服务状态"
    echo "============"
    
    echo "🔵 后端服务: http://localhost:5000"
    echo "🔵 健康检查: http://localhost:5000/api/health"
    echo "🔵 API 文档: http://localhost:5000/api/docs"
    
    echo "🟢 前端服务: http://localhost:3000"
    
    echo "📊 Prometheus: http://localhost:9090"
    echo "📊 Grafana: http://localhost:3000 (admin/admin)"
    
    echo ""
    echo "🔧 管理命令"
    echo "============"
    echo "停止服务: ./start.sh stop"
    echo "重启服务: ./start.sh restart"
    echo "查看日志: ./start.sh logs"
    echo "性能测试: ./start.sh test"
}

# 停止服务
stop_services() {
    echo "🛑 停止服务..."
    
    # 停止应用
    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
    fi
    
    # 停止前端
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # 停止 Docker 容器
    docker stop redis prometheus grafana 2>/dev/null || true
    docker rm redis prometheus grafana 2>/dev/null || true
    
    echo "✅ 所有服务已停止"
}

# 查看日志
show_logs() {
    echo "📄 查看日志"
    echo "============"
    
    echo "📋 应用日志:"
    tail -f logs/travel_assistant.log
    
    echo ""
    echo "📋 Docker 容器日志:"
    docker logs -f redis
    docker logs -f prometheus
    docker logs -f grafana
}

# 主函数
main() {
    case "${1:-start}" in
        "start")
            check_dependencies
            create_directories
            setup_environment
            start_backend
            start_frontend
            start_monitoring
            show_status
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 2
            main "start"
            ;;
        "logs")
            show_logs
            ;;
        "test")
            run_performance_test
            ;;
        "status")
            show_status
            ;;
        "help")
            echo "使用方法:"
            echo "  ./start.sh start    - 启动所有服务"
            echo "  ./start.sh stop     - 停止所有服务"
            echo "  ./start.sh restart   - 重启所有服务"
            echo "  ./start.sh logs      - 查看日志"
            echo "  ./start.sh test      - 运行性能测试"
            echo "  ./start.sh status   - 显示服务状态"
            echo "  ./start.sh help      - 显示帮助"
            ;;
        *)
            echo "未知命令: $1"
            echo "使用 ./start.sh help 查看帮助"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"