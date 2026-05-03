# 智能旅游助手 —— 零基础技术学习完全指南

> 本文档从 `CLAUDE_PROJECT_GUIDE.md` 和 `TECH_STACK.md` 逐项提取技术名词，为每一项生成零基础学习卡片。
> 每张卡片包含：定义、项目用途（含代码位置）、30分钟速通核心概念、最小可运行示例、自测题。
>
> **共计 52 项技术**，按类别分为 7 组。

---

# 一、语言与运行时（3项）

---

### Python 3.9+

- **一句话定义**：语法简洁的解释型高级编程语言，本项目后端的主力语言。
- **在项目中的用途**：Flask Web 框架的业务逻辑代码、AI 服务调用、数据库 ORM 操作。后端代码量约 10,000+ 行 Python，集中在 `app.py`（单体核心应用）和 `ai-core/`（AI 模块）。
- **30分钟速通核心概念**：
  1. 变量是动态类型的：`x = 10` 后可以 `x = "hello"`，无需声明类型。
  2. 缩进即代码块：4 空格缩进定义 if/for/def 的作用域，不用 `{}`。
  3. 列表推导式：`[x*2 for x in range(10)]` 一行生成列表。
  4. 函数是一等公民：`def f(): pass` 后可赋值给变量、作为参数传递。
  5. `if __name__ == "__main__":` 是脚本入口点惯用写法。
- **最小代码示例**：

```python
# 在项目根目录运行：python3 -c "print('Hello Travel Assistant')"

# 列表推导式快速过滤
destinations = ["北京", "上海", "杭州", "成都"]
northern = [d for d in destinations if d in ("北京", "上海")]
print(northern)  # ['北京', '上海']

# 字典（项目中的数据载体）
trip = {"city": "杭州", "days": 3, "budget": 2000}
print(trip["city"])  # 杭州
```

- **自测题**：Python 中用哪个关键字定义一个函数？
  A) `function`　 B) `def`　 C) `fn`　 D) `func`

  **答案：B** — Python 使用 `def` 关键字定义函数，如 `def my_func():`。

---

### TypeScript 5.2

- **一句话定义**：JavaScript 的超集，添加了静态类型系统，写代码时就能捕获类型错误。
- **在项目中的用途**：前端所有 `.tsx` / `.ts` 文件的类型约束，定义数据类型接口（`src/types/index.ts:20-274`），确保用户、产品、行程、订单等对象结构正确。
- **30分钟速通核心概念**：
  1. 类型注解：`let name: string = "张三"` 声明变量类型。
  2. 接口（interface）：定义对象形状，见 `src/types/index.ts:20` 的 `User` 定义。
  3. 泛型：`apiClient<T>(...)` 让返回类型随调用而变（`src/lib/apiClient.ts:35`）。
  4. 联合类型：`'flight' | 'hotel' | 'ticket' | 'experience'` 限制值为有限选项。
  5. 类型推断：不写注解时，TS 自动推类型，减少样板代码。
- **最小代码示例**：

```typescript
// 项目中的类型定义（来自 src/types/index.ts:20-31）
export interface User {
  id: string
  phone: string
  email: string
  nickname: string
  avatar_url?: string       // ? 表示可选
  membership_level: number
  created_at: string
}

// 如果类型不匹配，IDE会直接标红
const user: User = { id: "1", phone: "138...", email: "a@b.com", nickname: "小明", membership_level: 1, created_at: "2026-01-01" }
```

- **自测题**：TypeScript 中 `interface User { avatar_url?: string }` 里 `?` 表示什么？
  A) 该字段必须填写　 B) 该字段可选　 C) 该字段的类型不确定　 D) 该字段不能填

  **答案：B** — `?` 表示该属性是可选的，可以不存在。

---

### Go (API 网关语言)

- **一句话定义**：Google 开发的静态编译型语言，以高并发和部署简单的单二进制文件著称。
- **在项目中的用途**：编写 API 网关服务 `backend/gateway/main.go`（请求路由 + 负载均衡），为未来微服务拆分做准备。
- **30分钟速通核心概念**：
  1. goroutine：`go func()` 启动轻量级并发任务。
  2. channel：goroutine 之间通信的管道。
  3. 多返回值（err 惯例）：`data, err := doSomething()`。
  4. struct 代替 class：Go 没有类，用 struct + 方法。
  5. `defer`：函数退出前执行，常用于关闭文件/连接。
- **最小代码示例**：

```go
// 项目中的网关入口（简化自 backend/gateway/main.go:47）
package main

import "github.com/gin-gonic/gin"

func main() {
    r := gin.Default()          // 创建路由引擎
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })
    r.Run(":8080")              // 监听 8080 端口
}
```

- **自测题**：Go 中启动一个并发任务使用什么关键字？
  A) `async`　 B) `go`　 C) `yield`　 D) `spawn`

  **答案：B** — `go funcName()` 启动一个新 goroutine 并发执行。

---

# 二、前端技术（16项）

---

### Next.js 14

- **一句话定义**：React 的增强版框架，内置服务端渲染(SSR)、静态生成(SSG)、文件系统路由。
- **在项目中的用途**：构建用户端前端应用，位于 `frontend/user-web/`，36 个页面，利用 SSR 让首屏快速加载、SEO 友好。路由代理配置在 `frontend/user-web/next.config.js:13-36`。
- **30分钟速通核心概念**：
  1. App Router：`src/app/` 目录下每个文件夹 = 一个路由，`page.tsx` 是该路由的页面。
  2. 服务端组件 vs 客户端组件：默认服务端渲染，加 `'use client'` 声明客户端交互。
  3. `layout.tsx`：包裹所有子页面的根布局（`src/app/layout.tsx:48-75`）。
  4. `rewrites()`：开发时将 `/api/*` 请求代理到后端 Flask（`next.config.js:13-36`）。
  5. `metadata`：导出对象配置 SEO 标题、描述、OpenGraph（`src/app/layout.tsx:7-38`）。
- **最小代码示例**：

```tsx
// 来自 src/app/layout.tsx:48-75 的根布局
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="bg-wave-1" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
```

- **自测题**：Next.js 14 中 `page.tsx` 的作用是什么？
  A) 定义全局样式　 B) 定义一个页面路由　 C) 定义数据库模型　 D) 定义 API 接口

  **答案：B** — 每个 `page.tsx` 文件定义了其所在文件夹对应 URL 路径的页面。

---

### React 18

- **一句话定义**：Meta 开发的用于构建用户界面的 JavaScript 库，采用组件化 + 虚拟 DOM。
- **在项目中的用途**：前端所有 UI 组件的基础框架。`src/components/DestinationCard.tsx:89` 使用 `useState` 管理加载状态，`src/hooks/useSWR.ts:42` 使用 `useEffect` 管理副作用。
- **30分钟速通核心概念**：
  1. 组件：函数返回 JSX，如 `function Card() { return <div>...</div> }`。
  2. `useState`：`const [count, setCount] = useState(0)` 在函数组件中持有状态。
  3. `useEffect`：`useEffect(() => { fetchData() }, [])` 在渲染后执行副作用。
  4. 单向数据流：数据从父组件通过 props 向下传递。
  5. `'use client'`：Next.js 中声明此组件需要浏览器交互。
- **最小代码示例**：

```tsx
// 来自 src/components/DestinationCard.tsx:89
'use client'
import { useState } from 'react'

export function DestinationCard() {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // imgLoaded 为 true 时显示图片，否则显示骨架屏
  return imgLoaded
    ? <img src="travel.jpg" alt="风景" />
    : <div className="animate-pulse">加载中...</div>
}
```

- **自测题**：React 中 `useState(false)` 返回的第二个元素（如 `setImgLoaded`）是什么？
  A) 当前状态值　 B) 更新状态的函数　 C) 组件的 props　 D) 一个 HTML 元素

  **答案：B** — 调用 `setImgLoaded(true)` 将状态设为 `true` 并触发重新渲染。

---

### Tailwind CSS 3.3

- **一句话定义**：原子化 CSS 框架，用预置工具类直接在 HTML/JSX 上组合样式，无需写 CSS 文件。
- **在项目中的用途**：前端所有组件的样式系统。`src/components/DestinationCard.tsx:114` 的 `rounded-2xl border bg-card shadow-sm` 就是一次性堆砌了圆角、边框、背景、阴影。
- **30分钟速通核心概念**：
  1. 工具类即样式：`px-4` = padding-left: 1rem + padding-right: 1rem。
  2. 响应式前缀：`sm:flex md:grid lg:hidden` 在不同屏幕宽度下应用不同样式。
  3. 暗色模式：`dark:bg-gray-900` 在暗色模式下生效。
  4. 伪类变体：`hover:bg-blue-600` 鼠标悬停时变色。
  5. PurgeCSS：构建时自动删除没用到的类，最终 CSS 约 10KB。
