#!/usr/bin/env python3
"""
测试后端API聊天接口，模拟前端发送的消息
"""

import json
import requests
import sys

def test_chat_api():
    """测试聊天API"""
    print("🔬 测试后端聊天API...")

    # 模拟前端发送的消息
    data = {
        "messages": [
            {"role": "user", "content": "我想去上海玩3天，有什么推荐吗？"},
        ],
        "provider": "moonshot",
        "temperature": 0.7,
        "max_tokens": 1200
    }

    try:
        # 发送请求到本地Flask服务器
        response = requests.post(  # 响应对象response  # 响应对象response  # 响应对象response
            "http://localhost:5000/api/chat",
            json=data,  # JSON数据json  # JSON数据json  # JSON数据json
            timeout=30
        )

        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            result = response.json()  # 结果变量result  # 结果变量result  # 结果变量result
            print(f"成功: {result.get('success')}")

            if result.get('success'):
                reply = result.get('reply', '')
                print(f"回复长度: {len(reply)} 字符")

                if reply:
                    print("\n🔍 回复内容预览:")
                    print("-" * 60)
                    print(reply[:500])
                    if len(reply) > 500:
                        print("...")
                    print("-" * 60)

                    # 检查回复是否符合专业旅游助手格式
                    check_reply_format(reply)
                else:  # 否则执行  # 否则执行  # 否则执行
                    print("⚠️ 回复内容为空")
            else:  # 否则执行  # 否则执行  # 否则执行
                error = result.get('error', '')  # 错误信息error  # 错误信息error  # 错误信息error
                details = result.get('details', '')
                print(f"❌ 错误: {error}")
                if details:
                    print(f"详情: {details[:200]}")
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"❌ HTTP错误: {response.status_code}")
            print(f"响应: {response.text[:200]}")

    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务器，请确保后端正在运行")
        print("   运行命令: python app.py")
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def check_reply_format(reply: str):
    """检查回复是否符合专业旅游助手格式"""
    print("\n📋 检查回复格式...")

    # 检查专业旅游助手的关键指标
    indicators = {
        "包含景点名称": "景点" in reply or "旅游" in reply or "玩" in reply,
        "包含门票信息": "门票" in reply or "票价" in reply or "价格" in reply,
        "包含开放时间": "开放" in reply or "时间" in reply or "营业" in reply,
        "包含行程建议": "上午" in reply or "下午" in reply or "晚上" in reply,
        "包含小游人设": "小游" in reply or "～" in reply or "呀" in reply,
        "包含联网搜索提示": "联网搜索" in reply or "搜索到" in reply or "检索" in reply
    }

    found_count = 0  # 计数变量found_count  # 计数变量found_count  # 计数变量found_count
    for indicator, found in indicators.items():  # 遍历indicator, found  # 遍历indicator, found  # 遍历indicator, found
        if found:
            found_count += 1  # 计数变量found_count +  # 计数变量found_count +  # 计数变量found_count +
            print(f"   ✅ {indicator}")
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"   ❌ {indicator}")

    if found_count >= 3:
        print(f"   📊 符合专业旅游助手格式 ({found_count}/6)")
    else:  # 否则执行  # 否则执行  # 否则执行
        print(f"   ⚠️ 格式可能不符合专业旅游助手要求 ({found_count}/6)")

def test_agent_api():
    """测试Agent API"""
    print("\n\n⚡ 测试Agent API...")

    data = {
        "messages": [
            {"role": "user", "content": "我想去上海玩3天，预算2000元"},
        ],
        "provider": "moonshot"
    }

    try:
        response = requests.post(  # 响应对象response  # 响应对象response  # 响应对象response
            "http://localhost:5000/api/agent/chat",
            json=data,  # JSON数据json  # JSON数据json  # JSON数据json
            timeout=30
        )

        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            print("✅ Agent API连接成功（流式响应需要前端处理）")
            # Agent API返回流式响应，这里只检查连接
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"❌ HTTP错误: {response.status_code}")
            print(f"响应: {response.text[:200]}")

    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务器")
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""
    print("=" * 60)
    print("🔬 后端API测试")
    print("=" * 60)

    # 测试普通聊天API
    test_chat_api()

    # 测试Agent API
    test_agent_api()

    print("\n" + "=" * 60)
    print("💡 建议:")
    print("1. 如果普通模式失败，使用Agent模式（⚡按钮）")
    print("2. 确保至少配置一个AI服务商的API密钥")
    print("3. 检查后端服务是否正常运行")
    print("=" * 60)

if __name__ == "__main__":
    main()