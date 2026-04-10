# 智能旅游助手 - 项目文件结构详细说明

**文档版本**: v1.0  
**最后更新**: 2026年4月10日  
**数据库类型**: SQLite (开发环境) / MySQL (生产环境)

---

## 一、项目根目录文件说明

### 核心应用文件
- **`app.py`** - Flask主应用入口，包含所有API路由、业务逻辑和配置
- **`models.py`** - SQLAlchemy数据库模型定义，包含所有数据表结构
- **`extensions.py`** - Flask扩展配置（数据库、CORS、缓存等）
- **`init_db.py`** - 数据库初始化脚本，用于创建表和初始数据

### 配置文件
- **`.env`** - 环境变量配置文件（实际使用）
- **`.env.example`** - 环境变量示例文件
- **`requirements.txt`** - Python依赖包列表（完整版）
- **`requirements_optimized.txt`** - Python依赖包列表（优化版）
- **`data_services_config.json`** - 数据服务配置文件
- **`destinations.json`** - 景点数据JSON文件（用于初始化）
- **`nginx.conf`** - Nginx反向代理配置
- **`redis.conf`** - Redis缓存服务器配置
- **`docker-compose.optimized.yml`** - Docker容器编排文件

### 启动脚本
- **`start_v2.py`** - 统一启动脚本（推荐），支持多服务管理和优雅关闭
- **`start_backend.py`** - 后端单独启动脚本
- **`start-dev.bat`** - Windows开发环境启动脚本
- **`start-dev.ps1`** - Windows PowerShell开发环境启动脚本
- **`start.sh`** - Linux/Mac开发环境启动脚本
- **`start-all.ps1`** - Windows PowerShell全服务启动脚本
- **`一键启动.bat`** - Windows一键启动脚本

### 工具脚本
- **`manage.py`** - 项目管理命令脚本
- **`run_build.py`** - 构建脚本
- **`migrate_add_lng_lat.py`** - 数据库迁移脚本（添加经纬度字段）
- **`update_destinations_coords.py`** - 更新景点坐标脚本
- **`data_services_manager.py`** - 数据服务管理器
- **`add_chinese_comments.py`** - 自动添加中文注释工具
- **`add_meaningful_comments.py`** - 添加有意义注释工具
- **`clean_*.py`** - 清理自动生成的注释脚本系列
- **`fix_*.py`** - 修复代码问题的脚本系列
- **`scan_*.py`** - 扫描代码问题的脚本系列
- **`check_specific.py`** - 特定检查脚本
- **`final_clean_comments.py`** - 最终注释清理脚本
- **`remove_all_comments_final.py`** - 移除所有注释脚本

### 文档文件
- **`ARCHITECTURE.md`** - 项目架构设计文档
- **`README.md`** - 项目说明文档
- **`.gitignore`** - Git忽略文件配置

---

## 二、后端目录结构 (`backend/`)

### 网关服务 (`gateway/`)
- **`main.go`** - Go语言编写的API网关，处理请求路由和负载均衡

### AI服务 (`ai-service/`)
- 包含AI模型集成和智能对话处理逻辑

### 用户服务 (`user-service/`)
- 用户管理、认证和授权相关功能

### 产品服务 (`product-service/`)
- 产品管理、门票预订相关功能

### 订单服务 (`order-service/`)
- 订单处理、支付相关功能

### 推荐服务 (`recommend-service/`)
- 个性化推荐算法和逻辑

### 通知服务 (`notification-service/`)
- 站内通知、邮件、短信推送

### 后端依赖
- **`backend/requirements.txt`** - 后端服务Python依赖

---

## 三、前端目录结构 (`frontend/`)

### 用户端Web应用 (`user-web/`)
基于Next.js 14的用户端网站
- **`src/app/`** - Next.js App Router页面
  - **`page.tsx`** - 首页
  - **`destinations/`** - 景点列表和详情页面
  - **`trip/`** - 行程管理页面
  - **`assistant/`** - AI助手对话页面
  - **`profile/`** - 用户个人资料页面
- **`src/components/`** - React组件库
- **`src/store/`** - Zustand状态管理
- **`src/hooks/`** - 自定义React Hooks
- **`src/lib/`** - 工具函数和API客户端
- **`src/types/`** - TypeScript类型定义
- **`public/`** - 静态资源文件

