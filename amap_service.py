#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯地图API数据获取与缓存服务
功能：
1. 通过腾讯地图POI搜索获取景点/酒店/餐厅等数据
2. 数据自动存入SQLite数据库（destinations + product表）
3. 智能缓存：已获取的城市数据不再重复调用API
4. 每日限额6000次，优先保障增量更新

使用方法：
    python amap_service.py --city 北京 --keyword 景点
    python amap_service.py --city 上海 --keyword 酒店
    python amap_service.py --batch-cities 北京,上海,杭州,成都
    python amap_service.py --stats          # 查看缓存统计
"""

import os
import sys
import json
import time
import sqlite3
import argparse
import requests
from datetime import datetime
from typing import List, Dict, Optional

# ==================== 配置 ====================
QQ_MAP_KEY = "JLSBZ-SRPKI-2LXGS-UUYM7-NSDAQ-5PBY3"
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "travel.db")

# 腾讯地图API接口
QQ_MAP_BASE = "https://apis.map.qq.com"
GEOCODE_URL = f"{QQ_MAP_BASE}/ws/geocoder/v1"
POI_SEARCH_URL = f"{QQ_MAP_BASE}/ws/place/v1/search"

# 常用城市坐标映射表（避免每次调用地理编码API，节省配额）
CITY_COORDINATES = {
    "北京": (116.407526, 39.90403),
    "上海": (121.473701, 31.230416),
    "杭州": (120.15507, 30.274084),
    "成都": (104.066541, 30.572269),
    "西安": (108.93977, 34.341574),
    "广州": (113.264434, 23.129162),
    "深圳": (114.057868, 22.543099),
    "南京": (118.796877, 32.060255),
    "苏州": (120.585316, 31.298886),
    "重庆": (106.551556, 29.563009),
    "武汉": (114.305393, 30.593099),
    "长沙": (112.938814, 28.228209),
    "厦门": (118.089425, 24.479833),
    "青岛": (120.38264, 36.067082),
    "大连": (121.614682, 38.914003),
    "昆明": (102.832891, 24.880095),
    "桂林": (110.179953, 25.234479),
    "拉萨": (91.140856, 29.645554),
    "乌鲁木齐": (87.616848, 43.825592),
    "哈尔滨": (126.534967, 45.803775),
    "郑州": (113.625368, 34.746599),
    "洛阳": (112.434468, 34.663041),
    "黄山": (118.317325, 29.714655),
    "天津": (117.200983, 39.084158),
    "宁波": (121.550357, 29.874556),
    "无锡": (120.31191, 31.491169),
    "福州": (119.296494, 26.074508),
    "济南": (117.1205, 36.651216),
    "沈阳": (123.42944, 41.835441),
    "长春": (125.323544, 43.817071),
    "石家庄": (114.514859, 38.042306),
    "太原": (112.548879, 37.87059),
    "兰州": (103.834303, 36.061089),
    "银川": (106.230909, 38.487193),
    "西宁": (101.778916, 36.623178),
    "呼和浩特": (111.74918, 40.841389),
    "海口": (110.349228, 20.017377),
    "南宁": (108.366543, 22.817002),
    "贵阳": (106.630153, 26.647661),
    "南昌": (115.857963, 28.68202),
    "合肥": (117.227239, 31.820586),
    "温州": (120.699366, 27.994267),
    "泉州": (118.675675, 24.874332),
    "烟台": (121.447935, 37.463822),
    "威海": (122.12042, 37.513092),
    "丽江": (100.233026, 26.872108),
    "大理": (100.225668, 25.589449),
    "三亚": (109.508268, 18.247872),
    "珠海": (113.576726, 22.270715),
    "珠海": (113.576726, 22.270715),
    "佛山": (113.121416, 23.021548),
    "东莞": (113.746262, 23.046237),
    "中山": (113.392782, 22.517645),
    "惠州": (114.415801, 23.111847),
    "绍兴": (120.580232, 30.029752),
    "嘉兴": (120.755486, 30.74501),
    "扬州": (119.421003, 32.399108),
    "镇江": (119.425836, 32.187849),
    "泰州": (119.923116, 32.455778),
    "南通": (120.894291, 31.980171),
    "盐城": (120.163561, 33.377631),
    "徐州": (117.284124, 34.205768),
    "连云港": (119.221611, 34.596653),
    "淮安": (119.015285, 33.610353),
    "宿迁": (118.275162, 33.963232),
    "常州": (119.974061, 31.811226),
    "湖州": (120.086809, 30.894348),
    "金华": (119.649506, 29.089524),
    "衢州": (118.859457, 28.970619),
    "舟山": (122.207216, 29.985295),
    "台州": (121.420757, 28.656386),
    "丽水": (119.922796, 28.46763),
}

# 关键词到腾讯地图category的映射
KEYWORD_CATEGORY_MAP = {
    "景点": "风景名胜",
    "酒店": "住宿服务",
    "餐饮": "餐饮服务",
    "购物": "购物服务",
    "交通": "交通设施",
    "娱乐": "生活服务",
}

# 城市列表（可扩展）
DEFAULT_CITIES = [
    "北京", "上海", "杭州", "成都", "西安", "广州", "深圳",
    "南京", "苏州", "重庆", "武汉", "长沙", "厦门", "青岛",
    "大连", "昆明", "桂林", "拉萨", "乌鲁木齐", "哈尔滨"
]

# ==================== API请求 ====================

def qqmap_get(url: str, params: dict, retries: int = 2) -> Optional[dict]:
    """带重试的腾讯地图API GET请求"""
    params["key"] = QQ_MAP_KEY
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, params=params, timeout=15)
            data = resp.json()
            # 腾讯地图返回 status=0 表示成功
            if data.get("status") == 0:
                return data
            # 配额超限
            if data.get("status") == 301 or "quota" in str(data).lower():
                print(f"[警告] API配额超限或无效Key: {data.get('message', '')}")
                return None
            if data.get("status") != 0:
                print(f"[警告] API返回错误: {data.get('message', '')} (status={data.get('status')})")
        except requests.exceptions.RequestException as e:
            print(f"[错误] 请求失败(尝试{attempt+1}/{retries+1}): {e}")
            if attempt < retries:
                time.sleep(1)
    return None


def get_city_coordinates(city: str) -> Optional[tuple]:
    """获取城市中心坐标，优先使用本地缓存"""
    # 优先查本地映射表（节省API配额）
    city_clean = city.replace("市", "").replace("省", "")
    for k, v in CITY_COORDINATES.items():
        if city_clean in k or k in city_clean:
            return v
    # 本地没有则调用API
    data = qqmap_get(GEOCODE_URL, {"address": city})
    if data and data.get("status") == 0:
        result = data.get("result", {})
        location = result.get("location", {})
        return location.get("lng"), location.get("lat")
    return None


def check_key() -> bool:
    """验证腾讯地图Key是否有效"""
    data = qqmap_get(GEOCODE_URL, {"address": "北京"})
    if data and data.get("status") == 0:
        return True
    print("[错误] 腾讯地图API Key无效或未启用WebService API，请检查控制台配置")
    print("        控制台地址: https://lbs.qq.com/dev/console")
    return False


def search_poi(city: str, keyword: str = "", category: str = "", page: int = 1, page_size: int = 20) -> List[dict]:
    """搜索POI（腾讯地图）"""
    params = {
        "keyword": keyword or category or "景点",
        "boundary": f"region({city},0)",  # 0=模糊匹配，1=精确城市名
        "page_size": page_size,
        "page_index": page,
        "output": "json",
    }
    
    data = qqmap_get(POI_SEARCH_URL, params)
    if not data:
        return []
    
    pois = data.get("data", []) or []
    return pois


def fetch_all_poi(city: str, keyword: str = "", category: str = "", max_count: int = 100) -> List[dict]:
    """分页获取POI，最多max_count条"""
    all_pois = []
    page = 1
    page_size = 20
    while len(all_pois) < max_count:
        pois = search_poi(city, keyword, category, page, page_size)
        if not pois:
            break
        all_pois.extend(pois)
        if len(pois) < page_size:
            break
        page += 1
        time.sleep(0.2)  # 控制请求频率
    return all_pois[:max_count]


# ==================== 数据库操作 ====================

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_cached_city_names() -> set:
    """获取数据库中已缓存的城市名称集合"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT city FROM destinations WHERE city IS NOT NULL")
    cities = {row["city"].replace("市", "").replace("省", "") for row in cursor.fetchall() if row["city"]}
    conn.close()
    return cities


