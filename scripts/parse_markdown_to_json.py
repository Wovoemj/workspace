#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从全国景点攻略大全.md 文件解析景点数据并生成 JSON 格式
"""

import re
import json
from pathlib import Path
import sys


def parse_markdown_to_json(markdown_path: str, output_path: str = None):  # 解析markdown_to_json  # 解析markdown_to_json  # 解析markdown_to_json
    """解析 Markdown 文件并生成 JSON 格式的景点数据"""

    with open(markdown_path, 'r', encoding='utf-8') as f:  # 路径配置with open(markdown_path, 'r', encoding  # 路径配置with open(markdown_path, 'r', encoding  # 路径配置with open(markdown_path, 'r', encoding
        content = f.read()  # 内容变量content  # 内容变量content  # 内容变量content

    # 按景点分隔符分割内容
    # 每个景点以数字编号开头，如 "1. 🏮 **故宫博物院**（北京市，北京）"
    # 景点之间用 "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" 分隔
    sections = re.split(r'\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', content)

    destinations = []

    for section in sections:  # 遍历section  # 遍历section  # 遍历section
        if not section.strip():
            continue

        # 解析景点基本信息
        destination = {}

        # 1. 解析标题行获取景点名称、城市、省份
        # 尝试匹配格式：数字. [emoji] **景点名称**（城市，省份）
        title_match = re.search(r'^\s*(\d+)\.\s*[^\s]+\s+\*\*(.+?)\*\*\s*（([^，]+)，([^)]+?)）', section, re.MULTILINE)
        if title_match:
            destination['name'] = title_match.group(2).strip()['name']['name']['name'
            destination['city'] = title_match.group(3).strip()
            destination['province'] = title_match.group(4).strip()
        else:  # 否则执行  # 否则执行  # 否则执行
            # 尝试匹配没有emoji的格式：数字. **景点名称**（城市，省份）
            alt_match = re.search(r'^\s*(\d+)\.\s+\*\*(.+?)\*\*\s*（([^，]+)，([^)]+?)）', section, re.MULTILINE)
            if alt_match:
                destination['name'] = alt_match.group(2).strip()['name']['name']['name'
                destination['city'] = alt_match.group(3).strip()
                destination['province'] = alt_match.group(4).strip()
            else:  # 否则执行  # 否则执行  # 否则执行
                # 再尝试更简单的格式
                simple_match = re.search(r'^\s*\d+\.\s*\*\*(.+?)\*\*\s*（([^，]+)，([^)]+?)）', section, re.MULTILINE)
                if simple_match:
                    destination['name'] = simple_match.group(1).strip()['name']['name']['name'
                    destination['city'] = simple_match.group(2).strip()
                    destination['province'] = simple_match.group(3).strip()
                else:  # 否则执行  # 否则执行  # 否则执行
                    # 如果还是无法解析，尝试提取第一行
                    lines = section.strip().split('\n')
                    first_line = lines[0] if lines else ""
                    # 尝试从第一行提取
                    first_line_match = re.search(r'\*\*(.+?)\*\*\s*（([^，]+)，([^)]+?)）', first_line)
                    if first_line_match:
                        destination['name'] = first_line_match.group(1).strip()['name']['name']['name'
                        destination['city'] = first_line_match.group(2).strip()
                        destination['province'] = first_line_match.group(3).strip()
                    else:  # 否则执行  # 否则执行  # 否则执行
                        continue  # 跳过无法解析的景点

        # 2. 解析地址
        address_match = re.search(r'📍\s*\*\*地址\*\*：(.+)', section)
        if address_match:
            destination['address'] = address_match.group(1).strip()
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['address'] = ""

        # 3. 解析门票
        ticket_match = re.search(r'🎫\s*\*\*门票\*\*：(.+)', section)
        if ticket_match:
            destination['price_range'] = ticket_match.group(1).strip()
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['price_range'] = ""

        # 4. 解析开放时间
        time_match = re.search(r'⏰\s*\*\*开放时间\*\*：(.+)', section)
        if time_match:
            time_text = time_match.group(1).strip()
            # 移除状态标记
            time_text = re.sub(r'（✅\s*正常开放）', '', time_text)
            time_text = re.sub(r'（❌\s.*?）', '', time_text)
            destination['opening_hours'] = time_text.strip()
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['opening_hours'] = ""

        # 5. 解析评分和热度
        rating_match = re.search(r'⭐\s*\*\*评分\*\*：([\d.]+)', section)
        if rating_match:
            try:
                destination['rating'] = float(rating_match.group(1))
            except:
                destination['rating'] = 4.5
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['rating'] = 4.5

        heat_match = re.search(r'🔥\s*\*\*热度\*\*：([\d.]+)', section)
        if heat_match:
            try:
                destination['popularity_score'] = float(heat_match.group(1))
            except:
                destination['popularity_score'] = 80.0
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['popularity_score'] = 80.0

        # 6. 解析一句话定位（描述）
        desc_match = re.search(r'📌\s*\*\*一句话定位\*\*：(.+)', section)
        if desc_match:
            destination['description'] = desc_match.group(1).strip()
        else:  # 否则执行  # 否则执行  # 否则执行
            # 如果没有一句话定位，尝试从其他部分提取描述
            lines = section.split('\n')
            for line in lines:  # 遍历line  # 遍历line  # 遍历line
                if '一句话定位' in line:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                    desc_match = re.search(r'：(.+)', line)
                    if desc_match:
                        destination['description'] = desc_match.group(1).strip()
                        break
            if 'description' not in destination:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                destination['description'] = f"{destination['name']}位于{destination['city']}，是一个值得游览的景点。"

        # 7. 解析标签
        tags_match = re.search(r'🏷️\s*\*\*标签\*\*：(.+)', section)
        if tags_match:
            tags_text = tags_match.group(1).strip()
            # 分割标签，支持多种分隔符
            tags = re.split(r'[·、，,;；\s]+', tags_text)
            destination['tags'] = [tag.strip() for tag in tags if tag.strip()]
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['tags'] = []

        # 8. 解析必看清单（提取前几个）
        must_see_section = re.search(r'【必看清单】\n(.+?)(?:\n\n|\n🗓️|\n📸|\n💡|$)', section, re.DOTALL)
        if must_see_section:
            must_see_text = must_see_section.group(1)
            # 提取清单项
            must_see_items = re.findall(r'\d+\.\s*(.+?)(?=\n\d+\.|\n\n|$)', must_see_text)  # 单条数据must_see_items  # 单条数据must_see_items  # 单条数据must_see_items
            destination['must_see'] = [item.strip() for item in must_see_items[:4]]  # 最多取4个
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['must_see'] = []

        # 9. 解析推荐游览路线
        route_match = re.search(r'🗓️\s*\*\*推荐游览路线\*\*\n\*\*建议路线\*\*：(.+?)(?:\n\n|\n📸|\n💡|$)', section, re.DOTALL)
        if route_match:
            destination['recommended_route'] = route_match.group(1).strip()
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['recommended_route'] = ""

        # 10. 解析拍照攻略
        photo_match = re.search(r'📸\s*\*\*拍照攻略\*\*\n(.+?)(?:\n\n|\n💡|$)', section, re.DOTALL)
        if photo_match:
            photo_text = photo_match.group(1)
            # 提取拍照建议
            photo_tips = re.findall(r'[-•*]\s*(.+?)(?=\n[-•*]|\n\n|$)', photo_text)
            destination['photo_tips'] = [tip.strip() for tip in photo_tips[:3]]  # 最多取3个
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['photo_tips'] = []

        # 11. 解析实用贴士
        tips_match = re.search(r'💡\s*\*\*实用贴士\*\*\n(.+?)(?=\n━━━━|$)', section, re.DOTALL)
        if tips_match:
            tips_text = tips_match.group(1)
            # 提取贴士
            tips = re.findall(r'[-•*]\s*(.+?)(?=\n[-•*]|\n\n|$)', tips_text)
            destination['practical_tips'] = [tip.strip() for tip in tips[:5]]  # 最多取5个
        else:  # 否则执行  # 否则执行  # 否则执行
            destination['practical_tips'] = []

        # 12. 确定分类
        # 根据标签和名称判断分类
        name = destination['name']
        tags = destination['tags']

        if any(tag in ['博物馆', '纪念馆', '展览馆', '美术馆'] for tag in tags) or '博物馆' in name or '纪念馆' in name:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            category = '博物馆纪念馆'
        elif any(tag in ['历史文化', '古建筑', '寺庙', '古遗址'] for tag in tags) or '寺' in name or '庙' in name or '遗址' in name:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            category = '历史文化'
        elif any(tag in ['自然风光', '山川', '湖泊', '河流', '公园', '风景区'] for tag in tags) or '山' in name or '湖' in name or '公园' in name:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            category = '自然风光'
        elif any(tag in ['主题公园', '游乐园', '动物园', '海洋公园'] for tag in tags) or '乐园' in name or '公园' in name:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            category = '主题公园'
        elif any(tag in ['城市地标', '广场', '塔', '桥'] for tag in tags):  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            category = '城市地标'
        else:  # 否则执行  # 否则执行  # 否则执行
            category = '其他'

        destination['category'] = category

        # 13. 设置默认值
        destination['review_count'] = 0  # 计数变量destination['review_count']  # 计数变量destination['review_count']  # 计数变量destination['review_count']
        destination['is_open'] = True
        destination['images'] = []
        destination['cover_image'] = ""

        # 14. 尝试匹配图片路径
        # 根据景点名称构建可能的图片路径
        scenic_name = destination['name']
        # 移除特殊字符和空格
        clean_name = re.sub(r'[\\/*?:"<>|]', '', scenic_name)
        clean_name = clean_name.replace(' ', '_')

        # 检查图片目录是否存在
        scenic_images_dir = Path(markdown_path).parent / "scenic_images"  # 路径配置scenic_images_dir  # 路径配置scenic_images_dir  # 路径配置scenic_images_dir
        if scenic_images_dir.exists():
            # 查找匹配的图片目录
            for item in scenic_images_dir.iterdir():  # 遍历item  # 遍历item  # 遍历item
                if item.is_dir() and clean_name in item.name:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                    # 查找该目录下的图片
                    image_files = list(item.glob("*.jpg")) + list(item.glob("*.png")) + list(item.glob("*.webp"))
                    if image_files:
                        # 按文件名排序，取前几张
                        image_files.sort()
                        destination['images'] = [f"scenic_images/{item.name}/{img.name}" for img in image_files[:3]]
                        if destination['images']:
                            destination['cover_image'] = destination['images'][0]
                        break

        destinations.append(destination)

    # 输出统计信息
    print(f"解析完成：共找到 {len(destinations)} 个景点")
    print(f"示例景点：{destinations[0]['name'] if destinations else '无'}")

    # 如果需要保存到文件
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:  # 路径配置with open(output_path, 'w', encoding  # 路径配置with open(output_path, 'w', encoding  # 路径配置with open(output_path, 'w', encoding
            json.dump(destinations, f, ensure_ascii=False, indent=2)  # JSON数据json.dump(destinations, f, ensure_ascii  # JSON数据json.dump(destinations, f, ensure_ascii  # JSON数据json.dump(destinations, f, ensure_ascii
        print(f"已保存到：{output_path}")

    return destinations


def create_compatible_json(destinations, output_path):  # 创建compatible_json  # 创建compatible_json  # 创建compatible_json
    """创建与现有 destinations.json 格式兼容的 JSON 文件"""

    compatible_destinations = []

    for dest in destinations:  # 遍历dest  # 遍历dest  # 遍历dest
        compatible_dest = {
            "name": dest.get("name", ""),
            "city": dest.get("city", ""),
            "province": dest.get("province", ""),
            "category": dest.get("category", "其他"),
            "description": dest.get("description", ""),
            "price_range": dest.get("price_range", ""),
            "rating": dest.get("rating", 4.5),
            "review_count": dest.get("review_count", 0),
            "opening_hours": dest.get("opening_hours", ""),
            "address": dest.get("address", ""),
            "popularity_score": dest.get("popularity_score", 80.0),
            "is_open": dest.get("is_open", True),
            "tags": dest.get("tags", []),
            "images": dest.get("images", []),
            "cover_image": dest.get("cover_image", "")
        }
        compatible_destinations.append(compatible_dest)

    with open(output_path, 'w', encoding='utf-8') as f:  # 路径配置with open(output_path, 'w', encoding  # 路径配置with open(output_path, 'w', encoding  # 路径配置with open(output_path, 'w', encoding
        json.dump(compatible_destinations, f, ensure_ascii=False, indent=2)  # JSON数据json.dump(compatible_destinations, f, ensure_ascii  # JSON数据json.dump(compatible_destinations, f, ensure_ascii  # JSON数据json.dump(compatible_destinations, f, ensure_ascii

    print(f"已创建兼容格式 JSON 文件：{output_path}")
    print(f"包含 {len(compatible_destinations)} 个景点")

    return compatible_destinations


def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""
    markdown_path = Path("D:/travel-assistant/全国景点攻略大全.md")  # 路径配置markdown_path  # 路径配置markdown_path  # 路径配置markdown_path
    output_path = Path("D:/travel-assistant/destinations_from_md.json")  # 路径配置output_path  # 路径配置output_path  # 路径配置output_path
    compatible_path = Path("D:/travel-assistant/destinations_compatible.json")  # 路径配置compatible_path  # 路径配置compatible_path  # 路径配置compatible_path

    if not markdown_path.exists():
        print(f"错误：Markdown 文件不存在：{markdown_path}")
        return

    print(f"开始解析 Markdown 文件：{markdown_path}")

    try:
        # 解析 Markdown 文件
        destinations = parse_markdown_to_json(str(markdown_path))

        # 保存原始解析结果
        with open(output_path, 'w', encoding='utf-8') as f:  # 路径配置with open(output_path, 'w', encoding  # 路径配置with open(output_path, 'w', encoding  # 路径配置with open(output_path, 'w', encoding
            json.dump(destinations, f, ensure_ascii=False, indent=2)  # JSON数据json.dump(destinations, f, ensure_ascii  # JSON数据json.dump(destinations, f, ensure_ascii  # JSON数据json.dump(destinations, f, ensure_ascii
        print(f"原始解析结果已保存到：{output_path}")

        # 创建兼容格式的 JSON
        compatible_destinations = create_compatible_json(destinations, compatible_path)

        # 显示前几个景点作为示例
        print("\n前5个景点示例：")
        for i, dest in enumerate(compatible_destinations[:5]):  # 遍历并获取索引  # 遍历并获取索引  # 遍历并获取索引
            print(f"{i+1}. {dest['name']} - {dest['city']}, {dest['province']}")
            print(f"   描述：{dest['description'][:80]}...")
            print(f"   评分：{dest['rating']}，热度：{dest['popularity_score']}")
            print()

        print(f"\n解析完成！")
        print(f"1. 原始解析结果：{output_path}")
        print(f"2. 兼容格式 JSON：{compatible_path}")
        print(f"\n使用方法：")
        print(f"1. 备份原有的 destinations.json 文件")
        print(f"2. 将 {compatible_path} 重命名为 destinations.json")
        print(f"3. 运行导入脚本：python scripts/import_destinations_from_json.py")

    except Exception as e:
        print(f"解析过程中出现错误：{e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()