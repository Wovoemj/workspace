"""
智能旅游助手 - 性能优化版
包含Redis缓存、API限流、查询优化等性能增强功能
"""
# 导入Flask框架核心模块：Flask应用、JSON响应、请求处理、错误中止
from flask import Flask, jsonify, request, abort, make_response
# 导入Flask-SQLAlchemy数据库ORM扩展
from flask_sqlalchemy import SQLAlchemy
# 导入Flask-CORS跨域资源共享扩展
from flask_cors import CORS
# 导入日期时间处理模块
from datetime import datetime, timedelta
# 导入SQLAlchemy原生SQL执行支持
from sqlalchemy import text
# 导入环境变量加载工具
from dotenv import load_dotenv
# 导入Redis客户端用于缓存操作
import redis
# 导入JSON处理模块
import json
# 导入时间模块用于性能测量
import time
# 导入装饰器辅助工具
from functools import wraps
# 导入类型注解工具
from typing import Any, Callable, TypeVar, cast
# 导入WSGI代理修复中间件（用于反向代理环境）
from werkzeug.middleware.proxy_fix import ProxyFix
# 导入密码哈希工具
from werkzeug.security import generate_password_hash, check_password_hash
# 导入哈希算法模块
import hashlib
# 导入日志模块
import logging
# 导入轮转文件日志处理器
from logging.handlers import RotatingFileHandler
# 导入操作系统接口模块
import os
import math
# 导入JWT令牌生成与验证模块
import jwt

# 加载.env文件中的环境变量
load_dotenv()

# ==================== 日志配置 ====================
# 检查logs目录是否存在
if not os.path.exists('logs'):
    # 如果不存在则创建logs目录
    os.makedirs('logs')

# 定义日志文件路径
log_file = 'logs/travel_assistant.log'
# 创建轮转文件日志处理器，单个文件最大10MB，保留5个备份文件
handler = RotatingFileHandler(log_file, maxBytes=10000000, backupCount=5)
# 设置日志格式：时间 级别 消息
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s %(message)s'
))
# 获取当前模块的日志记录器
logger = logging.getLogger(__name__)
# 设置日志级别为INFO
logger.setLevel(logging.INFO)
# 将处理器添加到日志记录器
logger.addHandler(handler)

# ==================== Redis缓存配置 ====================
# 创建Redis客户端连接实例
redis_client = redis.Redis(
    # 从环境变量获取Redis主机地址，默认localhost
    host=os.getenv('REDIS_HOST', 'localhost'),
    # 从环境变量获取Redis端口，默认6379
    port=int(os.getenv('REDIS_PORT', '6379')),
    # 从环境变量获取Redis数据库编号，默认0
    db=int(os.getenv('REDIS_DB', '0')),
    # 从环境变量获取Redis密码，如果没有则设为None
    password=os.getenv('REDIS_PASSWORD') or None,
    # 启用自动解码响应为字符串
    decode_responses=True,
    # 从环境变量获取Socket连接超时时间，默认5秒
    socket_connect_timeout=int(os.getenv('REDIS_SOCKET_CONNECT_TIMEOUT', '5')),
    # 从环境变量获取Socket操作超时时间，默认5秒
    socket_timeout=int(os.getenv('REDIS_SOCKET_TIMEOUT', '5'))
)

# 从环境变量获取默认缓存过期时间（秒），默认300秒（5分钟）
DEFAULT_CACHE_TIMEOUT = int(os.getenv('CACHE_TTL', '300'))


def redis_cache_get(cache_key: str) -> str | None:
    """从Redis缓存获取值，Redis不可用时返回None"""
    try:
        return cast(str | None, cast(Any, redis_client).get(cache_key))
    except Exception:
        return None


def redis_cache_set(cache_key: str, value: str, timeout: int = DEFAULT_CACHE_TIMEOUT) -> None:
    """设置Redis缓存值并指定过期时间，Redis不可用时静默跳过"""
    try:
        cast(Any, redis_client).setex(cache_key, timeout, value)
    except Exception:
        pass


def redis_cache_delete_pattern(prefix: str) -> None:
    """删除匹配指定前缀的所有缓存键，Redis不可用时静默跳过"""
    try:
        for key in cast(Any, redis_client).scan_iter(f"{prefix}*"):
            cast(Any, redis_client).delete(key)
    except Exception:
        pass

# ==================== API限流配置 ====================
# 定义不同用户等级的请求限制配置
RATE_LIMIT = {
    'normal': 100,    # 普通用户每分钟最多100次请求
    'premium': 500,   # 高级用户每分钟最多500次请求
}

# 定义泛型类型变量F，用于装饰器类型注解
F = TypeVar("F", bound=Callable[..., Any])


def rate_limit(limit_key: str, limit: int = 100) -> Callable[[F], F]:
    """API限流装饰器，限制每个用户每分钟的请求次数。Redis不可用时跳过限流。"""
    def decorator(f: F) -> F:
        @wraps(f)  # 保留原函数的元信息
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            try:
                # 从请求头获取用户ID，如果没有则使用客户端IP地址作为标识
                user_id = request.headers.get('X-User-ID', request.remote_addr)

                # 生成限流键，格式为 rate_limit:接口名:用户ID
                key = f"rate_limit:{limit_key}:{user_id}"

                # 获取当前Unix时间戳（秒）
                current_time = int(time.time())

                # 删除60秒之前的所有请求记录，只保留最近一分钟的请求
                cast(Any, redis_client).zremrangebyscore(key, 0, current_time - 60)

                # 获取当前时间窗口内的请求数量
                current_count = cast(int, cast(Any, redis_client).zcard(key))
                # 如果请求数量达到或超过限制
                if current_count >= limit:
                    # 返回429 Too Many Requests错误响应
                    return jsonify({
                        'success': False,
                        'message': '请求过于频繁，请稍后再试',
                        'code': 'RATE_LIMIT_EXCEEDED'
                    }), 429

                # 将当前请求时间戳添加到有序集合中
                cast(Any, redis_client).zadd(key, {str(current_time): current_time})
                # 设置键的过期时间为60秒
                cast(Any, redis_client).expire(key, 60)
            except Exception:
                # Redis不可用时跳过限流，直接放行
                pass

            # 执行原函数
            return f(*args, **kwargs)
        # 将装饰后的函数转换为正确的类型并返回
        return cast(F, decorated_function)
    # 返回装饰器函数
    return decorator


