"""
数据库初始化脚本 - 用于创建和初始化数据库
"""
# 导入系统模块
import sys
# 导入路径处理模块
from pathlib import Path

# 确保当前目录在 Python 路径中，以便能够导入其他模块
sys.path.insert(0, str(Path(__file__).parent))

# 导入Flask应用、数据库实例和初始化函数
from app import app, db, init_db

# 如果这是主程序入口
if __name__ == '__main__':
    # 调用数据库初始化函数
    init_db()
    # 打印完成提示
    print("\n✅ 数据库初始化完成，可以启动服务器了")
    print("   运行：python app.py")