#!/usr/bin/env python3
"""
SQLite 数据库查看工具
用法: python view_db.py [表名]
"""

import sqlite3
import sys
import os
from tabulate import tabulate

DB_PATH = os.path.join(os.path.dirname(__file__), "instance", "travel.db")


def list_tables(conn):
    """列出所有表"""
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("\n数据库中的表:")
    print("-" * 40)
    for i, (table,) in enumerate(tables, 1):
        # 获取行数（表名加引号避免SQL保留字冲突）
        count = conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        print(f"{i}. {table} ({count} 条记录)")
    print()
    return [t[0] for t in tables]


def show_table_schema(conn, table_name):
    """显示表结构"""
    cursor = conn.execute(f'PRAGMA table_info("{table_name}");')
    columns = cursor.fetchall()
    
    print(f"\n表结构: {table_name}")
    print("-" * 60)
    
    schema_data = []
    for col in columns:
        cid, name, dtype, notnull, default, pk = col
        schema_data.append([
            cid,
            name,
            dtype,
            "NOT NULL" if notnull else "",
            "PRIMARY KEY" if pk else "",
            default if default else ""
        ])
    
    print(tabulate(schema_data, 
                   headers=["#", "列名", "类型", "约束", "主键", "默认值"],
                   tablefmt="grid"))


def show_table_data(conn, table_name, limit=20):
    """显示表数据"""
    try:
        # 获取列名
        cursor = conn.execute(f'PRAGMA table_info("{table_name}");')
        columns = [col[1] for col in cursor.fetchall()]
        
        # 获取数据
        cursor = conn.execute(f'SELECT * FROM "{table_name}" LIMIT {limit};')
        rows = cursor.fetchall()
        
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
                    formatted_row.append("NULL")
                elif isinstance(cell, str) and len(cell) > 50:
                    formatted_row.append(cell[:50] + "...")
                else:
                    formatted_row.append(cell)
            formatted_rows.append(formatted_row)
        
        print(tabulate(formatted_rows, headers=columns, tablefmt="grid"))
        
        # 显示总行数
        count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
        if count > limit:
            print(f"\n... 还有 {count - limit} 条记录")
        
    except Exception as e:
        print(f"查询失败: {e}")


def search_data(conn, keyword):
    """搜索数据"""
    tables = list_tables(conn)
    print(f"\n搜索关键字: '{keyword}'")
    print("-" * 60)
    
    found = False
    for table in tables:
        cursor = conn.execute(f'PRAGMA table_info("{table}");')
        columns = [col[1] for col in cursor.fetchall()]
        
        # 构建搜索条件
        conditions = [f"{col} LIKE ?" for col in columns]
        sql = f'SELECT * FROM "{table}" WHERE {" OR ".join(conditions)} LIMIT 5'
        
        try:
            cursor = conn.execute(sql, [f"%{keyword}%"] * len(columns))
            rows = cursor.fetchall()
            
            if rows:
                found = True
                print(f"\n在表 '{table}' 中找到 {len(rows)} 条记录:")
                print(tabulate(rows, headers=columns, tablefmt="simple"))
        except:
            pass
    
    if not found:
        print("未找到匹配的记录")


def export_to_sql(conn, output_file="export.sql"):
    """导出为 SQL 文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in conn.iterdump():
            f.write(f"{line}\n")
    print(f"\n已导出到: {output_file}")


def delete_record(conn, table_name, record_id):
    """删除记录，自动处理外键约束"""
    try:
        # 获取所有外键引用
        cursor = conn.execute(f'PRAGMA foreign_key_list("{table_name}");')
        fks = cursor.fetchall()
        
        deleted_count = 0
        
        # 查询所有其他表，查找外键引用
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        all_tables = [t[0] for t in cursor.fetchall()]
        
        for other_table in all_tables:
            if other_table == table_name:
                continue
            try:
                # 获取其他表的列
                cursor = conn.execute(f'PRAGMA table_info("{other_table}");')
                columns = [col[1] for col in cursor.fetchall()]
                
                # 查找可能的外键列
                for col in columns:
                    if col.endswith('_id') or col == 'user_id':
                        try:
                            cursor.execute(f'SELECT COUNT(*) FROM "{other_table}" WHERE "{col}" = ?', (record_id,))
                            count = cursor.fetchone()[0]
                            if count > 0:
                                cursor.execute(f'DELETE FROM "{other_table}" WHERE "{col}" = ?', (record_id,))
                                deleted_count += cursor.rowcount
                                print(f'  ✓ 已删除 {other_table}.{col} 中 {count} 条')
                        except:
                            pass
                # 也检查 id 字段
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
        
        # 删除主记录
        cursor.execute(f'DELETE FROM "{table_name}" WHERE id = ?', (record_id,))
        deleted_count += cursor.rowcount
        
        conn.commit()
        print(f'✓ 已删除 {table_name} id={record_id}，共 {deleted_count} 条')
        
    except Exception as e:
        conn.rollback()
        print(f'✗ 删除失败: {e}')


def main():
    if not os.path.exists(DB_PATH):
        print(f"数据库文件不存在: {DB_PATH}")
        sys.exit(1)
    
    conn = sqlite3.connect(DB_PATH)
    
    print("=" * 60)
    print("  SQLite 数据库查看工具")
    print(f"  数据库: {DB_PATH}")
    print("=" * 60)
    
    # 如果没有参数，显示帮助
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
    
    # 查看指定表
    elif len(sys.argv) == 2 and not sys.argv[1].startswith('-'):
        table_name = sys.argv[1]
        show_table_schema(conn, table_name)
        show_table_data(conn, table_name)
    
    # 只查看结构
    elif sys.argv[1] == '-s' and len(sys.argv) >= 3:
        show_table_schema(conn, sys.argv[2])
    
    # 查看所有数据
    elif sys.argv[1] == '-a' and len(sys.argv) >= 3:
        show_table_data(conn, sys.argv[2], limit=10000)
    
    # 搜索
    elif sys.argv[1] == '-f' and len(sys.argv) >= 3:
        search_data(conn, sys.argv[2])
    
    # 导出
    elif sys.argv[1] == '-e':
        export_to_sql(conn)
    
    # 删除记录
    elif sys.argv[1] == '-d' and len(sys.argv) >= 4:
        delete_record(conn, sys.argv[2], int(sys.argv[3]))
    
    else:
        print("未知命令，使用: python view_db.py")
    
    conn.close()


if __name__ == "__main__":
    main()
