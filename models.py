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


class Destination(db.Model):
    """景点数据模型 - 存储旅游目的地信息"""
    # 景点ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 景点名称，必填，最大200字符
    name = db.Column(db.String(200), nullable=False)
    # 所在城市，必填，最大100字符
    city = db.Column(db.String(100), nullable=False)
    # 所在省份，必填，最大50字符
    province = db.Column(db.String(50), nullable=False)
    # 景点描述，可选，文本类型
    description = db.Column(db.Text)
    # 封面图片URL，最大500字符
    cover_image = db.Column(db.String(500))
    # 评分，浮点数，默认5.0
    rating = db.Column(db.Float, default=5.0)
    # 门票价格，浮点数，默认0（免费）
    ticket_price = db.Column(db.Float, default=0)
    # 开放时间，字符串格式
    open_time = db.Column(db.String(100))
    # 经度坐标，用于地图定位
    lng = db.Column(db.Float)
    # 纬度坐标，用于地图定位
    lat = db.Column(db.Float)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        """将模型对象转换为字典格式，便于JSON序列化"""
        return {
            'id': self.id,
            'name': self.name,
            'city': self.city,
            'province': self.province,
            'description': self.description,
            'cover_image': self.cover_image,
            'lng': self.lng,
            'lat': self.lat,
            'rating': self.rating,
            'ticket_price': self.ticket_price,
            'open_time': self.open_time,
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class User(db.Model):
    """用户数据模型 - 存储用户账户信息"""
    # 用户ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 用户名，唯一，必填，最大80字符
    username = db.Column(db.String(80), unique=True, nullable=False)
    # 用户昵称，必填，最大80字符，默认为空字符串
    nickname = db.Column(db.String(80), nullable=False, default="")
    # 邮箱地址，唯一，最大120字符
    email = db.Column(db.String(120), unique=True)
    # 手机号码，唯一，最大20字符
    phone = db.Column(db.String(20), unique=True)
    # 用户头像URL，最大500字符
    avatar_url = db.Column(db.String(500))
    # 密码哈希值，存储加密后的密码，必填
    password_hash = db.Column(db.String(255), nullable=False)
    # 会员等级，整数，默认1级
    membership_level = db.Column(db.Integer, default=1)
    # 是否为管理员，布尔值，默认False
    is_admin = db.Column(db.Boolean, default=False)
    # 用户偏好设置，JSON格式存储（SQLite兼容）
    preferences = db.Column(db.Text)
    # 账户创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 账户更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """将用户模型转换为字典格式"""
        return {
            'id': str(self.id),
            'username': self.username,
            'nickname': self.nickname,
            'email': self.email,
            'phone': self.phone,
            'avatar_url': self.avatar_url,
            'membership_level': self.membership_level,
            'is_admin': self.is_admin,
            'preferences': self._get_preferences(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def _get_preferences(self) -> dict:
        """获取用户偏好设置，如果未设置则返回默认值"""
        # 如果没有偏好设置，返回默认偏好
        if not self.preferences:
            return {
                'destinations': [],
                'budget_range': {'min': 0, 'max': 0},
                'travel_style': 'relaxation',
                'group_size': 1,
                'interests': [],
            }
        try:
            # 尝试解析JSON格式的偏好设置
            return json.loads(self.preferences)
        except Exception:
            # 如果解析失败，返回默认偏好
            return {
                'destinations': [],
                'budget_range': {'min': 0, 'max': 0},
                'travel_style': 'relaxation',
                'group_size': 1,
                'interests': [],
            }


class Trip(db.Model):
    """行程数据模型 - 存储用户旅行计划"""
    # 行程ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # 行程标题，必填，最大200字符
    title = db.Column(db.String(200), nullable=False)
    # 行程描述，可选，文本类型
    description = db.Column(db.Text)
    # 行程开始日期
    start_date = db.Column(db.Date)
    # 行程结束日期
    end_date = db.Column(db.Date)
    # 行程状态，字符串，默认'planning'（规划中）
    status = db.Column(db.String(20), default='planning')
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)

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
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TripItem(db.Model):
    """行程项目数据模型 - 存储行程中的具体活动安排"""
    # 行程项目ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的行程ID，外键引用trip表的id字段，必填
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False)
    # 关联的景点ID，外键引用destination表的id字段
    destination_id = db.Column(db.Integer, db.ForeignKey('destination.id'))
    # 第几天的行程，整数，必填
    day_number = db.Column(db.Integer, nullable=False)
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
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)

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
    """用户点赞数据模型 - 记录用户对景点的点赞"""
    # 点赞记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # 关联的景点ID，外键引用destination表的id字段，必填
    destination_id = db.Column(db.Integer, db.ForeignKey('destination.id'), nullable=False)
    # 点赞时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        """将点赞模型转换为字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'destination_id': self.destination_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class UserFootprint(db.Model):
    """用户足迹/访问记录模型 - 记录用户访问过的景点"""
    # 足迹记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # 关联的景点ID，外键引用destination表的id字段，必填
    destination_id = db.Column(db.Integer, db.ForeignKey('destination.id'), nullable=False)
    # 访问来源，如view（查看）、itinerary（行程）、search（搜索）等
    source = db.Column(db.String(50), default='view')
    # 访问时间，默认当前时间
    visited_at = db.Column(db.DateTime, default=datetime.now)

    # 关联的景点对象，使用joined加载策略立即加载
    destination = db.relationship('Destination', foreign_keys=[destination_id], lazy='joined')

    def to_dict(self):
        """将足迹模型转换为字典格式"""
        d = self.destination
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "destination_id": self.destination_id,
            "source": self.source,
            "visited_at": self.visited_at.isoformat() if self.visited_at else None,
            "destination": d.to_dict() if d else None,
        }


