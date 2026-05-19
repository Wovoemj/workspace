#!/usr/bin/env python3
"""
SQLite 数据库查看工具
============================================

【功能说明】
- 命令行工具，用于查看和管理的 SQLite 数据库
- 支持列出所有表、查看表结构和数据、搜索、导出、删除记录
- 使用 tabulate 库美化输出（表格形式）

【使用方法】
python view_db.py              - 列出所有表
python view_db.py 表名         - 查看表结构和数据
python view_db.py -s 表名      - 只查看表结构
python view_db.py -a 表名      - 查看所有数据
python view_db.py -f 关键字    - 搜索数据
python view_db.py -e           - 导出为 SQL 文件
python view_db.py -d 表名 id   - 删除指定记录(自动处理外键)
"""

import sqlite3
import sys
import os
from tabulate import tabulate


# 【数据库路径】SQLite 数据库文件路径
# 位于 instance/travel.db（Flask 默认实例目录）
DB_PATH = os.path.join(os.path.dirname(__file__), "instance", "travel.db")


def list_tables(conn):
    """
    列出数据库中所有表
    
    Args:
        conn: SQLite 数据库连接对象
    
    Returns:
        list: 所有表名列表
    
    【功能说明】
    - 查询 sqlite_master 系统表获取所有用户表
    - 同时显示每个表的记录数
    - 用于快速了解数据库结构
    """
    # 查询所有用户表（type='table'，排除系统表）
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("\n数据库中的表:")
    print("-" * 40)
    
    # 逐个表显示名称和记录数
    for i, (table,) in enumerate(tables, 1):
        # 获取表的记录数（表名加引号避免 SQL 保留字冲突）
        count = conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        print(f"{i}. {table} ({count} 条记录)")
    
    print()
    return [t[0] for t in tables]              # 返回表名列表


def show_table_schema(conn, table_name):
    """
    显示表结构（字段信息）
    
    Args:
        conn: SQLite 数据库连接对象
        table_name: 表名称
    
    【功能说明】
    - 使用 PRAGMA table_info 获取表的字段信息
    - 显示字段序号、名称、类型、约束、主键、默认值
    - 使用 tabulate 以表格形式美化输出
    
    【PRAGMA table_info 返回字段】
    - cid: 字段序号
    - name: 字段名称
    - type: 数据类型
    - notnull: 是否 NOT NULL（1=是，0=否）
    - dflt_value: 默认值
    - pk: 是否主键（1=是，0=否）
    """
    # 获取表结构信息
    cursor = conn.execute(f'PRAGMA table_info("{table_name}");')
    columns = cursor.fetchall()
    
    print(f"\n表结构: {table_name}")
    print("-" * 60)
    
    # 构造表格数据
    schema_data = []
    for col in columns:
        cid, name, dtype, notnull, default, pk = col
        schema_data.append([
            cid,                                  # 字段序号
            name,                                 # 字段名称
            dtype,                                # 数据类型
            "NOT NULL" if notnull else "",        # NOT NULL 约束
            "PRIMARY KEY" if pk else "",          # 主键标记
            default if default else ""            # 默认值
        ])
    
    # 使用 tabulate 美化输出（grid 格式）
    print(tabulate(schema_data, 
                   headers=["#", "列名", "类型", "约束", "主键", "默认值"],
                   tablefmt="grid"))


def show_table_data(conn, table_name, limit=20):
    """
    显示表数据（前 N 条）
    
    Args:
        conn: SQLite 数据库连接对象
        table_name: 表名称
        limit: 显示记录数上限（默认 20 条）
    
    【功能说明】
    - 查询表数据并以表格形式显示
    - 自动截断长文本（超过 50 字符显示前 50 + "..."）
    - NULL 值显示为 "NULL"
    - 如果总记录数超过 limit，提示还有多少条
    
    【格式化规则】
    - None → "NULL"
    - 字符串超过 50 字符 → 截断 + "..."
    - 其他类型 → 原样显示
    """
    try:
        # 获取列名（用于表格头部）
        cursor = conn.execute(f'PRAGMA table_info("{table_name}");')
        columns = [col[1] for col in cursor.fetchall()]
        
        # 查询数据（LIMIT 限制返回行数）
        cursor = conn.execute(f'SELECT * FROM "{table_name}" LIMIT {limit};')
        rows = cursor.fetchall()
        
        # 如果表为空
        if not rows:
            print(f"\n表 {table_name} 为空")
            return
        
        print(f"\n表数据: {table_name} (前 {len(rows)} 条)")
        print("-" * 60)
        
        # 格式化数据（截断长文本）
        formatted_rows = []
        for row in rows:
            formatted_row = []
            for cell in row:
                if cell is None:
                    formatted_row.append("NULL")           # NULL 值
                elif isinstance(cell, str) and len(cell) > 50:
                    formatted_row.append(cell[:50] + "...")  # 截断长文本
                else:
                    formatted_row.append(cell)             # 其他类型原样显示
            formatted_rows.append(formatted_row)
        
        # 使用 tabulate 美化输出
        print(tabulate(formatted_rows, headers=columns, tablefmt="grid"))
        
        # 显示总行数（如果超过 limit）
        count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
        if count > limit:
            print(f"\n... 还有 {count - limit} 条记录")
        
    except Exception as e:
        print(f"查询失败: {e}")


