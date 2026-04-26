# 前端项目源码逐行深度解析

> 生成时间：2026-04-21
> 覆盖范围：`frontend/user-web/src/` 全部源码
> 阅读建议：配合 IDE 打开对应文件对照阅读

---

## 目录

1. [项目架构总览](#一项目架构总览)
2. [配置文件解析](#二配置文件解析)
3. [全局样式与布局](#三全局样式与布局)
4. [类型定义层](#四类型定义层)
5. [工具函数层](#五工具函数层)
6. [状态管理层](#六状态管理层)
7. [API 通信层](#七api-通信层)
8. [公共组件](#八公共组件)
9. [首页](#九首页)
10. [AI 助手页](#十ai-助手页)
11. [登录页](#十一登录页)
12. [注册页](#十二注册页)
13. [目的地页](#十三目的地页)
14. [购物车](#十四购物车)
15. [订单页](#十五订单页)
16. [技术模式总结](#十六关键技术模式总结)

---

## 一、项目架构总览

```
技术栈：Next.js 14 (App Router) + TypeScript + Tailwind CSS
状态管理：Zustand（三个独立 Store）
HTTP 请求：axios（api.ts）+ 原生 fetch（apiClient.ts）
图标库：lucide-react
通知提示：react-hot-toast
```

**文件目录结构：**

```
src/
├── app/                    # Next.js 14 App Router（文件即路由）
│   ├── page.tsx           # / 首页
│   ├── layout.tsx         # 全局根布局
│   ├── globals.css        # 全局样式
│   ├── assistant/         # /assistant AI助手
│   ├── destinations/      # /destinations 目的地列表 + [id] 详情
│   ├── login/             # /login 登录
│   ├── register/          # /register 注册
│   ├── cart/              # /cart 购物车
│   ├── orders/            # /orders 我的订单
│   ├── profile/           # /profile 个人中心
│   ├── itineraries/       # /itineraries 我的行程
│   ├── travel-notes/      # /travel-notes 游记攻略
│   ├── favorites/         # /favorites 收藏夹
│   ├── coupons/           # /coupons 领券中心
│   ├── support/           # /support 客服中心
│   ├── search/            # /search 搜索
│   ├── admin/             # /admin 管理后台
│   └── ...
├── components/            # 公共组件
│   ├── Navbar.tsx         # 顶部导航
│   ├── Footer.tsx         # 底部页脚
│   ├── DestinationCard.tsx # 目的地卡片
│   ├── ProductCard.tsx    # 产品卡片
│   ├── GlobalSearch.tsx   # 全局搜索
│   └── ...
├── store/                 # 状态管理
│   └── index.ts           # Zustand 三个 Store
├── lib/                   # 工具函数
│   ├── api.ts             # axios 封装
│   ├── apiClient.ts       # fetch 封装
│   ├── media.ts           # 图片 URL 处理
│   ├── display.ts         # 格式化显示
│   ├── validation.ts      # 表单验证
│   └── utils.ts           # 通用工具
├── types/                 # TypeScript 类型
│   └── index.ts           # 全部类型定义
└── hooks/                 # 自定义 Hooks
    └── index.ts           # useDebounce 等
```

---

## 二、配置文件解析

### 2.1 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用图片优化（使用外部图片或本地图片时不需要 Next.js 的 Image 组件优化）
  images: { unoptimized: true },
  
  // 开发时允许所有来源的图片（本地开发方便）
  // 生产环境应限制为特定域名
  
  // 重写规则：将 /api/* 请求代理到后端 Flask 服务
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5001/api/:path*',
      },
    ]
  },
}
module.exports = nextConfig
```

**关键设计决策：**
- `images.unoptimized: true`：不使用 Next.js 内置的图片优化服务（需要 Sharp 依赖），而是直接用原生 `<img>` 标签，配合 `loading="lazy"` 实现懒加载
- `rewrites`：前端开发服务器将 `/api/*` 请求转发到 `127.0.0.1:5001`（Flask 后端），解决跨域问题。生产环境通常由 Nginx 统一代理

### 2.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]    // 路径别名：@/components → src/components
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**关键配置：**
- `"paths": {"@/*": ["./src/*"]}`：这是整个项目能用 `@/store`、`@/lib/api` 这种导入方式的核心。TypeScript 编译器和 Next.js 都会识别这个别名
- `"jsx": "preserve"`：保留 JSX 语法，由 Next.js 的 SWC 编译器处理转换
- `"strict": true`：开启严格类型检查，包括 `noImplicitAny`、`strictNullChecks` 等

### 2.3 package.json（关键依赖）

```json
{
  "dependencies": {
    "next": "14.x",           // 核心框架
    "react": "18.x",          // UI 库
    "react-dom": "18.x",
    "typescript": "5.x",      // 类型系统
    "tailwindcss": "3.x",     // 原子化 CSS
    "zustand": "4.x",         // 状态管理
    "axios": "1.x",           // HTTP 客户端
    "lucide-react": "0.x",    // 图标库
    "react-hot-toast": "2.x", // 通知提示
    "clsx": "2.x",            // 条件 className 合并
    "tailwind-merge": "2.x"   // Tailwind 类名去重合并
  }
}
```

---

## 三、全局样式与布局

### 3.1 app/globals.css

这是整个应用的 CSS 入口，定义了 Tailwind 指令和自定义样式：

```css
@tailwind base;      /* 导入 Tailwind 的 CSS Reset 和基础样式 */
@tailwind components; /* 导入 Tailwind 的组件层 */
@tailwind utilities;  /* 导入 Tailwind 的工具类 */

/* 自定义 CSS 变量 */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}

/* 暗色模式变量 */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}

/* 自定义工具类 */
@layer base {
  * {
    @apply border-border;  /* 所有元素使用 CSS 变量定义的边框色 */
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer utilities {
  /* 页面背景：渐变 */
  .page-bg {
    background: linear-gradient(135deg, #e0f2fe 0%, #ede9fe 30%, #fce7f3 60%, #fef3c7 100%);
    min-height: 100vh;
  }
  
  /* 玻璃态卡片 */
  .card-glass {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
  
  /* 隐藏滚动条但保留滚动功能 */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

**逐行解释：**
- `@tailwind base/components/utilities`：Tailwind 的三层架构。`base` 层做 CSS Reset，`components` 层放可复用的组件样式，`utilities` 层放原子类
- `:root` 中的 CSS 变量：使用 HSL 格式（色相 饱和度 亮度），方便 Tailwind 的 `opacity` 修饰符工作。例如 `bg-primary` 实际映射到 `hsl(var(--primary))`
- `@layer base`：将自定义样式注入到 Tailwind 的 `base` 层，确保优先级正确
- `font-feature-settings`：启用 OpenType 字体特性，让文字渲染更精致
- `.page-bg`：整个项目大部分页面的背景都是这个四色渐变（浅蓝→浅紫→浅粉→浅黄）
- `.card-glass`：毛玻璃效果的核心——半透明背景 + `backdrop-filter: blur`

### 3.2 app/layout.tsx

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '智能旅游助手 - AI驱动的旅行规划平台',
  description: 'AI驱动的智能旅游平台，提供个性化行程规划、智能推荐和实时助手服务',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: '16px',
              padding: '12px 20px',
              fontSize: '14px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            },
            success: { iconTheme: { primary: '#10B981', secondary: 'white' } },
            error: { iconTheme: { primary: '#EF4444', secondary: 'white' } },
          }}
        />
      </body>
    </html>
  )
}
```

**逐行解释：**
- `import { Inter } from 'next/font/google'`：Next.js 14 的字体优化功能。`Inter` 是 Google Fonts 的一个无衬线字体，`subsets: ['latin']` 只加载拉丁字符子集，减少体积
- `export const metadata`：Next.js 14 的元数据 API，自动生成 `<head>` 中的 `<title>` 和 `<meta name="description">`。这是 SEO 的基础
- `RootLayout`：这是所有页面的根布局，每个页面都会包裹在这个布局中
- `<html lang="zh-CN">`：声明页面语言为中文，对屏幕阅读器和搜索引擎都很重要
- `<body className={inter.className}>`：将 Inter 字体的 CSS 类应用到 body，全局生效
- `<Toaster>`：`react-hot-toast` 的提示组件，放在这里确保所有页面都能显示 toast 通知
- `toastOptions.style`：自定义 toast 的样式——毛玻璃背景、圆角、阴影，和整体设计风格一致

---

## 四、类型定义层

### 4.1 types/index.ts

```typescript
export interface User {
  id: string
  phone: string
  email: string
  nickname: string
  avatar_url?: string
  membership_level: number
  is_admin?: boolean
  preferences: UserPreferences
  created_at: string
  updated_at: string
}
```

**User 接口详解：**
- `id: string`：用户唯一标识，后端生成
- `phone/email/nickname`：用户基本信息
- `avatar_url?: string`：可选的头像 URL，`?` 表示可能不存在
- `membership_level: number`：会员等级，用于判断是否为管理员（>=9 级视为管理员）
- `is_admin?: boolean`：显式管理员标记
- `preferences: UserPreferences`：用户偏好设置（嵌套对象）
- `created_at/updated_at: string`：ISO 8601 格式的时间字符串

```typescript
export interface UserPreferences {
  destinations: string[]       // 用户感兴趣的目的地列表
  budget_range: { min: number; max: number }
  travel_style: 'adventure' | 'relaxation' | 'cultural' | 'business'
  group_size: number
  interests: string[]
}
```

**联合类型 `travel_style`**：只能取这四个值之一，TypeScript 会在编译时检查赋值是否合法

```typescript
export interface Product {
  id: string
  type: 'flight' | 'hotel' | 'ticket' | 'experience'
  name: string
  description: string
  price: number
  original_price?: number
  inventory: number
  tags: string[]
  metadata: ProductMetadata   // 不同类型产品的扩展信息
  status: 'active' | 'inactive' | 'sold_out'
  images: string[]
  location: { city: string; country: string; coordinates: { lat: number; lng: number } }
  rating: number
  review_count: number
}
```

**Product 接口详解：**
- `type`：联合类型，产品只能是机票/酒店/门票/体验四种之一
- `metadata: ProductMetadata`：使用嵌套接口存储类型特有的信息。例如机票有 `airline`、`flight_number`，酒店有 `star_rating`、`amenities`
- `status`：产品状态，控制是否在前端展示
- `location.coordinates`：经纬度，用于地图展示

```typescript
export interface Order {
  id: string
  user_id: string
  order_no: string        // 人类可读的订单号，如 "TA-1713680000000"
  items: OrderItem[]
  total_amount: number
  status: 'pending' | 'paid' | 'cancelled' | 'completed' | 'refunded'
  payment_method: 'alipay' | 'wechat' | 'credit_card' | 'bank_transfer'
  payment_time?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_type: 'flight' | 'hotel' | 'ticket' | 'experience'
  quantity: number
  unit_price: number
  total_price: number
  booking_details: any    // 预订详情（日期、时间段等），类型较灵活
}
```

**Order 接口详解：**
- `order_no`：对外展示的订单编号，格式为 `TA-${Date.now()}`，包含时间戳确保唯一
- `status`：订单状态流转——pending（待支付）→ paid（已支付）→ completed（已完成），或 cancelled/refunded
- `booking_details: any`：使用 `any` 是因为不同产品类型的预订信息结构差异很大（机票有航班号，酒店有入住日期，门票有游玩日期）

---

## 五、工具函数层

### 5.1 lib/utils.ts

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**这是整个项目最常用的工具函数，几乎每个组件都会用到。**

**逐行解释：**
- `clsx(...inputs)`：接受任意数量的参数，智能合并 className。支持字符串、对象、数组、条件表达式
  ```tsx
  clsx('foo', 'bar') // → 'foo bar'
  clsx('foo', { bar: true, baz: false }) // → 'foo bar'
  clsx(['foo', 'bar']) // → 'foo bar'
  ```
- `twMerge(clsxResult)`：解决 Tailwind 类名冲突。例如 `px-2 px-4` 合并后只保留 `px-4`（后面的覆盖前面的）
- `cn()` 组合了两者：先条件合并，再去重冲突。这是 shadcn/ui 项目的标准做法

### 5.2 lib/media.ts

```typescript
export const FALLBACK_MEDIA_PATH = 'scenic_images/__auto__/placeholder.png'

export function apiMediaUrl(path: string) {
  return `/api/media?path=${encodeURIComponent(path)}`
}
```

**apiMediaUrl 详解：**
- 后端有一个 `/api/media` 端点，用于安全地提供图片文件
- `encodeURIComponent(path)`：对路径中的特殊字符（如空格、中文）进行 URL 编码，避免请求失败

```typescript
export function resolveCoverSrc(coverImage?: string | null) {
  const v = (coverImage || '').trim()
  if (!v) return apiMediaUrl(FALLBACK_MEDIA_PATH)
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  if (v.startsWith('scenic_images/')) return apiMediaUrl(v)
  return apiMediaUrl(FALLBACK_MEDIA_PATH)
}
```

**resolveCoverSrc 详解（图片 URL 路由策略）：**
1. 如果 `coverImage` 为空/null → 返回占位图
2. 如果以 `http://` 或 `https://` 开头 → 直接返回（外部图片链接，如 CDN）
3. 如果以 `scenic_images/` 开头 → 通过 `/api/media` 代理访问（本地图片，需要后端权限验证）
4. 其他情况 → 降级到占位图

```typescript
export function onImgErrorUseFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img) return
  const fallback = apiMediaUrl(FALLBACK_MEDIA_PATH)
  if (img.src && img.src.includes(FALLBACK_MEDIA_PATH)) return
  img.src = fallback
}
```

**onImgErrorUseFallback 详解（图片加载失败兜底）：**
- 绑定到 `<img onError={onImgErrorUseFallback}>`
- `e.currentTarget`：获取触发事件的 `<img>` DOM 元素
- 防循环：如果当前已经是 fallback 图片，不再替换（避免死循环）
- 用途：网络不稳定或图片文件缺失时，显示占位图而不是裂图

### 5.3 lib/display.ts

```typescript
export function formatPriceStart(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '价格待补充'
  if (n === 0) return '免费'
  if (n > 0) return `¥${Math.round(n).toLocaleString()}起`
  return '价格待补充'
}
```

**formatPriceStart 详解：**
- 参数类型为 `unknown`：比 `any` 更安全，必须显式判断类型后才能使用
- `Number.isFinite(n)`：排除 `NaN`、`Infinity`、`-Infinity`
- `Math.round(n)`：四舍五入取整
- `toLocaleString()`：添加千分位分隔符，如 `1234567` → `"1,234,567"`

```typescript
export function shouldShowRating(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0
}

export function formatRating(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(1)
}
```

**评分处理逻辑：**
- `shouldShowRating`：判断是否应该显示评分（排除 0 分和无效值）
- `formatRating`：保留一位小数，如 `4.7`

### 5.4 lib/validation.ts

```typescript
export function isValidEmail(s: string) {
  if (!s || typeof s !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}
```

**邮箱验证正则详解：**
- `^[^\s@]+`：开头至少一个非空白、非 @ 字符（用户名）
- `@`：必须有 @ 符号
- `[^\s@]+`：域名部分，至少一个非空白、非 @ 字符
- `\.[^\s@]+$`：必须有 dot，后面至少一个非空白、非 @ 字符（顶级域名）
- 这是一个实用但不完美的正则，允许 `a@b.c` 这种不存在的域名

```typescript
export function isValidPhone(s: string) {
  if (!s || typeof s !== 'string') return false
  return /^1[3-9]\d{9}$/.test(s.trim().replace(/[\s\-]/g, ''))
}
```

**手机号验证详解：**
- `s.trim().replace(/[\s\-]/g, '')`：先去掉空格和连字符，支持 `138-1234-5678` 格式输入
- `^1[3-9]\d{9}$`：以 1 开头，第二位是 3-9，后面 9 位任意数字，共 11 位
- 覆盖中国大陆所有号段

---

## 六、状态管理层

### 6.1 store/index.ts

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  updateProfile: (data: Partial<User>) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        localStorage.removeItem('auth_token')
        set({ user: null, isAuthenticated: false })
      },
      updateProfile: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
```

**useUserStore 逐行详解：**

**Zustand 基础：**
- `create<State>()(...)`：创建 Store。`State` 是 TypeScript 泛型，提供类型安全
- `(set) => ({...})`：Store 的初始化函数，`set` 是更新状态的方法

**persist 中间件：**
- `persist(storeConfig, options)`：让 Store 自动持久化到 localStorage
- `name: 'user-storage'`：localStorage 的 key 名
- `partialize`：选择性地持久化字段。这里只存 `user` 和 `isAuthenticated`，不存 `isLoading`（加载状态不需要持久化）

**login 方法：**
- `set({ user, isAuthenticated: true })`：更新多个字段。Zustand 会自动合并对象，不需要展开操作符

**logout 方法：**
- `localStorage.removeItem('auth_token')`：同步删除 token
- `set({ user: null, isAuthenticated: false })`：清空用户状态
- 注意：这里没有调用后端注销 API，只是前端清理状态。后端 JWT token 会自然过期

**updateProfile 方法：**
- `set((state) => ({...}))`：函数式更新，可以读取当前状态
- `{ ...state.user, ...data }`：浅合并用户对象。`data` 中的字段会覆盖 `state.user` 中的同名字段

```typescript
interface CartState {
  items: OrderItem[]
  addItem: (item: OrderItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === item.product_id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + item.quantity, total_price: (i.quantity + item.quantity) * i.unit_price }
              : i
          ),
        }
      }
      return { items: [...state.items, { ...item, total_price: item.quantity * item.unit_price }] }
    }),
  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId
          ? { ...i, quantity, total_price: quantity * i.unit_price }
          : i
      ),
    })),
  clearCart: () => set({ items: [] }),
  getTotal: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.total_price, 0)
  },
}))
```

**useCartStore 逐行详解：**

**没有使用 persist：**
- 购物车状态只保存在内存中，刷新页面会清空。这是设计选择（简化实现）

**addItem 方法：**
- 先查找是否已有同商品：`state.items.find((i) => i.product_id === item.product_id)`
- 如果有：累加数量，重新计算 `total_price = 新数量 × 单价`
- 如果没有：追加新商品，计算 `total_price`

**updateQuantity 方法：**
- 使用 `map` 遍历，只更新匹配的商品，其他商品保持不变
- 重新计算 `total_price`

**getTotal 方法：**
- `get()`：Zustand 提供的方法，获取当前完整状态
- `reduce((sum, item) => sum + item.total_price, 0)`：累加所有商品的小计

```typescript
interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  notifications: Array<{ id: string; title: string; message: string }>
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  addNotification: (n: { title: string; message: string }) => void
  removeNotification: (id: string) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'light',
  notifications: [],
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
  addNotification: (n) =>
    set((state) => ({
      notifications: [{ id: Date.now().toString(), ...n }, ...state.notifications].slice(0, 10),
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  setTheme: (theme) => {
    set({ theme })
    document.documentElement.classList.toggle('dark', theme === 'dark')
  },
}))
```

**useUIStore 逐行详解：**

**toggleSidebar：**
- 读取当前状态取反：`!state.sidebarOpen`
- 用于移动端侧边栏的打开/关闭切换

**addNotification：**
- `Date.now().toString()`：用时间戳作为唯一 ID
- `.slice(0, 10)`：最多保留 10 条通知，防止内存无限增长

**setTheme：**
- `document.documentElement.classList.toggle('dark', theme === 'dark')`：切换 `<html>` 标签的 `dark` 类
- Tailwind 的 `dark:` 修饰符会根据这个类自动生效

---

## 七、API 通信层

### 7.1 lib/api.ts（axios 封装）

```typescript
import axios from 'axios'

