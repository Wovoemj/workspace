"""
智能旅游助手 - 性能优化版
包含Redis缓存、API限流、查询优化等性能增强功能
"""
from flask import Flask, jsonify, request, abort
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
from sqlalchemy import text
from dotenv import load_dotenv
import redis
import json
import time
from functools import wraps
from typing import Any, Callable, TypeVar, cast
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
import hashlib
import logging
from logging.handlers import RotatingFileHandler
import os
import jwt

load_dotenv()

# 配置日志
if not os.path.exists('logs'):
    os.makedirs('logs')

log_file = 'logs/travel_assistant.log'
handler = RotatingFileHandler(log_file, maxBytes=10000000, backupCount=5)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s %(message)s'
))
# 配置日志
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(handler)

# Redis配置
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', '6379')),
    db=int(os.getenv('REDIS_DB', '0')),
    password=os.getenv('REDIS_PASSWORD') or None,
    decode_responses=True,  # 响应对象decode_responses  # 响应对象decode_responses  # 响应对象decode_responses
    socket_connect_timeout=int(os.getenv('REDIS_SOCKET_CONNECT_TIMEOUT', '5')),
    socket_timeout=int(os.getenv('REDIS_SOCKET_TIMEOUT', '5'))
)

DEFAULT_CACHE_TIMEOUT = int(os.getenv('CACHE_TTL', '300'))


def redis_cache_get(cache_key: str) -> str | None:
    return cast(str | None, cast(Any, redis_client).get(cache_key))


def redis_cache_set(cache_key: str, value: str, timeout: int = DEFAULT_CACHE_TIMEOUT) -> None:
    cast(Any, redis_client).setex(cache_key, timeout, value)


def redis_cache_delete_pattern(prefix: str) -> None:
    for key in cast(Any, redis_client).scan_iter(f"{prefix}*"):  # 遍历key  # 遍历key  # 遍历key
        cast(Any, redis_client).delete(key)

# API限流配置
RATE_LIMIT = {  # 数量限制RATE_LIMIT  # 数量限制RATE_LIMIT  # 数量限制RATE_LIMIT
    'normal': 100,  # 普通用户每分钟100次请求
    'premium': 500,  # 高级用户每分钟500次请求
}

F = TypeVar("F", bound=Callable[..., Any])


def rate_limit(limit_key: str, limit: int = 100) -> Callable[[F], F]:
    """API限流装饰器"""
    def decorator(f: F) -> F:
        @wraps(f)  # 装饰器  # 装饰器  # 装饰器
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            # 获取用户IP或用户ID
            user_id = request.headers.get('X-User-ID', request.remote_addr)

            # 生成限流键
            key = f"rate_limit:{limit_key}:{user_id}"

            # 获取当前时间戳
            current_time = int(time.time())

            # 删除过期的记录
            cast(Any, redis_client).zremrangebyscore(key, 0, current_time - 60)

            # 检查是否超过限制
            current_count = cast(int, cast(Any, redis_client).zcard(key))  # 计数变量current_count  # 计数变量current_count  # 计数变量current_count
            if current_count >= limit:
                return jsonify({  # 返回JSON响应
                    'success': False,
                    'message': '请求过于频繁，请稍后再试',
                    'code': 'RATE_LIMIT_EXCEEDED'
                }), 429

            # 添加当前请求
            cast(Any, redis_client).zadd(key, {str(current_time): current_time})
            cast(Any, redis_client).expire(key, 60)

            return f(*args, **kwargs)
        return cast(F, decorated_function)
    return decorator


