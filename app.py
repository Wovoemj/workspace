"""
智能旅游助手 - Flask主应用（性能优化版）

【文件功能说明】
- 这是项目的主Flask应用，提供所有API接口
- 包含Redis缓存、API限流、查询优化等性能增强功能
- 支持用户认证（JWT）、角色权限管理
- 提供景点、用户、订单、产品等完整CRUD接口

【主要模块】
1. 日志配置 - 记录系统运行状态和错误信息
2. Redis缓存配置 - 延迟初始化，支持内存兜底
3. API限流 - 防止恶意请求，保护服务器资源
4. 用户认证 - JWT令牌签发与验证
5. 景点接口 - 景点的CRUD操作
6. 用户接口 - 用户注册、登录、资料管理
7. 订单接口 - 订单创建、支付、取消、退款
8. 产品接口 - 产品管理和搜索

【性能优化】
- Redis缓存：减少数据库查询
- 内存缓存兜底：Redis不可用时自动切换
- API限流：防止恶意请求
- 查询优化：使用索引和分页
"""

# ==================== 模块导入部分 ===================
# 导入Flask框架核心模块
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
# 导入WSGI代理修复中间件（用于反向代理环境如Nginx）
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

# 加载.env文件中的环境变量（包含数据库URI、密钥等敏感信息）
load_dotenv()


# ==================== 日志配置部分 ===================
# 检查logs目录是否存在
if not os.path.exists('logs'):
    # 如果不存在则创建logs目录
    os.makedirs('logs')

# 定义日志文件路径
log_file = 'logs/travel_assistant.log'
# 创建轮转文件日志处理器
# maxBytes=10000000：单个日志文件最大10MB
# backupCount=5：保留最近5个日志文件
handler = RotatingFileHandler(log_file, maxBytes=10000000, backupCount=5)
# 设置日志格式：时间 级别 消息
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s %(message)s'
))
# 获取当前模块的日志记录器
logger = logging.getLogger(__name__)
# 设置日志级别为INFO（记录INFO及以上级别的日志）
logger.setLevel(logging.INFO)
# 将处理器添加到日志记录器
logger.addHandler(handler)


# ==================== Redis缓存配置（Lazy Init） ===================
# Redis客户端，延迟初始化（首次使用时才创建连接）
# 这样可以避免启动时Redis不可用导致程序退出
_redis_client = None
# Redis可用状态：None=未检测, True=可用, False=不可用
_redis_available: bool | None = None

def get_redis():
    """
    获取Redis客户端实例（延迟初始化）
    
    【功能】
    - 首次调用时创建Redis连接
    - 如果连接失败，标记为不可用并不再重试（避免每次请求都尝试连接）
    - 返回Redis客户端或None
    
    【返回】
    - Redis客户端实例 或 None
    """
    global _redis_client, _redis_available
    # 如果已知Redis不可用，直接返回None（不再重试）
    if _redis_available is False:
        return None
    # 如果已经初始化，直接返回
    if _redis_client is not None:
        return _redis_client
    
    try:
        # 创建Redis客户端实例
        _redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),      # Redis服务器地址
            port=int(os.getenv('REDIS_PORT', '6379')),      # Redis端口
            db=int(os.getenv('REDIS_DB', '0')),              # Redis数据库编号
            password=os.getenv('REDIS_PASSWORD') or None,   # Redis密码（如果没有则为None）
            decode_responses=True,                                  # 自动将字节串解码为字符串
            socket_connect_timeout=0.5,                             # 连接超时0.5秒（快速失败）
            socket_timeout=1                                        # 命令执行超时1秒
        )
        # 测试Redis连接是否正常
        _redis_client.ping()
        _redis_available = True
        logger.info("Redis 连接成功")
    except Exception as e:
        # 连接失败，记录警告日志
        logger.warning(f"Redis 不可用，缓存和限流功能已禁用: {e}")
        _redis_client = None
        _redis_available = False  # 标记为不可用，后续不再尝试
    return _redis_client


# 兼容旧代码：提供redis_client属性访问
class _RedisClientProxy:
    """Redis客户端代理，支持延迟初始化"""
    def __getattr__(self, name):
        # 获取Redis客户端（延迟初始化）
        client = get_redis()
        if client is None:
            # 如果Redis不可用，返回一个什么都不做的空函数
            return lambda *args, **kwargs: None
        # 返回Redis客户端的实际属性/方法
        return getattr(client, name)