def cache_response(timeout: int = 300, key_prefix: str = 'default') -> Callable[[F], F]:
    """缓存响应装饰器，自动缓存GET请求的响应"""
    def decorator(f: F) -> F:
        @wraps(f)  # 保留原函数的元信息
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            # 生成缓存键：前缀:请求路径:请求参数的MD5哈希
            cache_key = f"{key_prefix}:{request.path}:{hashlib.md5(str(request.args).encode()).hexdigest()}"

            # 尝试从Redis缓存获取响应
            cached_response = redis_cache_get(cache_key)
            # 如果缓存中存在响应数据
            if cached_response:
                # 记录缓存命中日志
                logger.info(f"Cache hit for {cache_key}")
                # 直接返回缓存的JSON响应
                return jsonify(json.loads(cached_response))

            # 缓存未命中，执行原视图函数获取响应
            response = f(*args, **kwargs)

            # 如果响应状态码为200（成功），则缓存响应内容
            if response.status_code == 200:
                # 将响应内容设置为字符串并缓存
                redis_cache_set(cache_key, response.get_data(as_text=True), timeout=timeout)

            # 返回响应对象
            return response
        # 将装饰后的函数转换为正确的类型并返回
        return cast(F, decorated_function)
    # 返回装饰器函数
    return decorator

# ==================== Flask应用初始化 ====================
# 创建Flask应用实例
app = Flask(__name__)
# 配置WSGI代理修复，支持反向代理环境（如Nginx）
app.wsgi_app = ProxyFix(app.wsgi_app)  # type: ignore[assignment]
# 从环境变量获取或设置Flask密钥键，用于会话加密
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'travel-assistant-dev-secret-change-me')
# 重新导入os模块（冗余导入，可移除）
import os
# 获取当前文件所在的基础目录路径
base_dir = os.path.abspath(os.path.dirname(__file__))
# 配置SQLAlchemy数据库连接URI，默认使用SQLite数据库
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', f'sqlite:///{os.path.join(base_dir, "instance", "travel.db")}')
# 禁用SQLAlchemy的修改追踪功能以节省内存
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# 配置SQLAlchemy数据库连接池参数
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_recycle': 3600,      # 连接回收时间：3600秒（1小时）
    'pool_pre_ping': True,     # 使用连接前进行健康检查
    'pool_size': 20,           # 连接池大小：20个连接
    'max_overflow': 30,        # 最大溢出连接数：额外30个连接
}

# 初始化SQLAlchemy数据库实例
db = SQLAlchemy(app)
# 启用CORS跨域支持
CORS(app)

# ==================== 数据库模型 ====================

class Destination(db.Model):
    """景点数据模型 - 包含性能优化索引"""
    # 指定数据库表名为'destinations'
    __tablename__ = 'destinations'

    # 景点ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 景点名称，必填，最大200字符，添加索引以加速查询
    name = db.Column(db.String(200), nullable=False, index=True)
    # 所在城市，必填，最大100字符，添加索引
    city = db.Column(db.String(100), nullable=False, index=True)
    # 所在省份，必填，最大50字符，添加索引
    province = db.Column(db.String(50), nullable=False, index=True)
    # 景点描述，可选，文本类型
    description = db.Column(db.Text)
    # 封面图片URL，可选，最大500字符
    cover_image = db.Column(db.String(500))
    # 评分，浮点数，默认5.0，添加索引
    rating = db.Column(db.Float, default=5.0, index=True)
    # 门票价格，浮点数，默认0（免费），添加索引
    ticket_price = db.Column(db.Float, default=0, index=True)
    # 开放时间，字符串格式
    open_time = db.Column(db.String(100))
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新，添加索引
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, index=True)

    # 定义复合索引以优化多条件查询
    __table_args__ = (
        # 名称和城市的复合索引，用于按名称和城市搜索
        db.Index('idx_destination_name_city', 'name', 'city'),
        # 评分和价格的复合索引，用于按评分和价格排序筛选
        db.Index('idx_destination_rating_price', 'rating', 'ticket_price'),
    )

    def to_dict(self):
        """将模型对象转换为字典格式，便于JSON序列化"""
        return {
            'id': self.id,
            'name': self.name,
            'city': self.city,
            'province': self.province,
            'description': self.description,
            'cover_image': self.cover_image,
            'rating': self.rating,
            'ticket_price': self.ticket_price,
            'open_time': self.open_time,
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class User(db.Model):
    """用户数据模型"""
    # 用户ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 用户名，唯一，必填，最大80字符，添加索引
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    # 邮箱地址，唯一，最大120字符，添加索引
    email = db.Column(db.String(120), unique=True, index=True)
    # 手机号码，唯一，最大20字符，添加索引
    phone = db.Column(db.String(20), unique=True, index=True)
    # 密码哈希值，存储加密后的密码
    password_hash = db.Column(db.String(255))
    # 是否为管理员，布尔值，默认False
    is_admin = db.Column(db.Boolean, default=False)
    # 用户头像URL，最大500字符
    avatar = db.Column(db.String(500))
    # 会员等级，整数，默认1级，添加索引
    membership_level = db.Column(db.Integer, default=1, index=True)
    # 用户偏好设置，JSON格式存储
    preferences = db.Column(db.JSON)
    # 账户创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 最后登录时间，添加索引
    last_login = db.Column(db.DateTime, index=True)

    def to_dict(self):
        """将用户模型转换为字典格式"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'is_admin': self.is_admin,
            'avatar': self.avatar,
            'membership_level': self.membership_level,
            'preferences': self.preferences,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class Trip(db.Model):
    """行程数据模型"""
    # 行程ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    # 行程标题，必填，最大200字符
    title = db.Column(db.String(200), nullable=False)
    # 行程描述，可选，文本类型
    description = db.Column(db.Text)
    # 行程开始日期，添加索引
    start_date = db.Column(db.Date, index=True)
    # 行程结束日期，添加索引
    end_date = db.Column(db.Date, index=True)
    # 行程状态，字符串，默认'planning'（规划中），添加索引
    status = db.Column(db.String(20), default='planning', index=True)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新，添加索引
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, index=True)

    def to_dict(self):
        """将行程模型转换为字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            # 将date对象转换为ISO格式字符串
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TripItem(db.Model):
    """行程项目数据模型"""
    # 行程项目ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的行程ID，外键引用trip表的id字段，必填，添加索引
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False, index=True)
    # 关联的景点ID，外键引用destinations表的id字段，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), index=True)
    # 第几天的行程，整数，必填，添加索引
    day_number = db.Column(db.Integer, nullable=False, index=True)
    # 项目标题，最大200字符
    title = db.Column(db.String(200))
    # 项目描述，文本类型
    description = db.Column(db.Text)
    # 项目地点，最大200字符
    location = db.Column(db.String(200))
    # 开始时间，time类型
    start_time = db.Column(db.Time)
    # 结束时间，time类型
    end_time = db.Column(db.Time)
    # 排序顺序，整数，默认0，数值越小越靠前
    sort_order = db.Column(db.Integer, default=0)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        """将行程项目模型转换为字典格式"""
        return {
            'id': self.id,
            'trip_id': self.trip_id,
            'destination_id': self.destination_id,
            'day_number': self.day_number,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            # 将time对象转换为ISO格式字符串
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'sort_order': self.sort_order
        }


