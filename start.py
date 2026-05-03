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

# ============== 配置 ==============
BACKEND_PORT = 5001
FRONTEND_PORT = 3000
AI_SERVICE_PORT = 8084
REDIS_PORT = 6379

# AI 配置
AI_PROVIDER = "mimo"  # "mimo" 或 "kimi"
MIMO_API_KEY = "tp-cs6449t23jpm0mwnimjsf4n1dcpny2zg4x6ihm1svgqn08zt"
KIMI_API_KEY = "sk-JcUSqOZ2FUdxICD3Plubl72fUJhY4j8cuWRpnvkjMlavNOI5"
MIMO_MODEL = "MiMo-V2.5"  # MiMo 模型: MiMo-V2.5, MiMo-V2, MiMo-V1
KIMI_MODEL = "kimi-k2.5"  # Kimi 模型: kimi-k2.5, kimi-k2.6, kimi-k2

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))


def print_banner():
    print("=" * 50)
    print("   智旅助手 - 一键启动 ")
    print("=" * 50)
    print()


def run_cmd(cmd, cwd=None, shell=True, env=None):
    """运行命令并返回进程"""
    # 合并环境变量
    process_env = os.environ.copy()
    if env:
        process_env.update(env)
    
    return subprocess.Popen(
        cmd,
        cwd=cwd or PROJECT_ROOT,
        shell=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='gbk',
        errors='replace',
        env=process_env
    )


