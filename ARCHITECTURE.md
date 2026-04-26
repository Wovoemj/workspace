# 智能旅游助手 - 项目架构说明

**文档版本**: v2.0  
**最后更新**: 2026年4月23日  
**项目状态**: 开发阶段

---

## 一、项目概述

### 1.1 项目定位
智能旅游助手（Travel Assistant）是一个**AI驱动的个性化旅行规划平台**，通过人工智能技术为用户提供智能化的旅行咨询、行程规划和景点推荐服务。

### 1.2 核心功能模块（共20个）

| 序号 | 模块名称 | 功能说明 | 代码位置 |
|------|---------|---------|---------|
| 1 | 用户系统 | 注册、登录、个人信息管理、会员等级、积分 | `app.py:492-814` |
| 2 | 景点管理 | 景点列表、详情、搜索、筛选、推荐、评论 | `app.py:1015-1450` |
| 3 | 行程规划 | 创建行程、添加景点、生成行程 | `app.py:2150-2170` |
| 4 | AI对话 | 智能问答、流式响应、工具调用 | `app.py:3807-4090` |
| 5 | AI行程生成 | 自动生成旅游行程规划 | `app.py:4091-4280` |
| 6 | 用户收藏 | 收藏景点、取消收藏 | `app.py:1642-1709` |
| 7 | 用户足迹 | 记录浏览历史 | `app.py:1506-1546` |
| 8 | 旅行游记 | 发布、查看、点赞、评论游记 | `app.py:1733-1930` |
| 9 | 优惠券 | 领取、使用、验证优惠券 | `app.py:1938-2070` |
| 10 | 天气查询 | 实时天气、预报信息 | `app.py:2611-2650` |
| 11 | 机票预订 | 航班搜索、详情查询 | `app.py:2658-2690` |
| 12 | 酒店预订 | 酒店搜索、房型查询 | `app.py:2694-2733` |
| 13 | 用户通知 | 消息通知、已读未读 | `app.py:3308-3352` |
| 14 | 用户推荐 | 个性化景点推荐 | `app.py:3373-3380` |
| 15 | 客服工单 | 提交工单、回复工单 | `app.py:2752-2876` |
| 16 | 景点创建 | 管理员创建景点 | `app.py:2091-2145` |
| 17 | 统计面板 | 平台数据统计 | `app.py:2188-2290` |
| 18 | 媒体服务 | 图片/文件服务 | `app.py:2572-2610` |
| 19 | 管理员系统 | 用户管理、景点管理、地区管理 | `app.py:2293-2520` |
| 20 | 全局搜索 | 景点、商品搜索 | `app.py:3230-3290` |

### 1.3 技术特色
- **AI优先架构** - 深度集成大语言模型能力（Kimi/智谱/OpenAI）
- **前后端分离** - 清晰的职责划分和独立部署
- **性能优化** - Redis缓存、API限流、查询优化
- **可扩展设计** - 模块化架构支持功能扩展

---

## 二、整体架构设计

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层 (Client Layer)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   用户Web前端    │  │   管理Web前端    │  │   移动端(PWA)    │ │
│  │  (Next.js 14)   │  │  (Ant Design)   │  │  (React Native) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      网关层 (Gateway Layer)                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              API Gateway (Nginx / Go Gateway)               ││
│  │  • 请求路由  • 负载均衡  • 限流熔断  • SSL终止              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    应用层 (Application Layer)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Flask 主应用 (app.py)                          ││
│  │  • RESTful API  • 业务逻辑  • 数据验证  • 权限控制          ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   AI服务模块     │  │   数据服务模块   │  │   通知服务模块   │ │
│  │  (Kimi/智谱/OAI) │  │ (Redis缓存)     │  │ (Notification)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据层 (Data Layer)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   主数据库       │  │   缓存数据库     │  │   文件存储       │ │
│  │  (SQLite/MySQL) │  │    (Redis)      │  │ (本地/云存储)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    外部服务层 (External Services)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   AI模型服务     │  │   天气API服务    │  │   地图API服务    │ │
│  │ (Kimi/智谱/OAI) │  │  (心知天气)     │  │ (高德地图)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、数据模型设计

### 3.1 实体关系图

