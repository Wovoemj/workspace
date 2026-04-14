#!/usr/bin/env python3
"""测试数据库连接和创建表"""
from app import app, db

with app.app_context():
    db.create_all()
    print('Database tables created successfully!')
    print('Registered tables:', list(db.metadata.tables.keys()))