export const api = axios.create({
  baseURL: '',  // 使用相对路径，由 Next.js rewrites 代理到后端
  timeout: 20000,  // 20 秒超时
})
```

**为什么 baseURL 为空？**
- 因为 `next.config.js` 中配置了 `rewrites`，所有 `/api/*` 请求会被代理到 Flask 后端
- 使用相对路径 `/api/xxx` 即可，不需要写完整域名

```typescript
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)
```

**请求拦截器详解：**
- `typeof window !== 'undefined'`：SSR 安全判断。Next.js 服务端渲染时 `window` 不存在
- 自动从 localStorage 读取 `auth_token`，添加到请求头的 `Authorization` 字段
- 所有通过 `api` 实例发出的请求都会自动带上 token

```typescript
api.interceptors.response.use(
  (response) => response.data,  // 直接返回 data，不需要 .data
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

**响应拦截器详解：**
- `(response) => response.data`：直接返回响应体中的 `data` 字段。这样调用时可以直接 `const data = await api.get('/xxx')` 而不是 `const { data } = await api.get('/xxx')`
- 401 处理：token 过期或无效时，清除 token 并跳转到登录页

### 7.2 lib/apiClient.ts（fetch 封装）

```typescript
export async function apiClient<T>(
  path: string,
  options: RequestInit & { auth?: boolean; adminAuth?: boolean } = {}
): Promise<T> {
  const { auth, adminAuth, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)

  if (auth) {
    const token = localStorage.getItem('auth_token')
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  if (adminAuth) {
    const token = localStorage.getItem('admin_token')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    // 管理员请求直连后端，绕过 Next.js rewrite
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'
    const res = await fetch(`${baseUrl}${path}`, { ...fetchOptions, headers })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  const res = await fetch(path, { ...fetchOptions, headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
```

**apiClient 设计意图：**

**双 token 体系：**
- `auth`：使用普通用户的 `auth_token`，走 Next.js rewrite 代理（`/api/xxx` → Flask）
- `adminAuth`：使用管理员的 `admin_token`，**直连后端**（`http://127.0.0.1:5001/api/xxx`）
- 为什么管理员要直连？因为管理后台的 API 可能不走前端的 rewrite 规则，或者有独立的认证中间件

**Headers 对象：**
- 使用 `new Headers()` 而不是普通对象，可以方便地调用 `.set()` 方法，避免重复设置头信息

---

## 八、公共组件

### 8.1 components/Navbar.tsx

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
```

**`'use client'` 指令：**
- Next.js 14 App Router 默认在服务端渲染组件
- 任何使用浏览器 API（localStorage、window、document）或 React Hooks（useState、useEffect）的组件都必须标记为客户端组件

```tsx
const mobileTitle = (pathname: string) => {
  const p = pathname || '/'
  if (p === '/' || p === '/home') return '发现旅程'
  if (p.startsWith('/destinations')) return '目的地'
  if (p.startsWith('/travel-notes')) return '旅行攻略'
  if (p.startsWith('/assistant/settings')) return '智能体配置'
  if (p.startsWith('/assistant')) return 'AI 助手'
  if (p.startsWith('/profile')) return '我的'
  if (p.startsWith('/login')) return '登录'
  if (p.startsWith('/register')) return '注册'
  return '智能旅游助手'
}
```

**mobileTitle 函数：**
- 纯函数，根据当前路径返回移动端导航栏标题
- 使用 `startsWith` 而不是 `===`，因为子路由（如 `/destinations/123`）也要匹配

```tsx
export function Navbar({ className = '' }: NavbarProps) {
  const pathname = usePathname()   // 获取当前路径，如 "/destinations"
  const router = useRouter()       // 编程式导航
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { items } = useCartStore()
  const [isScrolled, setIsScrolled] = useState(false)
  const { user, isAuthenticated, logout } = useUserStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [hasAdminToken, setHasAdminToken] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
```

**状态声明详解：**
- `pathname`：来自 `next/navigation`，当前 URL 路径
- `isScrolled`：记录页面是否滚动超过 10px，用于改变导航栏样式
- `unreadCount`：未读通知数量，显示在铃铛图标上的红点
- `userMenuOpen`：用户下拉菜单的展开状态
- `hasAdminToken`：是否有管理员 token，用于显示管理员入口
- `userMenuRef`：DOM 引用，用于判断点击是否在下拉菜单外部

```tsx
  // 客户端渲染后检查是否有管理员登录（避免Hydration不匹配）
  useEffect(() => {
    setHasAdminToken(!!localStorage.getItem('admin_token'))
  }, [])
```

**Hydration 陷阱处理：**
- **问题**：服务端渲染时 `localStorage` 不存在，`hasAdminToken` 在服务端为 `false`，客户端可能为 `true`，导致 HTML 不匹配
- **解决**：初始值设为 `false`，在 `useEffect`（只在客户端执行）中读取 localStorage 并更新状态
- `!!`：双否定将值转为布尔类型。`!!'abc'` → `true`，`!!null` → `false`

```tsx
  const isLoggedIn = isAuthenticated || hasAdminToken
  const isOnlyAdmin = hasAdminToken && !isAuthenticated
```

**登录状态判断：**
- `isLoggedIn`：只要有一种 token 就算登录
- `isOnlyAdmin`：只有管理员 token，没有普通用户 token（管理员单独登录模式）

```tsx
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.total_price, 0)
```

**购物车统计：**
- `totalItems`：商品件数（考虑数量）
- `totalPrice`：购物车总价

```tsx
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
```

**滚动监听：**
- 监听 `window.scroll` 事件
- 滚动超过 10px 时 `isScrolled = true`
- 清理函数 `return () => window.removeEventListener(...)`：组件卸载时移除监听，防止内存泄漏

```tsx
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (!isAuthenticated || !user?.id) {
        setUnreadCount(0)
        return
      }
      try {
        const res = await fetch(
          `/api/notifications?user_id=${encodeURIComponent(user.id)}&is_read=false&per_page=1`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const data = await res.json()
        if (data?.success) {
          setUnreadCount(Number(data.total || 0))
        }
      } catch {
        // 静默失败：不阻塞导航条渲染
      }
    }
    fetchUnreadNotifications()
  }, [isAuthenticated, user?.id])
```

**未读通知获取：**
- 只在用户已登录时请求
- `per_page=1`：只需要总数，不需要详细列表
- `cache: 'no-store'`：禁用浏览器缓存，确保数据实时
- 静默失败：即使 API 挂了，导航栏也能正常显示

```tsx
  useEffect(() => {
    if (!userMenuOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const el = userMenuRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [userMenuOpen])
```

**点击外部关闭下拉菜单：**
- 只在菜单打开时注册事件监听
- `e.target instanceof Node && el.contains(e.target)`：判断点击目标是否在菜单 DOM 内部
- `Node` 是 DOM 元素的基类，确保 `e.target` 可以调用 `contains`

```tsx
  useEffect(() => {
    setUserMenuOpen(false)
  }, [pathname])
```

**路由变化时关闭菜单：**
- 用户点击菜单项跳转页面后，自动关闭下拉菜单

```tsx
  const adminThreshold = Number(process.env.NEXT_PUBLIC_ADMIN_MEMBERSHIP_LEVEL || 9)
  const isAdmin = Boolean(isAuthenticated && user && Number(user.membership_level ?? 1) >= (Number.isFinite(adminThreshold) ? adminThreshold : 9))
```

**管理员判断逻辑：**
- 从环境变量读取管理员等级阈值，默认 9 级
- 用户必须已登录，且 `membership_level >= 阈值`
- `Number.isFinite(adminThreshold)`：防御性编程，防止环境变量解析出 `NaN`

```tsx
  const navItems = [
    { href: '/', label: '首页', icon: MapPin },
    { href: '/destinations', label: '目的地', icon: MapPin },
    { href: '/travel-notes', label: '攻略', icon: BookOpen },
    { href: '/about', label: '关于我们', icon: Heart },
  ]
```

**导航项配置：**
- 使用数组定义导航项，方便遍历渲染
- 每个项包含链接、标签、图标组件

```tsx
  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />
      )}
```

**移动端遮罩层：**
- 只在移动端侧边栏打开时显示（`lg:hidden`：大屏隐藏）
- 点击遮罩层关闭侧边栏

```tsx
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${className} ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'max-lg:travel-gradient-header max-lg:shadow-md lg:bg-white/90 lg:backdrop-blur-sm lg:shadow-sm'
        }`}
      >
```

**导航栏样式切换：**
- 滚动后：`bg-white/95 backdrop-blur-md shadow-lg`——白色半透明 + 毛玻璃 + 阴影
- 未滚动（移动端）：`travel-gradient-header`——渐变背景
- 未滚动（桌面端）：`bg-white/90 backdrop-blur-sm`——轻微毛玻璃

```tsx
            <div className="hidden lg:flex items-center gap-2 flex-1 justify-center mx-4">
              {[
                { item: navItems[0], border: 'border-blue-200', bg: 'bg-blue-50', shadow: 'shadow-blue-200/50', icon: 'text-blue-500' },
                { item: navItems[1], border: 'border-emerald-200', bg: 'bg-emerald-50', shadow: 'shadow-emerald-200/50', icon: 'text-emerald-500' },
                { item: navItems[2], border: 'border-violet-200', bg: 'bg-violet-50', shadow: 'shadow-violet-200/50', icon: 'text-violet-500' },
                { item: navItems[3], border: 'border-rose-200', bg: 'bg-rose-50', shadow: 'shadow-rose-200/50', icon: 'text-rose-500' },
              ].map(({ item, border, bg, shadow, icon }) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${border} ${bg} text-gray-700 hover:text-gray-900`}
                >
                  <item.icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${icon}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
```

**桌面端导航按钮：**
- 每个按钮有不同的颜色主题（蓝/绿/紫/红）
- `group` + `group-hover:scale-110`：鼠标悬停时图标放大
- `hover:-translate-y-0.5`：鼠标悬停时按钮轻微上浮

```tsx
              <Link
                href="/assistant"
                className="hidden lg:inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl shadow-[0_4px_14px_rgba(99,102,241,0.5)] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 ring-2 ring-indigo-400/60 hover:shadow-[0_6px_20px_rgba(99,102,241,0.7)] hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all"
              >
                <Sparkles className="h-4 w-4 animate-pulse" />
                AI 助手
              </Link>
```

**AI 助手按钮：**
- 特殊的渐变背景 + 发光阴影
- `animate-pulse`：图标有脉冲动画，吸引注意力
- `ring-2 ring-indigo-400/60`：外圈光环效果

```tsx
              <Link href="/notifications" className={`relative p-2 transition-colors ${isScrolled ? 'text-gray-600 hover:text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
```

**通知铃铛：**
- `relative`：为红点徽章提供定位上下文
- 红点使用 `absolute -top-1 -right-1` 定位到铃铛右上角
- `min-w-[18px]`：确保单数字和双数字宽度一致
- `unreadCount > 99 ? '99+'`：超过 99 显示 "99+"

```tsx
              {!isLoggedIn ? (
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <Link href="/login" className={`inline-flex items-center justify-center gap-1 rounded-full border-2 px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm ${pathname.startsWith('/login') ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200/60' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-sky-50 hover:text-blue-800'}`}>
                    <LogIn className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2.25} />
                    <span>登录</span>
                  </Link>
                  <Link href="/register" className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98] sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm ${pathname.startsWith('/register') ? 'bg-gradient-to-r from-violet-600 to-indigo-600 ring-2 ring-coral-300/90 shadow-violet-600/35' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 shadow-blue-600/30 hover:brightness-110'}`}>
                    <UserPlus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2.25} />
                    <span>注册</span>
                  </Link>
                </div>
```

**未登录状态：**
- 显示登录和注册按钮
- `pathname.startsWith('/login')`：当前在登录页时，按钮有高亮样式
- `active:scale-[0.98]`：点击时轻微缩小，提供触觉反馈
- `sm:` 前缀：响应式断点，小屏和大屏使用不同的尺寸

```tsx
              ) : isOnlyAdmin ? (
                // 只有管理员登录...
              ) : (
                <>
                  {(() => {
                    const avatarInitial = user?.nickname?.trim()?.[0] || user?.phone?.trim()?.[0] || '?'
                    const hasAvatar = Boolean(user?.avatar_url)
                    const bgClass = isScrolled
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-2 border-white shadow-lg'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-2 border-white/50 shadow-lg'
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`hidden sm:inline text-sm truncate max-w-[140px] transition-colors ${isScrolled ? 'text-gray-700' : 'text-gray-700'}`}>
                          你好，{user?.nickname || '用户'}
                        </span>
                        <div className="relative" ref={userMenuRef}>
                          <button type="button" onClick={() => setUserMenuOpen((v) => !v)} className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 overflow-hidden ${hasAvatar ? '' : bgClass}`}>
                            {hasAvatar ? (
                              <img src={user?.avatar_url as string} alt={user?.nickname || 'user'} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add(bgClass) }} />
                            ) : (
                              <span className="text-lg text-white drop-shadow-md">{avatarInitial.slice(0, 1)}</span>
                            )}
                          </button>
```

**已登录用户头像：**
- 使用 IIFE（立即执行函数）创建局部变量，避免污染组件作用域
- `avatarInitial`：取昵称第一个字作为头像文字，没有昵称则取手机号第一个数字，都没有显示 "?"
- `hasAvatar`：判断是否有头像 URL
- 头像加载失败时（`onError`）：隐藏图片，给父元素添加背景色类，显示文字头像

### 8.2 components/Footer.tsx

```tsx
export function Footer() {
  const startYear = 2025
  const currentYear = new Date().getFullYear()
  const yearText = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`
```

**年份计算：**
- 动态计算版权年份范围。如果当前年份等于 startYear，只显示一个年份；否则显示范围

```tsx
  const footerLinks = {
    destinations: [
      { name: '热门目的地', href: '/destinations/popular' },
      { name: '国内游', href: '/destinations/domestic' },
      { name: '出境游', href: '/destinations/international' },
      { name: '周边游', href: '/destinations/local' },
    ],
    // ...
  }
```

**链接数据结构化：**
- 使用对象组织四组链接，方便遍历渲染
- 链接指向的页面可能尚未实现，但链接结构已预留

---

## 九、首页

### 9.1 app/page.tsx

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
```

**导入详解：**
- `useRouter`：用于编程式导航（如搜索后跳转）
- `Link`：Next.js 的客户端导航组件，比 `<a>` 更快（不会整页刷新）

```tsx
// 内存数据缓存，避免重复请求
let dataCache: {
  destinations: any[] | null
  products: any[] | null
  timestamp: number
} = { destinations: null, products: null, timestamp: 0 }

const CACHE_DURATION = 5 * 60 * 1000 // 5 分钟
```

**模块级缓存：**
- 变量定义在模块顶层，所有组件实例共享
- 页面切换后缓存仍然有效（只要不刷新浏览器）
- 5 分钟过期时间，平衡实时性和性能

```tsx
function generateSrcSet(baseUrl: string) {
  const widths = [320, 480, 640, 800, 1200]
  return widths.map((w) => `${baseUrl}?w=${w} ${w}w`).join(', ')
}
```

**响应式图片：**
- 生成 `srcset` 属性，让浏览器根据屏幕宽度选择合适尺寸的图片
- 格式：`url1 320w, url2 480w, ...`
- 浏览器会根据 `sizes` 属性和设备像素比自动选择

```tsx
export default function HomePage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [destinations, setDestinations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loadingDest, setLoadingDest] = useState(true)
  const [loadingProd, setLoadingProd] = useState(true)
```

```tsx
  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return
    router.push(`/destinations?keyword=${encodeURIComponent(keyword.trim())}`)
  }
```

**搜索提交：**
- `e.preventDefault()`：阻止表单默认提交（页面刷新）
- `encodeURIComponent`：对搜索关键词进行 URL 编码，处理中文和特殊字符
- `router.push`：客户端路由跳转，不刷新页面

```tsx
  useEffect(() => {
    const now = Date.now()
    if (dataCache.destinations && now - dataCache.timestamp < CACHE_DURATION) {
      setDestinations(dataCache.destinations)
      setLoadingDest(false)
    } else {
      fetch('/api/destinations?per_page=4&sort_by=popular')
        .then((res) => res.json())
        .then((data) => {
          const list = data?.destinations || []
          dataCache.destinations = list
          dataCache.timestamp = now
          setDestinations(list)
        })
        .finally(() => setLoadingDest(false))
    }
  }, [])
```

**数据加载逻辑：**
- 先检查缓存是否有效（未过期且存在）
- 缓存命中：直接使用缓存数据，不发送请求
- 缓存未命中：发送请求，更新缓存
- `.finally(() => setLoadingDest(false))`：无论成功失败，都关闭加载状态

```tsx
  const preloadDestination = (id: number) => {
    if (typeof window === 'undefined') return
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = `/destinations/${id}`
    document.head.appendChild(link)
  }
```

**预加载优化：**
- 鼠标悬停时预加载目的地详情页
- `requestIdleCallback` 或动态创建 `<link rel="prefetch">`
- 浏览器空闲时提前加载，用户点击时几乎瞬间打开

---

## 十、AI 助手页

### 10.1 app/assistant/page.tsx

这是整个项目最复杂的页面（1128 行），包含 SSE 流式通信、行程解析、历史会话等功能。

```tsx
type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  planTrip?: any
  planItems?: any[]
}
```

**ChatMsg 类型：**
- `id`：消息唯一标识，用于更新特定消息的内容（流式输出时）
- `role`：区分用户消息和 AI 回复
- `planTrip/planItems`：可选的行程数据，当 AI 返回结构化行程时填充

```tsx
function parsePlannerInput(text: string) {
  const normalized = text.trim()
  let destination = ''
  let days = 3
  const cityLike = normalized.match(/去\s*([\u4e00-\u9fa5A-Za-z]{2,12})/) ||
    normalized.match(/([\u4e00-\u9fa5A-Za-z]{2,12})\s*(?:旅行|旅游|行程|攻略)/)
  if (cityLike?.[1]) destination = cityLike[1].trim()
  const dayLike = normalized.match(/(\d{1,2})\s*(?:天|日)/)
  if (dayLike?.[1]) {
    const n = parseInt(dayLike[1], 10)
    if (!Number.isNaN(n)) days = Math.max(1, Math.min(14, n))
  }
  return { destination, days }
}
```

**parsePlannerInput 详解（自然语言解析）：**
- 从用户输入中提取目的地和天数
- 正则 1：`去 杭州` 或 `杭州 旅行/旅游/行程/攻略`
- 正则 2：`3 天` 或 `3日`
- `Math.max(1, Math.min(14, n))`：限制天数在 1-14 天之间

```tsx
function parseTripContent(content: string): TripDay[] {
  const text = content.replace(/\r\n/g, '\n')
  const dayStart = /(?:^|\n)(?:第\s*([一二三四五六七八九十\d]+)\s*天|Day\s*(\d+))/gi
  const matches = [...text.matchAll(dayStart)]
  if (matches.length === 0) return []
```

**parseTripContent 详解（行程文本解析）：**
- `replace(/\r\n/g, '\n')`：统一换行符（Windows 使用 `\r\n`，Unix 使用 `\n`）
- `matchAll`：全局匹配所有"第 X 天"或"Day N"的位置
- 如果没有匹配到天数标记，返回空数组（不是行程内容）

```tsx
  const toNum = (s?: string) => {
    if (!s) return 0
    const m = s.match(/\d+/)
    if (m) return parseInt(m[0], 10)
    const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
    return map[s] || 0
  }
```

**中文数字转换：**
- 先尝试匹配阿拉伯数字
- 再查表转换中文数字（一到十）
- 支持"第一天"和"Day 1"两种格式

```tsx
  const days: TripDay[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length
    const section = text.slice(start, end)
```

**按天切片：**
- `matches[i].index`：第 i 个匹配的起始位置
- `matches[i+1].index`：下一天的开始位置（即当前天的结束位置）
- `text.slice(start, end)`：提取当前天的文本片段

```tsx
    const morning = section.match(/(?:上午|早上|Morning)[:：]?\s*([^\n]+)/i)
    const afternoon = section.match(/(?:下午|午后|Afternoon)[:：]?\s*([^\n]+)/i)
    const evening = section.match(/(?:晚上|傍晚|Evening|Night)[:：]?\s*([^\n]+)/i)
    const hotel = section.match(/(?:住宿|酒店|民宿|Hotel|Accommodation)[:：]?\s*([^\n]+)/i)
```

**时间段提取：**
- 用正则匹配上午/下午/晚上/住宿后面的内容
- `[^\n]+`：匹配到换行符为止（单行内容）
- `(?:...)`：非捕获分组，只用于逻辑分组，不生成捕获组

```tsx
function isTripContent(content: string) {
  return /(?:第\s*[一二三四五六七八九十\d]+\s*天|Day\s*\d+)/i.test(content) &&
    /(?:上午|下午|晚上|Morning|Afternoon|Evening|行程|景点|住宿|酒店)/i.test(content)
}
```

**行程内容检测：**
- 必须同时满足两个条件：
  1. 包含天数标记（第 X 天 / Day N）
  2. 包含行程相关关键词（上午/下午/晚上/行程/景点/住宿/酒店）
- 防止普通对话被误判为行程

```tsx
function ActivityDetails({ activity, timeSlot }: { activity: TripActivity; timeSlot: string }) {
  const [showDetails, setShowDetails] = useState(false)
  const icon = timeSlot === 'morning' ? '🌅' : timeSlot === 'afternoon' ? '🌇' : '🌙'
```

**ActivityDetails 组件：**
- 根据时间段显示不同 emoji 图标
- `showDetails` 控制展开/折叠详情

```tsx
function processMessageContent(content: string, isUserMessage: boolean = false): React.ReactNode {
  const imageRegex = /@image:([^\s]+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<MarkdownRenderer key={`text-${lastIndex}`} content={content.slice(lastIndex, match.index)} darkMode={isUserMessage} />)
    }
    const src = resolveCoverSrc(match[1])
    parts.push(<img key={`img-${match.index}`} src={src} alt="行程图片" loading="lazy" onError={onImgErrorUseFallback} className="mt-2 max-h-64 rounded-lg border border-gray-200 object-cover" />)
    lastIndex = match.index + match[0].length
  }
```

**processMessageContent 详解（混合内容渲染）：**
- 正则 `/@image:([^\s]+)/g`：匹配 `@image:url` 格式的图片标记
- `RegExpExecArray`：正则 exec 的返回类型，包含匹配文本和捕获组
- 循环处理：文本片段 → 图片 → 文本片段 → 图片...
- `lastIndex` 跟踪已处理到的位置
- `key={`text-${lastIndex}`}`：React 列表渲染需要唯一 key

```tsx
export default function AssistantPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const destination = searchParams.get('destination')
    if (destination) {
      setInput(`我想去${destination}旅行，帮我规划一份3天的行程`)
    }
  }, [searchParams])
```

**URL 参数处理：**
- 从其他页面跳转到 AI 助手时，可以带 `?destination=杭州` 参数
- 自动填充输入框，实现"一键规划"

```tsx
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; createdAt: number; msgs: ChatMsg[] }>>([])
  const [sessionId, setSessionId] = useState<string>(() => uid())
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: uid(), role: 'assistant', content: '您好！我是小游，您的专属旅行规划师。有什么旅行计划我可以帮您规划吗？', createdAt: Date.now() },
  ])
```

**核心状态：**
- `input`：输入框内容
- `sending`：是否正在发送/等待回复
- `abortController`：用于中断进行中的请求
- `backendOk`：后端健康状态（null=未知, true=正常, false=异常）
- `sessions`：历史会话列表
- `sessionId`：当前会话 ID，懒初始化（`() => uid()`）
- `msgs`：当前会话的消息列表，默认有一条欢迎语

```tsx
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
```

**滚动控制：**
- `bottomRef`：指向聊天区域底部的 div，用于自动滚动到底部
- `chatContainerRef`：指向聊天容器，用于控制滚动
- `autoScrollEnabled`：用户手动向上滚动时，暂停自动滚动

```tsx
  useEffect(() => {
    if (!autoScrollEnabled) return
    const container = chatContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight })
    }
  }, [autoScrollEnabled, msgs.length, streamText.length, sending])
```

**自动滚动：**
- 依赖项：`msgs.length`（新消息）、`streamText.length`（流式输出更新）、`sending`（发送状态变化）
- 当有新内容时，自动滚动到底部
- 如果用户手动向上滚动（`autoScrollEnabled = false`），则不自动滚动

```tsx
  useEffect(() => {
    try {
      const raw = localStorage.getItem('assistant_sessions_v1')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const next = parsed.filter((s) => s && Array.isArray(s.msgs)).slice(0, 10).map((s) => ({
        id: String(s.id || uid()),
        title: String(s.title || '对话'),
        createdAt: Number(s.createdAt || Date.now()),
        msgs: s.msgs as ChatMsg[],
      }))
      if (!next.length) return
      setSessions(next)
      const latest = next[0]
      setSessionId(latest.id)
      setMsgs(latest.msgs)
      setStreamMsgId(null)
      setStreamText('')
    } catch { /* ignore */ }
  }, [])
