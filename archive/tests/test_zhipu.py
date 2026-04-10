#!/usr/bin/env python3
"""
测试智谱GLM API
"""
import json
import os
import requests
from openai import OpenAI

def test_zhipu_direct():
    """直接测试智谱API"""
    print("="*50)
    print("测试智谱GLM API")
    print("="*50)

    api_key = "21b72c0e3f0c42b3bb48ede1cccf6fd7.kZWVri6LIu783YN8"
    base_url = "https://open.bigmodel.cn/api/paas/v4"
    model = "glm-4-flash"

    client = OpenAI(
        api_key=api_key,
        base_url=base_url,
    )

    try:
        print(f"使用模型: {model}")
        print("发送简单消息...")

        response = client.chat.completions.create(  # 响应对象response  # 响应对象response  # 响应对象response
            model=model,
            messages=[{"role": "user", "content": "你好，请简单介绍一下你自己"}],  # 消息内容messages  # 消息内容messages  # 消息内容messages
            temperature=0.7,
            max_tokens=100,  # 令牌配置max_tokens  # 令牌配置max_tokens  # 令牌配置max_tokens
        )

        print("响应成功!")
        print(f"回复: {response.choices[0].message.content}")

    except Exception as e:
        print(f"API调用失败: {e}")
        import traceback
        traceback.print_exc()

def test_agent_with_zhipu():
    """测试使用智谱的Agent模式"""
    print("\n" + "="*50)
    print("测试使用智谱的Agent模式")
    print("="*50)

    url = "http://127.0.0.1:5001/api/agent/chat"

    payload = {
        "messages": [
            {"role": "user", "content": "郑州今天天气怎么样？"}
        ],
        "provider": "zhipu"  # 指定使用智谱
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }

    print(f"发送请求到: {url}")
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
                                result = data.get('preview', data.get('result', ''))  # 结果变量result  # 结果变量result  # 结果变量result
                                print(f"\n🛠️ 工具结果: {result[:100]}...")
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

def test_backend_restart():
    """测试重启后端"""
    print("\n" + "="*50)
    print("检查后端状态...")
    print("="*50)

    import subprocess
    import time

    # 检查后端进程
    try:
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True, shell=True)  # 结果变量result  # 结果变量result  # 结果变量result
        if ':5001' in result.stdout:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            print("后端正在端口5001运行")
        else:  # 否则执行  # 否则执行  # 否则执行
            print("后端未在端口5001运行")
    except:
        pass

    # 测试简单端点
    try:
        response = requests.get("http://127.0.0.1:5001/", timeout=5)  # 响应对象response  # 响应对象response  # 响应对象response
        print(f"后端响应: {response.status_code}")
    except Exception as e:
        print(f"后端不可达: {e}")

if __name__ == "__main__":
    # 测试智谱直接API
    test_zhipu_direct()

    # 检查后端状态
    test_backend_restart()

    # 测试使用智谱的Agent模式
    test_agent_with_zhipu()