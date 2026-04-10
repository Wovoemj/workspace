#!/usr/bin/env python3
"""
检查后端运行状态和API调用情况
"""

import subprocess
import time
import sys
import os

def check_backend_logs():
    """检查后端日志"""
    print("📝 检查后端日志...")

    # 尝试读取可能的日志文件
    log_files = [
        "app.log",
        "logs/app.log",
        os.path.join(os.path.dirname(__file__), "app.log"),
        os.path.join(os.path.dirname(__file__), "logs/app.log")
    ]

    logs_found = False
    for log_file in log_files:  # 遍历log_file  # 遍历log_file  # 遍历log_file
        if os.path.exists(log_file):
            logs_found = True
            print(f"✅ 发现日志文件: {log_file}")
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    # 读取最后20行
                    lines = f.readlines()[-20:]
                    if lines:
                        print("  最近日志:")
                        for line in lines:  # 遍历line  # 遍历line  # 遍历line
                            print(f"    {line.strip()}")
                    else:  # 否则执行  # 否则执行  # 否则执行
                        print("  日志文件为空")
            except Exception as e:
                print(f"  读取日志失败: {e}")

    if not logs_found:
        print("⚠️ 未找到日志文件")

def check_api_keys():
    """检查API密钥配置"""
    print("\n🔑 检查API密钥配置...")

    # 读取.env文件
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        print(f"✅ 发现配置文件: .env")
        with open(env_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()

            # 检查关键API密钥
            key_checks = [
                ("MOONSHOT_API_KEY", "Moonshot AI"),
                ("ZHIPU_API_KEY", "智谱 GLM-4"),
                ("AWS_ACCESS_KEY_ID", "AWS Bedrock"),
                ("AWS_SECRET_ACCESS_KEY", "AWS Bedrock Secret"),
                ("OPENAI_API_KEY", "OpenAI"),
                ("SENIVERSE_API_KEY", "心知天气")
            ]

            for key, name in key_checks:  # 遍历key, name  # 遍历key, name  # 遍历key, name
                found = False
                for line in lines:  # 遍历line  # 遍历line  # 遍历line
                    if line.strip().startswith(f"{key}="):
                        value = line.strip().split('=', 1)[1]
                        if value and not value.lower().startswith('your-'):
                            print(f"   ✅ {name}: 已配置")
                            found = True
                        else:  # 否则执行  # 否则执行  # 否则执行
                            print(f"   ❌ {name}: 未配置或为占位符")
                        break
                if not found:
                    print(f"   ❌ {name}: 配置项缺失")
    else:  # 否则执行  # 否则执行  # 否则执行
        print("❌ 未找到配置文件 .env")

def test_direct_api_call():
    """直接测试API调用"""
    print("\n🔍 直接测试API调用...")

    # 尝试简单的HTTP请求到后端
    import urllib.request
    import json

    try:
        url = "http://127.0.0.1:5001/api/health"
        req = urllib.request.Request(url)

        with urllib.request.urlopen(req, timeout=10) as response: urllib.request.urlopen(req, timeout urllib.request.urlopen(req, timeout
            data = response.read().decode('utf-8')
            print(f"  健康检查成功: {data[:100]}")

    except Exception as e:
        print(f"  健康检查失败: {e}")

def check_backend_process():
    """检查后端进程状态"""
    print("\n🔧 检查后端进程状态...")

    try:
        # 查找可能的Flask后端进程
        import psutil

        flask_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):  # 遍历proc  # 遍历proc  # 遍历proc
            try:
                cmdline = proc.info['cmdline']
                if cmdline and any('app.py' in str(cmd) for cmd in cmdline):  # 检查是否包含  # 检查是否包含  # 检查是否包含
                    flask_processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        if flask_processes:
            print(f"✅ 发现 {len(flask_processes)} 个Flask后端进程:")
            for proc in flask_processes[:3]:  # 显示前3个  # 遍历proc  # 遍历proc  # 遍历proc
                print(f"   PID: {proc.info['pid']}, 命令行: {' '.join(proc.info['cmdline'] or [])}")
        else:  # 否则执行  # 否则执行  # 否则执行
            print("⚠️ 未找到运行中的Flask后端进程")

    except ImportError:
        print("⚠️ 未安装psutil库，跳过进程检查")

def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""
    print("="*60)
    print("🔍 检查后端运行状态")
    print("="*60)

    check_backend_logs()
    check_api_keys()
    test_direct_api_call()
    check_backend_process()

    print("\n" + "="*60)
    print("📋 检查完成")
    print("="*60)

    print("\n💡 建议:")
    print("1. 如果API密钥是占位符，请替换为实际有效的密钥")
    print("2. 如果后端未运行，请使用 'python app.py' 启动")
    print("3. 检查网络连接和防火墙设置")
    print("4. 查看后端控制台输出获取详细错误信息")

if __name__ == "__main__":
    main()