```

**历史会话加载：**
- 从 `localStorage` 读取 `assistant_sessions_v1`
- 防御性编程：
  - `if (!raw)`：没有数据直接返回
  - `if (!Array.isArray(parsed))`：防止数据格式错误
  - `.filter((s) => s && Array.isArray(s.msgs))`：过滤无效会话
  - `.slice(0, 10)`：最多保留 10 条
  - `try/catch`：任何错误都不阻塞页面渲染
- 恢复最近会话：`next[0]` 是最新的（按时间排序）

```tsx
  useEffect(() => {
    if (!streamMsgId) return
    const full = msgs.find((m) => m.id === streamMsgId)?.content ?? ''
    if (!full) return
    if (streamText.length >= full.length) { setStreamMsgId(null); return }
    const step = full.length > 600 ? 12 : full.length > 200 ? 4 : 2
    const t = window.setTimeout(() => {
      setStreamText(full.slice(0, Math.min(full.length, streamText.length + step)))
    }, 14)
    return () => window.clearTimeout(t)
  }, [streamMsgId, streamText, msgs])
```

**打字机动画详解：**
- `streamMsgId`：当前正在打字机效果显示的消息 ID
- `full`：消息的完整内容
- `streamText`：当前显示的内容（逐步增加）
- 自适应步长：
  - 内容 > 600 字：每次跳 12 个字符（长内容加速）
  - 内容 > 200 字：每次跳 4 个字符
  - 其他：每次跳 2 个字符
- 间隔 14ms：约 71 帧/秒，看起来流畅
- `return () => window.clearTimeout(t)`：清理函数，防止组件卸载后还执行 setState

```tsx
  function buildSessionTitle(messages: ChatMsg[]) {
    const firstUser = messages.find((m) => m.role === 'user')
    const t = firstUser?.content?.trim() || '新对话'
    return t.length > 20 ? t.slice(0, 20) + '…' : t
  }
