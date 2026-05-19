# 小游智能旅行助手 — 项目架构文档

> 最后更新: 2026-05-13
> 项目根目录: `d:\travel-assistant\`

---

## 一、项目简介

**小游智能旅行助手**是一个面向旅行者的智能服务平台，提供目的地推荐、AI 行程规划、天气查询、订单管理等功能。系统采用前后端分离的微服务架构，集成 Kimi-2.5 大模型实现智能对话与行程生成。

---

## 二、系统架构总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                        🧑 客户端层 (Client)                          │
│  ┌──────────────────────────┐    ┌──────────────────────────────┐   │
│  │  用户前端 (Next.js 14)   │    │  管理后台 (React + Vite)     │   │
│  │  localhost:3000          │    │  localhost:3001              │   │
│  │  Tailwind + Zustand      │    │  Ant Design + ECharts       │   │
│  └────────────┬─────────────┘    └────────────┬─────────────────┘   │
└───────────────┼────────────────────────────────┼────────────────────┘
                │                                │
                ▼                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    🌐 网关层 (Gateway)                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Go Gateway (:8080) / Apache APISIX (:9080)                 │   │
│  │  · 请求路由  · 限流熔断  · CORS 处理  · 负载均衡             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    📦 应用层 (Application Layer)                      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │         Flask 主应用 (app.py · 端口 5001)                    │   │
│  │  · JWT 认证  · 20 个功能模块  · SQLAlchemy ORM               │   │
│  │  · Redis 缓存/限流  · SSE 流式输出  · 日志轮转               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ user-service  │ │product-svc   │ │ order-svc    │ │notification│ │
│  │ (Go :8081)   │ │(Go :8082)    │ │ (Go :8083)   │ │-svc (:8086)│ │
│  │ 用户管理      │ │产品/景点     │ │ 订单管理      │ │ 通知服务    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│  ┌──────────────┐ ┌──────────────┐                                 │
│  │ ai-service   │ │ recommend-   │                                 │
│  │ (Go :8084)   │ │ service      │                                 │
│  │ 大模型调用    │ │ (Go :8085)   │                                 │
│  │ Moonshot API │ │ 推荐引擎      │                                 │
│  └──────────────┘ └──────────────┘                                 │
└──────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    🗃️ 数据层 (Data Layer)                             │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐         │
│  │ MySQL  │ │ Redis  │ │Elastic-  │ │  Milvus  │ │MinIO │         │
│  │ :3306  │ │ :6379  │ │search    │ │  :19530  │ │:9000 │         │
│  │主数据库 │ │缓存/限流│ │:9200     │ │向量数据库 │ │对象存储│         │
│  └────────┘ └────────┘ │搜索引擎  │ │(AI语义搜)│ └──────┘         │
│                         └──────────┘ └──────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    🌍 外部服务层 (External Services)                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ Kimi-2.5 API │ │ 心知天气 API │ │ 腾讯地图 API │               │
│  │ (Moonshot)   │ │ 天气查询     │ │ POI/地理编码 │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 三、技术栈详解

### 3.1 前端 — 用户端 (`frontend/user-web/`)

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 14.0.4 | React 框架，支持 SSR/SSG，文件路由 |
| **App Router** | — | 文件夹即路由，`/orders` → 订单页 |
| **TypeScript** | 5.2 | 类型安全，减少运行时错误 |
| **Tailwind CSS** | 3.3 | 原子化 CSS，直接在标签上写样式类 |
| **Framer Motion** | 10.16 | 动画库，页面过渡/元素动效 |
| **Lucide React** | 0.288 | SVG 图标库 |
| **Zustand** | 4.4 | 轻量状态管理，跨组件共享数据 |
| **SWR** | 2.2 | 数据请求 Hook，自动缓存/重试 |
| **Axios** | 1.5 | HTTP 客户端，请求后端 API |
| **React Hook Form** | 7.47 | 表单处理（登录/注册/搜索） |
| **Zod** | 3.22 | 数据验证（邮箱格式/密码强度） |
| **react-markdown** | 10.1 | 渲染 AI 回复的 Markdown 文本 |
| **高德地图 SDK** | 1.0.1 | 地图展示、POI 搜索、路线规划 |

**前端技术关系图：**
```
用户操作 → React Hook Form (表单) → Axios/SWR (发请求)
    → Next.js API Route / 直连后端 → 返回 JSON
    → Zustand (存状态) → Tailwind (画界面) → Framer Motion (加动画)