class UserLike(db.Model):
    """用户点赞数据模型"""
    # 点赞记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    # 关联的景点ID，外键引用destinations表的id字段，必填，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=False, index=True)
    # 点赞时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        """将点赞模型转换为字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'destination_id': self.destination_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Notification(db.Model):
    """通知数据模型"""
    __tablename__ = 'notification'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    type = db.Column(db.String(20), default='system', index=True)  # system, booking, payment, promotion, service
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, index=True)
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'content': self.content,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class UserFootprint(db.Model):
    """用户足迹数据模型"""
    __tablename__ = 'user_footprint'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=False, index=True)
    view_time = db.Column(db.DateTime, default=datetime.now, index=True)
    view_duration = db.Column(db.Integer, default=0)  # 浏览时长（秒）

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'destination_id': self.destination_id,
            'view_time': self.view_time.isoformat() if self.view_time else None,
            'view_duration': self.view_duration
        }


class Product(db.Model):
    """产品数据模型"""
    __tablename__ = 'product'

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False, index=True)  # flight, hotel, ticket, experience
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False, index=True)
    original_price = db.Column(db.Float)
    inventory = db.Column(db.Integer, default=0)
    tags = db.Column(db.JSON)
    status = db.Column(db.String(20), default='active', index=True)  # active, inactive, sold_out, deleted
    images = db.Column(db.JSON)
    location = db.Column(db.JSON)
    rating = db.Column(db.Float, default=0.0, index=True)
    review_count = db.Column(db.Integer, default=0, index=True)
    view_count = db.Column(db.Integer, default=0)
    sales_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'original_price': self.original_price,
            'inventory': self.inventory,
            'tags': self.tags,
            'status': self.status,
            'images': self.images,
            'location': self.location,
            'rating': self.rating,
            'review_count': self.review_count,
            'view_count': self.view_count,
            'sales_count': self.sales_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# ==================== 认证与权限 ====================

def _is_admin_user(user: User) -> bool:
    """判断用户是否具有管理员权限"""
    # 如果用户对象的is_admin属性为True，则直接返回True
    if getattr(user, 'is_admin', False):
        return True
    try:
        # 从环境变量获取管理员所需的最低会员等级，默认为9级
        threshold = int(os.getenv("ADMIN_MEMBERSHIP_LEVEL", "9").strip() or "9")
    except Exception:
        # 如果环境变量解析失败，使用默认阈值9
        threshold = 9
    # 比较用户会员等级是否达到管理员阈值
    return int(user.membership_level or 1) >= threshold


def _issue_jwt(user_id: int) -> str:
    """为用户签发JWT令牌"""
    # 构建JWT payload载荷
    payload = {
        'user_id': user_id,                    # 用户ID作为唯一标识
        'exp': datetime.utcnow() + timedelta(days=7),  # 过期时间：7天后
        'iat': datetime.utcnow(),              # 签发时间：当前时间
    }
    # 使用HS256算法编码JWT令牌，密钥从环境变量获取
    return jwt.encode(payload, os.getenv('SECRET_KEY', 'travel-secret-key-2024'), algorithm='HS256')


def _current_user_or_401():
    """从请求头获取当前登录用户，如果未登录则返回401错误"""
    # 从Authorization请求头获取令牌
    auth = request.headers.get('Authorization', '')
    # 检查Authorization头是否存在且以'Bearer '开头
    if not auth.startswith('Bearer '):
        # 如果格式不正确，返回401未授权错误
        abort(401, description="Missing or invalid Authorization header")
    # 提取Bearer后面的令牌部分（去掉'Bearer '前缀）
    token = auth[7:]
    try:
        # 解码JWT令牌，验证签名和过期时间
        payload = jwt.decode(token, os.getenv('SECRET_KEY', 'travel-secret-key-2024'), algorithms=['HS256'])
        # 从payload中获取用户ID
        user_id = payload.get('user_id')
        # 如果payload中没有用户ID
        if not user_id:
            # 返回401错误
            abort(401, description="Invalid token payload")
        # 根据用户ID从数据库查询用户
        user = User.query.get(user_id)
        # 如果用户不存在
        if not user:
            # 返回401错误
            abort(401, description="User not found")
        # 返回当前用户对象
        return user
    except jwt.ExpiredSignatureError:
        # 如果令牌已过期，返回401错误
        abort(401, description="Token expired")
    except jwt.InvalidTokenError:
        # 如果令牌无效，返回401错误
        abort(401, description="Invalid token")


