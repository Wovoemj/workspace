# ============================================
# 数据模型定义 - 智能旅游助手
# ============================================
#
# 【模块说明】
# - 定义项目所有数据库表结构
# - 使用 SQLAlchemy ORM 进行数据库操作
# - 每个模型类对应一张数据库表
#
# 【数据表清单】
# 1. Destination - 景点表
# 2. User - 用户表
# 3. Trip - 行程表
# 4. TripItem - 行程项目表
# 5. UserLike - 点赞表
# 6. Favorite - 收藏表
# 7. UserFootprint - 用户足迹表
# 8. DestinationComment - 景点评论表
# 9. Notification - 通知表
# 10. Page - 动态页面表
# 11. SiteConfig - 网站配置表
# 12. Menu - 菜单表
# 13. Order - 订单表
# 14. OrderItem - 订单明细表
#
# 【索引设计】
# - 所有外键字段都添加了索引
# - 常用查询字段（name, city, rating等）添加了索引
# - 定义了复合索引优化多条件查询

# 导入JSON处理模块，用于数据序列化
import json
# 导入日期时间处理模块
from datetime import datetime, time, date

# 导入SQLAlchemy原生SQL执行支持
from sqlalchemy import text, or_
# 导入密码哈希工具
from werkzeug.security import generate_password_hash, check_password_hash

# 导入全局数据库实例
from extensions import db


# =============================================
# Destination - 景点数据模型
# =============================================
#
# 【功能】
# - 存储景点基本信息
# - 支持按城市、省份、评分筛选
# - 支持地图定位（经纬度）
#
# 【索引】
# - name, city, province, rating, ticket_price, created_at, updated_at 单字段索引
# - idx_destination_name_city 复合索引
# - idx_destination_rating_price 复合索引

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
    # 经度，可选，用于地图展示和周边查询
    lng = db.Column(db.Float)
    # 纬度，可选，用于地图展示和周边查询
    lat = db.Column(db.Float)
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
            'lat': self.lat,
            'lng': self.lng,
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# =============================================
# User - 用户数据模型
# =============================================
#
# 【功能】
# - 存储用户基本信息
# - 支持手机号/邮箱/用户名登录
# - 支持会员等级和积分系统
# - 支持邀请码和邀请关系
#
# 【认证方式】
# - 手机号登录
# - 邮箱登录
# - 用户名登录
# - 密码使用 PBKDF2+SHA256 加密存储

class User(db.Model):
    """用户数据模型"""
    __tablename__ = 'users'
    
    # 用户ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 用户名，唯一，必填，最大80字符，添加索引
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    # 昵称，用于展示，可选，最大80字符
    nickname = db.Column(db.String(80))
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
    # 积分，整数，默认0
    points = db.Column(db.Integer, default=0, index=True)
    # 邀请码（唯一）
    invite_code = db.Column(db.String(20), unique=True, index=True)
    # 邀请人ID
    invited_by = db.Column(db.Integer, db.ForeignKey('users.id'), index=True)
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
            'nickname': self.nickname,
            'email': self.email,
            'phone': self.phone,
            'is_admin': self.is_admin,
            'avatar': self.avatar,
            'membership_level': self.membership_level,
            'points': self.points or 0,
            'preferences': self.preferences,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


# =============================================
# Trip - 行程数据模型
# =============================================
#
# 【功能】
# - 存储用户创建的旅行行程
# - 支持多个 TripItem（行程项目）
# - 行程状态：planning(规划中)/confirmed(已确认)/completed(已完成)/cancelled(已取消)
#
# 【关联】
# - 一对多：User → Trip（一个用户多个行程）
# - 一对多：Trip → TripItem（一个行程多个项目）

class Trip(db.Model):
    """行程数据模型"""
    __tablename__ = 'trips'
    
    # 行程ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
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
    __tablename__ = 'trip_items'
    
    # 行程项目ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的行程ID，外键引用trips表的id字段，必填，添加索引
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False, index=True)
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
    __tablename__ = 'user_likes'
    
    # 点赞记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
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