```

**会话标题生成：**
- 取第一条用户消息作为标题
- 超过 20 字截断，加省略号

```tsx
  function persistSession(nextMsgs: ChatMsg[], title?: string) {
    const now = Date.now()
    const id = sessionId || uid()
    const nextTitle = title || buildSessionTitle(nextMsgs)
    const nextSession = { id, title: nextTitle, createdAt: now, msgs: nextMsgs }
    setSessionId(id)
    setSessions((prev) => {
      const merged = [nextSession, ...prev.filter((s) => s.id !== id)].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
      try { localStorage.setItem('assistant_sessions_v1', JSON.stringify(merged)) } catch { /* ignore */ }
      return merged
    })
  }
```

**会话持久化：**
- `setSessions((prev) => {...})`：函数式更新，基于旧状态计算新状态
- 去重：`prev.filter((s) => s.id !== id)` 移除同 ID 的旧记录
- 排序：`b.createdAt - a.createdAt` 降序排列（新的在前）
- 限制：`slice(0, 10)` 最多保留 10 条
- `try/catch`：localStorage 可能满或不可用，静默失败

```tsx
  async function onSend() {
    const text = input.trim()
    if (!text || sending) return
    setAutoScrollEnabled(true)
    setSending(true)
    const controller = new AbortController()
    setAbortController(controller)
    setInput('')
    setStreamMsgId(null)
    setStreamText('')
    setAgentTools([])
```

**发送前准备：**
- 重置所有相关状态
- `new AbortController()`：创建可中断的请求控制器

```tsx
    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, createdAt: Date.now() }
    const nextMsgs = [...msgs, userMsg]
    setMsgs(nextMsgs)

    const assistantId = uid()
    setMsgs(prev => [...prev, { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }])
    setStreamMsgId(assistantId)
