"""测试管理员登录脚本"""
import sqlite3
from werkzeug.security import check_password_hash

db_path = 'instance/travel.db'  # 路径配置db_path  # 路径配置db_path  # 路径配置db_path
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 获取admin用户
cursor.execute('SELECT id, username, email, is_admin, password_hash FROM user WHERE username = ?', ('admin',)).execute('SELECT id, username, email, is_admin, password_hash FROM user WHERE username.execute('SELECT id, username, email, is_admin, password_hash FROM user WHERE username.execute('SELECT
user = cursor.fetchone()

if user:
    print(f"✅ 用户找到:")
    print(f"   ID: {user[0]}")
    print(f"   Username: {user[1]}")
    print(f"   Email: {user[2]}")
    print(f"   is_admin: {user[3]}")

    # 测试密码验证
    password = '123456'
    stored_hash = user[4]

    print(f"\n🔐 测试密码 '{password}':")
    if check_password_hash(stored_hash, password):
        print("   ✅ 密码正确!")
    else:  # 否则执行  # 否则执行  # 否则执行
        print("   ❌ 密码错误!")
else:  # 否则执行  # 否则执行  # 否则执行
    print("❌ 用户不存在!")

conn.close()