- **最小代码示例**：

```html
<!-- 来自 src/components/DestinationCard.tsx:114 -->
<div class="h-full rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
  <div class="text-white font-bold text-base line-clamp-2">北京故宫</div>
  <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]">5A景区</span>
</div>
```

- **自测题**：Tailwind CSS 中 `md:flex` 表示什么？
  A) 中等字体下使用弹性布局　 B) 中等以上屏幕使用弹性布局　 C) 使用中间对齐的 flex　 D) 媒体查询不可用时采用 flex

  **答案：B** — `md:` 前缀表示在 `min-width: 768px` 及以上的屏幕应用该样式。

---

### Zustand 4.4

- **一句话定义**：React 的轻量级状态管理库，几行代码创建全局状态仓库，无需 Provider 包裹。
- **在项目中的用途**：管理用户认证状态（`useUserStore`）、购物车（`useCartStore`）、UI 状态（`useUIStore`），全部定义在 `src/store/index.ts:13-317`。
- **30分钟速通核心概念**：
  1. `create()`：一行创建 store，接收 `(set, get) => ({ state, actions })`。
  2. 直接调用：组件内 `const { user, login } = useUserStore()` 即可读写。
  3. `persist` 中间件：自动同步到 localStorage（`src/store/index.ts:50-129`）。
  4. 无需 Provider：与 Redux 不同，不需要在根组件包裹 `<Provider>`。
  5. 选择性订阅：组件只订阅用到的字段，减少不必要的重渲染。
- **最小代码示例**：

```typescript
// 来自 src/store/index.ts:50-129 的简化版
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        set({ user: null, isAuthenticated: false })
        localStorage.removeItem('auth_token')
      },
    }),
    { name: 'user-storage' }  // localStorage 键名
  )
)
```

- **自测题**：Zustand 相比 Redux 的主要优势是什么？
  A) 性能更好　 B) 不需要 Provider，样板代码更少　 C) 只支持 React 18　 D) 需要安装额外的中间件

  **答案：B** — Zustand 的核心卖点是极简 API + 不需要 Provider 包裹组件树。

---

### React Query (TanStack Query) 3.39

- **一句话定义**：专门管理服务端数据获取、缓存、自动重取、请求去重的库。
- **在项目中的用途**：管理所有 API 数据的缓存和状态，配合 Axios 使用。项目中另有自定义 `useSWR` hook（`src/hooks/useSWR.ts:27-156`）实现类似理念。
- **30分钟速通核心概念**：
  1. `useQuery({ queryKey, queryFn })`：按 key 缓存请求结果。
  2. `staleTime`：数据多久后视为"过期"需要重新请求。
  3. `isLoading` / `isError`：返回加载和错误状态，无需手动管理。
  4. 请求去重：同一时间多个组件要同一数据，只发一次请求。
  5. 窗口聚焦自动刷新：用户切回页面自动重新获取。
- **最小代码示例**：

```typescript
// 项目中 useSWR 实现了类似理念（src/hooks/useSWR.ts:27-156）
// 使用方式简化为：
const { data, isLoading, error } = useSWR('/api/destinations?city=北京', defaultFetcher)
if (isLoading) return <div>加载中...</div>
if (error) return <div>出错了</div>
return <div>{data.destinations.length} 个景点</div>
```

- **自测题**：`queryKey` 在 React Query 中的作用是什么？
  A) 作为 API 的密码　 B) 作为缓存数据的唯一标识　 C) 作为请求的加密密钥　 D) 控制组件重新渲染

  **答案：B** — `queryKey` 是缓存数据的键，相同 key 共享同一份缓存数据。

---

### SWR 2.2

- **一句话定义**：Vercel 开发的轻量数据获取库，理念是"先返回缓存(stale)，后台验证并更新(revalidate)"。
- **在项目中的用途**：项目自定义实现了 SWR 模式（`src/hooks/useSWR.ts:27-156`），支持去重、内存缓存、页面聚焦刷新、网络重连刷新。
- **30分钟速通核心概念**：
  1. stale-while-revalidate：先给用户看旧数据，后台静默更新。
  2. 去重：`dedupingInterval` 内相同 key 不发重复请求（`src/hooks/useSWR.ts:58`）。
  3. 自动重取：聚焦页面、网络恢复时自动刷新。
  4. 内存缓存：`Map<string, {data, timestamp}>` 实现浏览器端缓存。
  5. `mutate()`：手动清除缓存并重新获取。
- **最小代码示例**：

```typescript
// 来自 src/hooks/useSWR.ts:27-31
export function useSWR<T>(key: string | null, fetcher?: Fetcher<T>, options: SWROptions = {}) {
  const [state, setState] = useState<SWRState<T>>({
    data: null, error: null, isLoading: key !== null, isValidating: false,
  })
  // ... 自动缓存、去重、刷新逻辑
  return { ...state, mutate }
}
```

- **自测题**：SWR 全称 stale-while-revalidate 中的 stale 是什么意思？
  A) 数据已经损坏　 B) 数据可能不是最新的但仍可用　 C) 数据已经过期必须丢弃　 D) 数据是加密的

  **答案：B** — stale 指缓存数据可能已过期，但仍然"可用"地展示给用户。

---

### Axios 1.5

- **一句话定义**：基于 Promise 的 HTTP 客户端库，比原生 `fetch` 多了拦截器、自动 JSON 转换、超时控制。
- **在项目中的用途**：前端的统一 API 客户端 `src/lib/api.ts:26-278`，封装了用户、景点、行程、AI对话等所有后端 API 调用。请求拦截器自动加 JWT Token（第 53 行），响应拦截器处理 401 跳转（第 69 行）。
- **30分钟速通核心概念**：
  1. 实例创建：`axios.create({ baseURL, timeout })`。
  2. 请求拦截器：在请求发出前修改 config，如添加 Authorization 头。
  3. 响应拦截器：统一处理错误码。
  4. 自动 JSON 解析：不需要 `res.json()`。
  5. 请求取消：`AbortController` 信号。
- **最小代码示例**：

```typescript
// 来自 src/lib/api.ts:43-81 的简化版
import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://127.0.0.1:5001',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：自动加 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 调用
api.get('/api/destinations', { params: { city: '北京' } })
```

- **自测题**：Axios 的请求拦截器在什么时机执行？
  A) 请求响应后　 B) 请求发送前　 C) 页面加载时　 D) 组件卸载时

  **答案：B** — 请求拦截器在请求真正发出去之前执行，用于修改请求配置。

---

### Framer Motion 10

- **一句话定义**：React 的声明式动画库，用组件描述动画的初始/目标/过渡状态。
- **在项目中的用途**：为页面元素添加进场动画、布局切换动画，提升用户交互体验。
- **30分钟速通核心概念**：
  1. `<motion.div>`：支持动画的 div 组件。
  2. `initial` / `animate`：定义起始和结束状态。
  3. `transition`：控制动画时长、缓动函数。
  4. `variants`：预定义多状态动画配置，复用。
  5. `AnimatePresence`：组件退出时播放动画。
- **最小代码示例**：

```tsx
import { motion } from 'framer-motion'

// 元素从下方滑入
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  欢迎使用智能旅行助手
</motion.div>
```

- **自测题**：`initial={{ opacity: 0 }}` 中 opacity 的作用是什么？
  A) 设置动画速度　 B) 设置元素初始透明度为 0（不可见）　 C) 设置元素为不可点击　 D) 删除元素

  **答案：B** — `opacity: 0` 让元素初始完全透明，动画目标是变为 `opacity: 1`（完全可见）。

---

### React Hook Form 7.47

- **一句话定义**：高性能表单库，采用非受控组件思想，减少不必要的重渲染。
- **在项目中的用途**：配合 Zod 实现登录/注册/行程创建等表单的输入管理与校验。
- **30分钟速通核心概念**：
  1. `useForm()`：创建表单实例，返回 `register`, `handleSubmit`, `formState`。
  2. `register("email")`：将输入框绑定到表单字段。
  3. 非受控：不通过 useState 控制每个输入，性能好。
  4. `formState.errors`：校验失败时自动填充错误信息。
  5. `resolver: zodResolver(schema)`：用 Zod 做校验规则。
- **最小代码示例**：

```tsx
import { useForm } from 'react-hook-form'

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm()

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register('email', { required: '邮箱必填' })} />
      {errors.email && <span>{errors.email.message}</span>}
      <button type="submit">登录</button>
    </form>
  )
}
```

- **自测题**：React Hook Form 中 `register` 函数的作用是什么？
  A) 注册一个新用户　 B) 将表单字段绑定到 React Hook Form 的管理系统　 C) 创建 API 路由　 D) 注册服务端中间件

  **答案：B** — `register("fieldName")` 将该 input 与表单管理系统关联。

---

### Zod 3.22

