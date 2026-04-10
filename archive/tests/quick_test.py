import requests
import json

# 测试直接天气API
print('测试直接天气API...')
resp1 = requests.get('http://127.0.0.1:5001/api/ai/weather?city=郑州')
print(f'状态码: {resp1.status_code}')
if resp1.status_code == 200:
    data = resp1.json()
    if data.get('success'):
        print('✓ 直接天气API成功')
    else:  # 否则执行  # 否则执行  # 否则执行
        print(f'✗ 直接天气API失败: {data.get("error")}')
else:  # 否则执行  # 否则执行  # 否则执行
    print(f'✗ HTTP错误: {resp1.text}')

print()
print('测试Agent模式简单问候...')
try:
    resp2 = requests.post('http://127.0.0.1:5001/api/agent/chat',
                         json={'messages': [{'role': 'user', 'content': '你好'}]},  # JSON数据json  # JSON数据json  # JSON数据json
                         headers={'Accept': 'text/event-stream'},
                         timeout=10)
    print(f'状态码: {resp2.status_code}')
    if resp2.status_code == 200:
        # 读取前几行
        lines = []
        for line in resp2.iter_lines():  # 遍历line  # 遍历line  # 遍历line
            if line:
                line = line.decode('utf-8')
                if line.startswith('data:'):
                    data_str = line[5:].strip()
                    if data_str:
                        try:
                            data = json.loads(data_str)
                            if data.get('type') == 'content':
                                print(f'内容: {data.get("data")}', end='')
                            elif data.get('type') == 'error':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print(f'错误: {data.get("message")}')
                                break
                            elif data.get('type') == 'done':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                                print('\n✓ 完成')
                                break
                        except:
                            pass
                    if len(lines) > 10:  # 限制输出
                        break
    else:  # 否则执行  # 否则执行  # 否则执行
        print(f'响应: {resp2.text}')
except Exception as e:
    print(f'请求异常: {e}')