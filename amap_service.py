#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯地图API数据获取与缓存服务

【功能说明】
1. 通过腾讯地图POI搜索获取景点/酒店/餐厅等数据
2. 数据自动存入SQLite数据库（destinations + product表）
3. 智能缓存：已获取的城市数据不再重复调用API
4. 每日限额6000次，优先保障增量更新

【使用方法】
    python amap_service.py --city 北京 --keyword 景点
    python amap_service.py --city 上海 --keyword 酒店
    python amap_service.py --batch-cities 北京,上海,杭州,成都
    python amap_service.py --stats          # 查看缓存统计
"""

# ==================== 模块导入部分 ====================
# 导入操作系统接口模块，用于文件路径操作
import os
# 导入系统模块，用于命令行参数解析
import sys
# 导入JSON处理模块，用于数据序列化和反序列化
import json
# 导入时间模块，用于请求间隔控制
import time
# 导入SQLite3数据库模块，用于本地数据存储
import sqlite3
# 导入命令行参数解析模块
import argparse
# 导入HTTP请求库，用于调用腾讯地图API
import requests
# 导入日期时间处理模块
from datetime import datetime
# 导入类型注解，用于函数参数和返回值类型提示
from typing import List, Dict, Optional

# ==================== 配置部分 ====================
# 腾讯地图API密钥（WebService API Key）
QQ_MAP_KEY = "JLSBZ-SRPKI-2LXGS-UUYM7-NSDAQ-5PBY3"
# 数据库文件路径（存储在instance目录下）
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "travel.db")

# 腾讯地图API接口基础URL
QQ_MAP_BASE = "https://apis.map.qq.com"
# 地理编码API接口（地址转坐标）
GEOCODE_URL = f"{QQ_MAP_BASE}/ws/geocoder/v1"
# POI搜索API接口（地点搜索）
POI_SEARCH_URL = f"{QQ_MAP_BASE}/ws/place/v1/search"

# ==================== 常用城市坐标映射表 ====================
# 避免每次调用地理编码API，节省API配额
# 格式：城市名 -> (经度, 纬度)
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

# ==================== 关键词到腾讯地图分类的映射 ====================
# 将中文关键词映射到腾讯地图的POI分类
KEYWORD_CATEGORY_MAP = {
    "景点": "风景名胜",
    "酒店": "住宿服务",
    "餐饮": "餐饮服务",
    "购物": "购物服务",
    "交通": "交通设施",
    "娱乐": "生活服务",
}

# 默认城市列表（可扩展）
DEFAULT_CITIES = [
    "北京", "上海", "杭州", "成都", "西安", "广州", "深圳",
    "南京", "苏州", "重庆", "武汉", "长沙", "厦门", "青岛",
    "大连", "昆明", "桂林", "拉萨", "乌鲁木齐", "哈尔滨"
]


# ==================== API请求部分 ====================

def qqmap_get(url: str, params: dict, retries: int = 2) -> Optional[dict]:
    """
    带重试的腾讯地图API GET请求
    
    【功能】
    - 封装requests.get，自动添加API密钥
    - 支持失败重试（默认2次）
    - 检查API返回状态，处理配额超限等错误
    
    【参数】
    - url: API接口URL
    - params: 请求参数字典
    - retries: 重试次数（默认2次）
    
    【返回】
    - API响应的JSON数据（字典格式）或 None（请求失败）
    """
    # 将API密钥添加到请求参数中
    params["key"] = QQ_MAP_KEY
    # 重试循环
    for attempt in range(retries + 1):
        try:
            # 发送GET请求，超时时间15秒
            resp = requests.get(url, params=params, timeout=15)
            # 解析JSON响应
            data = resp.json()
            # 腾讯地图返回 status=0 表示成功
            if data.get("status") == 0:
                return data
            # 配额超限或Key无效
            if data.get("status") == 301 or "quota" in str(data).lower():
                print(f"[警告] API配额超限或无效Key: {data.get('message', '')}")
                return None
            # 其他错误
            if data.get("status") != 0:
                print(f"[警告] API返回错误: {data.get('message', '')} (status={data.get('status')})")
        except requests.exceptions.RequestException as e:
            # 请求异常（网络错误、超时等）
            print(f"[错误] 请求失败(尝试{attempt+1}/{retries+1}): {e}")
            # 如果不是最后一次重试，等待1秒后重试
            if attempt < retries:
                time.sleep(1)
    # 所有重试都失败，返回None
    return None


def get_city_coordinates(city: str) -> Optional[tuple]:
    """
    获取城市中心坐标
    
    【功能】
    - 优先从本地缓存（CITY_COORDINATES）查找
    - 本地没有则调用腾讯地图地理编码API
    - 节省API配额
    
    【参数】
    - city: 城市名称（如"北京"）
    
    【返回】
    - (经度, 纬度) 元组 或 None（获取失败）
    """
    # 清理城市名称（去除"市"、"省"后缀）
    city_clean = city.replace("市", "").replace("省", "")
    # 优先从本地映射表查找（节省API配额）
    for k, v in CITY_COORDINATES.items():
        if city_clean in k or k in city_clean:
            return v
    # 本地没有则调用地理编码API
    data = qqmap_get(GEOCODE_URL, {"address": city})
    if data and data.get("status") == 0:
        result = data.get("result", {})
        location = result.get("location", {})
        return location.get("lng"), location.get("lat")
    return None


def check_key() -> bool:
    """
    验证腾讯地图API Key是否有效
    
    【功能】
    - 通过调用地理编码API测试Key有效性
    - 无效时提示用户检查控制台配置
    
    【返回】
    - True: Key有效
    - False: Key无效
    """
    # 测试API调用（地理编码：查询北京坐标）
    data = qqmap_get(GEOCODE_URL, {"address": "北京"})
    if data and data.get("status") == 0:
        return True
    # Key无效时的提示信息
    print("[错误] 腾讯地图API Key无效或未启用WebService API，请检查控制台配置")
    print("        控制台地址: https://lbs.qq.com/dev/console")
    return False


def search_poi(city: str, keyword: str = "", category: str = "", page: int = 1, page_size: int = 20) -> List[dict]:
    """
    搜索POI（腾讯地图）
    
    【功能】
    - 调用腾讯地图POI搜索API
    - 支持关键词搜索或分类搜索
    - 支持分页
    
    【参数】
    - city: 目标城市
    - keyword: 搜索关键词（如"故宫"）
    - category: POI分类（如"风景名胜"）
    - page: 页码（从1开始）
    - page_size: 每页数量（最大20）
    
    【返回】
    - POI列表（字典列表）
    """
    # 构建请求参数
    params = {
        "keyword": keyword or category or "景点",  # 优先使用关键词，其次分类，默认"景点"
        "boundary": f"region({city},0)",  # 0=模糊匹配，1=精确城市名
        "page_size": page_size,  # 每页数量
        "page_index": page,  # 页码
        "output": "json",  # 输出格式
    }
    
    # 调用API
    data = qqmap_get(POI_SEARCH_URL, params)
    if not data:
        return []
    
    # 提取POI列表
    pois = data.get("data", []) or []
    return pois


def fetch_all_poi(city: str, keyword: str = "", category: str = "", max_count: int = 100) -> List[dict]:
    """
    分页获取POI，最多max_count条
    
    【功能】
    - 自动处理分页，获取所有符合条件的POI
    - 控制获取数量，避免超过API配额
    
    【参数】
    - city: 目标城市
    - keyword: 搜索关键词
    - category: POI分类
    - max_count: 最大获取数量（默认100条）
    
    【返回】
    - POI列表（最多max_count条）
    """
    all_pois = []
    page = 1
    page_size = 20  # 腾讯地图API每页最多返回20条
    
    # 循环获取，直到达到最大数量或没有更多数据
    while len(all_pois) < max_count:
        pois = search_poi(city, keyword, category, page, page_size)
        # 如果没有数据，退出循环
        if not pois:
            break
        # 添加到总列表
        all_pois.extend(pois)
        # 如果返回数量少于每页数量，说明已经是最后一页
        if len(pois) < page_size:
            break
        # 页码+1，继续获取下一页
        page += 1
        # 控制请求频率，避免触发限流
        time.sleep(0.2)
    
    # 返回最多max_count条数据
    return all_pois[:max_count]


# ==================== 数据库操作部分 ====================

def get_db_connection():
    """获取SQLite数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    # 设置行工厂，使查询结果可以通过列名访问
    conn.row_factory = sqlite3.Row
    return conn


