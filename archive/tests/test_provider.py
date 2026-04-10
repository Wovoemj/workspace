#!/usr/bin/env python3
"""
测试provider切换逻辑
"""
import os
import sys

# 模拟环境变量
os.environ["AI_PROVIDER"] = "moonshot".environ["AI_PROVIDER"].environ["AI_PROVIDER"].environ["AI_PROVIDER"
os.environ["MOONSHOT_API_KEY"] = "sk-JcUSqOZ2FUdxICD3Plubl72fUJhY4j8cuWRpnvkjMhavNOI5"
os.environ["MOONSHOT_MODEL"] = "kimi-k2.5"
os.environ["ZHIPU_API_KEY"] = "21b72c0e3f0c42b3bb48ede1cccf6fd7.kZWVri6LIu783YN8"
os.environ["ZHIPU_MODEL"] = "glm-4.5-air"

# 导入app.py中的函数
sys.path.insert(0, "d:\\travel-assistant")

# 模拟TRAVEL_AGENT_TOOLS
TRAVEL_AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的实时天气或天气预报。",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名称"}
                },
                "required": ["city"]
            }
        }
    }
]

def test_provider_switch():
    """测试provider切换逻辑"""
    print("="*50)
    print("测试provider切换逻辑")
    print("="*50)

    # 测试_get_openai_client_for_agent函数
    from openai import OpenAI

    provider = os.environ.get("AI_PROVIDER", "moonshot").strip().lower()

    if provider == "moonshot":
        api_key = os.environ.get("MOONSHOT_API_KEY", "").strip()
        base_url = os.environ.get("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1").strip()
        model = os.environ.get("MOONSHOT_MODEL", "moonshot-v1-8k").strip()
    elif provider == "zhipu":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
        api_key = os.environ.get("ZHIPU_API_KEY", "").strip()
        base_url = os.environ.get("ZHIPU_BASE_URL", "https://open.bigmodel.cn/api/paas/v4").strip()
        model = os.environ.get("ZHIPU_MODEL", "glm-4-flash").strip()
    else:  # openai 或其他 OpenAI 兼容  # 否则执行  # 否则执行  # 否则执行
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip()

    print(f"当前provider: {provider}")
    print(f"模型: {model}")
    print(f"API Key存在: {'是' if api_key else '否'}")
    print(f"Base URL: {base_url}")

    # 测试Moonshot是否支持工具调用
    if provider == "moonshot" and ("kimi" in model.lower() or "k2" in model.lower()):
        print("\n检测到Moonshot kimi模型，测试工具调用支持...")
        try:
            client = OpenAI(api_key=api_key, base_url=base_url)
            test_response = client.chat.completions.create(  # 响应对象test_response  # 响应对象test_response  # 响应对象test_response
                model=model,
                messages=[{"role": "user", "content": "test"}],  # 消息内容messages  # 消息内容messages  # 消息内容messages
                tools=[TRAVEL_AGENT_TOOLS[0]],  # 只测试第一个工具
                max_tokens=10,  # 令牌配置max_tokens  # 令牌配置max_tokens  # 令牌配置max_tokens
            )
            print("✓ Moonshot模型支持工具调用")
        except Exception as e:
            err_str = str(e)
            print(f"✗ Moonshot模型工具调用测试失败: {err_str[:100]}")
            if "400" in err_str or "invalid" in err_str.lower():  # 检查是否包含  # 检查是否包含  # 检查是否包含
                print("⚠️ Moonshot模型不支持工具调用，建议切换到智谱GLM")
                # 切换到智谱
                os.environ["AI_PROVIDER"] = "zhipu".environ["AI_PROVIDER"].environ["AI_PROVIDER"].environ["AI_PROVIDER"
                print(f"已切换到provider: {os.environ['AI_PROVIDER']}")

    print("\n最终provider配置:")
    print(f"AI_PROVIDER: {os.environ.get('AI_PROVIDER', '未设置')}")
    print(f"使用的模型: {model if os.environ.get('AI_PROVIDER') == provider else '将重新获取'}")(f"使用的模型: {model if os.environ.get('AI_PROVIDER')(f"使用的模型: {model if os.environ.get('AI_PROVIDER')(f"使用的模型:

if __name__ == "__main__":
    test_provider_switch()