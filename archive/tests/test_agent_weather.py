#!/usr/bin/env python3
"""
测试 Agent 模式天气查询
"""
import json
import time
import requests
from typing import Generator

def test_agent_weather():
    """测试 Agent 模式天气查询"""
    url = "http://127.0.0.1:5001/api/agent/chat"

    # 测试消息：询问郑州天气
    payload = {
        "messages": [
            {"role": "user", "content": "郑州今天天气怎么样？"}
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }

    print("发送请求到 Agent API...")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii
    print("-" * 50)

    try:
        response = requests.post(url, json=payload, headers=headers, stream=True, timeout=30)  # 响应对象response  # 响应对象response  # 响应对象response

        if response.status_code != 200:  # 判断是否不相等  # 判断是否不相等  # 判断是否不相等
            print(f"HTTP错误: {response.status_code}")
            print(f"响应: {response.text}")
            return

        print("开始接收 SSE 流式响应...")
        print("-" * 50)

        for line in response.iter_lines():  # 遍历line  # 遍历line  # 遍历line
            if line:
                line = line.decode('utf-8')
                if line.startswith('data:'):
                    data_str = line[5:].strip()
                    if data_str:
                        try:
                            data = json.loads(data_str)
                            msg_type = data.get('type', 'unknown')  # 类型变量msg_type  # 类型变量msg_type  # 类型变量msg_type

                            if msg_type == 'content':
                                print(f"内容: {data.get('data', '')}", end='')
                            elif msg_type == 'thinking':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"🤔 思考中: {data.get('label', '')}")
                            elif msg_type == 'tool_result':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"🛠️ 工具结果: {data.get('result', '')}")
                            elif msg_type == 'error':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"❌ 错误: {data.get('message', '')}")
                            elif msg_type == 'done':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print("\n✅ 完成")
                                break
                            else:  # 否则执行  # 否则执行  # 否则执行
                                print(f"未知类型 {msg_type}: {data}")
                        except json.JSONDecodeError as e:
                            print(f"JSON解析错误: {e}, 原始数据: {data_str}")

        print("-" * 50)
        print("测试完成")

    except Exception as e:
        print(f"请求异常: {e}")
        import traceback
        traceback.print_exc()

def test_direct_weather():
    """测试直接天气API"""
    print("\n" + "="*50)
    print("测试直接天气API...")
    print("="*50)

    url = "http://127.0.0.1:5001/api/ai/weather?city=郑州"

    try:
        response = requests.get(url, timeout=10)  # 响应对象response  # 响应对象response  # 响应对象response
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")  # 响应对象print(f"响应: {json.dumps(response.json(), ensure_ascii  # 响应对象print(f"响应: {json.dumps(response.json(), ensure_ascii  # 响应对象print(f"响应: {json.dumps(response.json(), ensure_ascii
    except Exception as e:
        print(f"请求异常: {e}")

if __name__ == "__main__":
    print("="*50)
    print("旅行助手天气功能测试")
    print("="*50)

    # 先测试直接天气API
    test_direct_weather()

    # 再测试Agent模式
    test_agent_weather()