# 智能旅游助手 - 项目架构说明

**文档版本**: v1.0  
**最后更新**: 2026年4月10日  
**项目状态**: 开发阶段

---

## 一、项目概述

### 1.1 项目定位
智能旅游助手（Travel Assistant）是一个**AI驱动的个性化旅行规划平台**，通过人工智能技术为用户提供智能化的旅行咨询、行程规划和景点推荐服务。

### 1.2 核心功能
- **智能问答对话系统** - 支持多AI服务商的旅行咨询对话
- **行程自动规划** - 基于用户偏好自动生成个性化行程
- **实时天气查询** - 集成天气API提供出行建议
- **景点信息检索** - 支持联网搜索和智能推荐
- **用户收藏与足迹** - 记录用户偏好和访问历史
- **管理员后台系统** - 内容管理和数据分析

### 1.3 技术特色
- **AI优先架构** - 深度集成大语言模型能力
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
│  │  (ai-core/)     │  │ (data_services) │  │ (notification)  │ │
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
│  │ (OpenAI/DeepSeek)│  │  (和风天气等)   │  │ (高德/Google)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 架构模式
- **分层架构** - 清晰的分层设计，便于维护和扩展
- **微服务思想** - 模块化设计，各服务相对独立
- **RESTful API** - 标准化的接口设计
- **事件驱动** - 支持异步处理和消息队列

---

## 三、技术栈详细说明

### 3.1 后端技术栈

#### 核心框架
- **Flask 2.3.3** - 轻量级Python Web框架
- **SQLAlchemy 2.0.23** - ORM数据库操作框架
- **Flask-SQLAlchemy 3.0.5** - Flask数据库集成扩展
- **Flask-CORS 4.0.0** - 跨域资源共享支持

#### 数据存储
- **SQLite** - 开发环境默认数据库
- **MySQL 8.0** - 生产环境推荐数据库（通过Docker部署）
- **Redis 7** - 缓存和会话存储

#### 安全与认证
- **PyJWT 2.8.0** - JWT令牌生成与验证
- **Werkzeug 2.3.7** - 密码哈希和安全工具
- **python-dotenv 1.0.0** - 环境变量管理

#### 性能优化
- **Redis客户端** - 缓存机制实现
- **连接池配置** - 数据库连接优化
- **API限流装饰器** - 请求频率控制

#### 监控与日志
- **prometheus-client 0.21.1** - Prometheus指标暴露
- **RotatingFileHandler** - 轮转文件日志
- **结构化日志** - 性能监控和错误追踪

#### 部署与容器化
- **Waitress 3.0.2** - WSGI生产服务器
- **Docker & Docker Compose** - 容器化部署
- **Nginx** - 反向代理和负载均衡

### 3.2 前端技术栈

#### 核心框架
- **Next.js 14.0.4** - React服务端渲染框架
- **React 18.2.0** - UI组件库
- **TypeScript 5.2.2** - 类型安全的JavaScript

#### 状态管理
- **Zustand 4.4.1** - 轻量级状态管理
- **React Query 3.39.3** - 服务端数据获取和缓存
- **SWR 2.2.0** - 轻量级数据获取库

#### UI与样式
- **Tailwind CSS 3.3.0** - 实用优先的CSS框架
- **Framer Motion 10.16.4** - 动画库
- **Lucide React 0.288.0** - 图标库
- **PostCSS & Autoprefixer** - CSS后处理

#### 表单与验证
- **React Hook Form 7.47.0** - 高性能表单库
- **Zod 3.22.2** - TypeScript优先的数据验证
- **@hookform/resolvers 3.3.2** - 表单验证解析器

#### 工具与开发
- **Axios 1.5.0** - HTTP客户端
- **date-fns 2.30.0** - 日期处理库
- **ESLint & Prettier** - 代码质量和格式化
- **TypeScript** - 类型检查和开发体验

### 3.3 AI核心模块

#### 目录结构
```
ai-core/
├── agents/           # AI智能体模块
│   ├── travel_agent.py    # 旅行规划智能体
│   ├── chat_agent.py      # 对话智能体
│   └── recommendation_agent.py  # 推荐智能体
├── knowledge-base/   # 知识库模块
│   ├── destinations_kb.py # 目的地知识库
│   └── travel_tips_kb.py  # 旅行贴士知识库
└── models/           # 模型配置模块
    ├── llm_config.py      # 大语言模型配置
    └── embedding_config.py # 嵌入模型配置
```

#### 支持的AI服务商
- **OpenAI GPT系列** - 主要通过兼容API
- **DeepSeek** - 国产大模型支持
- **本地部署模型** - 支持Ollama等本地模型

---

## 四、核心模块设计

### 4.1 数据库模型设计