### 管理端Web应用 (`admin-web/`)
基于React + Ant Design的管理后台
- 景点管理、用户管理、订单管理等功能

### 前端源码 (`src/`)
- 共享的前端组件和工具

---

## 四、AI核心模块 (`ai-core/`)

### 智能体模块 (`agents/`)
- **`travel_agent.py`** - 旅行规划智能体
- **`chat_agent.py`** - 对话智能体
- **`recommendation_agent.py`** - 推荐智能体

### 知识库模块 (`knowledge-base/`)
- **`destinations_kb.py`** - 目的地知识库
- **`travel_tips_kb.py`** - 旅行贴士知识库

### 模型配置模块 (`models/`)
- **`llm_config.py`** - 大语言模型配置
- **`embedding_config.py`** - 嵌入模型配置

---

## 五、数据库相关文件 (`database/`)

### 数据库架构 (`schema/`)
- **`schema.sql`** - MySQL数据库架构设计SQL脚本

### 数据库迁移 (`migrations/`)
- 数据库版本迁移脚本

### 数据库种子数据 (`seeds/`)
- 初始数据和测试数据

---

## 六、部署相关文件 (`deployment/`)

### Docker部署 (`docker/`)
- Dockerfile和Docker Compose配置

### Kubernetes部署 (`kubernetes/`)
- K8s部署配置文件

### 监控配置 (`monitoring/`)
- Prometheus和Grafana配置

---

## 七、文档目录 (`docs/`)

- **`AI_TRAVEL_ASSISTANT_INTEGRATION_COMPLETE.md`** - AI集成完成文档
- **`ai_travel_assistant_prompt.txt`** - AI助手提示词
- **`DESIGN_COMPARISON_REPORT.md`** - 设计对比报告
- **`DESIGN_SYSTEM.md`** - 设计系统文档
- **`IMPROVEMENT_PLAN.md`** - 改进计划
- **`OPTIMIZATION_REPORT.md`** - 优化报告
- **`TRAVEL_ASSISTANT_INTEGRATION_VERIFICATION.md`** - 集成验证文档
- **`SUMMARY.md`** - 项目总结
- **`SHANGHAI_3DAY_FIX_REPORT.md`** - 上海3日游修复报告
- **`travel_assistant_rules.md`** - 旅游助手规则

---

## 八、其他重要目录

### 模板目录 (`templates/`)
- HTML模板文件

### 测试目录 (`tests/`)
- 单元测试和集成测试文件

### 脚本目录 (`scripts/`)
- 辅助脚本和工具

### 实例目录 (`instance/`)
- SQLite数据库文件存储位置
- **`instance/travel.db`** - SQLite数据库文件（开发环境）

### 日志目录 (`logs/`)
- 应用日志文件

### 景点图片目录 (`scenic_images/`)
- 景点封面图片和相关资源

### 监控目录 (`monitoring/`)
- Prometheus监控配置
- **`prometheus.yml`** - Prometheus配置文件
- **`alert_rules.yml`** - 告警规则配置

### 优化应用目录 (`app_optimized/`)
- 优化版本的应用代码

### 归档目录 (`archive/`)
- 旧版本代码和备份

---

## 九、数据库详细说明

### 数据库位置
- **开发环境**: `instance/travel.db` (SQLite)
- **生产环境**: MySQL 8.0 (通过Docker部署)

### 数据库表结构

#### 核心业务表

**1. users (用户表)**
```sql
字段:
- id: 用户ID (主键)
- username: 用户名 (唯一)
- nickname: 用户昵称
- email: 邮箱地址 (唯一)
- phone: 手机号码 (唯一)
- avatar_url: 头像URL
- password_hash: 密码哈希值
- membership_level: 会员等级 (1-普通, 2-银卡, 3-金卡, 4-钻石)
- is_admin: 是否为管理员
- preferences: 用户偏好设置 (JSON格式)
- created_at: 创建时间
- updated_at: 更新时间
```

**2. destinations (景点表)**
```sql
字段:
- id: 景点ID (主键)
- name: 景点名称
- city: 所在城市
- province: 所在省份
- description: 景点描述
- cover_image: 封面图片URL
- rating: 评分 (默认5.0)
- ticket_price: 门票价格 (默认0表示免费)
- open_time: 开放时间
- lng: 经度坐标
- lat: 纬度坐标
- created_at: 创建时间
```