# =============================================
# Favorite - 用户收藏数据模型
# =============================================
#
# 【功能】
# - 记录用户收藏的景点
# - 便于用户快速访问喜欢的景点
#
# 【关联】
# - 多对一：User（多个收藏属于一个用户）
# - 多对一：Destination（多个收藏可以针对同一景点）

class Favorite(db.Model):
    """用户收藏数据模型"""
    __tablename__ = 'favorite'
    # 收藏记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 关联的景点ID，外键引用destinations表的id字段，必填，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=False, index=True)
    # 收藏时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        """将收藏模型转换为字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'destination_id': self.destination_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# =============================================
# UserFootprint - 用户足迹数据模型
# =============================================
#
# 【功能】
# - 记录用户浏览过的景点
# - 用于个性化推荐
# - 记录浏览时间

class UserFootprint(db.Model):
    """用户足迹数据模型"""
    __tablename__ = 'user_footprint'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=False, index=True)
    view_time = db.Column(db.DateTime, default=datetime.now, index=True)
    view_duration = db.Column(db.Integer, default=0)  # 浏览时长（秒）

    # 关联的景点对象，使用joined加载策略立即加载
    destination = db.relationship('Destination', foreign_keys=[destination_id], lazy='joined')

    def to_dict(self):
        d = self.destination
        return {
            'id': self.id,
            'user_id': self.user_id,
            'destination_id': self.destination_id,
            'view_time': self.view_time.isoformat() if self.view_time else None,
            'view_duration': self.view_duration,
            'destination': d.to_dict() if d else None,
        }


class DestinationComment(db.Model):
    """景点评论模型"""
    __tablename__ = 'destination_comment'

    id = db.Column(db.Integer, primary_key=True)
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关联关系
    author = db.relationship('User', foreign_keys=[user_id], lazy='joined')

    def to_dict(self):
        author = self.author
        return {
            "id": self.id,
            "destination_id": self.destination_id,
            "user_id": self.user_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user": {
                "id": str(author.id) if author else str(self.user_id),
                "nickname": getattr(author, "nickname", "") if author else "",
                "avatar_url": getattr(author, "avatar", None) if author else None,
            },
        }


# =============================================
# Notification - 通知数据模型
# =============================================
#
# 【功能】
# - 存储系统通知、订单通知、活动通知等
# - 支持已读/未读状态
# - 支持多种通知类型：system(系统)/booking(订单)/payment(支付)/promotion(活动)/service(服务)

class Notification(db.Model):
    """通知数据模型"""
    __tablename__ = 'notification'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
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


class Page(db.Model):
    """页面模型 - 存储动态页面内容"""
    # 页面ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 页面名称，唯一，必填，最大100字符
    name = db.Column(db.String(100), unique=True, nullable=False)
    # 页面标题，必填，最大200字符
    title = db.Column(db.String(200), nullable=False)
    # 页面描述，可选，文本类型
    description = db.Column(db.Text)
    # HTML内容，必填，文本类型
    html_content = db.Column(db.Text, nullable=False)
    # CSS样式内容，可选，文本类型
    css_content = db.Column(db.Text)
    # JavaScript脚本内容，可选，文本类型
    js_content = db.Column(db.Text)
    # 是否激活，布尔值，默认True
    is_active = db.Column(db.Boolean, default=True)
    # 排序顺序，整数，默认0
    sort_order = db.Column(db.Integer, default=0)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """将页面模型转换为字典格式"""
        return {
            'id': self.id,
            'name': self.name,
            'title': self.title,
            'description': self.description,
            'html_content': self.html_content,
            'css_content': self.css_content,
            'js_content': self.js_content,
            'is_active': self.is_active,
            'sort_order': self.sort_order
        }


