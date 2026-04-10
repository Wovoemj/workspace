#!/usr/bin/env python3
"""创建管理员账号"""
import sys
import os
from datetime import datetime

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 先创建Flask应用上下文
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# 创建临时应用实例
app = Flask(__name__)
# 使用绝对路径确保数据库文件可访问
import os
instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
os.makedirs(instance_path, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "travel.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 导入模型
from sqlalchemy import text
from werkzeug.security import generate_password_hash

# 定义User模型
class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    nickname = db.Column(db.String(80), nullable=False, default="")
    email = db.Column(db.String(120), unique=True)
    phone = db.Column(db.String(20), unique=True)
    avatar_url = db.Column(db.String(500))
    password_hash = db.Column(db.String(255), nullable=False)
    membership_level = db.Column(db.Integer, default=1)
    is_admin = db.Column(db.Boolean, default=False)
    preferences = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

def create_admin():
    import sqlite3
    from werkzeug.security import generate_password_hash
    
    # 使用原始SQL直接操作数据库
    db_path = os.path.join(instance_path, "travel.db")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    username = "admin"
    email = "admin@example.com"
    password = "123456"
    
    # 检查用户表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user'")
    if not cursor.fetchone():
        print("用户表不存在，请先运行后端初始化数据库")
        conn.close()
        return
    
    # 检查用户是否已存在
    cursor.execute("SELECT id FROM user WHERE email = ? OR username = ?", (email.lower(), username))
    if cursor.fetchone():
        print(f"管理员账号已存在")
        conn.close()
        return
    
    # 获取表的列信息
    cursor.execute("PRAGMA table_info(user)")
    columns = [row[1] for row in cursor.fetchall()]
    
    # 准备插入数据 - 只使用表中存在的列
    now = datetime.now().isoformat()
    data = {
        'username': username,
        'email': email.lower(),
        'password_hash': generate_password_hash(password),
        'is_admin': 1,
    }
    
    # 动态添加可选列
    if 'nickname' in columns:
        data['nickname'] = username
    if 'membership_level' in columns:
        data['membership_level'] = 1
    if 'created_at' in columns:
        data['created_at'] = now
    if 'updated_at' in columns:
        data['updated_at'] = now
    
    # 构建SQL
    cols = ', '.join(data.keys())
    placeholders = ', '.join(['?' for _ in data])
    values = list(data.values())
    
    cursor.execute(f"INSERT INTO user ({cols}) VALUES ({placeholders})", values)
    conn.commit()
    conn.close()
    
    print(f"✅ 管理员创建成功!")
    print(f"   用户名: {username}")
    print(f"   邮箱: {email}")
    print(f"   密码: {password}")

if __name__ == "__main__":
    from datetime import datetime
    create_admin()
