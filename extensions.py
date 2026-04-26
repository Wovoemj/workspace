# ============================================
# Flask扩展模块 - 全局数据库实例
# ============================================
#
# 【功能说明】
# - 创建全局SQLAlchemy数据库实例
# - 避免循环导入问题
# - 供其他模块引用进行数据库操作
#
# 【使用方式】
# from extensions import db
# db.create_all()
# db.session.query(...)

# 导入Flask-SQLAlchemy数据库ORM扩展
from flask_sqlalchemy import SQLAlchemy

# 创建全局SQLAlchemy数据库实例
# 这个实例会在app.py中被初始化（db.init_app(app)）
db = SQLAlchemy()