```
┌─────────────────┐      ┌─────────────────┐
│      User       │      │   Destination   │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ username        │      │ name            │
│ email           │      │ city            │
│ phone           │      │ province        │
│ password_hash   │      │ description     │
│ avatar          │      │ cover_image     │
│ membership_level│      │ rating          │
│ points          │      │ ticket_price    │
│ invite_code     │      │ open_time       │
│ invited_by      │      │ lng/lat         │
│ preferences     │      │ created_at      │
│ created_at      │      └─────────────────┘
│ last_login      │              │
└─────────────────┘              │
        │                        │
        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│      Trip       │      │   TripItem     │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │◀─────│ trip_id (FK)   │
│ user_id (FK)    │      │ destination_id │
│ title           │      │ day_number      │
│ description     │      │ title           │
│ start_date      │      │ location        │
│ end_date        │      │ start_time      │
│ status          │      │ end_time        │
└─────────────────┘      │ sort_order      │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│    Favorite     │      │ UserFootprint  │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ user_id (FK)    │      │ user_id (FK)    │
│ destination_id  │─────▶│ destination_id  │
│ created_at      │      │ view_time       │
└─────────────────┘      │ view_duration   │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│DestinationComment│     │    Notification │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ destination_id  │      │ user_id (FK)    │
│ user_id (FK)    │      │ type            │
│ content         │      │ title           │
│ created_at      │      │ content         │
└─────────────────┘      │ is_read         │
                         │ created_at      │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│     Order       │      │    Coupon       │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │◀─────│ order_id (FK)   │
│ user_id (FK)    │      │ id (PK)         │
│ order_no        │      │ code            │
│ total_amount    │      │ name            │
│ status          │      │ discount_amount │
│ payment_method  │      │ min_order_amount│
│ payment_time    │      │ valid_from      │
│ created_at      │      │ valid_until     │
└─────────────────┘      │ status          │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│TravelNote(游记) │      │ SupportTicket   │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ user_id (FK)    │      │ user_id (FK)    │
│ title           │      │ subject         │
│ content         │      │ description     │
│ cover_image     │      │ status          │
│ destination_id  │      │ priority        │
│ likes_count     │      │ created_at      │
│ comments_count  │      └─────────────────┘
│ created_at      │              │
└─────────────────┘              ▼
                         ┌─────────────────┐
                         │  TicketReply    │
                         ├─────────────────┤
                         │ id (PK)         │
                         │ ticket_id (FK) │
                         │ user_id (FK)    │
                         │ content         │
                         │ is_admin        │
                         │ created_at      │
                         └─────────────────┘
```

### 3.2 数据表清单（共15张）

| 表名 | 中文名 | 主要字段 | 代码位置 |
|------|-------|---------|---------|
| users | 用户表 | id, username, email, phone, password_hash, membership_level, points | `models.py:75` |
| destinations | 景点表 | id, name, city, province, rating, ticket_price, lng, lat | `models.py:15` |
| trips | 行程表 | id, user_id, title, start_date, end_date, status | `models.py:128` |
| trip_items | 行程项目表 | id, trip_id, destination_id, day_number, title, location | `models.py:167` |
| favorites | 收藏表 | id, user_id, destination_id, created_at | `models.py:234` |
| user_footprint | 用户足迹表 | id, user_id, destination_id, view_time, view_duration | `models.py:256` |
| user_likes | 点赞表 | id, user_id, destination_id, created_at | `models.py:211` |
| destination_comment | 景点评论表 | id, destination_id, user_id, content, created_at | `models.py:281` |
| notification | 通知表 | id, user_id, type, title, content, is_read | `models.py:312` |
| order | 订单表 | id, user_id, order_no, total_amount, status, payment_method | `models.py:466` |
| order_item | 订单明细表 | id, order_id, product_id, product_name, quantity, unit_price | `models.py:491` |
| travel_note | 旅行游记表 | id, user_id, title, content, cover_image, likes_count | (未在models.py中) |
| coupon | 优惠券表 | id, code, name, discount_amount, min_order_amount, valid_from, valid_until, status | (未在models.py中) |
| support_ticket | 客服工单表 | id, user_id, subject, description, status, priority | (未在models.py中) |
| ticket_reply | 工单回复表 | id, ticket_id, user_id, content, is_admin, created_at | (未在models.py中) |

---

## 四、API接口完整清单