- **一句话定义**：TypeScript 优先的数据校验库，用链式 API 定义规则，同时自动推导 TypeScript 类型。
- **在项目中的用途**：前端表单校验（配合 React Hook Form），后端数据合法性检查。
- **30分钟速通核心概念**：
  1. `z.object({...})`：定义对象结构规则。
  2. 链式校验：`z.string().email().min(1)` 一条链写完多个规则。
  3. 类型推导：`type FormData = z.infer<typeof schema>` 自动生成 TS 类型。
  4. 错误消息：`.email('请输入有效邮箱')` 自定义错误文案。
  5. `.refine()`：自定义复杂校验逻辑。
- **最小代码示例**：

```typescript
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱'),
  password: z.string().min(6, '密码至少 6 位'),
})

type LoginData = z.infer<typeof loginSchema>
// LoginData = { email: string, password: string }

// 校验
const result = loginSchema.safeParse({ email: 'a@b.com', password: '123456' })
if (result.success) {
  console.log('校验通过', result.data)
}
```

- **自测题**：`z.infer<typeof schema>` 返回什么？
  A) 校验函数　 B) 错误信息　 C) 校验规则对应的 TypeScript 类型　 D) 校验结果

  **答案：C** — `z.infer` 从 Zod schema 推导出对应的 TypeScript 接口类型。

---

### date-fns 2.30

- **一句话定义**：现代化的 JavaScript 日期处理库，函数式风格，支持 Tree Shaking。
- **在项目中的用途**：格式化行程日期、计算天数差、国际化日期展示。
- **30分钟速通核心概念**：
  1. `format(date, 'yyyy-MM-dd')`：按格式输出日期字符串。
  2. `addDays(date, 7)`：日期 +7 天，返回新对象，不修改原日期（不可变）。
  3. `differenceInDays(end, start)`：计算相差天数。
  4. 按需导入：`import { format } from 'date-fns'` 只打包用到的函数。
  5. 国际化：`import { zhCN } from 'date-fns/locale'` 支持中文格式。
- **最小代码示例**：

```typescript
import { format, addDays, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const today = new Date()
const tripStart = addDays(today, 3)

console.log(format(tripStart, 'yyyy年MM月dd日', { locale: zhCN }))
// "2026年05月01日"

const daysLeft = differenceInDays(tripStart, today)
console.log(`距离出发还有 ${daysLeft} 天`)
```

- **自測题**：`addDays(date, 3)` 会修改原来的 `date` 对象吗？
  A) 会　 B) 不会，返回新对象　 C) 取决于参数　 D) 只在浏览器中会

  **答案：B** — date-fns 的函数是不可变的(mutable-free)，始终返回新 Date 对象。

---

### Lucide React 0.288

- **一句话定义**：开源 SVG 图标库，提供 1000+ 个简洁一致的图标，React 封装版。
- **在项目中的用途**：前端所有图标元素的来源。`src/components/DestinationCard.tsx:21` 导入了 `MapPin`、`Star`，用于显示地图标记和评分星标。
- **30分钟速通核心概念**：
  1. 按需导入：`import { MapPin, Heart, Star } from 'lucide-react'`。
  2. 即 SVG 组件：`<MapPin size={20} color="#3b82f6" />`。
  3. Tree Shaking：没导入的图标不打包，体积小。
  4. 风格统一：所有图标来自同一设计体系。
  5. 支持 stroke/fill/className 自定义。
- **最小代码示例**：

```tsx
// 来自 src/components/DestinationCard.tsx:21,146,154
import { MapPin, Star } from 'lucide-react'

<MapPin className="h-3.5 w-3.5 shrink-0" />
<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
```

- **自测题**：Lucide React 中 `size={20}` 设置的是什么？
  A) 图标文件大小（KB）　 B) 图标的宽高像素值　 C) 图标在 DOM 中的渲染次数　 D) 图标的颜色深度

  **答案：B** — `size` 同时设置 SVG 的 `width` 和 `height` 为 20px。

---

### PostCSS & Autoprefixer

- **一句话定义**：PostCSS 是 CSS 后处理工具（用 JS 插件处理 CSS），Autoprefixer 是其最常用插件，自动加浏览器前缀。
- **在项目中的用途**：Tailwind CSS 底层依赖 PostCSS 进行构建；Autoprefixer 确保生成的样式兼容各浏览器。
- **30分钟速通核心概念**：
  1. CSS → PostCSS → 转换后的 CSS（构建流水线）。
  2. Autoprefixer：自动加 `-webkit-`、`-moz-` 等前缀。
  3. 基于 browserslist：在 `package.json` 中 `"browserslist"` 指定目标浏览器。
  4. Tailwind 作为 PostCSS 插件运行。
  5. 还可配合 cssnano 压缩 CSS。
- **最小代码示例**：

```css
/* 你写的 CSS */
.card {
  user-select: none;
}

/* Autoprefixer 自动输出 */
.card {
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
```

- **自測题**：Autoprefixer 解决了什么问题？
  A) 压缩 CSS 体积　 B) 自动添加浏览器厂商前缀　 C) 将 Less 编译为 CSS　 D) 给 CSS 添加类型检查

  **答案：B** — 不同浏览器对同一新特性可能有不同前缀，Autoprefixer 根据 browserslist 自动补齐。

---

### ESLint & Prettier

- **一句话定义**：ESLint 检查代码质量和潜在 Bug，Prettier 统一代码格式（缩进、引号、分号等）。
- **在项目中的用途**：保证全团队代码风格一致，在 CI/CD 中自动检查，减少 Code Review 中的低级争议。
- **30分钟速通核心概念**：
  1. ESLint 关注代码"对错"：未使用变量、类型错误、危险模式。
  2. Prettier 关注代码"美丑"：缩进 = 2 空格、单引号还是双引号、要不要分号。
  3. 两者可配合：`eslint-config-prettier` 让 ESLint 不与 Prettier 冲突。
  4. IDE 集成：保存时自动格式化。
  5. 配置文件：`.eslintrc.json` + `.prettierrc`。
- **最小代码示例**：

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

- **自測题**：ESLint 和 Prettier 的分工是什么？
  A) 都做代码格式化　 B) ESLint 查 Bug，Prettier 管格式　 C) ESLint 管格式，Prettier 查 Bug　 D) 完全相同，可互相替代

  **答案：B** — ESLint 侧重代码正确性，Prettier 侧重代码美观性。

---

# 三、后端技术（8项）

---

### Flask 2.3

- **一句话定义**：Python 的轻量级 Web 框架，核心极简，通过扩展插件实现各种功能。
- **在项目中的用途**：整个后端核心，`app.py`（~4000+行）包含 60+ API 端点。路由定义了 20 个功能模块（用户、景点、行程、AI 对话等）。`@app.route('/api/users/login', methods=['POST'])` 在 `app.py:492`。
- **30分钟速通核心概念**：
  1. `@app.route('/path', methods=['GET'])`：把 URL 绑定到函数（`app.py:1015`）。
  2. `request.get_json()`：从请求体提取 JSON 数据。
  3. `jsonify({'success': True})`：返回 JSON 响应。
  4. 装饰器模式：`@rate_limit`、`@cache_response` 不改变函数签名但增加功能。
  5. 蓝图（Blueprint）：大型应用将路由按模块拆分。
- **最小代码示例**：

```python
# 来自 app.py:492-501 的登录路由
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/users/login', methods=['POST'])
def api_user_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    # ... 验证逻辑
    return jsonify({"success": True, "token": "..."})
```

- **自测题**：Flask 的 `@app.route` 装饰器的作用是什么？
  A) 定义数据库表结构　 B) 将 URL 路径绑定到 Python 函数　 C) 添加 CSS 样式　 D) 配置日志输出

  **答案：B** — 当用户访问该 URL 时，Flask 调用绑定的函数处理请求并返回响应。

---

### SQLAlchemy 2.0

- **一句话定义**：Python 最成熟的 ORM（对象关系映射）库，把数据库表映射为 Python 类，用 Python 代码代替手写 SQL。
- **在项目中的用途**：定义数据模型类（User、Destination、Trip 等），执行查询操作。`app.py:1045` 的 `Destination.query` 是 ORM 查询的典型用法。
- **30分钟速通核心概念**：
  1. 模型映射：一个类 = 一张表，一个属性 = 一列，一个实例 = 一行。
  2. 查询链：`.filter().order_by().paginate()` 链式构建查询。
  3. 参数化查询自动防 SQL 注入。
  4. `relationship()`：定义表间关联（一对多、多对多）。
  5. `db.session.commit()`：提交事务。
- **最小代码示例**：

```python
# 来自 app.py:1045-1092 的简化查询
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()

class Destination(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200))
    city = db.Column(db.String(100))
    rating = db.Column(db.Float)

# 查询：北京评分 > 4.5 的景点，按评分降序
results = Destination.query \
    .filter(Destination.city.ilike('%北京%')) \
    .filter(Destination.rating >= 4.5) \
    .order_by(Destination.rating.desc()) \
    .all()
```

