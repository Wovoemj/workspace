#!/usr/bin/env python3
"""
Travel Assistant 快速启动脚本
一键启动所有数据服务和应用服务
"""

import os
import sys
import time
import subprocess
import logging
from pathlib import Path
from dotenv import load_dotenv
from service_env_defaults import get_service_env_defaults

load_dotenv()

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class QuickLauncher:
    """快速启动器"""

    def __init__(self):  # 初始化方法：设置对象初始状态  # 初始化方法：设置对象初始状态  # 初始化方法：设置对象初始状态
        env_defaults = get_service_env_defaults()
        self.services = {
            'mysql': {
                'name': 'MySQL Database',
                'command': f"docker run --name mysql -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD={env_defaults['MYSQL_ROOT_PASSWORD']} -e MYSQL_DATABASE={env_defaults['MYSQL_DATABASE']} mysql:8.0",
                'depends_on': [],
                'port': 3306
            },
            'redis': {
                'name': 'Redis Cache',
                'command': 'docker run --name redis -d -p 6379:6379 redis:7-alpine',
                'depends_on': [],
                'port': 6379
            },
            'elasticsearch': {
                'name': 'Elasticsearch',
                'command': 'docker run --name elasticsearch -d -p 9200:9200 -e "discovery.type=single-node" elasticsearch:8.11.0',
                'depends_on': [],
                'port': 9200
            },
            'backend': {
                'name': 'Backend API',
                'command': 'python app_optimized.py',
                'depends_on': ['mysql', 'redis'],
                'port': 5000
            },
            'frontend': {
                'name': 'Frontend Web',
                'command': 'cd frontend/user-web && npm run dev',
                'depends_on': ['backend'],
                'port': 3000
            },
            'monitoring': {
                'name': 'Monitoring',
                'command': 'docker run --name prometheus -d -p 9090:9090 prom/prometheus:latest && docker run --name grafana -d -p 3000:3000 grafana/grafana:latest',
                'depends_on': [],
                'port': 9090
            }
        }

        self.processes = {}

    def cleanup_docker(self):
        """清理Docker容器"""
        logger.info("🧹 清理现有容器...")
        subprocess.run('docker stop $(docker ps -aq) 2>/dev/null', shell=True)
        subprocess.run('docker rm $(docker ps -aq) 2>/dev/null', shell=True)

    def check_service(self, service_name):
        """检查服务状态"""
        service = self.services[service_name]

        # 检查依赖
        for dep in service['depends_on']:  # 遍历dep  # 遍历dep  # 遍历dep
            if dep not in self.processes:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                logger.warning(f"⚠️ 依赖 {dep} 未启动")
                return False

        # 检查端口
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', service['port']))  # 结果变量result  # 结果变量result  # 结果变量result
            sock.close()
            return result == 0
        except:
            return False

    def start_service(self, service_name):
        """启动单个服务"""
        service = self.services[service_name]

        if self.check_service(service_name):
            logger.info(f"✅ {service['name']} 已运行")
            return True

        logger.info(f"🚀 启动 {service['name']}...")

        try:
            # 启动服务
            if 'docker' in service['command']:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                process = subprocess.Popen(
                    service['command'],
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
            else:  # 否则执行  # 否则执行  # 否则执行
                process = subprocess.Popen(
                    service['command'],
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )

            self.processes[service_name] = process.processes[service_name].processes[service_name].processes[service_name

            # 等待服务启动
            for i in range(30):  # 30秒超时  # 按范围循环  # 按范围循环  # 按范围循环
                time.sleep(1)
                if self.check_service(service_name):
                    logger.info(f"✅ {service['name']} 启动成功")
                    return True

            logger.error(f"❌ {service['name']} 启动超时")
            return False

        except Exception as e:
            logger.error(f"❌ 启动 {service['name']} 失败: {e}")
            return False

    def stop_service(self, service_name):
        """停止单个服务"""
        service = self.services[service_name]

        if service_name in self.processes:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            logger.info(f"🛑 停止 {service['name']}...")
            self.processes[service_name].terminate()
            del self.processes[service_name]
            time.sleep(2)
            logger.info(f"✅ {service['name']} 已停止")

    def start_all(self):
        """启动所有服务"""
        logger.info("🚀 启动 Travel Assistant 所有服务...")

        # 启动顺序
        order = ['mysql', 'redis', 'elasticsearch', 'backend', 'frontend', 'monitoring']  # 排序条件order  # 排序条件order  # 排序条件order

        for service_name in order:  # 遍历service_name  # 遍历service_name  # 遍历service_name
            if service_name in self.services:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                self.start_service(service_name)
                time.sleep(3)  # 等待服务稳定

        self.show_status()

    def stop_all(self):
        """停止所有服务"""
        logger.info("🛑 停止所有服务...")

        # 停止顺序（逆序）
        order = ['monitoring', 'frontend', 'backend', 'elasticsearch', 'redis', 'mysql']  # 排序条件order  # 排序条件order  # 排序条件order

        for service_name in order:  # 遍历service_name  # 遍历service_name  # 遍历service_name
            if service_name in self.services:  # 检查是否包含  # 检查是否包含  # 检查是否包含
                self.stop_service(service_name)

        logger.info("✅ 所有服务已停止")

    def show_status(self):
        """显示服务状态"""
        logger.info("\n" + "="*50)
        logger.info("📊 服务状态")
        logger.info("="*50)

        for service_name, service in self.services.items():  # 遍历service_name, service  # 遍历service_name, service  # 遍历service_name, service
            status = "✅ 运行中" if self.check_service(service_name) else "❌ 未运行"  # 状态变量status  # 状态变量status  # 状态变量status
            logger.info(f"{service['name']}: {status} (端口: {service['port']})")

        logger.info("\n🌐 访问地址:")
        logger.info("   前端应用: http://localhost:3000")
        logger.info("   后端API: http://localhost:5000")
        logger.info("   监控面板: http://localhost:3000")
        logger.info("="*50)

    def run(self, action):
        """运行启动器"""
        if action == "start":
            self.cleanup_docker()
            self.start_all()
        elif action == "stop":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            self.stop_all()
        elif action == "restart":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            self.stop_all()
            time.sleep(2)
            self.start_all()
        elif action == "status":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            self.show_status()
        elif action == "help":  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
            self.show_help()
        else:  # 否则执行  # 否则执行  # 否则执行
            logger.error("未知操作")
            self.show_help()

    def show_help(self):
        """显示帮助信息"""
        print("""
Travel Assistant 快速启动脚本

使用方法:
    python quick_launcher.py <action>

操作:
    start   启动所有服务
    stop    停止所有服务
    restart 重启所有服务
    status  显示服务状态
    help    显示帮助信息

示例:
    python quick_launcher.py start
    python quick_launcher.py status
""")

def main():  # 主函数：程序入口点  # 主函数：程序入口点  # 主函数：程序入口点
    """主函数"""
    if len(sys.argv) < 2:
        QuickLauncher().show_help()
        return

    action = sys.argv[1]
    launcher = QuickLauncher()

    try:
        launcher.run(action)
    except KeyboardInterrupt:
        logger.info("👋 用户中断")
        launcher.stop_all()
    except Exception as e:
        logger.error(f"❌ 执行失败: {e}")

if __name__ == "__main__":
    main()