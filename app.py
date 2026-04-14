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

# ==================== Redis缓存配置（Lazy Init） ====================
# Redis 客户端，延迟初始化，首次使用时才创建连接
_redis_client = None

def get_redis():
    """获取 Redis 客户端实例，延迟初始化，连接失败时返回 None"""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    
    try:
        _redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', '6379')),
            db=int(os.getenv('REDIS_DB', '0')),
            password=os.getenv('REDIS_PASSWORD') or None,
            decode_responses=True,
            socket_connect_timeout=int(os.getenv('REDIS_SOCKET_CONNECT_TIMEOUT', '5')),
            socket_timeout=int(os.getenv('REDIS_SOCKET_TIMEOUT', '5'))
        )
        _redis_client.ping()
        logger.info("Redis 连接成功")
    except Exception as e:
        logger.warning(f"Redis 不可用，缓存和限流功能已禁用: {e}")
        _redis_client = None
    return _redis_client

# 兼容旧代码，提供 redis_client 属性访问
class _RedisClientProxy:
    """Redis 客户端代理，支持延迟初始化"""
    def __getattr__(self, name):
        client = get_redis()
        if client is None:
            return lambda *args, **kwargs: None
        return getattr(client, name)

redis_client = _RedisClientProxy()

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
                response = make_response(jsonify(json.loads(cached_response)))
                # 添加 HTTP 缓存头
                response.headers['Cache-Control'] = f'public, max-age={timeout}'
                response.headers['X-Cache'] = 'HIT'
                return response

            # 缓存未命中，执行原视图函数获取响应
            response = f(*args, **kwargs)

            # 如果响应状态码为200（成功），则缓存响应内容
            if response.status_code == 200:
                # 将响应内容设置为字符串并缓存
                redis_cache_set(cache_key, response.get_data(as_text=True), timeout=timeout)
                # 添加 HTTP 缓存头
                response.headers['Cache-Control'] = f'public, max-age={timeout}'
                response.headers['X-Cache'] = 'MISS'

            # 返回响应对象
            return response
        # 将装饰后的函数转换为正确的类型并返回
        return cast(F, decorated_function)
    # 返回装饰器函数
    return decorator


def add_cache_headers(response: Any, max_age: int = 300) -> Any:
    """为响应添加 HTTP 缓存头"""
    if hasattr(response, 'headers'):
        response.headers['Cache-Control'] = f'public, max-age={max_age}'
        response.headers['Expires'] = (datetime.utcnow() + timedelta(seconds=max_age)).strftime('%a, %d %b %Y %H:%M:%S GMT')
    return response


def generate_etag(data: Any) -> str:
    """生成 ETag 用于 HTTP 缓存验证"""
    return hashlib.md5(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()


# ==================== Flask应用初始化 ====================
# 创建Flask应用实例
app = Flask(__name__)

@app.after_request
def add_security_headers(response: Any) -> Any:
    """添加安全相关和性能优化相关的 HTTP 响应头"""
    # 安全相关头部
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # CORS 头部
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    
    return response
# 配置WSGI代理修复，支持反向代理环境（如Nginx）
app.wsgi_app = ProxyFix(app.wsgi_app)  # type: ignore[assignment]


def get_secret_key():
    """获取 JWT 密钥，生产环境必须设置"""
    key = os.getenv('SECRET_KEY')
    if key:
        return key
    if os.getenv('FLASK_ENV') == 'production':
        logger.error("生产环境必须设置 SECRET_KEY 环境变量")
        sys.exit(1)
    import secrets
    key = secrets.token_hex(32)
    logger.warning(f"未设置 SECRET_KEY，使用临时密钥（重启后失效）")
    return key


# 从环境变量获取或设置Flask密钥键，用于会话加密
app.config['SECRET_KEY'] = get_secret_key()
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

# 导入并初始化SQLAlchemy数据库实例
from extensions import db
db.init_app(app)

# 导入数据模型（从 models.py 统一管理）
from models import (
    Destination, User, Trip, TripItem, UserLike, Favorite,
    Notification, UserFootprint, Product, DestinationComment,
    Page, SiteConfig, Menu, Order, OrderItem, ProductQA,
    TravelNote, TravelNoteLike, Coupon, UserCoupon,
    SupportTicket, TicketReply
)
# 构建 CORS 白名单
_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
# 添加 FRONTEND_URL（如果有）
_frontend_url = os.getenv('FRONTEND_URL', '').strip()
if _frontend_url and _frontend_url not in _cors_origins:
    _cors_origins.append(_frontend_url)
# 生产环境从 CORS_ORIGINS 读取（逗号分隔）
if os.getenv('FLASK_ENV') == 'production':
    _cors_env = os.getenv('CORS_ORIGINS', '').strip()
    if _cors_env:
        _cors_origins = [url.strip() for url in _cors_env.split(',') if url.strip()]

# 启用CORS跨域支持
CORS(app, resources={
    r"/api/*": {
        "origins": _cors_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True,
        "expose_headers": ["Content-Length", "X-Request-ID"],
        "max_age": 3600
    }
})


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
    return jwt.encode(payload, get_secret_key(), algorithm='HS256')


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
        payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
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




# ==================== 用户登录接口 ====================

@app.route('/api/users/login', methods=['POST'])
@rate_limit('user_login', limit=20)
def api_user_login():
    """普通用户登录接口"""
    data = request.get_json(silent=True) or {}
    print(f"[DEBUG] login data received: {data}")
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    identifier = email or phone or username
    if not identifier:
        return jsonify({"success": False, "error": "用户名、邮箱或手机号为必填"}), 400
    if not password:
        return jsonify({"success": False, "error": "密码为必填"}), 400

    # 根据用户名、邮箱或手机号查询用户
    user = None
    if username:
        user = User.query.filter_by(username=username).first()
    if not user and email:
        user = User.query.filter_by(email=email).first()
    if not user and phone:
        user = User.query.filter_by(phone=phone).first()

    if not user:
        return jsonify({"success": False, "error": "用户不存在"}), 404
    if not check_password_hash(user.password_hash, password):
        return jsonify({"success": False, "error": "密码错误"}), 401

    try:
        # 更新最后登录时间
        from datetime import datetime
        user.last_login = datetime.now()
        db.session.commit()
        
        token = _issue_jwt(user.id)
        user_dict = user.to_dict()
        return jsonify({"success": True, "token": token, "user": user_dict})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"登录处理错误: {str(e)}"}), 500






# ==================== 用户注册接口 ====================

@app.route('/api/users/check', methods=['POST'])
def api_user_check():
    """检查用户名/邮箱/手机号是否已存在"""
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()

    result = {}
    if username:
        exists = User.query.filter_by(username=username).first() is not None
        result["username"] = exists

    if email:
        exists = User.query.filter_by(email=email).first() is not None
        result["email"] = exists

    if phone:
        exists = User.query.filter_by(phone=phone).first() is not None
        result["phone"] = exists

    return jsonify({"success": True, "exists": result})


@app.route('/api/users/me', methods=['GET'])
@rate_limit('user_me', limit=60)
def get_current_user():
    """获取当前用户信息"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        return jsonify({'success': True, 'user': user.to_dict()})
        
    except Exception as e:
        logger.error(f"获取用户信息失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# 积分相关 API
def get_level_info(points):
    """根据积分获取等级信息"""
    if points >= 20000:
        return {'level': 4, 'name': '铂金会员', 'icon': '💎', 'next_level': None, 'next_points': None}
    elif points >= 5000:
        return {'level': 3, 'name': '黄金会员', 'icon': '🌟', 'next_level': 4, 'next_points': 20000}
    elif points >= 1000:
        return {'level': 2, 'name': '白银会员', 'icon': '⭐', 'next_level': 3, 'next_points': 5000}
    else:
        return {'level': 1, 'name': '普通会员', 'icon': '🎯', 'next_level': 2, 'next_points': 1000}


@app.route('/api/users/me/points', methods=['GET'])
@rate_limit('user_points', limit=30)
def get_user_points():
    """获取当前用户积分和等级信息"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        points = user.points or 0
        level_info = get_level_info(points)
        
        # 计算距离下一级还需要多少积分
        progress = 0
        if level_info['next_points']:
            prev_points = {'铂金': 5000, '黄金': 1000, '白银': 0}
            prev = prev_points.get(level_info['name'].replace('会员', ''), 0)
            progress = int((points - prev) / (level_info['next_points'] - prev) * 100)
        
        return jsonify({
            'success': True,
            'points': points,
            'level': level_info['level'],
            'level_name': level_info['name'],
            'level_icon': level_info['icon'],
            'next_level': level_info.get('next_level'),
            'next_level_name': {3: '黄金会员', 4: '铂金会员'}.get(level_info.get('next_level', 0), ''),
            'next_points': level_info.get('next_points'),
            'progress': progress
        })
        
    except Exception as e:
        logger.error(f"获取积分信息失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/users/me/points/history', methods=['GET'])
@rate_limit('points_history', limit=30)
def get_points_history():
    """获取积分变动记录"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        # 简化版：返回模拟数据（实际需要 PointsHistory 模型）
        return jsonify({
            'success': True,
            'history': [
                {'type': 'register', 'points': 100, 'desc': '新用户注册奖励', 'created_at': datetime.now().isoformat()},
            ]
        })
        
    except Exception as e:
        logger.error(f"获取积分记录失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# 邀请有礼 API
def generate_invite_code():
    """生成唯一邀请码"""
    import random
    import string
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not User.query.filter_by(invite_code=code).first():
            return code


@app.route('/api/users/invite', methods=['GET'])
@rate_limit('user_invite', limit=20)
def get_invite_info():
    """获取我的邀请码和邀请链接"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        # 如果没有邀请码，生成一个
        if not user.invite_code:
            user.invite_code = generate_invite_code()
            db.session.commit()
        
        invite_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/register?invite_code={user.invite_code}"
        
        # 统计邀请人数
        invited_count = User.query.filter_by(invited_by=user_id).count()
        
        return jsonify({
            'success': True,
            'invite_code': user.invite_code,
            'invite_link': invite_link,
            'invited_count': invited_count,
            'reward_points': 50  # 邀请奖励积分
        })
        
    except Exception as e:
        logger.error(f"获取邀请信息失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/users/invite/stats', methods=['GET'])
@rate_limit('invite_stats', limit=20)
def get_invite_stats():
    """获取邀请统计"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        # 统计被邀请的用户
        invited_users = User.query.filter_by(invited_by=user_id).all()
        
        return jsonify({
            'success': True,
            'total_invited': len(invited_users),
            'total_reward_points': len(invited_users) * 50,
            'invited_users': [
                {
                    'id': u.id,
                    'username': u.username,
                    'nickname': u.nickname,
                    'created_at': u.created_at.isoformat() if u.created_at else None
                }
                for u in invited_users[:10]  # 只返回前10个
            ]
        })
        
    except Exception as e:
        logger.error(f"获取邀请统计失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/users/me', methods=['PUT'])
@rate_limit('user_update', limit=20)
def update_current_user():
    """更新当前用户信息"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        data = request.get_json() or {}
        
        if 'nickname' in data:
            user.nickname = data['nickname']
        if 'avatar' in data:
            user.avatar = data['avatar']
        if 'preferences' in data:
            user.preferences = data['preferences']
        
        db.session.commit()
        
        return jsonify({'success': True, 'user': user.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"更新用户信息失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/users/register', methods=['POST'])
@rate_limit('user_register', limit=10)
def api_user_register():
    """普通用户注册接口"""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    nickname = (data.get("nickname") or "").strip()
    username = (data.get("username") or "").strip()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if not email:
        return jsonify({"success": False, "error": "邮箱为必填"}), 400
    import re
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({"success": False, "error": "邮箱格式不正确"}), 400
    if not nickname:
        return jsonify({"success": False, "error": "昵称为必填"}), 400
    if not username:
        return jsonify({"success": False, "error": "用户名为必填"}), 400
    if not password or len(password) < 8:
        return jsonify({"success": False, "error": "密码至少8位，需包含大小写字母和数字"}), 400

    # 检查邮箱是否已存在
    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "error": "该邮箱已注册"}), 409

    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "error": "该用户名已被注册"}), 409

    # 检查手机号是否已存在（如果提供了手机号）
    if phone and User.query.filter_by(phone=phone).first():
        return jsonify({"success": False, "error": "该手机号已被注册"}), 409

    try:
        # 检查邀请码（如果有提供）
        invite_code = (data.get("invite_code") or "").strip().upper()
        inviter = None
        if invite_code:
            inviter = User.query.filter_by(invite_code=invite_code).first()
        
        # 创建新用户
        user = User(
            email=email,
            username=username,
            nickname=nickname,
            phone=phone or None,
            password_hash=generate_password_hash(password),
            membership_level=1,
            points=100,  # 新用户注册奖励100积分
            invited_by=inviter.id if inviter else None,
            invite_code=generate_invite_code()  # 生成自己的邀请码
        )
        db.session.add(user)
        
        # 如果有邀请人，给邀请人奖励积分
        if inviter:
            inviter.points = (inviter.points or 0) + 50  # 邀请奖励50积分
        
        db.session.commit()

        token = _issue_jwt(user.id)
        return jsonify({"success": True, "token": token, "user": user.to_dict()})
    except AttributeError as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "用户字段错误，请稍后重试"}), 500
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        # 处理唯一约束冲突
        if "UNIQUE constraint failed" in str(e):
            if "user.username" in str(e):
                return jsonify({"success": False, "error": "该用户名已被注册"}), 409
            elif "user.email" in str(e):
                return jsonify({"success": False, "error": "该邮箱已注册"}), 409
            elif "user.phone" in str(e):
                return jsonify({"success": False, "error": "该手机号已被注册"}), 409
        return jsonify({"success": False, "error": "注册失败，请稍后重试"}), 500