```

**消息创建：**
- 先添加用户消息
- 再添加一条空的 AI 消息（占位），后续流式更新其内容
- `assistantId`：AI 消息的唯一 ID，用于后续更新

```tsx
    let accContent = ''

    try {
      const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'
      const res = await fetch(`${backendBase}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ messages: nextMsgs.map(({ role, content }) => ({ role, content })) }),
      })
```

**SSE 请求：**
- `signal: controller.signal`：将 AbortController 绑定到请求，可调用 `controller.abort()` 中断
- `body`：只发送 `role` 和 `content`，过滤掉其他字段（如 `id`、`createdAt`）

```tsx
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('无法读取响应')

      const decoder = new TextDecoder()
      let buffer = ''
```

**ReadableStream 读取准备：**
- `res.body?.getReader()`：获取响应体的读取器（`?.` 可选链，body 可能为 null）
- `TextDecoder()`：将 Uint8Array 字节流解码为字符串
- `buffer`：行缓冲区，处理跨块的不完整行

```tsx
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
```

**流式读取循环：**
- `reader.read()`：异步读取一块数据
- `done` 为 true 时流结束
- `decoder.decode(value, { stream: true })`：`stream: true` 表示数据可能不完整，保留不完整字符的状态
- `lines.pop()`：最后一行可能不完整，保留到下一次循环

```tsx
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const rawData = line.slice(6).trim()
          if (!rawData) continue
          let event: any
          try { event = JSON.parse(rawData) } catch { continue }
```

**SSE 行解析：**
- SSE 格式：`data: {"type": "content", "data": "..."}\n\n`
- `line.startsWith('data: ')`：只处理 data 行
- `line.slice(6)`：去掉 `data: ` 前缀
- `JSON.parse(rawData)`：解析 JSON，失败则跳过

```tsx
          if (event.type === 'content') {
            accContent += event.data
            setMsgs(prev => prev.map(m => m.id === assistantId ? { ...m, content: accContent } : m))
          } else if (event.type === 'thinking') {
            setAgentTools(prev => [...prev, { tool: event.tool, label: event.label, status: 'thinking' }])
          } else if (event.type === 'tool_result') {
            setAgentTools(prev => prev.map(t =>
              t.tool === event.tool && t.status === 'thinking' ? { ...t, status: 'done' } : t
            ))
          } else if (event.type === 'done') { break }
          else if (event.type === 'error') { throw new Error(event.message || 'Agent 执行出错') }
        }
      }
```

**事件类型处理：**
- `content`：累加内容到 `accContent`，更新消息状态
- `thinking`：AI 正在调用工具，显示工具状态
- `tool_result`：工具调用完成，更新状态为 done
- `done`：流结束
- `error`：抛出错误，进入 catch 块

```tsx
      const finalContent = accContent || '(未收到回复)'
      const assistantMsg: ChatMsg = { id: assistantId, role: 'assistant', content: finalContent, createdAt: Date.now() }
      setMsgs(prev => prev.map(m => m.id === assistantId ? { ...m, content: finalContent } : m))
      setBackendOk(true)
      persistSession([...nextMsgs, assistantMsg])
      saveConversationToDB(userMsg, assistantMsg)
```

**消息完成处理：**
- 确保最终内容写入消息
- `persistSession`：保存到 localStorage
- `saveConversationToDB`：异步保存到后端数据库（不阻塞）

```tsx
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      const rawMsg = e?.message || '未知错误'
      const errContent = '😅 ' + rawMsg
      setMsgs(prev => prev.map(m => m.id === assistantId ? { ...m, content: errContent } : m))
    } finally {
      setSending(false)
      setAbortController(null)
      setTimeout(() => setAgentTools([]), 3000)
    }
  }
```

**错误处理：**
- `AbortError`：用户主动中断，不显示错误
- 其他错误：显示错误信息
- `finally`：无论成功失败，都重置发送状态
- `setTimeout(() => setAgentTools([]), 3000)`：3 秒后清除工具状态指示器

```tsx
  const groupedByDay = useMemo(() => {
    const map = new Map<number, any[]>()
    for (const it of msgs[msgs.length - 1]?.planItems || []) {
      const day = Number(it.day_number || 1)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(it)
    }
    const days = Array.from(map.keys()).sort((a, b) => a - b)
    return days.map((d) => ({
      day: d,
      items: (map.get(d) || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))
  }, [msgs])
```

**行程分组（useMemo）：**
- `useMemo`：缓存计算结果，只在 `msgs` 变化时重新计算
- `Map<number, any[]>`：按 day_number 分组
- `Array.from(map.keys()).sort((a, b) => a - b)`：按键（天数）排序
- `(a.sort_order ?? 0) - (b.sort_order ?? 0)`：按 sort_order 排序，`??` 空值合并运算符

---

## 十一、登录页

### 11.1 app/login/page.tsx

```tsx
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useUserStore()
  const returnUrl = searchParams.get('returnUrl') || '/'
```

**returnUrl：**
- 从 URL 参数读取 `returnUrl`，登录成功后跳转回原页面
- 例如从购物车跳转来登录，登录后自动回到购物车

```tsx
  const [mode, setMode] = useState<'username' | 'email' | 'phone'>('username')
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
```

**三模式登录：**
- `mode`：当前登录方式（用户名/邮箱/手机号）
- 三种方式共用同一个 password 字段

```tsx
  const validate = () => {
    if (mode === 'username' && !form.username.trim()) return '请输入用户名'
    if (mode === 'email' && !form.email.trim()) return '请输入邮箱'
    if (mode === 'phone' && !form.phone.trim()) return '请输入手机号'
    if (!form.password) return '请输入密码'
    return null
  }
```

**表单验证：**
- 根据当前 mode 验证对应字段
- 返回错误信息或 null（无错误）

```tsx
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const error = validate()
    if (error) { toast.error(error); return }

    try {
      setLoading(true)
      const payload =
        mode === 'username'
          ? { username: form.username.trim(), password: form.password }
          : mode === 'email'
          ? { email: form.email.trim().toLowerCase(), password: form.password }
          : { phone: form.phone.trim(), password: form.password }

      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
```

**登录请求：**
- 根据 mode 构造不同的请求体
- `email.trim().toLowerCase()`：邮箱统一转小写，避免大小写不一致

```tsx
      if (res.status === 401) {
        const msg = data?.error || ''
        if (msg.includes('密码')) {
          toast.error('密码错误，请重试')
        } else if (msg.includes('不存在') || msg.includes('not found')) {
          toast.error('账号不存在，请检查输入或前往注册')
        } else if (msg.includes('手机') || msg.includes('phone')) {
          toast.error('手机号未注册，请先注册')
        } else {
          toast.error('登录失败，请检查账号和密码')
        }
        return
      }
```

**401 错误细化：**
- 根据后端返回的错误信息，给出更友好的提示
- 比直接显示"登录失败"用户体验更好

```tsx
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `登录失败 (${res.status})`)
      }
      if (!data?.token || !data?.user) throw new Error('登录返回数据不完整')

      localStorage.setItem('auth_token', data.token)
      login(data.user)
      toast.success('登录成功！')
      router.push(returnUrl)
```

**登录成功：**
- 保存 token 到 localStorage
- 调用 Zustand 的 `login` 方法更新全局状态
- 跳转到 `returnUrl`

---

## 十二、注册页

### 12.1 app/register/page.tsx

```tsx
function InputField({
  label, fieldKey, icon: Icon, type = 'text', value, onChange, onBlur,
  placeholder, autoComplete, error, required = false, optional = false,
}: { ... }) {
  const hasError = error && value && value.length > 0
  const hasSuccess = !error && value.trim() && value.length >= (fieldKey === 'username' ? 3 : fieldKey === 'nickname' ? 2 : 1)
  const showIcon = hasError || hasSuccess
```

**InputField 组件：**
- 独立定义在组件外部，避免每次渲染重新创建
- `hasError`：有错误且已输入内容时显示红色边框
- `hasSuccess`：无错误且满足最小长度时显示绿色边框
- 不同字段有不同的最小长度要求

```tsx
      <input
        type={type}
        className={`h-12 w-full rounded-xl border-2 bg-white text-gray-900 text-base transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
          hasError
            ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
            : hasSuccess
            ? 'border-green-300 focus:border-green-400 focus:ring-green-200'
            : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-200'
        }`}
        style={{ paddingLeft: '2.5rem', paddingRight: showIcon ? '2.5rem' : '1rem' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
```

**动态样式：**
- 根据验证状态切换边框颜色：红色（错误）/ 绿色（成功）/ 灰色（默认）
- `focus:ring-2`：聚焦时显示外圈光晕
- `style={{ paddingLeft: '2.5rem' }}`：为左侧图标留出空间

```tsx
  const checkExists = async (field: string, value: string) => {
    if (!value.trim()) return
    if (field === 'username' && !/^[a-zA-Z0-9_]+$/.test(value)) return
    if (field === 'email' && !isValidEmail(value)) return
    if (field === 'phone' && value && !isValidPhone(value)) return

    try {
      const res = await fetch(`/api/users/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (data.success && data.exists && data.exists[field]) {
        const fieldNames: Record<string, string> = { username: '用户名', email: '邮箱', phone: '手机号' }
        setExistsError(prev => ({ ...prev, [field]: `该${fieldNames[field]}已被注册` }))
      } else {
        setExistsError(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors })
      }
    } catch { /* 忽略检查错误 */ }
  }
