#!/usr/bin/env python3
"""启动 Flask 后端服务"""
import os
import sys

# 加载环境变量
from dotenv import load_dotenv
load_dotenv()

# 导入 Flask 应用
from app import app, db

# 创建数据库表
with app.app_context():
    db.create_all()
    print("Database tables created/verified")

# 启动服务器
port = int(os.getenv('PORT', 5001))
print(f"Starting Flask server on port {port}...")
print(f"API URL: http://127.0.0.1:{port}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port, debug=True)
