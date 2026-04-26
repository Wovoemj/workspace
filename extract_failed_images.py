"""
从JSON文件中提取所有失败的图片信息
"""
import json
import re

with open('all_image_check_results_20260420_203610.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

failed_images = []
for item in data:
    if item.get('is_match') == False or item.get('is_match') is None:
        failed_images.append({
            'destination': item.get('destination', ''),
            'image_path': item.get('image_path', ''),
            'reason': item.get('reason', '')[:100]
        })

print(f"总计失败图片: {len(failed_images)} 张")

# 按景点分组统计
from collections import Counter
dest_counts = Counter([img['destination'] for img in failed_images])
print("\n按景点统计失败数量（前20）:")
for dest, count in dest_counts.most_common(20):
    print(f"  {dest}: {count}张")

# 保存失败图片列表
with open('failed_images.json', 'w', encoding='utf-8') as f:
    json.dump(failed_images, f, ensure_ascii=False, indent=2)

print(f"\n失败图片列表已保存到 failed_images.json")
