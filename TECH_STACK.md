# 智能旅游助手 - 技术栈详解

> **文档说明**：从零开始讲解项目所用到的每一项技术，包括定义、解决的问题、在项目中的具体用途以及选型理由。

---

## 目录

- [一、前端技术](#一前端技术)
  - [Next.js 14](#1-nextjs-14)、[React 18](#2-react-18)、[TypeScript](#3-typescript)、[Tailwind CSS](#4-tailwind-css)
  - [Zustand](#5-zustand)、[React Query](#6-react-query)、[SWR](#10-swr)、[Axios](#7-axios)
  - [Framer Motion](#8-framer-motion)、[React Hook Form + Zod](#9-react-hook-form--zod)
  - [Lucide React](#11-lucide-react)、[PostCSS & Autoprefixer](#12-postcss--autoprefixer)
  - [date-fns](#13-date-fns)、[ESLint & Prettier](#14-eslint--prettier)
- [二、后端技术](#二后端技术)
  - [Flask](#15-flask)、[SQLAlchemy](#16-sqlalchemy)、[Flask-SQLAlchemy](#17-flask-sqlalchemy)
  - [Flask-CORS](#18-flask-cors)、[PyJWT](#19-pyjwt)、[python-dotenv](#20-python-dotenv)
  - [Werkzeug](#21-werkzeug)、[API 限流装饰器](#22-api-限流装饰器)
  - [RotatingFileHandler](#23-rotatingfilehandler)、[结构化日志](#24-结构化日志)
- [三、数据库与缓存](#三数据库与缓存)
  - [SQLite](#25-sqlite)、[MySQL 8.0](#26-mysql-80)、[Redis](#27-redis)
- [四、AI 与大模型](#四ai-与大模型)
  - [大语言模型](#28-大语言模型llm)、[Prompt Engineering](#29-prompt-engineering)
- [五、基础设施与部署](#五基础设施与部署)
  - [Nginx](#30-nginx)、[Docker](#31-docker)、[Docker Compose](#32-docker-compose)
  - [Waitress](#33-waitress)、[Git](#34-git)
- [六、安全相关技术](#六安全相关技术)
  - [密码哈希](#35-密码哈希)、[CORS](#36-cors)、[参数化查询](#37-参数化查询)
- [七、监控与日志](#七监控与日志)
  - [Prometheus](#38-prometheus)、[Grafana](#39-grafana)
- [八、技术选型总览](#八技术选型总览)

---

## 一、前端技术

用户打开浏览器后，所有看得见、摸得着的交互和界面，都由以下技术构建。

### 1. Next.js 14

**定义**：React 的增强版框架，由 Vercel 公司开发，在 React 基础上增加了服务端渲染、静态生成、文件系统路由等能力。

**解决的问题**：
- 纯客户端渲染（CSR）首屏加载慢，用户需要等待 JS 下载执行后才能看到内容
- 搜索引擎爬虫抓不到 CSR 页面的内容，SEO 极差
- 没有内置的路由系统，需要额外配置

**核心能力**：
- **SSR（服务端渲染）**：服务器先把 HTML 拼好发给浏览器，首屏瞬间显示
- **SSG（静态生成）**：构建时生成静态 HTML 页面，访问速度极快，可直接部署到 CDN
- **App Router**：基于文件系统的路由，支持嵌套布局、并行路由、拦截路由等高级功能
- **Image 组件**：自动优化图片尺寸、格式、懒加载

**为什么选它**：旅游类网站高度依赖 SEO（用户搜"北京旅游攻略"需要被搜索引擎收录），且首屏体验直接影响用户留存。

---

### 2. React 18

**定义**：Facebook（Meta）开发的用于构建用户界面的 JavaScript 库，采用组件化开发模式。

**核心概念**：
- **组件（Component）**：将页面拆分为独立、可复用的小块（如按钮、卡片、导航栏），每个组件封装自己的逻辑和样式
- **JSX**：在 JavaScript 中书写类似 HTML 的语法，编译后转换为 `React.createElement`
- **虚拟 DOM**：在内存中维护一棵虚拟树，通过 Diff 算法最小化真实 DOM 操作，提升性能
- **Hooks**：让函数组件拥有状态和副作用处理能力
  - `useState`：管理组件内部状态
  - `useEffect`：处理副作用（数据获取、订阅、DOM 操作）
  - `useContext`：跨组件共享数据

**为什么选它**：全球生态最大、社区组件库最丰富、招聘最容易、文档最完善。

---

### 3. TypeScript

**定义**：JavaScript 的超集，为语言添加了静态类型系统，代码在运行前就能被类型检查器捕获错误。

**解决的问题**：

普通 JavaScript 的问题：
```javascript
// 运行时才发现 bug，可能已经上线
function add(a, b) { return a + b }
add("1", 2) // 结果是 "12"，字符串拼接，不是数字加法
```

TypeScript 的解决方式：
```typescript
// 写代码时就报错，在编辑器里标红
function add(a: number, b: number): number { return a + b }
add("1", 2) // ❌ 编译错误：类型 'string' 不能赋值给类型 'number'
```

**高级特性**：
- **接口（Interface）**：定义对象的结构契约
- **泛型（Generic）**：编写可复用的类型安全代码
- **类型推断**：不需要处处写类型，编译器自动推断
- **联合类型/交叉类型**：灵活组合类型

**为什么选它**：项目规模越大，类型约束的价值越高。能提前发现 80% 的 Bug，重构时代码更安全，IDE 自动补全和提示更智能。

---

### 4. Tailwind CSS

**定义**：原子化（Utility-First）CSS 框架，不提供预置组件，而是提供大量细粒度的工具类，直接在 HTML/JSX 上组合使用。

**对比传统 CSS**：

```html
<!-- 传统方式：写 CSS 文件，定义类名 -->
<button class="btn-primary">点击</button>
<!-- .btn-primary { padding: 10px 20px; background: #3b82f6; color: white; border-radius: 6px; } -->

<!-- Tailwind：直接堆砌工具类，无需写 CSS 文件 -->
<button class="px-5 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
  点击
</button>
```

**核心优势**：
- **开发速度快**：不需要在 CSS 文件和组件文件之间来回跳转
- **包体积小**：构建时自动剔除未使用的样式（PurgeCSS），最终 CSS 通常只有 10KB 左右
- **设计系统一致**：颜色、间距、圆角等全部基于预设的设计令牌（Design Tokens），不会出现"这个蓝和那个蓝不一样"的问题
- **响应式友好**：`md:flex lg:grid` 这样的前缀轻松实现适配

**为什么选它**：非常适合需要快速迭代、设计规范的现代化项目。

---

### 5. Zustand

**定义**：React 的轻量级状态管理库，语法极简，不需要 Provider 包裹。

**解决的问题**：React 的 props 单向数据流导致"prop drilling"（层层传递数据），深层子组件需要数据时，中间所有层都要当搬运工。

**使用方式**：

```typescript
import { create } from 'zustand'

// 创建一个全局状态仓库
const useAuthStore = create((set) => ({
  user: null,
  isLoggedIn: false,
  login: (userData) => set({ user: userData, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false }),
}))

// 任何组件直接使用，无需逐层传递
function Header() {
  const { user, logout } = useAuthStore()
  return user ? <button onClick={logout}>退出</button> : <a href="/login">登录</a>
}
```

**为什么选它**：Redux 需要写 Action、Reducer、Store、Slice，样板代码极多。Zustand 几行搞定，且性能不差。

---

### 6. React Query (TanStack Query)

**定义**：专门处理服务端数据获取、缓存、同步的库。

**解决的问题**：自己手写 `useEffect + fetch` 非常繁琐，需要处理：
- 加载状态（显示 Loading 骨架屏）
- 错误状态（网络断了显示报错）
- 缓存（切走页面再回来，不需要重新请求）
- 重新获取（窗口重新聚焦时自动刷新）
- 请求去重（两个组件同时需要同一份数据，只发一次请求）

**核心能力**：

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['destinations', city],  // 缓存的键
  queryFn: () => api.getDestinations(city),  // 实际请求函数
  staleTime: 5 * 60 * 1000,  // 5 分钟内数据视为新鲜，不重新请求
})
```

**为什么选它**：把服务端状态（来自 API 的数据）和客户端状态（UI 开关、表单输入）分开管理，代码更清晰。

---

### 7. Axios

**定义**：基于 Promise 的 HTTP 客户端库，用于浏览器和 Node.js。

**解决的问题**：浏览器原生 `fetch` API 功能太基础，需要手动处理很多细节。

**Axios 提供的增强功能**：
- 自动转换 JSON（不需要 `.then(res => res.json())`）
- 请求/响应拦截器：统一加 Token、统一处理错误码
- 请求取消：页面切换时自动取消未完成的请求
- 更好的错误处理：网络错误、超时、状态码异常都有清晰的错误对象
- 支持请求进度监控（上传/下载进度条）

**为什么选它**：稳定、功能完善、生态成熟，是 React/Vue 项目调用后端 API 的事实标准。

---

### 8. Framer Motion

**定义**：React 的生产级动画库，用声明式语法描述动画。

**解决的问题**：CSS 动画写起来麻烦，且难以实现复杂的交互动画（如布局动画、手势拖拽、页面转场）。

**示例**：

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}      // 初始状态：透明、下移 20px
  animate={{ opacity: 1, y: 0 }}       // 目标状态：完全不透明、归位
  transition={{ duration: 0.5 }}       // 过渡时间 0.5 秒
/>
```

**为什么选它**：语法直观、性能优化到位（使用 GPU 加速）、与 React 组件模型完美契合。

---

### 9. React Hook Form + Zod

**React Hook Form**：高性能表单库，采用非受控组件思想，减少不必要的重渲染。

**Zod**：TypeScript 优先的数据校验库，用链式 API 定义数据规则。

**组合使用**：

```typescript
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// 1. 用 Zod 定义校验规则
const schema = z.object({
  email: z.string().email('请输入有效的邮箱'),
  password: z.string().min(6, '密码至少 6 位'),
})

// 2. 绑定到表单
type FormData = z.infer<typeof schema>
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

**为什么选它们**：表单是前端最复杂的部分之一，这套组合让表单开发既类型安全又校验完善。

---

### 10. SWR

**定义**：React 的轻量级数据获取库，由 Vercel 团队开发，名字源自 `stale-while-revalidate`（先返回缓存数据，同时后台重新验证）。

**与 React Query 的区别**：
- SWR 更轻量，API 更简单
- React Query 功能更全（ mutations、离线支持、devtools）
- 两者理念相似，可以共存

**核心用法**：

```typescript
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher)

  if (error) return <div>加载失败</div>
  if (isLoading) return <div>加载中...</div>

  return <div>你好，{data.name}</div>
}
```

**为什么选它**：轻量、与 Next.js 同团队，在简单数据获取场景下比 React Query 更简洁。

---

### 11. Lucide React

**定义**：开源图标库，提供 1000+ 个简洁、一致的 SVG 图标，React 封装版。

**用法**：

```tsx
import { MapPin, Calendar, Heart, Star } from 'lucide-react'

function DestinationCard() {
  return (
    <div>
      <MapPin size={20} color="#3b82f6" />      {/* 地图标记 */}
      <Calendar size={18} />                     {/* 日历 */}
      <Heart size={20} className="text-red-500" /> {/* 收藏心形 */}
      <Star size={16} fill="gold" stroke="gold" /> {/* 评分星星 */}
    </div>
  )
}
```

**为什么选它**：图标风格统一、文件体积小（Tree Shaking 自动剔除未使用的图标）、支持自定义大小和颜色。

---

### 12. PostCSS & Autoprefixer

**PostCSS**：CSS 后处理工具，用 JavaScript 插件转换 CSS。

**Autoprefixer**：PostCSS 插件，自动给 CSS 属性加浏览器前缀。

**解决的问题**：不同浏览器需要不同的前缀：

```css
/* 手动写 */
.example {
  -webkit-border-radius: 4px;
  -moz-border-radius: 4px;
  -ms-border-radius: 4px;
  -o-border-radius: 4px;
  border-radius: 4px;
}

/* Autoprefixer 自动生成 */
.example {
  border-radius: 4px;
}
```

**为什么选它**：Tailwind CSS 底层依赖 PostCSS，Autoprefixer 确保生成的 CSS 在各浏览器兼容。

---

### 13. date-fns

**定义**：现代化的 JavaScript 日期处理库，采用函数式编程风格。

**对比原生 Date**：

```typescript
import { format, addDays, differenceInDays, isBefore } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const today = new Date()

// 格式化
format(today, 'yyyy年MM月dd日', { locale: zhCN }) // "2026年04月23日"

// 加减天数
const tomorrow = addDays(today, 1)
const nextWeek = addDays(today, 7)

// 相差天数
const tripStart = new Date('2026-05-01')
const daysLeft = differenceInDays(tripStart, today)

// 比较
isBefore(today, tripStart) // true
```

**为什么选它**：比 moment.js 体积小（Tree Shaking 后只打包用到的函数）、不可变（不会修改原日期对象）、TypeScript 原生支持。

---

### 14. ESLint & Prettier

**ESLint**：静态代码分析工具，检查代码中的潜在问题和风格违规。

**Prettier**：代码格式化工具，统一代码风格（缩进、引号、分号等）。

**分工**：
- ESLint：发现 Bug（未使用变量、类型错误、潜在逻辑问题）
- Prettier：处理格式（换行、空格、括号位置）

**配置示例**：

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}

// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**为什么选它们**：团队协作时代码风格统一，减少 Code Review 中的格式争论，提前发现低级错误。

---

## 二、后端技术

服务器端接收前端请求、处理业务逻辑、操作数据库的所有代码，都跑在以下技术之上。

### 10. Flask

**定义**：Python 的轻量级 Web 框架，核心极简，通过扩展插件实现各种功能。

**核心概念**：
- **路由（Route）**：把 URL 路径映射到处理函数
- **请求/响应对象**：封装 HTTP 请求和响应的所有信息
- **蓝图（Blueprint）**：模块化组织路由，避免所有代码挤在一个文件里

**对比其他 Python 框架**：

| 框架 | 特点 | 适用场景 |
|------|------|----------|
| Flask | 轻量、灵活、扩展丰富 | 中小项目、微服务、API 服务 |
| Django | 重型、内置 ORM/Admin/Auth | 快速开发、内容管理系统 |
| FastAPI | 现代、异步、自动生成 Swagger 文档 | 高并发 API、需要类型提示 |

**为什么选它**：项目初期功能不复杂，Flask 够用且灵活，扩展生态成熟。

---

### 11. SQLAlchemy

**定义**：Python 最成熟的 ORM（对象关系映射）库，把数据库表映射为 Python 类。

**解决的问题**：手写 SQL 容易出错、难以维护、存在 SQL 注入风险。

**工作方式**：

```python
# 不用写：SELECT * FROM destinations WHERE city = '北京' AND rating > 4.5
# 而是写：
destinations = Destinations.query \
    .filter_by(city='北京') \
    .filter(Destinations.rating > 4.5) \
    .all()
```

**核心能力**：
- **ORM 映射**：类 = 表，属性 = 字段，实例 = 行记录
- **关系定义**：一对多、多对多关系通过 `relationship()` 声明
- **迁移支持**：配合 Alembic 实现数据库版本化管理
- **连接池**：自动管理数据库连接，避免频繁创建销毁

**为什么选它**：防 SQL 注入、代码可读性高、数据库切换方便（从 SQLite 切到 MySQL 只需改配置字符串）。

---

### 12. Flask-SQLAlchemy

**定义**：SQLAlchemy 的 Flask 集成扩展。

**作用**：
- 自动读取 Flask 的配置（数据库连接字符串）
- 和 Flask 的请求生命周期绑定：请求开始时创建会话，请求结束时自动提交或回滚
- 提供 `db.Model` 基类，模型继承它就能自动关联到当前应用

**为什么选它**：省去手动初始化 SQLAlchemy 和绑定 Flask 应用的样板代码。

---

### 13. Flask-CORS

**定义**：Flask 的跨域资源共享中间件。

**解决的问题**：浏览器的**同源策略**（Same-Origin Policy）安全机制，禁止前端页面向不同域名/端口的后端发送请求。

**示例**：
- 前端跑在 `http://localhost:3000`
- 后端跑在 `http://localhost:5001`
- 端口不同 = 不同源，浏览器默认拦截

**解决方案**：Flask-CORS 在 HTTP 响应头中添加：
```
Access-Control-Allow-Origin: http://localhost:3000
```
告诉浏览器"我信任这个来源，允许它访问"。

---

### 14. PyJWT

**定义**：JWT（JSON Web Token）的 Python 实现库。

**解决的问题**：HTTP 是无状态的，服务器不知道两次请求是不是同一个用户发的。需要一种机制让前端"证明身份"。

**传统方案（Session）的问题**：
- 需要在服务端存储所有用户的会话信息
- 分布式部署时，Session 需要在多台服务器间同步
- 占用服务器内存

**JWT 的方案**：
- 用户登录成功后，服务器生成一个**签名过的令牌**发给前端
- 前端之后每次请求都在 HTTP Header 中带上这个令牌
- 服务器验证签名，从令牌中解析出用户 ID，无需查数据库

**JWT 结构**：
```
eyJhbGciOiJIUzI1NiIs...  // Header：声明加密算法
.
eyJ1c2VyX2lkIjoxLCJleHA...  // Payload：用户ID、角色、过期时间
.
SflKxwRJSMeKKF2QT4fwpMe...  // Signature：签名，防篡改
```

**为什么选它**：无状态认证，服务器不需要存会话，天然适合分布式和微服务架构。

---

### 15. python-dotenv

**定义**：从 `.env` 文件加载环境变量到 `os.environ` 的 Python 库。

**解决的问题**：开发环境和生产环境配置不同（数据库地址、API 密钥、端口号），代码中硬编码配置既不安全也不灵活。

**用法**：

```python
# .env 文件（不提交到 Git）
PORT=5001
SECRET_KEY=my-secret-key
DATABASE_URI=sqlite:///travel.db
ZHIPU_API_KEY=your-api-key

# Python 代码
from dotenv import load_dotenv
import os

load_dotenv()  # 加载 .env 文件到环境变量

port = os.getenv("PORT", "5000")           # 带默认值
secret = os.getenv("SECRET_KEY")           # 没有则返回 None
```

**为什么选它**：把敏感配置从代码中分离，不同开发者、不同服务器可以用不同的 `.env` 文件，代码仓库保持干净。

---

### 16. Werkzeug

**定义**：WSGI 工具库，Flask 的底层依赖，提供了大量 Web 开发的基础工具。

**作用**：
- 封装 HTTP 请求和响应对象
- URL 路由匹配和分发
- 密码哈希（`generate_password_hash` / `check_password_hash`）
- 文件上传处理
- 开发服务器（仅供开发使用，不用于生产）

---

### 17. API 限流装饰器

**定义**：控制客户端请求频率的机制，防止单个用户/IP 在短时间内发送过多请求。

**解决的问题**：
- 恶意刷接口（DDoS 攻击）
- 爬虫过度抓取
- 大模型 API 调用费用爆炸（按次收费）

**基于 Redis 的实现**：

```python
import time
from functools import wraps
from flask import request, jsonify
import redis

r = redis.Redis(decode_responses=True)

def rate_limit(key_prefix: str, limit: int = 100, window: int = 60):
    """
    限流装饰器
    :param key_prefix: 限流键前缀
    :param limit: 时间窗口内允许的最大请求数
    :param window: 时间窗口（秒）
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # 用 IP + 用户ID 作为标识
            client_id = request.headers.get("Authorization", request.remote_addr)
            key = f"rate_limit:{key_prefix}:{client_id}"

            current = r.get(key)
            if current and int(current) >= limit:
                return jsonify({
                    "success": False,
                    "message": f"请求过于频繁，请 {window} 秒后再试"
                }), 429

            pipe = r.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            pipe.execute()

            return f(*args, **kwargs)
        return wrapped
    return decorator

# 使用
@app.route("/api/chat", methods=["POST"])
@rate_limit("chat", limit=10, window=60)  # 1 分钟最多 10 次
def chat():
    # AI 对话逻辑...
    pass
```

**为什么需要**：保护服务器资源和第三方 API 调用额度，提升服务稳定性。

---

### 18. RotatingFileHandler

**定义**：Python 日志模块的处理器，当日志文件达到指定大小时自动创建新文件，防止单个日志文件无限膨胀。

**用法**：

```python
import logging
from logging.handlers import RotatingFileHandler
import os

# 确保日志目录存在
os.makedirs("logs", exist_ok=True)

# 配置 RotatingFileHandler
file_handler = RotatingFileHandler(
    "logs/app.log",      # 日志文件路径
    maxBytes=10 * 1024 * 1024,  # 单个文件最大 10MB
    backupCount=5,       # 保留 5 个备份文件
    encoding="utf-8",
)

# 设置格式
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
))

# 配置根日志器
logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

# 使用
logger.info("用户登录成功: user_id=123")
logger.warning("API 响应较慢: 2.5s")
logger.error("数据库连接失败", exc_info=True)
```

**生成的文件**：
```
logs/
  app.log          # 当前日志
  app.log.1        # 最近一份备份
  app.log.2        # 第二份备份
  ...
  app.log.5        # 最旧的一份
```

**为什么选它**：长期运行的服务日志量巨大，不轮转的话单个文件可能占满磁盘。

---

### 19. 结构化日志

**定义**：以 JSON 等结构化格式输出日志，而非纯文本字符串。

**对比**：

```
❌ 传统日志（文本）：
2026-04-23 10:00:00 - 用户张三登录成功，IP: 192.168.1.1
→ 需要正则提取字段，查询困难

✅ 结构化日志（JSON）：
{
  "timestamp": "2026-04-23T10:00:00Z",
  "level": "INFO",
  "event": "user_login",
  "user_id": 123,
  "username": "张三",
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
→ 直接按字段过滤、聚合、分析
```

**Python 实现**：

```python
import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }
        if hasattr(record, "extra"):
            log_data.update(record.extra)
        return json.dumps(log_data, ensure_ascii=False)

# 使用
logger = logging.getLogger(__name__)
logger.info("用户操作", extra={
    "event": "destination_view",
    "destination_id": 123,
    "user_id": 456
})
```

**为什么选它**：配合 ELK（Elasticsearch + Logstash + Kibana）或 Grafana Loki 可以高效检索和分析日志，排查问题更快。

---

## 三、数据库与缓存

### 16. SQLite

**定义**：嵌入式关系型数据库，整个数据库就是一个 `.db` 文件，零配置、零部署。

**特点**：
- 不需要安装数据库服务器，不需要配置用户权限
- 支持标准 SQL、事务、索引
- 单文件存储，便于备份和迁移

**局限性**：
- 不支持高并发写入（文件级锁）
- 没有用户权限管理
- 不适合大数据量场景

**为什么用**：开发和测试环境的默认选择，启动项目最快。

---

### 17. MySQL 8.0

**定义**：最流行的开源关系型数据库管理系统，由 Oracle 维护。

**核心特性**：
- **ACID 事务**：保证数据一致性
- **主从复制**：读写分离，提升性能
- **InnoDB 存储引擎**：支持行级锁、外键、崩溃恢复
- **JSON 支持**：原生支持 JSON 类型和查询

**为什么生产用**：成熟稳定、社区庞大、运维工具完善、能支撑高并发访问。

---

### 18. Redis

**定义**：内存中的键值数据库（Data Structure Store），所有数据存在内存中，读写速度是磁盘的 1000 倍以上。

**支持的数据结构**：
- String（字符串）
- Hash（哈希表）
- List（列表）
- Set（集合）
- Sorted Set（有序集合）

**在项目中的用途**：

| 用途 | 说明 |
|------|------|
| **会话缓存** | 存用户登录状态（Token -> 用户信息），不用每次都查数据库 |
| **热点数据缓存** | 热门景点信息缓存 5 分钟，减轻 MySQL 压力 |
| **限流计数** | 统计某个 IP 1 分钟内请求次数，超频直接拒绝 |
| **排行榜** | 景点收藏数、浏览量的实时排行 |
| **分布式锁** | 防止多个进程同时修改同一份数据 |

**为什么选它**：速度极快（微秒级响应），支持自动过期（TTL），数据结构丰富。

---

## 四、AI 与大模型

### 19. 大语言模型（LLM）

**定义**：基于 Transformer 架构、经过海量文本训练的神经网络，能够理解和生成自然语言。

**项目对接的模型**：

| 模型 | 厂商 | 特点 |
|------|------|------|
| **GLM-4.6v** | 智谱 AI | 国产大模型，支持图片多模态理解，中文语境优化好 |
| **Kimi K2.5** | Moonshot（月之暗面） | 超长上下文（25 万 token），适合长文档分析 |
| **DeepSeek V3** | DeepSeek（深度求索） | 开源模型，推理能力强，API 价格低 |

**调用方式**：通过各厂商提供的 HTTP API 发送请求，传入 prompt（提示词），获取生成的文本回复。

---

### 20. Prompt Engineering（提示工程）

**定义**：设计和优化输入给大模型的指令模板，以获取更精准、结构化的输出。

**为什么重要**：大模型的输出质量 80% 取决于 prompt 怎么写。

**示例对比**：

```
❌ 差的 prompt：
"北京3天怎么玩"
→ 回答零散、格式不固定、可能遗漏关键信息

✅ 好的 prompt：
"你是资深旅行规划师。用户要去北京玩3天，偏好历史文化。
请按以下 JSON 格式输出每日行程：
{
  \"day\": 1,
  \"activities\": [
    {\"time\": \"09:00\", \"spot\": \"...\", \"duration\": \"...\", \"tips\": \"...\"}
  ]
}"
→ 回答结构化、可直接解析存入数据库
```

---

## 五、基础设施与部署

### 21. Nginx

**定义**：高性能的 HTTP 服务器和反向代理服务器。

**在项目中的作用**：

| 作用 | 说明 |
|------|------|
| **反向代理** | 用户访问 `80/443` 端口，Nginx 根据路径转发给后端 Flask（5001）或前端 Next.js（3000） |
| **静态文件服务** | 图片、CSS、JS 等静态资源直接由 Nginx 返回，不占用 Flask 进程 |
| **SSL/TLS 终止** | HTTPS 证书配置在 Nginx，后端可以只跑 HTTP |
| **负载均衡** | 多台 Flask 服务器时，按策略分摊请求 |
| **压缩** | Gzip 压缩响应内容，减少传输体积 |

**为什么选它**：单机能支撑数万并发连接，内存占用低，配置简单。

---

### 22. Docker

**定义**：容器化平台，把应用和它依赖的所有环境（操作系统库、运行时、配置）打包成一个标准化的"集装箱"。

**解决的问题**：
- "在我电脑上能跑，到你电脑上就跑不了"的环境不一致问题
- 一台服务器上部署多个应用，依赖冲突（A 需要 Python 3.9，B 需要 Python 3.11）

**核心概念**：
- **镜像（Image）**：只读的模板，包含运行应用所需的一切
- **容器（Container）**：镜像的运行实例，相互隔离
- **Dockerfile**：定义镜像构建步骤的脚本

**比喻**：传统部署像搬家时把家具拆开运（到了新家还要重新组装），Docker 像把整个房间连地板一起搬走，到哪里都能直接用。

---

### 23. Docker Compose

**定义**：定义和运行多容器 Docker 应用的工具。

**作用**：用一个 `docker-compose.yml` 文件描述所有服务（Flask + MySQL + Redis + Nginx），一条命令全部启动。

```yaml
# 示例结构
services:
  app:        # Flask 应用
  db:         # MySQL 数据库
  redis:      # Redis 缓存
  nginx:      # Nginx 反向代理
```

**为什么选它**：省去了手动一个个启动容器、配网络的麻烦。

---

### 24. Waitress

**定义**：纯 Python 编写的 WSGI 生产服务器。

**解决的问题**：Flask 内置的开发服务器（`app.run()`）是单线程的，一次只能处理一个请求，且存在安全漏洞，**绝对不能用于生产环境**。

**Waitress 的能力**：
- 多线程处理并发请求
- 支持 HTTP/1.1
- 无需额外依赖（如 Gunicorn 需要额外的 worker 配置）
- 跨平台（Windows 和 Linux 都能跑）

---

### 25. Git

**定义**：分布式版本控制系统，记录代码的每一次修改。

**核心能力**：
- **版本回溯**：代码写坏了，随时回退到之前的版本
- **分支管理**：主分支保持稳定，功能开发在独立分支进行
- **多人协作**：不同开发者并行工作，合并时自动处理冲突
- **代码审查**：通过 Pull Request/Merge Request 机制审查代码

---

## 六、安全相关技术

### 26. 密码哈希（Werkzeug 提供）

**定义**：不把用户密码以明文形式存储在数据库中，而是存储经过哈希算法处理后的不可逆字符串。

**原理**：
```python
from werkzeug.security import generate_password_hash, check_password_hash

# 注册时：密码 "123456" 变成乱码存入数据库
hashed = generate_password_hash("123456")
# 存的是：pbkdf2:sha256:600000$abc123$def456...

# 登录时：验证用户输入的密码是否匹配
is_valid = check_password_hash(hashed, "123456")  # True
```

**为什么这样做**：即使数据库被黑客拖走，也无法反推出用户的原始密码。

---

### 27. CORS（跨域资源共享）

**定义**：浏览器的一种安全机制，限制一个源的网页向另一个源的服务器发起请求。

**为什么存在**：防止恶意网站冒充用户调用你的 API（CSRF 攻击）。

**怎么解决**：服务器在响应头中声明允许哪些源访问：
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

---

### 28. 参数化查询（SQLAlchemy 自动实现）

**定义**：把 SQL 语句和数据参数分开传递给数据库，数据库自动转义特殊字符。

**防止的攻击**：SQL 注入。如果用户输入 `' OR 1=1 --`，参数化查询会把它当成**纯文本**处理，而不是 SQL 代码执行。

---

## 七、监控与日志

### 29. Prometheus

**定义**：开源的系统监控和报警工具套件，核心是一个时序数据库。

**采集的指标**：
- 每秒请求数（QPS）
- 平均响应时间（P50/P95/P99）
- 错误率（4xx/5xx 占比）
- CPU / 内存 / 磁盘使用率

**工作方式**：应用暴露一个 `/metrics` 端点，Prometheus 定期拉取数据存储。

---

### 30. Grafana

**定义**：开源的数据可视化平台，把监控数据绘制成仪表盘。

**作用**：
- 折线图：响应时间趋势
- 柱状图：各接口请求量对比
- 饼图：错误类型分布
- 仪表盘：服务器资源使用率
- 报警：响应时间超过阈值时发邮件/钉钉通知

---

## 八、技术选型总览

| 需求场景 | 选用的技术 | 核心原因 |
|----------|-----------|----------|
| 网页要快、SEO 要好 | Next.js 14 + React 18 | SSR/SSG 支持，首屏快，搜索引擎友好 |
| 代码要稳定少 Bug | TypeScript 5.2 + Zod | 编译期类型检查，提前发现错误 |
| 样式开发要高效 | Tailwind CSS 3.3 + PostCSS/Autoprefixer | 原子化类名，自动加浏览器前缀 |
| 状态管理要简单 | Zustand 4.4 | 比 Redux 轻量 10 倍，无样板代码 |
| 服务端数据要管好 | React Query 3.39 + SWR 2.2 | 自动缓存、重试、去重、刷新 |
| HTTP 请求 | Axios 1.5 | 拦截器、自动转 JSON、请求取消 |
| 动画交互 | Framer Motion 10.16 | 声明式动画、GPU 加速 |
| 表单处理 | React Hook Form 7.47 + Zod 3.22 | 高性能表单、类型安全校验 |
| 图标资源 | Lucide React 0.288 | 风格统一、Tree Shaking、轻量 |
| 日期处理 | date-fns 2.30 | 函数式、不可变、TypeScript 原生支持 |
| 代码规范 | ESLint + Prettier | 统一风格、提前发现 Bug |
| 后端框架 | Flask 2.3 | 轻量、扩展丰富、Python 生态成熟 |
| 数据库操作 | SQLAlchemy 2.0 + Flask-SQLAlchemy 3.0 | ORM 防注入，自动会话管理 |
| 跨域支持 | Flask-CORS 4.0 | 简单配置解决浏览器同源策略限制 |
| 用户认证 | PyJWT 2.8 | 无状态 JWT，适合分布式部署 |
| 环境配置 | python-dotenv 1.0 | 敏感信息脱离代码，多环境灵活切换 |
| 安全工具 | Werkzeug 2.3 | 密码哈希、安全文件名、WSGI 基础 |
| 接口保护 | API 限流装饰器 | 防刷接口、保护第三方 API 额度 |
| 日志管理 | RotatingFileHandler | 日志自动轮转，防止磁盘占满 |
| 日志分析 | 结构化日志 | JSON 格式，配合 ELK/Grafana 高效检索 |
| 开发数据库 | SQLite | 零配置、单文件、快速启动 |
| 生产数据库 | MySQL 8.0 | 成熟稳定、支持高并发、主从复制 |
| 缓存加速 | Redis 7 | 内存存储、微秒级响应、自动过期 |
| AI 对话 | 智谱 GLM-4.6v / DeepSeek / Moonshot | 国产模型、中文优化、API 成熟 |
| AI 输出质量 | Prompt Engineering | 结构化 prompt 获取可解析结果 |
| 反向代理 | Nginx | SSL 终止、静态文件、负载均衡 |
| 容器化 | Docker + Docker Compose | 环境一致、一键部署、隔离依赖 |
| 生产服务器 | Waitress 3.0 | 多线程 WSGI，比 Flask 开发服务器安全 |
| 版本控制 | Git | 版本回溯、分支协作、Code Review |
| 密码安全 | Werkzeug 密码哈希 | 不可逆存储，防数据库泄露 |
| 防 SQL 注入 | SQLAlchemy 参数化查询 | 数据和 SQL 分离，自动转义 |
| 系统监控 | Prometheus 0.21 | 时序数据库，拉取式指标采集 |
| 可视化 | Grafana | 仪表盘、图表、告警通知 |

---

**文档维护**：本技术栈文档应随项目技术升级持续更新。