class SiteConfig(db.Model):
    """网站配置模型 - 存储系统配置参数"""
    # 配置ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 配置键，唯一，必填，最大100字符
    key = db.Column(db.String(100), unique=True, nullable=False)
    # 配置值，文本类型
    value = db.Column(db.Text)
    # 配置值类型，字符串，默认'string'
    value_type = db.Column(db.String(20), default='string')
    # 配置分类，最大50字符
    category = db.Column(db.String(50))
    # 配置描述，文本类型
    description = db.Column(db.Text)
    # 是否公开，布尔值，默认False
    is_public = db.Column(db.Boolean, default=False)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """将配置模型转换为字典格式"""
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'value_type': self.value_type,
            'category': self.category,
            'description': self.description,
            'is_public': self.is_public
        }

    def get_typed_value(self):
        """获取类型化后的配置值，根据value_type转换为对应类型"""
        # 如果类型是整数
        if self.value_type == 'int':
            return int(self.value) if self.value else 0
        # 如果类型是浮点数
        elif self.value_type == 'float':
            return float(self.value) if self.value else 0.0
        # 如果类型是布尔值
        elif self.value_type == 'bool':
            return self.value.lower() in ('true', '1', 'yes') if self.value else False
        # 如果类型是JSON
        elif self.value_type == 'json':
            import json
            return json.loads(self.value) if self.value else {}
        # 否则返回原始字符串值
        else:
            return self.value


class Menu(db.Model):
    """菜单模型 - 存储导航菜单信息"""
    # 菜单ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 菜单名称，必填，最大100字符
    name = db.Column(db.String(100), nullable=False)
    # 菜单URL，最大500字符
    url = db.Column(db.String(500))
    # 菜单图标，最大100字符
    icon = db.Column(db.String(100))
    # 父菜单ID，外键引用menu表的id字段
    parent_id = db.Column(db.Integer, db.ForeignKey('menu.id'))
    # 排序顺序，整数，默认0
    sort_order = db.Column(db.Integer, default=0)
    # 是否激活，布尔值，默认True
    is_active = db.Column(db.Boolean, default=True)
    # 菜单类型，字符串，默认'main'（主菜单）
    menu_type = db.Column(db.String(50), default='main')
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        """将菜单模型转换为字典格式"""
        return {
            'id': self.id,
            'name': self.name,
            'url': self.url,
            'icon': self.icon,
            'parent_id': self.parent_id,
            'sort_order': self.sort_order,
            'is_active': self.is_active,
            'menu_type': self.menu_type
        }


# =============================================
# Order - 订单数据模型
# =============================================
#
# 【功能】
# - 存储用户订单信息
# - 记录订单状态：pending(待支付)/paid(已支付)/cancelled(已取消)/refunded(已退款)
# - 支持多种支付方式
#
# 【关联】
# - 一对多：User → Order
# - 一对多：Order → OrderItem

class Order(db.Model):
    """订单模型 - 存储用户订单信息"""
    # 订单ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # 订单号，唯一，必填，最大80字符
    order_no = db.Column(db.String(80), unique=True, nullable=False)
    # 订单总金额，浮点数，默认0.0
    total_amount = db.Column(db.Float, default=0.0)
    # 订单状态，字符串，默认'pending'（待支付）
    status = db.Column(db.String(30), default='pending')
    # 支付方式，字符串，默认'alipay'（支付宝）
    payment_method = db.Column(db.String(30), default='alipay')
    # 支付时间
    payment_time = db.Column(db.DateTime, nullable=True)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关联的订单项列表，级联删除
    items = db.relationship('OrderItem', backref='order', cascade='all, delete-orphan')


class OrderItem(db.Model):
    """订单明细模型 - 存储订单中的具体商品项"""
    # 订单项ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的订单ID，外键引用order表的id字段，必填
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    # 产品ID，必填，最大120字符
    product_id = db.Column(db.String(120), nullable=False)
    # 产品名称，必填，最大200字符
    product_name = db.Column(db.String(200), nullable=False)
    # 产品类型，必填，最大50字符
    product_type = db.Column(db.String(50), nullable=False)
    # 数量，整数，默认1
    quantity = db.Column(db.Integer, default=1)
    # 单价，浮点数，默认0.0
    unit_price = db.Column(db.Float, default=0.0)
    # 总价，浮点数，默认0.0
    total_price = db.Column(db.Float, default=0.0)
    # 预订详情，JSON格式字符串
    booking_details = db.Column(db.Text)