def is_docker_running():
    """检查 Docker 是否运行"""
    try:
        result = subprocess.run(
            'docker info',
            shell=True,
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except Exception:
        return False


def is_container_running(name):
    """检查容器是否运行"""
    try:
        result = subprocess.run(
            f'docker ps --filter "name={name}" --filter "status=running" --format "{{{{.Names}}}}"',
            shell=True,
            capture_output=True,
            text=True
        )
        return name in result.stdout
    except Exception:
        return False


def start_redis_container():
    """启动 Redis 容器"""
    if is_container_running('travel-assistant-redis'):
        print("  [Redis] 已在运行")
        return True
    
    print("  [Redis] 正在启动...")
    try:
        result = subprocess.run(
            'docker run -d --name travel-assistant-redis -p 6379:6379 redis:7-alpine',
            shell=True,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            time.sleep(2)
            print("  [Redis] 启动成功")
            return True
        else:
            print(f"  [Redis] 启动失败: {result.stderr}")
            return False
    except Exception as e:
        print(f"  [Redis] 启动失败: {e}")
        return False


def kill_port(port):
    """清理占用指定端口的进程"""
    system = platform.system()
    try:
        if system == "Windows":
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
            result = subprocess.run(
                f"lsof -ti:{port}", shell=True, capture_output=True, text=True
            )
            if result.stdout.strip():
                pid = result.stdout.strip()
                print(f"  清理端口 {port} (PID: {pid})...")
                subprocess.run(f"kill {pid}", shell=True)
    except Exception:
        pass


def check_health(url, max_retry=10):
    """检查服务健康状态"""
    import urllib.request
    for i in range(max_retry):
        try:
            urllib.request.urlopen(url, timeout=2)
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
    
    # 检查 Docker（Redis 变成可选的）
    redis_enabled = is_docker_running()
    if not redis_enabled:
        print("[提示] Docker 未运行，Redis 将被跳过（不影响核心功能）")
    else:
        print("[提示] Docker 已检测到，Redis 将被启用")

    processes = []

    def cleanup(signum=None, frame=None):
        """清理所有进程"""
        print("\n")
        print("=" * 50)
        print("   正在停止服务...")
        print("=" * 50)
        for proc in processes:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        # Windows 下强制清理端口
        if platform.system() == "Windows":
            kill_port(BACKEND_PORT)
            kill_port(FRONTEND_PORT)
            kill_port(AI_SERVICE_PORT)
        print("  服务已停止")
        os._exit(0)

    signal.signal(signal.SIGINT, cleanup)
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, cleanup)

    try:
        # 0. 清理旧进程
        print("[0/4] 清理旧进程...")
        kill_port(BACKEND_PORT)
        kill_port(FRONTEND_PORT)
        kill_port(AI_SERVICE_PORT)
        # 只杀 node 残留，不杀 python（会杀掉自己）
        if platform.system() == "Windows":
            try:
                subprocess.run('taskkill /F /IM node.exe >nul 2>&1', shell=True)
            except:
                pass
        time.sleep(1)

        # 1. 启动 Redis（可选）
        print("[1/4] 检查 Redis...")
        if redis_enabled:
            start_redis_container()
        else:
            print("  [跳过] Redis 不可用，但不影响使用")
        time.sleep(1)

        # 2. 清理端口
        print()
        print("[2/4] 检查端口占用...")
        kill_port(BACKEND_PORT)
        kill_port(FRONTEND_PORT)
        kill_port(AI_SERVICE_PORT)
        time.sleep(1)

        # 3. 启动 AI 服务
        print()
        provider_name = "MiMo" if AI_PROVIDER == "mimo" else "Kimi"
        print(f"[3/4] 启动 AI 服务 ({provider_name}, 端口 {AI_SERVICE_PORT})...")
        ai_dir = os.path.join(PROJECT_ROOT, "backend", "ai-service")
        ai_api_key = MIMO_API_KEY if AI_PROVIDER == "mimo" else KIMI_API_KEY
        ai_model = MIMO_MODEL if AI_PROVIDER == "mimo" else KIMI_MODEL
        ai_env = {
            "AI_PROVIDER": AI_PROVIDER,
            "AI_API_KEY": ai_api_key,
            "AI_MODEL": ai_model,
            "REDIS_ADDR": f"localhost:{REDIS_PORT}" if redis_enabled else "",
            "PORT": str(AI_SERVICE_PORT)
        }
        ai_proc = run_cmd(
            "go run main.go moonshot_service.go",
            cwd=ai_dir,
            env=ai_env
        )
        processes.append(ai_proc)

        # 等待 AI 服务启动
        print("  等待 AI 服务启动...")
        time.sleep(5)
        if check_health(f"http://localhost:{AI_SERVICE_PORT}/health", max_retry=5):
            print(f"  AI 服务启动成功 ({provider_name})")
        else:
            print("  AI 服务启动中...")

        # 4. 启动后端 + 前端
        print()
        print(f"[4/4] 启动后端服务 (端口 {BACKEND_PORT})...")
        backend_proc = run_cmd("python app.py")
        processes.append(backend_proc)

        # 等待后端启动
        print("  等待后端启动...")
        if check_health(f"http://localhost:{BACKEND_PORT}/api/health", max_retry=15):
            print("  后端启动成功")
        else:
            print("  后端启动中，请稍候...")

        print()
        print(f"启动前端服务 (端口 {FRONTEND_PORT})...")
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend", "user-web")
        frontend_proc = run_cmd("npm run dev", cwd=frontend_dir)
        processes.append(frontend_proc)

        print()
        print("=" * 50)
        print("   启动完成!")
        print("=" * 50)
        print()
        print("  服务地址:")
        print(f"  - 前端:   http://localhost:{FRONTEND_PORT}")
        print(f"  - 后端:   http://localhost:{BACKEND_PORT}")
        print(f"  - AI API: http://localhost:{AI_SERVICE_PORT}")
        if redis_enabled:
            print(f"  - Redis:  localhost:{REDIS_PORT}")
        print()
        print(f"  AI 提供商: {provider_name}")
        print()
        print("  按 Ctrl+C 停止服务")
        print()

        # 自动打开浏览器
        import webbrowser
        webbrowser.open(f"http://localhost:{FRONTEND_PORT}")

        # 同时输出所有服务日志
        import threading
        threads = []
        for proc, name in [(ai_proc, "AI"), (backend_proc, "Backend"), (frontend_proc, "Frontend")]:
            t = threading.Thread(target=stream_output, args=(proc, name), daemon=True)
            t.start()
            threads.append(t)

        # 等待进程结束
        while True:
            all_dead = all(p.poll() is not None for p in processes)
            if all_dead:
                break
            # 检查是否某个进程退出了
            for i, (proc, name) in enumerate(zip(processes, ["AI", "Backend", "Frontend"])):
                if proc.poll() is not None and proc.poll() != 0:
                    print(f"[{name}] 进程已退出，代码: {proc.poll()}")
            time.sleep(0.5)

    except Exception as e:
        print(f"\n  启动失败: {e}")
        cleanup()


if __name__ == "__main__":
    main()