# ==================== 管理员登录接口 ====================

@app.route('/api/admin/login', methods=['POST'])
def api_admin_login():
    """管理员专属登录接口，支持用户名或邮箱登录"""
    # 获取请求中的JSON数据，如果解析失败则返回空字典
    data = request.get_json(silent=True) or {}
    # 获取并清理用户名字段
    username = (data.get("username") or "").strip()
    # 获取并清理邮箱字段
    email = (data.get("email") or "").strip()
    # 获取密码字段
    password = data.get("password") or ""

    # 优先使用用户名作为标识符，否则使用邮箱
    identifier = username or email
    # 如果标识符为空
    if not identifier:
        # 返回400错误，提示用户名或邮箱必填
        return jsonify({"success": False, "error": "用户名或邮箱为必填"}), 400
    # 如果密码为空
    if not password:
        # 返回400错误，提示密码必填
        return jsonify({"success": False, "error": "密码为必填"}), 400

    # 初始化用户对象为None
    user = None
    # 如果提供了用户名，则按用户名查询用户
    if username:
        user = User.query.filter_by(username=username).first()
    # 如果没有找到用户且提供了邮箱，则按邮箱查询（转小写以忽略大小写）
    if not user and email:
        user = User.query.filter_by(email=email.lower()).first()
    # 如果仍未找到用户
    if not user:
        # 返回404错误，提示用户不存在
        return jsonify({"success": False, "error": "用户不存在"}), 404
    # 如果用户没有设置密码或密码验证失败
    if not user.password_hash or not check_password_hash(user.password_hash, password):
        # 返回401错误，提示密码错误
        return jsonify({"success": False, "error": "密码错误"}), 401
    # 如果用户不具备管理员权限
    if not _is_admin_user(user):
        # 返回403错误，提示无管理员权限
        return jsonify({"success": False, "error": "该账号不具备管理员权限"}), 403

    # 为该用户签发JWT令牌
    token = _issue_jwt(user.id)
    # 返回登录成功响应，包含令牌和用户信息
    return jsonify({"success": True, "token": token, "user": user.to_dict()})


# ==================== 管理员API路由 ====================