def get_cached_city_names() -> set:
    """
    获取数据库中已缓存的城市名称集合
    
    【功能】
    - 查询destinations表，获取所有已有数据的城市
    - 用于避免重复获取同一城市的数据
    
    【返回】
    - 城市名称集合（已去除"市"、"省"后缀）
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    # 查询所有不重复的城市名称
    cursor.execute("SELECT DISTINCT city FROM destinations WHERE city IS NOT NULL")
    # 清理城市名称（去除"市"、"省"后缀）并添加到集合
    cities = {row["city"].replace("市", "").replace("省", "") for row in cursor.fetchall() if row["city"]}
    conn.close()
    return cities


def get_destination_count_by_city(city: str) -> int:
    """
    获取某城市的景点数量
    
    【参数】
    - city: 城市名称
    
    【返回】
    - 该城市的景点数量
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    # 模糊匹配城市名称
    cursor.execute("SELECT COUNT(*) FROM destinations WHERE city LIKE ?", (f"%{city}%",))
    count = cursor.fetchone()[0]
    conn.close()
    return count


def poi_to_destination(poi: dict, city: str = "") -> dict:
    """
    将腾讯地图POI数据转换为本项目destination格式
    
    【功能】
    - 解析POI数据中的经纬度、地址、分类、电话等信息
    - 转换为项目统一的景点数据格式
    
    【参数】
    - poi: 腾讯地图POI数据（字典）
    - city: 城市名称（备选）
    
    【返回】
    - 转换后的景点数据字典
    """
    # 解析经纬度
    lng, lat = None, None
    location = poi.get("location", {})
    if isinstance(location, dict):
        # location是字典格式：{"lng": 116.407526, "lat": 39.90403}
        lng = location.get("lng")
        lat = location.get("lat")
    elif isinstance(location, str) and "," in location:
        # location是字符串格式："116.407526,39.90403"
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
        "name": poi.get("title", "").strip(),  # 景点名称
        "city": city_name,  # 城市
        "province": province,  # 省份
        "description": f"位于{address or city_name}。{category}",  # 描述
        "cover_image": None,  # 腾讯地图POI不含图片URL，需后续补充
        "rating": 4.5,  # 腾讯地图无评分，用默认值
        "ticket_price": 0.0,  # 腾讯地图无价格，用默认值
        "open_time": "",  # 开放时间（需后续补充）
        "lng": lng,  # 经度
        "lat": lat,  # 纬度
        "address": address,  # 详细地址
        "tel": tel,  # 电话
    }