# ==================== 管理员API路由 ====================

@app.route('/api/admin/destinations', methods=['GET'])
@rate_limit('admin_destinations', limit=100)
def admin_get_destinations():
    """管理端获取目的地列表"""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
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
    """获取景点列表 - 支持分页、搜索、筛选和排序的优化版本（已针对大表优化）"""
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
    # 获取省份筛选参数
    province = request.args.get('province', '').strip()
    # 获取最低评分筛选参数
    min_rating = request.args.get('min_rating', type=float)
    # 获取最高价格筛选参数
    max_price = request.args.get('max_price', type=float)
    # 获取排序字段参数，默认按创建时间排序
    sort_by = request.args.get('sort_by', 'created_at')
    # 获取排序方向参数，默认降序
    order = request.args.get('order', 'desc')
    # 获取是否只需要轻量级字段（用于首页卡片展示）
    light = request.args.get('light', 'false').lower() == 'true'

    # 初始化数据库查询对象 - 使用优化的查询方式
    query = Destination.query
    
    # 优化：限制查询的字段，减少数据传输
    if light:
        from sqlalchemy.orm import load_only
        query = query.options(load_only(
            Destination.id, Destination.name, Destination.city, 
            Destination.province, Destination.cover_image, Destination.rating
        ))

    # 如果有关键词，则按名称、描述或城市进行模糊搜索
    if keyword:
        query = query.filter(
            db.or_(
                Destination.name.ilike(f'%{keyword}%'),
                Destination.description.ilike(f'%{keyword}%'),
                Destination.city.ilike(f'%{keyword}%'),
                Destination.province.ilike(f'%{keyword}%')
            )
        )

    # 如果有城市筛选条件，则按城市进行模糊匹配
    if city:
        query = query.filter(Destination.city.ilike(f'%{city}%'))
    
    # 如果有省份筛选条件，则按省份进行模糊匹配
    if province:
        query = query.filter(Destination.province.ilike(f'%{province}%'))

    # 如果有最低评分要求，则筛选评分大于等于该值的景点
    if min_rating:
        query = query.filter(Destination.rating >= min_rating)

    # 如果有最高价格限制，则筛选门票价格小于等于该值的景点
    if max_price:
        query = query.filter(Destination.ticket_price <= max_price)

    # 热门城市列表（按热门程度排序）
    popular_cities = [
        '北京市', '上海市', '杭州市', '成都市', '广州市', '深圳市',
        '南京市', '武汉市', '西安市', '重庆市', '苏州市', '长沙市',
        '天津市', '郑州市', '青岛市', '沈阳市', '大连市', '厦门市',
        '济南市', '哈尔滨市', '长春市', '福州市', '合肥市', '昆明市'
    ]

    # 根据sort_by参数选择排序字段
    if sort_by == 'rating':
        sort_column = Destination.rating
    elif sort_by == 'price':
        sort_column = Destination.ticket_price
    elif sort_by == 'name':
        sort_column = Destination.name
    elif sort_by == 'popular':
        # 综合排序：优先热门城市，然后按评分和价格排序
        # 使用 CASE WHEN 为热门城市赋予较高优先级
        city_priority = db.case(
            *[(Destination.city == city, len(popular_cities) - i) for i, city in enumerate(popular_cities)],
            else_=0
        )
        query = query.order_by(city_priority.desc(), Destination.rating.desc().nullslast(), Destination.ticket_price.asc().nullslast())
    else:
        sort_column = Destination.created_at
        query = query.order_by(sort_column.desc().nullslast())

    # 根据order参数选择升序或降序排列（仅对非 popular 排序生效）
    if order == 'desc' and sort_by != 'popular':
        query = query.order_by(sort_column.desc().nullslast())
    elif sort_by != 'popular':
        query = query.order_by(sort_column.asc().nullslast())

    # 执行分页查询
    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False  # 页码超出范围时不返回404错误
    )

    # 计算查询耗时
    query_time = time.time() - start_time
    # 记录查询性能日志
    logger.info(f"景点查询耗时: {query_time:.3f}s, 页码: {page}, 每页: {per_page}, 轻量模式: {light}")

    # 返回JSON响应，包含景点列表、分页信息和查询耗时
    return jsonify({
        'success': True,
        'destinations': [d.to_dict() for d in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages_count': pagination.pages,
        'query_time': round(query_time, 3),
        'per_page': per_page,
        'light_mode': light
    })


@app.route('/api/destinations/metadata', methods=['GET'])
@rate_limit('destinations_metadata', limit=60)
@cache_response(timeout=3600, key_prefix='destinations_metadata')  # 缓存1小时
def get_destinations_metadata():
    """获取景点元数据聚合信息（用于筛选条件展示）"""
    start_time = time.time()
    
    try:
        # 获取所有城市列表（带数量统计）
        city_stats = db.session.query(
            Destination.city,
            db.func.count(Destination.id).label('count')
        ).filter(Destination.city.isnot(None), Destination.city != '')\
         .group_by(Destination.city)\
         .order_by(db.desc('count'))\
         .limit(100).all()
        
        # 获取所有省份列表
        province_stats = db.session.query(
            Destination.province,
            db.func.count(Destination.id).label('count')
        ).filter(Destination.province.isnot(None), Destination.province != '')\
         .group_by(Destination.province)\
         .order_by(db.desc('count'))\
         .limit(50).all()
        
        # 获取评分分布
        rating_stats = db.session.query(
            db.func.round(Destination.rating, 1).label('rating'),
            db.func.count(Destination.id).label('count')
        ).filter(Destination.rating.isnot(None))\
         .group_by(db.func.round(Destination.rating, 1))\
         .order_by(db.desc('rating'))\
         .limit(10).all()
        
        # 获取价格分布
        price_ranges = db.session.query(
            db.case(
                (Destination.ticket_price == 0, 'free'),
                (Destination.ticket_price < 50, '0-50'),
                (Destination.ticket_price < 100, '50-100'),
                (Destination.ticket_price < 200, '100-200'),
                (Destination.ticket_price < 500, '200-500'),
                else_='500+',
            ).label('range'),
            db.func.count(Destination.id).label('count')
        ).filter(Destination.ticket_price.isnot(None))\
         .group_by('range')\
         .all()
        
        query_time = time.time() - start_time
        logger.info(f"景点元数据查询耗时: {query_time:.3f}s")
        
        return jsonify({
            'success': True,
            'metadata': {
                'cities': [{'name': c, 'count': n} for c, n in city_stats],
                'provinces': [{'name': p, 'count': n} for p, n in province_stats],
                'ratings': [{'rating': float(r) if r else 0, 'count': n} for r, n in rating_stats],
                'price_ranges': [{'range': r, 'count': n} for r, n in price_ranges],
                'total_destinations': Destination.query.count()
            },
            'query_time': round(query_time, 3)
        })
    except Exception as e:
        logger.error(f"获取景点元数据失败: {e}")
        return jsonify({
            'success': False,
            'error': '获取元数据失败',
            'message': str(e)
        }), 500


def generate_destination_recommendations(destination):
    """
    根据景点信息动态生成推荐数据（时间轴、必看清单、实用锦囊）
    """
    name = destination.name
    city = destination.city
    province = destination.province
    description = destination.description or ''
    ticket_price = destination.ticket_price or 0
    
    # 判断景点类型
    is_museum = any(kw in name.lower() or kw in description.lower() 
                    for kw in ['博物馆', '博物院', '纪念馆', '展览馆', '美术馆'])
    is_nature = any(kw in name.lower() or kw in description.lower() 
                    for kw in ['山', '湖', '海', '公园', '森林', '峡谷', '瀑布', '湿地'])
    is_temple = any(kw in name.lower() or kw in description.lower() 
                     for kw in ['寺', '庙', '观', '庵', '教堂', '清真寺'])
    is_palace = any(kw in name.lower() or kw in description.lower() 
                     for kw in ['故宫', '宫', '殿', '府', '王府'])
    is_great_wall = '长城' in name
    
    # 生成必看清单
    if is_museum:
        highlights = [
            {'id': 1, 'title': '镇馆之宝', 'description': f'{name}最珍贵的藏品，不可错过', 'icon': 'crown'},
            {'id': 2, 'title': '常设展厅', 'description': f'系统了解{province}{city}的历史文化', 'icon': 'history'},
            {'id': 3, 'title': '特展', 'description': '当期特别展览，主题精选', 'icon': 'star'},
            {'id': 4, 'title': '互动体验区', 'description': '适合亲子参与的互动项目', 'icon': 'gem'},
        ]
    elif is_nature:
        highlights = [
            {'id': 1, 'title': '主峰/最佳观景点', 'description': '登高望远， panoramic view', 'icon': 'crown'},
            {'id': 2, 'title': '特色景观', 'description': f'{name}最具代表性的自然奇观', 'icon': 'gem'},
            {'id': 3, 'title': '休闲步道', 'description': '适合漫步的林间小道', 'icon': 'tree'},
            {'id': 4, 'title': '拍照打卡点', 'description': '最佳摄影位置推荐', 'icon': 'star'},
        ]
    elif is_great_wall:
        highlights = [
            {'id': 1, 'title': '烽火台', 'description': '保存完好的古代军事设施', 'icon': 'crown'},
            {'id': 2, 'title': '好汉坡', 'description': '不到长城非好汉', 'icon': 'star'},
            {'id': 3, 'title': '关城', 'description': '雄伟壮观的关隘建筑', 'icon': 'history'},
            {'id': 4, 'title': '夕阳景观', 'description': '最佳日落观赏点', 'icon': 'gem'},
        ]
    elif is_temple:
        highlights = [
            {'id': 1, 'title': '主殿', 'description': '核心建筑，供奉主神', 'icon': 'crown'},
            {'id': 2, 'title': '古树/古物', 'description': '千年古树或历史文物', 'icon': 'tree'},
            {'id': 3, 'title': '祈福区', 'description': '香火最旺的祈福地点', 'icon': 'star'},
            {'id': 4, 'title': '素斋', 'description': '特色素食餐饮体验', 'icon': 'gem'},
        ]
    elif is_palace:
        highlights = [
            {'id': 1, 'title': '正殿/大堂', 'description': '核心建筑，气势恢宏', 'icon': 'crown'},
            {'id': 2, 'title': '御花园', 'description': '皇家园林景观', 'icon': 'tree'},
            {'id': 3, 'title': '珍宝馆', 'description': '珍贵文物收藏展示', 'icon': 'gem'},
            {'id': 4, 'title': '历史展厅', 'description': '了解建筑背后的历史故事', 'icon': 'history'},
        ]
    else:
        highlights = [
            {'id': 1, 'title': '核心景点', 'description': f'{name}最具代表性的景观', 'icon': 'crown'},
            {'id': 2, 'title': '特色体验', 'description': f'{city}特色活动体验', 'icon': 'star'},
            {'id': 3, 'title': '文化遗迹', 'description': '历史文化遗存', 'icon': 'history'},
            {'id': 4, 'title': '周边美食', 'description': f'{city}特色小吃推荐', 'icon': 'gem'},
        ]
    
    # 生成时间轴
    if is_museum:
        timeline = [
            {'id': 1, 'timeLabel': '上午', 'title': '常设展厅参观', 'description': f'建议路线：从1楼到3楼，重点了解{province}{city}的历史文化', 'tags': ['2小时', '室内', '推荐']},
            {'id': 2, 'timeLabel': '中午', 'title': f'{city}特色午餐', 'description': f'品尝{province}地道美食，人均约30-50元', 'tags': ['1小时', '餐饮', '特色']},
            {'id': 3, 'timeLabel': '下午', 'title': '专题展览深度游', 'description': '根据当天开放的特展，深入了解感兴趣的专题', 'tags': ['2小时', '室内', '讲解']},
            {'id': 4, 'timeLabel': '晚上', 'title': '文创购物', 'description': '选购特色纪念品，支持文化传播', 'tags': ['30分钟', '购物', '纪念']},
        ]
    elif is_nature:
        timeline = [
            {'id': 1, 'timeLabel': '上午', 'title': '登山/入园', 'description': '趁着天气凉爽，开始登山或游览', 'tags': ['2小时', '户外', '运动']},
            {'id': 2, 'timeLabel': '中午', 'title': '山顶/景区午餐', 'description': '自带干粮或在景区餐厅用餐', 'tags': ['1小时', '简餐', '休息']},
            {'id': 3, 'timeLabel': '下午', 'title': '核心景点游览', 'description': '观赏主要景观，拍照留念', 'tags': ['3小时', '拍照', '精华']},
            {'id': 4, 'timeLabel': '傍晚', 'title': '日落观赏', 'description': '在最佳观景点欣赏日落美景', 'tags': ['1小时', '摄影', '必看']},
        ]
    elif is_great_wall:
        timeline = [
            {'id': 1, 'timeLabel': '上午', 'title': '登城游览', 'description': '从入口登上长城，沿途欣赏壮丽景色', 'tags': ['3小时', '登山', '必游']},
            {'id': 2, 'timeLabel': '中午', 'title': '烽火台休息', 'description': '在烽火台休息，远眺群山', 'tags': ['1小时', '休息', '观景']},
            {'id': 3, 'timeLabel': '下午', 'title': '继续探索', 'description': '向更远处探索，寻找人少的好汉坡', 'tags': ['2小时', '徒步', '深度']},
            {'id': 4, 'timeLabel': '傍晚', 'title': '返回下山', 'description': '原路返回，结束长城之旅', 'tags': ['1小时', '返程', '']},
        ]
    elif is_temple:
        timeline = [
            {'id': 1, 'timeLabel': '上午', 'title': '礼佛祈福', 'description': '上午香火最旺，适合祈福许愿', 'tags': ['1小时', '室内', '祈福']},
            {'id': 2, 'timeLabel': '上午', 'title': '参观主殿', 'description': '欣赏古建筑和宗教艺术', 'tags': ['1.5小时', '文化', '建筑']},
            {'id': 3, 'timeLabel': '中午', 'title': '素斋午餐', 'description': '品尝清净素斋，体验禅意生活', 'tags': ['1小时', '素食', '特色']},
            {'id': 4, 'timeLabel': '下午', 'title': '静心游览', 'description': '漫步寺院，感受宁静氛围', 'tags': ['1小时', '休闲', '禅意']},
        ]
    elif is_palace:
        timeline = [
            {'id': 1, 'timeLabel': '上午', 'title': '中轴线游览', 'description': '从午门到御花园，沿中轴线参观主要建筑', 'tags': ['3小时', '必游', '精华']},
            {'id': 2, 'timeLabel': '中午', 'title': '简餐休息', 'description': '在冰窖餐厅或自带干粮休息', 'tags': ['1小时', '简餐', '休息']},
            {'id': 3, 'timeLabel': '下午', 'title': '东西六宫', 'description': '探访后宫区域，了解皇室生活', 'tags': ['2小时', '历史', '深度']},
            {'id': 4, 'timeLabel': '下午', 'title': '珍宝馆/特展', 'description': '参观珍贵文物和特展', 'tags': ['1.5小时', '文物', '展览']},
        ]
    else:
        timeline = [
            {'id': 1, 'timeLabel': '上午', 'title': '入园/抵达', 'description': f'开始游览{name}，感受{city}风情', 'tags': ['2小时', '入园', '游览']},
            {'id': 2, 'timeLabel': '中午', 'title': f'{city}特色午餐', 'description': f'品尝{province}地道美食', 'tags': ['1小时', '餐饮', '特色']},
            {'id': 3, 'timeLabel': '下午', 'title': '核心景点游览', 'description': '参观主要景点，拍照留念', 'tags': ['2小时', '精华', '推荐']},
            {'id': 4, 'timeLabel': '傍晚', 'title': '休闲时光', 'description': '在周边漫步，享受悠闲时光', 'tags': ['1小时', '休闲', '自由']},
        ]
    
    # 生成实用锦囊
    tips = []
    
    # 交通指南
    if is_museum:
        tips.append({'id': 1, 'title': '交通指南', 'content': f'{name}位于{city}市区，建议乘坐公共交通前往。市内多条公交线路可达，也可选择地铁或打车。'})
    elif is_nature:
        tips.append({'id': 1, 'title': '交通指南', 'content': f'{name}位于{city}郊区，建议自驾或参加一日游团。如乘坐公共交通，需提前查询班次时间。'})
    elif is_great_wall:
        tips.append({'id': 1, 'title': '交通指南', 'content': '可乘坐877路公交或S2线火车前往八达岭。建议早上7点前出发，避开人流高峰。'})
    else:
        tips.append({'id': 1, 'title': '交通指南', 'content': f'{name}位于{city}，建议提前规划路线。可使用地图导航查询最佳交通方式。'})
    
    # 餐饮建议
    if ticket_price == 0:
        tips.append({'id': 2, 'title': '餐饮建议', 'content': f'{city}特色美食众多，周边餐厅选择丰富。推荐品尝当地特色小吃，人均消费约30-80元。'})
    else:
        tips.append({'id': 2, 'title': '餐饮建议', 'content': f'景区周边有各类餐厅，人均消费约50-100元。也可自带干粮，在指定区域休息用餐。'})
    
    # 拍照提示
    if is_museum:
        tips.append({'id': 3, 'title': '拍照提示', 'content': '室内禁止使用闪光灯，部分展厅禁止拍照（有明确标识）。可在展厅入口、大厅等允许区域拍照留念。'})
    elif is_nature:
        tips.append({'id': 3, 'title': '拍照提示', 'content': '建议携带广角镜头拍摄全景。日出日落时分光线最佳，是拍照的黄金时间。'})
    else:
        tips.append({'id': 3, 'title': '拍照提示', 'content': '建议穿着舒适的鞋子，方便长时间站立和行走。热门景点人流较多，建议错峰拍照。'})
    
    # 最佳游览时间
    if is_museum:
        tips.append({'id': 4, 'title': '最佳游览时间', 'content': '工作日早上9:00-11:00人较少，周末下午较拥挤。特展刚开放时人流最多，建议避开。'})
    elif is_nature:
        tips.append({'id': 4, 'title': '最佳游览时间', 'content': f'春秋两季气候宜人，是游览{name}的最佳季节。建议避开节假日和周末高峰期。'})
    elif is_great_wall:
        tips.append({'id': 4, 'title': '最佳游览时间', 'content': '春秋季节气候宜人，适合登长城。建议工作日前往，避开周末和节假日人流高峰。'})
    else:
        tips.append({'id': 4, 'title': '最佳游览时间', 'content': f'建议上午早些时候抵达，避开人流高峰。{city}四季皆宜，但春秋两季气候最为舒适。'})
    
    # 特殊服务/注意事项
    if is_museum:
        tips.append({'id': 5, 'title': '参观须知', 'content': '部分博物馆提供免费讲解服务，可在服务台咨询。建议提前预约门票，携带身份证入场。'})
    elif is_nature:
        tips.append({'id': 5, 'title': '安全提示', 'content': '登山时请注意安全，穿着防滑鞋。注意防晒补水，携带必要的药品和急救用品。'})
    else:
        tips.append({'id': 5, 'title': '温馨提示', 'content': '建议提前查看景区开放时间和门票信息。可携带充电宝、饮用水等物品，以备不时之需。'})
    
    return {
        'highlights': highlights,
        'timeline': timeline,
        'tips': tips
    }


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


@app.route('/api/destinations/<int:id>/recommendations', methods=['GET'])
def get_destination_recommendations(id: int):
    """获取景点推荐数据（时间轴、必看清单、实用锦囊）"""
    destination = Destination.query.get_or_404(id)
    
    # 生成推荐数据
    recommendations = generate_destination_recommendations(destination)
    
    return jsonify({
        'success': True,
        'recommendations': recommendations
    })


# ==================== 景点评论API ====================

@app.route('/api/destinations/<int:destination_id>/comments', methods=['GET'])
def get_destination_comments(destination_id: int):
    """获取景点的评论列表"""
    try:
        # 验证景点是否存在（不使用 get_or_404，避免抛出异常）
        destination = Destination.query.get(destination_id)
        if not destination:
            return jsonify({
                'success': False,
                'error': '景点不存在',
                'code': 'DESTINATION_NOT_FOUND'
            }), 404
        
        # 获取分页参数
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # 查询评论
        comments = DestinationComment.query.filter_by(
            destination_id=destination_id
        ).order_by(
            DestinationComment.created_at.desc()
        ).offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'comments': [comment.to_dict() for comment in comments],
            'count': len(comments)
        })
    except Exception as e:
        logger.error(f"获取景点评论失败: {e}")
        return jsonify({
            'success': False,
            'error': '获取评论失败'
        }), 500