```

**实时查重：**
- `onBlur`（失去焦点）时触发，避免输入过程中频繁请求
- 先进行前端格式校验，格式不对不发请求
- `[field]: value`：动态构造请求体，如 `{ username: 'abc' }`
- `setExistsError(prev => ({ ...prev, [field]: ... }))`：更新特定字段的错误信息

```tsx
  const passwordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, text: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++

    if (score <= 2) return { level: 1, text: '弱', color: 'bg-red-500' }
    if (score <= 3) return { level: 2, text: '中等', color: 'bg-yellow-500' }
    return { level: 3, text: '强', color: 'bg-green-500' }
  }
```

**密码强度算法：**
- 5 项指标打分：
  1. 长度 >= 8
  2. 长度 >= 12
  3. 同时包含大小写字母
  4. 包含数字
  5. 包含特殊字符
- 分数 ≤2：弱（红），≤3：中等（黄），>3：强（绿）

---

## 十三、目的地页

### 13.1 app/destinations/page.tsx

```tsx
function useInfiniteScroll(callback: () => void, hasMore: boolean, loading: boolean) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const targetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (loading || !hasMore) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) callback()
      },
      { rootMargin: '100px' }
    )
    if (targetRef.current) observerRef.current.observe(targetRef.current)
    return () => { if (observerRef.current) observerRef.current.disconnect() }
  }, [callback, hasMore, loading])

  return targetRef
}
```

**useInfiniteScroll Hook 详解：**
- `IntersectionObserver`：浏览器原生 API，监测元素是否进入视口
- `rootMargin: '100px'`：提前 100px 触发，实现"接近底部时自动加载"
- `disconnect()`：清理旧观察器，防止重复注册
- 返回 `targetRef`：绑定到"加载更多"提示元素

```tsx
  const [tab, setTab] = useState<'spots' | 'products'>(initialView)
  const [keyword, setKeyword] = useState(initialKeyword)
  const debouncedKeyword = useDebounce(keyword, 300)
