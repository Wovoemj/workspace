import requests
import json
import time

def test_agent_weather():
    """测试Agent模式天气查询"""
    print("="*50)
    print("测试Agent模式天气查询")
    print("="*50)

    url = "http://127.0.0.1:5001/api/agent/chat"

    # 测试消息：询问天气
    payload = {
        "messages": [
            {"role": "user", "content": "郑州今天天气怎么样？"}
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }

    print(f"发送请求到: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii  # JSON数据print(f"Payload: {json.dumps(payload, ensure_ascii
    print("-" * 50)

    try:
        start_time = time.time()
        response = requests.post(url, json=payload, headers=headers, stream=True, timeout=30)  # 响应对象response  # 响应对象response  # 响应对象response
        connect_time = time.time() - start_time

        print(f"连接时间: {connect_time:.2f}秒")
        print(f"状态码: {response.status_code}")

        if response.status_code != 200:  # 判断是否不相等  # 判断是否不相等  # 判断是否不相等
            print(f"HTTP错误: {response.status_code}")
            print(f"响应: {response.text}")
            return

        print("开始接收 SSE 流式响应...")
        print("-" * 50)

        content_parts = []  # 内容变量content_parts  # 内容变量content_parts  # 内容变量content_parts
        has_tool = False
        has_error = False  # 错误信息has_error  # 错误信息has_error  # 错误信息has_error
        response_start = time.time()  # 响应对象response_start  # 响应对象response_start  # 响应对象response_start

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
                                label = data.get('label', '')
                                print(f"\n🤔 {label}")
                                if '查询天气' in label or '搜索景点' in label:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                                    has_tool = True
                            elif msg_type == 'tool_result':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                result = data.get('preview', data.get('result', ''))  # 结果变量result  # 结果变量result  # 结果变量result
                                print(f"\n🛠️ 工具结果: {result[:100]}...")
                                has_tool = True
                            elif msg_type == 'error':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                error_msg = data.get('message', '')  # 错误信息error_msg  # 错误信息error_msg  # 错误信息error_msg
                                print(f"\n❌ 错误: {error_msg}")
                                has_error = True  # 错误信息has_error  # 错误信息has_error  # 错误信息has_error
                            elif msg_type == 'done':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print("\n\n✅ 完成")
                                break
                        except json.JSONDecodeError as e:
                            print(f"\nJSON解析错误: {e}, 原始数据: {data_str}")

        response_time = time.time() - response_start  # 响应对象response_time  # 响应对象response_time  # 响应对象response_time
        total_time = time.time() - start_time  # 总数变量total_time  # 总数变量total_time  # 总数变量total_time

        print("-" * 50)
        print(f"总响应时间: {total_time:.2f}秒")
        print(f"流式响应时间: {response_time:.2f}秒")
        print(f"总内容长度: {len(''.join(content_parts))}")
        print(f"触发了工具调用: {'是' if has_tool else '否'}")
        print(f"发生错误: {'是' if has_error else '否'}")

        if content_parts:
            print("\n前100字符内容预览:")
            full_content = ''.join(content_parts)  # 内容变量full_content  # 内容变量full_content  # 内容变量full_content
            print(full_content[:100] + "..." if len(full_content) > 100 else full_content)

    except Exception as e:
        print(f"请求异常: {e}")
        import traceback
        traceback.print_exc()

def test_simple_chat():
    """测试普通聊天"""
    print("\n" + "="*50)
    print("测试普通聊天API")
    print("="*50)

    url = "http://127.0.0.1:5001/api/chat"

    payload = {
        "messages": [
            {"role": "user", "content": "你好"}
        ],
        "provider": "zhipu"
    }

    try:
        response = requests.post(url, json=payload, timeout=10)  # 响应对象response  # 响应对象response  # 响应对象response
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✓ 普通聊天成功")
                reply = data.get('reply', '')
                print(f"回复: {reply[:100]}..." if len(reply) > 100 else f"回复: {reply}")
            else:  # 否则执行  # 否则执行  # 否则执行
                print(f"✗ 普通聊天失败: {data.get('error')}")
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"✗ HTTP错误: {response.text}")
    except Exception as e:
        print(f"请求异常: {e}")

if __name__ == "__main__":
    # 测试普通聊天
    test_simple_chat()

    # 测试Agent模式天气查询
    test_agent_weather()