### 4.1 用户相关接口（13个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| POST | `/api/users/register` | 用户注册 | `app.py:851` |
| POST | `/api/users/login` | 用户登录 | `app.py:492` |
| POST | `/api/users/check` | 检查用户是否存在 | `app.py:544` |
| GET | `/api/users/me` | 获取当前用户信息 | `app.py:568` |
| PUT | `/api/users/me` | 更新当前用户信息 | `app.py:812` |
| GET | `/api/users/me/points` | 获取用户积分 | `app.py:631` |
| GET | `/api/users/me/points/history` | 获取积分历史 | `app.py:692` |
| GET | `/api/users/invite` | 获取邀请信息 | `app.py:732` |
| GET | `/api/users/invite/stats` | 获取邀请统计 | `app.py:775` |
| GET | `/api/admin/users` | 管理员获取用户列表 | `app.py:2293` |
| POST | `/api/admin/users` | 管理员创建用户 | `app.py:2341` |
| DELETE | `/api/admin/users/<id>` | 管理员删除用户 | `app.py:2400` |
| POST | `/api/admin/login` | 管理员登录 | `app.py:438` |

### 4.2 景点相关接口（9个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| GET | `/api/destinations` | 获取景点列表（支持分页/搜索/筛选） | `app.py:1015` |
| GET | `/api/destinations/metadata` | 获取景点元数据（城市/省份列表） | `app.py:1128` |
| GET | `/api/destinations/<id>` | 获取景点详情 | `app.py:1362` |
| GET | `/api/destinations/<id>/recommendations` | 获取景点推荐 | `app.py:1396` |
| GET | `/api/destinations/<id>/comments` | 获取景点评论列表 | `app.py:1412` |
| POST | `/api/destinations/<id>/comments` | 发布景点评论 | `app.py:1449` |
| POST | `/api/destinations` | 管理员创建景点 | `app.py:2091` |
| PUT | `/api/admin/destinations/<id>` | 管理员更新景点 | `app.py:974` |
| DELETE | `/api/admin/destinations/<id>` | 管理员删除景点 | `app.py:997` |

### 4.3 行程相关接口（5个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| GET | `/api/trips` | 获取行程列表 | `app.py:2150` |
| POST | `/api/itinerary/generate` | AI生成行程规划 | `app.py:4091` |
| POST | `/api/conversations/save` | 保存会话记录 | `app.py:4289` |
| GET | `/api/admin/destinations` | 管理员获取景点列表 | `app.py:941` |

### 4.4 收藏与足迹接口（4个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| GET | `/api/favorites` | 获取用户收藏列表 | `app.py:1642` |
| POST | `/api/favorites` | 添加收藏 | `app.py:1680` |
| DELETE | `/api/favorites/<id>` | 取消收藏 | `app.py:1709` |
| GET | `/api/footprints` | 获取用户足迹 | `app.py:1506` |

### 4.5 游记相关接口（7个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| GET | `/api/travel-notes` | 获取游记列表 | `app.py:1733` |
| POST | `/api/travel-notes` | 发布游记 | `app.py:1770` |
| GET | `/api/travel-notes/<id>` | 获取游记详情 | `app.py:1811` |
| PUT | `/api/travel-notes/<id>` | 更新游记 | `app.py:1825` |
| DELETE | `/api/travel-notes/<id>` | 删除游记 | `app.py:1862` |
| POST | `/api/travel-notes/<id>/like` | 点赞游记 | `app.py:1885` |
| POST | `/api/travel-notes/<id>/unlike` | 取消点赞 | `app.py:1912` |

### 4.6 优惠券接口（4个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| GET | `/api/coupons/available` | 获取可领取优惠券 | `app.py:1938` |
| POST | `/api/coupons/claim` | 领取优惠券 | `app.py:1959` |
| GET | `/api/coupons/my` | 获取我的优惠券 | `app.py:2015` |
| POST | `/api/coupons/apply` | 使用优惠券验证 | `app.py:2039` |

### 4.7 AI对话接口（3个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| POST | `/api/chat` | AI对话（流式响应） | `app.py:3807` |
| POST | `/api/agent/chat` | Agent模式对话 | `app.py:4007` |

