# -*- coding: utf-8 -*-
"""
Travel Assistant 项目数据服务启动器
统一管理所有数据服务：数据库、缓存、搜索引擎等
"""

import os
import sys
import time
import json
import logging
import subprocess
import threading
import signal
from types import FrameType
from pathlib import Path
from typing import Any, Dict, List, Set, TypedDict, cast
from dataclasses import dataclass
from enum import Enum
from dotenv import load_dotenv
from service_env_defaults import get_service_env_defaults

# 加载环境变量
load_dotenv()

# Windows 下 Docker/控制台常为 GBK；用 replace 避免 decode 线程崩溃刷屏
_SUBPROCESS_TEXT_KW: Dict[str, Any] = {"encoding": "utf-8", "errors": "replace"}

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_services.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    """服务状态枚举"""
    STOPPED = "stopped"      # 已停止
    STARTING = "starting"    # 启动中
    STOPPING = "stopping"    # 停止中
    RUNNING = "running"      # 运行中
    ERROR = "error"          # 错误状态
    RESTARTING = "restarting" # 重启中

@dataclass
class ServiceConfig:
    """服务配置类 - 定义单个服务的配置信息"""
    name: str                    # 服务名称
    command: str                 # 启动命令
    working_dir: str             # 工作目录
    environment: Dict[str, str]  # 环境变量
    depends_on: List[str]        # 依赖的服务列表
    health_check: str            # 健康检查命令
    timeout: int = 30            # 超时时间（秒）
    auto_restart: bool = True    # 是否自动重启
    restart_count: int = 0       # 重启次数计数
    max_restarts: int = 3        # 最大重启次数

class ServiceConfigDict(TypedDict):
    """服务配置字典类型定义"""
    name: str
    command: str
    working_dir: str
    environment: Dict[str, str]
    depends_on: List[str]
    health_check: str
    timeout: int
    auto_restart: bool
    max_restarts: int

class GlobalSettingsDict(TypedDict):
    """全局设置字典类型定义"""
    docker_cleanup: bool              # 是否清理Docker容器
    log_level: str                    # 日志级别
    health_check_interval: int        # 健康检查间隔（秒）
    auto_restart_interval: int        # 自动重启间隔（秒）
    max_concurrent_starts: int        # 最大并发启动数

class AppConfig(TypedDict):
    """应用配置字典类型定义"""
    services: Dict[str, ServiceConfigDict]  # 服务配置
    global_settings: GlobalSettingsDict     # 全局设置

