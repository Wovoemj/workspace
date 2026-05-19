#!/usr/bin/env python3
"""
旅游助手 - 一键启动脚本
============================================

【功能说明】
- 自动化启动整个旅游助手项目所需的所有服务
- 包括：Redis、AI服务、后端Flask应用、前端Next.js应用
- 自动处理端口占用、进程清理、健康检查和日志输出

【使用方法】
python start.py

【启动顺序】
1. 清理旧进程（端口占用）
2. 检查并启动 Redis（可选，Docker）
3. 启动 AI 服务（Go，端口 8084）
4. 启动后端服务（Flask，端口 5001）
5. 启动前端服务（Next.js，端口 3000）

【环境变量配置】
- AI_PROVIDER: "mimo" 或 "kimi"
- MIMO_API_KEY / KIMI_API_KEY: AI 服务 API Key
- MIMO_MODEL / KIMI_MODEL: 模型名称
"""

import os
import sys
import subprocess
import time
import signal
import platform


# ============== 配置区域 ==============
# 【后端服务端口】Flask 应用监听端口
BACKEND_PORT = 5001

# 【前端服务端口】Next.js 开发服务器端口
FRONTEND_PORT = 3000

# 【AI 服务端口】Go AI 服务监听端口
AI_SERVICE_PORT = 8084

# 【Redis 端口】Redis 默认端口
REDIS_PORT = 6379


# ============== AI 配置 ==============
# 【AI 提供商】可选值: "mimo" 或 "kimi"
AI_PROVIDER = "mimo"

# 【MiMo API Key】用于访问 MiMo 模型
MIMO_API_KEY = "tp-cs6449t23jpm0mwnimjsf4n1dcpny2zg4x6ihm1svgqn08zt"

# 【Kimi API Key】用于访问 Kimi 模型
KIMI_API_KEY = "sk-JcUSqOZ2FUdxICD3Plubl72fUJhY4j8cuWRpnvkjMlavNOI5"

# 【MiMo 模型名称】可选: MiMo-V2.5, MiMo-V2, MiMo-V1
MIMO_MODEL = "MiMo-V2.5"

# 【Kimi 模型名称】可选: kimi-k2.5, kimi-k2.6, kimi-k2
KIMI_MODEL = "kimi-k2.5"


# 【项目根目录】获取当前脚本所在目录的绝对路径
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))


def print_banner():
    """
    打印启动横幅
    
    【功能】
    - 显示程序标题
    - 提供视觉分隔
    """
    print("=" * 50)
    print("   智旅助手 - 一键启动 ")
    print("=" * 50)
    print()


def run_cmd(cmd, cwd=None, shell=True, env=None):
    """
    运行命令并返回子进程对象
    
    Args:
        cmd: 要执行的命令字符串
        cwd: 工作目录，默认为项目根目录
        shell: 是否使用 shell 执行
        env: 环境变量字典（会合并到当前环境）
    
    Returns:
        subprocess.Popen: 子进程对象
    
    【功能说明】
    - 启动外部命令（如 go run、npm run、python）
    - 捕获 stdout/stderr 用于日志输出
    - 支持自定义环境变量（如 AI_API_KEY）
    - 使用 GBK 编码兼容 Windows 中文输出
    """
    # 复制当前环境变量（避免修改全局环境）
    process_env = os.environ.copy()
    
    # 如果提供了额外环境变量，合并进去
    if env:
        process_env.update(env)
    
    # 创建子进程
    return subprocess.Popen(
        cmd,                                  # 命令字符串
        cwd=cwd or PROJECT_ROOT,              # 工作目录
        shell=shell,                          # 使用 shell 执行
        stdout=subprocess.PIPE,               # 捕获标准输出
        stderr=subprocess.STDOUT,             # 标准错误重定向到标准输出
        text=True,                            # 文本模式（而非字节）
        encoding='gbk',                      # Windows 中文编码
        errors='replace',                     # 编码错误处理：替换无法解码的字符
        env=process_env                       # 自定义环境变量
    )


