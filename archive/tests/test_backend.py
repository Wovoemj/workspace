#!/usr/bin/env python3
"""
测试后端API调用，检查系统提示词是否正常工作
"""

import subprocess
import time
import requests
import sys
import os

def start_backend():
    """启动后端服务（非阻塞）"""
    print("🚀 启动后端服务...")
    # 使用subprocess启动后端，不等待
    backend_process = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # 等待后端启动
    print("⏳ 等待后端启动...")
    time.sleep(5)

    return backend_process

def test_api():
    """测试API调用"""
    print("\n🔍 测试API调用...")

    url = "http://127.0.0.1:5001/api/chat"

    # 测试数据：简单的旅行查询
    data = {
        "messages": [
            {"role": "user", "content": "我想去上海玩3天，有什么推荐吗？"}
        ],
        "temperature": 0.7,
        "max_tokens": 2000,
        "provider": "moonshot"
    }

    try:
        print("📡 发送请求到 /api/chat...")
        response = requests.post(url, json=data, timeout=30)  # 响应对象response  # 响应对象response  # 响应对象response

        print(f"📊 响应状态: {response.status_code}")

        if response.status_code == 200:
            result = response.json()  # 结果变量result  # 结果变量result  # 结果变量result
            print(f"✅ 响应成功: {result.get('success')}")

            if result.get('success'):
                reply = result.get('reply', '')
                print(f"📝 回复长度: {len(reply)} 字符")

                if len(reply) > 0:
                    print(f"📋 回复前200字符:")
                    print(reply[:200])

                    # 检查是否包含专业旅游助手的关键词
                    keywords = ['门票', '开放时间', '建议游玩', '拍照点', '周边美食']
                    found_keywords = [kw for kw in keywords if kw in reply]
                    print(f"\n🔑 包含专业关键词: {found_keywords}")

                    # 检查是否包含系统提示词中的关键内容
                    system_prompt_keywords = ['名称', '位置', '来源', '建议', '亮点']
                    found_system_keys = [kw for kw in system_prompt_keywords if kw in reply]
                    print(f"🔧 包含系统提示词关键词: {found_system_keys}")

                    if '缺少' in reply and 'API Key' in reply:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                        print("\n⚠️ 检测到API密钥错误:")
                        print(reply[:300])
                        return False
                    elif '联网搜索' in reply or '来源' in reply:  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
                        print("\n✅ 系统提示词似乎已生效 - 回复包含专业格式")
                        return True
                    else:  # 否则执行  # 否则执行  # 否则执行
                        print("\n⚠️ 回复可能未遵循系统提示词格式")
                        return False
                else:  # 否则执行  # 否则执行  # 否则执行
                    print("❌ 回复内容为空")
                    return False
            else:  # 否则执行  # 否则执行  # 否则执行
                print(f"❌ API调用失败: {result.get('error')}")
                return False
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"❌ HTTP错误: {response.status_code}")
            print(f"响应: {response.text[:200]}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务 (127.0.0.1:5001)")
        print("请确保后端正在运行: python app.py")
        return False
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_health():
    """测试健康检查接口"""
    print("\n🏥 测试健康检查接口...")

    try:
        response = requests.get("http://127.0.0.1:5001/api/health", timeout=5)  # 响应对象response  # 响应对象response  # 响应对象response
        print(f"健康检查状态: {response.status_code}")
        print(f"响应: {response.text[:100]}")
        return response.status_code == 200
    except Exception as e:
        print(f"健康检查失败: {e}")
        return False

def test_ai_providers():
    """测试AI服务商列表接口"""
    print("\n🤖 测试AI服务商列表...")

    try:
        response = requests.get("http://127.0.0.1:5001/api/ai/providers", timeout=5)  # 响应对象response  # 响应对象response  # 响应对象response
        if response.status_code == 200:
            result = response.json()  # 结果变量result  # 结果变量result  # 结果变量result
            print(f"✅ AI服务商列表获取成功")
            print(f"   可用服务商: {[p['name'] for p in result.get('providers', [])]}")
            return True
        else:  # 否则执行  # 否则执行  # 否则执行
            print(f"❌ AI服务商列表失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ AI服务商列表异常: {e}")
        return False

def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""
    print("="*60)
    print("🧪 测试后端API及系统提示词传递")
    print("="*60)

    # 首先检查后端是否已经在运行
    if not test_health():
        print("⚠️ 后端未运行或健康检查失败，请先启动后端")
        print("运行命令: python app.py")
        return

    # 测试AI服务商列表
    test_ai_providers()

    # 测试API调用
    success = test_api()

    print("\n" + "="*60)
    if success:
        print("✅ 测试完成 - 系统提示词正常传递")
    else:  # 否则执行  # 否则执行  # 否则执行
        print("❌ 测试失败 - 需要进一步检查")

    print("\n💡 建议:")
    print("1. 检查后端日志中是否有API调用错误")
    print("2. 验证AI服务商API密钥是否有效")
    print("3. 检查系统提示词是否正确定义和注入")

if __name__ == "__main__":
    main()