```

### 3.2 前端 — 管理后台 (`frontend/admin-web/`)

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 18.2 | UI 框架 |
| **Vite** | 4.4 | 构建工具（比 Webpack 快） |
| **TypeScript** | 5.2 | 类型安全 |
| **Ant Design** | 5.11 | 企业级 UI 组件库（表格/表单/弹窗） |
| **ECharts** | 5.4 | 数据可视化图表 |
| **React Router** | 6.15 | 路由管理 |
| **Zustand** | 4.4 | 状态管理 |
| **Axios** | 1.5 | HTTP 客户端 |
| **dayjs** | 1.11 | 日期处理 |

### 3.3 后端 (`backend/`)

| 服务 | 端口 | 职责 |
|------|------|------|
| **Flask 主应用** | 5001 | 核心 API，20 个功能模块，JWT 认证 |
| **Go Gateway** | 8080 | API 网关，路由转发，限流 |
| **user-service** | 8081 | 用户注册/登录/信息管理 |
| **product-service** | 8082 | 旅游产品/景点 CRUD |
| **order-service** | 8083 | 订单创建/支付/状态管理 |
| **ai-service** | 8084 | Moonshot API 接入，SSE 流式输出 |
| **recommend-service** | 8085 | 个性化推荐算法 |
| **notification-service** | 8086 | 消息推送/通知管理 |

### 3.4 数据层

| 组件 | 端口 | 用途 |
|------|------|------|
| **MySQL 8.0** | 3306 | 主数据库（生产环境） |
| **SQLite** | — | 本地开发数据库 (`instance/travel.db`) |
| **Redis 7** | 6379 | 缓存、限流、会话存储 |
| **Elasticsearch 8.8** | 9200 | 全文搜索引擎 |
| **Milvus 2.3** | 19530 | 向量数据库，AI 语义搜索 |
| **MinIO** | 9000 | 对象存储（图片/文件） |

### 3.5 外部服务

| 服务 | 用途 | 接入方式 |
|------|------|----------|
| **Moonshot (Kimi)** | AI 对话、行程生成 | REST API + SSE |
| **心知天气** | 天气查询/预报 | REST API |
| **腾讯地图** | POI 搜索、地理编码、路线 | JS SDK + REST API |

---

## 四、项目目录结构

```
d:\travel-assistant\
│
├── 📁 ai-core/                        # AI 核心模块
│   ├── agents/                         #   Agent 定义（可扩展）
│   ├── knowledge-base/                 #   知识库数据
│   └── models/                         #   模型配置与封装
│
├── 📁 backend/                         # 🚀 后端服务
│   ├── requirements.txt                #   Python 依赖
│   ├── travel_assistant.db             #   SQLite 数据库
│   │
│   ├── 📁 gateway/                     #   🌐 API 网关 (Go)
│   │   ├── main.go                     #     路由转发
│   │   ├── go.mod / go.sum
│   │   └── Dockerfile
│   │
│   ├── 📁 ai-service/                  #   🤖 AI 服务 (Go)
│   │   ├── main.go                     #     入口
│   │   ├── moonshot_service.go         #     Moonshot API 封装
│   │   ├── go.mod / go.sum
│   │   └── Dockerfile
│   │
│   ├── 📁 user-service/                #   👤 用户服务 (Go)
│   │   ├── main.go
│   │   ├── go.mod / go.sum
│   │   └── Dockerfile
│   │
│   ├── 📁 product-service/             #   🏷️ 产品服务 (Go)
│   │   ├── main.go
│   │   ├── go.mod / go.sum
│   │   └── Dockerfile
│   │
│   ├── 📁 order-service/               #   📋 订单服务 (Go)
│   │   └── main.go
│   │
│   ├── 📁 recommend-service/           #   ⭐ 推荐服务 (Go)
│   ├── 📁 notification-service/        #   🔔 通知服务 (Go)
│   └── 📁 payment-service/             #   💰 支付服务 (Go, 预留)
│
├── 📁 frontend/                        # 🎨 前端项目
│   ├── 📁 user-web/                    #   用户端 (Next.js 14)
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app/                    #     App Router 页面
│   │       │   ├── layout.tsx          #       全局布局
│   │       │   ├── page.tsx            #       首页
│   │       │   ├── globals.css         #       全局样式
│   │       │   ├── admin/              #       管理面板
│   │       │   ├── assistant/          #       AI 助手对话
│   │       │   ├── destinations/       #       景点列表/详情
│   │       │   ├── notifications/      #       通知
│   │       │   ├── orders/             #       订单
│   │       │   ├── products/           #       旅游产品
│   │       │   ├── profile/            #       个人中心
│   │       │   └── itineraries/        #       行程规划
│   │       ├── components/             #     可复用组件
│   │       │   ├── AdminGuard.tsx      #       管理员权限守卫
│   │       │   ├── CommentSection.tsx  #       评论区块
│   │       │   ├── ProductCard.tsx     #       产品卡片
│   │       │   └── ui/                 #       通用 UI 组件
│   │       ├── lib/                    #     工具函数
│   │       │   ├── api.ts              #       API 调用封装
│   │       │   ├── apiClient.ts        #       HTTP 客户端
│   │       │   └── media.ts            #       媒体资源处理
│   │       ├── hooks/                  #     自定义 Hooks
│   │       ├── store/                  #     Zustand 状态
│   │       ├── types/                  #     TypeScript 类型
│   │       └── i18n/                   #     国际化
│   │
│   └── 📁 admin-web/                   #   管理后台 (React + Vite)
│       ├── package.json
│       ├── vite.config.ts
│       └── src/                        #     Ant Design 组件
│
├── 📁 database/                        # 🗃️ 数据库
│   ├── schema/                         #   表结构 SQL
│   ├── seeds/                          #   种子数据
│   └── migrations/                     #   迁移脚本
│
├── 📁 deployment/                      # 🐳 部署配置
│   ├── 📁 docker/
│   │   ├── docker-compose.yml          #   14+ 容器编排
│   │   └── apisix/                     #   APISIX 网关配置
│   ├── 📁 kubernetes/                  #   K8s 配置 (预留)
│   └── 📁 monitoring/                  #   Prometheus/Grafana
│
├── 📁 docs/                            # 📄 项目文档
│   ├── travel_assistant_rules.md       #   AI 助手行为规则
│   ├── ai_travel_assistant_prompt.txt  #   系统提示词模板
│   ├── DESIGN_SYSTEM.md                #   设计系统
│   ├── GIT_WORKFLOW_GUIDE.md           #   Git 工作流
│   └── diagrams/                       #   架构图 (SVG)
│
├── 📁 er-diagrams/                     # E-R 关系图 (Excalidraw)
│   ├── 01-总体E-R图.excalidraw
│   ├── 02-用户域E-R图.excalidraw
│   ├── 03-产品与订单域E-R图.excalidraw
│   └── 04-内容与行程域E-R图.excalidraw
│
├── 📁 services/                        # 外部服务集成 (Python)
│   ├── flight_service.py               #   航班查询
│   ├── hotel_service.py                #   酒店查询
│   └── weather_service.py              #   天气查询
│
├── 📁 scripts/                         # 工具脚本
├── 📁 tests/                           # 测试
├── 📁 instance/                        # SQLite 数据库文件
├── 📁 logs/                            # 运行日志
├── 📁 monitoring/                      # 监控配置
├── 📁 scenic_images/                   # 景区图片资源
│
├── 📄 app.py                 (234KB)   # 🔥 Flask 主应用（核心）
├── 📄 models.py                        # SQLAlchemy 数据模型
├── 📄 extensions.py                    # Flask 扩展初始化
├── 📄 amap_service.py                  # 腾讯地图数据采集
├── 📄 start.py                         # 一键启动脚本
├── 📄 init_db.py                       # 数据库初始化
├── 📄 manage.py                        # 管理工具
├── 📄 view_db.py                       # 数据库查看工具
│
├── 📄 requirements.txt                 # Python 依赖
├── 📄 destinations.json      (1.1MB)   # 目的地种子数据
├── 📄 nginx.conf                       # Nginx 配置
├── 📄 redis.conf                       # Redis 配置
│
├── 📄 PROJECT_STRUCTURE.md             # 📌 本文档
├── 📄 README.md                        # 项目说明
├── 📄 AGENTS.md                        # AI 代理指南
├── 📄 CLAUDE_PROJECT_GUIDE.md          # Claude 集成指南
└── 📄 .env                             # 环境变量配置
```

---

## 五、核心功能模块 (Flask app.py)

| # | 模块 | 路由前缀 | 说明 |
|---|------|----------|------|
| 1 | 用户系统 | `/api/users/*` | 注册/登录/个人信息/会员/积分 |
| 2 | 景点管理 | `/api/destinations/*` | 列表/详情/搜索/筛选/评论 |
| 3 | 行程规划 | `/api/trips/*` | 创建/编辑/删除行程 |
| 4 | AI 对话 | `/api/chat` | 普通 AI 问答 |
| 5 | AI Agent | `/api/agent/chat` | SSE 流式 + 工具调用 |
| 6 | AI 行程生成 | `/api/itinerary/generate` | 自动生成行程方案 |
| 7 | 用户收藏 | `/api/favorites/*` | 收藏/取消收藏景点 |
| 8 | 用户足迹 | `/api/footprints/*` | 浏览历史记录 |
| 9 | 旅行游记 | `/api/travel-notes/*` | 发布/查看/点赞/评论 |
| 10 | 优惠券 | `/api/coupons/*` | 领取/使用/验证 |
| 11 | 天气查询 | `/api/weather/*` | 实时天气/预报 |
| 12 | 机票预订 | `/api/flights/*` | 航班搜索/详情 |
| 13 | 酒店预订 | `/api/hotels/*` | 酒店搜索/房型 |
| 14 | 用户通知 | `/api/notifications/*` | 消息推送/已读未读 |
| 15 | 推荐系统 | `/api/recommendations` | 个性化推荐 |
| 16 | 客服工单 | `/api/support/*` | 提交/回复工单 |
| 17 | 管理后台 | `/api/admin/*` | 用户/景点/地区管理 |
| 18 | 统计面板 | `/api/stats/*` | 平台数据统计 |
| 19 | 媒体服务 | `/api/media/*` | 图片/文件服务 |
| 20 | 全局搜索 | `/api/search` | 景点/商品全文搜索 |

---

## 六、数据库模型 (20+ 核心表)

```
┌──────────────┐       ┌───────────────┐       ┌──────────────┐
│    User      │       │  Destination  │       │   Product    │
├──────────────┤       ├───────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)       │       │ id (PK)      │
│ username     │       │ name          │       │ name         │
│ email        │       │ city          │       │ price        │
│ phone        │       │ province      │       │ stock        │
│ password_hash│       │ description   │       │ type         │
│ avatar       │       │ ticket_price  │       │ image_url    │
│ membership   │       │ open_time     │       │ rating       │
│ points       │       │ rating        │       └──────────────┘
│ invite_code  │       │ lng / lat     │              │
│ preferences  │       │ cover_image   │              │
│ created_at   │       │ category      │              │
│ last_login   │       └───────────────┘              │
└──────┬───────┘              │                       │
       │                      │                       │
       ▼                      ▼                       ▼
┌──────────────┐       ┌───────────────┐       ┌──────────────┐
│    Trip      │       │   TripItem    │       │    Order     │
├──────────────┤       ├───────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)       │       │ id (PK)      │
│ user_id (FK) │◄──────│ trip_id (FK)  │       │ user_id (FK) │
│ title        │       │ dest_id (FK)  │       │ total_amount │
│ start_date   │       │ day_number    │       │ status       │
│ end_date     │       │ time_slot     │       │ created_at   │
│ budget       │       │ activity      │       └──────────────┘
└──────────────┘       └───────────────┘

┌──────────────┐  ┌──────────────┐  ┌────────────────┐
│   Favorite   │  │UserFootprint│  │  TravelNote    │
├──────────────┤  ├──────────────┤  ├────────────────┤
│ user_id (FK) │  │ user_id (FK) │  │ user_id (FK)   │
│ dest_id (FK) │  │ dest_id (FK) │  │ title          │
│ created_at   │  │ visited_at   │  │ content        │
└──────────────┘  └──────────────┘  │ likes_count    │
                                    │ views_count    │
┌──────────────┐  ┌──────────────┐  └────────────────┘
│SupportTicket │  │  Notification│
├──────────────┤  ├──────────────┤  ┌────────────────┐
│ user_id (FK) │  │ user_id (FK) │  │ AIConversation │
│ subject      │  │ type         │  ├────────────────┤
│ status       │  │ title        │  │ session_id     │
│ priority     │  │ is_read      │  │ role           │
└──────────────┘  └──────────────┘  │ content        │
                                    │ intent         │
┌──────────────┐  ┌──────────────┐  └────────────────┘
│  Coupon      │  │  UserCoupon  │
├──────────────┤  ├──────────────┤
│ name         │  │ user_id (FK) │
│ discount     │  │ coupon_id(FK)│
│ valid_from   │  │ status       │
│ valid_to     │  └──────────────┘
└──────────────┘
```

---

## 七、核心数据流

### 7.1 AI 对话流程 (SSE 流式)

```
用户发送消息
    │
    ▼
Next.js 前端 (assistant/page.tsx)
    │  POST /api/agent/chat  (fetch + ReadableStream)
    ▼
Go Gateway (:8080) → 路由转发
    │
    ▼
Flask 后端 (app.py · agent_chat 路由)
    │
    ├── @rate_limit('agent_chat', 20)  ◄── Redis 限流
    ├── 注入 system prompt
    ├── 调用 ai-service (Moonshot API)
    │   ├── get_weather()              ── 心知天气
    │   ├── search_destinations()      ── 本地数据库
    │   └── get_itinerary()            ── AI 生成
    │
    └── Response (Content-Type: text/event-stream)
        │  yield SSE: thinking → tool_result → content → done
        ▼
    前端流式接收 (reader = res.body.getReader())
        │  解析 data: {...} → 更新 UI
        ▼
    用户看到实时生成内容（打字机效果）
```

### 7.2 用户认证流程

```
用户登录 → POST /api/users/login
    │
    ├── 验证密码 (bcrypt)
    ├── 生成 JWT Token
    └── 返回 token + 用户信息
         │
         ▼
    前端存 token → Zustand store + localStorage
         │
         ▼
    后续请求 → Authorization: Bearer <token>
         │
         ▼
    Gateway/Flask 验证 token → 放行或 401
```

---

## 八、API 路由总览

### 8.1 认证接口

| 方法 | 端点 | 限流 | 说明 |
|:----:|------|:----:|------|
| POST | `/api/admin/login` | — | 管理员登录 |
| POST | `/api/users/login` | 20/分 | 用户登录 |
| POST | `/api/users/register` | 10/分 | 用户注册 |
| GET | `/api/users/me` | 60/分 | 当前用户信息 |

### 8.2 景点/产品

| 方法 | 端点 | 说明 |
|:----:|------|------|
| GET | `/api/destinations` | 景点列表（分页/筛选/搜索） |
| GET | `/api/destinations/<id>` | 景点详情 |
| POST | `/api/destinations/<id>/comment` | 景点评论 |
| GET | `/api/recommendations` | 个性化推荐 |

### 8.3 AI 服务

| 方法 | 端点 | 限流 | 说明 |
|:----:|------|:----:|------|
| POST | `/api/chat` | 20/分 | 普通 AI 对话 |
| POST | `/api/agent/chat` | 20/分 | Agent SSE 流式对话 |
| POST | `/api/itinerary/generate` | 10/分 | 自动生成行程 |

### 8.4 用户业务

| 方法 | 端点 | 说明 |
|:----:|------|------|
| GET/POST/DEL | `/api/favorites/*` | 收藏管理 |
| GET | `/api/footprints*` | 浏览足迹 |
| GET/POST | `/api/travel-notes/*` | 游记管理 |
| GET/POST | `/api/coupons/*` | 优惠券 |
| GET/POST | `/api/orders/*` | 订单管理 |
| GET/POST | `/api/notifications*` | 通知管理 |
| GET/POST | `/api/support/*` | 客服工单 |

### 8.5 外部服务

| 方法 | 端点 | 说明 |
|:----:|------|------|
| GET | `/api/weather/*` | 天气查询 |
| GET | `/api/flights/*` | 航班搜索 |
| GET | `/api/hotels/*` | 酒店搜索 |

### 8.6 管理与统计

| 方法 | 端点 | 说明 |
|:----:|------|------|
| GET | `/api/stats/*` | 数据统计 |
| GET/POST | `/api/admin/*` | 管理后台 |
| GET | `/api/search` | 全局搜索 |

---

## 九、快速开始

### 一键启动（推荐）

```bash
cd d:/travel-assistant
python start.py
```

启动内容：Redis (:6379) → AI 服务 (:8084) → 后端 (:5001) → 前端 (:3000)

### 单独启动

```bash
# 后端
python app.py

# AI 服务
cd backend/ai-service
set MOONSHOT_API_KEY=sk-xxx
go run main.go moonshot_service.go

# 用户端前端
cd frontend/user-web
npm run dev

# 管理后台前端
cd frontend/admin-web
npm run dev
```

### Docker Compose 启动

```bash
cd deployment/docker
docker-compose up -d
```

### 服务地址

| 服务 | 地址 |
|------|------|
| 用户前端 | http://localhost:3000 |
| 管理后台 | http://localhost:3001 |
| Flask 后端 | http://localhost:5001 |
| Go Gateway | http://localhost:8080 |
| AI 服务 | http://localhost:8084 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |
| Elasticsearch | localhost:9200 |
| Milvus | localhost:19530 |

---

## 十、开发规范

### Git Commit 规范

```
feat: 新功能
fix: 修复 bug
chore: 构建/工具/依赖变更
docs: 文档更新
refactor: 重构（不改功能）
style: 格式调整
test: 测试相关
```

### 前端代码规范

- ESLint + Prettier 自动格式化
- 组件用 PascalCase (`ProductCard.tsx`)
- 工具函数用 camelCase (`apiClient.ts`)
- 页面文件夹用 kebab-case (`travel-notes/`)

### 后端代码规范

- Python: PEP 8
- Go: gofmt / golint
- API 响应统一格式:
  ```json
  { "code": 200, "message": "success", "data": {...} }
  ```