### 4.8 外部服务接口（5个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| GET | `/api/weather` | 天气查询 | `app.py:2611` |
| GET | `/api/flights/search` | 航班搜索 | `app.py:2658` |
| GET | `/api/flights/<id>` | 航班详情 | `app.py:2679` |
| GET | `/api/hotels/search` | 酒店搜索 | `app.py:2694` |
| GET | `/api/hotels/<id>/rooms` | 酒店房型 | `app.py:2733` |

### 4.9 通知与客服接口（6个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| GET | `/api/notifications` | 获取通知列表 | `app.py:3308` |
| PUT | `/api/notifications/<id>/read` | 标记已读 | `app.py:3352` |
| GET | `/api/support/tickets` | 获取工单列表 | `app.py:2752` |
| POST | `/api/support/tickets` | 提交工单 | `app.py:2773` |
| GET | `/api/support/tickets/<id>` | 获取工单详情 | `app.py:2806` |
| POST | `/api/support/tickets/<id>/reply` | 回复工单 | `app.py:2839` |

### 4.10 其他接口（6个）

| 方法 | 路径 | 功能 | 代码行 |
|------|------|------|--------|
| GET | `/api/health` | 健康检查 | `app.py:2521` |
| GET | `/api/stats` | 平台统计 | `app.py:2188` |
| GET | `/api/admin/stats` | 管理员统计 | `app.py:2469` |
| GET | `/api/media` | 媒体文件服务 | `app.py:2572` |
| GET | `/api/recommendations` | 个性化推荐 | `app.py:3373` |
| GET | `/api/search` | 全局搜索 | `app.py:3230` |
| GET | `/api/nearby` | 周边景点查询 | `app.py:2985` |

---

## 五、功能实现流程

### 5.1 用户登录流程

```
┌──────────┐     POST /api/users/login      ┌──────────┐
│  前端    │ ──────────────────────────────▶ │  后端    │
│ (Next.js)│                               │ (Flask)  │
└──────────┘                               └──────────┘
       │                                          │
       │    1. 接收请求，解析JSON                  │
       │    2. 验证用户是否存在                    │
       │    3. 验证密码是否正确                   │
       │    4. 生成JWT Token                      │
       │    5. 更新last_login时间                 │
       │    6. 返回用户信息和Token                │
       │                                          │
       │◀─────────────────────────────────────────┤
       │                                          │
       ▼                                          ▼
┌──────────┐                               ┌──────────┐
│ 存储Token│                               │  SQLite  │
│ localStorage│                          │  数据库   │
└──────────┘                               └──────────┘
```

**后端核心代码（app.py:492-540）**：
```python
@app.route('/api/users/login', methods=['POST'])
def api_user_login():
    data = request.get_json()
    # 1. 根据用户名/邮箱/手机查询用户
    user = User.query.filter(
        (User.username == username) | 
        (User.email == username) | 
        (User.phone == username)
    ).first()
    
    # 2. 验证密码
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'success': False, 'error': '用户名或密码错误'}), 401
    
    # 3. 生成JWT Token
    token = _issue_jwt(user.id)
    
    # 4. 更新登录时间
    user.last_login = datetime.now()
    db.session.commit()
    
    # 5. 返回结果
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })
```

**前端调用（frontend/user-web/src/lib/api.ts）**：
```typescript
export const userApi = {
  login: (body: { phone?: string; email?: string; password: string }) => 
    api.post('/api/users/login', body),
}

// 组件中使用
const handleLogin = async () => {
  const res = await userApi.login({ phone: '13800138000', password: 'xxx' })
  localStorage.setItem('auth_token', res.token)
}
```

### 5.2 景点查询流程

```
┌──────────┐     GET /api/destinations      ┌──────────┐
│  前端    │ ?page=1&city=北京&rating=4.5  │  后端    │
│ (Next.js)│ ──────────────────────────────▶ │ (Flask)  │
└──────────┘                               └──────────┘
       │                                          │
       │    1. 检查Redis缓存                       │
       │    2. 无缓存则查询SQLite                  │
       │    3. 分页处理                            │
       │    4. 排序处理                            │
       │    5. 写入Redis缓存                        │
       │    6. 返回分页结果                         │
       │                                          │
       │◀─────────────────────────────────────────┤
       │                                          │
       ▼                                          ▼
┌──────────┐                               ┌──────────┐
│ 显示景点列表│                            │  SQLite  │
│ 分页组件  │                               │  + Redis │
└──────────┘                               └──────────┘
```

