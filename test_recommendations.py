#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试景点推荐数据 API"""

from app import app
import json

client = app.test_client()

print("=" * 60)
print("测试 /api/destinations/<id>/recommendations API")
print("=" * 60)

# 测试故宫
def test_destination(dest_id, name):
    print(f"\n📍 {name} (ID: {dest_id}):")
    resp = client.get(f'/api/destinations/{dest_id}/recommendations')
    print(f"   Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = json.loads(resp.data)
        if data.get('success'):
            rec = data['recommendations']
            print(f"   Highlights: {len(rec['highlights'])} 项")
            for h in rec['highlights'][:2]:
                print(f"      - {h['title']}: {h['description'][:30]}...")
            print(f"   Timeline: {len(rec['timeline'])} 项")
            for t in rec['timeline'][:2]:
                print(f"      - {t['timeLabel']}: {t['title']}")
            print(f"   Tips: {len(rec['tips'])} 项")

# 测试几个不同的景点
test_destination(1, "故宫")  # 假设ID 1是故宫
test_destination(2, "长城")  # 假设ID 2是长城
test_destination(3, "颐和园")  # 假设ID 3是颐和园

print("\n" + "=" * 60)
print("测试完成!")