def is_docker_running():
    """
    检查 Docker 是否正在运行
    
    Returns:
        bool: Docker 运行中返回 True，否则返回 False
    
    【功能说明】
    - 执行 `docker info` 命令检查 Docker 守护进程
    - 用于判断是否可以启动 Redis 容器
    - 如果 Docker 未运行，Redis 将使用内存缓存降级
    """
    try:
        result = subprocess.run(
            'docker info',                    # Docker 检查命令
            shell=True,                       # 使用 shell
            capture_output=True,              # 捕获输出
            text=True                         # 文本模式
        )
        return result.returncode == 0         # 返回码为 0 表示成功
    except Exception:
        return False


def is_container_running(name):
    """
    检查指定名称的 Docker 容器是否正在运行
    
    Args:
        name: 容器名称
    
    Returns:
        bool: 容器运行中返回 True，否则返回 False
    
    【功能说明】
    - 使用 `docker ps` 过滤容器名称
    - 检查指定容器是否处于 running 状态
    - 用于判断 Redis 容器是否已启动
    """
    try:
        result = subprocess.run(
            f'docker ps --filter "name={name}" --filter "status=running" --format "{{{{.Names}}}}"',
            shell=True,
            capture_output=True,
            text=True
        )
        return name in result.stdout          # 容器名在输出中即表示运行中
    except Exception:
        return False


def start_redis_container():
    """
    启动 Redis Docker 容器
    
    Returns:
        bool: 启动成功返回 True，否则返回 False
    
    【功能说明】
    - 检查 Redis 容器是否已运行
    - 如果未运行，使用 `docker run` 启动 Redis 7 Alpine 版本
    - 映射端口 6379 到宿主机
    - 等待 2 秒确保 Redis 完全启动
    
    【容器配置】
    - 镜像: redis:7-alpine（轻量级）
    - 名称: travel-assistant-redis
    - 端口: 6379:6379
    """
    # 检查 Redis 容器是否已运行
    if is_container_running('travel-assistant-redis'):
        print("  [Redis] 已在运行")
        return True
    
    print("  [Redis] 正在启动...")
    try:
        # 启动 Redis 容器
        result = subprocess.run(
            'docker run -d --name travel-assistant-redis -p 6379:6379 redis:7-alpine',
            shell=True,
            capture_output=True,
            text=True
        )
        
        # 检查启动是否成功
        if result.returncode == 0:
            time.sleep(2)                      # 等待 Redis 完全启动
            print("  [Redis] 启动成功")
            return True
        else:
            print(f"  [Redis] 启动失败: {result.stderr}")
            return False
    except Exception as e:
        print(f"  [Redis] 启动失败: {e}")
        return False


def kill_port(port):
    """
    清理占用指定端口的进程
    
    Args:
        port: 要清理的端口号
    
    【功能说明】
    - 跨平台端口清理（Windows / Linux / macOS）
    - Windows: 使用 netstat + taskkill
    - Linux/macOS: 使用 lsof + kill
    - 用于确保端口可用，避免 "端口已被占用" 错误
    
    【Windows 实现】
    1. netstat -ano | findstr :PORT - 找到占用端口的 PID
    2. taskkill /F /PID PID - 强制终止进程
    
    【Linux/macOS 实现】
    1. lsof -ti:PORT - 找到占用端口的 PID
    2. kill PID - 终止进程
    """
    system = platform.system()
    try:
        if system == "Windows":
            # Windows: 使用 netstat 查找占用端口的进程
            result = subprocess.run(
                f'netstat -ano | findstr :{port} | findstr LISTENING',
                shell=True,
                capture_output=True,
                text=True
            )
            # 解析输出，提取 PID 并逐个终止
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        pid = parts[-1]               # PID 在最后一列
                        print(f"  清理端口 {port} (PID: {pid})...")
                        subprocess.run(f'taskkill /F /PID {pid} >nul 2>&1', shell=True)
        else:
            # Linux/macOS: 使用 lsof 查找占用端口的进程
            result = subprocess.run(
                f"lsof -ti:{port}",
                shell=True,
                capture_output=True,
                text=True
            )
            if result.stdout.strip():
                pid = result.stdout.strip()
                print(f"  清理端口 {port} (PID: {pid})...")
                subprocess.run(f"kill {pid}", shell=True)
    except Exception:
        # 清理失败不影响主流程，忽略异常
        pass


