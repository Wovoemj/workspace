#!/usr/bin/env python3
"""
测试天气查询函数
"""
import sys
sys.path.insert(0, "d:\\travel-assistant")

# 导入必要的函数
from app import is_weather_query, handle_weather_intent

test_cases = [
    "郑州今天天气怎么样？",
    "郑州天气",
    "北京明天会下雨吗",
    "上海温度多少",
    "你好",
    "我想去旅行",
    "杭州的天气",
    "今天郑州天气如何",
]

print("测试天气查询函数")
print("="*50)

for test in test_cases:  # 遍历test  # 遍历test  # 遍历test
    is_weather, city = is_weather_query(test)
    print(f"输入: '{test}'")
    print(f"  是否天气查询: {is_weather}")
    print(f"  提取的城市: '{city}'")

    if is_weather and city:
        result = handle_weather_intent(test)  # 结果变量result  # 结果变量result  # 结果变量result
        print(f"  天气信息: {result[:50] if result else 'None'}...")

    print("-" * 30)