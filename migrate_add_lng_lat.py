#!/usr/bin/env python3
"""
迁移脚本：为 destination 表添加 lng 和 lat 字段
"""

import sqlite3  # 导入模块
import os  # 导入模块

def migrate():  # 定义函数 migrate
    db_path = os.path.join('instance', 'travel.db')  # 设置变量 db_path  # 路径配置db_path  # 路径配置db_path  # 路径配置db_path

    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")  # 调用函数 print
        return

    conn = sqlite3.connect(db_path)  # 设置变量 conn
    cursor = conn.cursor()  # 设置变量 cursor

    # 检查字段是否已存在
    cursor.execute("PRAGMA table_info(destination)")  # 调用方法 execute
    columns = [col[1] for col in cursor.fetchall()]  # 设置变量 columns

    # 添加 lng 字段
    if 'lng' not in columns:  # 条件判断  # 检查是否包含  # 检查是否包含  # 检查是否包含
        cursor.execute("ALTER TABLE destination ADD COLUMN lng FLOAT")  # 调用方法 execute
        print("已添加 lng 字段")  # 调用函数 print
    else:  # 否则  # 否则执行  # 否则执行  # 否则执行
        print("lng 字段已存在")  # 调用函数 print

    # 添加 lat 字段
    if 'lat' not in columns:  # 条件判断  # 检查是否包含  # 检查是否包含  # 检查是否包含
        cursor.execute("ALTER TABLE destination ADD COLUMN lat FLOAT")  # 调用方法 execute
        print("已添加 lat 字段")  # 调用函数 print
    else:  # 否则  # 否则执行  # 否则执行  # 否则执行
        print("lat 字段已存在")  # 调用函数 print

    conn.commit()  # 调用方法 commit
    conn.close()  # 调用方法 close
    print("迁移完成")  # 调用函数 print

if __name__ == '__main__':  # 条件判断
    migrate()  # 调用函数 migrate