**后端核心代码（app.py:1015-1120）**：
```python
@app.route('/api/destinations', methods=['GET'])
@rate_limit('destinations', limit=100)  # 限流
@cache_response(timeout=300, key_prefix='destinations')  # 缓存5分钟
def get_destinations():
    # 获取分页参数
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 12, type=int), 100)
    
    # 构建查询
    query = Destination.query
    
    # 城市筛选
    if city := request.args.get('city'):
        query = query.filter(Destination.city == city)
    
    # 评分筛选
    if min_rating := request.args.get('min_rating', type=float):
        query = query.filter(Destination.rating >= min_rating)
    
    # 排序
    sort = request.args.get('sort', '-rating')
    if sort == 'rating':
        query = query.order_by(Destination.rating.desc())
    elif sort == 'price':
        query = query.order_by(Destination.ticket_price.asc())
    
    # 分页查询
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'success': True,
        'destinations': [d.to_dict() for d in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })
```

**前端调用**：
```typescript
export const destinationApi = {
  list: (params?: Record<string, string | number>) => 
    api.get('/api/destinations', { params }),
}

// 组件中使用
const { data } = await destinationApi.list({
  page: 1,
  city: '北京',
  min_rating: 4.5
})
```

### 5.3 AI对话流程（流式响应）

```
┌──────────┐    POST /api/chat              ┌──────────┐
│  前端    │ ──────────────────────────────▶ │  后端    │
│ (Next.js)│                               │ (Flask)  │
└──────────┘                               └──────────┘
       │                                          │
       │◀────────── text/event-stream ────────────┤
       │    逐字返回AI响应                         │
       │                                          │
       │    1. 接收用户消息                         │
       │    2. 检查限流                            │
       │    3. 调用AI服务（Kimi → 智谱 → OpenAI） │
       │    4. 流式返回响应                        │
       │                                          │
       ▼                                          ▼
┌──────────┐                               ┌─────────────────┐
│ 逐字显示 │                               │ AI服务集群      │
│ typing动画│                             │ Kimi/智谱/OAI   │
└──────────┘                               └─────────────────┘
```

**后端核心代码（app.py:3807-3900）**：
```python
@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    data = request.get_json()
    messages = data.get('messages', [])
    
    # 创建流式响应
    response = make_response()
    response.headers['Content-Type'] = 'text/event-stream; charset=utf-8'
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['X-Accel-Buffering'] = 'no'
    
    def generate():
        try:
            # 依次尝试各AI服务
            for config in AI_CONFIGS:
                try:
                    # 调用AI服务获取响应
                    response_text = call_ai_service(config, messages)
                    
                    # 流式返回
                    for chunk in chunk_text(response_text):
                        yield f"data: {json.dumps({'type': 'content', 'data': chunk})}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    return
                    
                except Exception as e:
                    continue  # 尝试下一个服务
            
        except GeneratorExit:
            pass
    
    return response(generate())
```

**前端调用（流式接收）**：
```typescript
const chat = async (messages: Message[]) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messages })
  })
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const text = decoder.decode(value)
    // 解析 SSE 格式: data: {"type": "content", "data": "xxx"}\n\n
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'content') {
          // 逐字追加显示
          appendText(data.data)
        } else if (data.type === 'done') {
          // 完成
        }
      }
    }
  }
}
```

### 5.4 行程规划流程

```
┌──────────┐   POST /api/itinerary/generate   ┌──────────┐
│  前端    │ ──────────────────────────────▶  │  后端    │
│ (Next.js)│  {destination: "北京", days: 3}   │ (Flask)  │
└──────────┘                                   └──────────┘
       │                                             │
       │◀────────────────────────────────────────────┤
       │     AI生成的行程规划（Markdown格式）          │
       │                                             │
       │  1. 调用AI服务生成行程                       │
       │  2. 解析景点信息                             │
       │  3. 保存到数据库                             │
       │  4. 返回行程详情                             │
       │                                             │
       ▼                                             ▼
┌──────────┐                                  ┌──────────┐
│ 渲染行程 │                                  │ 行程表   │
│ 展示地图 │                                  │ 景点表   │
└──────────┘                                  └──────────┘
```