class DestinationComment(db.Model):
    """目的地评论模型 - 存储用户对景点的评论"""
    # 评论ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的景点ID，外键引用destination表的id字段，必填
    destination_id = db.Column(db.Integer, db.ForeignKey('destination.id'), nullable=False)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # 评论内容，必填，文本类型
    content = db.Column(db.Text, nullable=False)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关联的用户对象（评论作者），使用joined加载策略立即加载
    author = db.relationship('User', foreign_keys=[user_id], lazy='joined')

    def to_dict(self):
        """将评论模型转换为字典格式，包含作者信息"""
        author = self.author
        return {
            "id": str(self.id),
            "destination_id": self.destination_id,
            "user_id": str(self.user_id),
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user": {
                "id": str(author.id) if author else str(self.user_id),
                "nickname": getattr(author, "nickname", "") if author else "",
                "avatar_url": getattr(author, "avatar_url", None) if author else None,
            },
        }


class Notification(db.Model):
    """站内通知模型 - 存储系统通知消息"""
    # 通知ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # 通知标题，必填，最大200字符
    title = db.Column(db.String(200), nullable=False)
    # 通知内容，必填，文本类型
    content = db.Column(db.Text, nullable=False)
    # 通知类型，字符串，默认'system'（系统通知）
    notification_type = db.Column(db.String(50), default='system')
    # 是否已读，布尔值，默认False
    is_read = db.Column(db.Boolean, default=False)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 阅读时间
    read_at = db.Column(db.DateTime)

    def to_dict(self):
        """将通知模型转换为字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'content': self.content,
            'notification_type': self.notification_type,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
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


class Order(db.Model):
    """订单模型 - 存储用户订单信息"""
    # 订单ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
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
    # 产品ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 产品名称，必填，最大200字符
    name = db.Column(db.String(200), nullable=False)
    # 产品副标题，最大500字符
    subtitle = db.Column(db.String(500))
    # 产品描述，可选，文本类型
    description = db.Column(db.Text)
    # 关联的景点ID，外键引用destination表的id字段
    destination_id = db.Column(db.Integer, db.ForeignKey('destination.id'), nullable=True)
    # 产品类别，字符串，默认'ticket'（门票）
    category = db.Column(db.String(50), default='ticket')
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
    status = db.Column(db.String(20), default='active')
    # 评分，浮点数，默认5.0
    rating = db.Column(db.Float, default=5.0)
    # 销售数量，整数，默认0
    sold_count = db.Column(db.Integer, default=0)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
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
    # 关联的景点ID，外键引用destination表的id字段
    destination_id = db.Column(db.Integer, db.ForeignKey('destination.id'), nullable=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
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