**3. trips (行程表)**
```sql
字段:
- id: 行程ID (主键)
- user_id: 用户ID (外键)
- title: 行程标题
- description: 行程描述
- start_date: 开始日期
- end_date: 结束日期
- status: 行程状态 (planning/in_progress/completed/cancelled)
- created_at: 创建时间
```

**4. trip_items (行程项目表)**
```sql
字段:
- id: 项目ID (主键)
- trip_id: 行程ID (外键)
- destination_id: 景点ID (外键)
- day_number: 第几天
- title: 项目标题
- description: 项目描述
- location: 项目地点
- start_time: 开始时间
- end_time: 结束时间
- sort_order: 排序顺序
- created_at: 创建时间
```

**5. user_likes (用户点赞表)**
```sql
字段:
- id: 点赞ID (主键)
- user_id: 用户ID (外键)
- destination_id: 景点ID (外键)
- created_at: 点赞时间
```

**6. user_footprints (用户足迹表)**
```sql
字段:
- id: 足迹ID (主键)
- user_id: 用户ID (外键)
- destination_id: 景点ID (外键)
- source: 访问来源 (view/search/itinerary等)
- visited_at: 访问时间
```

**7. destination_comments (景点评论表)**
```sql
字段:
- id: 评论ID (主键)
- destination_id: 景点ID (外键)
- user_id: 用户ID (外键)
- content: 评论内容
- created_at: 创建时间
- updated_at: 更新时间
```

**8. notifications (通知表)**
```sql
字段:
- id: 通知ID (主键)
- user_id: 用户ID (外键)
- title: 通知标题
- content: 通知内容
- notification_type: 通知类型 (system/booking/payment等)
- is_read: 是否已读
- created_at: 创建时间
- read_at: 阅读时间
```

**9. pages (页面表)**
```sql
字段:
- id: 页面ID (主键)
- name: 页面名称 (唯一)
- title: 页面标题
- description: 页面描述
- html_content: HTML内容
- css_content: CSS样式
- js_content: JavaScript脚本
- is_active: 是否激活
- sort_order: 排序顺序
- created_at: 创建时间
- updated_at: 更新时间
```

**10. site_configs (网站配置表)**
```sql
字段:
- id: 配置ID (主键)
- key: 配置键 (唯一)
- value: 配置值
- value_type: 值类型 (string/int/float/bool/json)
- category: 配置分类
- description: 配置描述
- is_public: 是否公开
- created_at: 创建时间
- updated_at: 更新时间
```

**11. menus (菜单表)**
```sql
字段:
- id: 菜单ID (主键)
- name: 菜单名称
- url: 菜单URL
- icon: 菜单图标
- parent_id: 父菜单ID (外键)
- sort_order: 排序顺序
- is_active: 是否激活
- menu_type: 菜单类型 (main/sidebar/footer等)
- created_at: 创建时间
```

**12. products (产品表)**
```sql
字段:
- id: 产品ID (主键)
- name: 产品名称
- subtitle: 产品副标题
- description: 产品描述
- destination_id: 关联景点ID (外键)
- category: 产品类别 (ticket/tour/package等)
- base_price: 基础价格
- discount_price: 折扣价格
- inventory_total: 总库存
- inventory_sold: 已售数量
- booking_type: 预订类型 (date/time/datetime)
- need_date: 是否需要日期
- need_time: 是否需要时间
- cover_image: 封面图片
- images: 图片列表 (JSON)
- status: 产品状态 (active/inactive/sold_out)
- rating: 评分
- sold_count: 销售数量
- created_at: 创建时间
- updated_at: 更新时间
```

**13. orders (订单表)**
```sql
字段:
- id: 订单ID (主键)
- user_id: 用户ID (外键)
- order_no: 订单号 (唯一)
- total_amount: 订单总金额
- status: 订单状态 (pending/paid/cancelled/completed/refunded)
- payment_method: 支付方式 (alipay/wechat/card等)
- payment_time: 支付时间
- created_at: 创建时间
- updated_at: 更新时间
```