@app.route('/api/admin/destinations', methods=['GET'])
@rate_limit('admin_destinations', limit=100)
def admin_get_destinations():
    """管理端获取目的地列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    keyword = request.args.get('keyword', '').strip()
    
    query = Destination.query
    
    # 关键词搜索
    if keyword:
        query = query.filter(
            db.or_(
                Destination.name.contains(keyword),
                Destination.city.contains(keyword),
                Destination.province.contains(keyword)
            )
        )
    
    # 分页
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    destinations = pagination.items
    
    return jsonify({
        'success': True,
        'destinations': [d.to_dict() for d in destinations],
        'total': pagination.total,
        'page': page,
        'per_page': per_page
    })


@app.route('/api/admin/destinations/<int:id>', methods=['PUT'])
@rate_limit('admin_destinations_update', limit=30)
def admin_update_destination(id: int):
    """管理端更新目的地"""
    destination = Destination.query.get_or_404(id)
    data = request.get_json() or {}
    
    # 更新字段
    updatable_fields = ['name', 'city', 'province', 'description', 'rating', 
                       'price', 'open_time', 'images', 'tags']
    for field in updatable_fields:
        if field in data:
            setattr(destination, field, data[field])
    
    db.session.commit()
    
    # 清除缓存
    redis_cache_delete_pattern(f'destinations:*')
    redis_cache_delete_pattern(f'destination:{id}')
    
    return jsonify({'success': True, 'destination': destination.to_dict()})


@app.route('/api/admin/destinations/<int:id>', methods=['DELETE'])
@rate_limit('admin_destinations_delete', limit=20)
def admin_delete_destination(id: int):
    """管理端删除目的地"""
    destination = Destination.query.get_or_404(id)
    
    db.session.delete(destination)
    db.session.commit()
    
    # 清除缓存
    redis_cache_delete_pattern(f'destinations:*')
    redis_cache_delete_pattern(f'destination:{id}')
    
    return jsonify({'success': True, 'message': '删除成功'})


# ==================== 优化的API路由 ====================

@app.route('/api/destinations', methods=['GET'])
@rate_limit('destinations', limit=100)  # 应用限流装饰器，每分钟最多100次请求
@cache_response(timeout=300, key_prefix='destinations')  # 应用缓存装饰器，缓存5分钟
def get_destinations():
    """获取景点列表 - 支持分页、搜索、筛选和排序的优化版本"""
    # 记录查询开始时间用于性能监控
    start_time = time.time()

    # 获取分页参数：页码，默认第1页
    page = request.args.get('page', 1, type=int)
    # 获取每页数量参数，默认20条，最大不超过100条
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    # 获取关键词搜索参数
    keyword = request.args.get('keyword', '').strip()
    # 获取城市筛选参数
    city = request.args.get('city', '').strip()
    # 获取最低评分筛选参数
    min_rating = request.args.get('min_rating', type=float)
    # 获取最高价格筛选参数
    max_price = request.args.get('max_price', type=float)
    # 获取排序字段参数，默认按创建时间排序
    sort_by = request.args.get('sort_by', 'created_at')
    # 获取排序方向参数，默认降序
    order = request.args.get('order', 'desc')

    # 初始化数据库查询对象
    query = Destination.query

    # 如果有关键词，则按名称、描述或城市进行模糊搜索
    if keyword:
        query = query.filter(
            db.or_(
                Destination.name.ilike(f'%{keyword}%'),
                Destination.description.ilike(f'%{keyword}%'),
                Destination.city.ilike(f'%{keyword}%')
            )
        )

    # 如果有城市筛选条件，则按城市进行模糊匹配
    if city:
        query = query.filter(Destination.city.ilike(f'%{city}%'))

    # 如果有最低评分要求，则筛选评分大于等于该值的景点
    if min_rating:
        query = query.filter(Destination.rating >= min_rating)

    # 如果有最高价格限制，则筛选门票价格小于等于该值的景点
    if max_price:
        query = query.filter(Destination.ticket_price <= max_price)

    # 根据sort_by参数选择排序字段
    if sort_by == 'rating':
        sort_column = Destination.rating
    elif sort_by == 'price':
        sort_column = Destination.ticket_price
    elif sort_by == 'name':
        sort_column = Destination.name
    else:
        sort_column = Destination.created_at

    # 根据order参数选择升序或降序排列
    if order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # 执行分页查询
    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False  # 页码超出范围时不返回404错误
    )

    # 计算查询耗时
    query_time = time.time() - start_time
    # 记录查询性能日志
    logger.info(f"景点查询耗时: {query_time:.3f}s, 页码: {page}, 每页: {per_page}")

    # 返回JSON响应，包含景点列表、分页信息和查询耗时
    return jsonify({
        'success': True,
        'destinations': [d.to_dict() for d in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages_count': pagination.pages,
        'query_time': round(query_time, 3),
        'per_page': per_page
    })


@app.route('/api/destinations/<int:id>', methods=['GET'])
@rate_limit('destinations_detail', limit=200)  # 应用限流装饰器，每分钟最多200次请求
@cache_response(timeout=600, key_prefix='destination_detail')  # 应用缓存装饰器，缓存10分钟
def get_destination(id: int):
    """获取单个景点详情 - 优化版本"""
    # 记录查询开始时间
    start_time = time.time()

    # 构建缓存键
    cache_key = f"destination:{id}"
    # 尝试从Redis缓存获取景点详情
    cached_destination = redis_cache_get(cache_key)
    # 如果缓存命中
    if cached_destination:
        # 记录缓存命中日志
        logger.info(f"缓存命中: {cache_key}")
        # 直接返回缓存的景点数据
        return jsonify({'success': True, 'destination': json.loads(cached_destination)})

    # 缓存未命中，从数据库查询景点，如果不存在则返回404
    destination = Destination.query.get_or_404(id)

    # 将景点数据缓存到Redis，设置10分钟过期时间
    redis_cache_set(cache_key, json.dumps(destination.to_dict()), timeout=600)

    # 计算查询耗时
    query_time = time.time() - start_time
    # 记录查询性能日志
    logger.info(f"景点详情查询耗时: {query_time:.3f}s")

    # 返回景点详情JSON响应
    return jsonify({'success': True, 'destination': destination.to_dict()})


@app.route('/api/destinations', methods=['POST'])
@rate_limit('destinations_create', limit=20)  # 应用限流装饰器，每分钟最多20次创建请求
def create_destination():
    """创建新景点 - 优化版本"""
    # 记录操作开始时间
    start_time = time.time()

    # 获取请求体中的JSON数据
    data = request.get_json()

    # 定义必填字段列表
    required_fields = ['name', 'city', 'province']
    # 遍历检查每个必填字段
    for field in required_fields:
        # 如果字段不存在或值为空
        if field not in data or not data[field]:
            # 返回400错误，提示缺少必填字段
            return jsonify({
                'success': False,
                'message': f'缺少必填字段: {field}',
                'code': 'MISSING_REQUIRED_FIELD'
            }), 400

    # 创建新的景点对象
    destination = Destination(
        name=data['name'],
        city=data.get('city', ''),
        province=data.get('province', ''),
        description=data.get('description', ''),
        cover_image=data.get('cover_image', ''),
        rating=float(data.get('rating', 5.0)),
        ticket_price=float(data.get('ticket_price', 0)),
        open_time=data.get('open_time', '')
    )

    # 将新景点添加到数据库会话
    db.session.add(destination)
    # 提交事务，保存到数据库
    db.session.commit()

    # 清除所有相关缓存，确保数据一致性
    redis_cache_delete_pattern('destinations:')
    redis_cache_delete_pattern('destination_detail:')
    redis_cache_delete_pattern('destination:')
    redis_cache_delete_pattern('stats:')

    # 计算操作耗时
    query_time = time.time() - start_time
    # 记录操作性能日志
    logger.info(f"创建景点耗时: {query_time:.3f}s")

    # 返回201 Created响应，包含新创建的景点信息和耗时
    return jsonify({
        'success': True,
        'destination': destination.to_dict(),
        'query_time': round(query_time, 3)
    }), 201


@app.route('/api/trips', methods=['GET'])
@rate_limit('trips', limit=50)  # 应用限流装饰器，每分钟最多50次请求
@cache_response(timeout=180, key_prefix='trips')  # 应用缓存装饰器，缓存3分钟
def get_trips():
    """获取行程列表 - 优化版本"""
    # 记录查询开始时间
    start_time = time.time()

    # 获取用户ID筛选参数
    user_id = request.args.get('user_id', type=int)
    # 获取状态筛选参数
    status = request.args.get('status')

    # 初始化行程查询对象
    query = Trip.query
    # 如果指定了用户ID，则筛选该用户的行程
    if user_id:
        query = query.filter_by(user_id=user_id)
    # 如果指定了状态，则筛选该状态的行程
    if status:
        query = query.filter_by(status=status)

    # 按创建时间降序排列获取所有行程
    trips = query.order_by(Trip.created_at.desc()).all()

    # 计算查询耗时
    query_time = time.time() - start_time
    # 记录查询性能日志
    logger.info(f"行程查询耗时: {query_time:.3f}s")

    # 返回行程列表JSON响应
    return jsonify({
        'success': True,
        'trips': [t.to_dict() for t in trips],
        'query_time': round(query_time, 3)
    })


@app.route('/api/stats', methods=['GET'])
@rate_limit('stats', limit=10)  # 应用限流装饰器，每分钟最多10次请求
@cache_response(timeout=60, key_prefix='stats')  # 应用缓存装饰器，缓存1分钟
def get_stats():
    """获取平台统计信息 - 优化版本"""
    # 记录查询开始时间
    start_time = time.time()

    # 构建统计信息缓存键
    cache_key = 'stats:all'
    # 尝试从Redis缓存获取统计信息
    cached_stats = redis_cache_get(cache_key)
    # 如果缓存命中
    if cached_stats:
        # 记录缓存命中日志
        logger.info(f"统计信息缓存命中: {cache_key}")
        # 直接返回缓存的统计数据
        return jsonify({'success': True, 'stats': json.loads(cached_stats)})

    # 缓存未命中，计算各项统计数据
    stats = {
        'destinations': Destination.query.count(),  # 景点总数
        'users': User.query.count(),                # 用户总数
        'trips': Trip.query.count(),                # 行程总数
        'user_likes': UserLike.query.count(),       # 点赞总数
        # 计算平均评分，保留2位小数
        'avg_rating': round(Destination.query.with_entities(db.func.avg(Destination.rating)).scalar() or 0, 2),
        # 计算总收入（所有景点门票价格总和），保留2位小数
        'total_revenue': round(Destination.query.with_entities(db.func.sum(Destination.ticket_price)).scalar() or 0, 2)
    }

    # 将统计信息缓存到Redis，设置60秒过期时间
    redis_cache_set(cache_key, json.dumps(stats), timeout=60)

    # 计算查询耗时
    query_time = time.time() - start_time
    # 记录查询性能日志
    logger.info(f"统计信息查询耗时: {query_time:.3f}s")

    # 返回统计信息JSON响应
    return jsonify({
        'success': True,
        'stats': stats,
        'query_time': round(query_time, 3)
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口 - 检查数据库、Redis和缓存状态"""
    # 记录检查开始时间
    start_time = time.time()

    # 检查数据库连接状态
    try:
        # 执行简单的SQL查询测试数据库连接
        db.session.execute(text('SELECT 1'))
        # 如果查询成功，数据库状态为healthy
        db_status = 'healthy'
    except Exception as e:
        # 如果查询失败，记录异常信息
        db_status = f'unhealthy: {str(e)}'
        # 记录错误日志
        logger.error(f"数据库健康检查失败: {e}")

    # 检查Redis连接状态
    try:
        # 发送PING命令测试Redis连接
        cast(Any, redis_client).ping()
        # 如果PING成功，Redis状态为healthy
        redis_status = 'healthy'
    except Exception as e:
        # 如果连接失败，记录异常信息
        redis_status = f'unhealthy: {str(e)}'
        # 记录错误日志
        logger.error(f"Redis健康检查失败: {e}")

    # 根据Redis状态确定缓存状态
    cache_status = 'healthy' if redis_status == 'healthy' else 'degraded'

    # 计算检查耗时
    query_time = time.time() - start_time

    # 返回健康检查JSON响应
    return jsonify({
        'success': True,
        # 整体状态：数据库和Redis都健康则为healthy，否则为degraded
        'status': 'healthy' if db_status == 'healthy' and redis_status == 'healthy' else 'degraded',
        'database': db_status,
        'redis': redis_status,
        'cache': cache_status,
        'response_time': round(query_time, 3),
        'timestamp': datetime.now().isoformat()
    })