# 创建Redis客户端代理实例
redis_client = _RedisClientProxy()

# 从环境变量获取默认缓存过期时间（秒），默认300秒（5分钟）
DEFAULT_CACHE_TIMEOUT = int(os.getenv('CACHE_TTL', '300'))


# ==================== 进程内内存缓存兜底 ===================
# 当Redis不可用时，使用进程内内存缓存作为兜底方案
# 格式：{key: (value, expire_at)}，其中expire_at是过期时间戳
_mem_cache: dict[str, tuple[str, float]] = {}

def redis_cache_get(cache_key: str) -> str | None:
    """
    从Redis缓存获取值
    
    【功能】
    - 优先从Redis缓存获取
    - Redis不可用时，从内存缓存获取
    
    【参数】
    - cache_key: 缓存键名
    
    【返回】
    - 缓存值 或 None
    """
    try:
        # 尝试从Redis获取缓存值
        val = cast(str | None, cast(Any, redis_client).get(cache_key))
        if val is not None:
            return val
    except Exception:
        pass
    # Redis不可用，查内存缓存
    entry = _mem_cache.get(cache_key)
    if entry:
        value, expire_at = entry
        if time.time() < expire_at:
            return value
        else:
            # 已过期，删除
            _mem_cache.pop(cache_key, None)
    return None


def redis_cache_set(cache_key: str, value: str, timeout: int = DEFAULT_CACHE_TIMEOUT) -> None:
    """
    设置Redis缓存值并指定过期时间
    
    【功能】
    - 优先写入Redis缓存
    - Redis不可用时，写入内存缓存
    
    【参数】
    - cache_key: 缓存键名
    - value: 要缓存的值
    - timeout: 过期时间（秒）
    """
    try:
        # 尝试写入Redis（带过期时间）
        cast(Any, redis_client).setex(cache_key, timeout, value)
        return
    except Exception:
        pass
    # Redis不可用，写内存缓存
    _mem_cache[cache_key] = (value, time.time() + timeout)
    # 简单清理：超过500条时删掉已过期的
    if len(_mem_cache) > 500:
        now = time.time()
        expired = [k for k, (_, exp) in _mem_cache.items() if now > exp]
        for k in expired:
            _mem_cache.pop(k, None)


def redis_cache_delete_pattern(prefix: str) -> None:
    """
    删除匹配指定前缀的所有缓存键
    
    【功能】
    - 用于批量删除相关缓存（如更新景点后删除所有景点缓存）
    
    【参数】
    - prefix: 键名前缀（如"destination:"）
    """
    try:
        # 使用SCAN命令遍历匹配指定前缀的所有键
        for key in cast(Any, redis_client).scan_iter(f"{prefix}*"):
            # 删除匹配的键
            cast(Any, redis_client).delete(key)
    except Exception:
        # Redis不可用时也清理内存缓存
        keys_to_del = [k for k in _mem_cache if k.startswith(prefix)]
        for k in keys_to_del:
            _mem_cache.pop(k, None)
        pass


# ==================== API限流配置 ===================
# 定义不同用户等级的请求限制配置
# 普通用户：每分钟最多100次请求
# 高级用户：每分钟最多500次请求
RATE_LIMIT = {
    'normal': 100,
    'premium': 500,
}

# 定义泛型类型变量F，用于装饰器类型注解
F = TypeVar("F", bound=Callable[..., Any])


def rate_limit(limit_key: str, limit: int = 100) -> Callable[[F], F]:
    """
    API限流装饰器
    
    【功能】
    - 限制每个用户每分钟的请求次数
    - 使用Redis有序集合（Sorted Set）存储请求时间戳
    - 自动清理60秒前的旧记录
    - Redis不可用时跳过限流（降级处理）
    
    【参数】
    - limit_key: 限流键名（用于区分不同接口）
    - limit: 限制次数（默认100次/分钟）
    
    【返回】
    - 装饰器函数
    """
    def decorator(f: F) -> F:
        @wraps(f)  # 保留原函数的元信息（函数名、文档字符串等）
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
                # 设置键的过期时间为60秒（自动清理）
                cast(Any, redis_client).expire(key, 60)
            except Exception:
                # Redis不可用时跳过限流，直接放行（降级处理）
                pass
            
            # 执行原函数
            return f(*args, **kwargs)
        # 将装饰后的函数转换为正确的类型并返回
        return cast(F, decorated_function)
    # 返回装饰器函数
    return decorator


