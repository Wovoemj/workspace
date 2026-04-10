import requests
import json

# 测试Agent模式天气查询
url = 'http://127.0.0.1:5001/api/agent/chat'
payload = {'messages': [{'role': 'user', 'content': '郑州今天天气怎么样？'}]}
headers = {'Content-Type': 'application/json', 'Accept': 'text/event-stream'}

print('测试Agent模式天气查询修复')
print('='*50)
print(f'发送请求: {payload["messages"][0]["content"]}')

try:
    resp = requests.post(url, json=payload, headers=headers, timeout=8)
    print(f'状态码: {resp.status_code}')

    if resp.status_code == 200:
        print('接收响应...')
        content_received = False  # 内容变量content_received  # 内容变量content_received  # 内容变量content_received
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
                                print(f'内容: {content}')
                                content_received = True  # 内容变量content_received  # 内容变量content_received  # 内容变量content_received
                            elif t == 'done':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print('完成')
                                break
                            elif t == 'error':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f'错误: {data.get("message", "")}')
                                break
                        except:
                            print(f'原始数据: {data_str[:100]}...')

        if content_received:
            print('✅ 成功收到天气信息！')
        else:  # 否则执行  # 否则执行  # 否则执行
            print('❌ 没有收到内容')
    else:  # 否则执行  # 否则执行  # 否则执行
        print(f'HTTP错误: {resp.text}')

except Exception as e:
    print(f'请求异常: {e}')