#### 核心实体关系图
```
┌─────────────────┐      ┌─────────────────┐
│      User       │      │   Destination   │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ username        │      │ name            │
│ email           │      │ city            │
│ phone           │      │ province        │
│ password_hash   │      │ description     │
│ avatar_url      │      │ rating          │
│ membership_level│      │ ticket_price    │
│ preferences     │      │ open_time       │
│ created_at      │      │ lng/lat         │
│ updated_at      │      │ created_at      │
└─────────────────┘      └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│      Trip       │      │   TripItem      │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ user_id (FK)    │      │ trip_id (FK)    │
│ title           │      │ destination_id  │
│ description     │      │ day_number      │
│ start_date      │      │ title           │
│ end_date        │      │ description     │
│ status          │      │ location        │
│ created_at      │      │ start_time      │
│ updated_at      │      │ end_time        │
└─────────────────┘      │ sort_order      │
                         │ created_at      │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│    UserLike     │      │ UserFootprint   │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ user_id (FK)    │      │ user_id (FK)    │
│ destination_id  │      │ destination_id  │
│ created_at      │      │ source          │
└─────────────────┘      │ visited_at      │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│DestinationComment│     │    Notification │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ destination_id  │      │ user_id (FK)    │
│ user_id (FK)    │      │ title           │
│ content         │      │ content         │
│ created_at      │      │ notification_type
│ updated_at      │      │ is_read         │
└─────────────────┘      │ created_at      │
                         │ read_at         │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│     Product     │      │      Order      │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ name            │      │ user_id (FK)    │
│ subtitle        │      │ order_no        │
│ description     │      │ total_amount    │
│ destination_id  │      │ status          │
│ base_price      │      │ payment_method  │
│ discount_price  │      │ payment_time    │
│ inventory_total │      │ created_at      │
│ inventory_sold  │      │ updated_at      │
│ rating          │      └─────────────────┘
│ sold_count      │               │
│ created_at      │               │
│ updated_at      │               ▼
└─────────────────┘      ┌─────────────────┐
                         │    OrderItem    │
                         ├─────────────────┤
                         │ id (PK)         │
                         │ order_id (FK)   │
                         │ product_id      │
                         │ product_name    │
                         │ quantity        │
                         │ unit_price      │
                         │ total_price     │
                         └─────────────────┘
```

#### 数据库优化策略
1. **索引设计**
   - 主键索引：所有表的主键
   - 外键索引：所有外键字段
   - 查询索引：常用查询字段（name, city, rating等）
   - 复合索引：多条件查询优化

2. **连接池配置**
   ```python
   'pool_recycle': 3600,      # 连接回收时间：1小时
   'pool_pre_ping': True,     # 连接前健康检查
   'pool_size': 20,           # 连接池大小：20
   'max_overflow': 30,        # 最大溢出：30
   ```

3. **缓存策略**
   - Redis缓存热点数据
   - 缓存过期时间：5-10分钟
   - 写操作后清除相关缓存

### 4.2 API设计规范

#### RESTful API 标准
- **资源命名**：使用复数名词，如 `/api/destinations`
- **HTTP方法**：GET(查询)、POST(创建)、PUT(更新)、DELETE(删除)
- **状态码**：200(成功)、201(创建)、400(请求错误)、401(未授权)、404(未找到)、500(服务器错误)
- **响应格式**：统一JSON格式，包含success、data、message字段

#### 核心API端点

**景点管理**
```
GET    /api/destinations          # 获取景点列表（支持分页、搜索、筛选）
GET    /api/destinations/:id      # 获取景点详情
POST   /api/destinations          # 创建新景点（管理员）
PUT    /api/destinations/:id      # 更新景点信息（管理员）
DELETE /api/destinations/:id      # 删除景点（管理员）
```

**行程管理**
```
GET    /api/trips                 # 获取行程列表
GET    /api/trips/:id             # 获取行程详情
POST   /api/trips                 # 创建新行程
PUT    /api/trips/:id             # 更新行程
DELETE /api/trips/:id             # 删除行程
```

**用户管理**
```
POST   /api/admin/login           # 管理员登录
GET    /api/users/:id             # 获取用户信息
PUT    /api/users/:id             # 更新用户信息
GET    /api/users/:id/likes       # 获取用户点赞列表
GET    /api/users/:id/footprints  # 获取用户足迹
```

**AI对话**
```
POST   /api/chat                  # AI对话接口
POST   /api/chat/trip-plan        # 智能行程规划
GET    /api/weather               # 天气查询
```

**其他功能**
```
GET    /api/stats                 # 平台统计信息
GET    /api/health                # 健康检查
GET    /api/media                 # 媒体文件服务
```