def save_destinations(destinations: List[dict]) -> int:
    """
    保存景点到destinations表，跳过已存在的（按name+city去重）
    
    【功能】
    - 批量插入景点数据
    - 按name+city去重，避免重复插入
    - 返回成功插入的数量
    
    【参数】
    - destinations: 景点数据列表
    
    【返回】
    - 新增记录数
    """
    if not destinations:
        return 0

    conn = get_db_connection()
    cursor = conn.cursor()
    inserted = 0  # 新增数量
    skipped = 0  # 跳过数量

    # 当前时间戳
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for dest in destinations:
        # 跳过没有名称的景点
        if not dest.get("name"):
            continue
        # 检查是否已存在（按name+city去重）
        cursor.execute(
            "SELECT id FROM destinations WHERE name = ? AND city = ?",
            (dest["name"], dest.get("city", ""))
        )
        if cursor.fetchone():
            skipped += 1
            continue

        # 插入新记录
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

    # 提交事务
    conn.commit()
    conn.close()
    print(f"  -> destinations: 新增 {inserted} 条, 跳过 {skipped} 条")
    return inserted


def save_products_from_destinations(destinations: List[dict], category: str = "ticket") -> int:
    """
    基于景点生成product产品数据
    
    【功能】
    - 根据景点数据生成对应的产品记录
    - 自动关联destination_id
    - 生成随机价格和销量数据（用于演示）
    
    【参数】
    - destinations: 景点数据列表
    - category: 产品分类（ticket/hotel/experience）
    
    【返回】
    - 新增产品数
    """
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

        # 生成随机价格（如果没有门票价格）
        price = dest.get("ticket_price", 0) or 0
        if price == 0:
            price = random.randint(30, 200)

        # 插入产品记录
        cursor.execute("""
            INSERT INTO product (type, name, description, price, original_price, status, tags, images, rating, review_count, view_count, sales_count, created_at, updated_at, subtitle, destination_id, category, cover_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            category,  # 产品类型
            name,  # 产品名称
            dest.get("description", ""),  # 描述
            price,  # 售价
            round(price * 1.2, 2),  # 原价（比售价高20%）
            "active",  # 状态：上架
            json.dumps([category]),  # 标签
            json.dumps([]),  # 图片列表（空）
            dest.get("rating", 4.5),  # 评分
            random.randint(10, 999),  # 评论数
            random.randint(50, 5000),  # 浏览量
            random.randint(0, 200),  # 销量
            now, now,  # 创建时间、更新时间
            f"{dest.get('city','')}热门推荐",  # 副标题
            destination_id,  # 关联的景点ID
            category,  # 分类
            dest.get("cover_image")  # 封面图
        ))
        inserted += 1

    conn.commit()
    conn.close()
    print(f"  -> products: 新增 {inserted} 条, 跳过 {skipped} 条")
    return inserted


# ==================== 主流程部分 ====================

def fetch_and_save_city_pois(city: str, keyword: str = "景点", category: str = "", max_count: int = 100, skip_cached: bool = True) -> dict:
    """
    获取并保存某城市的POI数据
    
    【功能】
    - 检查该城市是否已有缓存数据
    - 调用腾讯地图API获取POI
    - 保存到destinations表和product表
    
    【参数】
    - city: 目标城市
    - keyword: 搜索关键词
    - category: POI分类
    - max_count: 最大获取数量
    - skip_cached: 是否跳过已缓存的城市
    
    【返回】
    - 结果字典：{city, fetched, saved_dest, saved_prod, skipped}
    """
    result = {"city": city, "fetched": 0, "saved_dest": 0, "saved_prod": 0, "skipped": False}

    # 检查是否已缓存（已有10条以上数据则跳过）
    existing_count = get_destination_count_by_city(city)
    if skip_cached and existing_count >= 10:
        print(f"[{city}] 已有 {existing_count} 条数据，跳过（加 --force 强制更新）")
        result["skipped"] = True
        return result

    print(f"\n[{city}] 开始获取 '{keyword or category}' 数据...")

    # 调用API获取POI数据
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
    """
    批量获取多个城市的数据
    
    【功能】
    - 遍历城市列表，依次获取POI数据
    - 统计总数和API调用次数
    - 控制请求频率，避免触发限流
    
    【参数】
    - cities: 城市列表
    - keyword: 搜索关键词
    - max_per_city: 每城市最大获取数量
    - skip_cached: 是否跳过已缓存的城市
    """
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

        # 控制请求频率
        time.sleep(0.3)

    # 打印统计信息
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

    # 查询景点总数
    cursor.execute("SELECT COUNT(*) FROM destinations")
    dest_count = cursor.fetchone()[0]

    # 查询产品总数
    cursor.execute("SELECT COUNT(*) FROM product")
    prod_count = cursor.fetchone()[0]

    # 查询城市分布（Top20）
    cursor.execute("""
        SELECT city, COUNT(*) as cnt FROM destinations
        WHERE city IS NOT NULL AND city != ''
        GROUP BY city
        ORDER BY cnt DESC
        LIMIT 20
    """)
    city_stats = cursor.fetchall()

    conn.close()

    # 打印统计信息
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
    """
    从数据库已有destinations生成products，无需调用API
    
    【功能】
    - 查找没有对应产品的景点
    - 批量生成产品记录
    - 根据景点名称自动判断产品分类
    
    【参数】
    - city: 指定城市（可选）
    - batch_size: 每批处理数量
    
    【返回】
    - 新增产品数
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 查询没有对应产品的景点
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
        # 根据景点名称判断产品分类
        category = "ticket"
        if any(k in name for k in ["酒店", "宾馆", "旅馆", "民宿", "客栈", "度假村"]):
            category = "hotel"
        elif any(k in name for k in ["机场", "车站", "码头", "高铁"]):
            category = "transport"
        elif any(k in name for k in ["餐厅", "饭店", "美食", "小吃"]):
            category = "experience"

        subtitle = f"{row['city'] or '热门'}推荐" if row['city'] else "热门推荐"

        try:
            # 插入产品记录
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
            # 忽略重复记录的错误
            pass

    conn.commit()
    conn.close()
    print(f"同步完成：新增 {inserted} 条 product 数据")
    return inserted


def main():
    """
    主函数 - 命令行参数解析和任务分发
    
    【支持的参数】
    --city: 指定单个城市
    --keyword: 搜索关键词
    --max: 每城市最大获取数量
    --batch-cities: 批量城市（逗号分隔）
    --force: 强制更新（忽略缓存）
    --stats: 显示统计信息
    --check-key: 验证API Key
    --sync-products: 从已有景点同步生成产品
    --sync-batch: 每次同步数量
    """
    # 创建命令行参数解析器
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

    # 解析命令行参数
    args = parser.parse_args()

    # 显示统计信息
    if args.stats:
        show_stats()
        return

    # 验证API Key
    if args.check_key:
        if check_key():
            print("[OK] API Key有效")
        return

    # 从已有景点同步生成产品（不调用API）
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

    # 是否跳过已缓存的城市
    skip_cached = not args.force

    # 批量获取模式
    if args.batch_cities:
        cities = [c.strip() for c in args.batch_cities.split(",") if c.strip()]
        batch_fetch(cities, args.keyword, args.max, skip_cached)
    elif args.city:
        # 单个城市获取模式
        fetch_and_save_city_pois(args.city, args.keyword, "", args.max, skip_cached)
    else:
        # 默认模式：使用默认城市列表
        print("未指定城市，使用默认城市列表...")
        batch_fetch(DEFAULT_CITIES, args.keyword, args.max, skip_cached)


# 程序入口
if __name__ == "__main__":
    main()
