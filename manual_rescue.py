"""手动获取仍然失败的景点图片"""
import os
import time
import json
import requests
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor, as_completed

# 图片保存路径
SAVE_DIR = r"D:\travel-assistant\frontend\user-web\public\scenic_images"

# 仍然失败的景点及备选搜索词
FAILED_SPOTS = {
    "星海广场": ["大连星海广场", "星海广场 大连"],
    "洛阳黄河小浪底": ["黄河小浪底风景区", "洛阳小浪底"],
    "趵突泉": ["济南趵突泉", "趵突泉 济南"],
    "黛螺顶": ["五台山黛螺顶", "黛螺顶 五台山"],
}

def save_image(url, filepath):
    """下载并保存图片"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200 and len(response.content) > 5000:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return True
    except:
        pass
    return False

def try_bing_image(query, index, dest_name):
    """使用必应图片搜索"""
    try:
        search_url = f"https://www.bing.com/images/search?q={quote(query)}&first={index * 20}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = requests.get(search_url, headers=headers, timeout=15)
        if response.status_code == 200:
            # 提取图片URL
            import re
            urls = re.findall(r'"murl":"([^"]+)"', response.text)
            for url in urls[:5]:
                url = url.replace('\\/', '/')
                filepath = os.path.join(SAVE_DIR, dest_name, f"{dest_name}_{index}.jpg")
                if save_image(url, filepath):
                    return filepath
    except:
        pass
    return None

def try_baidu_image(query, index, dest_name):
    """使用百度图片搜索"""
    try:
        search_url = f"https://image.baidu.com/search/flip?word={quote(query)}&tn=baiduimage"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
        response = requests.get(search_url, headers=headers, timeout=15)
        if response.status_code == 200:
            import re
            urls = re.findall(r'"objURL":"([^"]+)"', response.text)
            for url in urls[:5]:
                filepath = os.path.join(SAVE_DIR, dest_name, f"{dest_name}_{index}.jpg")
                if save_image(url, filepath):
                    return filepath
    except:
        pass
    return None

def try_sohu_image(query, index, dest_name):
    """使用搜狗图片搜索"""
    try:
        search_url = f"https://pic.sogou.com/pics/json.jsp?query={quote(query)}&st=5&start=0"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(search_url, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            items = data.get('items', [])
            for item in items[:5]:
                url = item.get('pic_url', '')
                if url:
                    filepath = os.path.join(SAVE_DIR, dest_name, f"{dest_name}_{index}.jpg")
                    if save_image(url, filepath):
                        return filepath
    except:
        pass
    return None

def try_multiple_sources(dest_name, search_terms, index):
    """尝试多个图片来源"""
    # 先检查文件是否已存在
    filepath = os.path.join(SAVE_DIR, dest_name, f"{dest_name}_{index}.jpg")
    if os.path.exists(filepath):
        return {"success": True, "path": filepath, "method": "already_exists"}
    
    sources = [
        ("Bing", try_bing_image),
        ("Baidu", try_baidu_image),
        ("Sogou", try_sohu_image),
    ]
    
    for search_term in search_terms:
        for source_name, search_func in sources:
            result = search_func(search_term, index - 1, dest_name)
            if result:
                return {"success": True, "path": result, "method": source_name}
            time.sleep(0.5)
    
    return {"success": False, "error": "All sources failed", "path": None}

def main():
    print("=" * 60)
    print("手动获取仍然失败的景点图片")
    print("=" * 60)
    
    results = []
    
    for dest_name, search_terms in FAILED_SPOTS.items():
        print(f"\n处理: {dest_name}")
        for i in range(1, 3):
            print(f"  图片 {i}...", end=" ", flush=True)
            result = try_multiple_sources(dest_name, search_terms, i)
            results.append({
                "destination": dest_name,
                "index": i,
                **result
            })
            if result["success"]:
                print(f"成功 ({result.get('method', '')})")
            else:
                print("失败")
            time.sleep(1)
    
    # 统计
    success_count = sum(1 for r in results if r["success"])
    print("\n" + "=" * 60)
    print(f"完成! 成功: {success_count}/{len(results)}")
    print("=" * 60)
    
    # 保存结果
    with open(r"d:\travel-assistant\manual_rescue_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "total": len(results),
            "success": success_count,
            "failed": len(results) - success_count,
            "results": results
        }, f, ensure_ascii=False, indent=2)
    print("\n结果已保存到: manual_rescue_results.json")

if __name__ == "__main__":
    main()