def cache_response(timeout: int = 300, key_prefix: str = 'default') -> Callable[[F], F]:
    """缓存响应装饰器"""
    def decorator(f: F) -> F:
        @wraps(f)  # 装饰器  # 装饰器  # 装饰器
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            # 生成缓存键
            cache_key = f"{key_prefix}:{request.path}:{hashlib.md5(str(request.args).encode()).hexdigest()}"

            # 尝试从缓存获取
            cached_response = redis_cache_get(cache_key)  # 响应对象cached_response  # 响应对象cached_response  # 响应对象cached_response
            if cached_response:
                logger.info(f"Cache hit for {cache_key}")
                return jsonify(json.loads(cached_response))  # 返回JSON响应

            # 执行函数
            response = f(*args, **kwargs)  # 响应对象response  # 响应对象response  # 响应对象response

            # 缓存响应
            if response.status_code == 200:
                redis_cache_set(cache_key, response.get_data(as_text=True), timeout=timeout)

            return response
        return cast(F, decorated_function)
    return decorator

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)  # type: ignore[assignment]
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'travel-assistant-dev-secret-change-me')  # 配置参数app.config['SECRET_KEY']  # 配置参数app.config['SECRET_KEY']  # 配置参数app.config['SECRET_KEY']
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///instance/travel.db')  # 配置参数app.config['SQLALCHEMY_DATABASE_URI']  # 配置参数app.config['SQLALCHEMY_DATABASE_URI']  # 配置参数app.config['SQLALCHEMY_DATABASE_URI']
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # 配置参数app.config['SQLALCHEMY_TRACK_MODIFICATIONS']  # 配置参数app.config['SQLALCHEMY_TRACK_MODIFICATIONS']  # 配置参数app.config['SQLALCHEMY_TRACK_MODIFICATIONS']
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {  # 配置参数app.config['SQLALCHEMY_ENGINE_OPTIONS']  # 配置参数app.config['SQLALCHEMY_ENGINE_OPTIONS']  # 配置参数app.config['SQLALCHEMY_ENGINE_OPTIONS']
    'pool_recycle': 3600,
    'pool_pre_ping': True,
    'pool_size': 20,
    'max_overflow': 30,
}

db = SQLAlchemy(app)
CORS(app)

# ==================== 数据库模型 ====================

class Destination(db.Model):
    """景点模型 - 添加索引优化"""
    __tablename__ = 'destinations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    city = db.Column(db.String(100), nullable=False, index=True)
    province = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.Text)
    cover_image = db.Column(db.String(500))
    rating = db.Column(db.Float, default=5.0, index=True)
    ticket_price = db.Column(db.Float, default=0, index=True)
    open_time = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, index=True)

    # 添加全文搜索索引
    __table_args__ = (
        db.Index('idx_destination_name_city', 'name', 'city'),
        db.Index('idx_destination_rating_price', 'rating', 'ticket_price'),
    )

    def to_dict(self):
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class User(db.Model):
    """用户模型"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, index=True)
    phone = db.Column(db.String(20), unique=True, index=True)
    password_hash = db.Column(db.String(255))
    is_admin = db.Column(db.Boolean, default=False)
    avatar = db.Column(db.String(500))
    membership_level = db.Column(db.Integer, default=1, index=True)
    preferences = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    last_login = db.Column(db.DateTime, index=True)

    def to_dict(self):
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
    """行程模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.Date, index=True)
    end_date = db.Column(db.Date, index=True)
    status = db.Column(db.String(20), default='planning', index=True)  # 状态变量status  # 状态变量status  # 状态变量status
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TripItem(db.Model):
    """行程项目模型"""
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False, index=True)
    destination_id = db.Column(db.Integer, db.ForeignKey('destination.id'), index=True)
    day_number = db.Column(db.Integer, nullable=False, index=True)
    title = db.Column(db.String(200))
    description = db.Column(db.Text)
    location = db.Column(db.String(200))
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    sort_order = db.Column(db.Integer, default=0)  # 排序条件sort_order  # 排序条件sort_order  # 排序条件sort_order
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'trip_id': self.trip_id,
            'destination_id': self.destination_id,
            'day_number': self.day_number,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'sort_order': self.sort_order
        }