def cache_response(timeout: int = 300, key_prefix: str = 'default') -> Callable[[F], F]:
    """
    缓存响应装饰器
    
    【功能】
    - 自动缓存GET请求的响应
    - 下次相同请求直接返回缓存，减少服务器负载
    - 本地开发环境跳过缓存
    
    【参数】
    - timeout: 缓存过期时间（秒），默认300秒
    - key_prefix: 缓存键前缀（用于区分不同接口）
    """
    def decorator(f: F) -> F:
        @wraps(f)
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            # 本地开发环境跳过缓存（方便调试）
            if os.getenv('FLASK_ENV') != 'production':
                return f(*args, **kwargs)
            
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
                # 添加HTTP缓存头（让浏览器也缓存）
                response.headers['Cache-Control'] = f'public, max-age={timeout}'
                response.headers['X-Cache'] = 'HIT'
                return response
            
            # 缓存未命中，执行原视图函数获取响应
            response = f(*args, **kwargs)
            
            # 如果响应状态码为200（成功），则缓存响应内容
            if response.status_code == 200:
                # 将响应内容设置为字符串并缓存
                redis_cache_set(cache_key, response.get_data(as_text=True), timeout=timeout)
                # 添加HTTP缓存头
                response.headers['Cache-Control'] = f'public, max-age={timeout}'
                response.headers['X-Cache'] = 'MISS'
            
            # 返回响应对象
            return response
        return cast(F, decorated_function)
    return decorator


def add_cache_headers(response: Any, max_age: int = 300) -> Any:
    """为响应添加HTTP缓存头"""
    if hasattr(response, 'headers'):
        response.headers['Cache-Control'] = f'public, max-age={max_age}'
        response.headers['Expires'] = (datetime.utcnow() + timedelta(seconds=max_age)).strftime('%a, %d %b %Y %H:%M:%S GMT')
    return response


def generate_etag(data: Any) -> str:
    """生成ETag用于HTTP缓存验证"""
    return hashlib.md5(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()


# ==================== Flask应用初始化 ===================
# 创建Flask应用实例
app = Flask(__name__)

# ==================== 核心配置 ===================
# JWT密钥（用于签发和验证令牌）
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'travel-assistant-secret-key-2024')
# 禁用SQLAlchemy事件系统（性能优化）
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# 数据库连接URI（可从环境变量覆盖）
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'mysql+pymysql://root:123456@localhost:3306/travel_assistant?charset=utf8mb4'
)

# ==================== 扩展初始化 ===================
# 初始化SQLAlchemy（数据库ORM）
db = SQLAlchemy(app)
# 初始化CORS（允许跨域请求）
CORS(app, supports_credentials=True)

@app.after_request
def add_security_headers(response: Any) -> Any:
    """添加安全相关和性能优化相关的HTTP响应头"""
    # 安全相关头部
    response.headers['X-Content-Type-Options'] = 'nosniff'           # 阻止浏览器嗅探MIME类型
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'           # 只允许同源网站嵌入iframe
    response.headers['X-XSS-Protection'] = '1; mode=block'      # 启用XSS过滤保护
    
    # CORS头部（跨域资源共享）
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    
    return response

# 配置WSGI代理修复，支持反向代理环境（如Nginx）
# 这会正确处理X-Forwarded-For等代理头
app.wsgi_app = ProxyFix(app.wsgi_app)  # type: ignore[assignment]


# ==================== 健康检查接口 ====================

@app.route('/api/health')
def health_check():
    """
    健康检查接口
    
    【功能】
    - 提供简单的健康检查端点
    - 返回服务器状态和时间戳
    - 可被负载均衡器或监控工具调用
    
    【返回】
    - JSON格式：{"status": "ok", "timestamp": "..."}
    """
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'travel-assistant'
    })


# ==================== 统计接口 ====================