def get_destination_count_by_city(city: str) -> int:
    """获取某城市的景点数量"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM destinations WHERE city LIKE ?", (f"%{city}%",))
    count = cursor.fetchone()[0]
    conn.close()
    return count


def poi_to_destination(poi: dict, city: str = "") -> dict:
    """将腾讯地图POI数据转换为本项目destination格式"""
    # 解析经纬度
    lng, lat = None, None
    location = poi.get("location", {})
    if isinstance(location, dict):
        lng = location.get("lng")
        lat = location.get("lat")
    elif isinstance(location, str) and "," in location:
        parts = location.split(",")
        lng, lat = float(parts[0]), float(parts[1])

    # 解析地址
    address = poi.get("address", "")
    if not address:
        address = poi.get("addr", "")

    # 解析分类
    category = poi.get("category", "")
    
    # 解析电话
    tel = poi.get("tel", "")

    # 省份/城市
    province = poi.get("province", "")
    city_name = poi.get("city", "") or city

    return {
        "name": poi.get("title", "").strip(),
        "city": city_name,
        "province": province,
        "description": f"位于{address or city_name}。{category}",
        "cover_image": None,  # 腾讯地图POI不含图片URL，需后续补充
        "rating": 4.5,  # 腾讯地图无评分，用默认值
        "ticket_price": 0.0,  # 腾讯地图无价格，用默认值
        "open_time": "",
        "lng": lng,
        "lat": lat,
        "address": address,
        "tel": tel,
    }


def save_destinations(destinations: List[dict]) -> int:
    """保存景点到destinations表，跳过已存在的（按name+city去重）"""
    if not destinations:
        return 0

    conn = get_db_connection()
    cursor = conn.cursor()
    inserted = 0
    skipped = 0

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for dest in destinations:
        if not dest.get("name"):
            continue
        # 检查是否已存在
        cursor.execute(
            "SELECT id FROM destinations WHERE name = ? AND city = ?",
            (dest["name"], dest.get("city", ""))
        )
        if cursor.fetchone():
            skipped += 1
            continue

        cursor.execute("""
            INSERT INTO destinations (name, city, province, description, cover_image, rating, ticket_price, open_time, lng, lat, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dest["name"],
            dest.get("city", ""),
            dest.get("province", ""),
            dest.get("description", ""),
            dest.get("cover_image"),
            dest.get("rating", 4.5),
            dest.get("ticket_price", 0),
            dest.get("open_time", ""),
            dest.get("lng"),
            dest.get("lat"),
            now, now
        ))
        inserted += 1

    conn.commit()
    conn.close()
    print(f"  -> destinations: 新增 {inserted} 条, 跳过 {skipped} 条")
    return inserted


