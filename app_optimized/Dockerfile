FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements_optimized.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements_optimized.txt

# 复制应用代码
COPY app_optimized.py .
COPY init_db.py .
COPY .env.example .env

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 5000

# 设置环境变量
ENV FLASK_APP=app_optimized.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# 启动命令
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "2", "--timeout", "120", "app_optimized:app"]