def check_health(url, max_retry=10):
    """
    检查服务健康状态（HTTP 健康检查）
    
    Args:
        url: 健康检查的 URL（如 http://localhost:5001/api/health）
        max_retry: 最大重试次数
    
    Returns:
        bool: 服务健康返回 True，否则返回 False
    
    【功能说明】
    - 通过 HTTP GET 请求检查服务是否就绪
    - 重试机制：最多重试 max_retry 次，每次间隔 1 秒
    - 用于确保依赖服务启动完成后再启动后续服务
    
    【使用示例】
    check_health("http://localhost:8084/health", max_retry=5)
    """
    import urllib.request
    
    for i in range(max_retry):
        try:
            # 尝试连接服务
            urllib.request.urlopen(url, timeout=2)
            return True                          # 连接成功，服务健康
        except Exception:
            time.sleep(1)                       # 等待 1 秒后重试
    return False                                # 超过最大重试次数，服务未就绪


def stream_output(proc, prefix):
    """
    实时输出进程日志
    
    Args:
        proc: 子进程对象（subprocess.Popen）
        prefix: 日志前缀（如 "[AI]", "[Backend]"）
    
    【功能说明】
    - 实时读取子进程的 stdout 并打印
    - 为每个服务的日志添加前缀，便于区分
    - 用于同时监控多个服务的输出
    
    【使用示例】
    stream_output(backend_proc, "Backend")
    # 输出示例: [Backend]  * Running on http://localhost:5001
    """
    for line in proc.stdout:
        print(f"[{prefix}] {line.rstrip()}")


