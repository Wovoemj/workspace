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
# 15. Product - 产品表
# 16. ProductReview - 产品评价表
# 17. ProductQA - 产品问答表
# 18. TravelNote - 游记表
# 19. TravelNoteLike - 游记点赞表
# 20. Coupon - 优惠券表
# 21. UserCoupon - 用户优惠券表
# 22. SupportTicket - 客服工单表
# 23. TicketReply - 工单回复表
# 24. AIConversation - AI对话记录表
# 25. TravelPlan - 行程规划表
# 26. PlanItem - 行程项目表
# 27. Comment - 评论表
#
# 【索引设计】
# - 所有外键字段都添加了索引
# - 常用查询字段（name, city, rating等）添加了索引
# - 定义了复合索引优化多条件查询

# 导入JSON处理模块，用于数据序列化和反序列化
import json
# 导入日期时间处理模块，用于日期时间字段
from datetime import datetime, time, date

# 导入SQLAlchemy原生SQL执行支持，用于执行复杂查询
from sqlalchemy import text, or_
# 导入密码哈希工具，用于密码加密和验证
from werkzeug.security import generate_password_hash, check_password_hash

# 导入全局数据库实例，这是SQLAlchemy的数据库对象
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

    # 景点ID，主键，自增长，用于唯一标识每个景点
    id = db.Column(db.Integer, primary_key=True)
    # 景点名称，必填，最大200字符，添加索引以加速按名称查询
    name = db.Column(db.String(200), nullable=False, index=True)
    # 所在城市，必填，最大100字符，添加索引，支持按城市筛选
    city = db.Column(db.String(100), nullable=False, index=True)
    # 所在省份，必填，最大50字符，添加索引，支持按省份筛选
    province = db.Column(db.String(50), nullable=False, index=True)
    # 景点描述，可选，文本类型，存储景点的详细介绍
    description = db.Column(db.Text)
    # 封面图片URL，可选，最大500字符，用于列表页展示
    cover_image = db.Column(db.String(500))
    # 评分，浮点数，默认5.0，添加索引，支持按评分排序
    rating = db.Column(db.Float, default=5.0, index=True)
    # 门票价格，浮点数，默认0（免费景点），添加索引，支持按价格筛选
    ticket_price = db.Column(db.Float, default=0, index=True)
    # 开放时间，字符串格式，如"09:00-17:00"
    open_time = db.Column(db.String(100))
    # 经度，可选，浮点数，用于地图展示和周边查询
    lng = db.Column(db.Float)
    # 纬度，可选，浮点数，用于地图展示和周边查询
    lat = db.Column(db.Float)
    # 创建时间，默认当前时间，添加索引，支持按创建时间排序
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新，添加索引
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, index=True)

    # 定义复合索引以优化多条件查询
    __table_args__ = (
        # 名称和城市的复合索引，用于按名称和城市的组合搜索
        db.Index('idx_destination_name_city', 'name', 'city'),
        # 评分和价格的复合索引，用于按评分和价格的组合排序和筛选
        db.Index('idx_destination_rating_price', 'rating', 'ticket_price'),
    )

    def to_dict(self):
        """将模型对象转换为字典格式，便于JSON序列化并返回给前端"""
        return {
            'id': self.id,                            # 景点ID
            'name': self.name,                        # 景点名称
            'city': self.city,                        # 所在城市
            'province': self.province,                # 所在省份
            'description': self.description,            # 景点描述
            'cover_image': self.cover_image,          # 封面图片URL
            'rating': self.rating,                    # 评分
            'ticket_price': self.ticket_price,        # 门票价格
            'open_time': self.open_time,              # 开放时间
            'lat': self.lat,                        # 纬度
            'lng': self.lng,                        # 经度
            # 将datetime对象转换为ISO格式字符串，便于JSON序列化
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
# - 密码使用PBKDF2+SHA256加密存储

class User(db.Model):
    """用户数据模型"""
    __tablename__ = 'users'
    
    # 用户ID，主键，自增长，用于唯一标识每个用户
    id = db.Column(db.Integer, primary_key=True)
    # 用户名，唯一，必填，最大80字符，添加索引，支持按用户名查询
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    # 昵称，用于展示，可选，最大80字符
    nickname = db.Column(db.String(80))
    # 邮箱地址，唯一，最大120字符，添加索引，支持按邮箱查询
    email = db.Column(db.String(120), unique=True, index=True)
    # 手机号码，唯一，最大20字符，添加索引，支持按手机号查询
    phone = db.Column(db.String(20), unique=True, index=True)
    # 密码哈希值，存储加密后的密码（使用PBKDF2+SHA256算法）
    password_hash = db.Column(db.String(255))
    # 是否为管理员，布尔值，默认False，用于权限控制
    is_admin = db.Column(db.Boolean, default=False)
    # 用户头像URL，最大500字符，用于用户资料展示
    avatar = db.Column(db.String(500))
    # 会员等级，整数，默认1级，添加索引，支持按会员等级筛选
    membership_level = db.Column(db.Integer, default=1, index=True)
    # 积分，整数，默认0，添加索引，用于积分系统和等级计算
    points = db.Column(db.Integer, default=0, index=True)
    # 邀请码（唯一），用于邀请注册奖励机制
    invite_code = db.Column(db.String(20), unique=True, index=True)
    # 邀请人ID，外键引用users表的id字段，建立自引用关系
    invited_by = db.Column(db.Integer, db.ForeignKey('users.id'), index=True)
    # 用户偏好设置，JSON格式存储，包含目的地、预算、旅行风格等
    preferences = db.Column(db.JSON)
    # 账户创建时间，默认当前时间，添加索引，支持按注册时间排序
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 最后登录时间，添加索引，用于统计活跃用户
    last_login = db.Column(db.DateTime, index=True)

    def to_dict(self):
        """将用户模型转换为字典格式，便于JSON序列化并返回给前端"""
        return {
            'id': self.id,                              # 用户ID
            'username': self.username,                  # 用户名
            'nickname': self.nickname,                # 昵称
            'email': self.email,                      # 邮箱
            'phone': self.phone,                      # 手机号
            'is_admin': self.is_admin,                # 是否管理员
            'avatar': self.avatar,                    # 头像URL
            'membership_level': self.membership_level,  # 会员等级
            'points': self.points or 0,              # 积分（如果为None则返回0）
            'preferences': self.preferences,          # 偏好设置（JSON格式）
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


# =============================================
# Trip - 行程数据模型
# =============================================
#
# 【功能】
# - 存储用户创建的旅行行程
# - 支持多个TripItem（行程项目）
# - 行程状态：planning(规划中)/confirmed(已确认)/completed(已完成)/cancelled(已取消)
#
# 【关联】
# - 一对多：User → Trip（一个用户多个行程）
# - 一对多：Trip → TripItem（一个行程多个项目）

class Trip(db.Model):
    """行程数据模型"""
    __tablename__ = 'trips'
    
    # 行程ID，主键，自增长，用于唯一标识每个行程
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 行程标题，必填，最大200字符，如"北京三日游"
    title = db.Column(db.String(200), nullable=False)
    # 行程描述，可选，文本类型，详细说明行程安排
    description = db.Column(db.Text)
    # 行程开始日期，Date类型，添加索引，支持按日期筛选
    start_date = db.Column(db.Date, index=True)
    # 行程结束日期，Date类型，添加索引
    end_date = db.Column(db.Date, index=True)
    # 行程状态，字符串，默认'planning'（规划中），添加索引
    # 可选值：planning(规划中)/confirmed(已确认)/completed(已完成)/cancelled(已取消)
    status = db.Column(db.String(20), default='planning', index=True)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新，添加索引
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, index=True)

    def to_dict(self):
        """将行程模型转换为字典格式"""
        return {
            'id': self.id,                              # 行程ID
            'user_id': self.user_id,                    # 关联的用户ID
            'title': self.title,                        # 行程标题
            'description': self.description,            # 行程描述
            # 将date对象转换为ISO格式字符串
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,                    # 行程状态
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TripItem(db.Model):
    """行程项目数据模型 - 存储行程中的具体活动安排"""
    __tablename__ = 'trip_items'
    
    # 行程项目ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的行程ID，外键引用trips表的id字段，必填，添加索引
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False, index=True)
    # 关联的景点ID，外键引用destinations表的id字段，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), index=True)
    # 第几天的行程，整数，必填，添加索引，如1表示第1天
    day_number = db.Column(db.Integer, nullable=False, index=True)
    # 项目标题，最大200字符，如"参观故宫"
    title = db.Column(db.String(200))
    # 项目描述，文本类型，详细说明活动内容
    description = db.Column(db.Text)
    # 项目地点，最大200字符，如"北京市东城区"
    location = db.Column(db.String(200))
    # 开始时间，Time类型，如"09:00:00"
    start_time = db.Column(db.Time)
    # 结束时间，Time类型，如"12:00:00"
    end_time = db.Column(db.Time)
    # 排序顺序，整数，默认0，数值越小越靠前，用于自定义活动顺序
    sort_order = db.Column(db.Integer, default=0)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        """将行程项目模型转换为字典格式"""
        return {
            'id': self.id,                              # 项目ID
            'trip_id': self.trip_id,                  # 关联的行程ID
            'destination_id': self.destination_id,    # 关联的景点ID
            'day_number': self.day_number,            # 第几天
            'title': self.title,                        # 项目标题
            'description': self.description,            # 项目描述
            'location': self.location,                # 地点
            # 将time对象转换为ISO格式字符串
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'sort_order': self.sort_order            # 排序顺序
        }


class UserLike(db.Model):
    """用户点赞数据模型 - 记录用户点赞的景点"""
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
            'id': self.id,                              # 点赞记录ID
            'user_id': self.user_id,                    # 用户ID
            'destination_id': self.destination_id,    # 景点ID
            # 将datetime对象转换为ISO格式字符串
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
            'id': self.id,                              # 收藏记录ID
            'user_id': self.user_id,                    # 用户ID
            'destination_id': self.destination_id,    # 景点ID
            # 将datetime对象转换为ISO格式字符串
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
# - 记录浏览时长（秒）

class UserFootprint(db.Model):
    """用户足迹数据模型"""
    __tablename__ = 'user_footprint'

    # 足迹记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 关联的景点ID，外键引用destinations表的id字段，必填，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=False, index=True)
    # 浏览时间，默认当前时间，添加索引
    view_time = db.Column(db.DateTime, default=datetime.now, index=True)
    # 浏览时长（秒），整数，默认0，用于统计用户兴趣
    view_duration = db.Column(db.Integer, default=0)
    
    # 关联的景点对象，使用joined加载策略立即加载（避免N+1查询问题）
    destination = db.relationship('Destination', foreign_keys=[destination_id], lazy='joined')

    def to_dict(self):
        """将足迹模型转换为字典格式，包含关联的景点信息"""
        d = self.destination
        return {
            'id': self.id,                              # 足迹记录ID
            'user_id': self.user_id,                    # 用户ID
            'destination_id': self.destination_id,    # 景点ID
            # 将datetime对象转换为ISO格式字符串
            'view_time': self.view_time.isoformat() if self.view_time else None,
            'view_duration': self.view_duration,        # 浏览时长（秒）
            # 包含关联的景点信息（如果有关联的景点）
            'destination': d.to_dict() if d else None,
        }


class DestinationComment(db.Model):
    """景点评论模型 - 存储用户对景点的评论"""
    __tablename__ = 'destination_comment'

    # 评论ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的景点ID，外键引用destinations表的id字段，必填，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=False, index=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 评论内容，文本类型，必填
    content = db.Column(db.Text, nullable=False)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系：作者信息，使用joined加载策略立即加载
    author = db.relationship('User', foreign_keys=[user_id], lazy='joined')

    def to_dict(self):
        """将评论模型转换为字典格式，包含作者信息"""
        author = self.author
        return {
            "id": self.id,                              # 评论ID
            "destination_id": self.destination_id,    # 景点ID
            "user_id": self.user_id,                  # 用户ID
            "content": self.content,                  # 评论内容
            # 将datetime对象转换为ISO格式字符串
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            # 包含作者信息（ID、昵称、头像）
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

    # 通知ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 接收通知的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 通知类型，字符串，默认'system'，添加索引
    # 可选值：system(系统通知)/booking(订单通知)/payment(支付通知)/promotion(活动通知)/service(服务通知)
    type = db.Column(db.String(20), default='system', index=True)
    # 通知标题，必填，最大200字符
    title = db.Column(db.String(200), nullable=False)
    # 通知内容，必填，文本类型
    content = db.Column(db.Text, nullable=False)
    # 是否已读，布尔值，默认False，用于标记未读消息
    is_read = db.Column(db.Boolean, default=False, index=True)
    # 阅读时间，datetime类型，首次阅读时更新
    read_at = db.Column(db.DateTime)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        """将通知模型转换为字典格式"""
        return {
            'id': self.id,                      # 通知ID
            'user_id': self.user_id,            # 接收通知的用户ID
            'type': self.type,                # 通知类型
            'title': self.title,              # 通知标题
            'content': self.content,          # 通知内容
            'is_read': self.is_read,          # 是否已读
            # 将datetime对象转换为ISO格式字符串
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Page(db.Model):
    """页面模型 - 存储动态页面内容（如关于我们、隐私政策等）"""
    __tablename__ = 'page'
    
    # 页面ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 页面名称，唯一，必填，最大100字符，用于URL路由
    name = db.Column(db.String(100), unique=True, nullable=False)
    # 页面标题，必填，最大200字符，用于浏览器标签显示
    title = db.Column(db.String(200), nullable=False)
    # 页面描述，可选，文本类型，用于SEO
    description = db.Column(db.Text)
    # HTML内容，必填，文本类型，页面的主体内容
    html_content = db.Column(db.Text, nullable=False)
    # CSS样式内容，可选，文本类型，页面的自定义样式
    css_content = db.Column(db.Text)
    # JavaScript脚本内容，可选，文本类型，页面的自定义脚本
    js_content = db.Column(db.Text)
    # 是否激活，布尔值，默认True，未激活的页面不显示
    is_active = db.Column(db.Boolean, default=True)
    # 排序顺序，整数，默认0，数值越小越靠前
    sort_order = db.Column(db.Integer, default=0)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """将页面模型转换为字典格式"""
        return {
            'id': self.id,                      # 页面ID
            'name': self.name,                  # 页面名称
            'title': self.title,                # 页面标题
            'description': self.description,    # 页面描述
            'html_content': self.html_content,  # HTML内容
            'css_content': self.css_content,    # CSS样式
            'js_content': self.js_content,      # JavaScript脚本
            'is_active': self.is_active,      # 是否激活
            'sort_order': self.sort_order      # 排序顺序
        }


class SiteConfig(db.Model):
    """网站配置模型 - 存储系统配置参数（如网站名称、联系方式等）"""
    __tablename__ = 'site_config'
    
    # 配置ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 配置键，唯一，必填，最大100字符，用于代码中读取配置
    key = db.Column(db.String(100), unique=True, nullable=False)
    # 配置值，文本类型，存储配置的具体内容
    value = db.Column(db.Text)
    # 配置值类型，字符串，默认'string'，用于类型转换
    # 可选值：string(字符串)/int(整数)/float(浮点数)/bool(布尔值)/json(JSON)
    value_type = db.Column(db.String(20), default='string')
    # 配置分类，最大50字符，用于后台管理分类展示
    category = db.Column(db.String(50))
    # 配置描述，文本类型，说明配置的用途
    description = db.Column(db.Text)
    # 是否公开，布尔值，默认False，公开配置可以被前端访问
    is_public = db.Column(db.Boolean, default=False)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """将配置模型转换为字典格式"""
        return {
            'id': self.id,                      # 配置ID
            'key': self.key,                    # 配置键
            'value': self.value,                # 配置值（原始字符串）
            'value_type': self.value_type,      # 值类型
            'category': self.category,          # 配置分类
            'description': self.description,    # 配置描述
            'is_public': self.is_public      # 是否公开
        }

    def get_typed_value(self):
        """获取类型化后的配置值，根据value_type转换为对应类型"""
        # 如果类型是整数，将字符串转换为整数
        if self.value_type == 'int':
            return int(self.value) if self.value else 0
        # 如果类型是浮点数，将字符串转换为浮点数
        elif self.value_type == 'float':
            return float(self.value) if self.value else 0.0
        # 如果类型是布尔值，将字符串转换为布尔值
        elif self.value_type == 'bool':
            return self.value.lower() in ('true', '1', 'yes') if self.value else False
        # 如果类型是JSON，将字符串解析为JSON对象
        elif self.value_type == 'json':
            import json
            return json.loads(self.value) if self.value else {}
        # 否则返回原始字符串值
        else:
            return self.value


class Menu(db.Model):
    """菜单模型 - 存储导航菜单信息（支持多级菜单）"""
    __tablename__ = 'menu'
    
    # 菜单ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 菜单名称，必填，最大100字符，用于前端显示
    name = db.Column(db.String(100), nullable=False)
    # 菜单URL，最大500字符，点击菜单后跳转的地址
    url = db.Column(db.String(500))
    # 菜单图标，最大100字符，菜单前面的图标类名
    icon = db.Column(db.String(100))
    # 父菜单ID，外键引用menu表的id字段，用于构建多级菜单
    parent_id = db.Column(db.Integer, db.ForeignKey('menu.id'))
    # 排序顺序，整数，默认0，数值越小越靠前
    sort_order = db.Column(db.Integer, default=0)
    # 是否激活，布尔值，默认True，未激活的菜单项不显示
    is_active = db.Column(db.Boolean, default=True)
    # 菜单类型，字符串，默认'main'（主菜单）
    # 可选值：main(主菜单)/footer(底部菜单)/sidebar(侧边栏菜单)
    menu_type = db.Column(db.String(50), default='main')
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        """将菜单模型转换为字典格式"""
        return {
            'id': self.id,                      # 菜单ID
            'name': self.name,                  # 菜单名称
            'url': self.url,                    # 菜单URL
            'icon': self.icon,                  # 菜单图标
            'parent_id': self.parent_id,        # 父菜单ID
            'sort_order': self.sort_order,      # 排序顺序
            'is_active': self.is_active,      # 是否激活
            'menu_type': self.menu_type        # 菜单类型
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
# - 一对多：User → Order（一个用户多个订单）
# - 一对多：Order → OrderItem（一个订单多个订单项）

class Order(db.Model):
    """订单模型 - 存储用户订单信息"""
    __tablename__ = 'order'
    
    # 订单ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用user表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # 订单号，唯一，必填，最大80字符，用于财务对账
    order_no = db.Column(db.String(80), unique=True, nullable=False)
    # 订单总金额，浮点数，默认0.0
    total_amount = db.Column(db.Float, default=0.0)
    # 订单状态，字符串，默认'pending'（待支付）
    # 可选值：pending(待支付)/paid(已支付)/cancelled(已取消)/refunded(已退款)
    status = db.Column(db.String(30), default='pending')
    # 支付方式，字符串，默认'alipay'（支付宝）
    # 可选值：alipay(支付宝)/wechat(微信支付)/bank_card(银行卡)
    payment_method = db.Column(db.String(30), default='alipay')
    # 支付时间，datetime类型，支付成功后更新
    payment_time = db.Column(db.DateTime, nullable=True)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联的订单项列表，级联删除（订单删除时，订单项也删除）
    items = db.relationship('OrderItem', backref='order', cascade='all, delete-orphan')

    def to_dict(self):
        """将订单模型转换为字典格式，包含订单项列表"""
        return {
            'id': self.id,                              # 订单ID
            'user_id': self.user_id,                    # 用户ID
            'order_no': self.order_no,                  # 订单号
            'total_amount': self.total_amount,          # 订单总金额
            'status': self.status,                    # 订单状态
            'payment_method': self.payment_method,    # 支付方式
            # 将datetime对象转换为ISO格式字符串
            'payment_time': self.payment_time.isoformat() if self.payment_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # 包含订单项列表，调用每个订单项的to_dict()方法
            'items': [item.to_dict() for item in self.items] if self.items else []
        }


class OrderItem(db.Model):
    """订单明细模型 - 存储订单中的具体商品项"""
    __tablename__ = 'order_item'
    
    # 订单项ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的订单ID，外键引用order表的id字段，必填
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    # 产品ID，必填，最大120字符，关联的产品的唯一标识
    product_id = db.Column(db.String(120), nullable=False)
    # 产品名称，必填，最大200字符，冗余存储，避免频繁关联查询
    product_name = db.Column(db.String(200), nullable=False)
    # 产品类型，必填，最大50字符，如"ticket"(门票）/"hotel"(酒店）/"flight"(机票）
    product_type = db.Column(db.String(50), nullable=False)
    # 数量，整数，默认1
    quantity = db.Column(db.Integer, default=1)
    # 单价，浮点数，默认0.0
    unit_price = db.Column(db.Float, default=0.0)
    # 总价，浮点数，默认0.0，等于quantity * unit_price
    total_price = db.Column(db.Float, default=0.0)
    # 预订详情，文本类型，JSON格式存储，包含具体的预订信息
    # 如酒店：入住日期、退房日期、房间类型等
    # 如机票：出发日期、乘客信息等
    booking_details = db.Column(db.Text)

    def to_dict(self):
        """将订单项模型转换为字典格式"""
        return {
            'id': self.id,                      # 订单项ID
            'order_id': self.order_id,            # 关联的订单ID
            'product_id': self.product_id,        # 产品ID
            'product_name': self.product_name,    # 产品名称
            'product_type': self.product_type,    # 产品类型
            'quantity': self.quantity,            # 数量
            'unit_price': self.unit_price,        # 单价
            'total_price': self.total_price,      # 总价
            'booking_details': self.booking_details  # 预订详情（JSON字符串）
        }


class Product(db.Model):
    """产品模型 - 存储景点门票、酒店、机票等产品信息"""
    __tablename__ = 'product'
    
    # 产品ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 产品名称，必填，最大200字符
    name = db.Column(db.String(200), nullable=False)
    # 产品副标题，最大500字符，用于列表页展示
    subtitle = db.Column(db.String(500))
    # 产品描述，可选，文本类型，详细说明产品信息
    description = db.Column(db.Text)
    # 关联的景点ID，外键引用destinations表的id字段
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=True, index=True)
    # 产品类别，字符串，默认'ticket'（门票），添加索引
    # 可选值：ticket(门票)/hotel(酒店)/flight(机票)/experience(体验）
    category = db.Column(db.String(50), default='ticket', index=True)
    # 产品类型（兼容前端），与category保持一致
    type = db.Column(db.String(20), default='ticket')
    # 基础价格，浮点数，默认0.0
    base_price = db.Column(db.Float, default=0.0)
    # 折扣价格，浮点数，如果有折扣则使用此价格
    discount_price = db.Column(db.Float, nullable=True)
    # 售价（兼容直接定价场景），浮点数，默认0.0
    price = db.Column(db.Float, default=0.0)
    # 位置信息，文本类型，JSON格式存储，包含城市、经纬度等
    location = db.Column(db.Text)
    # 总库存，整数，默认0
    inventory_total = db.Column(db.Integer, default=0)
    # 已售数量，整数，默认0，用于计算可用库存
    inventory_sold = db.Column(db.Integer, default=0)
    # 预订类型，字符串，默认'date'（按日期预订）
    # 可选值：date(按日期)/time(按时间)/quantity(按数量）
    booking_type = db.Column(db.String(20), default='date')
    # 是否需要日期，布尔值，默认True，如酒店预订需要日期
    need_date = db.Column(db.Boolean, default=True)
    # 是否需要时间，布尔值，默认False，如餐厅预订需要时间
    need_time = db.Column(db.Boolean, default=False)
    # 封面图片URL，最大500字符
    cover_image = db.Column(db.String(500))
    # 图片列表，文本类型，JSON格式字符串，存储多张图片URL
    images = db.Column(db.Text)
    # 产品状态，字符串，默认'active'（上架），添加索引
    # 可选值：active(上架)/inactive(下架）
    status = db.Column(db.String(20), default='active', index=True)
    # 评分，浮点数，默认5.0，添加索引
    rating = db.Column(db.Float, default=5.0, index=True)
    # 销售数量，整数，默认0，添加索引，用于热门推荐
    sold_count = db.Column(db.Integer, default=0, index=True)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联的景点对象，使用joined加载策略立即加载
    destination = db.relationship('Destination', foreign_keys=[destination_id], lazy='joined')

    def to_dict(self):
        """将产品模型转换为字典格式，包含关联景点信息"""
        # 优先使用price字段，其次折扣价，最后基础价
        display_price = self.price if self.price else (self.discount_price if self.discount_price else self.base_price)
        d = self.destination
        return {
            'id': self.id,                              # 产品ID
            'name': self.name,                        # 产品名称
            'subtitle': self.subtitle,                # 产品副标题
            'description': self.description,            # 产品描述
            'destination_id': self.destination_id,    # 关联的景点ID
            'category': self.category,                # 产品类别
            'type': self.type or self.category,      # 产品类型
            # 显示价格（优先级：price > discount_price > base_price）
            'price': display_price,
            'base_price': self.base_price,            # 基础价格
            'discount_price': self.discount_price,    # 折扣价格
            # 计算可用库存（总库存 - 已售数量）
            'inventory_available': max(0, self.inventory_total - self.inventory_sold),
            'booking_type': self.booking_type,        # 预订类型
            'need_date': self.need_date,              # 是否需要日期
            'need_time': self.need_time,              # 是否需要时间
            'cover_image': self.cover_image,          # 封面图片URL
            # 解析图片列表（JSON格式）
            'images': json.loads(self.images) if self.images else [],
            'status': self.status,                    # 产品状态
            'rating': self.rating,                    # 评分
            'sold_count': self.sold_count,            # 销售数量
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # 解析位置信息（JSON格式）
            'location': json.loads(self.location) if self.location else None,
            # 关联景点信息（用于行程展示）
            'destination': {
                'id': d.id,
                'name': d.name,
                'city': d.city,
                'open_time': d.open_time,
                'description': d.description,
                'ticket_price': d.ticket_price,
            } if d else None,
        }


class ProductReview(db.Model):
    """产品评价模型 - 存储用户对产品的评价和评分"""
    __tablename__ = 'product_review'
    
    # 评价ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的产品ID，外键引用product表的id字段，必填，添加索引
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False, index=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 评分，整数，默认5，必填，1-5分
    rating = db.Column(db.Integer, default=5, nullable=False)
    # 评价内容，必填，文本类型
    content = db.Column(db.Text, nullable=False)
    # 评价图片，文本类型，JSON格式存储图片URL列表
    images = db.Column(db.Text)  # JSON 格式存储图片 URL 列表
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系
    author = db.relationship('User', foreign_keys=[user_id], lazy='joined')
    product = db.relationship('Product', foreign_keys=[product_id], lazy='joined')

    def to_dict(self):
        """将评价模型转换为字典格式，包含作者信息"""
        author = self.author
        return {
            'id': self.id,                      # 评价ID
            'product_id': self.product_id,        # 产品ID
            'user_id': self.user_id,            # 用户ID
            'rating': self.rating,              # 评分
            'content': self.content,            # 评价内容
            # 解析图片列表（JSON格式）
            'images': json.loads(self.images) if self.images else [],
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # 包含作者信息（ID、昵称、头像）
            'user': {
                'id': str(author.id) if author else str(self.user_id),
                'nickname': getattr(author, 'nickname', '') if author else '',
                'avatar_url': getattr(author, 'avatar', None) if author else None,
            },
        }


class ProductQA(db.Model):
    """产品问答模型 - 存储用户对产品的问题和商家/其他用户的答案"""
    __tablename__ = 'product_qa'
    
    # 问答ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的产品ID，外键引用product表的id字段，必填
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    # 关联的景点ID，外键引用destinations表的id字段
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=True)
    # 关联的用户ID，外键引用users表的id字段，必填
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # 问题内容，必填，文本类型
    question = db.Column(db.Text, nullable=False)
    # 答案内容，可选，文本类型，商家或其他用户的回答
    answer = db.Column(db.Text)
    # 状态，字符串，默认'pending'（待回答）
    # 可选值：pending(待回答)/answered(已回答)/closed(已关闭）
    status = db.Column(db.String(20), default='pending')
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    # 回答时间，datetime类型，回答后更新
    answered_at = db.Column(db.DateTime)
    # 关联的景点对象，使用joined加载策略立即加载
    destination = db.relationship('Destination', foreign_keys=[destination_id], lazy='joined')

    def to_dict(self):
        """将问答模型转换为字典格式"""
        return {
            "id": self.id,                          # 问答ID
            "product_id": self.product_id,            # 产品ID
            "destination_id": self.destination_id,    # 景点ID
            "user_id": self.user_id,                # 用户ID
            "question": self.question,                # 问题内容
            "answer": self.answer,                  # 答案内容
            "status": self.status,                  # 状态
            # 将datetime对象转换为ISO格式字符串
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "answered_at": self.answered_at.isoformat() if self.answered_at else None,
        }


class TravelNote(db.Model):
    """游记/攻略模型 - 用户发布的旅行笔记和攻略"""
    __tablename__ = 'travel_notes'
    
    # 游记ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 关联的景点ID，外键引用destinations表的id字段，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), index=True)
    # 游记标题，必填，最大200字符
    title = db.Column(db.String(200), nullable=False)
    # 封面图片URL，最大500字符，用于列表页展示
    cover_image = db.Column(db.String(500))
    # 游记内容，必填，文本类型，HTML格式
    content = db.Column(db.Text, nullable=False)
    # 标签，文本类型，JSON格式存储，如["海滩", "亲子", "美食"]
    tags = db.Column(db.Text)
    # 浏览次数，整数，默认0，用于热门推荐
    view_count = db.Column(db.Integer, default=0)
    # 点赞次数，整数，默认0
    like_count = db.Column(db.Integer, default=0)
    # 状态，字符串，默认'draft'（草稿），添加索引
    # 可选值：draft(草稿)/published(已发布)/rejected(已拒绝）
    status = db.Column(db.String(20), default='draft', index=True)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系：作者信息、关联景点信息
    user = db.relationship('User', backref='travel_notes', lazy='joined')
    destination = db.relationship('Destination', backref='travel_notes', lazy='joined')
    
    def to_dict(self):
        """将游记模型转换为字典格式，包含作者和景点信息"""
        return {
            "id": self.id,                          # 游记ID
            "user_id": self.user_id,                # 用户ID
            "destination_id": self.destination_id,    # 景点ID
            "title": self.title,                    # 游记标题
            "cover_image": self.cover_image,        # 封面图片URL
            "content": self.content,                # 游记内容（HTML格式）
            # 解析标签列表（JSON格式）
            "tags": json.loads(self.tags) if self.tags else [],
            "view_count": self.view_count,            # 浏览次数
            "like_count": self.like_count,          # 点赞次数
            "status": self.status,                  # 状态
            # 将datetime对象转换为ISO格式字符串
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            # 包含作者信息（ID、昵称、头像）
            "user": {"id": self.user.id, "nickname": self.user.nickname, "avatar_url": self.user.avatar} if self.user else None,
            # 包含关联景点信息（ID、名称、城市）
            "destination": {"id": self.destination.id, "name": self.destination.name, "city": self.destination.city} if self.destination else None,
        }


class TravelNoteLike(db.Model):
    """游记点赞模型 - 记录用户点赞游记的行为"""
    __tablename__ = 'travel_note_likes'
    
    # 点赞记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 关联的游记ID，外键引用travel_notes表的id字段，必填，添加索引
    travel_note_id = db.Column(db.Integer, db.ForeignKey('travel_notes.id'), nullable=False, index=True)
    # 点赞时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # 定义联合唯一约束，防止同一用户对同一游记点赞多次
    __table_args__ = (db.UniqueConstraint('user_id', 'travel_note_id', name='uix_user_note_like'),)
    
    # 关联的游记对象
    travel_note = db.relationship('TravelNote', backref='likes')
    
    def to_dict(self):
        """将游记点赞模型转换为字典格式"""
        return {
            'id': self.id,                              # 点赞记录ID
            'user_id': self.user_id,                    # 用户ID
            'travel_note_id': self.travel_note_id,    # 游记ID
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Coupon(db.Model):
    """优惠券数据模型 - 存储系统发放的优惠券"""
    __tablename__ = 'coupons'
    
    # 优惠券ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 优惠券代码，唯一，必填，最大50字符，用户下单时输入
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    # 优惠券名称，必填，最大100字符
    name = db.Column(db.String(100), nullable=False)
    # 优惠券类型，必填，最大20字符
    # 可选值：fixed(固定金额折扣)/percent(百分比折扣）
    type = db.Column(db.String(20), nullable=False)
    # 优惠券值，必填，浮点数
    # 如果type='fixed'，表示减免的金额（如10.0表示减免10元）
    # 如果type='percent'，表示折扣百分比（如10.0表示9折）
    value = db.Column(db.Float, nullable=False)
    # 最低订单金额，浮点数，默认0，满足此金额才能使用优惠券
    min_order = db.Column(db.Float, default=0)
    # 最大使用次数，整数，默认0（0表示无限次）
    max_uses = db.Column(db.Integer, default=0)
    # 已使用次数，整数，默认0，达到max_uses后优惠券失效
    used_count = db.Column(db.Integer, default=0)
    # 开始日期，datetime类型，优惠券生效日期
    start_date = db.Column(db.DateTime)
    # 结束日期，datetime类型，优惠券失效日期
    end_date = db.Column(db.DateTime)
    # 状态，字符串，默认'active'（激活），添加索引
    # 可选值：active(激活)/expired(已过期)/disabled(已禁用）
    status = db.Column(db.String(20), default='active')
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        """将优惠券模型转换为字典格式"""
        return {
            'id': self.id,                      # 优惠券ID
            'code': self.code,                  # 优惠券代码
            'name': self.name,                  # 优惠券名称
            'type': self.type,                  # 优惠券类型
            'value': self.value,                # 优惠券值
            'min_order': self.min_order,        # 最低订单金额
            'max_uses': self.max_uses,          # 最大使用次数
            'used_count': self.used_count,      # 已使用次数
            # 将datetime对象转换为ISO格式字符串
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,                # 状态
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class UserCoupon(db.Model):
    """用户优惠券领取记录模型 - 记录用户领取优惠券的行为"""
    __tablename__ = 'user_coupons'
    
    # 领取记录ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 关联的优惠券ID，外键引用coupons表的id字段，必填，添加索引
    coupon_id = db.Column(db.Integer, db.ForeignKey('coupons.id'), nullable=False, index=True)
    # 是否已使用，布尔值，默认False
    is_used = db.Column(db.Boolean, default=False)
    # 使用时间，datetime类型，使用优惠券后更新
    used_at = db.Column(db.DateTime)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # 定义联合唯一约束，防止同一用户重复领取同一优惠券
    __table_args__ = (db.UniqueConstraint('user_id', 'coupon_id', name='uix_user_coupon'),)
    
    # 关联的优惠券对象
    coupon = db.relationship('Coupon', backref='user_coupons')
    
    def to_dict(self):
        """将用户优惠券模型转换为字典格式，包含优惠券详情"""
        return {
            'id': self.id,                      # 领取记录ID
            'user_id': self.user_id,            # 用户ID
            'coupon_id': self.coupon_id,        # 优惠券ID
            'is_used': self.is_used,            # 是否已使用
            # 将datetime对象转换为ISO格式字符串
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # 包含优惠券详情
            'coupon': self.coupon.to_dict() if self.coupon else None
        }


class SupportTicket(db.Model):
    """客服工单模型 - 存储用户提交的客服咨询和投诉"""
    __tablename__ = 'support_tickets'
    
    # 工单ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 工单标题，必填，最大200字符
    title = db.Column(db.String(200), nullable=False)
    # 工单描述，必填，文本类型，详细说明问题
    description = db.Column(db.Text, nullable=False)
    # 工单类型，字符串，默认'other'，添加索引
    # 可选值：booking(订单问题)/payment(支付问题)/refund(退款问题)/other(其他）
    ticket_type = db.Column(db.String(20), default='other')
    # 工单状态，字符串，默认'open'（待处理），添加索引
    # 可选值：open(待处理)/in_progress(处理中)/resolved(已解决)/closed(已关闭）
    status = db.Column(db.String(20), default='open', index=True)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系：提交工单的用户、工单回复列表
    user = db.relationship('User', foreign_keys=[user_id], lazy='joined')
    replies = db.relationship('TicketReply', backref='ticket', cascade='all, delete-orphan')
    
    def to_dict(self):
        """将工单模型转换为字典格式"""
        return {
            'id': self.id,                      # 工单ID
            'user_id': self.user_id,            # 用户ID
            'title': self.title,                # 工单标题
            'description': self.description,    # 工单描述
            'ticket_type': self.ticket_type,    # 工单类型
            'status': self.status,                # 工单状态
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class TicketReply(db.Model):
    """工单回复模型 - 存储客服或用户对工单的回复"""
    __tablename__ = 'ticket_replies'
    
    # 回复ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的工单ID，外键引用support_tickets表的id字段，必填，添加索引
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id'), nullable=False, index=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 回复内容，必填，文本类型
    content = db.Column(db.Text, nullable=False)
    # 是否管理员回复，布尔值，默认False，用于区分是客服回复还是用户回复
    is_admin = db.Column(db.Boolean, default=False)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    
    # 关联关系：回复作者
    user = db.relationship('User', foreign_keys=[user_id], lazy='joined')
    
    def to_dict(self):
        """将工单回复模型转换为字典格式，包含作者信息"""
        user = self.user
        return {
            'id': self.id,                      # 回复ID
            'ticket_id': self.ticket_id,            # 工单ID
            'user_id': self.user_id,            # 用户ID
            'content': self.content,            # 回复内容
            'is_admin': self.is_admin,            # 是否管理员回复
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # 包含作者信息（ID、昵称、头像）
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
    # 关联的用户ID，外键引用users表的id字段，允许为空（支持匿名对话），添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    # 会话ID，用于将多条对话关联到同一个会话，必填，添加索引
    session_id = db.Column(db.String(100), nullable=False, index=True)
    # 发言角色：user（用户）/ assistant（AI助手）/ system（系统提示词）
    role = db.Column(db.String(20), nullable=False)
    # 对话内容，必填，文本类型
    content = db.Column(db.Text, nullable=False)
    # 意图类型：行程规划、景点咨询、酒店推荐等，添加索引
    intent = db.Column(db.String(50), index=True)
    # 额外元数据，JSON格式存储，使用meta_data避免与SQLAlchemy保留字段冲突
    meta_data = db.Column(db.JSON)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        """将对话记录模型转换为字典格式"""
        return {
            'id': self.id,                              # 对话记录ID
            'user_id': self.user_id,                    # 用户ID
            'session_id': self.session_id,                # 会话ID
            'role': self.role,                        # 发言角色
            'content': self.content,                    # 对话内容
            'intent': self.intent,                    # 意图类型
            'metadata': self.meta_data,                # 额外元数据（JSON格式）
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TravelPlan(db.Model):
    """行程规划模型 - 存储由AI生成的完整行程规划"""
    __tablename__ = 'travel_plans'

    # 规划ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的对话ID，外键引用ai_conversations表，用于追溯生成来源
    conversation_id = db.Column(db.Integer, db.ForeignKey('ai_conversations.id'), index=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 会话ID，用于关联到原始的AI对话
    session_id = db.Column(db.String(100), index=True)
    # 规划名称，如"北京三日游"
    plan_name = db.Column(db.String(200))
    # 目的地，如"北京"
    destination = db.Column(db.String(100), index=True)
    # 开始日期，Date类型
    start_date = db.Column(db.Date)
    # 结束日期，Date类型
    end_date = db.Column(db.Date)
    # 预算，浮点数，单位：元
    budget = db.Column(db.Float)
    # 偏好设置，JSON格式存储，包含旅行风格、人数等
    preferences = db.Column(db.JSON)
    # 详细行程，JSON格式存储每日行程安排
    # 格式：[{"day": 1, "date": "2024-01-01", "activities": [...], "meals": [...]}]
    plan_details = db.Column(db.JSON)
    # 状态：draft（草稿）/ confirmed（已确认）/ completed（已完成）/ cancelled（已取消）
    status = db.Column(db.String(20), default='draft', index=True)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """将行程规划模型转换为字典格式"""
        return {
            'id': self.id,                              # 规划ID
            'conversation_id': self.conversation_id,    # 关联的对话ID
            'user_id': self.user_id,                    # 用户ID
            'session_id': self.session_id,                # 会话ID
            'plan_name': self.plan_name,                # 规划名称
            'destination': self.destination,            # 目的地
            # 将date对象转换为ISO格式字符串
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'budget': self.budget,                    # 预算
            'preferences': self.preferences,            # 偏好设置（JSON格式）
            'plan_details': self.plan_details,            # 详细行程（JSON格式）
            'status': self.status,                    # 状态
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class PlanItem(db.Model):
    """行程项目模型 - 存储行程中的具体活动项目"""
    __tablename__ = 'plan_items'

    # 项目ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的行程ID，外键引用travel_plans表的id字段，必填，添加索引
    plan_id = db.Column(db.Integer, db.ForeignKey('travel_plans.id'), nullable=False, index=True)
    # 关联的景点ID，外键引用destinations表的id字段，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), index=True)
    # 第几天的行程，必填，添加索引
    day_number = db.Column(db.Integer, nullable=False, index=True)
    # 排序顺序，整数，默认0
    sort_order = db.Column(db.Integer, default=0)
    # 时间段：morning(上午)/afternoon(下午)/evening(晚上）
    time_slot = db.Column(db.String(20))
    # 活动类型：景点/餐厅/交通/酒店
    activity_type = db.Column(db.String(50))
    # 标题，如"参观故宫"
    title = db.Column(db.String(200))
    # 描述，详细说明活动内容
    description = db.Column(db.Text)
    # 地点，如"北京市东城区"
    location = db.Column(db.String(200))
    # 开始时间，Time类型
    start_time = db.Column(db.Time)
    # 结束时间，Time类型
    end_time = db.Column(db.Time)
    # 持续时间（分钟），整数
    duration_minutes = db.Column(db.Integer)
    # 费用，浮点数，单位：元
    cost = db.Column(db.Float)
    # 预订信息，JSON格式存储，如酒店预订号、航班号等
    booking_info = db.Column(db.JSON)
    # 创建时间，默认当前时间
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        """将行程项目模型转换为字典格式"""
        return {
            'id': self.id,                              # 项目ID
            'plan_id': self.plan_id,                    # 关联的行程ID
            'destination_id': self.destination_id,    # 关联的景点ID
            'day_number': self.day_number,            # 第几天
            'sort_order': self.sort_order,            # 排序顺序
            'time_slot': self.time_slot,                # 时间段
            'activity_type': self.activity_type,        # 活动类型
            'title': self.title,                        # 标题
            'description': self.description,            # 描述
            'location': self.location,                # 地点
            # 将time对象转换为ISO格式字符串
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_minutes': self.duration_minutes,  # 持续时间（分钟）
            'cost': self.cost,                        # 费用
            'booking_info': self.booking_info          # 预订信息（JSON格式）
        }


class Comment(db.Model):
    """评论模型 - 存储用户对景点/目的地/产品的评论"""
    __tablename__ = 'comments'

    # 评论ID，主键，自增长
    id = db.Column(db.Integer, primary_key=True)
    # 关联的用户ID，外键引用users表的id字段，必填，添加索引
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 关联的目的地/景点ID，外键引用destinations表的id字段，添加索引
    destination_id = db.Column(db.Integer, db.ForeignKey('destinations.id'), index=True)
    # 关联的产品ID，外键引用product表的id字段，添加索引
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), index=True)
    # 关联的游记ID，外键引用travel_notes表的id字段，添加索引
    travel_note_id = db.Column(db.Integer, db.ForeignKey('travel_notes.id'), index=True)
    # 父评论ID，用于回复功能，外键引用comments表的id字段，添加索引
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), index=True)
    # 评论内容，必填，文本类型
    content = db.Column(db.Text, nullable=False)
    # 评分，浮点数，1-5分，默认5.0
    rating = db.Column(db.Float, default=5.0)
    # 评论状态，字符串，默认'approved'（已通过），添加索引
    # 可选值：pending(待审核)/approved(已通过)/rejected(已拒绝）/spam(垃圾评论）
    status = db.Column(db.String(20), default='approved', index=True)
    # 点赞数量，整数，默认0
    like_count = db.Column(db.Integer, default=0)
    # 回复数量，整数，默认0
    reply_count = db.Column(db.Integer, default=0)
    # 创建时间，默认当前时间，添加索引
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    # 更新时间，默认当前时间，更新时自动刷新
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关系：作者信息、关联景点、回复列表
    user = db.relationship('User', backref='comments', lazy='joined')
    destination = db.relationship('Destination', backref='comments', lazy='joined')
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')

    def to_dict(self):
        """将评论模型转换为字典格式，包含作者信息"""
        return {
            'id': self.id,                              # 评论ID
            'user_id': self.user_id,                    # 用户ID
            'destination_id': self.destination_id,    # 景点ID
            'product_id': self.product_id,            # 产品ID
            'travel_note_id': self.travel_note_id,    # 游记ID
            'parent_id': self.parent_id,                # 父评论ID
            'content': self.content,                    # 评论内容
            'rating': self.rating,                    # 评分
            'status': self.status,                    # 评论状态
            'like_count': self.like_count,            # 点赞数量
            'reply_count': self.reply_count,            # 回复数量
            # 将datetime对象转换为ISO格式字符串
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # 包含作者信息（ID、昵称、头像）
            'user': {
                'id': self.user.id,
                'nickname': getattr(self.user, 'nickname', ''),
                'avatar_url': getattr(self.user, 'avatar', None),
            } if self.user else None
        }