def search_data(conn, keyword):
    """
    在所有表中搜索关键字
    
    Args:
        conn: SQLite 数据库连接对象
        keyword: 搜索关键字
    
    【功能说明】
    - 遍历数据库中所有表
    - 在每个表的每个字段中搜索关键字（LIKE %keyword%）
    - 每个表最多显示 5 条匹配记录
    - 用于快速定位数据
    
    【搜索逻辑】
    1. 获取所有表名
    2. 对每个表，获取所有列名
    3. 构造 WHERE 条件：col1 LIKE %kw% OR col2 LIKE %kw% OR ...
    4. 执行查询并显示结果
    """
    tables = list_tables(conn)
    print(f"\n搜索关键字: '{keyword}'")
    print("-" * 60)
    
    found = False                                  # 是否找到匹配记录
    
    # 遍历所有表
    for table in tables:
        # 获取表的列名
        cursor = conn.execute(f'PRAGMA table_info("{table}");')
        columns = [col[1] for col in cursor.fetchall()]
        
        # 构建搜索条件（所有列都搜索）
        conditions = [f"{col} LIKE ?" for col in columns]
        sql = f'SELECT * FROM "{table}" WHERE {" OR ".join(conditions)} LIMIT 5'
        
        try:
            # 执行搜索（所有列都匹配关键字）
            cursor = conn.execute(sql, [f"%{keyword}%"] * len(columns))
            rows = cursor.fetchall()
            
            # 如果找到匹配记录
            if rows:
                found = True
                print(f"\n在表 '{table}' 中找到 {len(rows)} 条记录:")
                print(tabulate(rows, headers=columns, tablefmt="simple"))
        except:
            # 某些列可能不支持 LIKE（如 BLOB），忽略错误
            pass
    
    # 如果未找到任何匹配
    if not found:
        print("未找到匹配的记录")