def main():
    """
    主函数：启动所有服务
    
    【启动流程】
    1. 打印启动横幅
    2. 检查 Docker（Redis 可选）
    3. 清理旧进程（端口占用）
    4. 启动 Redis（如果 Docker 可用）
    5. 启动 AI 服务（Go）
    6. 启动后端服务（Flask）
    7. 启动前端服务（Next.js）
    8. 打开浏览器
    9. 监控所有服务日志
    
    【信号处理】
    - 捕获 Ctrl+C (SIGINT) 和终止信号 (SIGTERM)
    - 优雅关闭所有子进程
    """
    # 打印启动横幅
    print_banner()
    
    # ============================================
    # 步骤 1: 检查 Docker（Redis 变成可选的）
    # ============================================
    redis_enabled = is_docker_running()
    if not redis_enabled:
        print("[提示] Docker 未运行，Redis 将被跳过（不影响核心功能）")
    else:
        print("[提示] Docker 已检测到，Redis 将被启用")

    # 存储所有子进程，用于后续清理
    processes = []

    # ============================================
    # 信号处理：优雅关闭所有子进程
    # ============================================
    def cleanup(signum=None, frame=None):
        """
        清理所有子进程
        
        【功能说明】
        - 收到 SIGINT (Ctrl+C) 或 SIGTERM 时调用
        - 终止所有子进程（AI、Backend、Frontend）
        - Windows 下额外清理端口占用
        - 使用 os._exit(0) 强制退出（避免 atexit 钩子问题）
        """
        print("\n")
        print("=" * 50)
        print("   正在停止服务...")
        print("=" * 50)
        
        # 终止所有子进程
        for proc in processes:
            try:
                proc.terminate()                   # 发送 SIGTERM
                proc.wait(timeout=3)               # 等待进程终止（最多 3 秒）
            except Exception:
                try:
                    proc.kill()                    # 强制终止（SIGKILL）
                except Exception:
                    pass
        
        # Windows 下强制清理端口（防止进程异常退出后端口仍被占用）
        if platform.system() == "Windows":
            kill_port(BACKEND_PORT)
            kill_port(FRONTEND_PORT)
            kill_port(AI_SERVICE_PORT)
        
        print("  服务已停止")
        os._exit(0)                               # 强制退出（不执行 atexit）

    # 注册信号处理函数
    signal.signal(signal.SIGINT, cleanup)          # Ctrl+C
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, cleanup)     # 终止信号

    try:
        # ============================================
        # 步骤 0: 清理旧进程
        # ============================================
        print("[0/4] 清理旧进程...")
        kill_port(BACKEND_PORT)                    # 清理后端端口
        kill_port(FRONTEND_PORT)                  # 清理前端端口
        kill_port(AI_SERVICE_PORT)                # 清理 AI 服务端口
        
        # 只杀 node 残留进程，不杀 python（会杀掉自己）
        if platform.system() == "Windows":
            try:
                subprocess.run('taskkill /F /IM node.exe >nul 2>&1', shell=True)
            except:
                pass
        time.sleep(1)                              # 等待进程完全终止

        # ============================================
        # 步骤 1: 启动 Redis（可选）
        # ============================================
        print("[1/4] 检查 Redis...")
        if redis_enabled:
            start_redis_container()                # 启动 Redis 容器
        else:
            print("  [跳过] Redis 不可用，但不影响使用")
        time.sleep(1)

        # ============================================
        # 步骤 2: 清理端口（二次确认）
        # ============================================
        print()
        print("[2/4] 检查端口占用...")
        kill_port(BACKEND_PORT)
        kill_port(FRONTEND_PORT)
        kill_port(AI_SERVICE_PORT)
        time.sleep(1)

        # ============================================
        # 步骤 3: 启动 AI 服务（Go）
        # ============================================
        print()
        provider_name = "MiMo" if AI_PROVIDER == "mimo" else "Kimi"
        print(f"[3/4] 启动 AI 服务 ({provider_name}, 端口 {AI_SERVICE_PORT})...")
        
        # AI 服务目录
        ai_dir = os.path.join(PROJECT_ROOT, "backend", "ai-service")
        
        # 根据提供商选择 API Key 和模型
        ai_api_key = MIMO_API_KEY if AI_PROVIDER == "mimo" else KIMI_API_KEY
        ai_model = MIMO_MODEL if AI_PROVIDER == "mimo" else KIMI_MODEL
        
        # 构造环境变量
        ai_env = {
            "AI_PROVIDER": AI_PROVIDER,
            "AI_API_KEY": ai_api_key,
            "AI_MODEL": ai_model,
            "REDIS_ADDR": f"localhost:{REDIS_PORT}" if redis_enabled else "",
            "PORT": str(AI_SERVICE_PORT)
        }
        
        # 启动 AI 服务（go run）
        ai_proc = run_cmd(
            "go run main.go moonshot_service.go",
            cwd=ai_dir,
            env=ai_env
        )
        processes.append(ai_proc)                  # 添加到进程列表（用于清理）

        # 等待 AI 服务启动
        print("  等待 AI 服务启动...")
        time.sleep(5)                              # 等待 Go 编译完成
        
        # 健康检查
        if check_health(f"http://localhost:{AI_SERVICE_PORT}/health", max_retry=5):
            print(f"  AI 服务启动成功 ({provider_name})")
        else:
            print("  AI 服务启动中...")

        # ============================================
        # 步骤 4: 启动后端 + 前端
        # ============================================
        print()
        
        # 启动后端服务（Flask）
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
        
        # 启动前端服务（Next.js）
        print(f"启动前端服务 (端口 {FRONTEND_PORT})...")
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend", "user-web")
        frontend_proc = run_cmd("npm run dev", cwd=frontend_dir)
        processes.append(frontend_proc)

        # ============================================
        # 打印服务地址
        # ============================================
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

        # ============================================
        # 自动打开浏览器
        # ============================================
        import webbrowser
        webbrowser.open(f"http://localhost:{FRONTEND_PORT}")

        # ============================================
        # 同时输出所有服务日志
        # ============================================
        import threading
        
        # 为每个服务创建一个线程来输出日志
        threads = []
        for proc, name in [(ai_proc, "AI"), (backend_proc, "Backend"), (frontend_proc, "Frontend")]:
            t = threading.Thread(target=stream_output, args=(proc, name), daemon=True)
            t.start()
            threads.append(t)

        # ============================================
        # 监控进程状态
        # ============================================
        # 主线程循环检查所有子进程是否退出
        while True:
            # 检查是否所有进程都已退出
            all_dead = all(p.poll() is not None for p in processes)
            if all_dead:
                break                            # 所有进程都退出了，退出主循环
            
            # 检查是否有进程异常退出
            for i, (proc, name) in enumerate(zip(processes, ["AI", "Backend", "Frontend"])):
                if proc.poll() is not None and proc.poll() != 0:
                    print(f"[{name}] 进程已退出，代码: {proc.poll()}")
            
            time.sleep(0.5)                      # 每隔 0.5 秒检查一次

    except Exception as e:
        # 捕获所有异常，打印错误信息并清理
        print(f"\n  启动失败: {e}")
        cleanup()


if __name__ == "__main__":
    main()