# ==================== 图片媒体API ====================

@app.route('/api/media', methods=['GET'])
def serve_media():
    """媒体文件服务API - 提供景点图片访问"""
    path = request.args.get('path', '')
    
    if not path.startswith('scenic_images/'):
        return jsonify({'success': False, 'error': '无效的文件路径'}), 400
    
    file_path = os.path.join(os.path.dirname(__file__), path)
    
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        placeholder_path = os.path.join(os.path.dirname(__file__), 'scenic_images', '__auto__', 'placeholder.png')
        if os.path.exists(placeholder_path):
            file_path = placeholder_path
        else:
            return jsonify({'success': False, 'error': '文件不存在'}), 404
    
    ext = os.path.splitext(file_path)[1].lower()
    mime_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
    }
    content_type = mime_types.get(ext, 'application/octet-stream')
    
    from flask import send_file, make_response
    response = make_response(send_file(file_path, mimetype=content_type))
    response.headers['Cache-Control'] = 'public, max-age=86400'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


# ==================== 周边联动API ====================

@app.route('/api/nearby', methods=['GET'])
def get_nearby():
    """获取周边景点API"""
    location = request.args.get('location', '')
    if not location:
        return jsonify({'success': False, 'error': '缺少位置参数'}), 400
    
    try:
        lng, lat = map(float, location.split(','))
    except (ValueError, AttributeError):
        return jsonify({'success': False, 'error': '无效的位置格式'}), 400
    
    radius = float(request.args.get('radius', 5))
    limit = int(request.args.get('limit', 10))
    
    lat_range = radius / 111.0
    lng_range = radius / (111.0 * abs(math.cos(math.radians(lat))) if lat != 0 else 111.0)
    
    nearby_destinations = Destination.query.filter(
        Destination.lat.between(lat - lat_range, lat + lat_range),
        Destination.lng.between(lng - lng_range, lng + lng_range),
        Destination.lng.isnot(None),
        Destination.lat.isnot(None)
    ).limit(limit).all()
    
    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return R * c
    
    items = []
    for dest in nearby_destinations:
        if dest.lng and dest.lat:
            distance = haversine_distance(lat, lng, dest.lat, dest.lng)
            items.append({
                'id': str(dest.id),
                'name': dest.name,
                'description': dest.description or '',
                'address': dest.city,
                'distance': f'{distance:.1f}km',
                'lng': dest.lng,
                'lat': dest.lat,
                'type': '景点',
                'rating': dest.rating
            })
    
    items.sort(key=lambda x: float(x['distance'].replace('km', '')))
    
    return jsonify({
        'success': True,
        'items': items,
        'count': len(items)
    })


