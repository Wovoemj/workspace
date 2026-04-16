#!/usr/bin/env python3
"""
更新目的地经纬度数据
"""

import os  # 导入模块
import sys  # 导入模块
import urllib.request  # 导入模块
import urllib.parse  # 导入模块
import json  # 导入模块
import sqlite3  # 导入模块

# 高德 API Key
GAODE_API_KEY = os.environ.get('GAODE_API_KEY', 'c819cfec11f53d9fa4e022a8fb1b5c48')  # 设置变量 GAODE_API_KEY

def geocode_address(address):  # 定义函数 geocode_address
    """调用高德地图地理编码 API"""
    try:  # 尝试执行
        url = f"https://restapi.amap.com/v3/geocode/geo?address={urllib.parse.quote(address)}&key={GAODE_API_KEY}"  # 设置变量 url
        with urllib.request.urlopen(url, timeout=10) as response:  # 设置变量 with urllib.request.urlopen(url, timeout urllib.request.urlopen(url, timeout urllib.request.urlopen(url, timeout
            data = json.loads(response.read().decode())  # 设置变量 data
            if data.get('status') == '1' and data.get('geocodes'):  # 条件判断
                location = data['geocodes'][0].get('location', '')  # 设置变量 location
                if location:
                    lng, lat = location.split(',')  # 设置变量 lng, lat
                    return float(lng), float(lat)
    except Exception as e:  # 捕获异常
        print(f"地理编码失败: {e}")  # 调用函数 print
    return None, None

def update_destinations():  # 定义函数 update_destinations  # 更新destinations  # 更新destinations  # 更新destinations
    db_path = os.path.join('instance', 'travel.db')  # 设置变量 db_path  # 路径配置db_path  # 路径配置db_path  # 路径配置db_path

    conn = sqlite3.connect(db_path)  # 设置变量 conn
    cursor = conn.cursor()  # 设置变量 cursor

    # 获取所有没有经纬度的目的地
    cursor.execute("SELECT id, name, city, province FROM destination WHERE lng IS NULL OR lat IS NULL")  # 调用方法 execute
    destinations = cursor.fetchall()  # 设置变量 destinations

    print(f"找到 {len(destinations)} 个需要更新经纬度的目的地")  # 调用函数 print

    for dest_id, name, city, province in destinations:  # 循环遍历  # 遍历dest_id, name, city, province  # 遍历dest_id, name, city, province  # 遍历dest_id, name, city, province
        # 构建地址
        address = f"{province}{city}{name}"  # 设置变量 address
        lng, lat = geocode_address(address)  # 设置变量 lng, lat

        if lng and lat:
            cursor.execute("UPDATE destination SET lng = ?, lat = ? WHERE id = ?", (lng, lat, dest_id))  # 设置变量 cursor.execute("UPDATE destination SET lng
            conn.commit()  # 调用方法 commit
            print(f"✓ {name}: {lng}, {lat}")  # 调用函数 print
        else:  # 否则  # 否则执行  # 否则执行  # 否则执行
            print(f"✗ {name}: 无法获取经纬度")  # 调用函数 print

    conn.close()  # 调用方法 close
    print("更新完成")  # 调用函数 print

if __name__ == '__main__':  # 条件判断
    update_destinations()  # 调用函数 update_destinations
