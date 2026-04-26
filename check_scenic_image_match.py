#!/usr/bin/env python3
"""
景点图片匹配检查脚本
使用智谱 GLM-4.6v 多模态 API 检查图片内容是否与景点名称匹配

使用方法:
    python check_scenic_image_match.py

输出:
    - matched_images.json: 匹配的图片列表
    - mismatched_images.json: 不匹配的图片列表（含原因）
"""

import os
import json
import base64
import time
import httpx
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# 配置
SCENIC_IMAGES_ROOT = r"D:\travel-assistant\frontend\user-web\public\scenic_images"
ZHIPU_API_KEY = "21b72c0e3f0c42b3bb48ede1cccf6fd7.kZWVri6LIu783YN8"
ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
ZHIPU_MODEL = "glm-4.6v"

# 并发控制
MAX_WORKERS = 5  # 避免 API 限流
REQUEST_DELAY = 0.5  # 请求间隔（秒）

# 相似度关键词映射（景点名称中的关键词）
SCENIC_KEYWORDS = {
    "故宫": ["故宫", "宫殿", "红墙", "琉璃瓦", "皇帝", "紫禁城"],
    "长城": ["长城", "城墙", "城墙", "烽火台"],
    "布达拉宫": ["布达拉宫", "宫殿", "雪山", "藏式", "喇嘛"],
    "西湖": ["西湖", "湖", "断桥", "雷峰塔", "苏堤"],
    "泰山": ["泰山", "山", "日出", "十八盘"],
    "黄山": ["黄山", "山", "奇松", "怪石", "云海", "温泉"],
    "桂林": ["桂林", "山水", "漓江", "象鼻山"],
    "张家界": ["张家界", "天门山", "玻璃栈道", "武陵源"],
    "九寨沟": ["九寨沟", "海子", "彩池", "瀑布"],
    "峨眉山": ["峨眉山", "佛", "金顶", "寺庙"],
    "兵马俑": ["兵马俑", "秦始皇", "陶俑", "俑坑"],
    "天安门": ["天安门", "广场", "城楼", "人民大会堂"],
    "天坛": ["天坛", "祈年殿", "回音壁", "圜丘"],
    "颐和园": ["颐和园", "长廊", "佛香阁", "昆明湖", "十七孔桥"],
    "圆明园": ["圆明园", "遗址", "西洋楼", "残垣断壁"],
    "西湖": ["西湖", "断桥", "雷峰塔", "三潭印月"],
    "丽江古城": ["丽江", "古城", "四方街", "木府"],
    "大理古城": ["大理", "古城", "洱海", "三塔"],
    "平遥古城": ["平遥", "古城", "城墙", "票号"],
    "苏州园林": ["园林", "假山", "亭台", "楼阁", "苏州"],
}

def encode_image_to_base64(image_path: str) -> str:
    """将图片编码为 base64"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def check_image_match(destination_name: str, image_path: str, api_key: str) -> dict:
    """
    使用智谱 GLM-4.6v 检查图片内容是否与景点名称匹配
    
    Args:
        destination_name: 景点名称
        image_path: 图片路径
        api_key: API 密钥
    
    Returns:
        dict: 包含匹配结果的字典
    """
    try:
        # 读取图片
        with open(image_path, "rb") as f:
            image_base64 = base64.b64encode(f.read()).decode("utf-8")
        
        # 构建提示词
        prompt = f"""你是一个专业的景点图片审核员。请分析这张图片，并判断它是否适合作为景点"{destination_name}"的展示图片。

要求：
1. 图片中主要展示的内容是什么？
2. 图片内容与景点名称是否匹配？
3. 如果不匹配，说明原因。

请用JSON格式回复：
{{
    "is_match": true/false,  // 图片内容是否与景点匹配
    "main_content": "图片主要内容描述",
    "reason": "匹配/不匹配的原因",
    "confidence": 0.0-1.0  // 匹配置信度
}}