- **自测题**：SQLAlchemy ORM 中 `db.session.commit()` 的作用是什么？
  A) 开始一个新查询　 B) 将内存中的修改持久化到数据库　 C) 回滚所有修改　 D) 关闭数据库连接

  **答案：B** — `commit()` 将本次数据库会话的所有修改写入数据库，使之永久生效。

---

### Flask-SQLAlchemy 3.0

- **一句话定义**：SQLAlchemy 的 Flask 集成扩展，自动处理与 Flask 请求生命周期的绑定。
- **在项目中的用途**：`extensions.py:16-20` 创建全局 `db` 实例；`app.py` 中所有模型继承 `db.Model`（如 `class User(db.Model)`）。
- **30分钟速通核心概念**：
  1. `db.Model`：数据模型的基类。
  2. 自动会话管理：请求开始时打开会话，请求结束时自动提交/回滚。
  3. `db.create_all()`：根据模型定义自动创建所有表。
  4. 读取 Flask 配置中的 `SQLALCHEMY_DATABASE_URI`。
  5. 避免循环导入：单独的扩展模块（`extensions.py`）。
- **最小代码示例**：

```python
# 来自 extensions.py:16-20
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()

# 在 app.py 中
from extensions import db
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///travel.db'
db.init_app(app)  # 绑定到 Flask 应用
```

- **自测题**：Flask-SQLAlchemy 比裸 SQLAlchemy 多了什么？
  A) 数据库驱动　 B) 与 Flask 请求生命周期的自动绑定 + db.Model 基类　 C) SQL 语法解析　 D) 图形化管理界面

  **答案：B** — 它封装了 Flask 集成，提供 `db.Model`、自动会话管理等功能。

---

### Flask-CORS 4.0

- **一句话定义**：Flask 的跨域资源共享中间件，解决浏览器同源策略阻止前端访问后端的问题。
- **在项目中的用途**：允许运行在 `localhost:3000`（Next.js）的前端页面，向 `localhost:5001`（Flask）发送 API 请求。`app.py:10` 导入并在第 ~280 行附近初始化。
- **30分钟速通核心概念**：
  1. 同源策略：协议 + 域名 + 端口都相同才是同源。
  2. CORS 响应头：`Access-Control-Allow-Origin` 告诉浏览器允许哪些源。
  3. 预检请求（OPTIONS）：复杂请求（PUT/DELETE/含自定义头）先发 OPTIONS 询问。
  4. `CORS(app, origins=['http://localhost:3000'])`：一行配置。
  5. 安全：不要用 `origins='*'` 配合 `credentials=True`。
- **最小代码示例**：

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})
```

- **自测题**：浏览器为什么要限制跨域请求？
  A) 为了性能优化　 B) 防止恶意网站冒充用户调用 API（CSRF 攻击）　 C) 为了减少网络流量　 D) 只允许 HTTPS 请求

  **答案：B** — 同源策略是一种重要的浏览器安全机制，阻止恶意网站借用户已登录的身份攻击其他网站。

---

### PyJWT 2.8

- **一句话定义**：JWT（JSON Web Token）的 Python 实现库，用于签发和校验身份令牌。
- **在项目中的用途**：用户认证体系的核心。`_issue_jwt()` 函数（`app.py:389-398`）在登录时生成令牌，`_current_user_or_401()` 函数（`app.py:401-433`）验证令牌。
- **30分钟速通核心概念**：
  1. JWT 三段式：`Header.Payload.Signature`，用 `.` 分隔。
  2. `jwt.encode(payload, key, algorithm='HS256')`：生成令牌。
  3. `jwt.decode(token, key, algorithms=['HS256'])`：验证并解析令牌。
  4. `exp` 字段：令牌过期时间（`app.py:394`，设为 7 天）。
  5. 无状态：服务器不存 Session，凭令牌判断身份。
- **最小代码示例**：

```python
# 来自 app.py:389-398
import jwt
from datetime import datetime, timedelta

def _issue_jwt(user_id: int) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, 'secret-key', algorithm='HS256')

# 验证
token = _issue_jwt(1)
payload = jwt.decode(token, 'secret-key', algorithms=['HS256'])
print(payload['user_id'])  # 1
```

- **自测题**：JWT 由哪三部分组成（用 `.` 分隔）？
  A) Header.Data.Signature　 B) Header.Payload.Signature　 C) Type.Data.Key　 D) Algorithm.User.Expire

  **答案：B** — JWT 的标准结构为 `xxxxx.yyyyy.zzzzz`，对应 Header / Payload / Signature。

---

### python-dotenv 1.0

- **一句话定义**：从 `.env` 文件加载环境变量到 Python 的 `os.environ`。
- **在项目中的用途**：`app.py:16` 导入，`app.py:44` 调用 `load_dotenv()`，从 `.env` 文件加载 `SECRET_KEY`、`DATABASE_URI`、AI API 密钥等敏感配置。
- **30分钟速通核心概念**：
  1. `.env` 文件：`KEY=VALUE` 格式的纯文本文件。
  2. `load_dotenv()`：调用后环境变量立即可用。
  3. `os.getenv('KEY', 'default')`：读取环境变量，不存在则返回默认值。
  4. 不提交 .env 到 Git（加入 `.gitignore`）。
  5. 分离代码与配置：同一份代码，不同服务器不同 .env。
- **最小代码示例**：

```python
# .env 文件内容：
# SECRET_KEY=my-super-secret
# DATABASE_URI=sqlite:///travel.db

from dotenv import load_dotenv
import os

load_dotenv()
print(os.getenv('SECRET_KEY'))      # my-super-secret
print(os.getenv('DB_HOST', 'localhost'))  # localhost（使用默认值）
```

- **自测题**：`.env` 文件应该如何处理？
  A) 提交到 Git 仓库　 B) 加入 `.gitignore`，不提交到仓库　 C) 加密后提交　 D) 删除掉不用

  **答案：B** — `.env` 包含密钥等敏感信息，不应提交到代码仓库。团队成员各自维护自己的 `.env`。

---

### Werkzeug 2.3

- **一句话定义**：Flask 的底层 WSGI 工具库，提供密码哈希、HTTP 处理、安全文件操作等。
- **在项目中的用途**：密码哈希函数 `generate_password_hash` / `check_password_hash`（`app.py:30,520`），WSGI 代理修复 `ProxyFix`（`app.py:28`）。
- **30分钟速通核心概念**：
  1. `generate_password_hash(password)`：将明文密码转为不可逆哈希串。
  2. `check_password_hash(hash, password)`：校验密码是否匹配。
  3. PBKDF2+SHA256：默认哈希算法，迭代 60 万次。
  4. `ProxyFix`：在 Nginx 反向代理后修正 `request.remote_addr`。
  5. WSGI：Python Web 应用与 Web 服务器之间的标准接口。
- **最小代码示例**：

```python
from werkzeug.security import generate_password_hash, check_password_hash

hash_value = generate_password_hash('mypassword123')
# 产出类似：pbkdf2:sha256:600000$xxxx$yyyy

is_match = check_password_hash(hash_value, 'mypassword123')  # True
is_wrong = check_password_hash(hash_value, 'wrongpassword')  # False
```

- **自测题**：为什么不用明文存储密码，而用 Werkzeug 的哈希？
  A) 为了节省数据库空间　 B) 即使数据库被攻击者获取，也无法反推出原始密码　 C) 为了方便搜索用户名　 D) 为了提高查询速度

  **答案：B** — 密码哈希是单向不可逆的，泄露数据库不会泄露用户实际密码。

---

### Waitress 3.0

- **一句话定义**：纯 Python 编写的 WSGI 生产服务器，多线程处理并发请求。
- **在项目中的用途**：替代 Flask 内置开发服务器（`app.run()`），用于生产环境部署。
- **30分钟速通核心概念**：
  1. Flask 内置服务器是单线程的，一次只能处理一个请求。
  2. Waitress 支持多线程并发。
  3. 跨平台（Windows + Linux 都能跑，Gunicorn 只能 Linux）。
  4. 简单启动：`waitress-serve --port=5001 app:app`。
  5. 不依赖额外库，安装即用。
- **最小代码示例**：

```python
from waitress import serve
from app import app

