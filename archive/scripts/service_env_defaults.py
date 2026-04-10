import os
from typing import Dict


def get_service_env_defaults() -> Dict[str, str]:  # 获取service_env_defaults数据  # 获取service_env_defaults数据  # 获取service_env_defaults数据
    """Centralized default env values for service launchers."""
    return {
        "MYSQL_ROOT_PASSWORD": os.getenv("MYSQL_ROOT_PASSWORD", "change-me-mysql-root"),
        "MYSQL_DATABASE": os.getenv("MYSQL_DATABASE", "travel_assistant"),
        "MYSQL_USER": os.getenv("MYSQL_USER", "travel_user"),
        "MYSQL_PASSWORD": os.getenv("MYSQL_PASSWORD", "change-me-mysql-user"),
        "MONGO_INITDB_ROOT_USERNAME": os.getenv("MONGO_INITDB_ROOT_USERNAME", "admin"),
        "MONGO_INITDB_ROOT_PASSWORD": os.getenv("MONGO_INITDB_ROOT_PASSWORD", "change-me-mongo"),
        "NEO4J_AUTH": os.getenv("NEO4J_AUTH", "neo4j/change-me"),
        "RABBITMQ_DEFAULT_USER": os.getenv("RABBITMQ_DEFAULT_USER", "admin"),
        "RABBITMQ_DEFAULT_PASS": os.getenv("RABBITMQ_DEFAULT_PASS", "change-me-rabbitmq"),
        "DOCKER_INFLUXDB_INIT_PASSWORD": os.getenv("DOCKER_INFLUXDB_INIT_PASSWORD", "change-me-influxdb"),
        "SECRET_KEY": os.getenv("SECRET_KEY", "travel-assistant-dev-secret-change-me"),
        "SQLALCHEMY_DATABASE_URI": os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///travel_optimized.db"),
        "REDIS_URL": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        "AI_API_KEY": os.getenv("AI_API_KEY", ""),
        "PINECONE_API_KEY": os.getenv("PINECONE_API_KEY", ""),
        "PINECONE_ENVIRONMENT": os.getenv("PINECONE_ENVIRONMENT", "production"),
    }
