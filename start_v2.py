# -*- coding: utf-8 -*- 
""" 
Travel Assistant 启动脚本 v2 
- 统一日志输出（不乱弹终端窗口） 
- 前置检查：Python/Node 版本、依赖、端口、文件完整性 
- 优雅关闭：Ctrl+C 一次停止所有子进程 
""" 

# 导入未来版本的注解功能，确保类型注解在所有Python版本中兼容
from __future__ import annotations 

# 导入操作系统相关的功能模块
import os 
# 导入系统相关的功能模块，如sys.exit()
import sys 
# 导入套接字模块，用于网络通信和端口检测
import socket 
# 导入信号处理模块，用于处理Ctrl+C等信号
import signal 
# 导入高级文件操作模块，如复制文件
import shutil 
# 导入子进程模块，用于启动和管理外部进程
import subprocess 
# 导入命令行参数解析模块
import argparse 
# 导入时间模块，用于延时等操作
import time 
# 导入线程模块，用于创建后台线程
import threading 
# 导入路径处理模块，提供跨平台的路径操作
from pathlib import Path 
# 导入日期时间模块，用于获取当前时间戳
from datetime import datetime 

# 定义项目根目录为当前脚本所在的目录
ROOT = Path(__file__).resolve().parent 

# 定义需要启动的服务配置字典
SERVICES = { 
    # 后端服务配置
    "backend": { 
        # 启动命令：使用当前Python解释器运行app.py
        "cmd": [sys.executable, "app.py"], 
        # 工作目录：项目根目录
        "cwd": str(ROOT), 
        # 服务端口：5001
        "port": 5001, 
        # 日志颜色：青色
        "color": "\033[36m", 
    }, 
    # 用户端Web前端配置
    "user-web": { 
        # 启动命令：npm run dev
        "cmd": ["npm", "run", "dev"], 
        # 工作目录：frontend/user-web目录
        "cwd": str(ROOT / "frontend" / "user-web"), 
        # 服务端口：3000
        "port": 3000, 
        # 日志颜色：品红色
        "color": "\033[35m", 
    }, 
    # 管理端Web前端配置
    "admin-web": { 
        # 启动命令：npm run dev
        "cmd": ["npm", "run", "dev"], 
        # 工作目录：frontend/admin-web目录
        "cwd": str(ROOT / "frontend" / "admin-web"), 
        # 服务端口：3001
        "port": 3001, 
        # 日志颜色：黄色
        "color": "\033[33m", 
        # 标记为可选服务，仅在full模式下启动
        "optional": True, 
    }, 
} 

# 定义ANSI转义码：重置颜色
RESET = "\033[0m" 
# 定义ANSI转义码：加粗
BOLD = "\033[1m" 
# 定义ANSI转义码：红色
RED = "\033[31m" 
# 定义ANSI转义码：绿色
GREEN = "\033[32m" 
# 定义ANSI转义码：黄色
YELLOW = "\033[33m" 

# 存储所有子进程的列表
children: list[subprocess.Popen] = [] 
# 用于通知所有线程关闭的事件对象
shutdown_event = threading.Event() 


# 统一的日志输出函数
def log(tag: str, msg: str, color: str = ""):
    # 获取当前时间，格式化为时:分:秒
    ts = datetime.now().strftime("%H:%M:%S") 
    # 打印带时间戳、标签和颜色的日志消息
    print(f"{color}[{ts}] [{tag}] {msg}{RESET}") 


# 检查指定端口是否被占用
def is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    try: 
        # 创建一个TCP套接字
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s: 
            # 设置连接超时时间为0.5秒
            s.settimeout(0.5) 
            # 尝试连接，返回0表示连接成功（端口被占用）
            return s.connect_ex((host, port)) == 0 
    except OSError: 
        # 如果发生操作系统错误，返回False
        return False 


# 检查Python版本是否满足要求（3.9+）
def check_python_version():
    # 获取Python版本信息
    v = sys.version_info 
    # 如果版本低于3.9，返回错误信息
    if v < (3, 9): 
        return f"need Python 3.9+, now {v.major}.{v.minor}" 
    # 版本满足要求，返回None
    return None 


