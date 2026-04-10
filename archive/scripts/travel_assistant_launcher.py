#!/usr/bin/env python3
"""
Travel Assistant 项目统一启动脚本
连接和管理所有数据服务、应用服务和前端服务
"""

import os
import sys
import time
import json
import logging
import subprocess
import threading
import signal
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from dotenv import load_dotenv
from service_env_defaults import get_service_env_defaults

load_dotenv()

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('travel_assistant.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ServiceType(Enum):
    """服务类型枚举"""
    DATA = "data"           # 数据服务
    APPLICATION = "app"     # 应用服务
    FRONTEND = "frontend"   # 前端服务
    MONITORING = "monitoring" # 监控服务

@dataclass  # 装饰器  # 装饰器  # 装饰器
class ServiceInfo:
    """服务信息类"""
    name: str
    type: ServiceType
    command: str
    working_dir: str
    environment: Dict[str, str]
    depends_on: List[str]
    port: int
    url: str
    health_check: str
    timeout: int = 30
    auto_restart: bool = True

class TravelAssistantLauncher:
    """Travel Assistant 统一启动器"""

    def __init__(self, config_file: str = "launcher_config.json"):  # 初始化方法：设置对象初始状态  # 初始化方法：设置对象初始状态  # 初始化方法：设置对象初始状态
        self.config_file = config_file  # 配置参数self.config_file  # 配置参数self.config_file  # 配置参数self.config_file
        self.services: Dict[str, ServiceInfo] = {}  # 字典数据self.services: Dict[str, ServiceInfo]  # 字典数据self.services: Dict[str, ServiceInfo]  # 字典数据self.services: Dict[str, ServiceInfo]
        self.processes: Dict[str, subprocess.Popen] = {}  # 字典数据self.processes: Dict[str, subprocess.Popen]  # 字典数据self.processes: Dict[str, subprocess.Popen]  # 字典数据self.processes: Dict[str, subprocess.Popen]
        self.status: Dict[str, str] = {}  # 状态变量self.status: Dict[str, str]  # 状态变量self.status: Dict[str, str]  # 状态变量self.status: Dict[str, str]
        self.running = False
        self.config = self.load_config()  # 配置参数self.config  # 配置参数self.config  # 配置参数self.config

        # 信号处理
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        logger.info("🚀 Travel Assistant 统一启动器初始化完成")

    def load_config(self) -> Dict:  # 加载config  # 加载config  # 加载config
        """加载配置文件"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:  # 配置参数with open(self.config_file, 'r', encoding  # 配置参数with open(self.config_file, 'r', encoding  # 配置参数with open(self.config_file, 'r', encoding
                    config = json.load(f)  # 配置参数config  # 配置参数config  # 配置参数config
                logger.info(f"✅ 配置文件加载成功: {self.config_file}")
                return config
            else:  # 否则执行  # 否则执行  # 否则执行
                logger.warning(f"⚠️ 配置文件不存在: {self.config_file}")
                return self.create_default_config()
        except Exception as e:
            logger.error(f"❌ 配置文件加载失败: {e}")
            return self.create_default_config()

    def create_default_config(self) -> Dict:  # 创建default_config  # 创建default_config  # 创建default_config
        """创建默认配置"""
        env_defaults = get_service_env_defaults()
        default_config = {  # 配置参数default_config  # 配置参数default_config  # 配置参数default_config
            "services": {
                # 数据服务
                "mysql": {
                    "name": "MySQL Database",
                    "type": "data",
                    "command": f"docker run --name mysql -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD={env_defaults['MYSQL_ROOT_PASSWORD']} -e MYSQL_DATABASE={env_defaults['MYSQL_DATABASE']} -e MYSQL_USER={env_defaults['MYSQL_USER']} -e MYSQL_PASSWORD={env_defaults['MYSQL_PASSWORD']} mysql:8.0",
                    "working_dir": ".",
                    "environment": {
                        "MYSQL_ROOT_PASSWORD": env_defaults["MYSQL_ROOT_PASSWORD"],
                        "MYSQL_DATABASE": env_defaults["MYSQL_DATABASE"],
                        "MYSQL_USER": env_defaults["MYSQL_USER"],
                        "MYSQL_PASSWORD": env_defaults["MYSQL_PASSWORD"]
                    },
                    "depends_on": [],
                    "port": 3306,
                    "url": "http://localhost:3306",
                    "health_check": "mysqladmin ping -h localhost",
                    "timeout": 60,
                    "auto_restart": True
                },
                "redis": {
                    "name": "Redis Cache",
                    "type": "data",
                    "command": "docker run --name redis -d -p 6379:6379 redis:7-alpine redis-server --appendonly yes",
                    "working_dir": ".",
                    "environment": {
                        "REDIS_PASSWORD": "",
                        "REDIS_MAXMEMORY": "512mb",
                        "REDIS_MAXMEMORY_POLICY": "allkeys-lru"
                    },
                    "depends_on": [],
                    "port": 6379,
                    "url": "http://localhost:6379",
                    "health_check": "redis-cli ping",
                    "timeout": 30,
                    "auto_restart": True
                },
                "elasticsearch": {
                    "name": "Elasticsearch",
                    "type": "data",
                    "command": "docker run --name elasticsearch -d -p 9200:9200 -p 9300:9300 -e \"discovery.type=single-node\" -e \"ES_JAVA_OPTS=-Xms512m -Xmx512m\" elasticsearch:8.11.0",
                    "working_dir": ".",
                    "environment": {
                        "discovery.type": "single-node",
                        "ES_JAVA_OPTS": "-Xms512m -Xmx512m"
                    },
                    "depends_on": [],
                    "port": 9200,
                    "url": "http://localhost:9200",
                    "health_check": "curl -f http://localhost:9200/_cluster/health",
                    "timeout": 120,
                    "auto_restart": True
                },
                "mongodb": {
                    "name": "MongoDB",
                    "type": "data",
                    "command": f"docker run --name mongodb -d -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME={env_defaults['MONGO_INITDB_ROOT_USERNAME']} -e MONGO_INITDB_ROOT_PASSWORD={env_defaults['MONGO_INITDB_ROOT_PASSWORD']} mongo:7.0",
                    "working_dir": ".",
                    "environment": {
                        "MONGO_INITDB_ROOT_USERNAME": env_defaults["MONGO_INITDB_ROOT_USERNAME"],
                        "MONGO_INITDB_ROOT_PASSWORD": env_defaults["MONGO_INITDB_ROOT_PASSWORD"]
                    },
                    "depends_on": [],
                    "port": 27017,
                    "url": "http://localhost:27017",
                    "health_check": "mongosh --eval 'db.runCommand(\"ping\").ok'",
                    "timeout": 60,
                    "auto_restart": True
                },
                # 应用服务
                "backend": {
                    "name": "Backend API",
                    "type": "application",
                    "command": "python app_optimized.py",
                    "working_dir": ".",
                    "environment": {
                        "FLASK_ENV": "production",
                        "SECRET_KEY": env_defaults["SECRET_KEY"],
                        "DATABASE_URL": env_defaults["SQLALCHEMY_DATABASE_URI"],
                        "REDIS_URL": env_defaults["REDIS_URL"]
                    },
                    "depends_on": ["mysql", "redis"],
                    "port": 5000,
                    "url": "http://localhost:5000",
                    "health_check": "curl -f http://localhost:5000/api/health",
                    "timeout": 30,
                    "auto_restart": True
                },
                "ai-service": {
                    "name": "AI Service",
                    "type": "application",
                    "command": "cd backend/ai-service && go run main.go",
                    "working_dir": ".",
                    "environment": {
                        "AI_API_KEY": env_defaults["AI_API_KEY"],
                        "PINECONE_API_KEY": env_defaults["PINECONE_API_KEY"],
                        "PINECONE_ENVIRONMENT": env_defaults["PINECONE_ENVIRONMENT"]
                    },
                    "depends_on": ["mysql", "redis"],
                    "port": 8080,
                    "url": "http://localhost:8080",
                    "health_check": "curl -f http://localhost:8080/health",
                    "timeout": 30,
                    "auto_restart": True
                },
                "recommendation-service": {
                    "name": "Recommendation Service",
                    "type": "application",
                    "command": "cd backend/recommend-service && python app.py",
                    "working_dir": ".",
                    "environment": {
                        "REDIS_URL": "redis://localhost:6379/0",
                        "ELASTICSEARCH_URL": "http://localhost:9200"
                    },
                    "depends_on": ["redis", "elasticsearch"],
                    "port": 8081,
                    "url": "http://localhost:8081",
                    "health_check": "curl -f http://localhost:8081/health",
                    "timeout": 30,
                    "auto_restart": True
                },
                # 前端服务
                "frontend": {
                    "name": "Frontend Web",
                    "type": "frontend",
                    "command": "cd frontend/user-web && npm run dev",
                    "working_dir": ".",
                    "environment": {
                        "NEXT_PUBLIC_API_URL": "http://localhost:5000",
                        "NEXT_PUBLIC_REDIS_URL": "http://localhost:6379"
                    },
                    "depends_on": ["backend"],
                    "port": 3000,
                    "url": "http://localhost:3000",
                    "health_check": "curl -f http://localhost:3000",
                    "timeout": 30,
                    "auto_restart": True
                },
                "admin-frontend": {
                    "name": "Admin Frontend",
                    "type": "frontend",
                    "command": "cd frontend/admin-web && npm run dev",
                    "working_dir": ".",
                    "environment": {
                        "NEXT_PUBLIC_API_URL": "http://localhost:5000"
                    },
                    "depends_on": ["backend"],
                    "port": 3001,
                    "url": "http://localhost:3001",
                    "health_check": "curl -f http://localhost:3001",
                    "timeout": 30,
                    "auto_restart": True
                },
                # 监控服务
                "prometheus": {
                    "name": "Prometheus",
                    "type": "monitoring",
                    "command": "docker run --name prometheus -d -p 9090:9090 -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus:latest",
                    "working_dir": ".",
                    "environment": {},
                    "depends_on": [],
                    "port": 9090,
                    "url": "http://localhost:9090",
                    "health_check": "curl -f http://localhost:9090/-/healthy",
                    "timeout": 30,
                    "auto_restart": True
                },
                "grafana": {
                    "name": "Grafana",
                    "type": "monitoring",
                    "command": "docker run --name grafana -d -p 3000:3000 -e GF_SECURITY_ADMIN_PASSWORD=admin grafana/grafana:latest",
                    "working_dir": ".",
                    "environment": {
                        "GF_SECURITY_ADMIN_PASSWORD": "admin"
                    },
                    "depends_on": ["prometheus"],
                    "port": 3002,
                    "url": "http://localhost:3002",
                    "health_check": "curl -f http://localhost:3002",
                    "timeout": 30,
                    "auto_restart": True
                },
                "jaeger": {
                    "name": "Jaeger Tracing",
                    "type": "monitoring",
                    "command": "docker run --name jaeger -d -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one:latest",
                    "working_dir": ".",
                    "environment": {},
                    "depends_on": [],
                    "port": 16686,
                    "url": "http://localhost:16686",
                    "health_check": "curl -f http://localhost:16686",
                    "timeout": 30,
                    "auto_restart": True
                }
            },
            "global_settings": {
                "docker_cleanup": True,
                "log_level": "INFO",
                "health_check_interval": 30,
                "auto_restart_interval": 300,
                "max_concurrent_starts": 3,
                "service_start_order": [
                    "mysql", "redis", "elasticsearch", "mongodb",
                    "prometheus", "jaeger",
                    "backend", "ai-service", "recommendation-service",
                    "grafana",
                    "frontend", "admin-frontend"
                ]
            }
        }

        # 保存默认配置
        with open(self.config_file, 'w', encoding='utf-8') as f:  # 配置参数with open(self.config_file, 'w', encoding  # 配置参数with open(self.config_file, 'w', encoding  # 配置参数with open(self.config_file, 'w', encoding
            json.dump(default_config, f, indent=2, ensure_ascii=False)  # 配置参数json.dump(default_config, f, indent  # 配置参数json.dump(default_config, f, indent  # 配置参数json.dump(default_config, f, indent

        logger.info(f"✅ 创建默认配置文件: {self.config_file}")
        return default_config

    def initialize_services(self):
        """初始化服务配置"""
        services_config = self.config.get('services', {})  # 配置参数services_config  # 配置参数services_config  # 配置参数services_config

        for service_name, service_data in services_config.items():  # 遍历service_name, service_data  # 遍历service_name, service_data  # 遍历service_name, service_data
            self.services[service_name] = ServiceInfo(.services[service_name].services[service_name].services[service_name
                name=service_data['name'],
                type=ServiceType(service_data['type']),  # 类型变量type  # 类型变量type  # 类型变量type
                command=service_data['command'],
                working_dir=service_data['working_dir'],  # 路径配置working_dir  # 路径配置working_dir  # 路径配置working_dir
                environment=service_data.get('environment', {}),
                depends_on=service_data.get('depends_on', []),
                port=service_data['port'],
                url=service_data['url'],
                health_check=service_data['health_check'],
                timeout=service_data.get('timeout', 30),
                auto_restart=service_data.get('auto_restart', True)
            )
            self.status[service_name] = "stopped".status[service_name].status[service_name].status[service_name

        logger.info(f"✅ 初始化 {len(self.services)} 个服务")

    def check_dependencies(self, service_name: str) -> bool:
        """检查服务依赖"""
        service = self.services.get(service_name)
        if not service:
            return False

        for dependency in service.depends_on:  # 遍历dependency  # 遍历dependency  # 遍历dependency
            if self.status.get(dependency) != "running":  # 判断是否不相等  # 判断是否不相等  # 判断是否不相等
                logger.warning(f"⚠️ 服务 {service_name} 依赖 {dependency} 未启动")
                return False

        return True

    def start_service(self, service_name: str) -> bool:
        """启动单个服务"""
        if service_name not in self.services:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            logger.error(f"❌ 服务 {service_name} 不存在")
            return False

        service = self.services[service_name]

        # 检查依赖
        if not self.check_dependencies(service_name):
            logger.error(f"❌ 服务 {service_name} 依赖未满足")
            return False

        # 检查是否已运行
        if self.status[service_name] == "running":
            logger.info(f"✅ 服务 {service_name} 已在运行")
            return True

        try:
            logger.info(f"🚀 启动服务: {service_name} ({service.type.value})")
            self.status[service_name] = "starting".status[service_name].status[service_name].status[service_name

            # 准备环境变量
            env = os.environ.copy()
            env.update(service.environment)

            # 启动服务
            if service.type == ServiceType.DATA:
                # 数据服务使用Docker
                process = subprocess.Popen(
                    service.command,
                    shell=True,
                    cwd=service.working_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
            else:  # 否则执行  # 否则执行  # 否则执行
                # 应用和前端服务直接运行
                process = subprocess.Popen(
                    service.command,
                    shell=True,
                    cwd=service.working_dir,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )

            self.processes[service_name] = process.processes[service_name].processes[service_name].processes[service_name

            # 等待服务启动
            start_time = time.time()
            while time.time() - start_time < service.timeout:  # 当条件满足时循环  # 当条件满足时循环  # 当条件满足时循环
                if self.check_service_health(service_name):
                    self.status[service_name] = "running".status[service_name].status[service_name].status[service_name
                    logger.info(f"✅ 服务 {service_name} 启动成功")
                    return True

                if process.poll() is not None:  # 检查是否不为空  # 检查是否不为空  # 检查是否不为空
                    self.status[service_name] = "error".status[service_name].status[service_name].status[service_name
                    logger.error(f"❌ 服务 {service_name} 启动失败")
                    return False

                time.sleep(1)

            self.status[service_name] = "error".status[service_name].status[service_name].status[service_name
            logger.error(f"❌ 服务 {service_name} 启动超时")
            return False

        except Exception as e:
            self.status[service_name] = "error".status[service_name].status[service_name].status[service_name
            logger.error(f"❌ 启动服务 {service_name} 失败: {e}")
            return False

    def stop_service(self, service_name: str) -> bool:
        """停止单个服务"""
        if service_name not in self.services:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            logger.error(f"❌ 服务 {service_name} 不存在")
            return False

        process = self.processes.get(service_name)
        if not process:
            logger.info(f"✅ 服务 {service_name} 未运行")
            return True

        try:
            logger.info(f"🛑 停止服务: {service_name}")
            self.status[service_name] = "stopping".status[service_name].status[service_name].status[service_name

            # 终止进程
            process.terminate()

            # 等待进程结束
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()

            # 清理
            del self.processes[service_name]
            self.status[service_name] = "stopped".status[service_name].status[service_name].status[service_name

            logger.info(f"✅ 服务 {service_name} 已停止")
            return True

        except Exception as e:
            logger.error(f"❌ 停止服务 {service_name} 失败: {e}")
            return False

    def check_service_health(self, service_name: str) -> bool:
        """检查服务健康状态"""
        if service_name not in self.services:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            return False

        service = self.services[service_name]

        try:
            # 执行健康检查命令
            result = subprocess.run(  # 结果变量result  # 结果变量result  # 结果变量result
                service.health_check,
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return True
            else:  # 否则执行  # 否则执行  # 否则执行
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
        health_status = {}  # 状态变量health_status  # 状态变量health_status  # 状态变量health_status

        for service_name in self.services:  # 遍历service_name  # 遍历service_name  # 遍历service_name
            if self.status[service_name] == "running":
                health_status[service_name] = self.check_service_health(service_name)[service_name][service_name][service_name
            else:  # 否则执行  # 否则执行  # 否则执行
                health_status[service_name] = False[service_name][service_name][service_name

        return health_status

    def start_all_services(self) -> bool:
        """启动所有服务"""
        logger.info("🚀 启动所有服务...")

        # 按配置的顺序启动
        service_order = self.config.get('global_settings', {}).get('service_start_order', [])  # 排序条件service_order  # 排序条件service_order  # 排序条件service_order

        for service_name in service_order:  # 遍历service_name  # 遍历service_name  # 遍历service_name
            if service_name in self.services:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                success = self.start_service(service_name)
                if not success:
                    logger.error(f"❌ 启动服务 {service_name} 失败")
                    return False

                # 等待服务稳定
                time.sleep(3)

        logger.info("✅ 所有服务启动完成")
        return True

    def stop_all_services(self) -> bool:
        """停止所有服务"""
        logger.info("🛑 停止所有服务...")

        # 按依赖逆序停止
        service_order = self.config.get('global_settings', {}).get('service_start_order', [])  # 排序条件service_order  # 排序条件service_order  # 排序条件service_order
        service_order.reverse()

        for service_name in service_order:  # 遍历service_name  # 遍历service_name  # 遍历service_name
            if service_name in self.services:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                success = self.stop_service(service_name)
                if not success:
                    logger.error(f"❌ 停止服务 {service_name} 失败")

        logger.info("✅ 所有服务已停止")
        return True

    def get_service_status(self) -> Dict[str, Dict]:  # 获取service_status数据  # 获取service_status数据  # 获取service_status数据
        """获取所有服务状态"""
        status_info = {}  # 状态变量status_info  # 状态变量status_info  # 状态变量status_info

        for service_name, service in self.services.items():  # 遍历service_name, service  # 遍历service_name, service  # 遍历service_name, service
            status_info[service_name] = {[service_name][service_name][service_name
                'name': service.name,
                'type': service.type.value,
                'status': self.status[service_name],
                'port': service.port,
                'url': service.url,
                'health': self.check_service_health(service_name) if self.status[service_name] == "running" else False,
                'depends_on': service.depends_on
            }

        return status_info

    def cleanup_docker_containers(self):
        """清理Docker容器"""
        if not self.config.get('global_settings', {}).get('docker_cleanup', True):
            return

        try:
            logger.info("🧹 清理Docker容器...")

            # 停止并删除容器
            subprocess.run('docker stop $(docker ps -aq)', shell=True, capture_output=True)
            subprocess.run('docker rm $(docker ps -aq)', shell=True, capture_output=True)

            logger.info("✅ Docker容器清理完成")

        except Exception as e:
            logger.error(f"❌ 清理Docker容器失败: {e}")

    def display_service_info(self):
        """显示服务信息"""
        status_info = self.get_service_status()  # 状态变量status_info  # 状态变量status_info  # 状态变量status_info

        print("\n" + "="*80)
        print("📊 Travel Assistant 服务状态")
        print("="*80)

        for service_name, info in status_info.items():  # 遍历service_name, info  # 遍历service_name, info  # 遍历service_name, info
            status_icon = {  # 状态变量status_icon  # 状态变量status_icon  # 状态变量status_icon
                'running': '🟢',
                'stopped': '🔴',
                'starting': '🟡',
                'stopping': '🟡',
                'error': '❌'
            }.get(info['status'], '⚪')

            health_icon = '✅' if info['health'] else '❌'

            print(f"{status_icon} {info['name']} ({info['type']})")
            print(f"   状态: {info['status']}")
            print(f"   端口: {info['port']}")
            print(f"   地址: {info['url']}")
            print(f"   健康: {health_icon}")
            print(f"   依赖: {', '.join(info['depends_on']) if info['depends_on'] else '无'}")
            print()

        print("="*80)
        print("🌐 访问地址:")
        print("   前端应用: http://localhost:3000")
        print("   管理后台: http://localhost:3001")
        print("   API文档: http://localhost:5000/api/docs")
        print("   监控面板: http://localhost:3002")
        print("   链路追踪: http://localhost:16686")
        print("="*80)

    def signal_handler(self, signum, frame):
        """信号处理器"""
        logger.info(f"📞 收到信号 {signum}，正在关闭...")
        self.running = False
        self.stop_all_services()
        sys.exit(0)

    def run(self, action: str = "start"):
        """运行启动器"""
        self.initialize_services()

        if action == "start":
            self.running = True
            self.start_all_services()
            self.display_service_info()

            # 保持主线程运行
            try:
                while self.running:  # 当条件满足时循环  # 当条件满足时循环  # 当条件满足时循环
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("👋 用户中断")

        elif action == "stop":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            self.stop_all_services()

        elif action == "restart":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            self.stop_all_services()
            time.sleep(2)
            self.start_all_services()
            self.display_service_info()

        elif action == "status":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            self.display_service_info()

        elif action == "health":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            health_status = self.check_all_services_health()  # 状态变量health_status  # 状态变量health_status  # 状态变量health_status
            print(json.dumps(health_status, indent=2, ensure_ascii=False))  # 状态变量print(json.dumps(health_status, indent  # 状态变量print(json.dumps(health_status, indent  # 状态变量print(json.dumps(health_status, indent

        elif action == "cleanup":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            self.cleanup_docker_containers()

        elif action == "config":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            print(json.dumps(self.config, indent=2, ensure_ascii=False))  # 配置参数print(json.dumps(self.config, indent  # 配置参数print(json.dumps(self.config, indent  # 配置参数print(json.dumps(self.config, indent

        else:  # 否则执行  # 否则执行  # 否则执行
            logger.error(f"❌ 未知操作: {action}")
            self.print_help()

    def print_help(self):
        """打印帮助信息"""
        print("""
Travel Assistant 统一启动器

使用方法:
    python travel_assistant_launcher.py <action> [options]

操作:
    start           启动所有服务
    stop            停止所有服务
    restart         重启所有服务
    status          显示服务状态
    health          检查服务健康状态
    cleanup         清理Docker容器
    config          显示配置信息
    help            显示帮助信息

服务类型:
    data           数据服务 (MySQL, Redis, Elasticsearch, MongoDB)
    application    应用服务 (Backend API, AI Service, Recommendation Service)
    frontend       前端服务 (Web应用, 管理后台)
    monitoring     监控服务 (Prometheus, Grafana, Jaeger)

示例:
    python travel_assistant_launcher.py start
    python travel_assistant_launcher.py status
    python travel_assistant_launcher.py health

配置文件: launcher_config.json
日志文件: travel_assistant.log
""")

def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""
    if len(sys.argv) < 2:
        launcher = TravelAssistantLauncher()
        launcher.print_help()
        return

    action = sys.argv[1]
    launcher = TravelAssistantLauncher()

    try:
        launcher.run(action)
    except Exception as e:
        logger.error(f"❌ 执行失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()