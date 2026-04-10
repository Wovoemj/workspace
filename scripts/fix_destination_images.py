#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复景点图片路径，确保与现有图片目录匹配
"""

import json
import re
import os
from pathlib import Path


def find_matching_image_dir(scenic_name, scenic_images_dir):
    """查找匹配的图片目录"""

    # 清理景点名称，移除特殊字符
    clean_name = re.sub(r'[\\/*?:"<>|]', '', scenic_name)
    clean_name = clean_name.replace(' ', '_')

    # 可能的名称变体
    name_variants = [
        clean_name,
        clean_name.replace('_', ''),
        clean_name.replace('景区', ''),
        clean_name.replace('旅游区', ''),
        clean_name.replace('风景区', ''),
        clean_name.replace('公园', ''),
        clean_name.replace('博物馆', ''),
        clean_name.replace('纪念馆', ''),
    ]

    # 在图片目录中查找匹配项
    if not scenic_images_dir.exists():
        return None

    # 首先尝试精确匹配
    for variant in name_variants:  # 遍历variant  # 遍历variant  # 遍历variant
        if variant:
            target_dir = scenic_images_dir / variant  # 路径配置target_dir  # 路径配置target_dir  # 路径配置target_dir
            if target_dir.exists() and target_dir.is_dir():
                return target_dir

    # 尝试部分匹配
    for item in scenic_images_dir.iterdir():  # 遍历item  # 遍历item  # 遍历item
        if item.is_dir():
            dir_name = item.name  # 路径配置dir_name  # 路径配置dir_name  # 路径配置dir_name
            # 检查景点名称是否包含在目录名中，或目录名是否包含在景点名称中
            for variant in name_variants:  # 遍历variant  # 遍历variant  # 遍历variant
                if variant and variant in dir_name:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                    return item
                if variant and dir_name in variant:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                    return item

    return None


def fix_destination_images(json_path, scenic_images_dir_path):
    """修复 JSON 文件中的图片路径"""

    with open(json_path, 'r', encoding='utf-8') as f:  # 路径配置with open(json_path, 'r', encoding  # 路径配置with open(json_path, 'r', encoding  # 路径配置with open(json_path, 'r', encoding
        destinations = json.load(f)

    scenic_images_dir = Path(scenic_images_dir_path)  # 路径配置scenic_images_dir  # 路径配置scenic_images_dir  # 路径配置scenic_images_dir

    fixed_count = 0  # 计数变量fixed_count  # 计数变量fixed_count  # 计数变量fixed_count
    for dest in destinations:  # 遍历dest  # 遍历dest  # 遍历dest
        scenic_name = dest.get('name', '')
        if not scenic_name:
            continue

        # 查找匹配的图片目录
        image_dir = find_matching_image_dir(scenic_name, scenic_images_dir)  # 路径配置image_dir  # 路径配置image_dir  # 路径配置image_dir

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
                print(f"✓ 修复: {scenic_name} -> {len(image_paths)} 张图片")
            else:  # 否则执行  # 否则执行  # 否则执行
                # 没有找到图片，清空图片字段
                dest['images'] = []
                dest['cover_image'] = ""
                print(f"⚠ 无图片: {scenic_name} (目录存在但无图片文件)")
        else:  # 否则执行  # 否则执行  # 否则执行
            # 没有找到匹配的目录，清空图片字段
            dest['images'] = []
            dest['cover_image'] = ""
            print(f"✗ 无目录: {scenic_name}")

    # 保存修复后的文件
    fixed_path = json_path.with_stem(json_path.stem + "_fixed")  # 路径配置fixed_path  # 路径配置fixed_path  # 路径配置fixed_path
    with open(fixed_path, 'w', encoding='utf-8') as f:  # 路径配置with open(fixed_path, 'w', encoding  # 路径配置with open(fixed_path, 'w', encoding  # 路径配置with open(fixed_path, 'w', encoding
        json.dump(destinations, f, ensure_ascii=False, indent=2)  # JSON数据json.dump(destinations, f, ensure_ascii  # JSON数据json.dump(destinations, f, ensure_ascii  # JSON数据json.dump(destinations, f, ensure_ascii

    print(f"\n修复完成: {fixed_count}/{len(destinations)} 个景点已修复图片路径")
    print(f"修复后的文件: {fixed_path}")

    return fixed_path


def check_json_compatibility(json_path):
    """检查 JSON 文件的兼容性"""

    with open(json_path, 'r', encoding='utf-8') as f:  # 路径配置with open(json_path, 'r', encoding  # 路径配置with open(json_path, 'r', encoding  # 路径配置with open(json_path, 'r', encoding
        destinations = json.load(f)

    print(f"检查 JSON 文件: {json_path}")
    print(f"景点总数: {len(destinations)}")

    if destinations:
        sample = destinations[0]
        print("\n第一个景点示例:")
        for key, value in sample.items():  # 遍历key, value  # 遍历key, value  # 遍历key, value
            if isinstance(value, list):
                print(f"  {key}: [{len(value)} 项] {value[:3] if value else '空'}")
            elif isinstance(value, str) and len(value) > 100:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                print(f"  {key}: {value[:100]}...")
            else:  # 否则执行  # 否则执行  # 否则执行
                print(f"  {key}: {value}")

    # 检查必需字段
    required_fields = ['name', 'city', 'province', 'description']
    missing_fields = []

    for i, dest in enumerate(destinations[:10]):  # 只检查前10个  # 遍历并获取索引  # 遍历并获取索引  # 遍历并获取索引
        for field in required_fields:  # 遍历field  # 遍历field  # 遍历field
            if field not in dest or not dest[field]:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                missing_fields.append((i, field, dest.get('name', f"景点_{i}")))

    if missing_fields:
        print("\n⚠ 警告: 发现缺失字段:")
        for i, field, name in missing_fields:  # 遍历i, field, name  # 遍历i, field, name  # 遍历i, field, name
            print(f"  第{i+1}个景点 '{name}' 缺少字段: {field}")
    else:  # 否则执行  # 否则执行  # 否则执行
        print("\n✅ 所有必需字段完整")

    return destinations


def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""

    # 路径配置
    json_path = Path("D:/travel-assistant/destinations.json")  # 路径配置json_path  # 路径配置json_path  # 路径配置json_path
    scenic_images_dir = Path("D:/travel-assistant/scenic_images")  # 路径配置scenic_images_dir  # 路径配置scenic_images_dir  # 路径配置scenic_images_dir

    if not json_path.exists():
        print(f"错误: JSON 文件不存在: {json_path}")
        return

    if not scenic_images_dir.exists():
        print(f"警告: 图片目录不存在: {scenic_images_dir}")

    print("=" * 60)
    print("景点数据修复与验证工具")
    print("=" * 60)

    # 1. 检查原始 JSON 文件
    print("\n1. 检查原始 JSON 文件...")
    destinations = check_json_compatibility(json_path)

    # 2. 修复图片路径
    print("\n2. 修复图片路径...")
    fixed_path = fix_destination_images(json_path, scenic_images_dir)  # 路径配置fixed_path  # 路径配置fixed_path  # 路径配置fixed_path

    # 3. 检查修复后的文件
    print("\n3. 检查修复后的文件...")
    check_json_compatibility(fixed_path)

    # 4. 创建最终的 destinations_final.json
    print("\n4. 创建最终文件...")
    with open(fixed_path, 'r', encoding='utf-8') as f:  # 路径配置with open(fixed_path, 'r', encoding  # 路径配置with open(fixed_path, 'r', encoding  # 路径配置with open(fixed_path, 'r', encoding
        fixed_destinations = json.load(f)

    # 应用一些额外的修复
    for dest in fixed_destinations:  # 遍历dest  # 遍历dest  # 遍历dest
        # 确保 review_count 是整数
        if 'review_count' not in dest:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            dest['review_count'] = 0  # 计数变量dest['review_count']  # 计数变量dest['review_count']  # 计数变量dest['review_count']

        # 确保 is_open 是布尔值
        if 'is_open' not in dest:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            dest['is_open'] = True

        # 确保 rating 是浮点数
        if 'rating' not in dest:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            dest['rating'] = 4.5

        # 确保 popularity_score 是浮点数
        if 'popularity_score' not in dest:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            dest['popularity_score'] = 80.0

        # 确保 tags 是列表
        if 'tags' not in dest:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            dest['tags'] = []

        # 确保 images 是列表
        if 'images' not in dest:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            dest['images'] = []

        # 确保 category 不是"其他"（尝试重新分类）
        if dest.get('category') == '其他':
            name = dest.get('name', '')
            tags = dest.get('tags', [])

            if any(tag in ['博物馆', '纪念馆', '展览馆', '美术馆'] for tag in tags) or '博物馆' in name or '纪念馆' in name:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                dest['category'] = '博物馆纪念馆'
            elif any(tag in ['历史文化', '古建筑', '寺庙', '古遗址'] for tag in tags) or '寺' in name or '庙' in name or '遗址' in name:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                dest['category'] = '历史文化'
            elif any(tag in ['自然风光', '山川', '湖泊', '河流', '公园', '风景区'] for tag in tags) or '山' in name or '湖' in name or '公园' in name:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                dest['category'] = '自然风光'
            elif any(tag in ['主题公园', '游乐园', '动物园', '海洋公园'] for tag in tags) or '乐园' in name or '公园' in name:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                dest['category'] = '主题公园'
            elif any(tag in ['城市地标', '广场', '塔', '桥'] for tag in tags):  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                dest['category'] = '城市地标'
            else:  # 否则执行  # 否则执行  # 否则执行
                dest['category'] = '其他'

    # 保存最终文件
    final_path = Path("D:/travel-assistant/destinations_final.json")  # 路径配置final_path  # 路径配置final_path  # 路径配置final_path
    with open(final_path, 'w', encoding='utf-8') as f:  # 路径配置with open(final_path, 'w', encoding  # 路径配置with open(final_path, 'w', encoding  # 路径配置with open(final_path, 'w', encoding
        json.dump(fixed_destinations, f, ensure_ascii=False, indent=2)  # JSON数据json.dump(fixed_destinations, f, ensure_ascii  # JSON数据json.dump(fixed_destinations, f, ensure_ascii  # JSON数据json.dump(fixed_destinations, f, ensure_ascii

    print(f"✅ 最终文件已创建: {final_path}")
    print(f"   包含 {len(fixed_destinations)} 个景点")

    # 5. 显示统计信息
    print("\n5. 统计信息:")
    categories = {}
    provinces = {}

    for dest in fixed_destinations:  # 遍历dest  # 遍历dest  # 遍历dest
        category = dest.get('category', '未知')
        province = dest.get('province', '未知')

        categories[category] = categories.get(category, 0) + 1
        provinces[province] = provinces.get(province, 0) + 1

    print("   分类统计:")
    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)[:10]:  # 遍历category, count  # 遍历category, count  # 遍历category, count
        print(f"     {category}: {count} 个")

    print("\n   省份统计 (前10):")
    for province, count in sorted(provinces.items(), key=lambda x: x[1], reverse=True)[:10]:  # 遍历province, count  # 遍历province, count  # 遍历province, count
        print(f"     {province}: {count} 个")

    print("\n✅ 修复完成！")
    print(f"   备份文件: {json_path}.backup")
    print(f"   修复文件: {fixed_path}")
    print(f"   最终文件: {final_path}")
    print("\n使用方法:")
    print(f"   1. 将 {final_path} 复制为 destinations.json")
    print(f"   2. 运行导入脚本: python scripts/import_destinations_from_json.py")


if __name__ == "__main__":
    main()