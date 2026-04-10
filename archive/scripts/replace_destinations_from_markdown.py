#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将景点数据从 JSON 格式替换为 Markdown 格式
主脚本：完成整个替换流程
"""

import json
import os
import re
import shutil
from pathlib import Path
import sys


def backup_original_file():
    """备份原有的 destinations.json 文件"""

    original_path = Path("D:/travel-assistant/destinations.json")  # 路径配置original_path  # 路径配置original_path  # 路径配置original_path
    backup_path = Path("D:/travel-assistant/destinations.json.backup")  # 路径配置backup_path  # 路径配置backup_path  # 路径配置backup_path

    if original_path.exists():
        shutil.copy2(original_path, backup_path)
        print(f"✅ 已备份原文件: {backup_path}")
        return True
    else:  # 否则执行  # 否则执行  # 否则执行
        print("⚠ 警告: 原文件不存在，无需备份")
        return False


def parse_markdown_file(markdown_path):  # 解析markdown_file  # 解析markdown_file  # 解析markdown_file
    """解析 Markdown 文件并提取景点数据"""

    print(f"📄 解析 Markdown 文件: {markdown_path}")

    with open(markdown_path, 'r', encoding='utf-8') as f:  # 路径配置with open(markdown_path, 'r', encoding  # 路径配置with open(markdown_path, 'r', encoding  # 路径配置with open(markdown_path, 'r', encoding
        content = f.read()  # 内容变量content  # 内容变量content  # 内容变量content

    # 按景点分隔符分割内容
    sections = re.split(r'\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', content)

    destinations = []

    for section in sections:  # 遍历section  # 遍历section  # 遍历section
        if not section.strip():
            continue

        destination = {}

        # 1. 解析标题行获取景点名称、城市、省份
        title_match = re.search(r'^\s*\d+\.\s*[^\s]+\s+\*\*(.+?)\*\*\s*（([^，]+)，([^)]+?)）', section, re.MULTILINE)
        if title_match:
            destination['name'] = title_match.group(1).strip()['name']['name']['name'
            destination['city'] = title_match.group(2).strip()
            destination['province'] = title_match.group(3).strip()
        else:  # 否则执行  # 否则执行  # 否则执行
            # 尝试更简单的格式
            simple_match = re.search(r'^\s*\d+\.\s*\*\*(.+?)\*\*\s*（([^，]+)，([^)]+?)）', section, re.MULTILINE)
            if simple_match:
                destination['name'] = simple_match.group(1).strip()['name']['name']['name'
                destination['city'] = simple_match.group(2).strip()
                destination['province'] = simple_match.group(3).strip()
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
            # 尝试从其他部分提取描述
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

        # 8. 设置默认值
        destination['review_count'] = 0  # 计数变量destination['review_count']  # 计数变量destination['review_count']  # 计数变量destination['review_count']
        destination['is_open'] = True
        destination['images'] = []
        destination['cover_image'] = ""
        destination['category'] = "其他"  # 稍后根据标签重新分类

        destinations.append(destination)

    print(f"✅ 解析完成: 共找到 {len(destinations)} 个景点")
    return destinations


def classify_destinations(destinations):
    """根据景点名称和标签进行分类"""

    print("🏷️  对景点进行分类...")

    category_counts = {}  # 计数变量category_counts  # 计数变量category_counts  # 计数变量category_counts

    for dest in destinations:  # 遍历dest  # 遍历dest  # 遍历dest
        name = dest.get('name', '')
        tags = dest.get('tags', [])

        # 判断分类
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

        dest['category'] = category
        category_counts[category] = category_counts.get(category, 0) + 1  # 计数变量category_counts[category]  # 计数变量category_counts[category]  # 计数变量category_counts[category]

    print("✅ 分类完成:")
    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):  # 遍历category, count  # 遍历category, count  # 遍历category, count
        print(f"   {category}: {count} 个")

    return destinations


def match_images(destinations, scenic_images_dir):
    """匹配景点对应的图片"""

    print("🖼️  匹配景点图片...")

    if not scenic_images_dir.exists():
        print("⚠ 警告: 图片目录不存在，跳过图片匹配")
        return destinations

    fixed_count = 0  # 计数变量fixed_count  # 计数变量fixed_count  # 计数变量fixed_count

    for dest in destinations:  # 遍历dest  # 遍历dest  # 遍历dest
        scenic_name = dest.get('name', '')
        if not scenic_name:
            continue

        # 清理景点名称
        clean_name = re.sub(r'[\\/*?:"<>|]', '', scenic_name)
        clean_name = clean_name.replace(' ', '_')

        # 查找匹配的图片目录
        image_dir = None  # 路径配置image_dir  # 路径配置image_dir  # 路径配置image_dir

        # 首先尝试精确匹配
        target_dir = scenic_images_dir / clean_name  # 路径配置target_dir  # 路径配置target_dir  # 路径配置target_dir
        if target_dir.exists() and target_dir.is_dir():
            image_dir = target_dir  # 路径配置image_dir  # 路径配置image_dir  # 路径配置image_dir
        else:  # 否则执行  # 否则执行  # 否则执行
            # 尝试部分匹配
            for item in scenic_images_dir.iterdir():  # 遍历item  # 遍历item  # 遍历item
                if item.is_dir():
                    dir_name = item.name  # 路径配置dir_name  # 路径配置dir_name  # 路径配置dir_name
                    # 检查景点名称是否包含在目录名中，或目录名是否包含在景点名称中
                    if clean_name in dir_name or dir_name in clean_name:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                        image_dir = item  # 路径配置image_dir  # 路径配置image_dir  # 路径配置image_dir
                        break

        if image_dir:
            # 查找该目录下的图片文件
            image_files = list(image_dir.glob("*.jpg")) + list(image_dir.glob("*.png")) + list(image_dir.glob("*.webp"))

            if image_files:
                # 按文件名排序
                image_files.sort()

                # 构建图片路径
                image_paths = [f"scenic_images/{image_dir.name}/{img.name}" for img in image_files[:3]]  # 路径配置image_paths  # 路径配置image_paths  # 路径配置image_paths

                # 更新景点数据
                dest['images'] = image_paths
                if image_paths:
                    dest['cover_image'] = image_paths[0]

                fixed_count += 1  # 计数变量fixed_count +  # 计数变量fixed_count +  # 计数变量fixed_count +

    print(f"✅ 图片匹配完成: {fixed_count}/{len(destinations)} 个景点已匹配图片")
    return destinations


def save_destinations_json(destinations, output_path):  # 保存destinations_json  # 保存destinations_json  # 保存destinations_json
    """保存景点数据到 JSON 文件"""

    print(f"💾 保存数据到: {output_path}")

    # 确保所有字段都存在
    for dest in destinations:  # 遍历dest  # 遍历dest  # 遍历dest
        required_fields = {
            'review_count': 0,
            'is_open': True,
            'images': [],
            'cover_image': "",
            'tags': []
        }

        for field, default_value in required_fields.items():  # 遍历field, default_value  # 遍历field, default_value  # 遍历field, default_value
            if field not in dest:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                dest[field] = default_value

    with open(output_path, 'w', encoding='utf-8') as f:  # 路径配置with open(output_path, 'w', encoding  # 路径配置with open(output_path, 'w', encoding  # 路径配置with open(output_path, 'w', encoding
        json.dump(destinations, f, ensure_ascii=False, indent=2)  # JSON数据json.dump(destinations, f, ensure_ascii  # JSON数据json.dump(destinations, f, ensure_ascii  # JSON数据json.dump(destinations, f, ensure_ascii

    print(f"✅ 已保存 {len(destinations)} 个景点数据")
    return output_path


def verify_json_compatibility(json_path):
    """验证 JSON 文件的兼容性"""

    print(f"🔍 验证 JSON 文件兼容性: {json_path}")

    with open(json_path, 'r', encoding='utf-8') as f:  # 路径配置with open(json_path, 'r', encoding  # 路径配置with open(json_path, 'r', encoding  # 路径配置with open(json_path, 'r', encoding
        destinations = json.load(f)

    print(f"   景点总数: {len(destinations)}")

    # 检查必需字段
    required_fields = ['name', 'city', 'province', 'description']
    missing_count = 0  # 计数变量missing_count  # 计数变量missing_count  # 计数变量missing_count

    for i, dest in enumerate(destinations[:5]):  # 只检查前5个  # 遍历并获取索引  # 遍历并获取索引  # 遍历并获取索引
        for field in required_fields:  # 遍历field  # 遍历field  # 遍历field
            if field not in dest or not dest[field]:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                missing_count += 1  # 计数变量missing_count +  # 计数变量missing_count +  # 计数变量missing_count +
                if missing_count <= 3:  # 只显示前3个错误
                    print(f"   ⚠ 第{i+1}个景点 '{dest.get('name', f'景点_{i}')}' 缺少字段: {field}")

    if missing_count == 0:
        print("   ✅ 所有必需字段完整")
    else:  # 否则执行  # 否则执行  # 否则执行
        print(f"   ⚠ 发现 {missing_count} 个字段缺失问题")

    # 显示示例数据
    if destinations:
        sample = destinations[0]
        print(f"\n   第一个景点示例:")
        print(f"     名称: {sample.get('name', '')}")
        print(f"     城市: {sample.get('city', '')}")
        print(f"     省份: {sample.get('province', '')}")
        print(f"     分类: {sample.get('category', '')}")
        print(f"     描述: {sample.get('description', '')[:80]}...")
        print(f"     评分: {sample.get('rating', 0)}")
        print(f"     图片: {len(sample.get('images', []))} 张")

    return destinations


def run_import_script():  # 运行import_script  # 运行import_script  # 运行import_script
    """运行导入脚本"""

    print("🚀 运行景点数据导入脚本...")

    import_script = Path("D:/travel-assistant/scripts/import_destinations_from_json.py")

    if not import_script.exists():
        print("⚠ 警告: 导入脚本不存在，跳过导入")
        return False

    try:
        import subprocess
        result = subprocess.run(  # 结果变量result  # 结果变量result  # 结果变量result
            [sys.executable, str(import_script)],
            cwd="D:/travel-assistant",
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        if result.returncode == 0:
            print("✅ 导入成功!")
            print(f"   输出: {result.stdout.strip()}")
            return True
        else:  # 否则执行  # 否则执行  # 否则执行
            print("❌ 导入失败!")
            print(f"   错误: {result.stderr.strip()}")
            return False

    except Exception as e:
        print(f"❌ 运行导入脚本时出错: {e}")
        return False


def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""

    print("=" * 70)
    print("🔄 景点数据替换工具")
    print("   将 destinations.json 替换为全国景点攻略大全.md 的内容")
    print("=" * 70)

    # 文件路径
    markdown_path = Path("D:/travel-assistant/全国景点攻略大全.md")  # 路径配置markdown_path  # 路径配置markdown_path  # 路径配置markdown_path
    scenic_images_dir = Path("D:/travel-assistant/scenic_images")  # 路径配置scenic_images_dir  # 路径配置scenic_images_dir  # 路径配置scenic_images_dir
    output_json_path = Path("D:/travel-assistant/destinations.json")  # 路径配置output_json_path  # 路径配置output_json_path  # 路径配置output_json_path

    if not markdown_path.exists():
        print(f"❌ 错误: Markdown 文件不存在: {markdown_path}")
        return

    print(f"📁 输入文件: {markdown_path}")
    print(f"📁 图片目录: {scenic_images_dir}")
    print(f"📁 输出文件: {output_json_path}")

    # 步骤1: 备份原文件
    print("\n" + "-" * 40)
    print("步骤1: 备份原文件")
    print("-" * 40)
    backup_original_file()

    # 步骤2: 解析 Markdown 文件
    print("\n" + "-" * 40)
    print("步骤2: 解析 Markdown 文件")
    print("-" * 40)
    destinations = parse_markdown_file(markdown_path)

    if not destinations:
        print("❌ 错误: 未解析到任何景点数据")
        return

    # 步骤3: 对景点进行分类
    print("\n" + "-" * 40)
    print("步骤3: 景点分类")
    print("-" * 40)
    destinations = classify_destinations(destinations)

    # 步骤4: 匹配图片
    print("\n" + "-" * 40)
    print("步骤4: 匹配图片")
    print("-" * 40)
    destinations = match_images(destinations, scenic_images_dir)

    # 步骤5: 保存 JSON 文件
    print("\n" + "-" * 40)
    print("步骤5: 保存 JSON 文件")
    print("-" * 40)
    save_destinations_json(destinations, output_json_path)

    # 步骤6: 验证兼容性
    print("\n" + "-" * 40)
    print("步骤6: 验证兼容性")
    print("-" * 40)
    verify_json_compatibility(output_json_path)

    # 步骤7: 运行导入脚本（可选）
    print("\n" + "-" * 40)
    print("步骤7: 导入到数据库（可选）")
    print("-" * 40)

    choice = input("是否立即运行导入脚本将数据导入数据库？(y/n): ")
    if choice.lower() == 'y':
        run_import_script()
    else:  # 否则执行  # 否则执行  # 否则执行
        print("跳过导入，您可以稍后手动运行:")
        print("  python scripts/import_destinations_from_json.py")

    # 完成
    print("\n" + "=" * 70)
    print("✅ 替换完成!")
    print("=" * 70)

    print(f"\n📊 统计数据:")
    print(f"   景点总数: {len(destinations)}")

    # 分类统计
    categories = {}
    provinces = {}
    for dest in destinations:  # 遍历dest  # 遍历dest  # 遍历dest
        category = dest.get('category', '未知')
        province = dest.get('province', '未知')

        categories[category] = categories.get(category, 0) + 1
        provinces[province] = provinces.get(province, 0) + 1

    print(f"   分类统计:")
    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]:  # 遍历category, count  # 遍历category, count  # 遍历category, count
        print(f"     {category}: {count} 个")

    print(f"\n   省份统计 (前5):")
    for province, count in sorted(provinces.items(), key=lambda x: x[1], reverse=True)[:5]:  # 遍历province, count  # 遍历province, count  # 遍历province, count
        print(f"     {province}: {count} 个")

    print(f"\n📁 生成的文件:")
    print(f"   备份文件: D:/travel-assistant/destinations.json.backup")
    print(f"   新数据文件: {output_json_path}")

    print(f"\n📋 下一步:")
    print(f"   1. 启动应用测试新数据: npm run dev (前端) + python app.py (后端)")
    print(f"   2. 检查景点详情页是否正常显示")
    print(f"   3. 测试 AI 助手功能是否正常")


if __name__ == "__main__":
    main()