@app.route('/api/destinations/<int:destination_id>/comments', methods=['POST'])
def create_destination_comment(destination_id: int):
    """创建景点评论"""
    try:
        # 验证景点是否存在
        destination = Destination.query.get_or_404(destination_id)
        
        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求数据为空'}), 400
        
        content = data.get('content', '').strip()
        if not content:
            return jsonify({'success': False, 'error': '评论内容不能为空'}), 400
        
        # 从请求头获取用户token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未登录'}), 401
        
        token = auth_header[7:]  # 去掉 'Bearer ' 前缀
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                return jsonify({'success': False, 'error': '无效的token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'token已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        # 创建评论
        comment = DestinationComment(
            destination_id=destination_id,
            user_id=user_id,
            content=content
        )
        db.session.add(comment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'comment': comment.to_dict(),
            'message': '评论发布成功'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"创建评论失败: {e}")
        return jsonify({
            'success': False,
            'error': '发布评论失败'
        }), 500


# ==================== 用户足迹API ====================

@app.route('/api/footprints', methods=['GET'])
def get_user_footprints():
    """获取当前用户的足迹列表"""
    try:
        # 从请求头获取用户token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未登录'}), 401
        
        token = auth_header[7:]  # 去掉 'Bearer ' 前缀
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                return jsonify({'success': False, 'error': '无效的token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'token已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        # 查询用户的足迹
        footprints = UserFootprint.query.filter_by(
            user_id=user_id
        ).order_by(
            UserFootprint.view_time.desc()
        ).all()
        
        return jsonify({
            'success': True,
            'footprints': [fp.to_dict() for fp in footprints],
            'count': len(footprints)
        })
    except Exception as e:
        logger.error(f"获取用户足迹失败: {e}")
        return jsonify({
            'success': False,
            'error': '获取足迹失败'
        }), 500


@app.route('/api/footprints', methods=['POST'])
def create_user_footprint():
    """创建用户足迹记录"""
    try:
        # 从请求头获取用户token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未登录'}), 401
        
        token = auth_header[7:]  # 去掉 'Bearer ' 前缀
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                return jsonify({'success': False, 'error': '无效的token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'token已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求数据为空'}), 400
        
        destination_id = data.get('destination_id')
        
        if not destination_id:
            return jsonify({'success': False, 'error': '缺少destination_id'}), 400
        
        # 验证景点是否存在
        destination = Destination.query.get(destination_id)
        if not destination:
            return jsonify({'success': False, 'error': '景点不存在'}), 404
        
        # 检查是否已存在相同足迹（24小时内不重复记录）
        from datetime import timedelta
        recent_footprint = UserFootprint.query.filter_by(
            user_id=user_id,
            destination_id=destination_id
        ).filter(
            UserFootprint.view_time >= datetime.now() - timedelta(hours=24)
        ).first()
        
        if recent_footprint:
            # 更新访问时间
            recent_footprint.view_time = datetime.now()
            db.session.commit()
            return jsonify({
                'success': True,
                'message': '足迹已更新',
                'footprint': recent_footprint.to_dict()
            })
        
        # 创建新足迹
        footprint = UserFootprint(
            user_id=user_id,
            destination_id=destination_id
        )
        db.session.add(footprint)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '足迹记录成功',
            'footprint': footprint.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"创建足迹失败: {e}")
        return jsonify({
            'success': False,
            'error': '记录足迹失败'
        }), 500


# ==================== 用户收藏API ====================

def get_user_id_from_token():
    """从请求头获取用户ID"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload.get('user_id')
    except:
        return None


@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    """获取当前用户的收藏列表"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '未登录'}), 401

    try:
        favorites = Favorite.query.filter_by(user_id=user_id).order_by(
            Favorite.created_at.desc()
        ).all()

        # 获取景点详情
        destination_ids = [f.destination_id for f in favorites]
        destinations = {d.id: d for d in Destination.query.filter(Destination.id.in_(destination_ids)).all()}

        result = []
        for fav in favorites:
            dest = destinations.get(fav.destination_id)
            result.append({
                'id': fav.id,
                'destination_id': fav.destination_id,
                'name': dest.name if dest else '',
                'city': dest.city if dest else '',
                'province': dest.province if dest else '',
                'cover_image': dest.cover_image if dest else '',
                'created_at': fav.created_at.isoformat() if fav.created_at else None
            })

        return jsonify({
            'success': True,
            'destinations': result
        })
    except Exception as e:
        logger.error(f"获取收藏失败: {e}")
        return jsonify({'success': False, 'error': '获取收藏失败'}), 500


@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    """添加收藏"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '未登录'}), 401

    data = request.get_json()
    destination_id = data.get('destination_id')
    if not destination_id:
        return jsonify({'success': False, 'error': '缺少destination_id'}), 400

    try:
        # 检查是否已收藏
        existing = Favorite.query.filter_by(user_id=user_id, destination_id=destination_id).first()
        if existing:
            return jsonify({'success': True, 'message': '已收藏'})

        favorite = Favorite(user_id=user_id, destination_id=destination_id)
        db.session.add(favorite)
        db.session.commit()

        return jsonify({'success': True, 'message': '收藏成功'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"添加收藏失败: {e}")
        return jsonify({'success': False, 'error': '添加收藏失败'}), 500


@app.route('/api/favorites/<int:favorite_id>', methods=['DELETE'])
def remove_favorite(favorite_id):
    """删除收藏"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '未登录'}), 401

    try:
        favorite = Favorite.query.filter_by(id=favorite_id, user_id=user_id).first()
        if not favorite:
            return jsonify({'success': False, 'error': '收藏不存在'}), 404

        db.session.delete(favorite)
        db.session.commit()

        return jsonify({'success': True, 'message': '已取消收藏'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"删除收藏失败: {e}")
        return jsonify({'success': False, 'error': '删除收藏失败'}), 500


# ==================== 游记/攻略 API ====================

@app.route('/api/travel-notes', methods=['GET'])
def get_travel_notes():
    """获取游记列表"""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    status = request.args.get('status', 'published')
    destination_id = request.args.get('destination_id', type=int)
    user_id = request.args.get('user_id', type=int)
    sort_by = request.args.get('sort_by', 'created_at')
    order = request.args.get('order', 'desc')
    
    query = TravelNote.query.filter_by(status=status)
    
    if destination_id:
        query = query.filter_by(destination_id=destination_id)
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    if sort_by == 'like_count':
        query = query.order_by(TravelNote.like_count.desc() if order == 'desc' else TravelNote.like_count.asc())
    elif sort_by == 'view_count':
        query = query.order_by(TravelNote.view_count.desc() if order == 'desc' else TravelNote.view_count.asc())
    else:
        query = query.order_by(TravelNote.created_at.desc() if order == 'desc' else TravelNote.created_at.asc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'success': True,
        'travel_notes': [n.to_dict() for n in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@app.route('/api/travel-notes', methods=['POST'])
@rate_limit('travel_note_create', limit=10)
def create_travel_note():
    """发布游记"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '未登录'}), 401
    
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    destination_id = data.get('destination_id')
    cover_image = data.get('cover_image')
    tags = data.get('tags', [])
    status = data.get('status', 'draft')
    
    if not title:
        return jsonify({'success': False, 'error': '标题不能为空'}), 400
    if not content:
        return jsonify({'success': False, 'error': '内容不能为空'}), 400
    
    try:
        note = TravelNote(
            user_id=user_id,
            destination_id=destination_id,
            title=title,
            cover_image=cover_image,
            content=content,
            tags=json.dumps(tags) if tags else None,
            status=status
        )
        db.session.add(note)
        db.session.commit()
        
        return jsonify({'success': True, 'travel_note': note.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"创建游记失败: {e}")
        return jsonify({'success': False, 'error': '创建失败'}), 500


@app.route('/api/travel-notes/<int:note_id>', methods=['GET'])
def get_travel_note(note_id):
    """获取游记详情"""
    note = TravelNote.query.get(note_id)
    if not note:
        return jsonify({'success': False, 'error': '游记不存在'}), 404
    
    # 浏览数+1
    note.view_count += 1
    db.session.commit()
    
    return jsonify({'success': True, 'travel_note': note.to_dict()})


@app.route('/api/travel-notes/<int:note_id>', methods=['PUT'])
def update_travel_note(note_id):
    """编辑游记"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '未登录'}), 401
    
    note = TravelNote.query.get(note_id)
    if not note:
        return jsonify({'success': False, 'error': '游记不存在'}), 404
    if note.user_id != user_id:
        return jsonify({'success': False, 'error': '无权限编辑'}), 403
    
    data = request.get_json() or {}
    
    if 'title' in data:
        note.title = data['title'].strip()
    if 'content' in data:
        note.content = data['content'].strip()
    if 'destination_id' in data:
        note.destination_id = data['destination_id']
    if 'cover_image' in data:
        note.cover_image = data['cover_image']
    if 'tags' in data:
        note.tags = json.dumps(data['tags']) if data['tags'] else None
    if 'status' in data:
        note.status = data['status']
    
    try:
        db.session.commit()
        return jsonify({'success': True, 'travel_note': note.to_dict()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"更新游记失败: {e}")
        return jsonify({'success': False, 'error': '更新失败'}), 500


@app.route('/api/travel-notes/<int:note_id>', methods=['DELETE'])
def delete_travel_note(note_id):
    """删除游记"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '未登录'}), 401
    
    note = TravelNote.query.get(note_id)
    if not note:
        return jsonify({'success': False, 'error': '游记不存在'}), 404
    if note.user_id != user_id:
        return jsonify({'success': False, 'error': '无权限删除'}), 403
    
    try:
        db.session.delete(note)
        db.session.commit()
        return jsonify({'success': True, 'message': '删除成功'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"删除游记失败: {e}")
        return jsonify({'success': False, 'error': '删除失败'}), 500


@app.route('/api/travel-notes/<int:note_id>/like', methods=['POST'])
def like_travel_note(note_id):
    """点赞游记"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    note = TravelNote.query.get(note_id)
    if not note:
        return jsonify({'success': False, 'error': '游记不存在'}), 404
    
    existing = TravelNoteLike.query.filter_by(user_id=user_id, travel_note_id=note_id).first()
    if existing:
        return jsonify({'success': False, 'error': '已点赞'}), 400
    
    try:
        like = TravelNoteLike(user_id=user_id, travel_note_id=note_id)
        db.session.add(like)
        note.like_count += 1
        db.session.commit()
        return jsonify({'success': True, 'like_count': note.like_count})
    except Exception as e:
        db.session.rollback()
        logger.error(f"点赞失败: {e}")
        return jsonify({'success': False, 'error': '点赞失败'}), 500


@app.route('/api/travel-notes/<int:note_id>/unlike', methods=['POST'])
def unlike_travel_note(note_id):
    """取消点赞"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    like = TravelNoteLike.query.filter_by(user_id=user_id, travel_note_id=note_id).first()
    if not like:
        return jsonify({'success': False, 'error': '未点赞'}), 400
    
    note = TravelNote.query.get(note_id)
    try:
        db.session.delete(like)
        if note and note.like_count > 0:
            note.like_count -= 1
        db.session.commit()
        return jsonify({'success': True, 'like_count': note.like_count if note else 0})
    except Exception as e:
        db.session.rollback()
        logger.error(f"取消点赞失败: {e}")
        return jsonify({'success': False, 'error': '操作失败'}), 500


# ==================== 优惠券API ====================

@app.route('/api/coupons/available', methods=['GET'])
def get_available_coupons():
    """获取可领取的优惠券列表"""
    try:
        now = datetime.now()
        coupons = Coupon.query.filter(
            Coupon.status == 'active',
            or_(Coupon.start_date == None, Coupon.start_date <= now),
            or_(Coupon.end_date == None, Coupon.end_date >= now),
            or_(Coupon.max_uses == 0, Coupon.used_count < Coupon.max_uses)
        ).order_by(Coupon.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'coupons': [c.to_dict() for c in coupons]
        })
    except Exception as e:
        logger.error(f"获取优惠券列表失败: {e}")
        return jsonify({'success': False, 'error': '获取失败'}), 500


@app.route('/api/coupons/claim', methods=['POST'])
@rate_limit('coupon_claim', limit=30)
def claim_coupon():
    """领取优惠券"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    data = request.get_json() or {}
    coupon_id = data.get('coupon_id')
    code = data.get('code')  # 也可以通过券码领取
    
    if not coupon_id and not code:
        return jsonify({'success': False, 'error': '请提供优惠券ID或券码'}), 400
    
    try:
        if coupon_id:
            coupon = Coupon.query.get(coupon_id)
        else:
            coupon = Coupon.query.filter_by(code=code, status='active').first()
        
        if not coupon:
            return jsonify({'success': False, 'error': '优惠券不存在'}), 404
        
        # 检查是否已领取
        existing = UserCoupon.query.filter_by(user_id=user_id, coupon_id=coupon.id).first()
        if existing:
            return jsonify({'success': False, 'error': '您已领取过该优惠券'}), 400
        
        # 检查库存
        now = datetime.now()
        if coupon.max_uses > 0 and coupon.used_count >= coupon.max_uses:
            return jsonify({'success': False, 'error': '优惠券已领完'}), 400
        
        # 检查有效期
        if coupon.start_date and coupon.start_date > now:
            return jsonify({'success': False, 'error': '优惠券还未开始'}), 400
        if coupon.end_date and coupon.end_date < now:
            return jsonify({'success': False, 'error': '优惠券已过期'}), 400
        
        # 领取
        user_coupon = UserCoupon(user_id=user_id, coupon_id=coupon.id)
        coupon.used_count += 1
        db.session.add(user_coupon)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user_coupon': user_coupon.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"领取优惠券失败: {e}")
        return jsonify({'success': False, 'error': '领取失败'}), 500


@app.route('/api/coupons/my', methods=['GET'])
def get_my_coupons():
    """获取我的优惠券列表"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    status = request.args.get('status', 'all')  # all/unused/used
    
    query = UserCoupon.query.filter_by(user_id=user_id).options(db.joinedload(UserCoupon.coupon))
    
    if status == 'unused':
        query = query.filter_by(is_used=False)
    elif status == 'used':
        query = query.filter_by(is_used=True)
    
    coupons = query.order_by(UserCoupon.created_at.desc()).all()
    
    return jsonify({
        'success': True,
        'coupons': [uc.to_dict() for uc in coupons]
    })


@app.route('/api/coupons/apply', methods=['POST'])
def apply_coupon():
    """下单时使用优惠券"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    data = request.get_json() or {}
    coupon_id = data.get('coupon_id')
    order_amount = data.get('order_amount', 0)
    
    if not coupon_id:
        return jsonify({'success': False, 'error': '请提供优惠券ID'}), 400
    
    try:
        user_coupon = UserCoupon.query.filter_by(id=coupon_id, user_id=user_id).first()
        if not user_coupon:
            return jsonify({'success': False, 'error': '优惠券不存在'}), 404
        
        if user_coupon.is_used:
            return jsonify({'success': False, 'error': '优惠券已使用'}), 400
        
        coupon = user_coupon.coupon
        if not coupon:
            return jsonify({'success': False, 'error': '优惠券无效'}), 400
        
        # 检查最低订单金额
        if order_amount < coupon.min_order:
            return jsonify({
                'success': False, 
                'error': f'订单金额需满{coupon.min_order}元'
            }), 400
        
        # 计算折扣
        if coupon.type == 'fixed':
            discount = coupon.value
        else:  # percent
            discount = order_amount * coupon.value / 100
        
        # 折扣不超过订单金额
        discount = min(discount, order_amount)
        
        return jsonify({
            'success': True,
            'discount': round(discount, 2),
            'final_amount': round(order_amount - discount, 2)
        })
    except Exception as e:
        logger.error(f"使用优惠券失败: {e}")
        return jsonify({'success': False, 'error': '操作失败'}), 500


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


@app.route('/api/admin/geo/provinces', methods=['GET'])
@rate_limit('geo_provinces', limit=30)
def admin_geo_provinces():
    """管理端获取省份分布和城市排行统计"""
    try:
        # 省份分布统计
        province_stats = db.session.query(
            Destination.province,
            db.func.count(Destination.id).label('count')
        ).filter(Destination.province.isnot(None), Destination.province != '')\
         .group_by(Destination.province)\
         .order_by(db.desc('count'))\
         .limit(10).all()
        
        provinces_data = []
        for prov, count in province_stats:
            # 获取该省的城市分布
            city_stats = db.session.query(
                Destination.city,
                db.func.count(Destination.id).label('count')
            ).filter(Destination.province == prov, Destination.city.isnot(None), Destination.city != '')\
             .group_by(Destination.city)\
             .order_by(db.desc('count'))\
             .limit(10).all()
            
            cities_data = [{'city': city, 'count': count} for city, count in city_stats]
            provinces_data.append({
                'province': prov,
                'count': count,
                'cities': cities_data
            })
        
        return jsonify({
            'success': True,
            'data': provinces_data
        })
    except Exception as e:
        logger.error(f"省份统计查询失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'data': []
        })


@app.route('/api/admin/stats', methods=['GET'])
@rate_limit('admin_stats', limit=30)
def admin_stats():
    """管理端获取详细统计数据"""
    try:
        # 省份分布TOP10
        province_stats = db.session.query(
            Destination.province,
            db.func.count(Destination.id).label('count')
        ).filter(Destination.province.isnot(None), Destination.province != '')\
         .group_by(Destination.province)\
         .order_by(db.desc('count'))\
         .limit(10).all()
        
        # 城市排行TOP10
        city_stats = db.session.query(
            Destination.city,
            Destination.province,
            db.func.count(Destination.id).label('count')
        ).filter(Destination.city.isnot(None), Destination.city != '')\
         .group_by(Destination.city, Destination.province)\
         .order_by(db.desc('count'))\
         .limit(10).all()
        
        # 订单状态分布
        order_status_stats = db.session.query(
            Order.status,
            db.func.count(Order.id).label('count')
        ).group_by(Order.status).all()
        
        # 行程状态分布
        trip_status_stats = db.session.query(
            Trip.status,
            db.func.count(Trip.id).label('count')
        ).group_by(Trip.status).all()
        
        return jsonify({
            'success': True,
            'data': {
                'provinces': [{'province': p, 'count': c} for p, c in province_stats],
                'cities': [{'city': c, 'province': p, 'count': n} for c, p, n in city_stats],
                'order_status': [{'status': s, 'count': c} for s, c in order_status_stats],
                'trip_status': [{'status': s, 'count': c} for s, c in trip_status_stats]
            }
        })
    except Exception as e:
        logger.error(f"管理端统计查询失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'data': {}
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

import random

def generate_nearby_pois(center_lng, center_lat, count=8):
    """
    生成周边 POI 数据（餐厅、咖啡馆、公园、商场等）
    基于中心坐标生成合理的周边设施分布
    """
    # POI 类型配置
    poi_types = [
        {'type': '餐厅', 'prefix': ['老北京', '川味', '江南', '新疆', '日式', '韩式', '湘味', '粤式'], 'suffix': ['餐厅', '饭馆', '美食城', '小吃店', '酒楼', '食府'], 'icon': 'coffee'},
        {'type': '咖啡馆', 'prefix': ['星巴克', '瑞幸', 'Manner', 'Costa', 'Seesaw', 'M Stand', '本地', '街角'], 'suffix': ['咖啡', 'Coffee', ' Cafe', ''], 'icon': 'coffee'},
        {'type': '公园', 'prefix': ['阳光', '绿荫', ' Riverside', ' Central', '人民', '文化', '体育', '生态'], 'suffix': ['公园', '广场', '绿地', ' Garden', ' Park'], 'icon': 'park'},
        {'type': '商场', 'prefix': ['万达', '银泰', '万象城', '大悦城', '金鹰', '恒隆', '凯德', '新天地'], 'suffix': ['购物中心', '广场', ' Mall', '百货', '商城'], 'icon': 'shopping'},
        {'type': '便利店', 'prefix': ['7-Eleven', '全家', '罗森', '喜士多', '便利蜂', '美宜佳', '快客', '好邻居'], 'suffix': ['', '便利店', ''], 'icon': 'shopping'},
        {'type': '景点', 'prefix': ['', ' nearby', '周边', '附近'], 'suffix': ['景点', '风景区', '旅游区', '名胜古迹'], 'icon': 'tree'},
    ]
    
    # 常见道路名称后缀
    street_suffixes = ['路', '街', '大道', '巷', '弄', '胡同']
    
    items = []
    for i in range(count):
        # 随机选择类型
        poi_config = random.choice(poi_types)
        prefix = random.choice(poi_config['prefix']) if poi_config['prefix'] else ''
        suffix = random.choice(poi_config['suffix']) if poi_config['suffix'] else ''
        
        # 生成名称
        if poi_config['type'] == '便利店':
            name = prefix
        else:
            name = f"{prefix}{suffix}" if prefix else suffix
        
        if not name:
            name = f"{poi_config['type']}{i+1}"
        
        # 在中心点周围随机分布（0.1-2km范围内）
        # 使用极坐标随机分布，让点更自然
        angle = random.uniform(0, 2 * math.pi)
        distance_km = random.uniform(0.1, min(2.0, 5))  # 0.1-2km范围内
        
        # 将距离转换为经纬度偏移
        # 1度纬度 ≈ 111km
        # 1度经度 ≈ 111km * cos(纬度)
        lat_offset = (distance_km / 111.0) * math.sin(angle)
        lng_offset = (distance_km / (111.0 * math.cos(math.radians(center_lat)))) * math.cos(angle)
        
        item_lat = center_lat + lat_offset
        item_lng = center_lng + lng_offset
        
        # 生成地址
        street_num = random.randint(1, 999)
        street_name = f"{random.choice(['人民', '解放', '中山', '建设', '和平', '胜利', '东风', '朝阳', '新华', '民主'])}{random.choice(street_suffixes)}"
        address = f"{street_name}{street_num}号"
        
        # 生成评分 (3.5-5.0)
        rating = round(random.uniform(3.5, 5.0), 1)
        
        items.append({
            'id': f"poi_{i+1}",
            'name': name,
            'description': f'{poi_config["type"]}，评分{rating}分，距离{center_lng:.2f},{center_lat:.2f}约{distance_km:.1f}km',
            'address': address,
            'distance': f'{distance_km:.1f}km',
            'lng': round(item_lng, 6),
            'lat': round(item_lat, 6),
            'type': poi_config['type'],
            'rating': rating,
            'icon': poi_config['icon']
        })
    
    # 按距离排序
    items.sort(key=lambda x: float(x['distance'].replace('km', '')))
    
    # 重新分配 ID 保持排序
    for i, item in enumerate(items):
        item['id'] = f"poi_{i+1}"
    
    return items


# ============ 心知天气API ============
@app.route('/api/weather', methods=['GET'])
def get_weather():
    """获取城市天气 - 使用心知天气API"""
    city = request.args.get('city', '')
    if not city:
        return jsonify({'success': False, 'error': '缺少city参数'}), 400
    
    api_key = os.getenv('SENIVERSE_API_KEY', '')
    if not api_key:
        return jsonify({'success': False, 'error': '未配置心知天气API Key'}), 500
    
    try:
        import requests
        # 心知天气实时天气API
        url = 'https://api.seniverse.com/v3/weather/now.json'
        params = {
            'key': api_key,
            'location': city,
            'language': 'zh-Hans',
            'unit': 'c'
        }
        resp = requests.get(url, params=params, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('results'):
                result = data['results'][0]
                now = result.get('now', {})
                return jsonify({
                    'success': True,
                    'city': result.get('location', {}).get('name', city),
                    'weather': now.get('text', '未知'),
                    'temperature': now.get('temperature', '0'),
                    'humidity': now.get('humidity', '0'),
                    'wind': now.get('wind_direction', '') + now.get('wind_scale', '') + '级',
                    'update_time': result.get('last_update', '')
                })
        
        return jsonify({'success': False, 'error': '获取天气失败'}), 500
        
    except Exception as e:
        logger.error(f"天气API错误: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== 机票/酒店 API ====================

@app.route('/api/flights/search', methods=['GET'])
@rate_limit('flight_search', limit=30)
def search_flights():
    """搜索航班"""
    origin = request.args.get('origin', '')
    destination = request.args.get('destination', '')
    date = request.args.get('date', '')
    passengers = request.args.get('passengers', 1, type=int)
    
    if not origin or not destination or not date:
        return jsonify({'success': False, 'error': '缺少必要参数'}), 400
    
    try:
        from services.flight_service import search_flights as search
        flights = search(origin, destination, date, passengers)
        return jsonify({'success': True, 'flights': flights})
    except Exception as e:
        logger.error(f"搜索航班失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/flights/<flight_id>', methods=['GET'])
@rate_limit('flight_detail', limit=30)
def get_flight(flight_id):
    """获取航班详情"""
    try:
        from services.flight_service import get_flight_detail
        flight = get_flight_detail(flight_id)
        if flight:
            return jsonify({'success': True, 'flight': flight})
        return jsonify({'success': False, 'error': '航班不存在'}), 404
    except Exception as e:
        logger.error(f"获取航班详情失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/hotels/search', methods=['GET'])
@rate_limit('hotel_search', limit=30)
def search_hotels():
    """搜索酒店"""
    city = request.args.get('city', '')
    checkin = request.args.get('checkin', '')
    checkout = request.args.get('checkout', '')
    guests = request.args.get('guests', 1, type=int)
    rooms = request.args.get('rooms', 1, type=int)
    
    if not city or not checkin or not checkout:
        return jsonify({'success': False, 'error': '缺少必要参数'}), 400
    
    try:
        from services.hotel_service import search_hotels as search
        hotels = search(city, checkin, checkout, guests, rooms)
        return jsonify({'success': True, 'hotels': hotels})
    except Exception as e:
        logger.error(f"搜索酒店失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/hotels/<hotel_id>', methods=['GET'])
@rate_limit('hotel_detail', limit=30)
def get_hotel(hotel_id):
    """获取酒店详情"""
    try:
        from services.hotel_service import get_hotel_detail
        hotel = get_hotel_detail(hotel_id)
        if hotel:
            return jsonify({'success': True, 'hotel': hotel})
        return jsonify({'success': False, 'error': '酒店不存在'}), 404
    except Exception as e:
        logger.error(f"获取酒店详情失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/hotels/<hotel_id>/rooms', methods=['GET'])
@rate_limit('hotel_rooms', limit=30)
def get_hotel_rooms(hotel_id):
    """获取酒店房型"""
    checkin = request.args.get('checkin', '')
    checkout = request.args.get('checkout', '')
    
    if not checkin or not checkout:
        return jsonify({'success': False, 'error': '缺少必要参数'}), 400
    
    try:
        from services.hotel_service import get_hotel_rooms
        rooms = get_hotel_rooms(hotel_id, checkin, checkout)
        return jsonify({'success': True, 'rooms': rooms})
    except Exception as e:
        logger.error(f"获取房型失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== 客服系统 API ====================

@app.route('/api/support/tickets', methods=['GET'])
@rate_limit('support_tickets', limit=30)
def get_support_tickets():
    """获取当前用户的工单列表"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    try:
        tickets = SupportTicket.query.filter_by(user_id=user_id).order_by(
            SupportTicket.created_at.desc()
        ).all()
        return jsonify({
            'success': True,
            'tickets': [t.to_dict() for t in tickets]
        })
    except Exception as e:
        logger.error(f"获取工单列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/support/tickets', methods=['POST'])
@rate_limit('create_ticket', limit=20)
def create_support_ticket():
    """创建新工单"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    ticket_type = (data.get('ticket_type') or 'other').strip()
    
    if not title or not description:
        return jsonify({'success': False, 'error': '标题和描述不能为空'}), 400
    
    try:
        ticket = SupportTicket(
            user_id=user_id,
            title=title,
            description=description,
            ticket_type=ticket_type,
            status='open'
        )
        db.session.add(ticket)
        db.session.commit()
        return jsonify({'success': True, 'ticket': ticket.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"创建工单失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/support/tickets/<int:ticket_id>', methods=['GET'])
@rate_limit('ticket_detail', limit=30)
def get_ticket_detail(ticket_id):
    """获取工单详情"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    try:
        ticket = SupportTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'success': False, 'error': '工单不存在'}), 404
        
        if ticket.user_id != user_id:
            return jsonify({'success': False, 'error': '无权限查看'}), 403
        
        # 获取回复
        replies = TicketReply.query.filter_by(ticket_id=ticket_id).order_by(
            TicketReply.created_at.asc()
        ).all()
        
        return jsonify({
            'success': True,
            'ticket': ticket.to_dict(),
            'replies': [r.to_dict() for r in replies]
        })
    except Exception as e:
        logger.error(f"获取工单详情失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/support/tickets/<int:ticket_id>/reply', methods=['POST'])
@rate_limit('ticket_reply', limit=20)
def reply_to_ticket(ticket_id):
    """回复工单"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({'success': False, 'error': '请先登录'}), 401
    
    data = request.get_json() or {}
    content = (data.get('content') or '').strip()
    
    if not content:
        return jsonify({'success': False, 'error': '回复内容不能为空'}), 400
    
    try:
        ticket = SupportTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'success': False, 'error': '工单不存在'}), 404
        
        if ticket.user_id != user_id:
            return jsonify({'success': False, 'error': '无权限回复'}), 403
        
        # 创建回复
        reply = TicketReply(
            ticket_id=ticket_id,
            user_id=user_id,
            content=content,
            is_admin=False
        )
        db.session.add(reply)
        
        # 更新工单状态
        ticket.status = 'processing'
        db.session.commit()
        
        return jsonify({'success': True, 'reply': reply.to_dict()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"回复工单失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== 天气 API（复用 services） ====================

def get_weather_info(city: str) -> str:
    """获取天气信息字符串，供AI使用"""
    api_key = os.getenv('SENIVERSE_API_KEY', '')
    if not api_key:
        return f"【{city}】天气信息获取失败：未配置天气API"
    
    try:
        import requests
        url = 'https://api.seniverse.com/v3/weather/now.json'
        params = {
            'key': api_key,
            'location': city,
            'language': 'zh-Hans',
            'unit': 'c'
        }
        resp = requests.get(url, params=params, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('results'):
                result = data['results'][0]
                now = result.get('now', {})
                city_name = result.get('location', {}).get('name', city)
                weather = now.get('text', '未知')
                temp = now.get('temperature', '0')
                wind = now.get('wind_direction', '') + now.get('wind_scale', '') + '级'
                return f"【{city_name}】{weather}，气温{temp}°C，风力{wind}"
        
        return f"【{city}】获取天气信息失败"
        
    except Exception as e:
        logger.error(f"天气查询错误: {e}")
        return f"【{city}】天气查询异常：{str(e)}"


@app.route('/api/nearby', methods=['GET'])
def get_nearby():
    """获取周边完整数据API - 返回真实景点和周边设施（餐厅、酒店、商场等）"""
    location = request.args.get('location', '')
    if not location:
        return jsonify({'success': False, 'error': '缺少位置参数'}), 400

    try:
        lng, lat = map(float, location.split(','))
    except (ValueError, AttributeError):
        return jsonify({'success': False, 'error': '无效的位置格式'}), 400

    # 搜索半径
    radius = float(request.args.get('radius', 10))
    limit = int(request.args.get('limit', 12))

    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return R * c

    items = []

    # 1. 从数据库获取附近的其他真实景点
    try:
        lat_range = radius / 111.0
        lng_range = radius / (111.0 * abs(math.cos(math.radians(lat))) if lat != 0 else 111.0)

        has_lat_lng = hasattr(Destination, 'lat') and hasattr(Destination, 'lng')

        if has_lat_lng:
            nearby_destinations = Destination.query.filter(
                Destination.lat.between(lat - lat_range, lat + lat_range),
                Destination.lng.between(lng - lng_range, lng + lng_range),
                Destination.lng.isnot(None),
                Destination.lat.isnot(None)
            ).limit(20).all()

            for dest in nearby_destinations:
                if has_lat_lng and dest.lng and dest.lat:
                    distance = haversine_distance(lat, lng, dest.lat, dest.lng)
                    if distance > 0.1 and distance <= radius:
                        items.append({
                            'id': f"dest_{dest.id}",
                            'name': dest.name,
                            'description': dest.description or f'{dest.city}热门景点',
                            'address': f"{dest.province}{dest.city}" or '附近',
                            'distance': f'{distance:.1f}km',
                            'lng': dest.lng,
                            'lat': dest.lat,
                            'type': '景点',
                            'rating': dest.rating or 4.5,
                            'icon': 'tree',
                            'data_source': 'database'
                        })
    except Exception as e:
        logger.warning(f"从数据库获取周边景点失败: {e}")

    # 2. 生成周边设施数据（餐厅、酒店、商场、交通等）
    generated_items = generate_nearby_pois(lng, lat, count=max(limit - len(items), 8))
    items.extend(generated_items)

    # 按距离排序
    items.sort(key=lambda x: float(x['distance'].replace('km', '')))
    items = items[:limit]

    # 标记数据来源
    for item in items:
        if item.get('data_source') is None:
            item['data_source'] = 'generated'

    return jsonify({
        'success': True,
        'items': items,
        'count': len(items),
        'center': {'lng': lng, 'lat': lat},
        'radius_km': radius
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


# ==================== 搜索API ====================

@app.route('/api/search', methods=['GET'])
@rate_limit('search', limit=60)
def global_search():
    """全局搜索接口 - 搜索目的地和产品
    
    参数:
    - q: 搜索关键词
    - type: 搜索类型 (destinations/products/all)
    - page: 页码
    - per_page: 每页数量
    """
    keyword = request.args.get('q', '').strip()
    search_type = request.args.get('type', 'all')
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 50)
    
    if not keyword:
        return jsonify({
            'success': True,
            'destinations': [],
            'products': [],
            'total': 0
        })
    
    results = {
        'destinations': [],
        'products': [],
        'total': 0
    }
    
    # 搜索目的地
    if search_type in ('all', 'destinations'):
        dest_query = Destination.query.filter(
            db.or_(
                Destination.name.contains(keyword),
                Destination.city.contains(keyword),
                Destination.province.contains(keyword),
                Destination.description.contains(keyword)
            ),
            Destination.status == 'active'
        )
        dest_page = dest_query.paginate(page=page, per_page=per_page, error_out=False)
        results['destinations'] = [d.to_dict() for d in dest_page.items]
    
    # 搜索产品
    if search_type in ('all', 'products'):
        prod_query = Product.query.filter(
            db.or_(
                Product.name.contains(keyword),
                Product.subtitle.contains(keyword),
                Product.description.contains(keyword)
            ),
            Product.status == 'active'
        )
        prod_page = prod_query.paginate(page=page, per_page=per_page, error_out=False)
        results['products'] = [p.to_dict() for p in prod_page.items]
    
    # 计算总结果数
    results['total'] = len(results['destinations']) + len(results['products'])
    
    return jsonify({
        'success': True,
        **results,
        'page': page,
        'per_page': per_page
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

# AI服务缓存，避免每次请求都重新创建
_ai_service_cache = None
_ai_service_config_hash = None

# 所有AI服务商配置
_ai_configs = None

def _get_all_ai_configs():
    """获取所有AI服务商配置"""
    global _ai_configs
    if _ai_configs is not None:
        return _ai_configs
    
    _ai_configs = [
        {
            'name': 'Moonshot',
            'api_key': os.getenv('MOONSHOT_API_KEY', ''),
            'base_url': os.getenv('MOONSHOT_BASE_URL', 'https://api.moonshot.cn/v1'),
            'model': os.getenv('MOONSHOT_MODEL', 'moonshot-v1-8k')
        },
        {
            'name': 'Zhipu',
            'api_key': os.getenv('ZHIPU_API_KEY', ''),
            'base_url': os.getenv('ZHIPU_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4'),
            'model': os.getenv('ZHIPU_MODEL', 'glm-4-flash')
        },
        {
            'name': 'Zhipu-Backup',
            'api_key': os.getenv('ZHIPU_API_KEY', ''),
            'base_url': os.getenv('ZHIPU_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4'),
            'model': os.getenv('ZHIPU_MODEL_BACKUP', 'glm-4.5-air')
        },
        {
            'name': 'OpenAI',
            'api_key': os.getenv('OPENAI_API_KEY', ''),
            'base_url': os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
            'model': os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
        },
    ]
    # 过滤掉没有api_key或重复的配置
    seen = set()
    filtered = []
    for c in _ai_configs:
        key = (c['api_key'], c['model'])
        if c['api_key'] and key not in seen:
            seen.add(key)
            filtered.append(c)
    _ai_configs = filtered
    return _ai_configs

def get_ai_service():
    """获取AI服务实例 - 支持多服务商自动切换"""
    global _ai_service_cache, _ai_service_config_hash

    # 根据配置生成hash，用于检测配置是否变化
    all_keys = tuple(f"{k}={os.getenv(k, '')}" for k in [
        'MOONSHOT_API_KEY', 'MOONSHOT_MODEL', 'ZHIPU_API_KEY', 'ZHIPU_MODEL', 
        'OPENAI_API_KEY', 'OPENAI_MODEL', 'AI_API_KEY', 'AI_MODEL'
    ])
    current_hash = hash(all_keys)

    # 如果配置没变且缓存存在，直接返回缓存
    if _ai_service_cache is not None and _ai_service_config_hash == current_hash:
        return _ai_service_cache

    configs = _get_all_ai_configs()
    if not configs:
        logger.warning("未配置任何AI API Key")
        _ai_service_cache = None
        _ai_service_config_hash = current_hash
        return None

    logger.info(f"已配置 {len(configs)} 个AI服务商: {[c['name'] for c in configs]}")

    class AIService:
        """多服务商AI服务，支持自动切换"""
        def __init__(self):
            self.configs = _get_all_ai_configs()
            self.current_idx = 0
            
        def _call_api(self, config, messages, timeout=120):
            """调用单个AI服务"""
            import requests as req
            resp = req.post(
                f"{config['base_url']}/chat/completions",
                headers={
                    "Authorization": f"Bearer {config['api_key']}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": config['model'],
                    "messages": messages,
                    "max_tokens": 2048
                },
                timeout=timeout
            )
            return resp

        def chat(self, messages, timeout=120):
            """同步非流式调用，自动切换到可用的AI服务"""
            last_error = None
            
            # 遍历所有AI配置
            for i in range(len(self.configs)):
                config = self.configs[i]
                try:
                    resp = self._call_api(config, messages, timeout)
                    
                    # 429限流，尝试下一个服务
                    if resp.status_code == 429:
                        logger.warning(f"[{config['name']}] {config['model']} 限流(429)，切换到下一个AI服务")
                        last_error = "429"
                        continue
                    
                    resp.raise_for_status()
                    data = resp.json()
                    logger.info(f"AI调用成功: {config['name']} {config['model']}")
                    return data['choices'][0]['message']['content']
                    
                except Exception as e:
                    err_str = str(e)
                    if '429' in err_str or 'Too Many Requests' in err_str:
                        logger.warning(f"[{config['name']}] {config['model']} 限流，切换到下一个AI服务")
                        last_error = "429"
                        continue
                    logger.error(f"[{config['name']}] {config['model']} 调用失败: {err_str}")
                    last_error = err_str
                    # 非限流错误，尝试下一个服务
                    continue
            
            # 所有AI服务都失败
            raise Exception(last_error or "所有AI服务均不可用")

        def chat_stream(self, messages):
            """真实 SSE 流式调用，收到 token 立即 yield，优化延迟"""
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
                    "max_tokens": 2048,
                    "stream": True,
                    "temperature": 0.7
                },
                timeout=120,
                stream=True
            )
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                line_text = line.decode('utf-8') if isinstance(line, bytes) else line
                if line_text.startswith('data: '):
                    payload = line_text[6:]
                    if payload.strip() == '[DONE]':
                        return
                    try:
                        chunk_data = json.loads(payload)
                        delta = chunk_data.get('choices', [{}])[0].get('delta', {})
                        content = delta.get('content', '')
                        if content:
                            yield content
                    except Exception:
                        pass

        def chat_with_tools(self, messages, tools):
            """带函数调用的对话 - 支持自动执行工具（遍历所有AI服务）"""
            import requests as req
            last_error = None
            
            # 遍历所有AI配置尝试
            for config in self.configs:
                try:
                    # 第一次调用 - 检查是否需要函数调用
                    resp = req.post(
                        f"{config['base_url']}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {config['api_key']}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": config['model'],
                            "messages": messages,
                            "max_tokens": 2048,
                            "stream": False,
                            "temperature": 0.7,
                            "tools": tools
                        },
                        timeout=120
                    )
                    
                    if resp.status_code == 429:
                        logger.warning(f"[{config['name']}] 限流，切换")
                        continue
                    
                    resp.raise_for_status()
                    data = resp.json()
                    assistant_msg = data['choices'][0]['message']
                    
                    # 检查是否有函数调用
                    if 'tool_calls' in assistant_msg:
                        logger.info(f"[{config['name']}] 触发了函数调用")
                        messages = messages + [assistant_msg]
                        
                        for tool_call in assistant_msg['tool_calls']:
                            func_name = tool_call['function']['name']
                            func_args = json.loads(tool_call['function']['arguments'])
                            result = self.execute_tool(func_name, func_args)
                            messages.append({
                                'role': 'tool',
                                'tool_call_id': tool_call['id'],
                                'content': result
                            })
                        
                        # 第二次调用 - 获取最终响应
                        resp2 = req.post(
                            f"{config['base_url']}/chat/completions",
                            headers={
                                "Authorization": f"Bearer {config['api_key']}",
                                "Content-Type": "application/json"
                            },
                            json={
                                "model": config['model'],
                                "messages": messages,
                                "max_tokens": 2048,
                                "stream": False,
                                "temperature": 0.7
                            },
                            timeout=120
                        )
                        
                        if resp2.status_code == 429:
                            continue
                        
                        resp2.raise_for_status()
                        final_data = resp2.json()
                        return final_data['choices'][0]['message']['content'] or ''
                    
                    return assistant_msg.get('content', '')
                    
                except Exception as e:
                    err_str = str(e)
                    if '429' in err_str:
                        logger.warning(f"[{config['name']}] 限流，尝试下一个")
                        continue
                    logger.error(f"[{config['name']}] 失败: {err_str}")
                    last_error = err_str
                    continue
            
            raise Exception(last_error or "所有AI服务均不可用")
        
        def execute_tool(self, name, args):
            """执行工具函数"""
            if name == 'get_weather':
                city = args.get('city', '')
                result = get_weather_info(city)
                return result
            elif name == 'search_destinations':
                query = args.get('query', '')
                # 简单搜索实现
                from app import Destination
                dests = Destination.query.filter(
                    Destination.name.like(f'%{query}%') | 
                    Destination.city.like(f'%{query}%')
                ).limit(5).all()
                if dests:
                    result = '找到以下目的地：' + '、'.join([f"{d.name}({d.city})" for d in dests])
                else:
                    result = f'没有找到与"{query}"相关的目的地'
                return result
            elif name == 'get_itinerary':
                destination = args.get('destination', '')
                days = args.get('days', 3)
                return f'您想规划{days}天{destination}旅行，请稍等，我来为您生成详细行程...'
            else:
                return f'未知工具: {name}'

    _ai_service_cache = AIService()
    _ai_service_config_hash = current_hash
    return _ai_service_cache


@app.route('/api/chat', methods=['POST', 'OPTIONS'])
@rate_limit('chat', limit=20)
def chat():
    """AI助手对话接口（简化版，代理到AI服务）"""
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

        # 支持 messages 数组格式 或单个 message 格式
        if not data:
            return jsonify({'error': '缺少参数'}), 400

        # 如果是 messages 数组格式（前端发送的格式）
        if 'messages' in data and isinstance(data['messages'], list):
            messages = [
                {'role': 'system', 'content': '你是小游，一个热情友好的旅行规划师。请用专业、简洁的方式回答用户的问题。'},
            ]
            messages.extend(data['messages'])
        elif 'message' in data:
            # 单个 message 格式（兼容旧格式）
            user_message = data['message']
            messages = [
                {'role': 'system', 'content': '你是小游，一个热情友好的旅行规划师。请用专业、简洁的方式回答用户的问题。'},
                {'role': 'user', 'content': user_message}
            ]
        else:
            return jsonify({'error': '缺少message参数'}), 400
        
        # 获取AI服务配置
        ai_service = get_ai_service()
        if not ai_service:
            # AI服务未配置，返回降级响应
            logger.warning("AI服务未配置，返回降级响应")
            return jsonify({
                'success': True,
                'reply': '您好！我是您的旅行助手小游。目前AI服务暂未配置，但我可以帮您查看景点信息。请告诉我您想去哪里旅行？',
                'timestamp': datetime.now().isoformat(),
                'mode': 'fallback'
            })
        
        # 调用AI服务进行对话
        response = ai_service.chat(messages)
        
        # 构建响应
        result = {
            'success': True,
            'reply': response,
            'timestamp': datetime.now().isoformat(),
            'mode': 'ai'
        }
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"AI对话失败: {str(e)}")
        return jsonify({
            'success': True,
            'reply': '抱歉，AI服务暂时不可用。您可以尝试刷新页面或稍后重试。',
            'timestamp': datetime.now().isoformat(),
            'mode': 'error_fallback',
            'error': str(e)
        })


def generate_agent_stream(ai_service, messages):
    """生成Agent模式SSE流式响应 - 支持工具调用"""
    try:
        # 发送开始事件
        yield f"data: {json.dumps({'type': 'thinking', 'tool': 'ai', 'label': '正在思考'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'content', 'data': ''}, ensure_ascii=False)}\n\n"

        # 使用带工具调用的方法
        try:
            # 先尝试带工具的调用
            content = ai_service.chat_with_tools(messages, TRAVEL_AGENT_TOOLS)
            # 流式输出结果
            for i in range(0, len(content), 10):
                yield f"data: {json.dumps({'type': 'content', 'data': content[i:i+10]}, ensure_ascii=False)}\n\n"
        except AttributeError:
            # 如果不支持chat_with_tools，回退到普通流式
            for token in ai_service.chat_stream(messages):
                yield f"data: {json.dumps({'type': 'content', 'data': token}, ensure_ascii=False)}\n\n"

        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

    except Exception as e:
        logger.error(f"Agent流式生成失败: {str(e)}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"


# AI Agent 工具定义
TRAVEL_AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的实时天气信息。当用户询问某个地方的天气时调用此工具。",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，如：北京、上海、郑州"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_destinations",
            "description": "搜索旅游景点目的地。当用户想了解某个地方的景点时调用此工具。",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索关键词，可以是城市名或景点名"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_itinerary",
            "description": "生成旅行行程规划。当用户需要制定旅行计划时调用此工具。",
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {
                        "type": "string",
                        "description": "目的地城市或景点"
                    },
                    "days": {
                        "type": "integer",
                        "description": "旅行天数，默认3天"
                    }
                },
                "required": ["destination"]
            }
        }
    }
]


@app.route('/api/agent/chat', methods=['POST', 'OPTIONS'])
@rate_limit('agent_chat', limit=20)
def agent_chat():
    """AI助手对话接口（Agent模式）- 支持SSE流式响应"""
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
            # AI服务未配置，返回流式降级响应
            def generate_fallback():
                fallback_msg = '您好！我是您的旅行助手。目前AI服务暂未配置，但我可以帮您查看景点信息和规划基础行程。请告诉我您想去哪里旅行？'
                yield f"data: {json.dumps({'type': 'content', 'data': fallback_msg}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
            
            response = make_response(generate_fallback(), 200)
            response.headers['Content-Type'] = 'text/event-stream; charset=utf-8'
            response.headers['Cache-Control'] = 'no-cache'
            response.headers['X-Accel-Buffering'] = 'no'
            return response
        
        # 返回SSE流式响应
        response = make_response(generate_agent_stream(ai_service, messages), 200)
        response.headers['Content-Type'] = 'text/event-stream; charset=utf-8'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['X-Accel-Buffering'] = 'no'
        response.headers['Connection'] = 'keep-alive'
        return response
    
    except Exception as e:
        logger.error(f"AI对话失败: {str(e)}")
        # 返回流式错误响应
        def generate_error():
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI服务暂时不可用'}, ensure_ascii=False)}\n\n"

        response = make_response(generate_error(), 200)
        response.headers['Content-Type'] = 'text/event-stream; charset=utf-8'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['X-Accel-Buffering'] = 'no'
        response.headers['Connection'] = 'keep-alive'
        return response


# ==================== 行程生成API ====================

@app.route('/api/itinerary/generate', methods=['POST'])
@rate_limit('itinerary_generate', limit=10)
def generate_itinerary():
    """生成行程API"""
    try:
        # 验证用户身份
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未登录，请先登录'}), 401

        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                return jsonify({'success': False, 'error': '无效的token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'token已过期，请重新登录'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 401

        data = request.get_json() or {}
        destination = data.get('destination', '')
        days = min(7, max(1, int(data.get('days', 3))))
        budget = data.get('budget_hint', 0)
        preferences = data.get('preferences', {})

        if not destination:
            return jsonify({'success': False, 'error': '请提供目的地'}), 400

        # 构建AI提示词
        budget_text = f"预算{budget}元" if budget else "自由行"
        prompt = f"""请为去{destination}旅行{days}天({budget_text})生成一份详细行程规划。

请以JSON格式返回，结构如下：
{{
  "title": "行程标题，如：杭州3日游",
  "description": "行程简介",
  "days": [
    {{
      "day": 1,
      "theme": "第一天主题",
      "items": [
        {{"time": "09:00", "title": "景点名称", "description": "景点描述", "location": "地址"}},
        {{"time": "12:00", "title": "午餐推荐", "description": "美食推荐", "location": "餐厅地址"}}
      ]
    }}
  ]
}}

请确保JSON格式正确，可以被JSON.parse解析。"""

        # 调用AI生成行程
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({'success': False, 'error': 'AI服务暂不可用'}), 500

        try:
            response_text = ai_service.chat([{"role": "user", "content": prompt}], timeout=120)
        except Exception as e:
            error_str = str(e)
            # 限流处理：返回降级行程
            if '429' in error_str or 'Too Many Requests' in error_str:
                logger.warning("AI限流，返回降级行程")
                # 使用内置行程模板
                fallback_trip = {
                    "title": f"{destination}{days}日游",
                    "description": f"根据您的需求，为您规划了{days}天{destination}之旅",
                    "days": [
                        {"day": i+1, "theme": f"第{i+1}天", "items": [
                            {"time": "09:00", "title": f"{destination}著名景点", "description": "根据您的偏好推荐", "location": destination},
                            {"time": "12:00", "title": "当地美食", "description": "品尝特色美食", "location": ""},
                            {"time": "14:00", "title": "游览观光", "description": "继续探索", "location": ""},
                            {"time": "18:00", "title": "晚餐/休息", "description": "结束一天的行程", "location": ""}
                        ]} for i in range(days)
                    ]
                }
                trip_data = fallback_trip
                json_text = json.dumps(fallback_trip)
            else:
                logger.error(f"AI生成行程失败: {error_str}")
                return jsonify({'success': False, 'error': 'AI生成失败，请稍后重试'}), 500

        # 解析AI返回内容
        import re
        # 尝试多种方式提取JSON
        json_text = None

        # 方法1: 尝试直接解析整个响应
        try:
            trip_data = json.loads(response_text.strip())
            json_text = response_text
        except:
            pass

        # 方法2: 尝试找到 ```json ... ``` 块
        if not json_text:
            json_blocks = re.findall(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            for block in json_blocks:
                try:
                    trip_data = json.loads(block.strip())
                    json_text = block.strip()
                    break
                except:
                    continue

        # 方法3: 尝试找到 { ... } 块
        if not json_text:
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                try:
                    trip_data = json.loads(json_match.group())
                    json_text = json_match.group()
                except:
                    pass

        if not json_text:
            logger.error(f"AI返回内容无法解析: {response_text[:500]}")
            return jsonify({'success': False, 'error': '行程生成格式错误，请重试'}), 500

        try:
            trip_data = json.loads(json_text)
        except:
            logger.error(f"JSON解析失败: {json_text[:500]}")
            return jsonify({'success': False, 'error': '行程解析失败，请重试'}), 500

        # 创建行程记录
        from datetime import datetime, timedelta
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=days)

        trip = Trip(
            user_id=user.id,
            title=trip_data.get('title', f'{destination}{days}日游'),
            description=trip_data.get('description', ''),
            start_date=start_date,
            end_date=end_date,
            status='planning'
        )
        db.session.add(trip)
        db.session.flush()  # 获取trip.id

        # 创建行程项目
        items = []
        for day_info in (trip_data.get('days') or [])[:days]:
            day_num = day_info.get('day', 1)
            for idx, item in enumerate(day_info.get('items') or []):
                trip_item = TripItem(
                    trip_id=trip.id,
                    day_number=day_num,
                    title=item.get('title', ''),
                    description=item.get('description', ''),
                    location=item.get('location', ''),
                    start_time=datetime.strptime(item.get('time', '09:00'), '%H:%M').time() if item.get('time') else None,
                    sort_order=idx
                )
                db.session.add(trip_item)
                items.append(trip_item)

        db.session.commit()

        return jsonify({
            'success': True,
            'trip': trip.to_dict(),
            'items': [item.to_dict() for item in items]
        })

    except Exception as e:
        logger.error(f"行程生成失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== 订单 API ====================

@app.route('/api/orders', methods=['POST'])
@rate_limit('orders_create', limit=20)
def create_order():
    """创建订单"""
    try:
        # 验证用户登录
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        data = request.get_json() or {}
        items = data.get('items', [])
        
        if not items:
            return jsonify({'success': False, 'error': '订单项目不能为空'}), 400
        
        # 计算总金额
        total_amount = sum(item.get('total_price', 0) for item in items)
        
        # 生成订单号
        import random
        order_no = f"TA{int(datetime.now().timestamp()*1000)}{random.randint(1000,9999)}"
        
        # 创建订单
        order = Order(
            order_no=order_no,
            user_id=user_id,
            total_amount=total_amount,
            payment_method=data.get('payment_method', 'alipay'),
            status='pending'
        )
        db.session.add(order)
        
        # 创建订单项
        for item in items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item.get('product_id'),
                product_name=item.get('product_name', ''),
                product_type=item.get('product_type', 'product'),
                quantity=item.get('quantity', 1),
                unit_price=item.get('unit_price', 0),
                total_price=item.get('total_price', 0)
            )
            db.session.add(order_item)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'order': order.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"创建订单失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/orders', methods=['GET'])
@rate_limit('orders_list', limit=60)
def get_orders():
    """获取当前用户的订单列表"""
    try:
        # 验证用户登录
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')
        
        query = Order.query.filter_by(user_id=user_id)
        if status:
            query = query.filter_by(status=status)
        
        orders = query.order_by(Order.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'orders': [o.to_dict() for o in orders.items],
            'total': orders.total,
            'page': page,
            'per_page': per_page
        })
        
    except Exception as e:
        logger.error(f"获取订单列表失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/orders/<order_no>', methods=['GET'])
@rate_limit('order_detail', limit=60)
def get_order_detail(order_no):
    """获取订单详情"""
    try:
        # 验证用户登录
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        order = Order.query.filter_by(order_no=order_no, user_id=user_id).first()
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        return jsonify({
            'success': True,
            'order': order.to_dict()
        })
        
    except Exception as e:
        logger.error(f"获取订单详情失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/orders/<order_no>/cancel', methods=['PUT', 'POST'])
@rate_limit('order_cancel', limit=20)
def cancel_order(order_no):
    """取消订单"""
    try:
        # 验证用户登录
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        order = Order.query.filter_by(order_no=order_no, user_id=user_id).first()
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        if order.status != 'pending':
            return jsonify({'success': False, 'error': '只有待支付的订单才能取消'}), 400
        
        order.status = 'cancelled'
        db.session.commit()
        
        return jsonify({'success': True, 'message': '订单已取消'})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"取消订单失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/orders/<order_no>/pay', methods=['PUT', 'POST'])
@rate_limit('order_pay', limit=20)
def pay_order(order_no):
    """支付订单（模拟）"""
    try:
        # 验证用户登录
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权'}), 401
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': '无效的token'}), 401
        
        order = Order.query.filter_by(order_no=order_no, user_id=user_id).first()
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        if order.status != 'pending':
            return jsonify({'success': False, 'error': '订单状态不正确'}), 400
        
        order.status = 'paid'
        order.payment_time = datetime.now()
        db.session.commit()
        
        return jsonify({'success': True, 'message': '支付成功'})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"支付订单失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


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