只输出JSON，不要输出其他内容。"""
        
        # 调用 API
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": ZHIPU_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                        {"type": "text", "text": prompt}
                    ]
                }
            ],
            "temperature": 0.1
        }
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{ZHIPU_BASE_URL}/chat/completions",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            result = response.json()
        
        # 解析结果
        content = result["choices"][0]["message"]["content"]
        
        # 提取 JSON
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        result_data = json.loads(content)
        result_data["image_path"] = image_path
        result_data["destination"] = destination_name
        
        return result_data
        
    except json.JSONDecodeError as e:
        return {
            "is_match": None,
            "main_content": "解析失败",
            "reason": f"JSON解析错误: {str(e)}",
            "confidence": 0.0,
            "image_path": image_path,
            "destination": destination_name
        }
    except Exception as e:
        return {
            "is_match": None,
            "main_content": "请求失败",
            "reason": f"API调用错误: {str(e)}",
            "confidence": 0.0,
            "image_path": image_path,
            "destination": destination_name
        }

def get_all_images(scenic_root: str) -> list:
    """获取所有景点图片"""
    images = []
    scenic_path = Path(scenic_root)
    
    for dest_dir in scenic_path.iterdir():
        if dest_dir.is_dir() and dest_dir.name != "__auto__":
            destination_name = dest_dir.name
            for img_file in dest_dir.glob("*.jpg"):
                images.append({
                    "destination": destination_name,
                    "image_path": str(img_file),
                    "image_name": img_file.name
                })
            for img_file in dest_dir.glob("*.png"):
                images.append({
                    "destination": destination_name,
                    "image_path": str(img_file),
                    "image_name": img_file.name
                })
    
    return images

def load_previous_results() -> set:
    """加载之前已检查的图片路径"""
    checked = set()
    result_files = [
        f for f in os.listdir(".")
        if f.startswith("all_image_check_results_") and f.endswith(".json")
    ]
    
    if result_files:
        # 使用最新的结果文件
        latest_file = max(result_files)
        print(f"发现之前的结果文件: {latest_file}")
        try:
            with open(latest_file, "r", encoding="utf-8") as f:
                previous_results = json.load(f)
            for item in previous_results:
                if "image_path" in item:
                    checked.add(item["image_path"])
            print(f"已加载 {len(checked)} 条已检查记录")
        except Exception as e:
            print(f"加载结果文件失败: {e}")
    
    return checked

def main():
    print("=" * 60)
    print("景点图片匹配检查工具")
    print("=" * 60)
    
    # 加载之前的结果
    checked_images = load_previous_results()
    
    # 获取所有图片
    print(f"\n[1/4] 扫描图片目录: {SCENIC_IMAGES_ROOT}")
    images = get_all_images(SCENIC_IMAGES_ROOT)
    print(f"共发现 {len(images)} 张图片")
    
    # 过滤已检查的图片
    images_to_check = [img for img in images if img["image_path"] not in checked_images]
    skipped = len(images) - len(images_to_check)
    print(f"需检查: {len(images_to_check)} 张 | 已跳过: {skipped} 张")
    
    if not images_to_check:
        print("所有图片都已检查完毕！")
        return
    
    # 确认继续
    print(f"\n即将检查 {len(images_to_check)} 张图片")
    print("预计耗时: 约 {:.0f} 分钟 (并发数: {})".format(
        len(images) * REQUEST_DELAY / MAX_WORKERS / 60, MAX_WORKERS
    ))
    response = input("\n是否继续？(y/n): ").strip().lower()
    if response != 'y':
        print("已取消")
        return
    
    # 检查图片
    print(f"\n[2/4] 开始检查图片...")
    results = []
    matched = []
    mismatched = []
    
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(check_image_match, img["destination"], img["image_path"], ZHIPU_API_KEY): img
            for img in images_to_check
        }
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            img = futures[future]
            try:
                result = future.result()
                results.append(result)
                
                if result.get("is_match") is True:
                    matched.append(result)
                elif result.get("is_match") is False:
                    mismatched.append(result)
                
                # 进度显示
                elapsed = time.time() - start_time
                eta = (elapsed / completed) * (len(images_to_check) - completed) if completed > 0 else 0
                print(f"\r进度: {completed}/{len(images_to_check)} ({100*completed/len(images_to_check):.1f}%) "
                      f"| 匹配: {len(matched)} | 不匹配: {len(mismatched)} "
                      f"| 预计剩余: {eta:.0f}秒", end="")
                
            except Exception as e:
                print(f"\n处理 {img['image_path']} 时出错: {e}")
            
            # 避免限流
            time.sleep(REQUEST_DELAY)
    
    print("\n")
    
    # 保存结果
    print("[3/4] 保存结果...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 不匹配的图片
    mismatched_file = f"mismatched_images_{timestamp}.json"
    with open(mismatched_file, "w", encoding="utf-8") as f:
        json.dump(mismatched, f, ensure_ascii=False, indent=2)
    print(f"  - 不匹配图片: {mismatched_file} ({len(mismatched)} 张)")
    
    # 全部结果
    all_results_file = f"all_image_check_results_{timestamp}.json"
    with open(all_results_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"  - 完整报告: {all_results_file}")
    
    # 统计
    total_checked = len(results)
    print("\n" + "=" * 60)
    print("[4/4] 检查完成！")
    print("=" * 60)
    print(f"  本次检查: {total_checked} 张")
    print(f"  历史累计: {skipped} 张")
    print(f"  匹配: {len(matched)} ({100*len(matched)/total_checked:.1f}%)")
    print(f"  不匹配: {len(mismatched)} ({100*len(mismatched)/total_checked:.1f}%)")
    print(f"  未知/失败: {total_checked - len(matched) - len(mismatched)}")
    print("=" * 60)
    
    # 显示不匹配的详情
    if mismatched:
        print("\n不匹配图片详情 (前10条):")
        print("-" * 60)
        for i, item in enumerate(mismatched[:10], 1):
            print(f"\n{i}. {item['destination']} / {Path(item['image_path']).name}")
            print(f"   图片内容: {item.get('main_content', '未知')}")
            print(f"   原因: {item.get('reason', '未知')}")
            print(f"   置信度: {item.get('confidence', 0):.2f}")
        if len(mismatched) > 10:
            print(f"\n... 还有 {len(mismatched) - 10} 条记录，请查看 JSON 文件")

if __name__ == "__main__":
    main()