# 检查Node.js版本是否满足要求（18+）
def check_node_version():
    # 查找node命令的路径
    node = shutil.which("node") 
    # 如果找不到node命令
    if not node: 
        return "node not found, install Node.js 18+" 
    try: 
        # 执行node --version获取版本号
        out = subprocess.check_output([node, "--version"], text=True).strip() 
        # 提取主版本号
        major = int(out.lstrip("v").split(".")[0]) 
        # 如果主版本号小于18
        if major < 18: 
            return f"need Node.js 18+, now {out}" 
    except Exception: 
        # 如果检测过程中出现异常
        return "cannot detect Node.js version" 
    # 版本满足要求，返回None
    return None 


# 检查Python依赖是否已安装
def check_python_deps():
    # 获取requirements.txt文件路径
    req = ROOT / "requirements.txt" 
    # 如果requirements.txt不存在，跳过检查
    if not req.exists(): 
        return None 
    # 存储缺失的依赖包列表
    missing = [] 
    # 打开requirements.txt文件
    with open(req) as f: 
        # 逐行读取文件内容
        for line in f: 
            # 去除行首尾空白字符
            line = line.strip() 
            # 跳过空行和注释行
            if not line or line.startswith("#"): 
                continue 
            # 提取包名（去除版本号和可选依赖标记）
            pkg = line.split("==")[0].split(">=")[0].split("<=")[0].split("[")[0].strip() 
            # 如果包名为空，跳过
            if not pkg: 
                continue 
            try: 
                # 尝试导入包（将包名中的连字符替换为下划线）
                __import__(pkg.replace("-", "_")) 
            except ImportError: 
                try: 
                    # 如果导入失败，使用pip show命令检查包是否安装
                    subprocess.check_output( 
                        [sys.executable, "-m", "pip", "show", pkg], 
                        stderr=subprocess.DEVNULL, 
                    ) 
                except subprocess.CalledProcessError: 
                    # 如果pip show也失败，记录为缺失的依赖
                    missing.append(pkg) 
    # 如果有缺失的依赖，返回错误信息
    if missing: 
        return f"missing deps: {', '.join(missing)}" 
    # 所有依赖都已安装，返回None
    return None 


# 检查必需的文件是否存在
def check_files():
    # 定义必需的文件列表
    required = [ROOT / "app.py", ROOT / ".env"] 
    # 找出不存在的文件，并转换为相对路径
    missing = [str(f.relative_to(ROOT)) for f in required if not f.exists()] 
    # 如果有缺失的文件，返回错误信息
    if missing: 
        return f"missing files: {', '.join(missing)}" 
    # 所有必需文件都存在，返回None
    return None 


# 释放被占用的端口（跨平台）
def kill_port(port: int):
    # 判断操作系统类型
    if os.name == "nt": 
        # Windows系统
        try: 
            # 使用netstat命令查找占用端口的进程
            out = subprocess.check_output( 
                f"netstat -ano | findstr :{port} | findstr LISTENING", 
                shell=True, text=True, 
            ) 
            # 存储进程ID的集合
            pids = set() 
            # 解析命令输出，提取PID
            for line in out.strip().splitlines(): 
                parts = line.split() 
                if parts: 
                    # 最后一列是PID
                    pids.add(parts[-1]) 
            # 终止占用端口的进程
            for pid in pids: 
                # 跳过PID为0的进程
                if pid == "0": 
                    continue 
                # 使用taskkill强制终止进程
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True) 
                # 记录日志
                log("KILL", f"killed PID={pid} on port {port}", YELLOW) 
            return True 
        except subprocess.CalledProcessError: 
            # 如果命令执行失败，返回False
            return False 
    else: 
        # Linux/Mac系统
        try: 
            # 使用fuser命令释放端口
            subprocess.run(["fuser", "-k", f"{port}/tcp"], capture_output=True) 
            # 记录日志
            log("KILL", f"freed port {port}", YELLOW) 
            return True 
        except FileNotFoundError: 
            # 如果没有fuser命令，尝试使用lsof
            try: 
                # 使用lsof查找占用端口的进程PID
                out = subprocess.check_output(["lsof", "-ti", f":{port}"], text=True) 
                # 终止每个占用端口的进程
                for pid in out.strip().splitlines(): 
                    os.kill(int(pid), signal.SIGKILL) 
                return True 
            except Exception: 
                # 如果所有方法都失败，返回False
                return False 