**后端核心代码（app.py:4091-4200）**：
```python
@app.route('/api/itinerary/generate', methods=['POST'])
def generate_itinerary():
    data = request.get_json()
    destination = data.get('destination')
    days = data.get('days', 3)
    
    # 1. 搜索目的地景点
    dests = Destination.query.filter(
        Destination.city.like(f'%{destination}%') |
        Destination.name.like(f'%{destination}%')
    ).limit(10).all()
    
    # 2. 调用AI生成行程
    prompt = f"""请为{destination}生成{days}日游行程规划。
景点列表：{[d.name for d in dests]}
"""
    ai_response = call_ai_service(prompt)
    
    # 3. 创建行程记录
    trip = Trip(
        user_id=get_current_user_id(),
        title=f"{destination}{days}日游",
        start_date=datetime.now().date(),
        status='planning'
    )
    db.session.add(trip)
    db.session.flush()  # 获取trip.id
    
    # 4. 创建行程项目
    for day in range(1, days + 1):
        for i, dest in enumerate(dests[:3]):
            item = TripItem(
                trip_id=trip.id,
                destination_id=dest.id,
                day_number=day,
                title=dest.name,
                location=dest.city,
                sort_order=i
            )
            db.session.add(item)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'trip': trip.to_dict(),
        'ai_plan': ai_response
    })
```

### 5.5 收藏景点流程

```
┌──────────┐   POST /api/favorites           ┌──────────┐
│  前端    │ ──────────────────────────────▶  │  后端    │
│          │  {destination_id: 123}           │ (Flask)  │
└──────────┘                                   └──────────┘
       │                                             │
       │◀────────────────────────────────────────────┤
       │     {"success": true, "favorite_id": 456}    │
       │                                             │
       │  1. 获取当前用户ID                           │
       │  2. 检查是否已收藏                           │
       │  3. 创建收藏记录                             │
       │  4. 返回结果                                 │
       │                                             │
       ▼                                             ▼
┌──────────┐                                    ┌──────────┐
│ 更新收藏列表│                                │ favorites表│
│ 显示已收藏  │                                │ user_id   │
└──────────┘                                    │ destination_id│
                                               └──────────┘
```

**后端核心代码（app.py:1680-1705）**：
```python
@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    user_id = get_current_user_id()
    data = request.get_json()
    destination_id = data.get('destination_id')
    
    # 检查是否已收藏
    existing = Favorite.query.filter_by(
        user_id=user_id,
        destination_id=destination_id
    ).first()
    
    if existing:
        return jsonify({'success': False, 'error': '已经收藏过了'}), 400
    
    # 创建收藏
    favorite = Favorite(
        user_id=user_id,
        destination_id=destination_id
    )
    db.session.add(favorite)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'favorite_id': favorite.id
    })
```

---

## 六、HTTP协议核心知识点

### 6.1 项目中的HTTP方法

| 方法 | 数量 | 作用 | 项目示例 |
|------|------|------|---------|
| **GET** | 35+ | 查询数据，参数在URL中 | `GET /api/destinations?page=1` |
| **POST** | 20+ | 创建资源，参数在请求体 | `POST /api/users/login` |
| **PUT** | 3 | 更新资源（完整替换） | `PUT /api/users/me` |
| **DELETE** | 4 | 删除资源 | `DELETE /api/favorites/<id>` |
| **OPTIONS** | 2 | CORS预检请求 | `OPTIONS /api/chat` |

### 6.2 项目中的状态码

| 状态码 | 含义 | 项目示例 |
|--------|------|---------|
| 200 | 成功 | `return jsonify({...}), 200` |
| 201 | 创建成功 | 新建景点、游记后返回 |
| 400 | 请求错误 | `return jsonify({...}), 400` |
| 401 | 未认证 | Token无效或过期 |
| 403 | 无权限 | 无权访问其他用户数据 |
| 404 | 未找到 | 景点/用户不存在 |
| 429 | 请求过多 | 限流触发 |
| 500 | 服务器错误 | 数据库异常 |

### 6.3 项目中的请求头

| 请求头 | 用途 | 代码位置 |
|--------|------|---------|
| `Authorization: Bearer <token>` | JWT认证 | `api.ts:23` |
| `Content-Type: application/json` | JSON数据格式 | `api.ts:16` |
| `Content-Type: text/event-stream` | SSE流式响应 | `app.py:3807` |

### 6.4 项目中的响应头