def save_products_from_destinations(destinations: List[dict], category: str = "ticket") -> int:
    """基于景点生成product产品数据"""
    if not destinations:
        return 0

    conn = get_db_connection()
    cursor = conn.cursor()
    inserted = 0
    skipped = 0
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    import random

    for dest in destinations:
        name = dest.get("name", "")
        if not name:
            continue

        # 检查是否已有对应产品
        cursor.execute("SELECT id FROM product WHERE name = ?", (name,))
        if cursor.fetchone():
            skipped += 1
            continue

        # 查找关联的destination_id
        cursor.execute("SELECT id FROM destinations WHERE name = ? AND city = ?", (name, dest.get("city", "")))
        row = cursor.fetchone()
        destination_id = row["id"] if row else None

        price = dest.get("ticket_price", 0) or 0
        if price == 0:
            price = random.randint(30, 200)

        cursor.execute("""
            INSERT INTO product (type, name, description, price, original_price, status, tags, images, rating, review_count, view_count, sales_count, created_at, updated_at, subtitle, destination_id, category, cover_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            category,
            name,
            dest.get("description", ""),
            price,
            round(price * 1.2, 2),
            "active",
            json.dumps([category]),
            json.dumps([]),
            dest.get("rating", 4.5),
            random.randint(10, 999),
            random.randint(50, 5000),
            random.randint(0, 200),
            now, now,
            f"{dest.get('city','')}热门推荐",
            destination_id,
            category,
            dest.get("cover_image")
        ))
        inserted += 1

    conn.commit()
    conn.close()
    print(f"  -> products: 新增 {inserted} 条, 跳过 {skipped} 条")
    return inserted


# ==================== 主流程 ====================

def fetch_and_save_city_pois(city: str, keyword: str = "景点", category: str = "", max_count: int = 100, skip_cached: bool = True) -> dict:
    """获取并保存某城市的POI数据"""
    result = {"city": city, "fetched": 0, "saved_dest": 0, "saved_prod": 0, "skipped": False}

    # 检查是否已缓存
    existing_count = get_destination_count_by_city(city)
    if skip_cached and existing_count >= 10:
        print(f"[{city}] 已有 {existing_count} 条数据，跳过（加 --force 强制更新）")
        result["skipped"] = True
        return result

    print(f"\n[{city}] 开始获取 '{keyword or category}' 数据...")

    pois = fetch_all_poi(city, keyword, category, max_count)
    if not pois:
        print(f"[{city}] 未获取到数据")
        return result

    result["fetched"] = len(pois)
    print(f"[{city}] 获取到 {len(pois)} 条POI")

    # 转换为destination格式
    destinations = []
    for poi in pois:
        dest = poi_to_destination(poi, city)
        if dest["name"]:
            destinations.append(dest)

    # 保存到数据库
    result["saved_dest"] = save_destinations(destinations)

    # 同时生成product（根据关键词分类）
    if keyword in ("景点", "") or category == "风景名胜":
        result["saved_prod"] = save_products_from_destinations(destinations, category="ticket")
    elif keyword == "酒店" or category == "住宿服务":
        result["saved_prod"] = save_products_from_destinations(destinations, category="hotel")
    elif keyword in ("餐饮", "餐厅") or category == "餐饮服务":
        result["saved_prod"] = save_products_from_destinations(destinations, category="experience")

    return result


def batch_fetch(cities: List[str], keyword: str = "景点", max_per_city: int = 100, skip_cached: bool = True):
    """批量获取多个城市的数据"""
    print("=" * 60)
    print("腾讯地图POI数据批量获取")
    print(f"Key配额: 6000次/天 | 城市数: {len(cities)} | 关键词: {keyword}")
    print("=" * 60)

    total = {"fetched": 0, "saved_dest": 0, "saved_prod": 0, "skipped": 0}
    api_calls = 0

    for i, city in enumerate(cities, 1):
        print(f"\n进度: [{i}/{len(cities)}]")
        result = fetch_and_save_city_pois(city, keyword, "", max_per_city, skip_cached)

        if result["skipped"]:
            total["skipped"] += 1
        else:
            total["fetched"] += result["fetched"]
            total["saved_dest"] += result["saved_dest"]
            total["saved_prod"] += result["saved_prod"]
            # 估算API调用次数（每页20条）
            api_calls += max(1, (result["fetched"] + 19) // 20)

        time.sleep(0.3)

    print("\n" + "=" * 60)
    print("批量获取完成")
    print(f"  跳过城市: {total['skipped']}")
    print(f"  获取POI: {total['fetched']}")
    print(f"  新增景点: {total['saved_dest']}")
    print(f"  新增产品: {total['saved_prod']}")
    print(f"  估算API调用: {api_calls} 次")
    print("=" * 60)


def show_stats():
    """显示数据库统计信息"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM destinations")
    dest_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM product")
    prod_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT city, COUNT(*) as cnt FROM destinations
        WHERE city IS NOT NULL AND city != ''
        GROUP BY city
        ORDER BY cnt DESC
        LIMIT 20
    """)
    city_stats = cursor.fetchall()

    conn.close()

    print("=" * 60)
    print("数据库缓存统计")
    print("=" * 60)
    print(f"总景点数 (destinations): {dest_count}")
    print(f"总产品数 (products): {prod_count}")
    print("\n城市分布Top20:")
    print(f"{'城市':<12} {'数量':>8}")
    print("-" * 22)
    for row in city_stats:
        print(f"{row['city']:<12} {row['cnt']:>8}")
    print("=" * 60)


def sync_products_from_existing(city: str = None, batch_size: int = 500) -> int:
    """从数据库已有destinations生成products，无需调用API"""
    conn = get_db_connection()
    cursor = conn.cursor()

    if city:
        cursor.execute("""
            SELECT d.id, d.name, d.city, d.province, d.description, d.rating, d.ticket_price, d.cover_image
            FROM destinations d
            LEFT JOIN product p ON d.name = p.name
            WHERE p.id IS NULL AND d.city LIKE ?
            LIMIT ?
        """, (f"%{city}%", batch_size))
    else:
        cursor.execute("""
            SELECT d.id, d.name, d.city, d.province, d.description, d.rating, d.ticket_price, d.cover_image
            FROM destinations d
            LEFT JOIN product p ON d.name = p.name
            WHERE p.id IS NULL
            LIMIT ?
        """, (batch_size,))

    rows = cursor.fetchall()
    if not rows:
        print("没有需要同步的数据（所有景点已有对应产品）")
        conn.close()
        return 0

    inserted = 0
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    import random

    for row in rows:
        price = row["ticket_price"] or 0
        if price == 0:
            price = random.randint(20, 260)

        name = row["name"] or ""
        category = "ticket"
        if any(k in name for k in ["酒店", "宾馆", "旅馆", "民宿", "客栈", "度假村"]):
            category = "hotel"
        elif any(k in name for k in ["机场", "车站", "码头", "高铁"]):
            category = "transport"
        elif any(k in name for k in ["餐厅", "饭店", "美食", "小吃"]):
            category = "experience"

        subtitle = f"{row['city'] or '热门'}推荐" if row['city'] else "热门推荐"

        try:
            cursor.execute("""
                INSERT INTO product (type, name, description, price, original_price, status, tags, images, rating, review_count, view_count, sales_count, created_at, updated_at, subtitle, destination_id, category, cover_image)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                category,
                name,
                row["description"] or f"{name}，位于{row['city'] or '当地'}",
                price,
                round(price * 1.2, 2),
                "active",
                json.dumps([category]),
                json.dumps([row["cover_image"]] if row["cover_image"] else []),
                row["rating"] or 4.5,
                random.randint(10, 999),
                random.randint(50, 5000),
                random.randint(0, 200),
                now, now,
                subtitle,
                row["id"],
                category,
                row["cover_image"]
            ))
            inserted += 1
        except sqlite3.IntegrityError:
            pass

    conn.commit()
    conn.close()
    print(f"同步完成：新增 {inserted} 条 product 数据")
    return inserted