class Product(db.Model):
    """门票产品模型 - 存储景点门票产品信息"""
    __tablename__ = 'product'

    # 产品ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 产品名称，必填，最大200字符
    name = db.Column(db.String(200), nullable=False)
    # 产品副标题，最大500字符
    subtitle = db.Column(db.String(500))
    # 产品描述，可选，文本类型
    description = db.Column(db.Text)
    # 关联的景点ID，外键引用destinations表的id字段
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=True, index=True)
    # 产品类别，字符串，默认'ticket'（门票）
    category = db.Column(db.String(50), default='ticket', index=True)
    # 基础价格，浮点数，默认0.0
    base_price = db.Column(db.Float, default=0.0)
    # 折扣价格，浮点数
    discount_price = db.Column(db.Float, nullable=True)
    # 总库存，整数，默认0
    inventory_total = db.Column(db.Integer, default=0)
    # 已售数量，整数，默认0
    inventory_sold = db.Column(db.Integer, default=0)
    # 预订类型，字符串，默认'date'（按日期预订）
    booking_type = db.Column(db.String(20), default='date')
    # 是否需要日期，布尔值，默认True
    need_date = db.Column(db.Boolean, default=True)
    # 是否需要时间，布尔值，默认False
    need_time = db.Column(db.Boolean, default=False)
    # 封面图片URL，最大500字符
    cover_image = db.Column(db.String(500))
    # 图片列表，JSON格式字符串
    images = db.Column(db.Text)
    # 产品状态，字符串，默认'active'（上架）
    status = db.Column(db.String(20), default='active', index=True)
    # 评分，浮点数，默认5.0
    rating = db.Column(db.Float, default=5.0, index=True)
    # 销售数量，整数，默认0
    sold_count = db.Column(db.Integer, default=0, index=True)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关联的景点对象，使用joined加载策略立即加载
    destination = db.relationship('Destination', foreign_keys=[destination_id], lazy='joined')

    def to_dict(self):
        """将产品模型转换为字典格式"""
        return {
            'id': self.id,
            'name': self.name,
            'subtitle': self.subtitle,
            'description': self.description,
            'destination_id': self.destination_id,
            'category': self.category,
            # 优先显示折扣价，如果没有则显示基础价
            'price': self.discount_price if self.discount_price else self.base_price,
            'base_price': self.base_price,
            'discount_price': self.discount_price,
            # 计算可用库存
            'inventory_available': max(0, self.inventory_total - self.inventory_sold),
            'booking_type': self.booking_type,
            'need_date': self.need_date,
            'need_time': self.need_time,
            'cover_image': self.cover_image,
            # 解析图片列表
            'images': json.loads(self.images) if self.images else [],
            'status': self.status,
            'rating': self.rating,
            'sold_count': self.sold_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ProductQA(db.Model):
    """产品问答模型 - 存储用户对产品的问题和答案"""
    # 问答ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的产品ID，外键引用product表的id字段，必填
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    # 关联的景点ID，外键引用destinations表的id字段
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # 问题内容，必填，文本类型
    question = db.Column(db.Text, nullable=False)
    # 答案内容，可选，文本类型
    answer = db.Column(db.Text)
    # 状态，字符串，默认'pending'（待回答）
    status = db.Column(db.String(20), default='pending')
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 回答时间
    answered_at = db.Column(db.DateTime)
    # 关联的景点对象，使用joined加载策略立即加载
    destination = db.relationship('Destination', foreign_keys=[destination_id], lazy='joined')

    def to_dict(self):
        """将问答模型转换为字典格式"""
        return {
            "id": self.id,
            "product_id": self.product_id,
            "destination_id": self.destination_id,
            "user_id": self.user_id,
            "question": self.question,
            "answer": self.answer,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "answered_at": self.answered_at.isoformat() if self.answered_at else None,
        }


class TravelNote(db.Model):
    """游记/攻略模型 - 用户发布的旅行笔记"""
    __tablename__ = 'travel_notes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), index=True)
    title = db.Column(db.String(200), nullable=False)
    cover_image = db.Column(db.String(500))
    content = db.Column(db.Text, nullable=False)
    tags = db.Column(db.Text)
    view_count = db.Column(db.Integer, default=0)
    like_count = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='draft')
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    user = db.relationship('User', backref='travel_notes', lazy='joined')
    destination = db.relationship('Destination', backref='travel_notes', lazy='joined')
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "destination_id": self.destination_id,
            "title": self.title,
            "cover_image": self.cover_image,
            "content": self.content,
            "tags": json.loads(self.tags) if self.tags else [],
            "view_count": self.view_count,
            "like_count": self.like_count,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user": {"id": self.user.id, "nickname": self.user.nickname, "avatar_url": self.user.avatar} if self.user else None,
            "destination": {"id": self.destination.id, "name": self.destination.name, "city": self.destination.city} if self.destination else None,
        }