class UserLike(db.Model):
    """用户点赞模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    destination_id = db.Column(db.Integer, db.ForeignKey('destination.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'destination_id': self.destination_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# ==================== 认证与权限 ====================

def _is_admin_user(user: User) -> bool:
    """管理权限判定规则"""
    if getattr(user, 'is_admin', False):
        return True
    try:
        threshold = int(os.getenv("ADMIN_MEMBERSHIP_LEVEL", "9").strip() or "9")
    except Exception:
        threshold = 9
    return int(user.membership_level or 1) >= threshold


def _issue_jwt(user_id: int) -> str:
    """签发 JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, os.getenv('SECRET_KEY', 'travel-secret-key-2024'), algorithm='HS256')


def _current_user_or_401():
    """从请求中获取当前用户，未登录返回401"""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        abort(401, description="Missing or invalid Authorization header")
    token = auth[7:]  # 令牌配置token  # 令牌配置token  # 令牌配置token
    try:
        payload = jwt.decode(token, os.getenv('SECRET_KEY', 'travel-secret-key-2024'), algorithms=['HS256'])
        user_id = payload.get('user_id')
        if not user_id:
            abort(401, description="Invalid token payload")
        user = User.query.get(user_id)
        if not user:
            abort(401, description="User not found")
        return user
    except jwt.ExpiredSignatureError:
        abort(401, description="Token expired")
    except jwt.InvalidTokenError:
        abort(401, description="Invalid token")


# ==================== 管理员登录接口 ====================

@app.route('/api/admin/login', methods=['POST'])  # 定义路由端点
def api_admin_login():
    """管理员专属登录接口，支持用户名或邮箱登录"""
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    identifier = username or email
    if not identifier:
        return jsonify({"success": False, "error": "用户名或邮箱为必填"}), 400  # 返回JSON响应
    if not password:
        return jsonify({"success": False, "error": "密码为必填"}), 400  # 返回JSON响应

    user = None
    if username:
        user = User.query.filter_by(username=username).first()
    if not user and email:
        user = User.query.filter_by(email=email.lower()).first()
    if not user:
        return jsonify({"success": False, "error": "用户不存在"}), 404  # 返回JSON响应
    if not user.password_hash or not check_password_hash(user.password_hash, password):
        return jsonify({"success": False, "error": "密码错误"}), 401  # 返回JSON响应
    if not _is_admin_user(user):
        return jsonify({"success": False, "error": "该账号不具备管理员权限"}), 403  # 返回JSON响应

    token = _issue_jwt(user.id)  # 令牌配置token  # 令牌配置token  # 令牌配置token
    return jsonify({"success": True, "token": token, "user": user.to_dict()})  # 返回JSON响应


# ==================== 优化的API路由 ====================