**14. order_items (订单项表)**
```sql
字段:
- id: 订单项ID (主键)
- order_id: 订单ID (外键)
- product_id: 产品ID
- product_name: 产品名称
- product_type: 产品类型
- quantity: 数量
- unit_price: 单价
- total_price: 总价
- booking_details: 预订详情 (JSON)
```

**15. product_qa (产品问答表)**
```sql
字段:
- id: 问答ID (主键)
- product_id: 产品ID (外键)
- destination_id: 景点ID (外键)
- user_id: 用户ID (外键)
- question: 问题内容
- answer: 答案内容
- status: 状态 (pending/answered)
- created_at: 创建时间
- answered_at: 回答时间
```

### 数据库关系图
```
users (用户)
├── trips (行程)
│   └── trip_items (行程项目)
│       └── destinations (景点)
├── user_likes (点赞)
│   └── destinations (景点)
├── user_footprints (足迹)
│   └── destinations (景点)
├── destination_comments (评论)
│   └── destinations (景点)
├── notifications (通知)
├── orders (订单)
│   └── order_items (订单项)
│       └── products (产品)
│           └── destinations (景点)
└── product_qa (问答)
    ├── products (产品)
    └── destinations (景点)

destinations (景点)
├── products (产品)
├── trip_items (行程项目)
├── user_likes (点赞)
├── user_footprints (足迹)
└── destination_comments (评论)
```

### 数据库初始化
1. **自动初始化**: 运行 `python init_db.py` 自动创建所有表
2. **手动初始化**: 使用 `database/schema/schema.sql` 在MySQL中创建
3. **数据迁移**: 使用 `migrate_add_lng_lat.py` 等迁移脚本更新表结构
4. **种子数据**: 从 `destinations.json` 导入初始景点数据

### 数据库访问配置
```python
# 开发环境 (SQLite)
SQLALCHEMY_DATABASE_URI = sqlite:///instance/travel.db

# 生产环境 (MySQL)
SQLALCHEMY_DATABASE_URI = mysql://user:password@localhost/travel_assistant
```

---

## 十、环境变量说明

### 后端环境变量 (.env)
```bash
# 服务器配置
PORT=5001
FLASK_ENV=production
SECRET_KEY=your-secret-key-here

# 数据库配置
SQLALCHEMY_DATABASE_URI=sqlite:///instance/travel.db

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# AI服务配置
OPENAI_API_KEY=your-openai-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key

# 文件存储
SCENIC_IMAGES_ROOT=./scenic_images
DESTINATIONS_JSON_PATH=./destinations.json

# 外部API
WEATHER_API_KEY=your-weather-api-key
```

### 前端环境变量 (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
NEXT_PUBLIC_MAPS_API_KEY=your-maps-api-key
```

---

## 十一、启动流程说明

### 开发环境启动
1. **一键启动** (推荐):
   ```bash
   # Windows
   start-dev.bat
   
   # Linux/Mac
   ./start.sh
   ```

2. **使用统一启动脚本**:
   ```bash
   python start_v2.py --profile default
   ```

3. **单独启动后端**:
   ```bash
   python app.py
   ```

4. **单独启动前端**:
   ```bash
   cd frontend/user-web
   npm run dev
   ```

### 生产环境部署
1. **Docker部署**:
   ```bash
   docker-compose -f docker-compose.optimized.yml up -d
   ```

2. **服务包括**:
   - Flask应用 (Waitress服务器)
   - Redis缓存
   - MySQL数据库
   - Nginx反向代理
   - Prometheus监控
   - Grafana监控面板

---

## 十二、项目统计

### 代码规模
- **后端代码**: 约10,000+行Python代码
- **前端代码**: 约8,000+行TypeScript/React代码
- **数据库表**: 15个核心业务表
- **API接口**: 50+个RESTful端点

### 技术栈
- **后端**: Python 3.9+, Flask 2.3, SQLAlchemy 2.0
- **前端**: Next.js 14, React 18, TypeScript 5.2
- **数据库**: SQLite (开发), MySQL 8.0 (生产)
- **缓存**: Redis 7
- **部署**: Docker, Nginx, Waitress

---

**文档维护**: 本文件结构说明应随项目发展持续更新，新增文件或目录变动需及时同步文档。

**联系方式**: 如有文件结构相关问题，请联系开发团队。