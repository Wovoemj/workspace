#!/usr/bin/env python3
"""
使用高德地图 POI 搜索 API 爬取景点真实图片
"""
import os
import sys
import json
import time
import sqlite3
import urllib.request
import urllib.parse
import random

# 高德 API Key
GAODE_API_KEY = os.environ.get('GAODE_API_KEY', 'c819cfec11f53d9fa4e022a8fb1b5c48')

def search_poi_photos(name, city=None):
    """通过高德地图 POI 搜索 API 查找景点图片"""
    try:
        params = {
            'key': GAODE_API_KEY,
            'keywords': name,
            'city': city or '全国',
            'citylimit': 'true' if city else 'false',
            'extensions': 'all'
        }

        url = f"https://restapi.amap.com/v3/place/text?{urllib.parse.urlencode(params)}"
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())

            if data.get('status') == '1' and data.get('pois') and len(data['pois']) > 0:
                poi = data['pois'][0]
                photos = poi.get('photos', [])

                # 转换图片 URL 为 HTTPS 并返回
                image_urls = []
                for photo in photos:
                    url = photo.get('url', '')
                    if url:
                        # 转换 http://store.is.autonavi.com 为 https://store.is.autonavi.com
                        url = url.replace('http://', 'https://')
                        image_urls.append(url)

                return {
                    'name': poi.get('name'),
                    'address': poi.get('address'),
                    'location': poi.get('location'),
                    'images': image_urls
                }
    except Exception as e:
        print(f"  搜索失败: {e}")
    return None

def update_destination_cover(dest_id, cover_url):
    """更新景点的封面图片"""
    db_path = os.path.join('instance', 'travel.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE destinations SET cover_image = ? WHERE id = ?", (cover_url, dest_id))
    conn.commit()
    conn.close()
    return True

def main():
    db_path = os.path.join('instance', 'travel.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 获取所有景点
    cursor.execute("SELECT id, name, city, province, cover_image FROM destinations ORDER BY id")
    destinations = cursor.fetchall()

    print(f"共 {len(destinations)} 个景点，开始更新图片...")

    success_count = 0
    skip_count = 0
    fail_count = 0

    for dest_id, name, city, province, current_cover in destinations:
        # 跳过已有有效封面图片的景点
        if current_cover and (current_cover.startswith('http') or current_cover.startswith('/')):
            # 检查是否是外部 URL（已爬取的）
            if current_cover.startswith('http'):
                skip_count += 1
                continue

        print(f"处理 [{dest_id}]: {name} ({city or province})")

        # 获取景点图片
        result = search_poi_photos(name, city)

        if result and result.get('images'):
            cover_url = result['images'][0]
            update_destination_cover(dest_id, cover_url)
            print(f"  ✓ 获取到 {len(result['images'])} 张图片")
            print(f"    封面: {cover_url[:100]}...")
            success_count += 1
        else:
            print(f"  ✗ 未找到图片 (可能需要人工补充)")
            fail_count += 1

        # 请求间隔，避免 API 限流
        time.sleep(0.2 + random.random() * 0.3)

    conn.close()

    print(f"\n===== 完成 =====")
    print(f"成功更新: {success_count}")
    print(f"跳过(已有图片): {skip_count}")
    print(f"失败: {fail_count}")

if __name__ == '__main__':
    main()