```

**防抖搜索：**
- `useDebounce(keyword, 300)`：输入停止 300ms 后才更新 `debouncedKeyword`
- 实际搜索请求使用 `debouncedKeyword`，避免每输入一个字符就发请求

```tsx
  const syncTabToUrl = (next: 'spots' | 'products') => {
    const q = new URLSearchParams(searchParams.toString())
    if (next === 'products') q.set('view', 'products')
    else q.delete('view')
    const qs = q.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
```

**URL 同步：**
- `URLSearchParams`：安全地操作查询参数
- `router.replace`：替换当前 URL，不添加历史记录
- `scroll: false`：不滚动到页面顶部

```tsx
  const sortMeta = useMemo(() => {
    const map: Record<SortKey, { apiSort: string; order: 'asc' | 'desc' }> = {
      recommended: { apiSort: 'rating', order: 'desc' },
      rating_desc: { apiSort: 'rating', order: 'desc' },
      price_asc: { apiSort: 'price', order: 'asc' },
      price_desc: { apiSort: 'price', order: 'desc' },
      sales_desc: { apiSort: 'sales', order: 'desc' },
    }
    return map[sortKey]
  }, [sortKey])
```

**排序映射：**
- `useMemo`：缓存映射结果，避免每次渲染重新创建对象
- 将前端排序 key 转换为后端 API 参数

```tsx
  const fetchDestinations = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
    setLoadingSpots(true)
    if (!isLoadMore) setSpotsError(null)
    // ...
    setSpotsDest(prev => isLoadMore ? [...prev, ...list] : list)
    setDestTotal(total)
    setHasMoreSpots(list.length === destPerPage && pageNum * destPerPage < total)
  }, [province, debouncedKeyword, destSort])
