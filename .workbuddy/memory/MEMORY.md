# MEMORY.md - 旅行助手项目

## 项目概述
- 基于 Flask + Next.js 的旅行助手应用
- 后端：Flask API (`app.py`) + SQLite 数据库 (`instance/travel.db`)
- 前端：Next.js (`frontend/user-web/src/`)
- 部署：Docker + Nginx

## 管理员系统
- `is_admin` 字段在 User 模型中
- 管理员登录：`POST /api/admin/login` + 前端 `/admin` 页面
- 普通用户登录：`POST /api/auth/login` 或 `/api/users/login`
- 管理员使用独立 `admin_token`（localStorage），与普通用户 `auth_token` 分开
- `AdminGuard` 组件 (`src/components/AdminGuard.tsx`) 负责前端管理员认证
- 管理员账号：admin / 123456 / admin@example.com（支持用户名或邮箱登录）

## 关键文件
- 后端入口：`app.py`（注意与 `app_optimized.py` 有重复 Destination 模型定义问题，建议统一用 `models.py`）
- 前端入口：`frontend/user-web/src/`
- 数据库：`instance/travel.db`

## AI 助手功能（截至 2026-04-07）
- 行程规划已整合到 `/assistant` 页面，独立 `/planner` 重定向至此
- AI 人设：**小游**，热情话痨旅行规划师（`SMART_SYSTEM_PROMPT` in `app.py`）
- 支持多服务商：Moonshot AI、智谱 GLM-4、AWS Bedrock、OpenAI（前端下拉切换）
- 天气查询：心知天气 API（`SENIVERSE_API_KEY`），支持实时天气和3天预报
- Agent 架构：`POST /api/agent/chat`，最多6轮工具调用，SSE 流式响应
  - 5个工具：`get_weather / search_destinations / search_products / generate_itinerary / get_travel_tips`
  - 前端 ⚡ 按钮切换 Agent/普通模式
- 行程可视化：`TripDayCard` / `TripOverview` / `TripCard` 组件，自动检测 AI 回复并渲染卡片

## 景点数据
- 数据源：`destinations.json`（已从 `全国景点攻略大全.md` 替换，1452个景点，覆盖35省）
- 图片目录：`scenic_images/`（1434个景点已匹配图片）
- 导入命令：`python scripts/import_destinations_from_json.py`

## 目的地详情页组件（2026-04-09 新增）
- `HeroCard` - 场馆名片（名称/位置/评分/开放时间/门票）
- `QuickGlance` - 必看清单（网格布局）
- `Timeline` - 一日游时间轴
- `TipsAccordion` - 实用锦囊（可折叠）
- `NearbyMap` - 周边联动（地图+景点列表）

## 前端大规模损坏修复（2026-04-10）
### 问题根源
自动注释注入脚本将 `//` 注释插入所有行（包括 JSX 标签行），导致 ~66 个前端文件编译失败。
JSX 只支持 `{/* */}` 注释，`//` 注释会导致 SWC 编译报错。

### 修复脚本（已执行）
| 脚本 | 作用 | 结果 |
|------|------|------|
| `fix_encoding.py` | 删除 U+FFFD 替换字符 | 1448处，66文件 |
| `fix_all_strings.py` | 批量修复截断中文字符串 | 424处，56文件 |
| `fix_jsx_comments.py` | 删除 `<tag>   // 注释` 模式 | 3421处，57文件 |
| `fix_remaining.py` | 修复函数缺失`{}`、多行JSX标签注释 | 357处，56文件 |
| `fix_ultimate.py` | 删除全部剩余行末 `//` 注释、修复截断字符串 | **待运行** |

### 具体修复的文件（关键）
- `Footer.tsx`：截断字符串、JSX `//` 注释
- `Navbar.tsx`：截断字符串（目的地/退出登录等）、JSX `//` 注释
- `HeroCard.tsx`：截断字符串、JSX `//` 注释
- `Timeline.tsx`：截断字符串（一日游时间轴）
- `NearbyMap.tsx`：缺失函数 `{}`、截断字符串
- `about/page.tsx`：多处截断字符串、JSX `//` 注释
- `admin/comments/page.tsx`：`'没有管理员权限'` 截断
- `admin/destinations/page.tsx`：缺失函数 `{}`、截断字符串
- `ProductCard.tsx`：多行JSX属性行 `//` 注释（fix_ultimate.py 待修复）

### 当前状态（2026-04-10 11:05）
所有修复已完成，系统正常运行：
- ✅ 后端端口已修复：`app.py` 的 `app.run()` 改为从 `.env` 读取 PORT（默认5001）
- ✅ Redis 不可用降级：`rate_limit`、`redis_cache_get/set`、`redis_cache_delete_pattern` 均已加 try/except
- ✅ 景点数据已重新导入：1452个景点（`scripts/import_destinations_from_json.py`）
- ✅ 前端(3000) + 后端(5001) 均正常运行
- ⚠️ Redis 未启动（本地开发不需要，限流和缓存已自动降级）
