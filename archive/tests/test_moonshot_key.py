#!/usr/bin/env python3
"""
测试Moonshot API密钥是否有效
"""

import requests
import json
import os

def test_moonshot_api_key():
    """测试Moonshot API密钥"""
    print("🔑 测试Moonshot API密钥...")

    # 从.env文件读取API密钥
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    moonshot_api_key = None

    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:  # 遍历line  # 遍历line  # 遍历line
                if line.strip().startswith("MOONSHOT_API_KEY="):
                    moonshot_api_key = line.strip().split('=', 1)[1]
                    break

    if not moonshot_api_key:
        print("❌ 未找到MOONSHOT_API_KEY配置")
        return False

    print(f"API密钥: {moonshot_api_key[:10]}...{moonshot_api_key[-10:]}")

    # 测试Moonshot API
    url = "https://api.moonshot.cn/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {moonshot_api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "moonshot-v1-8k",
        "messages": [
            {"role": "system", "content": "你是一个测试助手，请回复'测试成功'"},
            {"role": "user", "content": "你好，请回复测试消息"}
        ],
        "temperature": 0.7,
        "max_tokens": 100
    }

    try:
        print("📡 发送请求到Moonshot API...")
        response = requests.post(url, headers=headers, json=payload, timeout=30)  # 响应对象response  # 响应对象response  # 响应对象response

        print(f"📊 响应状态: {response.status_code}")

        if response.status_code == 200:
            result = response.json()  # 结果变量result  # 结果变量result  # 结果变量result
            reply = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ API密钥有效 - 回复: {reply}")
            return True
        elif response.status_code == 401:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            print("❌ API密钥无效 (401 Unauthorized)")
            print(f"响应: {response.text[:200]}")
            return False
        elif response.status_code == 429:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            print("⚠️ API调用频率限制 (429 Too Many Requests)")
            return False
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"❌ API调用失败: {response.status_code}")
            print(f"响应: {response.text[:200]}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ 请求异常: {e}")
        return False
    except Exception as e:
        print(f"❌ 其他异常: {e}")
        return False

def test_backend_api_with_verbose():
    """测试后端API并显示详细错误"""
    print("\n🔍 测试后端API调用（详细模式）...")

    import urllib.request
    import json

    try:
        url = "http://127.0.0.1:5001/api/chat"
        data = {
            "messages": [
                {"role": "user", "content": "测试消息，请回复'你好'"}
            ],
            "temperature": 0.7,
            "max_tokens": 100,
            "provider": "moonshot"
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        print("📡 发送请求到后端API...")
        with urllib.request.urlopen(req, timeout=30) as response: urllib.request.urlopen(req, timeout urllib.request.urlopen(req, timeout
            result = json.loads(response.read().decode('utf-8'))  # 结果变量result  # 结果变量result  # 结果变量result
            print(f"📊 响应状态: {response.status}")
            print(f"✅ 成功: {result.get('success')}")

            if result.get('success'):
                reply = result.get('reply', '')
                if reply:
                    print(f"📝 回复: {reply}")
                else:  # 否则执行  # 否则执行  # 否则执行
                    print("⚠️ 回复内容为空")
            else:  # 否则执行  # 否则执行  # 否则执行
                print(f"❌ 错误: {result.get('error')}")
                print(f"📋 详情: {result.get('details', '')}")

    except urllib.error.HTTPError as e:
        print(f"❌ HTTP错误: {e.code}")
        try:
            error_body = e.read().decode('utf-8')  # 错误信息error_body  # 错误信息error_body  # 错误信息error_body
            print(f"错误体: {error_body[:500]}")
        except:
            print(f"错误: {e}")
    except Exception as e:
        print(f"❌ 异常: {e}")

def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""
    print("="*60)
    print("🧪 测试API密钥有效性")
    print("="*60)

    # 测试Moonshot API密钥
    key_valid = test_moonshot_api_key()

    if key_valid:
        print("\n✅ Moonshot API密钥有效")
        # 测试后端API
        test_backend_api_with_verbose()
    else:  # 否则执行  # 否则执行  # 否则执行
        print("\n❌ Moonshot API密钥无效或测试失败")
        print("💡 请检查:")
        print("1. API密钥是否正确")
        print("2. 网络连接是否正常")
        print("3. Moonshot账户是否有余额")

    print("\n" + "="*60)

if __name__ == "__main__":
    main()