```

**加载更多逻辑：**
- `isLoadMore`：区分初始加载和加载更多
- 初始加载：`setSpotsDest(list)` 替换数据
- 加载更多：`setSpotsDest(prev => [...prev, ...list])` 追加数据
- `hasMoreSpots`：判断是否还有更多数据（返回数量等于每页数量且未达到总数）

```tsx
  useEffect(() => {
    if (tab !== 'products') return
    const controller = new AbortController()
    async function run() {
      // ...
      const res = await fetch(`/api/products?${params.toString()}`, { cache: 'default', signal: controller.signal })
      // ...
    }
    run()
    return () => controller.abort()
  }, [tab, city, type, ratingMin, priceMin, priceMax, sortKey, page, debouncedKeyword, sortMeta])
```

**请求取消：**
- `AbortController`：在依赖项变化时取消上一个未完成的请求
- `return () => controller.abort()`：清理函数，组件卸载或依赖变化时触发
- 防止"竞态条件"：旧请求后返回，覆盖新请求的结果

---

## 十四、购物车

### 14.1 app/cart/page.tsx

```tsx
export default function CartPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useUserStore()
  const { items, removeItem, updateQuantity, clearCart, getTotal, addItem } = useCartStore()

  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasAdminToken, setHasAdminToken] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHasAdminToken(!!localStorage.getItem('admin_token'))
  }, [])
```

**mounted 状态：**
- 解决 Hydration 不匹配问题
- 服务端渲染时 `mounted = false`，客户端挂载后 `mounted = true`
- 条件渲染：`!mounted ? <骨架屏> : <真实内容>`

```tsx
  const isLoggedIn = isAuthenticated || hasAdminToken

  const total = useMemo(() => getTotal(), [items, getTotal])
```

**总价计算：**
- `useMemo`：缓存总价，只在 `items` 变化时重新计算
- `getTotal` 是 Zustand store 中的方法

```tsx
  const onCheckout = async () => {
    if (!mounted || !user?.id) {
      toast.error('请先登录')
      return
    }
    // ...
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      toast.error('未登录或 token 失效')
      router.push('/login')
      return
    }
```

**结账校验：**
- 双重检查登录状态（Zustand + localStorage）
- token 不存在时跳转登录页

```tsx
    const orderPayload = {
      order_no: `TA-${Date.now()}`,
      total_amount: total,
      payment_method: 'alipay',
      status: 'pending',
      items: items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        product_type: it.product_type,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price,
        booking_details: {},
      })),
    }
```

**订单构造：**
- `order_no`：`TA-` 前缀 + 时间戳，确保唯一性
- `booking_details: {}`：预留字段，实际预订详情在后续流程中填充

```tsx
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    })
    if (res.status === 401) {
      router.push('/login')
      return
    }
```

**401 处理：**
- token 过期或无效时跳转登录页

```tsx
    clearCart()
    toast.success('订单提交成功')
    router.push('/orders')
```

**提交成功：**
- 清空购物车
- 跳转到订单列表页

---

## 十五、订单页

### 15.1 app/orders/page.tsx

```tsx
const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待支付', color: 'text-orange-500 bg-orange-50', icon: <CreditCard className="h-4 w-4" /> },
  paid: { label: '已支付', color: 'text-green-500 bg-green-50', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: '已取消', color: 'text-gray-500 bg-gray-50', icon: <XCircle className="h-4 w-4" /> },
  refunded: { label: '已退款', color: 'text-blue-500 bg-blue-50', icon: <RefreshCw className="h-4 w-4" /> },
}
```

**状态映射表：**
- `Record<string, ...>`：索引签名，任何字符串 key 都合法
- 每个状态包含：中文标签、颜色样式、图标

```tsx
  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated) {
        setOrders([])
        setLoading(false)
        return
      }
      // ...
    }
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])
```

**eslint-disable：**
- 故意省略 `router` 等依赖，避免登录状态变化时重复加载
- 只在 `isAuthenticated` 变化时触发

```tsx
  const handlePay = async (orderId: string) => {
    // ...
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: 'alipay' }),
    })
    const data = await res.json().catch(() => ({}))

    // 模拟支付流程：直接调用回调完成支付
    const payRes = await fetch(`${API_BASE_URL}${data.payment.pay_url}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_no: data.payment.order_no }),
    })
```

**模拟支付：**
- 第一步：请求支付接口，获取支付 URL
- 第二步：直接调用支付回调，模拟支付成功（实际项目中这里应该跳转到支付宝/微信支付页面）

```tsx
    const refreshRes = await fetch(`${API_BASE_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } })
    const refreshData = await refreshRes.json().catch(() => ({}))
    if (refreshData?.success) {
      setOrders(refreshData.orders)
    }
```

**刷新列表：**
- 支付成功后重新加载订单列表，更新状态

---

## 十六、关键技术模式总结

| 技术模式 | 应用场景 | 代码示例 |
|---|---|---|
| **'use client'** | 所有使用 Hooks/Browser API 的组件 | `'use client'` |
| **useEffect + cancelled flag** | 防止组件卸载后 setState | `let cancelled = false; ... return () => { cancelled = true }` |
| **AbortController** | 取消进行中的 fetch 请求 | `const controller = new AbortController(); fetch(..., { signal: controller.signal })` |
| **useMemo** | 缓存计算结果 | `const total = useMemo(() => getTotal(), [items])` |
| **useCallback** | 缓存函数引用 | `const fetchData = useCallback(async () => {...}, [deps])` |
| **useDebounce** | 搜索输入防抖 | `const debounced = useDebounce(keyword, 300)` |
| **IntersectionObserver** | 无限滚动 | `new IntersectionObserver((entries) => {...})` |
| **SSE 流式解析** | AI 实时输出 | `reader.read() + TextDecoder + line.split('\n')` |
| **Zustand persist** | 状态持久化 | `persist(store, { name: 'user-storage' })` |
| **模块级缓存** | 页面间数据共享 | `let dataCache = { ... }` |
| **Hydration 防护** | SSR/CSR 状态不一致 | `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])` |
| **图片错误兜底** | 图片加载失败 | `<img onError={onImgErrorUseFallback} />` |
| **动态 className** | 条件样式 | `cn('base', condition && 'active')` |
| **URLSearchParams** | 安全操作查询参数 | `const q = new URLSearchParams(); q.set('key', 'value')` |

---

*报告结束*
