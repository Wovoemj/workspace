#!/usr/bin/env python3
"""
景点图片重新爬取脚本
针对之前失败的图片重新获取匹配的景点图片
"""

import os
import json
import time
import random
import requests
from pathlib import Path
from urllib.parse import quote, urlencode
from concurrent.futures import ThreadPoolExecutor, as_completed
import httpx

# 配置
SCENIC_IMAGES_ROOT = r"D:\travel-assistant\frontend\user-web\public\scenic_images"
FAILED_IMAGES_FILE = r"d:\travel-assistant\failed_images.json"
RESULTS_FILE = r"d:\travel-assistant\rescraped_results.json"

# 并发控制
MAX_WORKERS = 3
REQUEST_DELAY = 1.0

# 图片来源优先级
IMAGE_SOURCES = [
    # 百度图片搜索 (备用)
    {
        "name": "baidu",
        "search_url": "https://image.baidu.com/search/acjson",
        "params_template": {
            "tn": "resultjson_com",
            "word": "{query}",
            "pn": 0,
            "rn": 30,
            "ipn": "rs"
        }
    },
    # 必应图片搜索 (备用)
    {
        "name": "bing", 
        "search_url": "https://cn.bing.com/images/async",
        "params_template": {
            "q": "{query}",
            "first": 0,
            "count": 35
        }
    }
]

def search_images_bing(query: str, max_results: int = 10) -> list:
    """使用Bing搜索图片"""
    results = []
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        }
        
        url = "https://cn.bing.com/images/async"
        params = {
            "q": query + " 景点 风景",
            "first": 0,
            "count": max_results,
            "async": 1,
            "qft": "+filterui:photo-photo"
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        if resp.status_code == 200:
            import re
            # 提取图片URL
            img_urls = re.findall(r'mediaurl":"([^"]+)"', resp.text)
            for img_url in img_urls[:max_results]:
                if img_url and not img_url.startswith('data:'):
                    results.append(img_url)
    except Exception as e:
        print(f"Bing search error: {e}")
    return results

def search_images_baidu(query: str, max_results: int = 10) -> list:
    """使用百度搜索图片"""
    results = []
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://image.baidu.com"
        }
        
        url = "https://image.baidu.com/search/acjson"
        params = {
            "tn": "resultjson_com",
            "word": query + " 景点",
            "pn": 0,
            "rn": max_results
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            for item in data.get('data', [])[:max_results]:
                if item.get('middleURL'):
                    results.append(item['middleURL'])
                elif item.get('thumbURL'):
                    results.append(item['thumbURL'])
    except Exception as e:
        print(f"Baidu search error: {e}")
    return results

def download_image(url: str, save_path: str) -> bool:
    """下载图片到指定路径"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.baidu.com",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
        }
        
        resp = requests.get(url, headers=headers, timeout=20, stream=True)
        if resp.status_code == 200:
            # 检查内容类型
            content_type = resp.headers.get('Content-Type', '')
            if 'image' not in content_type and not url.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                return False
            
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            
            with open(save_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # 验证文件大小
            if os.path.getsize(save_path) < 5000:  # 小于5KB可能是错误图片
                os.remove(save_path)
                return False
            
            return True
    except Exception as e:
        print(f"Download error: {e}")
    return False

def rescrape_destination(destination: str, image_index: int, base_path: str) -> dict:
    """重新爬取单个景点的图片"""
    result = {
        "destination": destination,
        "image_index": image_index,
        "success": False,
        "new_path": None,
        "message": ""
    }
    
    try:
        # 构造文件名
        filename = f"{destination}_{image_index}.jpg"
        save_path = os.path.join(base_path, destination, filename)
        
        # 如果文件已存在，先删除
        if os.path.exists(save_path):
            os.remove(save_path)
        
        # 搜索图片
        search_queries = [
            f"{destination}",
            f"{destination} 景区",
            f"{destination} 风景",
            f"{destination} 旅游"
        ]
        
        for query in search_queries:
            # 尝试Bing
            urls = search_images_bing(query, max_results=15)
            if not urls:
                # 尝试百度
                urls = search_images_baidu(query, max_results=15)
            
            # 逐个尝试下载
            for url in urls[:10]:
                if download_image(url, save_path):
                    result["success"] = True
                    result["new_path"] = save_path
                    result["message"] = f"Successfully downloaded from {query}"
                    return result
                
                time.sleep(0.5)
            
            time.sleep(REQUEST_DELAY)
        
        result["message"] = "All image sources failed"
        
    except Exception as e:
        result["message"] = f"Error: {str(e)}"
    
    return result

def main():
    """主函数"""
    print("=" * 60)
    print("景点图片重新爬取脚本")
    print("=" * 60)
    
    # 读取失败图片列表
    with open(FAILED_IMAGES_FILE, 'r', encoding='utf-8') as f:
        failed_images = json.load(f)
    
    print(f"\n总计需要重新爬取的图片: {len(failed_images)} 张")
    
    # 提取景点列表（去重）
    destinations = list(set([img['destination'] for img in failed_images]))
    print(f"涉及景点数量: {len(destinations)} 个")
    
    # 按景点统计需要爬取的数量
    from collections import Counter
    dest_counts = Counter([img['destination'] for img in failed_images])
    
    # 显示进度
    completed = 0
    success_count = 0
    failed_count = 0
    results = []
    
    print("\n开始重新爬取...\n")
    
    for dest in sorted(dest_counts.keys()):
        count = dest_counts[dest]
        print(f"[{completed + 1}/{len(dest_counts)}] 处理景点: {dest} ({count}张图片)")
        
        for img_idx in range(1, count + 1):
            result = rescrape_destination(dest, img_idx, SCENIC_IMAGES_ROOT)
            results.append(result)
            
            if result["success"]:
                success_count += 1
                print(f"  ✓ 图片{img_idx} 下载成功")
            else:
                failed_count += 1
                print(f"  ✗ 图片{img_idx} 下载失败: {result['message']}")
            
            time.sleep(REQUEST_DELAY)
        
        completed += 1
        
        # 每10个景点保存一次进度
        if completed % 10 == 0:
            with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    "total": len(failed_images),
                    "completed": completed,
                    "success": success_count,
                    "failed": failed_count,
                    "results": results
                }, f, ensure_ascii=False, indent=2)
            print(f"\n[进度保存] 已完成: {completed}/{len(dest_counts)}, 成功: {success_count}, 失败: {failed_count}\n")
    
    # 保存最终结果
    final_results = {
        "total_failed_images": len(failed_images),
        "destinations_count": len(destinations),
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_results, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print("爬取完成!")
    print(f"成功: {success_count} 张")
    print(f"失败: {failed_count} 张")
    print(f"结果已保存到: {RESULTS_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    main()