serve(app, host='0.0.0.0', port=5001, threads=4)
```

- **自测题**：为什么不能用 Flask 自带的 `app.run()` 做生产部署？
  A) 太慢了　 B) 单线程无法处理并发请求，且存在安全漏洞　 C) 只能用 SQLite　 D) 不支持路由

  **答案：B** — Flask 开发服务器是单线程的且有已知安全问题，官方明确声明不适用于生产环境。

---

# 四、数据与缓存（5项）

---

### SQLite

- **一句话定义**：嵌入式关系型数据库，整个数据库就是一个 `.db` 文件，零配置。
- **在项目中的用途**：开发环境的默认数据库。`app.py` 中通过 `SQLALCHEMY_DATABASE_URI = 'sqlite:///travel.db'` 配置。
- **30分钟速通核心概念**：
  1. 零配置：不需要安装、启动、配置用户和权限。
  2. 单文件：备份 = 复制 `.db` 文件。
  3. 支持标准 SQL 和事务。
  4. 文件级锁：写入时整个库上锁，不适合高并发。
  5. 适用场景：开发测试、嵌入式应用、单用户桌面程序。
- **最小代码示例**：

```python
import sqlite3

conn = sqlite3.connect('travel.db')
cursor = conn.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS destinations (id INTEGER, name TEXT)")
cursor.execute("INSERT INTO destinations VALUES (1, '北京故宫')")
conn.commit()
cursor.execute("SELECT * FROM destinations")
print(cursor.fetchall())  # [(1, '北京故宫')]
conn.close()
```

- **自测题**：SQLite 和 MySQL 最主要的结构性区别是什么？
  A) SQLite 不支持 SQL　 B) SQLite 是嵌入式的文件数据库，不需要独立服务器进程　 C) SQLite 只支持 Python　 D) SQLite 不能建索引

  **答案：B** — SQLite 是一个嵌入式的、单文件的数据库，不需要独立的数据库服务器。

---

### MySQL 8.0

- **一句话定义**：最流行的开源关系型数据库（RDBMS），支持 ACID 事务、主从复制、JSON 类型。
- **在项目中的用途**：生产环境的数据库。数据库架构定义在 `database/schema/schema.sql`（包含 15 张核心表）。Docker Compose 中通过 `deployment/docker/docker-compose.yml:4-18` 部署。
- **30分钟速通核心概念**：
  1. ACID 事务：保证数据操作的原子性、一致性、隔离性、持久性。
  2. InnoDB 引擎：支持行级锁、外键、崩溃恢复。
  3. 主从复制：写主库、读从库，分担压力。
  4. JSON 字段：`location JSON` 存储半结构化数据（`schema.sql:32`）。
  5. 连接字符串格式：`mysql+pymysql://user:pass@host:3306/dbname`。
- **最小代码示例**：

```sql
-- 来自 database/schema/schema.sql:3-18 的简化版
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    nickname VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    membership_level TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- **自测题**：MySQL 的 InnoDB 引擎支持什么锁级别？
  A) 库级锁　 B) 表级锁　 C) 行级锁　 D) 列级锁

  **答案：C** — InnoDB 支持行级锁，允许不同事务同时修改表中的不同行。

---

### Redis 7

- **一句话定义**：内存键值数据库，所有数据存储在内存中，读写速度可达微秒级。
- **在项目中的用途**：缓存（景点列表缓存 5 分钟）、限流（滑动窗口计数）、排行榜（收藏/浏览排行）。连接配置在 `app.py:67-108`，延迟初始化模式：首次使用才连接。
- **30分钟速通核心概念**：
  1. 五种数据结构：String / Hash / List / Set / Sorted Set。
  2. TTL（自动过期）：`SETEX key 300 value` 5 分钟后自动删除。
  3. 用作缓存：先查 Redis，命中直接返回，未命中查 MySQL 后写回 Redis。
  4. 微秒级延迟：内存操作，比磁盘数据库快 1000+ 倍。
  5. Sorted Set 实现排行榜：分数排名、范围查询。
- **最小代码示例**：

```python
# 来自 app.py:81-92 的 Redis 连接（简化版）
import redis
import os

r = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', '6379')),
    decode_responses=True,
    socket_connect_timeout=0.5,
)

r.setex('cache:destinations:beijing', 300, '{"results": [...]}')
cached = r.get('cache:destinations:beijing')
print(cached)  # {"results": [...]}
```

- **自测题**：Redis 中 `SETEX key 300 value` 的 `300` 表示什么？
  A) 值的大小限制 300 字节　 B) 300 秒后自动过期（TTL）　 C) 最多存储 300 条这样的记录　 D) 值被压缩了 300 倍

  **答案：B** — `SETEX` 的第二个参数是过期时间（秒），300 = 5 分钟。

---

### Elasticsearch 8.8

- **一句话定义**：分布式全文搜索引擎，基于 Lucene，支持海量数据的实时搜索和分析。
- **在项目中的用途**：景点和产品的全文搜索（通过 Docker Compose 部署，`deployment/docker/docker-compose.yml:34-47`），为"全局搜索"功能提供底层支持。
- **30分钟速通核心概念**：
  1. 全文搜索：不是简单的 `LIKE`，支持分词、模糊匹配、相关性评分。
  2. 倒排索引：核心数据结构，词→文档的映射。
  3. RESTful API：所有操作通过 HTTP 请求完成。
  4. 近实时：数据写入后约 1 秒可搜索到。
  5. 聚合分析：类似 SQL 的 GROUP BY，做数据统计。
- **最小代码示例**：

```json
// 在 Docker Compose 中部署（deployment/docker/docker-compose.yml:34-47）
{
  "image": "elasticsearch:8.8.0",
  "environment": {
    "discovery.type": "single-node",
    "xpack.security.enabled": "false"
  },
  "ports": ["9200:9200"]
}
```

- **自测题**：Elasticsearch 的核心索引结构是什么？
  A) B+树　 B) 倒排索引　 C) 哈希表　 D) 红黑树

  **答案：B** — 倒排索引通过词快速找到包含该词的所有文档，是全文搜索的基础。

---

### Milvus（向量数据库）

- **一句话定义**：开源向量数据库，专门存储和检索高维向量（Embedding），用于相似度搜索。
- **在项目中的用途**：AI 模块的向量存储（`deployment/docker/docker-compose.yml:49-60`），存储景点的文本向量嵌入，支持语义相似搜索。
- **30分钟速通核心概念**：
  1. 向量嵌入（Embedding）：把文本转为固定长度的数值向量。
  2. 相似度检索：不是精确匹配，而是找"意思最近"的向量。
  3. 余弦相似度 / 欧氏距离：常用的向量相似度量方式。
  4. ANN（近似最近邻）：牺牲少量精度换取极快搜索速度。
  5. 应用场景：语义搜索、推荐系统、图像检索。
- **最小代码示例**：

```yaml
# 来自 deployment/docker/docker-compose.yml:49-60
milvus:
  image: milvusdb/milvus:v2.3.0
  container_name: travel-assistant-milvus
  ports:
    - "19530:19530"
```

- **自测题**：向量数据库主要用于什么类型的查询？
  A) 精确的主键查询　 B) 相似度搜索（找语义上最近似的记录）　 C) 事务处理　 D) 日志顺序读取

  **答案：B** — 向量数据库的核心能力是根据向量之间的相似度找"最接近"的若干条记录。

---

# 五、AI 与大模型（5项）

---

### 大语言模型（LLM）：GLM-4.6v（智谱）

- **一句话定义**：智谱 AI 开发的国产大模型，支持图片多模态理解，中文语境优化。
- **在项目中的用途**：AI 对话接口的主要模型之一（`app.py:3807-3892`）。在多模型降级策略中作为 Kimi 失败后的备选方案。
- **30分钟速通核心概念**：
  1. 多模态：能同时理解文本和图片。
  2. API 调用：通过 HTTP 发送 prompt，获取生成文字。
  3. 中文优化：对中文语境理解更准确。
  4. 系统提示词（System Prompt）：设定 AI 的角色和行为（`app.py:3830-3840`）。
  5. Token：模型计费和处理的最小单位，中文约 1.5 字 = 1 Token。
- **最小代码示例**：

```python
# 调用 LLM 的通用模式（来自 app.py:3807-3892 的简化）
messages = [
    {'role': 'system', 'content': '你是小游，一个热情友好的旅行规划师'},
    {'role': 'user', 'content': '北京三天怎么玩？'}
]
response = ai_service.chat(messages)  # 调用 AI 服务
print(response)  # AI 生成的旅行建议
```

- **自测题**：LLM 中的 System Prompt 的作用是什么？
  A) 给模型提供示例代码　 B) 设定 AI 助手的角色、行为方式、回答格式等全局约束　 C) 作为数据库查询语句　 D) 修改模型的底层参数

  **答案：B** — System Prompt 是在每次对话开始时告诉 AI"你是谁、该怎么说话"的指令。

---

### 大语言模型（LLM）：Kimi K2.5（月之暗面）

- **一句话定义**：月之暗面(Moonshot)开发的模型，以超长上下文窗口（25 万 token）为核心卖点。
- **在项目中的用途**：AI 对话的首选模型（`app.py:3807` 相关代码）。多模型降级链：Kimi → GLM → OpenAI（兜底）。
- **30分钟速通核心概念**：
  1. 超长上下文：一次能处理 25 万 Token（约一部长篇小说），适合长文档分析。
  2. API 兼容性：通常兼容 OpenAI API 格式。
  3. 适用场景：需要分析大量资料的深度研究、长对话历史。
  4. 上下文窗口 ≠ 输出长度：窗口限制的是输入+输出的总 Token 数。
  5. 费率：按 Token 计费，大窗口使用成本更高。
- **最小代码示例**：

```python
# 多模型降级策略（来自项目 AI 服务模块的逻辑抽象）
models = ['kimi', 'glm', 'openai']

