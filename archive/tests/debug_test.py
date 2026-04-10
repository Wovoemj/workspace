import requests
import json
import sys

url = 'http://127.0.0.1:5001/api/agent/chat'
payload = {'messages': [{'role': 'user', 'content': '郑州今天天气怎么样？'}]}
headers = {'Content-Type': 'application/json', 'Accept': 'text/event-stream'}

print("发送请求到Agent API...")
print(f"消息: {payload['messages'][0]['content']}")

try:
    resp = requests.post(url, json=payload, headers=headers, timeout=8)
    print(f'状态码: {resp.status_code}')

    if resp.status_code == 200:
        print("开始接收响应...")
        lines_received = 0
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
                                print(f"内容: {data.get('data', '')}")
                            elif t == 'thinking':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"思考: {data.get('label', '')}")
                            elif t == 'error':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f"错误: {data.get('message', '')}")
                                break
                        except:
                            pass
                        lines_received += 1
                        if lines_received > 5:
                            break
    else:  # 否则执行  # 否则执行  # 否则执行
        print(f'响应: {resp.text}')
except Exception as e:
    print(f'错误: {e}')