#### API性能优化
1. **缓存装饰器**
   ```python
   @cache_response(timeout=300, key_prefix='destinations')
   def get_destinations():
       # 自动缓存GET请求响应
   ```

2. **限流装饰器**
   ```python
   @rate_limit('destinations', limit=100)
   def get_destinations():
       # 每分钟最多100次请求
   ```

3. **查询优化**
   - 分页查询避免大数据集
   - 选择性字段查询
   - 数据库索引优化

### 4.3 前端架构设计

#### 目录结构
```
frontend/user-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页
│   │   ├── destinations/       # 景点页面
│   │   ├── trip/              # 行程页面
│   │   ├── assistant/         # AI助手页面
│   │   └── profile/           # 用户资料页面
│   ├── components/             # React组件
│   │   ├── ui/                # 基础UI组件
│   │   ├── layout/            # 布局组件
│   │   ├── destination/       # 景点相关组件
│   │   ├── trip/              # 行程相关组件
│   │   └── chat/              # 对话相关组件
│   ├── store/                  # Zustand状态管理
│   │   ├── useAuthStore.ts    # 认证状态
│   │   ├── useTripStore.ts    # 行程状态
│   │   └── useChatStore.ts    # 对话状态
│   ├── hooks/                  # 自定义Hooks
│   │   ├── useAuth.ts         # 认证Hook
│   │   ├── useDestinations.ts # 景点数据Hook
│   │   └── useWeather.ts      # 天气Hook
│   ├── lib/                    # 工具函数
│   │   ├── api.ts             # API客户端
│   │   ├── utils.ts           # 通用工具
│   │   └── constants.ts       # 常量定义
│   └── types/                  # TypeScript类型定义
│       ├── destination.ts     # 景点类型
│       ├── trip.ts            # 行程类型
│       └── user.ts            # 用户类型
├── public/                     # 静态资源
├── package.json
└── next.config.js
```

#### 状态管理策略
1. **服务端状态** - React Query/SWR处理
2. **客户端状态** - Zustand管理
3. **表单状态** - React Hook Form
4. **URL状态** - Next.js路由参数

#### 性能优化
1. **代码分割** - Next.js自动代码分割
2. **图片优化** - Next.js Image组件
3. **字体优化** - 自托管字体文件
4. **缓存策略** - SWR/React Query缓存
5. **懒加载** - 组件和路由懒加载

---

## 五、部署架构

### 5.1 开发环境部署

#### 本地开发
```bash
# 后端启动
pip install -r requirements.txt
python app.py

# 前端启动
cd frontend/user-web
npm install
npm run dev
```

#### 一键启动脚本
- **Windows**: `start-dev.bat` 或 `start-dev.ps1`
- **Linux/Mac**: `start.sh`

### 5.2 生产环境部署

#### Docker容器化部署
```yaml
# docker-compose.optimized.yml 包含以下服务：
services:
  - app: Flask应用容器
  - redis: Redis缓存服务
  - db: MySQL数据库
  - nginx: Nginx反向代理
  - prometheus: 监控服务
  - grafana: 监控面板
```

#### 部署架构
```
┌─────────────────┐
│   用户请求       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│   Nginx反向代理  │─────▶│   SSL/TLS终止   │
└────────┬────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│  Flask应用集群   │◀────▶│   Redis缓存     │
│  (Waitress)     │      │   (会话/缓存)   │
└────────┬────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│   MySQL数据库    │◀────▶│   数据备份       │
│   (主从复制)     │      │   (定期备份)    │
└────────┬────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│   监控系统       │
│ (Prometheus+    │
│  Grafana)       │
└─────────────────┘
```

### 5.3 环境变量配置

#### 后端环境变量 (.env)
```bash
# 服务器配置
PORT=5001
FLASK_ENV=production
SECRET_KEY=your-secret-key-here

# 数据库配置
SQLALCHEMY_DATABASE_URI=sqlite:///instance/travel.db
# 或 MySQL
# SQLALCHEMY_DATABASE_URI=mysql://user:password@localhost/travel_assistant

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# 缓存配置
CACHE_TTL=300

# AI服务配置
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
DEEPSEEK_API_KEY=your-deepseek-api-key

# 文件存储
SCENIC_IMAGES_ROOT=/path/to/scenic_images
DESTINATIONS_JSON_PATH=/path/to/destinations.json

# 外部API
WEATHER_API_KEY=your-weather-api-key
MAPS_API_KEY=your-maps-api-key
```