for model_name in models:
    try:
        ai_service = get_ai_service(model_name)
        response = ai_service.chat(messages)
        break  # 成功则退出降级链
    except Exception as e:
        logger.warning(f"{model_name} 失败，尝试下一模型: {e}")
```

- **自测题**：Kimi K2.5 的核心竞争优势是什么？
  A) 最快的响应速度　 B) 超长上下文窗口（25 万 Token）　 C) 完全免费　 D) 支持离线运行

  **答案：B** — Kimi 以其超长上下文能力著称，适合需要处理大量文档或长对话的场景。

---

### 大语言模型（LLM）：DeepSeek V3

- **一句话定义**：DeepSeek（深度求索）开发的开源大模型，推理能力强、API 价格低。
- **在项目中的用途**：作为 AI 对话的可选模型之一，在需求文档中被列为支持的模型。
- **30分钟速通核心概念**：
  1. 开源模型：源码和权重部分开放，可自部署。
  2. 推理能力强：在数学、逻辑、代码等任务上表现出色。
  3. API 价格优势：性价比高于大部分商业模型。
  4. MoE（混合专家）架构：不同任务激活不同"专家"子模型。
  5. 兼容 OpenAI API 格式，易于集成。
- **最小代码示例**：

```python
# DeepSeek 兼容 OpenAI SDK 调用方式
import openai

client = openai.OpenAI(
    api_key="your-deepseek-api-key",
    base_url="https://api.deepseek.com"
)
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "推荐杭州三日游"}]
)
print(response.choices[0].message.content)
```

- **自测题**：DeepSeek V3 的一个显著技术架构特点是什么？
  A) 单一模型处理所有任务　 B) 混合专家(MoE)架构，不同任务激活不同的专家子模型　 C) 完全无需 API Key　 D) 只能在手机上运行

  **答案：B** — DeepSeek V3 使用 MoE 架构，用更少的计算资源获得了更强的性能。

---

### Prompt Engineering（提示工程）

- **一句话定义**：设计和优化输入给大模型的指令模板，以获取精准、结构化、可控的输出。
- **在项目中的用途**：所有 AI 调用的核心环节。`app.py:3830-3840` 定义了 AI 助手的 System Prompt；`app.py:4127-4140` 定义了行程生成的 JSON 格式 prompt。
- **30分钟速通核心概念**：
  1. System Prompt：定义 AI 的角色和行为规则（"你是旅行规划师"）。
  2. 结构化输出：要求 AI 按 JSON 格式返回（`app.py:4130-4140`）。
  3. Few-shot：在 prompt 中给出几个正确示例，引导模型模仿。
  4. Chain-of-Thought：要求 AI "逐步思考"再回答，提升推理准确度。
  5. 约束提示：`min(7, max(1, int(days)))` 确保输入值在合理范围（`app.py:4118`）。
- **最小代码示例**：

```python
# 来自 app.py:4127-4140 的 prompt 设计
prompt = f"""请为去{destination}旅行{days}天生成一份详细行程规划。

请以JSON格式返回，结构如下：
{{
  "title": "行程标题",
  "days": [
    {{
      "day": 1,
      "theme": "第一天主题",
      "items": [
        {{"time": "09:00", "title": "景点名称", "description": "..."}}
      ]
    }}
  ]
}}"""
```

- **自测题**：Prompt Engineering 解决的核心问题是什么？
  A) 提高服务器性能　 B) 让 AI 输出更精准、格式更可控　 C) 减少数据库查询 　 D) 压缩图片文件

  **答案：B** — 同样的模型，不同的 prompt 产出质量可能天差地别。好的 prompt 让输出精准可用。

---

### SSE（Server-Sent Events 服务端推送）

- **一句话定义**：HTTP 协议上的单向流式推送技术，服务端持续向客户端推送数据。
- **在项目中的用途**：AI 对话的流式响应。`app.py:3895-3920` 的 `generate_agent_stream()` 函数用 SSE 逐 chunk 推送 AI 回复，实现打字机效果。
- **30分钟速通核心概念**：
  1. `Content-Type: text/event-stream`：声明这是 SSE 流。
  2. `data: {...}\n\n`：每条消息的格式。
  3. 单向：服务端→客户端，不能反方向推。
  4. 对比 WebSocket：SSE 更简单（纯 HTTP），WebSocket 是全双工。
  5. `X-Accel-Buffering: no`：禁用 Nginx 缓冲确保实时性。
- **最小代码示例**：

```python
# 来自 app.py:3895-3905 的 SSE 流式输出简化版
from flask import Response, stream_with_context

def generate():
    for word in "欢迎使用智能旅行助手":
        yield f"data: {json.dumps({'type': 'content', 'data': word})}\n\n"

@app.route('/api/chat/stream')
def chat_stream():
    return Response(
        stream_with_context(generate()),
        headers={
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        }
    )
```

- **自测题**：SSE 和 WebSocket 的主要区别是什么？
  A) SSE 更快　 B) SSE 是单向（服务端→客户端），WebSocket 是全双工　 C) SSE 需要额外的库　 D) SSE 不支持文本

  **答案：B** — SSE 只支持服务端到客户端的单向推送，而 WebSocket 支持双向通信。

---

# 六、部署与运维（9项）

---

### Nginx

- **一句话定义**：高性能 HTTP 服务器和反向代理，单机可支撑数万并发连接。
- **在项目中的用途**：反向代理 + SSL 终止 + 静态文件服务。将 80/443 请求转发到 Flask (5001) 或 Next.js (3000)，图片等静态资源由 Nginx 直接返回。配置在 `deployment/docker/apisix/` 和 `frontend/user-web/nginx.conf`。
- **30分钟速通核心概念**：
  1. 反向代理：客户端 → Nginx → 后端应用，隐藏后端架构。
  2. SSL 终止：HTTPS 解密在 Nginx，后端跑 HTTP 即可。
  3. 静态文件直接返回：不占用应用进程。
  4. Gzip 压缩：减少传输体积。
  5. `proxy_pass`：核心指令，`proxy_pass http://flask:5001;` 转发请求。
- **最小代码示例**：

```nginx
# Nginx 反向代理核心配置
server {
    listen 80;
    server_name travel.example.com;

    # API 请求转发到 Flask
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 静态图片直接返回
    location /scenic_images/ {
        root /var/www/travel-assistant;
    }
}
```

- **自测题**：Nginx 的反向代理模式中，客户端直接连接的是谁？
  A) Flask 应用　 B) MySQL 数据库　 C) Nginx　 D) Redis 缓存

  **答案：C** — 客户端请求先到 Nginx，由 Nginx 代转发到后端服务，客户端不知道后端的存在。

---

### Docker

- **一句话定义**：容器化平台，把应用和环境打包成标准化的"集装箱"，到处都能运行。
- **在项目中的用途**：所有服务的容器化部署。通过 Dockerfile 构建镜像（如 `backend/ai-service/Dockerfile`），确保开发/测试/生产环境一致。
- **30分钟速通核心概念**：
  1. 镜像（Image）：只读模板，包含 OS + 依赖 + 代码。
  2. 容器（Container）：镜像的运行实例，相互隔离。
  3. Dockerfile：`FROM python:3.9` → `COPY . .` → `RUN pip install -r requirements.txt` → `CMD ["python", "app.py"]`。
  4. 解决环境不一致："在我电脑能跑，服务器上跑不了"的问题。
  5. 隔离依赖冲突：不同容器可以装不同版本的 Python。
- **最小代码示例**：

```dockerfile
# 来自 backend/ai-service/Dockerfile 的简化版
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

- **自测题**：Docker 镜像和容器的关系是？
  A) 镜像 = 容器的运行实例　 B) 容器 = 镜像的运行实例　 C) 镜像是容器的一种　 D) 两者完全独立

  **答案：B** — 镜像是模板（类），容器是实例（对象）。一个镜像可以启动多个容器。

---

### Docker Compose

- **一句话定义**：一个 YAML 文件定义多个容器服务，一条命令全部启动。
- **在项目中的用途**：`deployment/docker/docker-compose.yml` 定义了 MySQL + Redis + Elasticsearch + Milvus + 应用等服务的编排，`docker compose up -d` 一键启动全部。
- **30分钟速通核心概念**：
  1. `docker-compose.yml`：描述所有服务的配置。
  2. `services`：每个服务 = 一个容器。
  3. `volumes`：数据持久化（容器删除后数据不丢失）。
  4. `networks`：服务间通信的虚拟网络。
  5. `docker compose up -d`：后台启动所有服务。
- **最小代码示例**：

```yaml
# 来自 deployment/docker/docker-compose.yml:1-32 的简化版
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: travel_assistant
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - travel-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - travel-network

