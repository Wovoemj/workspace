#!/usr/bin/env python3
"""
旅游助手 - 一键启动脚本
用法: python start.py
"""

import os
import sys
import subprocess
import time
import signal
import platform

# 配置
BACKEND_PORT = 5001
FRONTEND_PORT = 3000
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))


def print_banner():
    print("=" * 42)
    print("   旅游助手 - 一键启动")
    print("=" * 42)
    print()


def run_cmd(cmd, cwd=None, shell=True):
    """运行命令并返回进程"""
    return subprocess.Popen(
        cmd,
        cwd=cwd or PROJECT_ROOT,
        shell=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        errors='replace'
    )


def kill_port(port):
    """清理占用指定端口的进程"""
    system = platform.system()
    try:
        if system == "Windows":
            # 查找占用端口的 PID
            result = subprocess.run(
                f'netstat -ano | findstr :{port} | findstr LISTENING',
                shell=True, capture_output=True, text=True
            )
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        print(f"  清理端口 {port} (PID: {pid})...")
                        subprocess.run(f'taskkill /F /PID {pid} >nul 2>&1', shell=True)
        else:
            # Linux/macOS
            result = subprocess.run(
                f"lsof -ti:{port}", shell=True, capture_output=True, text=True
            )
            if result.stdout.strip():
                pid = result.stdout.strip()
                print(f"  清理端口 {port} (PID: {pid})...")
                subprocess.run(f"kill {pid}", shell=True)
    except Exception:
        pass


def check_health(port, max_retry=10):
    """检查服务健康状态"""
    import urllib.request
    for i in range(max_retry):
        try:
            urllib.request.urlopen(f"http://localhost:{port}/api/health", timeout=1)
            return True
        except Exception:
            time.sleep(1)
    return False


def stream_output(proc, prefix):
    """实时输出进程日志"""
    for line in proc.stdout:
        print(f"[{prefix}] {line.rstrip()}")


def main():
    print_banner()

    processes = []

    def cleanup(signum=None, frame=None):
        """清理所有进程"""
        print("\n")
        print("=" * 42)
        print("   正在停止服务...")
        print("=" * 42)
        for proc in processes:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        print("  服务已停止")
        sys.exit(0)

    # 注册信号处理
    signal.signal(signal.SIGINT, cleanup)
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, cleanup)

    try:
        # 1. 清理端口
        print(f"[1/3] 检查端口占用...")
        kill_port(BACKEND_PORT)
        kill_port(FRONTEND_PORT)
        time.sleep(1)

        # 2. 启动后端
        print()
        print(f"[2/3] 启动后端服务 (端口 {BACKEND_PORT})...")
        backend_proc = run_cmd(f"python app.py")
        processes.append(backend_proc)

        # 等待后端启动
        print("  等待后端启动...")
        if check_health(BACKEND_PORT, max_retry=15):
            print("  后端启动成功")
        else:
            print("  后端启动中，请稍候...")

        # 3. 启动前端
        print()
        print(f"[3/3] 启动前端服务 (端口 {FRONTEND_PORT})...")
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend", "user-web")
        frontend_proc = run_cmd("npm run dev", cwd=frontend_dir)
        processes.append(frontend_proc)

        print()
        print("=" * 42)
        print("   启动完成!")
        print("=" * 42)
        print()
        print(f"  后端: http://localhost:{BACKEND_PORT}")
        print(f"  前端: http://localhost:{FRONTEND_PORT}")
        print()
        print("  按 Ctrl+C 停止服务")
        print()

        # 同时输出前后端日志
        import threading
        backend_thread = threading.Thread(target=stream_output, args=(backend_proc, "Backend"), daemon=True)
        frontend_thread = threading.Thread(target=stream_output, args=(frontend_proc, "Frontend"), daemon=True)
        backend_thread.start()
        frontend_thread.start()

        # 等待进程结束
        while True:
            backend_alive = backend_proc.poll() is None
            frontend_alive = frontend_proc.poll() is None
            if not backend_alive and not frontend_alive:
                break
            if not backend_alive:
                print("[Backend] 后端进程已退出")
                break
            if not frontend_alive:
                print("[Frontend] 前端进程已退出")
                break
            time.sleep(0.5)

    except Exception as e:
        print(f"\n  启动失败: {e}")
        cleanup()


if __name__ == "__main__":
    main()