# 启动前的全面检查函数
def preflight(args): 
    # 存储检查通过的项目列表
    checks = [] 
    # 存储检查失败的项目列表
    errors = [] 

    # 检查Python版本
    err = check_python_version() 
    if err: 
        # 如果检查失败，记录错误
        errors.append(("Python", err)) 
    else: 
        # 如果检查通过，记录成功信息
        checks.append(("Python", f"{sys.version.split()[0]} OK")) 

    # 检查Node.js版本
    err = check_node_version() 
    if err: 
        # 如果检查失败，记录错误
        errors.append(("Node.js", err)) 
    else: 
        # 如果检查通过，获取并记录Node.js版本
        node_v = subprocess.check_output(["node", "--version"], text=True).strip() 
        checks.append(("Node.js", f"{node_v} OK")) 

    # 检查.env配置文件
    env_file = ROOT / ".env" 
    env_example = ROOT / ".env.example" 
    if not env_file.exists() and env_example.exists(): 
        # 如果.env不存在但.env.example存在，复制生成.env
        shutil.copy2(env_example, env_file) 
        checks.append((".env", "generated from .env.example OK")) 
    elif not env_file.exists(): 
        # 如果两者都不存在，记录错误
        errors.append((".env", "missing .env and .env.example")) 
    else: 
        # 如果.env已存在，记录成功
        checks.append((".env", "exists OK")) 

    # 检查用户端前端的.env.local配置文件
    uw_env = ROOT / "frontend" / "user-web" / ".env.local" 
    uw_ex = ROOT / "frontend" / "user-web" / ".env.local.example" 
    if not uw_env.exists() and uw_ex.exists(): 
        # 如果.env.local不存在但示例文件存在，复制生成
        shutil.copy2(uw_ex, uw_env) 
        checks.append(("frontend .env.local", "generated OK")) 

    # 检查Python依赖
    if not args.skip_install: 
        # 如果未跳过安装，先检查依赖
        log("CHECK", "checking Python deps...", YELLOW) 
        err = check_python_deps() 
        if err: 
            # 如果有缺失的依赖，执行安装
            log("CHECK", "installing Python deps...", YELLOW) 
            cmd = [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"] 
            # 如果启用了安静模式，添加-q参数
            if args.quiet: 
                cmd.append("-q") 
            # 执行安装命令
            ret = subprocess.run(cmd, cwd=str(ROOT)) 
            if ret.returncode != 0: 
                # 如果安装失败，记录错误
                errors.append(("pip", "install failed")) 
            else: 
                # 如果安装成功，记录成功信息
                checks.append(("pip", "deps installed OK")) 
        else: 
            # 如果依赖已完整，记录成功
            checks.append(("pip", "deps OK")) 
    else: 
        # 如果跳过了安装，只检查依赖是否完整
        err = check_python_deps() 
        if err: 
            # 如果有缺失的依赖，记录错误
            errors.append(("pip", err)) 
        else: 
            # 依赖完整，记录成功
            checks.append(("pip", "deps OK")) 

    # 检查必需文件
    err = check_files() 
    if err: 
        # 如果有文件缺失，记录错误
        errors.append(("files", err)) 
    else: 
        # 文件完整，记录成功
        checks.append(("files", "key files OK")) 

    # 检查端口冲突
    port_conflicts = [] 
    for name, svc in SERVICES.items(): 
        # 跳过可选服务（除非是full模式）
        if svc.get("optional") and args.profile != "full": 
            continue 
        # 获取服务端口
        port = svc.get("port") 
        # 检查端口是否被占用
        if port and is_port_open(port): 
            port_conflicts.append((name, port)) 

    # 处理端口冲突
    if port_conflicts: 
        if args.kill_ports: 
            # 如果启用了--kill-ports选项，释放被占用的端口
            for name, port in port_conflicts: 
                kill_port(port) 
                checks.append((f"port {port}", f"{name} freed OK")) 
            # 等待端口释放完成
            time.sleep(0.5) 
        else: 
            # 如果没有启用--kill-ports选项，记录端口冲突错误
            for name, port in port_conflicts: 
                errors.append((f"port {port}", f"{name} port in use (use --kill-ports)")) 

    # 打印检查结果
    print() 
    print(f"{BOLD}========== Preflight Check =========={RESET}") 
    # 打印通过的检查项
    for name, detail in checks: 
        log(name, detail, GREEN) 
    # 打印失败的检查项
    for name, detail in errors: 
        log(name, detail, RED) 

    # 如果有错误，返回False
    if errors: 
        print(f"\n{RED}{BOLD}X Check failed, fix issues above{RESET}") 
        return False 

    # 所有检查通过，返回True
    print(f"\n{GREEN}{BOLD}V All checks passed{RESET}\n") 
    return True 


# 后台线程函数：持续读取子进程的输出流
def stream_reader(proc, tag, color): 
    try: 
        # 逐行读取进程的标准输出
        for line in iter(proc.stdout.readline, ""): 
            # 如果收到关闭事件，停止读取
            if shutdown_event.is_set(): 
                break 
            # 去除行末的换行符
            line = line.rstrip("\n").rstrip("\r") 
            # 如果行不为空，打印日志
            if line: 
                log(tag, line, color) 
    except Exception: 
        # 忽略读取过程中的异常
        pass 
    finally: 
        # 确保关闭文件描述符
        if proc.stdout: 
            proc.stdout.close() 


# 启动单个服务
def start_service(name: str, config: dict): 
    # 获取服务标签（大写名称）
    tag = name.upper() 
    # 获取日志颜色
    color = config.get("color", "") 
    # 获取服务端口
    port = config.get("port") 
    # 获取工作目录
    cwd = config.get("cwd", str(ROOT)) 

    # 如果端口已被占用，跳过启动
    if port and is_port_open(port): 
        log(tag, f"port {port} in use, skip", YELLOW) 
        return None 

    # 记录服务启动日志
    log(tag, f"starting... (dir: {Path(cwd).name})", color) 

    # 复制当前环境变量
    env = os.environ.copy() 
    # 存储需要添加到PATH的额外路径
    extra_paths = [] 
    # 获取node命令所在目录
    node_bin = os.path.dirname(shutil.which("node") or "") 
    # 如果node_bin存在且不在当前PATH中，添加到额外路径
    if node_bin and node_bin not in env.get("PATH", ""): 
        extra_paths.append(node_bin) 
    # Windows系统特殊处理
    if os.name == "nt": 
        # 添加常见的Node.js安装路径
        for d in [ 
            os.path.expandvars(r"%ProgramFiles%\nodejs"), 
            os.path.expandvars(r"%APPDATA%\npm"), 
        ]: 
            # 如果目录存在且不在PATH中，添加到额外路径
            if os.path.isdir(d) and d not in env.get("PATH", ""): 
                extra_paths.append(d) 
    # 如果有额外路径，更新环境变量
    if extra_paths: 
        env["PATH"] = os.pathsep.join(extra_paths) + os.pathsep + env.get("PATH", "") 

    # 获取启动命令
    cmd = list(config["cmd"]) 
    # 判断是否是npm命令
    is_npm = cmd and cmd[0] == "npm" 
    if is_npm: 
        # 构建搜索路径（排除conda相关路径）
        search_path = os.pathsep.join( 
            p for p in env.get("PATH", "").split(os.pathsep) 
            if "anaconda" not in p.lower() and "conda" not in p.lower() 
        ) 
        # 在搜索路径中查找npm
        npm_full = shutil.which("npm", path=search_path) 
        # 如果没找到，尝试常见路径
        if not npm_full: 
            for c in [ 
                os.path.expandvars(r"%ProgramFiles%\nodejs\npm.cmd"), 
                os.path.expandvars(r"%ProgramFiles%\nodejs\npm"), 
                os.path.expandvars(r"%APPDATA%\npm\npm.cmd"), 
            ]: 
                # 如果文件存在，使用找到的npm
                if os.path.isfile(c): 
                    npm_full = c 
                    break 
        # 如果还是没找到，尝试在完整PATH中查找
        if not npm_full: 
            npm_full = shutil.which("npm", path=env.get("PATH", "")) 
        # 如果最终仍未找到npm
        if not npm_full: 
            log(tag, "npm not found! Make sure Node.js 'Add to PATH' was checked", RED) 
            return None 
        # 记录npm路径
        log(tag, f"npm: {npm_full}", color) 
        # 更新命令为完整路径
        cmd[0] = npm_full 

    # 如果是npm命令，检查node_modules是否存在
    if is_npm: 
        nm = Path(cwd) / "node_modules" 
        # 如果node_modules不存在，先执行npm install
        if not nm.exists(): 
            log(tag, "first run, npm install...", color) 
            # 执行npm install
            install = subprocess.run(cmd[:1] + ["install"], cwd=cwd, env=env) 
            # 如果安装失败
            if install.returncode != 0: 
                log(tag, "npm install failed!", RED) 
                return None 

    # 启动子进程
    try: 
        proc = subprocess.Popen( 
            cmd, 
            cwd=cwd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT, 
            text=True, 
            bufsize=1, 
            env=env, 
            # Windows系统下不创建新窗口
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0, 
        ) 
    except FileNotFoundError: 
        # 如果命令不存在
        log(tag, f"command not found: {cmd[0]}", RED) 
        return None 
    except Exception as e: 
        # 其他启动异常
        log(tag, f"start failed: {e}", RED) 
        return None 

    # 创建后台线程读取进程输出
    t = threading.Thread(target=stream_reader, args=(proc, tag, color), daemon=True) 
    # 启动线程
    t.start() 

    # 将进程添加到全局列表
    children.append(proc) 
    # 记录启动成功日志
    log(tag, f"PID {proc.pid} started OK", GREEN) 
    # 返回进程对象
    return proc 


# 清理函数：优雅关闭所有子进程
def cleanup(signum=None, frame=None): 
    # 如果已经设置关闭事件，直接返回
    if shutdown_event.is_set(): 
        return 
    # 设置关闭事件
    shutdown_event.set() 

    # 打印关闭提示
    print(f"\n{YELLOW}shutting down all services...{RESET}") 
    # 遍历所有子进程
    for proc in children: 
        # 如果进程还在运行
        if proc.poll() is None: 
            try: 
                # 发送终止信号
                if os.name == "nt": 
                    # Windows使用terminate
                    proc.terminate() 
                else: 
                    # Unix/Linux使用SIGTERM
                    proc.send_signal(signal.SIGTERM) 
            except Exception: 
                # 忽略发送信号时的异常
                pass 

    # 设置等待超时时间（5秒）
    deadline = time.time() + 5 
    # 等待所有进程终止
    for proc in children: 
        # 计算剩余等待时间
        remaining = max(0, deadline - time.time()) 
        try: 
            # 等待进程结束，超时则继续
            proc.wait(timeout=remaining) 
        except subprocess.TimeoutExpired: 
            # 如果超时，强制杀死进程
            proc.kill() 

    # 打印完成日志
    print(f"{GREEN}all services stopped OK{RESET}") 
    # 退出程序
    sys.exit(0) 


# 主函数
def main(): 
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description="Travel Assistant Launcher v2") 
    # 添加--profile参数，选择启动模式
    parser.add_argument( 
        "--profile", 
        choices=["minimal", "default", "full"], 
        default=os.environ.get("START_PROFILE", "default"), 
    ) 
    # 添加--skip-install参数，跳过依赖安装
    parser.add_argument("--skip-install", action="store_true") 
    # 添加--quiet参数，安静模式
    parser.add_argument("--quiet", action="store_true") 
    # 添加--no-browser参数，不自动打开浏览器
    parser.add_argument("--no-browser", action="store_true") 
    # 添加--kill-ports参数，自动释放被占用的端口
    parser.add_argument("--kill-ports", action="store_true") 
    # 解析命令行参数
    args = parser.parse_args() 

    # 注册信号处理器，处理Ctrl+C
    signal.signal(signal.SIGINT, cleanup) 
    # 注册信号处理器，处理SIGTERM
    signal.signal(signal.SIGTERM, cleanup) 
    # Windows系统特殊处理
    if os.name == "nt": 
        try: 
            # 处理Ctrl+Break信号
            signal.signal(signal.SIGBREAK, cleanup) 
        except AttributeError: 
            # 如果信号不存在，忽略
            pass 

    # 打印启动横幅
    print() 
    print("=" * 46) 
    print("  Travel Assistant - Launcher v2") 
    print(f"  Profile: {args.profile}") 
    print("=" * 46) 
    print() 

    # 执行启动前检查
    if not preflight(args): 
        # 如果检查失败，退出程序
        sys.exit(1) 

    # 导入目的地数据
    log("DATA", "importing destination data...", YELLOW) 
    try: 
        # 执行Python命令导入数据
        subprocess.run( 
            [ 
                sys.executable, "-c", 
                "from app import app,db,import_destinations_from_json; " 
                "app.app_context().push(); db.create_all(); " 
                "print(import_destinations_from_json())", 
            ], 
            cwd=str(ROOT), 
            capture_output=True, 
            text=True, 
            timeout=30, 
        ) 
        # 记录数据导入成功
        log("DATA", "destinations ready OK", GREEN) 
    except Exception as e: 
        # 如果导入失败，记录警告（不阻塞启动）
        log("DATA", f"import skipped ({e})", YELLOW) 

    # 确定要启动的服务顺序
    order = ["backend", "user-web"] 
    # 如果是full模式，添加管理端前端
    if args.profile == "full": 
        order.append("admin-web") 

    # 存储已成功启动的服务列表
    started = [] 
    # 依次启动每个服务
    for name in order: 
        # 获取服务配置
        config = SERVICES[name] 
        # 启动服务
        proc = start_service(name, config) 
        # 如果启动成功，添加到已启动列表
        if proc: 
            started.append(name) 
        elif config.get("optional"): 
            # 如果是可选服务且启动失败，记录跳过
            log(name.upper(), "optional service, skip", YELLOW) 

    # 打印服务状态
    print() 
    print("=" * 46) 
    print("  Service Status") 
    print("=" * 46) 
    # 遍历所有服务，显示状态
    for name in order: 
        config = SERVICES[name] 
        # 获取服务端口
        port = config.get("port") 
        # 确定服务状态
        status = "RUNNING" if name in started else "STOPPED" 
        # 构建服务URL
        url = f"http://localhost:{port}" if port else "-" 
        # 打印服务状态（绿色表示运行中，黄色表示已停止）
        log(name.upper(), f"{status}  {url}", GREEN if name in started else YELLOW) 

    # 打印操作提示
    print() 
    print("-" * 46) 
    print("  Press Ctrl+C to stop all services") 
    print("-" * 46) 
    print() 

    # 自动打开浏览器
    if not args.no_browser: 
        import webbrowser 
        try: 
            # 打开用户端前端页面
            webbrowser.open("http://127.0.0.1:3000") 
        except OSError: 
            # 如果打开失败，静默忽略
            pass 

    # 主循环：监控子进程状态
    try: 
        while not shutdown_event.is_set(): 
            # 检查每个子进程的状态
            for proc in children[:]: 
                # 如果进程已退出
                if proc.poll() is not None: 
                    # 记录进程退出信息
                    log("MAIN", f"child PID {proc.pid} exited (code={proc.returncode})", RED) 
                    # 从列表中移除已退出的进程
                    children.remove(proc) 
            # 如果所有子进程都已退出
            if not children: 
                # 记录日志并退出主循环
                log("MAIN", "all children exited", YELLOW) 
                break 
            # 每秒检查一次
            time.sleep(1) 
    except KeyboardInterrupt: 
        # 捕获Ctrl+C，进入finally块执行清理
        pass 
    finally: 
        # 执行清理操作
        cleanup() 


# 程序入口点
if __name__ == "__main__": 
    # 调用主函数
    main()