#### 前端环境变量 (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
NEXT_PUBLIC_MAPS_API_KEY=your-maps-api-key
```

---

## 六、安全设计

### 6.1 认证与授权
1. **JWT令牌认证** - 无状态认证机制
2. **密码加密** - Werkzeug密码哈希
3. **CORS策略** - 跨域请求控制
4. **权限分级** - 普通用户、高级用户、管理员

### 6.2 数据保护
1. **SQL注入防护** - SQLAlchemy ORM参数化查询
2. **XSS防护** - React自动转义
3. **CSRF防护** - Token验证
4. **输入验证** - Zod数据验证

### 6.3 API安全
1. **限流防护** - Redis限流装饰器
2. **请求验证** - 输入数据校验
3. **错误处理** - 统一错误响应格式
4. **日志记录** - 安全事件审计

---

## 七、性能优化

### 7.1 后端优化
1. **数据库优化**
   - 索引策略
   - 连接池配置
   - 查询优化

2. **缓存策略**
   - Redis缓存热点数据
   - 响应缓存装饰器
   - 缓存失效策略

3. **API优化**
   - 分页查询
   - 字段选择
   - 批量操作

### 7.2 前端优化
1. **代码优化**
   - 代码分割
   - 懒加载
   - Tree shaking

2. **资源优化**
   - 图片优化
   - 字体优化
   - CDN加速

3. **渲染优化**
   - 服务端渲染(SSR)
   - 静态生成(SSG)
   - 增量静态再生成(ISR)

### 7.3 监控与告警
1. **应用监控** - Prometheus指标收集
2. **日志监控** - 结构化日志分析
3. **性能监控** - 响应时间和吞吐量
4. **错误监控** - 异常追踪和告警

---

## 八、开发规范

### 8.1 代码规范
1. **Python代码** - PEP 8规范
2. **TypeScript代码** - TypeScript官方规范
3. **代码格式化** - Prettier统一格式
4. **代码检查** - ESLint静态分析

### 8.2 Git工作流
1. **分支策略** - Git Flow工作流
2. **提交规范** - Conventional Commits
3. **代码审查** - Pull Request流程
4. **版本管理** - Semantic Versioning

### 8.3 测试策略
1. **单元测试** - pytest(后端)、Jest(前端)
2. **集成测试** - API集成测试
3. **端到端测试** - Cypress测试
4. **性能测试** - 负载测试和压力测试

---

## 九、扩展性设计

### 9.1 微服务演进路径
当前架构已为微服务化预留接口：
1. **服务拆分** - 各模块可独立部署
2. **API网关** - 统一入口和路由
3. **消息队列** - 异步处理支持
4. **服务发现** - 动态服务注册

### 9.2 功能扩展点
1. **AI模型扩展** - 支持更多AI服务商
2. **支付集成** - 第三方支付平台
3. **社交功能** - 用户互动和分享
4. **国际化** - 多语言支持
5. **移动端** - React Native应用

### 9.3 数据扩展
1. **数据仓库** - 数据分析平台
2. **推荐系统** - 个性化推荐引擎
3. **用户画像** - 用户行为分析
4. **业务智能** - 数据可视化报表

---

## 十、维护与监控

### 10.1 日志管理
1. **应用日志** - 轮转文件日志
2. **访问日志** - Nginx访问日志
3. **错误日志** - 异常追踪日志
4. **安全日志** - 安全事件审计

### 10.2 监控指标
1. **系统指标** - CPU、内存、磁盘使用率
2. **应用指标** - 请求量、响应时间、错误率
3. **业务指标** - 用户活跃度、转化率
4. **AI指标** - 模型调用量、响应质量

### 10.3 备份策略
1. **数据库备份** - 每日自动备份
2. **文件备份** - 重要文件定期备份
3. **配置备份** - 配置文件版本控制
4. **灾难恢复** - 备份恢复演练

---

## 十一、总结与展望

### 11.1 架构优势
1. **清晰分层** - 职责明确，易于维护
2. **技术先进** - 采用现代化技术栈
3. **性能优化** - 多层缓存和查询优化
4. **安全可靠** - 完善的安全机制
5. **可扩展性** - 支持功能扩展和微服务演进

### 11.2 未来规划
1. **短期目标** (1-3个月)
   - 完善票务预订系统
   - 优化移动端体验
   - 增强AI对话能力

2. **中期目标** (3-6个月)
   - 实现国际化支持
   - 构建推荐系统
   - 完善监控体系

3. **长期目标** (6-12个月)
   - 微服务架构演进
   - 大数据平台建设
   - 生态体系构建

### 11.3 技术债务
1. **代码优化** - 减少重复代码
2. **测试覆盖** - 提高测试覆盖率
3. **文档完善** - API文档和用户文档
4. **性能调优** - 持续性能优化

---

**文档维护**: 本架构文档应随项目发展持续更新，重大架构变更需及时同步文档。

**联系方式**: 如有架构相关问题，请联系开发团队。