def export_to_sql(conn, output_file="export.sql"):
    """
    导出数据库为 SQL 文件
    
    Args:
        conn: SQLite 数据库连接对象
        output_file: 输出文件名（默认 export.sql）
    
    【功能说明】
    - 使用 conn.iterdump() 生成完整的 SQL 导出
    - 包含 CREATE TABLE 和 INSERT 语句
    - 可用于数据库备份或迁移
    
    【输出内容】
    - 所有 CREATE TABLE 语句
    - 所有 INSERT 语句（恢复数据）
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        # iterdump() 生成完整的 SQL 导出
        for line in conn.iterdump():
            f.write(f"{line}\n")
    print(f"\n已导出到: {output_file}")


def delete_record(conn, table_name, record_id):
    """
    删除记录，自动处理外键约束
    
    Args:
        conn: SQLite 数据库连接对象
        table_name: 表名称
        record_id: 要删除的记录 ID
    
    【功能说明】
    - 删除指定 ID 的记录
    - 自动查找并删除所有引用该记录的外键数据
    - 用于解决外键约束导致的删除失败问题
    
    【删除顺序】
    1. 查找所有其他表中引用该记录的外键数据
    2. 删除所有外键引用（避免约束错误）
    3. 最后删除主记录
    
    【外键检测逻辑】
    - 列名以 _id 结尾（如 user_id, product_id）
    - 列名等于 user_id
    - 列名等于 id（检查其他表的主键）
    """
    try:
        # 查询表的外键定义（PRAGMA foreign_key_list）
        cursor = conn.execute(f'PRAGMA foreign_key_list("{table_name}");')
        fks = cursor.fetchall()
        
        deleted_count = 0                        # 删除记录计数器
        
        # ============================================
        # 步骤 1: 删除所有引用该记录的外键数据
        # ============================================
        # 查询所有其他表
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        all_tables = [t[0] for t in cursor.fetchall()]
        
        for other_table in all_tables:
            if other_table == table_name:
                continue                         # 跳过自己
            
            try:
                # 获取其他表的列名
                cursor = conn.execute(f'PRAGMA table_info("{other_table}");')
                columns = [col[1] for col in cursor.fetchall()]
                
                # 查找可能的外键列（列名以 _id 结尾或等于 user_id）
                for col in columns:
                    if col.endswith('_id') or col == 'user_id':
                        try:
                            # 查找引用该记录的外键数据
                            cursor.execute(f'SELECT COUNT(*) FROM "{other_table}" WHERE "{col}" = ?', (record_id,))
                            count = cursor.fetchone()[0]
                            if count > 0:
                                # 删除外键引用
                                cursor.execute(f'DELETE FROM "{other_table}" WHERE "{col}" = ?', (record_id,))
                                deleted_count += cursor.rowcount
                                print(f'  ✓ 已删除 {other_table}.{col} 中 {count} 条')
                        except:
                            pass                 # 忽略错误（列类型不匹配等）
                
                # 也检查 id 字段（如果其他表的 id 等于要删除的 id）
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{other_table}" WHERE "id" = ?', (record_id,))
                    count = cursor.fetchone()[0]
                    if count > 0:
                        cursor.execute(f'DELETE FROM "{other_table}" WHERE "id" = ?', (record_id,))
                        deleted_count += cursor.rowcount
                        print(f'  ✓ 已删除 {other_table}.id 中 {count} 条')
                except:
                    pass
            except:
                pass
        
        # ============================================
        # 步骤 2: 删除主记录
        # ============================================
        cursor.execute(f'DELETE FROM "{table_name}" WHERE id = ?', (record_id,))
        deleted_count += cursor.rowcount
        
        # 提交事务
        conn.commit()
        print(f'✓ 已删除 {table_name} id={record_id}，共 {deleted_count} 条')
        
    except Exception as e:
        # 回滚事务（删除失败）
        conn.rollback()
        print(f'✗ 删除失败: {e}')


def main():
    """
    主函数：解析命令行参数并调用相应功能
    
    【命令行参数】
    - 无参数: 列出所有表
    - 表名: 查看表结构和数据
    - -s 表名: 只查看表结构
    - -a 表名: 查看所有数据
    - -f 关键字: 搜索数据
    - -e: 导出为 SQL 文件
    - -d 表名 id: 删除指定记录
    """
    # 检查数据库文件是否存在
    if not os.path.exists(DB_PATH):
        print(f"数据库文件不存在: {DB_PATH}")
        sys.exit(1)
    
    # 连接数据库
    conn = sqlite3.connect(DB_PATH)
    
    # 打印标题
    print("=" * 60)
    print("  SQLite 数据库查看工具")
    print(f"  数据库: {DB_PATH}")
    print("=" * 60)
    
    # ============================================
    # 根据命令行参数调用不同功能
    # ============================================
    
    # 无参数：显示帮助并列出所有表
    if len(sys.argv) == 1:
        print("\n用法:")
        print("  python view_db.py              - 列出所有表")
        print("  python view_db.py 表名         - 查看表结构和数据")
        print("  python view_db.py -s 表名      - 只查看表结构")
        print("  python view_db.py -a 表名      - 查看所有数据")
        print("  python view_db.py -f 关键字    - 搜索数据")
        print("  python view_db.py -e           - 导出为 SQL 文件")
        print("  python view_db.py -d 表名 id   - 删除指定记录(自动处理外键)")
        print()
        list_tables(conn)
    
    # 查看指定表（表名作为第一个参数）
    elif len(sys.argv) == 2 and not sys.argv[1].startswith('-'):
        table_name = sys.argv[1]
        show_table_schema(conn, table_name)       # 显示表结构
        show_table_data(conn, table_name)         # 显示表数据
    
    # -s 参数：只查看表结构
    elif sys.argv[1] == '-s' and len(sys.argv) >= 3:
        show_table_schema(conn, sys.argv[2])
    
    # -a 参数：查看所有数据（最多 10000 条）
    elif sys.argv[1] == '-a' and len(sys.argv) >= 3:
        show_table_data(conn, sys.argv[2], limit=10000)
    
    # -f 参数：搜索数据
    elif sys.argv[1] == '-f' and len(sys.argv) >= 3:
        search_data(conn, sys.argv[2])
    
    # -e 参数：导出为 SQL 文件
    elif sys.argv[1] == '-e':
        export_to_sql(conn)
    
    # -d 参数：删除记录
    elif sys.argv[1] == '-d' and len(sys.argv) >= 4:
        delete_record(conn, sys.argv[2], int(sys.argv[3]))
    
    # 未知命令
    else:
        print("未知命令，使用: python view_db.py")
    
    # 关闭数据库连接
    conn.close()


if __name__ == "__main__":
    main()