volumes:
  mysql_data:
networks:
  travel-network:
```

- **自测题**：`docker compose up -d` 中的 `-d` 参数含义是什么？
  A) 调试模式　 B) 开发模式　 C) 后台运行（detached mode）　 D) 删除旧容器

  **答案：C** — `-d` = detached，容器在后台运行，不阻塞终端。

---

### APISIX

- **一句话定义**：Apache 开源的云原生 API 网关，支持动态路由、限流、认证等。
- **在项目中的用途**：作为 API 网关的备选方案，配置在 `deployment/docker/apisix/apisix.yml` 和 `routes.yml`。
- **30分钟速通核心概念**：
  1. 路由（Route）：定义请求路径到上游服务的映射。
  2. 上游（Upstream）：后端服务实例组。
  3. 插件（Plugin）：限流、认证、日志等功能通过插件实现。
  4. 动态配置：修改路由不重启网关。
  5. 基于 etcd 存储配置。
- **最小代码示例**：

```yaml
# 来自 deployment/docker/apisix/routes.yml（简化）
routes:
  - uri: /api/*
    upstream:
      type: roundrobin
      nodes:
        "flask:5001": 1
    plugins:
      cors: {}
```

- **自测题**：API 网关的核心功能不包括以下哪项？
  A) 请求路由　 B) 限流　 C) 数据库查询　 D) 认证

  **答案：C** — API 网关负责路由和横切关注点（限流、认证、日志），不负责查询数据库。

---

### Kubernetes (K8s)

- **一句话定义**：容器编排平台，自动管理容器的部署、伸缩、负载均衡、故障恢复。
- **在项目中的用途**：生产环境的大规模部署方案，配置在 `deployment/kubernetes/` 目录下。
- **30分钟速通核心概念**：
  1. Pod：最小调度单位，含 1 个或多个容器。
  2. Deployment：声明期望的 Pod 副本数，自动维护。
  3. Service：为 Pod 提供稳定 IP 和 DNS，实现负载均衡。
  4. ConfigMap / Secret：配置与敏感信息管理。
  5. 自愈：Pod 挂了自动重启替换。
- **最小代码示例**：

```yaml
# K8s Deployment 示例
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flask-app
spec:
  replicas: 3               # 保持 3 个副本
  selector:
    matchLabels:
      app: flask
  template:
    spec:
      containers:
      - name: flask
        image: travel-assistant:latest
        ports:
        - containerPort: 5001
```

- **自测题**：Kubernetes 中的最小部署单位是什么？
  A) 容器　 B) Pod　 C) Node　 D) Deployment

  **答案：B** — Pod 是 K8s 的最小调度和部署单位，可以包含一个或多个容器。

---

### Prometheus

- **一句话定义**：开源的监控系统和时序数据库，采用拉取（Pull）模式从应用采集指标。
- **在项目中的用途**：采集 QPS、响应延迟（P50/P95/P99）、错误率、CPU/内存使用率等指标。配置在 `deployment/monitoring/` 和 `deployment/docker/` 下。
- **30分钟速通核心概念**：
  1. 时序数据库（TSDB）：专门存时间序列数据（指标 + 时间戳）。
  2. Pull 模型：Prometheus 定期从 `/metrics` 端点拉数据。
  3. PromQL：查询语言，如 `rate(http_requests_total[5m])`。
  4. 多维标签：`{method="GET", path="/api/destinations"}` 精细筛选。
  5. Alertmanager：指标触发报警。
- **最小代码示例**：

```python
# 应用暴露 /metrics 端点，Prometheus 定期拉取
from prometheus_client import Counter, generate_latest

request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])

@app.route('/metrics')
def metrics():
    return generate_latest()
```

- **自测题**：Prometheus 采集数据的方式是？
  A) 被推送(Push)　 B) 主动拉取(Pull)　 C) 消息队列中转　 D) 数据库直接查询

  **答案：B** — Prometheus 定期向目标应用的 `/metrics` 端点发送 HTTP 请求拉取数据。

---

### Grafana

- **一句话定义**：开源的数据可视化平台，将监控数据（如 Prometheus）以仪表盘、图表形式展示。
- **在项目中的用途**：直观展示系统运行状态、响应时间趋势、错误率变化等，配在 `deployment/monitoring/` 下。
- **30分钟速通核心概念**：
  1. 数据源：连接 Prometheus、MySQL、Elasticsearch 等。
  2. Dashboard：由多个 Panel 组成的监控大屏。
  3. Panel：一个图表（折线图、柱状图、饼图、仪表盘）。
  4. 变量（Variables）：动态切换数据源、时间范围。
  5. Alerting：图表数据超阈值时邮件/钉钉告警。
- **最小代码示例**：

```
# Grafana 仪表盘示例查询（PromQL）
rate(http_requests_total{job="flask"}[5m])
# 显示为折线图，表示 Flask 应用近 5 分钟的平均 QPS
```

- **自测题**：Grafana 的主要作用是什么？
  A) 存储指标数据　 B) 可视化展示监控数据　 C) 处理用户请求　 D) 缓存数据库查询

  **答案：B** — Grafana 负责将 Prometheus 等数据源的数据以可视化仪表盘形式呈现。

---

### RotatingFileHandler（日志轮转）

- **一句话定义**：Python logging 模块的日志处理器，当日志文件达到指定大小时自动轮转，避免单个文件无限膨胀。
- **在项目中的用途**：`app.py:36` 导入，配置在 `app.py:47-65`。单文件最大 10MB，保留 5 个备份（`app.log`, `app.log.1` ... `app.log.5`）。
- **30分钟速通核心概念**：
  1. `maxBytes`：超过此大小就轮转。
  2. `backupCount`：保留的备份文件数。
  3. 轮转机制：当前文件改名为 `.1`，旧备份依次改名，新日志写入空白文件。
  4. 防止磁盘占满：长期运行的服务日志量巨大，不轮转会写爆磁盘。
  5. 配合日志级别：DEBUG < INFO < WARNING < ERROR < CRITICAL。
- **最小代码示例**：

```python
# 来自 app.py:47-65 的日志配置简化版
import logging
from logging.handlers import RotatingFileHandler
import os

os.makedirs('logs', exist_ok=True)

handler = RotatingFileHandler(
    'logs/app.log',
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5,
    encoding='utf-8',
)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logging.basicConfig(level=logging.INFO, handlers=[handler])

logger = logging.getLogger(__name__)
logger.info("服务器启动成功")
logger.error("数据库连接失败", exc_info=True)
```

- **自测题**：`RotatingFileHandler` 中 `backupCount=5` 意味着什么？
  A) 每 5 秒轮转一次　 B) 保留 5 个历史日志备份文件　 C) 最多记录 5 个错误　 D) 5 个日志文件同时写入

  **答案：B** — `backupCount` 指定保留的旧日志文件数量（app.log.1 ~ app.log.5）。

---

### 结构化日志（JSON 格式日志）

- **一句话定义**：以 JSON 等结构化格式输出日志，便于日志系统（ELK、Grafana Loki）按字段检索和分析。
- **在项目中的用途**：生产环境日志以 JSON 格式输出，配合 ELK/Grafana Loki 做日志聚合和分析。
- **30分钟速通核心概念**：
  1. 纯文本→JSON：每个字段独立，可直接按字段过滤。
  2. 可聚合分析：按 `event`、`user_id`、`level` 等字段统计。
  3. ELK（Elasticsearch + Logstash + Kibana）是经典日志收集展示组合。
  4. Loki + Grafana：更轻量的日志方案。
  5. 结构化 ≠ 复杂：本质是 `json.dumps(record)`。
- **最小代码示例**：

```python
import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }, ensure_ascii=False)

# 使用
logger.info("用户操作", extra={"event": "destination_view", "destination_id": 123})
# 输出: {"timestamp": "...", "level": "INFO", "message": "用户操作", "event": "destination_view", ...}
```

- **自测题**：结构化日志相比传统文本日志的优势是什么？
  A) 文件更小　 B) 可按字段精确过滤、聚合、分析　 C) 速度更快　 D) 不需要解析

  **答案：B** — 结构化日志的每个字段都是独立的检索维度，排查问题时效率远高于文本日志。

---

# 七、安全相关技术（4项）

---

### 密码哈希（Werkzeug 提供）

- **一句话定义**：将用户密码通过单向哈希算法转为不可逆字符串存储，防止数据库泄露导致密码外泄。
- **在项目中的用途**：用户注册时 `generate_password_hash()` 加密，登录时 `check_password_hash()` 验证（`app.py:30,520`）。
- **30分钟速通核心概念**：
  1. 哈希 ≠ 加密：哈希是单向的，不可解密。
  2. 加盐（Salt）：每个密码掺入随机字符串，相同密码产出不同哈希。
  3. PBKDF2 + SHA256：默认算法，迭代 60 万次。
  4. 数据库只存哈希值：`password_hash VARCHAR(255)`（`schema.sql:8`）。
  5. 验证：输入密码 → 计算哈希 → 对比存储的哈希。
- **最小代码示例**：

```python
from werkzeug.security import generate_password_hash, check_password_hash

# 注册
hash_value = generate_password_hash('user_password_123')
db.session.add(User(password_hash=hash_value))

# 登录
if check_password_hash(user.password_hash, 'user_password_123'):
    print("登录成功")
```

- **自测题**：为什么密码哈希需要"盐"（Salt）？
  A) 加快哈希计算　 B) 使相同密码的哈希值不同，防止彩虹表攻击　 C) 减少存储空间　 D) 与前端加解密通信

  **答案：B** — Salt 让相同密码的用户产生不同的哈希值，攻击者无法用预计算的彩虹表批量破解。

---

### CORS（跨域资源共享）

- **一句话定义**：浏览器的一种安全机制，限制网页从不同源向服务器发起请求，由服务器响应头声明允许哪些源。
- **在项目中的用途**：`Flask-CORS` 在 `app.py:10` 导入并初始化，允许 `localhost:3000` 的 Next.js 前端访问 `localhost:5001` 的 Flask 后端。
- **30分钟速通核心概念**：
  1. 同源 = 协议 + 域名 + 端口完全相同。
  2. `Access-Control-Allow-Origin`：声明允许哪些源。
  3. 简单请求 vs 预检请求（OPTIONS）。
  4. `Access-Control-Allow-Credentials: true`：允许携带 Cookie/Token。
  5. CSRF 攻击防护：CORS 阻止恶意网站冒充用户。
- **最小代码示例**：

```python
from flask_cors import CORS

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Authorization", "Content-Type"],
    }
})
```

- **自测题**：如果前端跑在 `http://localhost:3000`，后端 `http://localhost:5001`，它们同源吗？
  A) 同源　 B) 不同源（端口不同）　 C) 取决于浏览器　 D) 取决于 JS 框架

  **答案：B** — 协议相同、域名相同，但端口不同（3000 vs 5001），属于不同源。

---

### 参数化查询 / SQL 注入防护

- **一句话定义**：把 SQL 语句结构与数据参数分离，数据库自动转义特殊字符，彻底防止 SQL 注入攻击。
- **在项目中的用途**：SQLAlchemy ORM 自动执行参数化查询。`app.py:1057-1063` 的 `.filter(Destination.city.ilike(f'%{city}%'))` 不会拼接用户输入到 SQL，而是通过参数绑定。
- **30分钟速通核心概念**：
  1. SQL 注入：攻击者输入 `' OR 1=1 --` 篡改 SQL 逻辑。
  2. 参数化：`SELECT * FROM t WHERE city = ?` + 参数 `['北京']`。
  3. ORM 的天然防御：SQLAlchemy 默认参数化。
  4. 不要拼字符串：`f"SELECT * FROM t WHERE city = '{user_input}'"` 是危险的。
  5. ILIKE 也安全：ORM 的 `.ilike()` 同样参数化。
- **最小代码示例**：

```python
# SQLAlchemy ORM 自动参数化查询（来自 app.py:1056-1063）
# 即使用户输入恶意内容，也只会被当作纯文本处理

if keyword:
    query = query.filter(
        db.or_(
            Destination.name.ilike(f'%{keyword}%'),      # 安全：参数化
            Destination.description.ilike(f'%{keyword}%'),
            Destination.city.ilike(f'%{keyword}%'),
        )
    )
```

- **自测题**：SQL 注入攻击是如何生效的？
  A) 通过修改 CSS 样式　 B) 利用未转义的用户输入拼接 SQL 语句，注入恶意 SQL 代码　 C) 通过拦截网络请求　 D) 通过猜测数据库密码

  **答案：B** — SQL 注入的根源是用户输入被当作 SQL 代码的一部分执行，而非纯数据。

---

### JWT 认证（无状态认证）

- **一句话定义**：用户登录后获得签名令牌，后续请求携带令牌证明身份，服务器无需存储会话。
- **在项目中的用途**：整体认证体系。`_issue_jwt()` 签发（`app.py:389-398`），`_current_user_or_401()` 验证（`app.py:401-433`），Token 7 天有效，HS256 算法。
- **30分钟速通核心概念**：
  1. 无状态：服务器不存任何会话信息，令牌自包含身份信息。
  2. 三段式结构：Header.Payload.Signature。
  3. 签名防篡改：修改 Payload 会导致签名不匹配。
  4. `exp` 过期控制：7 天后自动失效。
  5. 前端存储：`localStorage.setItem('auth_token', token)`。
- **最小代码示例**：

```python
# 来自 app.py:389-433 的完整流程
# 签发
token = _issue_jwt(user_id=1)
# token = "eyJhbGciOiJIUzI1NiIs..."（三段式）

# 验证
auth_header = request.headers.get('Authorization', '')
if auth_header.startswith('Bearer '):
    token = auth_header[7:]
    payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
    user_id = payload['user_id']
    # 用 user_id 查数据库获取用户
```

- **自测题**：JWT 相比传统 Session 认证的核心优势是什么？
  A) 更安全　 B) 服务器无状态，不需要存储会话信息，天然适合分布式部署　 C) Token 永不过期　 D) 不需要登录

  **答案：B** — JWT 是自包含的，服务器不需要维护 Session 存储，方便多服务器横向扩展。

---

## 附录：技术名词索引

按字母排序的全部技术名词快速索引：

| 技术 | 类型 | 章节 |
|------|------|------|
| APISIX | 部署 | 六 |
| Autoprefixer | 前端 | 二 |
| Axios 1.5 | 前端 | 二 |
| CORS | 安全 | 七 |
| date-fns 2.30 | 前端 | 二 |
| DeepSeek V3 | AI | 五 |
| Docker | 部署 | 六 |
| Docker Compose | 部署 | 六 |
| Elasticsearch 8.8 | 数据 | 四 |
| ESLint | 前端 | 二 |
| Flask 2.3 | 后端 | 三 |
| Flask-CORS 4.0 | 后端 | 三 |
| Flask-SQLAlchemy 3.0 | 后端 | 三 |
| Framer Motion 10 | 前端 | 二 |
| GLM-4.6v（智谱） | AI | 五 |
| Go | 语言 | 一 |
| Grafana | 部署 | 六 |
| JWT 认证 | 安全 | 七 |
| Kimi K2.5（月之暗面） | AI | 五 |
| Kubernetes (K8s) | 部署 | 六 |
| Lucide React | 前端 | 二 |
| Milvus | 数据 | 四 |
| MySQL 8.0 | 数据 | 四 |
| Next.js 14 | 前端 | 二 |
| Nginx | 部署 | 六 |
| 密码哈希 | 安全 | 七 |
| PostCSS | 前端 | 二 |
| Prettier | 前端 | 二 |
| Prometheus | 部署 | 六 |
| Prompt Engineering | AI | 五 |
| PyJWT 2.8 | 后端 | 三 |
| Python 3.9+ | 语言 | 一 |
| python-dotenv 1.0 | 后端 | 三 |
| React 18 | 前端 | 二 |
| React Hook Form 7.47 | 前端 | 二 |
| React Query 3.39 | 前端 | 二 |
| Redis 7 | 数据 | 四 |
| RotatingFileHandler | 部署 | 六 |
| SQL 注入防护 | 安全 | 七 |
| SQLAlchemy 2.0 | 后端 | 三 |
| SQLite | 数据 | 四 |
| SSE | AI | 五 |
| SWR 2.2 | 前端 | 二 |
| Tailwind CSS 3.3 | 前端 | 二 |
| TypeScript 5.2 | 语言 | 一 |
| Waitress 3.0 | 后端 | 三 |
| Werkzeug 2.3 | 后端 | 三 |
| Zod 3.22 | 前端 | 二 |
| Zustand 4.4 | 前端 | 二 |
| 结构化日志 | 部署 | 六 |
| 限流装饰器 | 后端 | 三 |

---

> **生成说明**：本文档基于 `CLAUDE_PROJECT_GUIDE.md` 和 `TECH_STACK.md` 的技术名词逐项生成，共 **52 项技术**，分为 **7 个大类**。每项均包含：一句话定义、项目代码位置引用、5 个核心概念、可运行的代码示例、1 道自测题。建议按项目模块学习顺序（语言→前端→后端→数据→AI→部署→安全）循序渐进。
