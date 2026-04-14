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
import getpass


def validate_password(password):
    """验证密码强度：至少8位，包含大小写字母和数字"""
    if len(password) < 8:
        return False, "密码长度至少8位"
    if not any(c.isupper() for c in password):
        return False, "密码必须包含大写字母"
    if not any(c.islower() for c in password):
        return False, "密码必须包含小写字母"
    if not any(c.isdigit() for c in password):
        return False, "密码必须包含数字"
    return True, ""


def create_admin():
    import sqlite3
    from werkzeug.security import generate_password_hash
    
    # 使用原始SQL直接操作数据库
    db_path = os.path.join(instance_path, "travel.db")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 检查用户表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user'")
    if not cursor.fetchone():
        print("用户表不存在，请先运行后端初始化数据库")
        conn.close()
        return
    
    # ============ 交互式输入用户名 ============
    print("\n=== 创建管理员账号 ===\n")
    
    # 输入用户名
    while True:
        username = input("用户名: ").strip()
        if not username:
            print("用户名不能为空")
            continue
        if len(username) < 3 or len(username) > 20:
            print("用户名长度需在3-20个字符之间")
            continue
        break
    
    # 输入邮箱
    while True:
        email = input("邮箱: ").strip()
        if not email:
            print("邮箱不能为空")
            continue
        if '@' not in email or '.' not in email:
            print("请输入有效的邮箱地址")
            continue
        break
    
    # 输入密码（隐藏）
    while True:
        print("\n密码要求：至少8位，包含大小写字母和数字")
        password = getpass.getpass("设置密码: ")
        if not password:
            print("密码不能为空")
            continue
        valid, msg = validate_password(password)
        if not valid:
            print(msg)
            continue
        
        # 确认密码
        confirm = getpass.getpass("确认密码: ")
        if password != confirm:
            print("两次输入的密码不一致")
            continue
        break
    
    # 检查用户是否已存在
    cursor.execute("SELECT id FROM user WHERE email = ? OR username = ?", (email.lower(), username))
    if cursor.fetchone():
        print(f"\n❌ 用户名或邮箱已存在")
        conn.close()
        return
    
    # 获取表的列信息（动态检测）
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
    
    print(f"\n✅ 管理员创建成功!")
    print(f"   用户名: {username}")
    print(f"   邮箱: {email}")


if __name__ == "__main__":
    from datetime import datetime
    create_admin()