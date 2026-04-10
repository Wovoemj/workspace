import requests
import json

# 测试Agent模式
url = 'http://127.0.0.1:5001/api/agent/chat'
payload = {'messages': [{'role': 'user', 'content': '郑州今天天气'}]}
headers = {'Content-Type': 'application/json', 'Accept': 'text/event-stream'}

try:
    resp = requests.post(url, json=payload, headers=headers, stream=True, timeout=15)
    print(f'状态码: {resp.status_code}')

    if resp.status_code == 200:
        print('接收SSE响应...')
        content = []  # 内容变量content  # 内容变量content  # 内容变量content
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
                                print(data.get('data', ''), end='')
                                content.append(data.get('data', ''))
                            elif t == 'thinking':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f'\n🤔 {data.get("label", "")}')
                            elif t == 'tool_result':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                preview = data.get('preview', '')
                                print(f'\n🛠️ 工具结果: {preview[:50]}...')
                            elif t == 'error':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f'\n❌ 错误: {data.get("message", "")}')
                                break
                            elif t == 'done':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print('\n✅ 完成')
                                break
                        except Exception as e:
                            print(f'\n解析错误: {e}')
                            print(f'原始数据: {data_str[:100]}')
                if len(content) > 10:  # 限制输出
                    break
    else:  # 否则执行  # 否则执行  # 否则执行
        print(f'响应: {resp.text}')
except Exception as e:
    print(f'错误: {e}')