# ==================== 初始化函数 ====================

def init_db():
    """初始化数据库 - 创建表结构和示例数据"""
    # 记录初始化开始时间
    start_time = time.time()

    # 在Flask应用上下文中执行数据库操作
    with app.app_context():
        # 创建所有数据库表
        db.create_all()

        # 检查景点表是否已有数据
        if Destination.query.count() > 0:
            # 如果已有数据，记录日志并跳过初始化
            logger.info("✅ 数据库已存在，跳过初始化")
            return

        # 记录开始初始化数据的日志
        logger.info("🌱 初始化基础数据...")

        # 定义系统配置数据列表
        configs = [
            {'key': 'site_name', 'value': '智能旅游助手', 'value_type': 'string', 'category': 'basic', 'is_public': True},
            {'key': 'site_description', 'value': '您的专属智能旅游规划助手', 'value_type': 'string', 'category': 'basic', 'is_public': True},
            {'key': 'contact_email', 'value': 'contact@travel-assistant.com', 'value_type': 'string', 'category': 'contact', 'is_public': True},
            {'key': 'enable_caching', 'value': 'true', 'value_type': 'bool', 'category': 'performance', 'is_public': False},
            {'key': 'cache_timeout', 'value': '300', 'value_type': 'int', 'category': 'performance', 'is_public': False},
        ]

        # 定义示例景点数据列表
        destinations = [
            {
                'name': '北京故宫',
                'city': '北京',
                'province': '北京市',
                'description': '明清两朝的皇宫，现为故宫博物院，是世界上现存规模最大、保存最为完整的木质结构古建筑之一。',
                'cover_image': '/images/forbidden-city.jpg',
                'rating': 4.8,
                'ticket_price': 60.0,
                'open_time': '08:30-17:00'
            },
            {
                'name': '上海外滩',
                'city': '上海',
                'province': '上海市',
                'description': '上海的标志性景观，集古典与现代于一体，是上海的城市名片。',
                'cover_image': '/images/bund.jpg',
                'rating': 4.6,
                'ticket_price': 0.0,
                'open_time': '全天开放'
            },
            {
                'name': '杭州西湖',
                'city': '杭州',
                'province': '浙江省',
                'description': '中国著名的旅游胜地，以其秀丽的湖光山色和众多的名胜古迹闻名中外。',
                'cover_image': '/images/west-lake.jpg',
                'rating': 4.7,
                'ticket_price': 0.0,
                'open_time': '全天开放'
            }
        ]

        # 遍历示例景点数据列表
        for dest_data in destinations:
            # 创建景点对象并添加到数据库会话
            destination = Destination(**dest_data)
            db.session.add(destination)

        # 提交事务，批量保存景点数据到数据库
        db.session.commit()

        # 计算初始化耗时
        init_time = time.time() - start_time
        # 记录初始化完成日志
        logger.info(f"✅ 数据库初始化完成，耗时: {init_time:.3f}s")
        # 记录配置数量日志
        logger.info(f"   - 配置：{len(configs)}")
        # 记录景点数量日志
        logger.info(f"   - 景点：{Destination.query.count()}")
        # 记录用户数量日志
        logger.info(f"   - 用户：{User.query.count()}")
        # 记录行程数量日志
        logger.info(f"   - 行程：{Trip.query.count()}")


# ==================== 产品API ====================

@app.route('/api/products', methods=['GET'])
@rate_limit('products', limit=100)
@cache_response(timeout=300, key_prefix='products')
def get_products():
    """获取产品列表 - 支持分页、筛选、排序"""
    start_time = time.time()

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    product_type = request.args.get('type', '').strip()
    status = request.args.get('status', 'active').strip()
    keyword = request.args.get('keyword', '').strip()
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort', 'desc')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    limit = request.args.get('limit', type=int)

    query = Product.query

    if status:
        query = query.filter_by(status=status)
    if product_type:
        query = query.filter_by(type=product_type)
    if keyword:
        query = query.filter(
            db.or_(
                Product.name.ilike(f'%{keyword}%'),
                Product.description.ilike(f'%{keyword}%')
            )
        )
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    # 排序
    sort_map = {
        'rating': Product.rating,
        'price': Product.price,
        'sales': Product.sales_count,
        'reviews': Product.review_count,
        'created_at': Product.created_at,
    }
    sort_column = sort_map.get(sort_by, Product.created_at)
    if sort_order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # 如果指定了limit参数，直接返回固定条数
    if limit and limit > 0:
        items = query.limit(min(limit, 100)).all()
        return jsonify({
            'success': True,
            'products': [p.to_dict() for p in items],
            'total': len(items),
            'query_time': round(time.time() - start_time, 3)
        })

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'products': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
        'per_page': per_page,
        'query_time': round(time.time() - start_time, 3)
    })


@app.route('/api/products/<int:id>', methods=['GET'])
@rate_limit('products_detail', limit=200)
@cache_response(timeout=600, key_prefix='product_detail')
def get_product(id: int):
    """获取单个产品详情"""
    product = Product.query.get_or_404(id)
    return jsonify({'success': True, 'product': product.to_dict()})


# ==================== 通知API ====================