@app.route('/api/destinations', methods=['GET'])  # 定义路由端点
@rate_limit('destinations', limit=100)  # 装饰器  # 装饰器  # 装饰器
@cache_response(timeout=300, key_prefix='destinations')  # 缓存装饰器  # 缓存装饰器  # 缓存装饰器
def get_destinations():  # 获取destinations数据  # 获取destinations数据  # 获取destinations数据
    """获取所有景点 - 优化版本"""
    start_time = time.time()

    page = request.args.get('page', 1, type=int)  # 页码page  # 页码page  # 页码page
    per_page = min(request.args.get('per_page', 20, type=int), 100)  # 限制最大每页数量  # 页码per_page  # 页码per_page  # 页码per_page
    keyword = request.args.get('keyword', '').strip()
    city = request.args.get('city', '').strip()
    min_rating = request.args.get('min_rating', type=float)
    max_price = request.args.get('max_price', type=float)
    sort_by = request.args.get('sort_by', 'created_at')
    order = request.args.get('order', 'desc')  # 排序条件order  # 排序条件order  # 排序条件order

    query = Destination.query  # 查询对象query  # 查询对象query  # 查询对象query

    # 构建查询条件
    if keyword:
        query = query.filter(  # 查询对象query  # 查询对象query  # 查询对象query
            db.or_(
                Destination.name.ilike(f'%{keyword}%'),
                Destination.description.ilike(f'%{keyword}%'),
                Destination.city.ilike(f'%{keyword}%')
            )
        )

    if city:
        query = query.filter(Destination.city.ilike(f'%{city}%'))  # 查询对象query  # 查询对象query  # 查询对象query

    if min_rating:
        query = query.filter(Destination.rating >= min_rating)  # 查询对象query  # 查询对象query  # 查询对象query

    if max_price:
        query = query.filter(Destination.ticket_price <= max_price)  # 查询对象query  # 查询对象query  # 查询对象query

    # 排序
    if sort_by == 'rating':
        sort_column = Destination.rating
    elif sort_by == 'price':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
        sort_column = Destination.ticket_price
    elif sort_by == 'name':  # 否则如果满足此条件  # 否则如果满足此条件  # 否则如果满足此条件
        sort_column = Destination.name
    else:  # 否则执行  # 否则执行  # 否则执行
        sort_column = Destination.created_at

    if order == 'desc':
        query = query.order_by(sort_column.desc())  # 查询对象query  # 查询对象query  # 查询对象query
    else:  # 否则执行  # 否则执行  # 否则执行
        query = query.order_by(sort_column.asc())  # 查询对象query  # 查询对象query  # 查询对象query

    # 分页查询
    pagination = query.paginate(
        page=page,  # 页码page  # 页码page  # 页码page
        per_page=per_page,  # 页码per_page  # 页码per_page  # 页码per_page
        error_out=False  # 错误信息error_out  # 错误信息error_out  # 错误信息error_out
    )

    # 记录查询性能
    query_time = time.time() - start_time  # 查询对象query_time  # 查询对象query_time  # 查询对象query_time
    logger.info(f"景点查询耗时: {query_time:.3f}s, 页码: {page}, 每页: {per_page}")

    return jsonify({  # 返回JSON响应
        'success': True,
        'destinations': [d.to_dict() for d in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages_count': pagination.pages,
        'query_time': round(query_time, 3),
        'per_page': per_page
    })


@app.route('/api/destinations/<int:id>', methods=['GET'])  # 定义路由端点
@rate_limit('destinations_detail', limit=200)  # 装饰器  # 装饰器  # 装饰器
@cache_response(timeout=600, key_prefix='destination_detail')  # 缓存装饰器  # 缓存装饰器  # 缓存装饰器
def get_destination(id: int):  # 获取destination数据  # 获取destination数据  # 获取destination数据
    """获取单个景点 - 优化版本"""
    start_time = time.time()

    # 先从缓存获取
    cache_key = f"destination:{id}"
    cached_destination = redis_cache_get(cache_key)
    if cached_destination:
        logger.info(f"缓存命中: {cache_key}")
        return jsonify({'success': True, 'destination': json.loads(cached_destination)})  # 返回JSON响应

    # 从数据库查询
    destination = Destination.query.get_or_404(id)

    # 缓存结果
    redis_cache_set(cache_key, json.dumps(destination.to_dict()), timeout=600)

    query_time = time.time() - start_time  # 查询对象query_time  # 查询对象query_time  # 查询对象query_time
    logger.info(f"景点详情查询耗时: {query_time:.3f}s")

    return jsonify({'success': True, 'destination': destination.to_dict()})  # 返回JSON响应


@app.route('/api/destinations', methods=['POST'])  # 定义路由端点
@rate_limit('destinations_create', limit=20)  # 装饰器  # 装饰器  # 装饰器
def create_destination():  # 创建destination  # 创建destination  # 创建destination
    """创建景点 - 优化版本"""
    start_time = time.time()

    data = request.get_json()

    # 输入验证
    required_fields = ['name', 'city', 'province']
    for field in required_fields:  # 遍历field  # 遍历field  # 遍历field
        if field not in data or not data[field]:  # 检查是否包含  # 检查是否包含  # 检查是否包含
            return jsonify({  # 返回JSON响应
                'success': False,
                'message': f'缺少必填字段: {field}',
                'code': 'MISSING_REQUIRED_FIELD'
            }), 400

    # 创建景点
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

    db.session.add(destination)
    db.session.commit()

    # 清除相关缓存
    redis_cache_delete_pattern('destinations:')
    redis_cache_delete_pattern('destination_detail:')
    redis_cache_delete_pattern('destination:')
    redis_cache_delete_pattern('stats:')

    query_time = time.time() - start_time  # 查询对象query_time  # 查询对象query_time  # 查询对象query_time
    logger.info(f"创建景点耗时: {query_time:.3f}s")

    return jsonify({  # 返回JSON响应
        'success': True,
        'destination': destination.to_dict(),
        'query_time': round(query_time, 3)
    }), 201


@app.route('/api/trips', methods=['GET'])  # 定义路由端点
@rate_limit('trips', limit=50)  # 装饰器  # 装饰器  # 装饰器
@cache_response(timeout=180, key_prefix='trips')  # 缓存装饰器  # 缓存装饰器  # 缓存装饰器
def get_trips():  # 获取trips数据  # 获取trips数据  # 获取trips数据
    """获取所有行程 - 优化版本"""
    start_time = time.time()

    user_id = request.args.get('user_id', type=int)
    status = request.args.get('status')  # 状态变量status  # 状态变量status  # 状态变量status

    query = Trip.query  # 查询对象query  # 查询对象query  # 查询对象query
    if user_id:
        query = query.filter_by(user_id=user_id)  # 查询对象query  # 查询对象query  # 查询对象query
    if status:
        query = query.filter_by(status=status)  # 查询对象query  # 查询对象query  # 查询对象query

    trips = query.order_by(Trip.created_at.desc()).all()

    query_time = time.time() - start_time  # 查询对象query_time  # 查询对象query_time  # 查询对象query_time
    logger.info(f"行程查询耗时: {query_time:.3f}s")

    return jsonify({  # 返回JSON响应
        'success': True,
        'trips': [t.to_dict() for t in trips],
        'query_time': round(query_time, 3)
    })


@app.route('/api/stats', methods=['GET'])  # 定义路由端点
@rate_limit('stats', limit=10)  # 装饰器  # 装饰器  # 装饰器
@cache_response(timeout=60, key_prefix='stats')  # 缓存装饰器  # 缓存装饰器  # 缓存装饰器
def get_stats():  # 获取stats数据  # 获取stats数据  # 获取stats数据
    """获取统计信息 - 优化版本"""
    start_time = time.time()

    # 从缓存获取统计信息
    cache_key = 'stats:all'
    cached_stats = redis_cache_get(cache_key)
    if cached_stats:
        logger.info(f"统计信息缓存命中: {cache_key}")
        return jsonify({'success': True, 'stats': json.loads(cached_stats)})  # 返回JSON响应

    # 计算统计信息
    stats = {
        'destinations': Destination.query.count(),
        'users': User.query.count(),
        'trips': Trip.query.count(),
        'user_likes': UserLike.query.count(),
        'avg_rating': round(Destination.query.with_entities(db.func.avg(Destination.rating)).scalar() or 0, 2),
        'total_revenue': round(Destination.query.with_entities(db.func.sum(Destination.ticket_price)).scalar() or 0, 2)
    }

    # 缓存统计信息
    redis_cache_set(cache_key, json.dumps(stats), timeout=60)

    query_time = time.time() - start_time  # 查询对象query_time  # 查询对象query_time  # 查询对象query_time
    logger.info(f"统计信息查询耗时: {query_time:.3f}s")

    return jsonify({  # 返回JSON响应
        'success': True,
        'stats': stats,
        'query_time': round(query_time, 3)
    })


@app.route('/api/health', methods=['GET'])  # 定义路由端点
def health_check():
    """健康检查 - 优化版本"""
    start_time = time.time()

    # 检查数据库连接
    try:
        db.session.execute(text('SELECT 1'))
        db_status = 'healthy'  # 状态变量db_status  # 状态变量db_status  # 状态变量db_status
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'  # 状态变量db_status  # 状态变量db_status  # 状态变量db_status
        logger.error(f"数据库健康检查失败: {e}")

    # 检查Redis连接
    try:
        cast(Any, redis_client).ping()
        redis_status = 'healthy'  # 状态变量redis_status  # 状态变量redis_status  # 状态变量redis_status
    except Exception as e:
        redis_status = f'unhealthy: {str(e)}'  # 状态变量redis_status  # 状态变量redis_status  # 状态变量redis_status
        logger.error(f"Redis健康检查失败: {e}")

    # 检查内存缓存
    cache_status = 'healthy' if redis_status == 'healthy' else 'degraded'  # 状态变量cache_status  # 状态变量cache_status  # 状态变量cache_status

    query_time = time.time() - start_time  # 查询对象query_time  # 查询对象query_time  # 查询对象query_time

    return jsonify({  # 返回JSON响应
        'success': True,
        'status': 'healthy' if db_status == 'healthy' and redis_status == 'healthy' else 'degraded',  # 状态变量'status': 'healthy' if db_status  # 状态变量'status': 'healthy' if db_status  # 状态变量'status': 'healthy' if db_status
        'database': db_status,
        'redis': redis_status,
        'cache': cache_status,
        'response_time': round(query_time, 3),
        'timestamp': datetime.now().isoformat()
    })


# ==================== 初始化函数 ====================

def init_db():
    """初始化数据库 - 优化版本"""
    start_time = time.time()

    with app.app_context():
        db.create_all()

        # 检查是否已有数据
        if Destination.query.count() > 0:
            logger.info("✅ 数据库已存在，跳过初始化")
            return

        logger.info("🌱 初始化基础数据...")

        # 初始化默认配置
        configs = [  # 配置参数configs  # 配置参数configs  # 配置参数configs
            {'key': 'site_name', 'value': '智能旅游助手', 'value_type': 'string', 'category': 'basic', 'is_public': True},
            {'key': 'site_description', 'value': '您的专属智能旅游规划助手', 'value_type': 'string', 'category': 'basic', 'is_public': True},
            {'key': 'contact_email', 'value': 'contact@travel-assistant.com', 'value_type': 'string', 'category': 'contact', 'is_public': True},
            {'key': 'enable_caching', 'value': 'true', 'value_type': 'bool', 'category': 'performance', 'is_public': False},
            {'key': 'cache_timeout', 'value': '300', 'value_type': 'int', 'category': 'performance', 'is_public': False},
        ]

        # 创建示例数据
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

        # 批量插入数据
        for dest_data in destinations:  # 遍历dest_data  # 遍历dest_data  # 遍历dest_data
            destination = Destination(**dest_data)
            db.session.add(destination)

        db.session.commit()

        init_time = time.time() - start_time
        logger.info(f"✅ 数据库初始化完成，耗时: {init_time:.3f}s")
        logger.info(f"   - 配置：{len(configs)}")
        logger.info(f"   - 景点：{Destination.query.count()}")
        logger.info(f"   - 用户：{User.query.count()}")
        logger.info(f"   - 行程：{Trip.query.count()}")


if __name__ == '__main__':
    init_db()

    # 启动服务器
    logger.info("🚀 启动优化版服务器 http://127.0.0.1:5000")
    logger.info("📊 性能监控: http://127.0.0.1:5000/api/health")

    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        threaded=True,
        processes=4
    )