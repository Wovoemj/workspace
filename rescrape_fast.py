#!/usr/bin/env python3
"""
景点图片快速重新爬取脚本 (优化版)
针对之前失败的图片重新获取匹配的景点图片
"""

import os
import json
import time
import random
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import re

# 配置
SCENIC_IMAGES_ROOT = r"D:\travel-assistant\frontend\user-web\public\scenic_images"
FAILED_IMAGES_FILE = r"d:\travel-assistant\failed_images.json"
RESULTS_FILE = r"d:\travel-assistant\rescraped_results.json"

# 并发控制
MAX_WORKERS = 5
REQUEST_DELAY = 0.8

def search_images_multi(query: str, max_results: int = 10) -> list:
    """使用多个来源搜索图片"""
    all_urls = []
    
    # 1. 百度图片搜索
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://image.baidu.com"
        }
        
        url = "https://image.baidu.com/search/acjson"
        params = {
            "tn": "resultjson_com",
            "word": query + " 景点 风景",
            "pn": 0,
            "rn": max_results
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            for item in data.get('data', [])[:max_results]:
                url_found = item.get('middleURL') or item.get('thumbURL') or item.get('hoverURL')
                if url_found:
                    all_urls.append(url_found)
    except Exception as e:
        pass
    
    # 2. Bing图片搜索
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        bing_url = "https://cn.bing.com/images/async"
        params = {
            "q": query + " 景点 景区 风景",
            "first": 0,
            "count": max_results,
            "async": 1
        }
        
        resp = requests.get(bing_url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            img_urls = re.findall(r'mediaurl":"([^"]+)"', resp.text)
            all_urls.extend([u for u in img_urls if u and not u.startswith('data:')])
    except Exception as e:
        pass
    
    # 去重
    seen = set()
    unique_urls = []
    for url in all_urls:
        if url not in seen and len(url) < 500:
            seen.add(url)
            unique_urls.append(url)
    
    return unique_urls[:max_results]

def download_image(url: str, save_path: str) -> bool:
    """下载图片到指定路径"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.baidu.com",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
        }
        
        resp = requests.get(url, headers=headers, timeout=15, stream=True)
        if resp.status_code == 200:
            content_type = resp.headers.get('Content-Type', '')
            
            # 检查是否是图片
            if 'image' not in content_type:
                ext = os.path.splitext(url.split('?')[0])[-1].lower()
                if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']:
                    return False
            
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            
            with open(save_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # 验证文件
            if os.path.getsize(save_path) < 5000:
                os.remove(save_path)
                return False
            
            return True
    except Exception as e:
        pass
    return False

def rescrape_single(dest: str, img_idx: int) -> dict:
    """爬取单个景点图片"""
    result = {
        "destination": dest,
        "index": img_idx,
        "success": False,
        "path": None,
        "error": None
    }
    
    try:
        filename = f"{dest}_{img_idx}.jpg"
        save_path = os.path.join(SCENIC_IMAGES_ROOT, dest, filename)
        
        # 删除旧文件
        if os.path.exists(save_path):
            os.remove(save_path)
        
        # 搜索图片
        search_queries = [
            f"{dest}",
            f"{dest} 景区",
            f"{dest} 风景",
        ]
        
        for query in search_queries:
            urls = search_images_multi(query, max_results=8)
            
            for url in urls:
                if download_image(url, save_path):
                    result["success"] = True
                    result["path"] = save_path
                    return result
                
                time.sleep(0.3)
            
            time.sleep(REQUEST_DELAY)
        
        result["error"] = "All sources failed"
        
    except Exception as e:
        result["error"] = str(e)
    
    return result

def main():
    print("=" * 60)
    print("景点图片重新爬取脚本 (优化版)")
    print("=" * 60)
    
    # 读取失败图片列表
    with open(FAILED_IMAGES_FILE, 'r', encoding='utf-8') as f:
        failed_images = json.load(f)
    
    print(f"\n总计需要重新爬取的图片: {len(failed_images)} 张")
    
    # 按景点统计
    from collections import Counter
    dest_counts = Counter([img['destination'] for img in failed_images])
    destinations = sorted(dest_counts.keys())
    
    print(f"涉及景点数量: {len(destinations)} 个")
    print("\n开始爬取...\n")
    
    success_count = 0
    failed_count = 0
    all_results = []
    
    for i, dest in enumerate(destinations, 1):
        count = dest_counts[dest]
        print(f"[{i}/{len(destinations)}] {dest} ({count}张)", end=" ")
        
        dest_success = 0
        for idx in range(1, count + 1):
            result = rescrape_single(dest, idx)
            all_results.append(result)
            
            if result["success"]:
                success_count += 1
                dest_success += 1
            else:
                failed_count += 1
        
        print(f"-> 成功 {dest_success}/{count}")
        
        # 每20个景点保存进度
        if i % 20 == 0:
            with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    "completed": i,
                    "total": len(destinations),
                    "success": success_count,
                    "failed": failed_count,
                    "results": all_results[-100:]  # 只保存最近100条
                }, f, ensure_ascii=False, indent=2)
    
    # 保存最终结果
    final_results = {
        "total_failed": len(failed_images),
        "destinations": len(destinations),
        "success": success_count,
        "failed": failed_count,
        "all_results": all_results
    }
    
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_results, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print(f"完成! 成功: {success_count}, 失败: {failed_count}")
    print(f"结果已保存到: {RESULTS_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    main()