| 响应头 | 用途 | 代码位置 |
|--------|------|---------|
| `Cache-Control` | 缓存控制 | `app.py:279` |
| `X-Cache` | 自定义缓存标记 | `app.py:265` |
| `ETag` | 资源版本标识 | `app.py:269` |
| `Access-Control-Allow-Origin` | CORS跨域 | `flask_cors` |

---

## 七、性能优化机制

### 7.1 Redis缓存

**缓存装饰器（app.py:221-260）**：
```python
def cache_response(timeout=300, key_prefix='default'):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 1. 生成缓存键
            cache_key = f"{key_prefix}:{hash(request.url)}"
            
            # 2. 尝试从Redis获取
            cached = redis_cache_get(cache_key)
            if cached:
                response = make_response(cached)
                response.headers['X-Cache'] = 'HIT'
                return response
            
            # 3. 执行原函数
            result = f(*args, **kwargs)
            
            # 4. 写入缓存
            if isinstance(result, tuple):
                data, status = result
                redis_cache_set(cache_key, data.get_data(), timeout)
            
            return result
        return decorated_function
    return decorator
```

**项目中缓存使用**：
| 接口 | 缓存时间 | 代码位置 |
|------|---------|---------|
| `/api/destinations` | 5分钟 | `app.py:1017` |
| `/api/destinations/metadata` | 1小时 | `app.py:1130` |
| `/api/destinations/<id>` | 10分钟 | `app.py:1364` |
| `/api/trips` | 3分钟 | `app.py:2152` |

### 7.2 API限流

**限流装饰器（app.py:176-220）**：
```python
def rate_limit(limit_key='default', limit=100):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            redis_client = get_redis()
            if redis_client is None:
                return f(*args, **kwargs)  # Redis不可用则跳过限流
            
            # 滑动窗口限流
            key = f"rate:{limit_key}:{request.remote_addr}"
            now = time.time()
            
            # 删除过期记录
            redis_client.zremrangebyscore(key, 0, now - 60)
            
            # 检查是否超限
            count = redis_client.zcard(key)
            if count >= limit:
                return jsonify({'error': '请求过于频繁'}), 429
            
            # 添加新记录
            redis_client.zadd(key, {str(now): now})
            redis_client.expire(key, 60)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

**项目中限流配置**：
| 接口 | 限制 | 代码位置 |
|------|------|---------|
| `/api/destinations` | 100次/分钟 | `app.py:1016` |
| `/api/flights/search` | 30次/分钟 | `app.py:2659` |
| `/api/hotels/search` | 30次/分钟 | `app.py:2695` |
| `/api/chat` | 20次/分钟 | `app.py:3808` |

### 7.3 数据库优化

**索引设计（models.py）**：
```python
# 复合索引示例
__table_args__ = (
    db.Index('idx_destination_name_city', 'name', 'city'),
    db.Index('idx_destination_rating_price', 'rating', 'ticket_price'),
)