class TravelNoteLike(db.Model):
    """游记点赞模型"""
    __tablename__ = 'travel_note_likes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    travel_note_id = db.Column(db.Integer, db.ForeignKey('travel_notes.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'travel_note_id', name='uix_user_note_like'),)
    
    travel_note = db.relationship('TravelNote', backref='likes')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'travel_note_id': self.travel_note_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Coupon(db.Model):
    """优惠券数据模型"""
    __tablename__ = 'coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # fixed/percent
    value = db.Column(db.Float, nullable=False)  # 金额或折扣百分比
    min_order = db.Column(db.Float, default=0)  # 最低订单金额
    max_uses = db.Column(db.Integer, default=0)  # 0=无限
    used_count = db.Column(db.Integer, default=0)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='active')  # active/expired/disabled
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'type': self.type,
            'value': self.value,
            'min_order': self.min_order,
            'max_uses': self.max_uses,
            'used_count': self.used_count,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class UserCoupon(db.Model):
    """用户优惠券领取记录模型"""
    __tablename__ = 'user_coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    coupon_id = db.Column(db.Integer, db.ForeignKey('coupons.id'), nullable=False, index=True)
    is_used = db.Column(db.Boolean, default=False)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    coupon = db.relationship('Coupon', backref='user_coupons')
    
    __table_args__ = (db.UniqueConstraint('user_id', 'coupon_id', name='uix_user_coupon'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'coupon_id': self.coupon_id,
            'is_used': self.is_used,
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'coupon': self.coupon.to_dict() if self.coupon else None
        }


class SupportTicket(db.Model):
    """客服工单模型"""
    __tablename__ = 'support_tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    ticket_type = db.Column(db.String(20), default='other')
    status = db.Column(db.String(20), default='open', index=True)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联
    user = db.relationship('User', foreign_keys=[user_id], lazy='joined')
    replies = db.relationship('TicketReply', backref='ticket', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'ticket_type': self.ticket_type,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class TicketReply(db.Model):
    """工单回复模型"""
    __tablename__ = 'ticket_replies'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    
    # 关联
    user = db.relationship('User', foreign_keys=[user_id], lazy='joined')
    
    def to_dict(self):
        user = self.user
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'user_id': self.user_id,
            'content': self.content,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user': {
                'id': str(user.id) if user else str(self.user_id),
                'nickname': getattr(user, 'nickname', '') if user else '',
                'avatar_url': getattr(user, 'avatar', None) if user else None,
            } if user else None
        }


