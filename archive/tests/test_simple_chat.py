#!/usr/bin/env python3
"""
测试普通聊天模式
"""
import json
import requests

def test_simple_chat():
    """测试普通聊天API"""
    url = "http://127.0.0.1:5001/api/chat"

    # 测试消息：简单问候
    payload = {
        "message": "你好",
        "provider": "moonshot"
    }

    headers = {
        "Content-Type": "application/json"
    }

    print("发送请求到普通聊天API...")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii
    print("-" * 50)

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)  # 响应对象response  # 响应对象response  # 响应对象response

        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()  # 结果变量result  # 结果变量result  # 结果变量result
            print(f"响应成功:")
            print(json.dumps(result, ensure_ascii=False, indent=2))  # 结果变量print(json.dumps(result, ensure_ascii  # 结果变量print(json.dumps(result, ensure_ascii  # 结果变量print(json.dumps(result, ensure_ascii
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"响应失败: {response.text}")

    except Exception as e:
        print(f"请求异常: {e}")
        import traceback
        traceback.print_exc()

def test_agent_with_different_message():
    """用不同的消息测试Agent模式"""
    url = "http://127.0.0.1:5001/api/agent/chat"

    # 测试消息：简单问候，不触发工具调用
    payload = {
        "messages": [
            {"role": "user", "content": "你好，请介绍一下你自己"}
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }

    print("\n" + "="*50)
    print("测试Agent模式简单问候...")
    print("="*50)
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

        content_parts = []  # 内容变量content_parts  # 内容变量content_parts  # 内容变量content_parts

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
                                content = data.get('data', '')  # 内容变量content  # 内容变量content  # 内容变量content
                                print(content, end='')  # 内容变量print(content, end  # 内容变量print(content, end  # 内容变量print(content, end
                                content_parts.append(content)
                            elif msg_type == 'thinking':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"\n🤔 {data.get('label', '')}")
                            elif msg_type == 'tool_result':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"\n🛠️ 工具结果: {data.get('preview', '')}")
                            elif msg_type == 'error':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"\n❌ 错误: {data.get('message', '')}")
                            elif msg_type == 'done':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print("\n\n✅ 完成")
                                break
                        except json.JSONDecodeError as e:
                            print(f"\nJSON解析错误: {e}, 原始数据: {data_str}")

        print("-" * 50)
        print(f"总内容长度: {len(''.join(content_parts))}")

    except Exception as e:
        print(f"请求异常: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("="*50)
    print("聊天功能综合测试")
    print("="*50)

    # 先测试普通聊天
    test_simple_chat()

    # 再测试Agent模式简单问候
    test_agent_with_different_message()