# 单字段索引
name = db.Column(db.String(200), nullable=False, index=True)
city = db.Column(db.String(100), nullable=False, index=True)
rating = db.Column(db.Float, default=5.0, index=True)
```

**连接池配置**：
```python
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_recycle': 3600,      # 连接回收时间：1小时
    'pool_pre_ping': True,     # 连接前健康检查
    'pool_size': 20,           # 连接池大小：20
    'max_overflow': 30,        # 最大溢出：30
}
```

---

## 八、前端架构

### 8.1 页面结构（36个页面）

```
frontend/user-web/src/app/
├── page.tsx                    # 首页
├── login/                     # 登录页
├── register/                  # 注册页
├── reset-password/            # 忘记密码
├── destinations/               # 景点列表页
│   └── [id]/                  # 景点详情页
├── itineraries/               # 行程列表
│   └── [id]/                  # 行程详情
├── travel-notes/              # 游记列表
│   └── [id]/                  # 游记详情
├── favorites/                  # 我的收藏
├── footprints/                # 我的足迹
├── profile/                   # 个人资料
├── coupons/                  # 优惠券
├── orders/                    # 我的订单
├── cart/                     # 购物车
├── products/                  # 商品列表
├── search/                    # 搜索结果
├── assistant/                # AI助手
├── planner/                   # 行程规划
├── notifications/            # 消息通知
├── support/                   # 客服中心
├── admin/                     # 管理后台
├── about/                     # 关于我们
├── contact/                   # 联系我们
├── help/                      # 帮助中心
├── privacy/                   # 隐私政策
├── terms/                    # 服务条款
├── careers/                  # 招聘职位
├── news/                     # 新闻资讯
├── deals/                    # 优惠活动
├── partners/                 # 合作伙伴
├── feedback/                 # 意见反馈
├── services/                 # 服务说明
└── test-markdown/            # Markdown测试
```

### 8.2 状态管理

**Zustand状态管理**：
```typescript
// store/useAuthStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
)
```

### 8.3 API客户端（axios）

**统一配置（frontend/user-web/src/lib/api.ts）**：
```typescript
export const api = axios.create({
  baseURL: '',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：自动添加Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## 九、安全机制

### 9.1 JWT认证

**Token生成（app.py:389-400）**：
```python
def _issue_jwt(user_id: int) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, get_secret_key(), algorithm='HS256')
```

**Token验证（app.py:401-415）**：
```python
def _current_user_or_401():
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        abort(401, description='缺少认证令牌')
    
    token = auth[7:]
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
        user = User.query.get(payload['user_id'])
        if not user:
            abort(401, description='用户不存在')
        return user
    except jwt.ExpiredSignatureError:
        abort(401, description='令牌已过期')
    except jwt.InvalidTokenError:
        abort(401, description='无效的令牌')
```

### 9.2 密码加密

```python
from werkzeug.security import generate_password_hash, check_password_hash

# 注册时加密密码
password_hash = generate_password_hash(password, method='pbkdf2:sha256')

# 登录时验证密码
if check_password_hash(user.password_hash, password):
    # 验证通过
    pass
```

### 9.3 全局安全头

```python
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response
```

---

## 十、日志系统

### 10.1 日志配置

```python
# 轮转日志：单个文件最大10MB，保留5个备份
handler = RotatingFileHandler(
    'logs/travel_assistant.log',
    maxBytes=10000000,
    backupCount=5
)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s %(message)s'
))
logger.addHandler(handler)
```

### 10.2 日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| INFO | 正常运行信息 | `logger.info("用户登录成功")` |
| WARNING | 警告信息 | `logger.warning("Redis不可用")` |
| ERROR | 错误信息 | `logger.error("数据库连接失败")` |

---

## 十一、部署架构

### 11.1 Docker Compose配置

```yaml
services:
  app:
    build: .
    ports:
      - "5001:5001"
    environment:
      - FLASK_ENV=production
      - REDIS_HOST=redis
      - SQLALCHEMY_DATABASE_URI=mysql://db:3306/travel
    depends_on:
      - redis
      - db
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=travel
```

### 11.2 环境变量

```bash
# .env 文件
PORT=5001
SECRET_KEY=your-secret-key
SQLALCHEMY_DATABASE_URI=sqlite:///instance/travel.db
REDIS_HOST=localhost
REDIS_PORT=6379
KIMI_API_KEY=your-kimi-key
ZHIPU_API_KEY=your-zhipu-key
OPENAI_API_KEY=your-openai-key
SENIVERSE_API_KEY=your-weather-key
```

---

## 十二、总结

### 12.1 项目亮点

1. **AI深度集成**：支持Kimi、智谱、OpenAI三个AI服务商，自动降级
2. **流式响应**：AI对话采用SSE实现逐字显示
3. **性能优化**：Redis缓存 + API限流 + 数据库索引
4. **完整功能**：20个功能模块，覆盖旅游全场景
5. **安全机制**：JWT认证 + 密码加密 + 全局安全头

### 12.2 技术栈总结

| 层级 | 技术 | 数量/版本 |
|------|------|----------|
| 后端框架 | Flask | 2.3.3 |
| ORM | SQLAlchemy | 2.0.23 |
| 数据库 | SQLite/MySQL | - |
| 缓存 | Redis | 7 |
| 前端框架 | Next.js | 14.0.4 |
| UI框架 | React | 18.2.0 |
| 状态管理 | Zustand | 4.4.1 |
| HTTP客户端 | Axios | 1.5.0 |
| AI服务 | Kimi/智谱/OpenAI | - |

---

**文档维护**: 本架构文档应随项目发展持续更新，重大架构变更需及时同步文档。

**最后更新**: 2026年4月23日