class DataServiceManager:
    """数据服务管理器 - 统一管理所有数据服务的启动、停止、监控"""

    def __init__(self, config_file: str = "data_services_config.json"):
        """初始化数据服务管理器"""
        # 配置文件路径
        self.config_file = config_file
        # 服务配置字典
        self.services: Dict[str, ServiceConfig] = {}
        # 进程字典，存储正在运行的服务进程
        self.processes: Dict[str, subprocess.Popen[str]] = {}
        # 服务状态字典
        self.status: Dict[str, ServiceStatus] = {}
        # 额外应用进程（后端 & 前端）
        self.app_processes: Dict[str, subprocess.Popen[str]] = {}
        # 运行状态标志
        self.running = False
        # 加载配置
        self.config: AppConfig = self.load_config()

        # 信号处理
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        logger.info("🚀 数据服务管理器初始化完成")

    def load_config(self) -> AppConfig:
        """加载配置文件"""
        try:
            # 如果配置文件存在
            if os.path.exists(self.config_file):
                # 打开并读取配置文件
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    raw_config = json.load(f)
                # 标准化配置
                config = self.normalize_config(raw_config)
                logger.info(f"✅ 配置文件加载成功: {self.config_file}")
                return config
            else:
                # 配置文件不存在，记录警告
                logger.warning(f"⚠️ 配置文件不存在: {self.config_file}")
                # 创建默认配置
                return self.create_default_config()
        except Exception as e:
            # 配置文件加载失败，记录错误
            logger.error(f"❌ 配置文件加载失败: {e}")
            # 返回默认配置
            return self.create_default_config()

    def get_default_config(self) -> AppConfig:
        """获取默认配置（仅构造，不写文件）"""
        # 获取服务环境默认值
        env_defaults = get_service_env_defaults()
        mysql_root_password = env_defaults["MYSQL_ROOT_PASSWORD"]
        mysql_database = env_defaults["MYSQL_DATABASE"]
        mysql_user = env_defaults["MYSQL_USER"]
        mysql_password = env_defaults["MYSQL_PASSWORD"]
        mongo_root_username = env_defaults["MONGO_INITDB_ROOT_USERNAME"]
        mongo_root_password = env_defaults["MONGO_INITDB_ROOT_PASSWORD"]
        neo4j_auth = env_defaults["NEO4J_AUTH"]
        rabbitmq_user = env_defaults["RABBITMQ_DEFAULT_USER"]
        rabbitmq_pass = env_defaults["RABBITMQ_DEFAULT_PASS"]
        influxdb_password = env_defaults["DOCKER_INFLUXDB_INIT_PASSWORD"]

        # 返回默认配置
        return {
            "services": {
                "mysql": {
                    "name": "MySQL Database",
                    "command": f"docker run --name mysql -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD={mysql_root_password} -e MYSQL_DATABASE={mysql_database} -e MYSQL_USER={mysql_user} -e MYSQL_PASSWORD={mysql_password} mysql:8.0",
                    "working_dir": ".",
                    "environment": {
                        "MYSQL_ROOT_PASSWORD": mysql_root_password,
                        "MYSQL_DATABASE": mysql_database,
                        "MYSQL_USER": mysql_user,
                        "MYSQL_PASSWORD": mysql_password
                    },
                    "depends_on": [],
                    "health_check": "mysqladmin ping -h localhost",
                    "timeout": 60,
                    "auto_restart": True,
                    "max_restarts": 3
                },
                "redis": {
                    "name": "Redis Cache",
                    "command": "docker run --name redis -d -p 6379:6379 redis:7-alpine redis-server --appendonly yes",
                    "working_dir": ".",
                    "environment": {
                        "REDIS_PASSWORD": "",
                        "REDIS_MAXMEMORY": "512mb",
                        "REDIS_MAXMEMORY_POLICY": "allkeys-lru"
                    },
                    "depends_on": [],
                    "health_check": "redis-cli ping",
                    "timeout": 30,
                    "auto_restart": True,
                    "max_restarts": 3
                },
                "elasticsearch": {
                    "name": "Elasticsearch",
                    "command": "docker run --name elasticsearch -d -p 9200:9200 -p 9300:9300 -e \"discovery.type=single-node\" -e \"ES_JAVA_OPTS=-Xms512m -Xmx512m\" elasticsearch:8.11.0",
                    "working_dir": ".",
                    "environment": {
                        "discovery.type": "single-node",
                        "ES_JAVA_OPTS": "-Xms512m -Xmx512m"
                    },
                    "depends_on": [],
                    "health_check": "curl -f http://localhost:9200/_cluster/health",
                    "timeout": 120,
                    "auto_restart": True,
                    "max_restarts": 2
                },
                "mongodb": {
                    "name": "MongoDB",
                    "command": f"docker run --name mongodb -d -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME={mongo_root_username} -e MONGO_INITDB_ROOT_PASSWORD={mongo_root_password} mongo:7.0",
                    "working_dir": ".",
                    "environment": {
                        "MONGO_INITDB_ROOT_USERNAME": mongo_root_username,
                        "MONGO_INITDB_ROOT_PASSWORD": mongo_root_password
                    },
                    "depends_on": [],
                    "health_check": "mongosh --eval 'db.runCommand(\"ping\").ok'",
                    "timeout": 60,
                    "auto_restart": True,
                    "max_restarts": 3
                },
                "neo4j": {
                    "name": "Neo4j Graph Database",
                    "command": f"docker run --name neo4j -d -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH={neo4j_auth} neo4j:5.15.0",
                    "working_dir": ".",
                    "environment": {
                        "NEO4J_AUTH": neo4j_auth
                    },
                    "depends_on": [],
                    "health_check": "curl -f http://localhost:7474",
                    "timeout": 90,
                    "auto_restart": True,
                    "max_restarts": 2
                },
                "rabbitmq": {
                    "name": "RabbitMQ Message Queue",
                    "command": f"docker run --name rabbitmq -d -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER={rabbitmq_user} -e RABBITMQ_DEFAULT_PASS={rabbitmq_pass} rabbitmq:3.12-management",
                    "working_dir": ".",
                    "environment": {
                        "RABBITMQ_DEFAULT_USER": rabbitmq_user,
                        "RABBITMQ_DEFAULT_PASS": rabbitmq_pass
                    },
                    "depends_on": [],
                    "health_check": "curl -f http://localhost:15672",
                    "timeout": 60,
                    "auto_restart": True,
                    "max_restarts": 3
                },
                "influxdb": {
                    "name": "InfluxDB Time Series",
                    "command": f"docker run --name influxdb -d -p 8086:8086 -e DOCKER_INFLUXDB_INIT_MODE=setup -e DOCKER_INFLUXDB_INIT_USERNAME=admin -e DOCKER_INFLUXDB_INIT_PASSWORD={influxdb_password} -e DOCKER_INFLUXDB_INIT_ORG=travel_assistant -e DOCKER_INFLUXDB_INIT_BUCKET=metrics influxdb:2.7",
                    "working_dir": ".",
                    "environment": {
                        "DOCKER_INFLUXDB_INIT_MODE": "setup",
                        "DOCKER_INFLUXDB_INIT_USERNAME": "admin",
                        "DOCKER_INFLUXDB_INIT_PASSWORD": influxdb_password,
                        "DOCKER_INFLUXDB_INIT_ORG": "travel_assistant",
                        "DOCKER_INFLUXDB_INIT_BUCKET": "metrics"
                    },
                    "depends_on": [],
                    "health_check": "curl -f http://localhost:8086/health",
                    "timeout": 60,
                    "auto_restart": True,
                    "max_restarts": 3
                },
                "grafana": {
                    "name": "Grafana Monitoring",
                    "command": "docker run --name grafana -d -p 3000:3000 -e GF_SECURITY_ADMIN_PASSWORD=admin grafana/grafana:latest",
                    "working_dir": ".",
                    "environment": {
                        "GF_SECURITY_ADMIN_PASSWORD": "admin"
                    },
                    "depends_on": ["prometheus"],
                    "health_check": "curl -f http://localhost:3000",
                    "timeout": 30,
                    "auto_restart": True,
                    "max_restarts": 3
                },
                "prometheus": {
                    "name": "Prometheus Monitoring",
                    "command": "docker run --name prometheus -d -p 9090:9090 -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus:latest",
                    "working_dir": ".",
                    "environment": {},
                    "depends_on": [],
                    "health_check": "curl -f http://localhost:9090/-/healthy",
                    "timeout": 30,
                    "auto_restart": True,
                    "max_restarts": 3
                }
            },
            "global_settings": {
                "docker_cleanup": True,
                "log_level": "INFO",
                "health_check_interval": 30,
                "auto_restart_interval": 300,
                "max_concurrent_starts": 3
            }
        }

    def create_default_config(self) -> AppConfig:
        """创建默认配置并写入文件"""
        # 获取默认配置
        default_config = self.get_default_config()

        # 保存默认配置到文件
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)

        logger.info(f"✅ 创建默认配置文件: {self.config_file}")
        return default_config

    def normalize_config(self, raw_config: Any) -> AppConfig:
        """标准化配置：缺失字段自动补齐，类型异常自动回退默认值"""
        # 获取默认配置
        default_config = self.get_default_config()

        # 如果配置格式错误
        if not isinstance(raw_config, dict):
            logger.warning("⚠️ 配置文件格式错误，已回退为默认配置")
            return default_config

        raw_map = cast(Dict[str, Any], raw_config)

        # 标准化全局设置
        normalized_services: Dict[str, ServiceConfigDict] = {}
        normalized_global: GlobalSettingsDict = cast(GlobalSettingsDict, dict(default_config["global_settings"]))

        raw_global = raw_map.get("global_settings", {})
        if isinstance(raw_global, dict):
            raw_global_map = cast(Dict[str, Any], raw_global)
            # 遍历默认全局设置
            for key, default_val in default_config["global_settings"].items():
                value = raw_global_map.get(key, default_val)
                # 只接受与默认值同类的配置，避免后续运行期类型错误
                normalized_global[key] = value if isinstance(value, type(default_val)) else default_val

        # 标准化服务配置
        raw_services = raw_map.get("services", {})
        if not isinstance(raw_services, dict):
            logger.warning("⚠️ services 配置格式错误，已使用默认 services")
            return default_config

        raw_services_map = cast(Dict[str, Any], raw_services)

        # 遍历默认服务配置
        for service_name, default_service in default_config["services"].items():
            candidate = raw_services_map.get(service_name, {})
            if not isinstance(candidate, dict):
                normalized_services[service_name] = cast(ServiceConfigDict, dict(default_service))
                continue

            candidate_map = cast(Dict[str, Any], candidate)
            merged: Dict[str, Any] = dict(default_service)

            # 合并服务配置
            for key, default_val in default_service.items():
                value = candidate_map.get(key, default_val)
                # 处理环境变量
                if key in ("environment",) and isinstance(value, dict):
                    env_map = cast(Dict[Any, Any], value)
                    merged[key] = {str(k): str(v) for k, v in env_map.items()}
                # 处理依赖列表
                elif key in ("depends_on",) and isinstance(value, list):
                    dep_list = cast(List[Any], value)
                    merged[key] = [str(v) for v in dep_list]
                # 处理数值类型
                elif key in ("timeout", "max_restarts"):
                    try:
                        merged[key] = int(value)
                    except (TypeError, ValueError):
                        merged[key] = default_val
                # 处理布尔类型
                elif key == "auto_restart":
                    merged[key] = bool(value)
                # 处理其他类型
                elif isinstance(value, type(default_val)):
                    merged[key] = value
                else:
                    merged[key] = default_val

            normalized_services[service_name] = cast(ServiceConfigDict, merged)

        # 构建标准化配置
        normalized: AppConfig = {
            "services": normalized_services,
            "global_settings": normalized_global,
        }

        # 把补齐后的配置回写，保持配置文件长期健康
        try:
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(normalized, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"⚠️ 配置标准化后写回失败: {e}")

        return normalized

    def initialize_services(self) -> None:
        """初始化服务配置"""
        services_config = self.config["services"]

        # 遍历服务配置
        for service_name, service_data in services_config.items():
            # 创建服务配置对象
            self.services[service_name] = ServiceConfig(
                name=service_data['name'],
                command=service_data['command'],
                working_dir=service_data['working_dir'],
                environment=service_data.get('environment', {}),
                depends_on=service_data.get('depends_on', []),
                health_check=service_data['health_check'],
                timeout=service_data.get('timeout', 30),
                auto_restart=service_data.get('auto_restart', True),
                max_restarts=service_data.get('max_restarts', 3)
            )
            # 设置服务状态为已停止
            self.status[service_name] = ServiceStatus.STOPPED

        logger.info(f"✅ 初始化 {len(self.services)} 个数据服务")

    def check_dependencies(self, service_name: str) -> bool:
        """检查服务依赖"""
        service = self.services.get(service_name)
        if not service:
            return False

        # 检查所有依赖服务是否都在运行
        for dependency in service.depends_on:
            if self.status.get(dependency) != ServiceStatus.RUNNING:
                logger.warning(f"⚠️ 服务 {service_name} 依赖 {dependency} 未启动")
                return False

        return True

    def start_service(self, service_name: str) -> bool:
        """启动单个服务"""
        # 检查服务是否存在
        if service_name not in self.services:
            logger.error(f"❌ 服务 {service_name} 不存在")
            return False

        service = self.services[service_name]

        # 检查依赖
        if not self.check_dependencies(service_name):
            logger.error(f"❌ 服务 {service_name} 依赖未满足")
            return False

        # 检查是否已运行
        if self.status[service_name] == ServiceStatus.RUNNING:
            logger.info(f"✅ 服务 {service_name} 已在运行")
            return True

        try:
            logger.info(f"🚀 启动服务: {service_name}")
            # 设置服务状态为启动中
            self.status[service_name] = ServiceStatus.STARTING

            # 准备环境变量
            env = os.environ.copy()
            env.update(service.environment)

            # 启动服务进程
            process = subprocess.Popen(
                service.command,
                shell=True,
                cwd=service.working_dir,
                env=env,
                # 避免无人消费 PIPE 导致进程阻塞
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                text=True
            )

            # 保存进程引用
            self.processes[service_name] = process

            # 等待服务启动
            start_time = time.time()
            while time.time() - start_time < service.timeout:
                # 检查服务健康状态
                if self.check_service_health(service_name):
                    # 设置服务状态为运行中
                    self.status[service_name] = ServiceStatus.RUNNING
                    logger.info(f"✅ 服务 {service_name} 启动成功")
                    return True

                # 检查进程是否已退出
                if process.poll() is not None:
                    # 设置服务状态为错误
                    self.status[service_name] = ServiceStatus.ERROR
                    logger.error(f"❌ 服务 {service_name} 启动失败")
                    return False

                time.sleep(1)

            # 启动超时
            self.status[service_name] = ServiceStatus.ERROR
            logger.error(f"❌ 服务 {service_name} 启动超时")
            return False

        except Exception as e:
            # 启动失败
            self.status[service_name] = ServiceStatus.ERROR
            logger.error(f"❌ 启动服务 {service_name} 失败: {e}")
            return False

    def stop_service(self, service_name: str) -> bool:
        """停止单个服务"""
        # 检查服务是否存在
        if service_name not in self.services:
            logger.error(f"❌ 服务 {service_name} 不存在")
            return False

        process = self.processes.get(service_name)
        if not process:
            logger.info(f"✅ 服务 {service_name} 未运行")
            return True

        try:
            logger.info(f"🛑 停止服务: {service_name}")
            # 设置服务状态为停止中
            self.status[service_name] = ServiceStatus.STOPPING

            # 终止进程
            process.terminate()

            # 等待进程结束
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                # 强制终止进程
                process.kill()
                process.wait()

            # 清理
            del self.processes[service_name]
            self.status[service_name] = ServiceStatus.STOPPED

            logger.info(f"✅ 服务 {service_name} 已停止")
            return True

        except Exception as e:
            logger.error(f"❌ 停止服务 {service_name} 失败: {e}")
            return False

    def restart_service(self, service_name: str) -> bool:
        """重启单个服务"""
        logger.info(f"🔄 重启服务: {service_name}")
        # 先停止服务
        self.stop_service(service_name)
        time.sleep(2)
        # 再启动服务
        return self.start_service(service_name)

    def check_service_health(self, service_name: str) -> bool:
        """检查服务健康状态"""
        # 检查服务是否存在
        if service_name not in self.services:
            return False

        service = self.services[service_name]

        try:
            # 执行健康检查命令
            result = subprocess.run(
                service.health_check,
                shell=True,
                capture_output=True,
                text=True,
                timeout=10,
                **_SUBPROCESS_TEXT_KW,
            )

            # 检查命令执行结果
            if result.returncode == 0:
                return True
            else:
                logger.warning(f"⚠️ 服务 {service_name} 健康检查失败: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            logger.warning(f"⚠️ 服务 {service_name} 健康检查超时")
            return False
        except Exception as e:
            logger.warning(f"⚠️ 服务 {service_name} 健康检查异常: {e}")
            return False

    def check_all_services_health(self) -> Dict[str, bool]:
        """检查所有服务健康状态"""
        health_status: Dict[str, bool] = {}

        # 遍历所有服务
        for service_name in self.services:
            # 如果服务正在运行
            if self.status[service_name] == ServiceStatus.RUNNING:
                health_status[service_name] = self.check_service_health(service_name)
            else:
                health_status[service_name] = False

        return health_status

    def start_all_services(self) -> bool:
        """启动所有服务"""
        logger.info("🚀 启动所有数据服务...")

        # 按依赖顺序启动
        service_order = self.get_service_start_order()

        # 遍历服务启动顺序
        for service_name in service_order:
            success = self.start_service(service_name)
            if not success:
                logger.error(f"❌ 启动服务 {service_name} 失败")
                return False

            # 等待服务稳定
            time.sleep(2)

        logger.info("✅ 所有服务启动完成")
        return True

    def stop_all_services(self) -> bool:
        """停止所有服务"""
        logger.info("🛑 停止所有数据服务...")

        # 按依赖逆序停止
        service_order = self.get_service_start_order()
        service_order.reverse()

        # 遍历服务停止顺序
        for service_name in service_order:
            success = self.stop_service(service_name)
            if not success:
                logger.error(f"❌ 停止服务 {service_name} 失败")

        logger.info("✅ 所有服务已停止")
        return True

    # ==================== 应用栈启动/停止 ====================

    def start_application_stack(self) -> None:
        """启动应用栈：后端 API + 前台 + 管理后台"""
        try:
            # 获取项目根目录
            project_root = Path(__file__).resolve().parent

            # 定义应用目标
            targets = {
                "backend": {
                    "cmd": "python app.py",
                    "cwd": project_root,
                },
                "user-web": {
                    "cmd": "npm run dev",
                    "cwd": project_root / "frontend" / "user-web",
                },
                "admin-web": {
                    "cmd": "npm run dev",
                    "cwd": project_root / "frontend" / "admin-web",
                },
            }

            # 遍历应用目标
            for name, cfg in targets.items():
                # 检查应用是否已在运行
                if name in self.app_processes and self.app_processes[name].poll() is None:
                    logger.info(f"✅ 应用 {name} 已在运行，跳过启动")
                    continue

                cmd = cfg["cmd"]
                cwd = str(cfg["cwd"])

                # 检查应用目录是否存在
                if not os.path.isdir(cwd):
                    logger.warning(f"⚠️ 应用目录不存在，跳过 {name}: {cwd}")
                    continue

                logger.info(f"🚀 启动应用 {name}: {cmd} (cwd={cwd})")
                # 启动应用进程
                proc = subprocess.Popen(
                    cmd,
                    shell=True,
                    cwd=cwd,
                    # 开发服务通常输出很多日志，直接继承终端更稳定
                    stdout=None,
                    stderr=None,
                    text=True,
                )
                # 保存进程引用
                self.app_processes[name] = proc

        except Exception as e:
            logger.error(f"❌ 启动应用栈失败: {e}")

    def stop_application_stack(self) -> None:
        """停止应用栈：后端 API + 前台 + 管理后台"""
        # 遍历应用进程
        for name, proc in list(self.app_processes.items()):
            # 检查进程是否正在运行
            if proc.poll() is not None:
                continue

            try:
                logger.info(f"🛑 停止应用 {name} (pid={proc.pid})")
                # 终止进程
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    # 强制终止进程
                    proc.kill()
                    proc.wait()
            except Exception as e:
                logger.error(f"❌ 停止应用 {name} 失败: {e}")

        # 清空应用进程字典
        self.app_processes.clear()

    def get_service_start_order(self) -> List[str]:
        """获取服务启动顺序（按依赖关系排序）"""
        # 拓扑排序
        visited: Set[str] = set()
        temp_visited: Set[str] = set()
        order: List[str] = []

        def visit(service_name: str) -> None:
            # 检查是否存在循环依赖
            if service_name in temp_visited:
                raise ValueError(f"循环依赖检测到: {service_name}")
            # 如果已经访问过
            if service_name in visited:
                return

            # 标记为临时访问
            temp_visited.add(service_name)

            # 递归访问依赖服务
            for dependency in self.services[service_name].depends_on:
                visit(dependency)

            # 移除临时标记
            temp_visited.remove(service_name)
            # 标记为已访问
            visited.add(service_name)
            # 添加到启动顺序
            order.append(service_name)

        # 遍历所有服务
        for service_name in self.services:
            if service_name not in visited:
                visit(service_name)

        return order

    def get_service_status(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务状态"""
        status_info: Dict[str, Dict[str, Any]] = {}

        # 遍历所有服务
        for service_name, service in self.services.items():
            process = self.processes.get(service_name)
            status_info[service_name] = {
                'name': service.name,
                'status': self.status[service_name].value,
                'pid': process.pid if process else None,
                'health': self.check_service_health(service_name) if self.status[service_name] == ServiceStatus.RUNNING else False,
                'restart_count': service.restart_count,
                'max_restarts': service.max_restarts,
                'depends_on': service.depends_on
            }

        return status_info

    def cleanup_docker_containers(self) -> None:
        """清理Docker容器"""
        # 检查是否启用Docker清理
        if not self.config.get('global_settings', {}).get('docker_cleanup', True):
            return

        try:
            logger.info("🧹 清理Docker容器...")

            # 兼容 Windows / Linux：先查询容器 ID，再逐个停止和删除
            result = subprocess.run(
                ["docker", "ps", "-aq"],
                capture_output=True,
                text=True,
                check=False,
                **_SUBPROCESS_TEXT_KW,
            )
            container_ids = [cid.strip() for cid in result.stdout.splitlines() if cid.strip()]
            if not container_ids:
                logger.info("ℹ️ 没有可清理的 Docker 容器")
                return

            # 停止容器
            subprocess.run(
                ["docker", "stop", *container_ids],
                capture_output=True,
                text=True,
                check=False,
                **_SUBPROCESS_TEXT_KW,
            )
            # 删除容器
            subprocess.run(
                ["docker", "rm", *container_ids],
                capture_output=True,
                text=True,
                check=False,
                **_SUBPROCESS_TEXT_KW,
            )

            logger.info("✅ Docker容器清理完成")

        except Exception as e:
            logger.error(f"❌ 清理Docker容器失败: {e}")

    def monitor_services(self) -> None:
        """监控服务状态"""
        logger.info("🔍 开始监控服务状态...")

        # 当运行标志为真时循环
        while self.running:
            try:
                # 检查服务健康状态
                health_status = self.check_all_services_health()

                # 处理不健康的服务
                for service_name, is_healthy in health_status.items():
                    # 如果服务不健康且正在运行
                    if not is_healthy and self.status[service_name] == ServiceStatus.RUNNING:
                        service = self.services[service_name]

                        # 如果启用自动重启且未达到最大重启次数
                        if service.auto_restart and service.restart_count < service.max_restarts:
                            logger.warning(f"⚠️ 服务 {service_name} 不健康，尝试重启...")
                            # 重启服务
                            self.restart_service(service_name)
                            # 增加重启计数
                            service.restart_count += 1
                        else:
                            logger.error(f"❌ 服务 {service_name} 不健康且达到最大重启次数")
                            # 设置服务状态为错误
                            self.status[service_name] = ServiceStatus.ERROR

                # 获取健康检查间隔
                global_settings = self.config["global_settings"]
                interval = global_settings.get("health_check_interval", 30)
                sleep_seconds = int(interval)
                # 等待指定时间
                time.sleep(sleep_seconds)

            except KeyboardInterrupt:
                logger.info("👋 监控被用户中断")
                break
            except Exception as e:
                logger.error(f"❌ 监控异常: {e}")
                time.sleep(10)

    def signal_handler(self, signum: int, frame: FrameType | None) -> None:
        """信号处理器"""
        logger.info(f"📞 收到信号 {signum}，正在关闭...")
        # 设置运行标志为假
        self.running = False
        # 停止所有服务
        self.stop_all_services()
        # 停止应用栈
        self.stop_application_stack()
        # 退出程序
        sys.exit(0)

    def run(self, action: str = "start"):
        """运行服务管理器"""
        # 初始化服务
        self.initialize_services()
        # 检查是否跳过数据服务
        skip_data = os.environ.get("SKIP_DATA_SERVICES", "").lower() in {"1", "true", "yes"}
        # 检查是否跳过应用栈
        skip_app_stack = os.environ.get("SKIP_APPLICATION_STACK", "").lower() in {"1", "true", "yes"}

        if action == "start":
            # 设置运行标志
            self.running = True
            # 启动数据服务（Docker 等）
            if skip_data:
                logger.info("ℹ️ SKIP_DATA_SERVICES=1，已跳过 Docker 数据服务启动")
            else:
                self.start_all_services()
            # 启动应用栈（后端 + 前台 + 管理后台）
            if skip_app_stack:
                logger.info("ℹ️ SKIP_APPLICATION_STACK=1，已跳过应用栈（由 start_all 等脚本启动）")
            else:
                self.start_application_stack()

            # 启动监控线程
            monitor_thread = threading.Thread(target=self.monitor_services, daemon=True)
            monitor_thread.start()

            # 保持主线程运行
            try:
                while self.running:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("👋 用户中断")

        elif action == "stop":
            # 停止所有服务
            self.stop_all_services()
            # 停止应用栈
            self.stop_application_stack()

        elif action == "restart":
            # 重启所有服务
            self.stop_all_services()
            self.stop_application_stack()
            time.sleep(2)
            if not skip_data:
                self.start_all_services()
            if not skip_app_stack:
                self.start_application_stack()

        elif action == "status":
            # 显示服务状态
            status_info = self.get_service_status()
            print(json.dumps(status_info, indent=2, ensure_ascii=False))

        elif action == "cleanup":
            # 清理Docker容器
            self.cleanup_docker_containers()

        elif action == "health":
            # 检查服务健康状态
            health_status = self.check_all_services_health()
            print(json.dumps(health_status, indent=2, ensure_ascii=False))

        else:
            # 未知操作
            logger.error(f"❌ 未知操作: {action}")
            self.print_help()

    def print_help(self):
        """打印帮助信息"""
        print("""
Travel Assistant 数据服务管理器

使用方法:
    python data_services_manager.py <action> [options]

操作:
    start           启动所有服务
    stop            停止所有服务
    restart         重启所有服务
    status          显示服务状态
    health          检查服务健康状态
    cleanup         清理Docker容器
    help            显示帮助信息

示例:
    python data_services_manager.py start
    python data_services_manager.py status
    python data_services_manager.py health

配置文件: data_services_config.json
日志文件: data_services.log
""")

def main():
    """主函数"""
    # 如果未传入参数，默认执行 start，方便一键启动
    if len(sys.argv) < 2:
        action = "start"
        logger.info("ℹ️ 未提供操作参数，默认执行: start")
    else:
        action = sys.argv[1]

    # 创建服务管理器实例
    manager = DataServiceManager()

    try:
        # 运行服务管理器
        manager.run(action)
    except Exception as e:
        logger.error(f"❌ 执行失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()