@app.route('/api/notifications', methods=['GET'])
@rate_limit('notifications', limit=50)
def get_notifications():
    """获取用户通知列表"""
    try:
        # 获取查询参数
        user_id = request.args.get('user_id', type=int)
        is_read = request.args.get('is_read', type=str)
        per_page = request.args.get('per_page', default=20, type=int)
        page = request.args.get('page', default=1, type=int)
        
        if not user_id:
            return jsonify({'error': '缺少用户ID参数'}), 400
        
        # 构建查询
        query = Notification.query.filter_by(user_id=user_id)
        
        # 如果指定了已读状态
        if is_read is not None and is_read in ['true', 'false']:
            query = query.filter_by(is_read=(is_read == 'true'))
        
        # 分页查询
        notifications = query.order_by(Notification.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 构建响应数据
        result = {
            'notifications': [n.to_dict() for n in notifications.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': notifications.total,
                'pages': notifications.pages
            }
        }
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"获取通知列表失败: {str(e)}")
        return jsonify({'error': '获取通知列表失败'}), 500


@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@rate_limit('notifications_read', limit=100)
def mark_notification_read(notification_id):
    """标记通知为已读"""
    try:
        notification = Notification.query.get_or_404(notification_id)
        
        # 更新为已读状态
        notification.is_read = True
        notification.read_at = datetime.now()
        db.session.commit()
        
        return jsonify({'message': '通知已标记为已读'})
    
    except Exception as e:
        logger.error(f"标记通知为已读失败: {str(e)}")
        return jsonify({'error': '操作失败'}), 500


# ==================== 推荐API ====================

@app.route('/api/recommendations', methods=['GET'])
@rate_limit('recommendations', limit=50)
def get_recommendations():
    """获取个性化推荐"""
    try:
        # 获取查询参数
        user_id = request.args.get('user_id', type=int)
        limit = request.args.get('limit', default=8, type=int)
        
        # 如果没有用户ID，返回热门推荐
        if not user_id:
            # 返回热门景点（按评分排序）
            recommendations = Destination.query.filter(
                Destination.rating.isnot(None)
            ).order_by(
                Destination.rating.desc(),
                Destination.id.desc()
            ).limit(limit).all()
            
            result = [d.to_dict() for d in recommendations]
            return jsonify(result)
        
        # 有用户ID时，基于用户行为推荐
        # 1. 获取用户点赞的景点
        user_likes = UserLike.query.filter_by(user_id=user_id).all()
        liked_destinations = [like.destination_id for like in user_likes]
        
        # 2. 获取用户足迹
        user_footprints = UserFootprint.query.filter_by(user_id=user_id).all()
        visited_destinations = [fp.destination_id for fp in user_footprints]
        
        # 3. 推荐逻辑：推荐用户喜欢的景点的相似景点
        if liked_destinations:
            # 获取用户喜欢的景点所在城市
            liked_cities = db.session.query(Destination.city).filter(
                Destination.id.in_(liked_destinations)
            ).distinct().all()
            liked_cities = [city[0] for city in liked_cities]
            
            # 推荐同一城市的热门景点（排除已访问的）
            recommendations = Destination.query.filter(
                Destination.city.in_(liked_cities),
                Destination.id.notin_(visited_destinations + liked_destinations)
            ).order_by(
                Destination.rating.desc(),
                Destination.id.desc()
            ).limit(limit).all()
            
            if recommendations:
                result = [d.to_dict() for d in recommendations]
                return jsonify(result)
        
        # 4. 如果没有基于城市推荐，返回热门景点
        recommendations = Destination.query.filter(
            Destination.rating.isnot(None),
            Destination.id.notin_(visited_destinations)
        ).order_by(
            Destination.rating.desc(),
            Destination.id.desc()
        ).limit(limit).all()
        
        result = [d.to_dict() for d in recommendations]
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"获取推荐失败: {str(e)}")
        return jsonify({'error': '获取推荐失败'}), 500


# ==================== AI助手对话API ====================

def get_ai_service():
    """获取AI服务实例 - 返回None表示未配置"""
    api_key = os.getenv('AI_API_KEY', '')
    if not api_key:
        return None

    class AIService:
        def __init__(self, api_key, base_url, model):
            self.api_key = api_key
            self.base_url = base_url
            self.model = model

        def chat(self, messages):
            import requests as req
            resp = req.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": 2048
                },
                timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            return data['choices'][0]['message']['content']

    return AIService(
        api_key=api_key,
        base_url=os.getenv('AI_BASE_URL', 'https://api.openai.com/v1'),
        model=os.getenv('AI_MODEL', 'gpt-3.5-turbo')
    )


@app.route('/api/agent/chat', methods=['POST', 'OPTIONS'])
@rate_limit('agent_chat', limit=20)
def agent_chat():
    """AI助手对话接口（Agent模式）"""
    # 处理OPTIONS请求
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    try:
        # 获取请求数据
        data = request.get_json()
        if not data or 'messages' not in data:
            return jsonify({'error': '缺少messages参数'}), 400
        
        messages = data['messages']
        
        # 验证消息格式
        if not isinstance(messages, list) or len(messages) == 0:
            return jsonify({'error': 'messages必须是非空数组'}), 400
        
        # 获取AI服务配置
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({'error': 'AI服务配置错误'}), 500
        
        # 调用AI服务进行对话
        response = ai_service.chat(messages)
        
        # 构建响应
        result = {
            'success': True,
            'message': response,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"AI对话失败: {str(e)}")
        return jsonify({'error': 'AI对话服务暂时不可用'}), 500


# ==================== 应用启动入口 ====================
if __name__ == '__main__':
    # 调用数据库初始化函数
    init_db()

    # 从环境变量读取端口，默认5001
    port = int(os.getenv('PORT', 5001))
    
    # 记录服务器启动日志
    logger.info(f"🚀 启动优化版服务器 http://127.0.0.1:{port}")
    # 记录健康检查端点日志
    logger.info(f"📊 性能监控: http://127.0.0.1:{port}/api/health")

    # 启动Flask开发服务器
    app.run(
        debug=True,          # 启用调试模式
        host='0.0.0.0',      # 监听所有网络接口
        port=port,           # 使用环境变量PORT
        threaded=True        # 启用多线程处理请求
    )