class AIConversation(db.Model):
    """AI对话记录模型 - 存储用户与AI助手的完整对话历史"""
    __tablename__ = 'ai_conversations'

    # 对话记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    # 会话ID，用于将多条对话关联到同一个会话
    session_id = db.Column(db.String(100), nullable=False, index=True)
    # 发言角色：user（用户）/ assistant（AI助手）/ system（系统）
    role = db.Column(db.String(20), nullable=False)
    # 对话内容
    content = db.Column(db.Text, nullable=False)
    # 意图类型：行程规划、景点咨询、酒店推荐等
    intent = db.Column(db.String(50), index=True)
    # 额外元数据，JSON格式存储（使用meta_data避免与SQLAlchemy保留字段冲突）
    meta_data = db.Column(db.JSON)
    # 创建时间
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'role': self.role,
            'content': self.content,
            'intent': self.intent,
            'metadata': self.meta_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TravelPlan(db.Model):
    """行程规划模型 - 存储由AI生成的完整行程规划"""
    __tablename__ = 'travel_plans'

    # 规划ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的对话ID，外键引用ai_conversations表
    conversation_id = db.Column(db.Integer, db.ForeignKey('ai_conversations.id'), index=True)
    # 关联的用户ID，外键引用users表
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 会话ID
    session_id = db.Column(db.String(100), index=True)
    # 规划名称
    plan_name = db.Column(db.String(200))
    # 目的地
    destination = db.Column(db.String(100), index=True)
    # 开始日期
    start_date = db.Column(db.Date)
    # 结束日期
    end_date = db.Column(db.Date)
    # 预算
    budget = db.Column(db.Float)
    # 偏好设置，JSON格式
    preferences = db.Column(db.JSON)
    # 详细行程，JSON格式存储每日行程安排
    plan_details = db.Column(db.JSON)
    # 状态：draft（草稿）/ confirmed（已确认）/ completed（已完成）/ cancelled（已取消）
    status = db.Column(db.String(20), default='draft', index=True)
    # 创建时间
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'plan_name': self.plan_name,
            'destination': self.destination,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'budget': self.budget,
            'preferences': self.preferences,
            'plan_details': self.plan_details,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class PlanItem(db.Model):
    """行程项目模型 - 存储行程中的具体活动项目"""
    __tablename__ = 'plan_items'

    # 项目ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的行程ID，外键引用travel_plans表
    plan_id = db.Column(db.Integer, db.ForeignKey('travel_plans.id'), nullable=False, index=True)
    # 关联的景点ID，外键引用destinations表
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), index=True)
    # 第几天的行程
    day_number = db.Column(db.Integer, nullable=False, index=True)
    # 排序顺序
    sort_order = db.Column(db.Integer, default=0)
    # 时间段：morning/afternoon/evening
    time_slot = db.Column(db.String(20))
    # 活动类型：景点/餐厅/交通/酒店
    activity_type = db.Column(db.String(50))
    # 标题
    title = db.Column(db.String(200))
    # 描述
    description = db.Column(db.Text)
    # 地点
    location = db.Column(db.String(200))
    # 开始时间
    start_time = db.Column(db.Time)
    # 结束时间
    end_time = db.Column(db.Time)
    # 持续时间（分钟）
    duration_minutes = db.Column(db.Integer)
    # 费用
    cost = db.Column(db.Float)
    # 预订信息，JSON格式
    booking_info = db.Column(db.JSON)
    # 创建时间
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'plan_id': self.plan_id,
            'destination_id': self.destination_id,
            'day_number': self.day_number,
            'sort_order': self.sort_order,
            'time_slot': self.time_slot,
            'activity_type': self.activity_type,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_minutes': self.duration_minutes,
            'cost': self.cost,
            'booking_info': self.booking_info
        }


class Comment(db.Model):
    """评论模型 - 存储用户对景点/目的地的评论"""
    __tablename__ = 'comments'

    # 评论ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 关联的目的地/景点ID，外键引用destinations表的id字段
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), index=True)
    # 关联的产品ID，外键引用product表的id字段
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), index=True)
    # 关联的游记ID，外键引用travel_notes表的id字段
    travel_note_id = db.Column(db.Integer, db.ForeignKey('travel_notes.id'), index=True)
    # 父评论ID，用于回复功能，外键引用comments表的id字段
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), index=True)
    # 评论内容，必填，文本类型
    content = db.Column(db.Text, nullable=False)
    # 评分，浮点数，1-5分
    rating = db.Column(db.Float, default=5.0)
    # 评论状态，字符串，默认'approved'（已通过）
    status = db.Column(db.String(20), default='approved', index=True)
    # 点赞数量，整数，默认0
    like_count = db.Column(db.Integer, default=0)
    # 回复数量，整数，默认0
    reply_count = db.Column(db.Integer, default=0)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关联关系
    user = db.relationship('User', backref='comments', lazy='joined')
    destination = db.relationship('Destination', backref='comments', lazy='joined')
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'destination_id': self.destination_id,
            'product_id': self.product_id,
            'travel_note_id': self.travel_note_id,
            'parent_id': self.parent_id,
            'content': self.content,
            'rating': self.rating,
            'status': self.status,
            'like_count': self.like_count,
            'reply_count': self.reply_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user': {
                'id': self.user.id,
                'nickname': getattr(self.user, 'nickname', ''),
                'avatar_url': getattr(self.user, 'avatar', None),
            } if self.user else None
        }