@app.route('/stats')
@app.route('/api/stats')
def get_stats():
    """
    获取统计数据
    
    【功能】
    - 查询各个表的记录数
    - 返回JSON格式的统计信息
    - 用于管理后台仪表盘展示
    
    【返回】
    - JSON格式：{"stats": {"destinations": N, "trips": N, ...}}
    """
    try:
        # 初始化统计数据字典
        stats = {
            'destinations': 0,
            'trips': 0,
            'users': 0,
            'pages': 0,
            'configs': 0
        }
        
        # 尝试查询各个表的记录数（使用try-except防止某个表不存在导致整个接口失败）
        try:
            from models import Destination
            stats['destinations'] = Destination.query.count()
        except Exception as e:
            print(f"查询目的地失败: {e}")
            pass
        
        try:
            from models import Trip
            stats['trips'] = Trip.query.count()
        except Exception as e:
            print(f"查询行程失败: {e}")
            pass
        
        try:
            from models import User
            stats['users'] = User.query.count()
        except Exception as e:
            print(f"查询用户失败: {e}")
            pass
        
        try:
            from models import Page
            stats['pages'] = Page.query.count()
        except Exception as e:
            print(f"查询页面失败: {e}")
            pass
        
        try:
            from models import Config
            stats['configs'] = Config.query.count()
        except Exception as e:
            print(f"查询配置失败: {e}")
            pass
        
        # 返回统计数据
        return jsonify({'stats': stats})
    except Exception as e:
        # 捕获所有异常，返回错误信息（500状态码）
        return jsonify({'error': str(e)}), 500


# ==================== 用户认证接口 ====================

@app.route('/api/users/register', methods=['POST'])
def user_register():
    """
    用户注册接口
    
    【功能】
    - 接收用户名、密码、邮箱等注册信息
    - 检查用户名是否已存在
    - 密码加密后存储
    - 返回注册结果
    
    【请求体】
    {
        "username": "用户名",
        "password": "密码",
        "email": "邮箱（可选）"
    }
    
    【返回】
    - 成功：{"success": true, "message": "注册成功"}
    - 失败：{"success": false, "message": "错误信息"}
    """
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '').strip()
        
        # 参数验证
        if not username or not password:
            return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
        
        # 检查用户是否已存在
        from models import User
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'success': False, 'message': '用户名已存在'}), 400
        
        # 创建新用户
        password_hash = generate_password_hash(password)
        new_user = User(
            username=username,
            password_hash=password_hash,
            email=email if email else None,
            role='user',
            created_at=datetime.utcnow()
        )
        
        # 保存到数据库
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '注册成功'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"用户注册失败: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/users/login', methods=['POST'])
def user_login():
    """
    用户登录接口
    
    【功能】
    - 验证用户名和密码
    - 验证成功后生成JWT令牌
    - 返回令牌和用户信息
    
    【请求体】
    {
        "username": "用户名",
        "password": "密码"
    }
    
    【返回】
    - 成功：{"success": true, "token": "...", "user": {...}}
    - 失败：{"success": false, "message": "错误信息"}
    """
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        # 参数验证
        if not username or not password:
            return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
        
        # 查询用户
        from models import User
        user = User.query.filter_by(username=username).first()
        
        # 验证用户是否存在和密码是否正确
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
        
        # 生成JWT令牌
        payload = {
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(days=7)  # 7天过期
        }
        token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
        
        # 返回令牌和用户信息
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        })
    except Exception as e:
        logger.error(f"用户登录失败: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/users/me', methods=['GET'])
def get_current_user():
    """
    获取当前登录用户信息
    
    【功能】
    - 从请求头获取Authorization令牌
    - 验证令牌有效性
    - 返回用户信息
    
    【请求头】
    - Authorization: Bearer <token>
    
    【返回】
    - 成功：{"success": true, "user": {...}}
    - 失败：{"success": false, "message": "错误信息"}
    """
    try:
        # 获取Authorization头
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': '未提供令牌'}), 401
        
        # 提取令牌
        token = auth_header.split(' ')[1]
        
        # 验证令牌
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': '令牌已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': '无效的令牌'}), 401
        
        # 查询用户信息
        from models import User
        user = User.query.get(payload['user_id'])
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 返回用户信息
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        })
    except Exception as e:
        logger.error(f"获取用户信息失败: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== 应用启动入口 ====================
if __name__ == '__main__':
    """
    应用启动入口
    
    【功能】
    - 启动Flask开发服务器
    - 默认监听 0.0.0.0:5001（与 start.py 配置一致）
    - 开启调试模式（debug=True），支持热重载
    
    【使用】
    python app.py
    """
    # 启动Flask应用
    # host='0.0.0.0'：监听所有网络接口，允许外部访问
    # port=5001：与 start.py 中的 BACKEND_PORT 保持一致
    # debug=True：开启调试模式，代码修改后自动重启
    app.run(host='0.0.0.0', port=5001, debug=True)





