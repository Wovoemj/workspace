# ============================================
# 数据库初始化脚本
# ============================================
#
# 【功能说明】
# - 创建数据库表结构
# - 初始化默认数据（可选）
# - 支持命令行参数控制行为
#
# 【使用方法】
# python init_db.py              # 仅创建表
# python init_db.py --with-data  # 创建表+初始化数据
# python init_db.py --force      # 强制重建表（会清空数据）

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
    print("   运行命令：python app.py")
