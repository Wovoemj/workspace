import requests
import json
import time

url = 'http://127.0.0.1:5001/api/agent/chat'
payload = {'messages': [{'role': 'user', 'content': '郑州今天天气怎么样？'}]}
headers = {'Content-Type': 'application/json', 'Accept': 'text/event-stream'}

print('发送请求到Agent API...')
print(f'用户消息: "{payload["messages"][0]["content"]}"')
print('-' * 50)

start_time = time.time()
try:
    resp = requests.post(url, json=payload, headers=headers, timeout=10)
    connect_time = time.time() - start_time

    print(f'连接时间: {connect_time:.2f}秒')
    print(f'状态码: {resp.status_code}')

    if resp.status_code == 200:
        print('开始接收SSE响应...')
        print('-' * 50)

        has_content = False  # 内容变量has_content  # 内容变量has_content  # 内容变量has_content
        has_error = False  # 错误信息has_error  # 错误信息has_error  # 错误信息has_error
        response_start = time.time()  # 响应对象response_start  # 响应对象response_start  # 响应对象response_start

        for line in resp.iter_lines():  # 遍历line  # 遍历line  # 遍历line
            if line:
                line = line.decode('utf-8')
                if line.startswith('data:'):
                    data_str = line[5:].strip()
                    if data_str:
                        try:
                            data = json.loads(data_str)
                            t = data.get('type')
                            if t == 'content':
                                content = data.get('data', '')  # 内容变量content  # 内容变量content  # 内容变量content
                                print(f"内容: {content}")
                                has_content = True  # 内容变量has_content  # 内容变量has_content  # 内容变量has_content
                            elif t == 'thinking':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"思考: {data.get('label', '')}")
                            elif t == 'tool_result':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                preview = data.get('preview', '')
                                print(f"工具结果: {preview[:60]}...")
                            elif t == 'error':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"错误: {data.get('message', '')}")
                                has_error = True  # 错误信息has_error  # 错误信息has_error  # 错误信息has_error
                                break
                            elif t == 'done':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print("完成")
                                break
                        except json.JSONDecodeError:
                            print(f"无法解析: {data_str[:50]}...")

        response_time = time.time() - response_start  # 响应对象response_time  # 响应对象response_time  # 响应对象response_time
        total_time = time.time() - start_time  # 总数变量total_time  # 总数变量total_time  # 总数变量total_time

        print('-' * 50)
        print(f'响应时间: {response_time:.2f}秒')
        print(f'总时间: {total_time:.2f}秒')
        print(f'收到内容: {has_content}')
        print(f'发生错误: {has_error}')

    else:  # 否则执行  # 否则执行  # 否则执行
        print(f'HTTP错误: {resp.text}')

except requests.exceptions.Timeout:
    print('请求超时')
except Exception as e:
    print(f'错误: {e}')