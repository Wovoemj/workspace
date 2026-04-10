#!/usr/bin/env python3
"""
测试后端API是否正确传递系统提示词
"""

import requests
import json

def test_api_with_system_prompt():
    """测试API调用，检查系统提示词是否正确传递"""

    # 测试普通的聊天调用
    url = "http://127.0.0.1:5001/api/chat"

    # 测试数据1：简单的旅行查询
    data1 = {
        "messages": [
            {"role": "user", "content": "我想去上海玩3天，有什么推荐吗？"}
        ],
        "temperature": 0.7,
        "max_tokens": 2000,
        "provider": "moonshot"
    }

    # 测试数据2：景点查询
    data2 = {
        "messages": [
            {"role": "user", "content": "长城门票多少钱？开放时间是什么时候？"}
        ],
        "temperature": 0.7,
        "max_tokens": 2000,
        "provider": "moonshot"
    }

    try:
        print("🚀 测试API调用...")

        for i, data in enumerate([data1, data2], 1):  # 遍历并获取索引  # 遍历并获取索引  # 遍历并获取索引
            print(f"\n📋 测试 {i}: {data['messages'][0]['content']}")
            print(f"   请求消息: {len(data['messages'])} 条")

            try:
                response = requests.post(url, json=data, timeout=30)  # 响应对象response  # 响应对象response  # 响应对象response
                result = response.json()  # 结果变量result  # 结果变量result  # 结果变量result

                print(f"   响应状态: {response.status_code}")
                print(f"   成功: {result.get('success')}")

                if result.get('success'):
                    reply = result.get('reply', '')
                    print(f"   回复长度: {len(reply)} 字符")
                    print(f"   回复前100字符: {reply[:100]}...")

                    # 检查回复中是否包含专业旅游助手的关键词
                    keywords = ['门票', '开放时间', '建议游玩', '拍照点', '周边美食', '联网搜索']
                    found_keywords = [kw for kw in keywords if kw in reply]
                    print(f"   包含专业关键词: {found_keywords}")

                    # 检查是否包含系统提示词中的关键内容
                    system_prompt_keywords = ['P0', '必须字段', '来源', '景区当天公示']
                    found_system_keys = [kw for kw in system_prompt_keywords if kw in reply]
                    print(f"   包含系统提示词关键词: {found_system_keys}")

                    # 检查API错误
                    if '缺少' in reply and 'API Key' in reply:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                        print("   ❌ 检测到API密钥错误 - 缺少配置")
                        print("   提示: " + reply[:200])
                else:  # 否则执行  # 否则执行  # 否则执行
                    print(f"   错误: {result.get('error')}")

            except requests.exceptions.ConnectionError:
                print("   ❌ 无法连接到后端服务")
                print("   请确保后端正在运行: python app.py")
            except Exception as e:
                print(f"   ❌ 请求异常: {e}")

        print("\n" + "="*60)
        print("🔍 检查后端代码中的系统提示词注入...")

    except Exception as e:
        print(f"❌ 测试异常: {e}")

def test_api_with_explicit_system():
    """测试显式包含system消息的API调用"""

    url = "http://127.0.0.1:5001/api/chat"

    # 测试数据：显式包含system消息
    data = {
        "messages": [
            {"role": "system", "content": "你是测试助手，请回复'测试成功'"},
            {"role": "user", "content": "你好，请回复测试消息"}
        ],
        "temperature": 0.7,
        "max_tokens": 2000,
        "provider": "moonshot"
    }

    try:
        print("\n🔍 测试显式system消息传递...")
        response = requests.post(url, json=data, timeout=30)  # 响应对象response  # 响应对象response  # 响应对象response
        result = response.json()  # 结果变量result  # 结果变量result  # 结果变量result

        print(f"   响应状态: {response.status_code}")
        print(f"   成功: {result.get('success')}")

        if result.get('success'):
            reply = result.get('reply', '')
            print(f"   回复: {reply[:100]}")
            if '测试成功' in reply:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                print("   ✅ 后端正确处理了显式system消息")
            else:  # 否则执行  # 否则执行  # 否则执行
                print("   ⚠️ 后端可能覆盖了system消息")
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"   错误: {result.get('error')}")

    except Exception as e:
        print(f"   ❌ 测试异常: {e}")

if __name__ == "__main__":
    print("="*60)
    print("🧪 测试API系统提示词传递")
    print("="*60)

    test_api_with_system_prompt()
    test_api_with_explicit_system()