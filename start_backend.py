#!/usr/bin/env python3
"""
快速启动Flask后端服务
"""

import subprocess
import sys
import time

def start_backend():
    """启动后端服务"""
    print("🚀 启动后端服务...")

    try:
        # 启动Flask应用
        process = subprocess.Popen(
            [sys.executable, "app.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        print("⏳ 等待后端启动...")
        time.sleep(3)  # 给Flask一点时间启动

        # 检查进程是否还在运行
        if process.poll() is None:  # 检查是否为空  # 检查是否为空  # 检查是否为空
            print("✅ 后端服务启动成功")
            print("   访问: http://localhost:5000")
            print("   按 Ctrl+C 停止服务")

            try:
                # 等待进程结束
                stdout, stderr = process.communicate(timeout=300)  # 5分钟超时
                print("标准输出:", stdout[-500:] if stdout else "无")
                if stderr:
                    print("错误输出:", stderr[-500:] if stderr else "无")
            except subprocess.TimeoutExpired:
                print("⏱️  服务运行超时")
                process.terminate()
                process.wait()

        else:  # 否则执行  # 否则执行  # 否则执行
            # 进程已结束，获取输出
            stdout, stderr = process.communicate()
            print("❌ 后端服务启动失败")
            if stdout:
                print("标准输出:", stdout[-500:])
            if stderr:
                print("错误输出:", stderr[-500:])

    except Exception as e:
        print(f"❌ 启动失败: {e}")

if __name__ == "__main__":
    start_backend()