def main():
    parser = argparse.ArgumentParser(description="腾讯地图API数据获取与缓存")
    parser.add_argument("--city", help="目标城市，如：北京")
    parser.add_argument("--keyword", default="景点", help="搜索关键词，如：景点/酒店/餐厅")
    parser.add_argument("--max", type=int, default=100, help="每城市最大获取条数（默认100）")
    parser.add_argument("--batch-cities", help="批量城市，逗号分隔，如：北京,上海,杭州")
    parser.add_argument("--force", action="store_true", help="强制更新，忽略缓存")
    parser.add_argument("--stats", action="store_true", help="显示缓存统计")
    parser.add_argument("--check-key", action="store_true", help="验证API Key有效性")
    parser.add_argument("--sync-products", action="store_true", help="从已有destinations同步生成products（不调用API）")
    parser.add_argument("--sync-batch", type=int, default=500, help="每次同步数量（默认500）")

    args = parser.parse_args()

    if args.stats:
        show_stats()
        return

    if args.check_key:
        if check_key():
            print("[OK] API Key有效")
        return

    if args.sync_products:
        print("=" * 60)
        print("从现有景点数据同步生成产品数据（无需API调用）")
        print("=" * 60)
        total_synced = 0
        while True:
            synced = sync_products_from_existing(city=args.city, batch_size=args.sync_batch)
            total_synced += synced
            if synced == 0:
                break
            print(f"  累计同步: {total_synced} 条")
        print(f"\n同步完成，共新增 {total_synced} 条 product 数据")
        show_stats()
        return

    # API调用前验证Key
    if not check_key():
        print("\n提示: 可以先执行 --sync-products 利用已有数据生成产品")
        print("      python amap_service.py --sync-products")
        return

    skip_cached = not args.force

    if args.batch_cities:
        cities = [c.strip() for c in args.batch_cities.split(",") if c.strip()]
        batch_fetch(cities, args.keyword, args.max, skip_cached)
    elif args.city:
        fetch_and_save_city_pois(args.city, args.keyword, "", args.max, skip_cached)
    else:
        print("未指定城市，使用默认城市列表...")
        batch_fetch(DEFAULT_CITIES, args.keyword, args.max, skip_cached)


if __name__ == "__main__":
    main()
