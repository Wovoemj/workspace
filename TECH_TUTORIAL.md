# 智能旅游助手 - 技术从零教学文档

> **目标读者**：有编程基础但对该技术栈不熟悉的朋友  
> **学习方式**：建议边看边敲，每一节都有可直接运行的代码示例

---

## 目录

- [一、前端技术](#一前端技术)
- [二、后端技术](#二后端技术)
- [三、数据库与缓存](#三数据库与缓存)
- [四、AI 与大模型](#四ai-与大模型)
- [五、基础设施与部署](#五基础设施与部署)
- [六、安全相关技术](#六安全相关技术)
- [七、监控与日志](#七监控与日志)

---

## 一、前端技术

### 1. React 基础

#### 1.1 什么是 React

React 是 Facebook 开发的用于构建用户界面的 JavaScript 库。核心思想：**把界面拆成独立的小块（组件），每个块管理自己的状态和逻辑**。

#### 1.2 环境准备

```bash
# 需要 Node.js 18+，检查版本
node -v

# 创建 React 项目（使用 Vite，比 create-react-app 更快）
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

#### 1.3 核心概念一：JSX

JSX 是在 JavaScript 中写 HTML 的语法。它会被编译为 `React.createElement`。

```tsx
// App.tsx
function App() {
  const name = "旅游助手";
  return (
    <div className="app">
      <h1>欢迎来到 {name}</h1>
      <p>今天是 {new Date().toLocaleDateString()}</p>
    </div>
  );
}

export default App;
```

**JSX 规则**：
- 只能有一个根元素（或用 `<>` `</>` Fragment）
- 用 `{}` 插入 JavaScript 表达式
- `class` 要写成 `className`，`for` 要写成 `htmlFor`
- 标签必须闭合：`<img />`、`<br />`

#### 1.4 核心概念二：组件

组件就是函数，接收 `props`（属性），返回 JSX。

```tsx
// 定义组件
interface ButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;  // ? 表示可选
}

function Button({ text, onClick, disabled = false }: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className="btn"
    >
      {text}
    </button>
  );
}

// 使用组件
function App() {
  return (
    <Button 
      text="点击预订" 
      onClick={() => alert("已预订！")} 
    />
  );
}
```

#### 1.5 核心概念三：useState（状态）

`useState` 让组件"记住"数据，数据变化时界面自动更新。

```tsx
import { useState } from "react";

function Counter() {
  // count 是当前值，setCount 是修改函数
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>当前计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(count - 1)}>-1</button>
      <button onClick={() => setCount(0)}>重置</button>
    </div>
  );
}
```

**重要规则**：
- 永远不要直接修改 state：`count++` ❌，用 `setCount(count + 1)` ✅
- `useState` 只能在组件顶层调用，不能在 if/for 里面

#### 1.6 核心概念四：useEffect（副作用）

副作用是指不直接参与 UI 渲染的操作：数据获取、订阅、手动修改 DOM。

```tsx
import { useState, useEffect } from "react";

function DestinationList() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);

  // 组件挂载时执行
  useEffect(() => {
    // 模拟 API 请求
    fetch("/api/destinations")
      .then(res => res.json())
      .then(data => {
        setDestinations(data);
        setLoading(false);
      });

    // 可选：清理函数，组件卸载时执行
    return () => {
      console.log("组件卸载，清理资源");
    };
  }, []); // 空数组 = 只在挂载时执行一次

  if (loading) return <p>加载中...</p>;

  return (
    <ul>
      {destinations.map(dest => (
        <li key={dest.id}>{dest.name}</li>
      ))}
    </ul>
  );
}
```

**依赖数组的含义**：
- `[]`：只在挂载和卸载时执行
- `[count]`：count 变化时执行
- 不写：每次渲染都执行（通常不推荐）

---

### 2. TypeScript

#### 2.1 什么是 TypeScript

TypeScript = JavaScript + 类型系统。代码写完后先经过类型检查，没问题再编译成 JavaScript 运行。

#### 2.2 基础类型

```typescript
// 基本类型
let name: string = "北京";
let age: number = 3000;
let isCapital: boolean = true;

// 数组
let cities: string[] = ["北京", "上海", "广州"];
let scores: Array<number> = [85, 90, 78];

// 任意类型（少用）
let anything: any = 4;
anything = "字符串";
anything = true;

// 未知类型（比 any 安全）
let unknownValue: unknown = 4;
// unknownValue.toFixed(); // ❌ 报错，需要先类型收窄

// 空值
function logMessage(): void {
  console.log("Hello");
}

// 永远不返回
function throwError(): never {
  throw new Error("崩溃");
}
```

#### 2.3 接口（Interface）

接口定义对象的结构契约。

```typescript
// 定义景点类型
interface Destination {
  id: number;
  name: string;
  city: string;
  rating: number;
  description?: string;  // ? 表示可选
  tags: string[];
}

// 使用
const forbiddenCity: Destination = {
  id: 1,
  name: "故宫",
  city: "北京",
  rating: 4.9,
  tags: ["历史", "宫殿", "世界文化遗产"]
};

// 函数参数类型
function printDestination(dest: Destination): void {
  console.log(`${dest.name} - ${dest.city} - 评分: ${dest.rating}`);
}
```

#### 2.4 联合类型与交叉类型

```typescript
// 联合类型：可以是 A 或 B
type Status = "pending" | "approved" | "rejected";
let orderStatus: Status = "pending";
// orderStatus = "unknown"; // ❌ 报错

// 交叉类型：同时具有 A 和 B 的属性
interface Person {
  name: string;
}

interface Employee {
  employeeId: number;
}

type Staff = Person & Employee;

const staff: Staff = {
  name: "张三",
  employeeId: 1001
};
```

#### 2.5 泛型（Generic）

泛型让代码可以处理多种类型，同时保持类型安全。

```typescript
// 不用泛型：只能处理 string
function identityString(arg: string): string {
  return arg;
}

// 用泛型：可以处理任意类型
function identity<T>(arg: T): T {
  return arg;
}

let output1 = identity<string>("Hello");  // T 是 string
let output2 = identity<number>(123);      // T 是 number

// 泛型在 React 中最常见的用法
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 获取景点列表的响应
type DestinationResponse = ApiResponse<Destination[]>;
```

---

### 3. Next.js 14

#### 3.1 什么是 Next.js

Next.js 是 React 的全栈框架，在 React 基础上增加了：
- 文件系统路由
- 服务端渲染（SSR）和静态生成（SSG）
- API 路由
- 图片/字体优化
- 中间件

#### 3.2 创建项目

```bash
npx create-next-app@latest travel-web
# 选项：TypeScript / ESLint / Tailwind CSS / App Router / 改 src 目录

cd travel-web
npm run dev
# 打开 http://localhost:3000
```

#### 3.3 文件系统路由（App Router）

Next.js 14 使用 `app` 目录作为路由系统，**文件夹 = 路由**。

```
app/
├── layout.tsx        # 根布局，所有页面共享
├── page.tsx          # 首页，对应 /
├── loading.tsx       # 全局加载状态
├── error.tsx         # 全局错误处理
├── destinations/
│   ├── page.tsx      # 景点列表页，对应 /destinations
│   ├── [id]/
│   │   └── page.tsx  # 景点详情页，对应 /destinations/123
│   └── layout.tsx    # 景点模块的共享布局
├── trip/
│   └── page.tsx      # 行程页，对应 /trip
└── api/              # API 路由（可选，通常后端独立）
```

#### 3.4 页面组件

```tsx
// app/destinations/page.tsx
// 服务端组件（默认），可以直接获取数据
async function getDestinations() {
  const res = await fetch("http://localhost:5001/api/destinations", {
    next: { revalidate: 60 } // 60 秒后重新验证缓存
  });
  return res.json();
}

export default async function DestinationsPage() {
  const destinations = await getDestinations();

  return (
    <main>
      <h1>热门景点</h1>
      <div className="grid grid-cols-3 gap-4">
        {destinations.map((dest: any) => (
          <div key={dest.id} className="card">
            <h2>{dest.name}</h2>
            <p>{dest.city}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
```

#### 3.5 布局（Layout）

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <header>导航栏</header>
        <main>{children}</main>  {/* 页面内容插到这里 */}
        <footer>页脚</footer>
      </body>
    </html>
  );
}
```

#### 3.6 客户端组件

默认所有组件都是服务端组件。如果需要浏览器 API（`window`、`localStorage`）或 React 状态，需要加 `"use client"`。

```tsx
"use client";  // 必须是文件第一行

import { useState } from "react";

export default function LikeButton() {
  const [liked, setLiked] = useState(false);

  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? "❤️ 已收藏" : "🤍 收藏"}
    </button>
  );
}
```

---

### 4. Tailwind CSS

#### 4.1 什么是 Tailwind

Tailwind 是一个工具类（Utility）CSS 框架。不提供 `.btn-primary` 这种预置组件，而是提供 `.px-4`、`.bg-blue-500` 这种细粒度类，让你在 HTML 上直接拼样式。

#### 4.2 基础用法

```html
<!-- 传统 CSS -->
<button class="btn-primary">点击</button>

<!-- Tailwind：工具类堆砌 -->
<button class="
  px-6 py-3           /* 内边距 */
  bg-blue-500         /* 背景色 */
  text-white          /* 文字颜色 */
  font-semibold       /* 字重 */
  rounded-lg          /* 圆角 */
  hover:bg-blue-600   /* 悬停状态 */
  transition-colors   /* 过渡动画 */
  shadow-md           /* 阴影 */
">
  点击预订
</button>
```

#### 4.3 常用工具类速查

| 类别 | 类名示例 | 效果 |
|------|---------|------|
| 布局 | `flex`, `grid`, `block`, `hidden` | 显示方式 |
| 间距 | `p-4`, `px-2`, `my-6`, `gap-4` | 内边距/外边距/间隙 |
| 尺寸 | `w-full`, `h-64`, `max-w-md` | 宽高 |
| 颜色 | `bg-red-500`, `text-gray-700` | 背景/文字色 |
| 字体 | `text-lg`, `font-bold`, `leading-relaxed` | 字号/字重/行高 |
| 边框 | `rounded`, `border`, `border-gray-300` | 圆角/边框 |
| 效果 | `shadow-lg`, `opacity-50`, `blur-sm` | 阴影/透明/模糊 |
| 响应式 | `md:flex`, `lg:grid-cols-3` | 断点适配 |

#### 4.4 响应式设计

Tailwind 使用移动优先的断点前缀：

```tsx
<div className="
  grid grid-cols-1    /* 手机：单列 */
  md:grid-cols-2      /* 平板：两列 */
  lg:grid-cols-3      /* 电脑：三列 */
  gap-4
">
  {/* 景点卡片 */}
</div>
```

断点：
- `sm:` >= 640px
- `md:` >= 768px
- `lg:` >= 1024px
- `xl:` >= 1280px

#### 4.5 自定义配置

```js
// tailwind.config.ts
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",
        secondary: "#64748b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
};
```

---

### 5. Zustand

#### 5.1 安装

```bash
npm install zustand
```

#### 5.2 创建 Store

```typescript
import { create } from "zustand";

// 定义状态类型
interface AuthState {
  user: { id: number; name: string } | null;
  isLoggedIn: boolean;
  login: (user: { id: number; name: string }) => void;
  logout: () => void;
}

// 创建 store
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  // set 函数用于更新状态
  login: (user) => set({ user, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false }),
}));

export default useAuthStore;
```

#### 5.3 在组件中使用

```tsx
import useAuthStore from "@/store/auth";

function Header() {
  // 只订阅需要的状态，状态变化时组件才会重渲染
  const { user, isLoggedIn, logout } = useAuthStore();

  return (
    <header>
      {isLoggedIn ? (
        <div>
          <span>欢迎，{user?.name}</span>
          <button onClick={logout}>退出</button>
        </div>
      ) : (
        <a href="/login">登录</a>
      )}
    </header>
  );
}
```

#### 5.4 持久化（存到 localStorage）

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist<AuthState>(
    (set) => ({
      user: null,
      isLoggedIn: false,
      login: (user) => set({ user, isLoggedIn: true }),
      logout: () => set({ user: null, isLoggedIn: false }),
    }),
    {
      name: "auth-storage", // localStorage 的 key
    }
  )
);
```

---

### 6. React Query (TanStack Query)

#### 6.1 安装

```bash
npm install @tanstack/react-query
```

#### 6.2 配置 Provider

```tsx
// app/layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
      retry: 2, // 失败重试 2 次
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### 6.3 基础查询 useQuery

```tsx
import { useQuery } from "@tanstack/react-query";

function DestinationList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["destinations"], // 缓存的标识符
    queryFn: async () => {
      const res = await fetch("/api/destinations");
      if (!res.ok) throw new Error("获取失败");
      return res.json();
    },
  });

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>报错: {error.message}</div>;

  return (
    <ul>
      {data.map((dest) => (
        <li key={dest.id}>{dest.name}</li>
      ))}
    </ul>
  );
}
```

#### 6.4 带参数的查询

```tsx
function DestinationDetail({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ["destination", id], // id 变化时自动重新请求
    queryFn: async () => {
      const res = await fetch(`/api/destinations/${id}`);
      return res.json();
    },
  });

  return <div>{data?.name}</div>;
}
```

#### 6.5 修改数据 useMutation

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function AddFavoriteButton({ destinationId }: { destinationId: number }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        body: JSON.stringify({ destinationId }),
      });
      return res.json();
    },
    onSuccess: () => {
      // 成功后刷新收藏列表缓存
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      alert("收藏成功！");
    },
  });

  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? "收藏中..." : "❤️ 收藏"}
    </button>
  );
}
```

---

### 7. Axios

#### 7.1 安装

```bash
npm install axios
```

#### 7.2 基础用法

```typescript
import axios from "axios";

// GET 请求
const response = await axios.get("/api/destinations", {
  params: { city: "北京", page: 1 }, // 查询参数
});
console.log(response.data);

// POST 请求
const result = await axios.post("/api/trips", {
  title: "北京3日游",
  days: 3,
  destinations: [1, 2, 3],
});
```

#### 7.3 创建实例（推荐）

```typescript
// lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001",
  timeout: 10000, // 10 秒超时
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器：每次请求自动加 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，跳登录页
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### 7.4 使用封装后的 API

```typescript
import api from "@/lib/api";

// 不需要写完整 URL，不需要手动加 Token
const { data } = await api.get("/api/destinations");
await api.post("/api/trips", { title: "新行程" });
```

---

### 8. Framer Motion

#### 8.1 安装

```bash
npm install framer-motion
```

#### 8.2 基础动画

```tsx
import { motion } from "framer-motion";

function FadeInBox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}   // 初始状态
      animate={{ opacity: 1, y: 0 }}    // 动画目标
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="p-6 bg-white rounded-xl shadow-lg"
    >
      <h2>动画卡片</h2>
      <p>我从下方淡入上来的</p>
    </motion.div>
  );
}
```

#### 8.3 列表动画

```tsx
import { motion } from "framer-motion";

function DestinationCards({ items }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }} //  stagger 效果
          whileHover={{ scale: 1.05 }}        // 悬停放大
          className="card"
        >
          <h3>{item.name}</h3>
        </motion.div>
      ))}
    </div>
  );
}
```

#### 8.4 页面切换动画

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

function Tabs() {
  const [tab, setTab] = useState("home");

  return (
    <div>
      <button onClick={() => setTab("home")}>首页</button>
      <button onClick={() => setTab("about")">关于</button>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {tab === "home" ? <HomePage /> : <AboutPage />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

---

### 9. React Hook Form + Zod

#### 9.1 安装

```bash
npm install react-hook-form zod @hookform/resolvers
```

#### 9.2 完整表单示例

```tsx
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// 1. 用 Zod 定义校验规则
const schema = z.object({
  email: z
    .string()
    .min(1, "邮箱不能为空")
    .email("请输入有效的邮箱地址"),
  password: z
    .string()
    .min(6, "密码至少 6 位")
    .max(20, "密码最多 20 位"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次密码不一致",
  path: ["confirmPassword"],
});

// 2. 推导 TypeScript 类型
type FormData = z.infer<typeof schema>;

export default function RegisterForm() {
  const {
    register,           // 绑定输入框
    handleSubmit,       // 处理提交
    formState: { errors, isSubmitting }, // 错误信息和提交状态
  } = useForm<FormData>({
    resolver: zodResolver(schema), // 用 Zod 做校验
  });

  const onSubmit = async (data: FormData) => {
    console.log("提交的数据:", data);
    // 调 API...
    await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input
          {...register("email")}
          placeholder="邮箱"
          className="input"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>

      <div>
        <input
          {...register("password")}
          type="password"
          placeholder="密码"
          className="input"
        />
        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password.message}</p>
        )}
      </div>

      <div>
        <input
          {...register("confirmPassword")}
          type="password"
          placeholder="确认密码"
          className="input"
        />
        {errors.confirmPassword && (
          <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn">
        {isSubmitting ? "注册中..." : "注册"}
      </button>
    </form>
  );
}
```

---

## 二、后端技术

### 10. Flask

#### 10.1 环境准备

```bash
# 创建虚拟环境
python -m venv venv

# Windows 激活
venv\Scripts\activate

# macOS/Linux 激活
source venv/bin/activate

# 安装 Flask
pip install Flask
```

#### 10.2 最小应用

```python
# app.py
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello, Travel Assistant!"

@app.route("/api/destinations")
def get_destinations():
    destinations = [
        {"id": 1, "name": "故宫", "city": "北京"},
        {"id": 2, "name": "外滩", "city": "上海"},
    ]
    return jsonify(destinations)

@app.route("/api/destinations/<int:id>")
def get_destination(id):
    return jsonify({"id": id, "name": "故宫", "city": "北京"})

@app.route("/api/destinations", methods=["POST"])
def create_destination():
    data = request.get_json()
    return jsonify({"id": 3, "name": data["name"]}), 201

if __name__ == "__main__":
    app.run(debug=True, port=5001)
```

启动：`python app.py`，访问 `http://localhost:5001`

#### 10.3 请求对象

```python
from flask import request

@app.route("/api/search", methods=["GET"])
def search():
    # 获取查询参数 /api/search?city=北京&keyword=故宫
    city = request.args.get("city")
    keyword = request.args.get("keyword", "")  # 带默认值

    # 获取 POST JSON 数据
    data = request.get_json()

    # 获取表单数据
    name = request.form.get("name")

    # 获取上传的文件
    file = request.files.get("image")

    # 获取请求头
    token = request.headers.get("Authorization")

    return jsonify({"city": city, "keyword": keyword})
```

#### 10.4 蓝图（Blueprint）

蓝图用于模块化组织路由。

```python
# routes/destinations.py
from flask import Blueprint, jsonify

destinations_bp = Blueprint("destinations", __name__, url_prefix="/api/destinations")

@destinations_bp.route("/")
def list_destinations():
    return jsonify([])

@destinations_bp.route("/<int:id>")
def get_destination(id):
    return jsonify({"id": id})

# app.py
from flask import Flask
from routes.destinations import destinations_bp

app = Flask(__name__)
app.register_blueprint(destinations_bp)
```

#### 10.5 错误处理

```python
from flask import jsonify
from werkzeug.exceptions import NotFound

@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "message": "资源不存在"}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"success": False, "message": "服务器内部错误"}), 500
```

---

### 11. SQLAlchemy

#### 11.1 安装

```bash
pip install SQLAlchemy
```

#### 11.2 定义模型

```python
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime

Base = declarative_base()

# 用户表
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系：一个用户有多条行程
    trips = relationship("Trip", back_populates="user", lazy="dynamic")

# 景点表
class Destination(Base):
    __tablename__ = "destinations"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    city = Column(String(50), nullable=False)
    description = Column(Text)
    rating = Column(Float, default=5.0)
    ticket_price = Column(Float)
    open_time = Column(String(100))
    image_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

# 行程表
class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String(20), default="draft")  # draft, active, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trips")
    items = relationship("TripItem", back_populates="trip", cascade="all, delete")

# 行程项表
class TripItem(Base):
    __tablename__ = "trip_items"

    id = Column(Integer, primary_key=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    destination_id = Column(Integer, ForeignKey("destinations.id"))
    day_number = Column(Integer, nullable=False)
    title = Column(String(200))
    description = Column(Text)
    start_time = Column(String(10))
    end_time = Column(String(10))
    sort_order = Column(Integer, default=0)

    trip = relationship("Trip", back_populates="items")
```

#### 11.3 数据库操作

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 创建引擎（SQLite 示例）
engine = create_engine("sqlite:///travel.db", echo=True)  # echo=True 打印 SQL
Base.metadata.create_all(engine)  # 创建所有表

# 创建会话
Session = sessionmaker(bind=engine)
session = Session()

# === 增 ===
new_user = User(username="zhangsan", email="zs@example.com", password_hash="xxx")
session.add(new_user)
session.commit()

# === 查 ===
# 查单个
user = session.query(User).filter_by(username="zhangsan").first()

# 查列表
users = session.query(User).all()

# 条件查询
beijing_dests = session.query(Destination).filter(Destination.city == "北京").all()

# 排序 + 分页
dests = session.query(Destination) \
    .order_by(Destination.rating.desc()) \
    .offset(0) \
    .limit(10) \
    .all()

# === 改 ===
user = session.query(User).filter_by(id=1).first()
user.email = "new@example.com"
session.commit()

# === 删 ===
user = session.query(User).filter_by(id=1).first()
session.delete(user)
session.commit()
```

#### 11.4 连接池配置

```python
engine = create_engine(
    "sqlite:///travel.db",
    pool_size=20,        # 连接池大小
    max_overflow=30,     # 最大溢出连接
    pool_recycle=3600,   # 1 小时回收连接
    pool_pre_ping=True,  # 使用前检查连接是否有效
)
```

---

### 12. Flask-SQLAlchemy

#### 12.1 安装与配置

```bash
pip install Flask-SQLAlchemy
```

```python
# app.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# 配置数据库
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///travel.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # 关闭信号追踪，节省内存

db = SQLAlchemy(app)
```

#### 12.2 定义模型（Flask 风格）

```python
from app import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
```

#### 12.3 在请求中使用

```python
from flask import jsonify
from app import app, db
from models import User, Destination

@app.route("/api/users/<int:id>")
def get_user(id):
    user = User.query.get_or_404(id)  # 找不到自动返回 404
    return jsonify(user.to_dict())

@app.route("/api/users", methods=["POST"])
def create_user():
    data = request.get_json()

    user = User(
        username=data["username"],
        email=data["email"],
        password_hash=generate_password_hash(data["password"]),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201
```

#### 12.4 数据库迁移（Flask-Migrate）

```bash
pip install Flask-Migrate
```

```python
from flask_migrate import Migrate

migrate = Migrate(app, db)
```

```bash
# 初始化迁移仓库
flask db init

# 生成迁移脚本
flask db migrate -m "create users table"

# 执行迁移
flask db upgrade

# 回滚
flask db downgrade
```

---

### 13. Flask-CORS

#### 13.1 安装

```bash
pip install Flask-CORS
```

#### 13.2 全局配置

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# 允许所有来源（开发环境）
CORS(app)

# 或只允许特定来源
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "https://yourdomain.com"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,  # 允许携带 Cookie
    }
})
```

#### 13.3 局部配置

```python
from flask_cors import cross_origin

@app.route("/api/public")
@cross_origin(origins="*")
def public():
    return jsonify({"message": "公开接口"})

@app.route("/api/private")
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
def private():
    return jsonify({"message": "需要认证的接口"})
```

---

### 14. PyJWT

#### 14.1 安装

```bash
pip install PyJWT
```

#### 14.2 生成和验证 Token

```python
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app

SECRET_KEY = "your-secret-key-change-in-production"

# 生成 Token
def generate_token(user_id: int, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.utcnow() + timedelta(days=7),  # 7 天过期
        "iat": datetime.utcnow(),  # 签发时间
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

# 验证 Token
def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token 已过期")
    except jwt.InvalidTokenError:
        raise ValueError("无效的 Token")

# Flask 装饰器：保护需要登录的路由
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "message": "缺少认证信息"}), 401

        token = auth_header.split(" ")[1]
        try:
            payload = verify_token(token)
            request.current_user = payload  # 把用户信息挂到请求上
        except ValueError as e:
            return jsonify({"success": False, "message": str(e)}), 401

        return f(*args, **kwargs)
    return decorated
```

#### 14.3 使用

```python
from flask import jsonify

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    # 验证用户名密码...
    token = generate_token(user_id=1, username=data["username"])
    return jsonify({"success": True, "token": token})

@app.route("/api/profile")
@login_required
def profile():
    user = request.current_user
    return jsonify({"user_id": user["user_id"], "username": user["username"]})
```

---

### 15. Werkzeug

Werkzeug 是 Flask 的底层依赖，通常不需要直接调用，但以下几个功能比较常用：

#### 15.1 密码哈希

```python
from werkzeug.security import generate_password_hash, check_password_hash

# 注册用户时：把明文密码变成哈希
password = "123456"
hashed = generate_password_hash(password, method="pbkdf2:sha256")
# 结果：pbkdf2:sha256:600000$abc123$def456...

# 登录验证时：检查输入的密码是否匹配
is_valid = check_password_hash(hashed, "123456")  # True
is_valid = check_password_hash(hashed, "wrong")   # False
```

#### 15.2 安全文件名

```python
from werkzeug.utils import secure_filename

# 防止用户上传恶意文件名
filename = "../../../etc/passwd"
safe_name = secure_filename(filename)  # "etc_passwd"

filename = "我的照片.jpg"
safe_name = secure_filename(filename)  # "我的照片.jpg"
```

---

## 三、数据库与缓存

### 16. SQLite

#### 16.1 特点

- 零配置：不需要安装服务器，一个 `.db` 文件就是整个数据库
- 零管理：不需要创建用户、分配权限
- 便携性：数据库就是文件，直接复制就能备份/迁移
- 适用场景：开发环境、测试环境、小型应用、嵌入式设备

#### 16.2 基本操作（命令行）

```bash
# 进入 SQLite 命令行
sqlite3 travel.db

# 查看所有表
.tables

# 查看表结构
.schema users

# 执行 SQL
SELECT * FROM users LIMIT 5;
INSERT INTO users (username, email) VALUES ('test', 'test@example.com');

# 退出
.quit
```

#### 16.3 Python 操作

```python
import sqlite3

# 连接数据库（不存在则自动创建）
conn = sqlite3.connect("travel.db")
conn.row_factory = sqlite3.Row  # 让查询结果可以通过列名访问
cursor = conn.cursor()

# 创建表
cursor.execute("""
    CREATE TABLE IF NOT EXISTS destinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        rating REAL DEFAULT 5.0
    )
""")

# 插入
cursor.execute(
    "INSERT INTO destinations (name, city, rating) VALUES (?, ?, ?)",
    ("故宫", "北京", 4.9)
)
conn.commit()

# 查询
cursor.execute("SELECT * FROM destinations WHERE city = ?", ("北京",))
rows = cursor.fetchall()
for row in rows:
    print(dict(row))

# 关闭
conn.close()
```

#### 16.4 上下文管理器（推荐）

```python
import sqlite3

with sqlite3.connect("travel.db") as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
# 自动 commit 和 close
```

---

### 17. MySQL

#### 17.1 安装（Docker）

```bash
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=travel_assistant \
  -p 3306:3306 \
  mysql:8.0
```

#### 17.2 Python 连接

```bash
pip install pymysql
```

```python
import pymysql

conn = pymysql.connect(
    host="localhost",
    port=3306,
    user="root",
    password="rootpassword",
    database="travel_assistant",
    charset="utf8mb4",
    cursorclass=pymysql.cursors.DictCursor,  # 返回字典格式
)

with conn.cursor() as cursor:
    cursor.execute("SELECT * FROM destinations WHERE city = %s", ("北京",))
    result = cursor.fetchall()
    for row in result:
        print(row["name"])

conn.close()
```

#### 17.3 SQLAlchemy 连接 MySQL

```python
# URI 格式：mysql+pymysql://用户:密码@主机:端口/数据库
app.config["SQLALCHEMY_DATABASE_URI"] = \
    "mysql+pymysql://root:rootpassword@localhost:3306/travel_assistant"
```

---

### 18. Redis

#### 18.1 安装（Docker）

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### 18.2 Python 操作

```bash
pip install redis
```

```python
import redis

# 连接
r = redis.Redis(
    host="localhost",
    port=6379,
    db=0,           # 数据库编号（0-15）
    decode_responses=True,  # 自动把 bytes 解码为字符串
)

# === String ===
r.set("name", "旅游助手")           # 设置
r.set("token:123", "abc", ex=3600)  # 设置并指定 3600 秒过期
name = r.get("name")                # 获取

# === Hash（哈希表）===
r.hset("user:1", mapping={
    "name": "张三",
    "email": "zs@example.com",
    "level": "gold",
})
user = r.hgetall("user:1")          # 获取全部字段
email = r.hget("user:1", "email")   # 获取单个字段

# === List（列表）===
r.lpush("recent:views", "故宫")     # 左侧插入
r.lpush("recent:views", "长城")
views = r.lrange("recent:views", 0, 9)  # 获取前 10 个

# === Set（集合）===
r.sadd("favorites:1", "故宫", "长城", "西湖")
has_it = r.sismember("favorites:1", "故宫")  # 判断是否在集合中

# === Sorted Set（有序集合）===
r.zadd("ranking", {"故宫": 1000, "长城": 800, "西湖": 600})
top3 = r.zrevrange("ranking", 0, 2, withscores=True)

# === 过期时间 ===
r.expire("name", 60)        # 60 秒后过期
r.ttl("name")               # 查看剩余生存时间
r.delete("name")            # 删除
```

#### 18.3 在项目中的常见用法

```python
import redis
import json

r = redis.Redis(decode_responses=True)

# 1. 缓存景点详情
def get_destination_cached(destination_id):
    cache_key = f"dest:{destination_id}"
    cached = r.get(cache_key)

    if cached:
        return json.loads(cached)  # 命中缓存，直接返回

    # 缓存未命中，查数据库
    dest = db.session.get(Destination, destination_id)
    if dest:
        data = dest.to_dict()
        r.setex(cache_key, 300, json.dumps(data))  # 缓存 5 分钟
        return data
    return None

# 2. 限流（1 分钟内最多 10 次请求）
def is_rate_limited(client_ip):
    key = f"rate_limit:{client_ip}"
    current = r.incr(key)
    if current == 1:
        r.expire(key, 60)  # 第一次设置 60 秒过期
    return current > 10

# 3. 分布式锁（防止重复提交）
def acquire_lock(lock_name, timeout=10):
    return r.set(lock_name, "1", nx=True, ex=timeout)

def release_lock(lock_name):
    r.delete(lock_name)
```

---

## 四、AI 与大模型

### 19. 大语言模型（LLM）API 调用

#### 19.1 基本原理

大语言模型是一个"文字接龙"机器：你给它一段文字（prompt），它预测接下来最可能出现的文字，不断重复直到生成完。

#### 19.2 调用智谱 API 示例

```python
import requests
import json

ZHIPU_API_KEY = "your-api-key"
ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"

def chat_with_ai(user_message: str) -> str:
    headers = {
        "Authorization": f"Bearer {ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }

    data = {
        "model": "glm-4.6v",
        "messages": [
            {"role": "system", "content": "你是专业的旅游规划助手。"},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,  # 创造性：0-1，越高越有创意
        "max_tokens": 2000,  # 最多生成多少字
    }

    response = requests.post(
        f"{ZHIPU_BASE_URL}/chat/completions",
        headers=headers,
        json=data,
        timeout=60,
    )
    response.raise_for_status()

    result = response.json()
    return result["choices"][0]["message"]["content"]

# 使用
reply = chat_with_ai("北京3天怎么玩？喜欢历史文化。")
print(reply)
```

#### 19.3 多模态（图片理解）

```python
import base64

def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def analyze_image(image_path: str, question: str) -> str:
    image_base64 = encode_image(image_path)

    headers = {
        "Authorization": f"Bearer {ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }

    data = {
        "model": "glm-4.6v",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                    {"type": "text", "text": question},
                ],
            },
        ],
    }

    response = requests.post(
        f"{ZHIPU_BASE_URL}/chat/completions",
        headers=headers,
        json=data,
    )
    return response.json()["choices"][0]["message"]["content"]
```

---

### 20. Prompt Engineering（提示工程）

#### 20.1 什么是 Prompt

Prompt 是你发给 AI 的指令。AI 的输出质量 80% 取决于 prompt 怎么写。

#### 20.2 基础技巧

**1. 角色设定**

```
❌ 差的 prompt：
"给我写个北京旅游攻略"

✅ 好的 prompt：
"你是一位有20年经验的北京本地导游，熟悉各个景点的历史背景和最佳游览时间。
请为第一次来北京的游客写一份3日游攻略。"
```

**2. 结构化输出**

```
请按以下 JSON 格式输出：
{
  "days": [
    {
      "day": 1,
      "theme": "皇家文化",
      "activities": [
        {
          "time": "09:00-12:00",
          "spot": "景点名称",
          "description": "做什么",
          "tips": "注意事项"
        }
      ]
    }
  ],
  "budget_estimate": "预算估算",
  "transportation_tips": "交通建议"
}
```

**3. Few-Shot 示例**

```
请根据用户的偏好推荐景点。以下是示例：

输入：喜欢自然风光，预算500元
输出：["九寨沟", "张家界", "桂林"]

输入：喜欢历史文化，预算200元
输出：["故宫", "兵马俑", "敦煌莫高窟"]

输入：{user_input}
输出：
```

**4. Chain-of-Thought（思维链）**

```
请一步一步思考，然后给出答案。

问题：北京到上海的高铁票价是553元，飞机票价通常800-1200元。
如果时间充裕（有2天以上），推荐高铁还是飞机？为什么？

思考过程：
1.
2.
3.

最终建议：
```

#### 20.3 项目中的 Prompt 模板

```python
TRIP_PLAN_PROMPT = """你是一位专业的旅行规划师。

用户需求：
- 目的地：{destination}
- 天数：{days}天
- 偏好：{preferences}
- 预算：{budget}

请生成详细的行程安排，要求：
1. 每天安排 2-4 个景点，避免过于紧凑
2. 考虑景点之间的距离和交通时间
3. 包含用餐建议
4. 标注每个景点的预计游览时长

请严格按以下 JSON 格式输出，不要输出其他内容：
{{
  "title": "行程标题",
  "days": [
    {{
      "day": 1,
      "theme": "当日主题",
      "activities": [
        {{
          "time": "时间段",
          "name": "景点/活动名称",
          "description": "详细描述",
          "duration": "预计时长",
          "tips": "实用建议"
        }}
      ]
    }}
  ]
}}
"""

def generate_trip_plan(destination: str, days: int, preferences: str, budget: str):
    prompt = TRIP_PLAN_PROMPT.format(
        destination=destination,
        days=days,
        preferences=preferences,
        budget=budget,
    )
    # 调 API...
```

---

## 五、基础设施与部署

### 21. Nginx

#### 21.1 安装

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# macOS
brew install nginx

# Docker
docker run -d -p 80:80 --name nginx nginx:alpine
```

#### 21.2 基础配置

```nginx
# /etc/nginx/nginx.conf 或 conf.d/default.conf

server {
    listen 80;
    server_name localhost;

    # 前端静态资源
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 支持 WebSocket（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态文件直接由 Nginx 处理（不经过 Flask）
    location /static/ {
        alias /var/www/travel-assistant/static/;
        expires 30d;  # 缓存 30 天
    }

    # 图片资源
    location /images/ {
        alias /var/www/travel-assistant/images/;
        expires 30d;
    }
}
```

#### 21.3 HTTPS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
    }
}

# HTTP 自动跳转 HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### 21.4 常用命令

```bash
sudo nginx -t           # 测试配置是否正确
sudo nginx -s reload    # 重新加载配置（不中断服务）
sudo nginx -s stop      # 停止
sudo nginx              # 启动
```

---

### 22. Docker

#### 22.1 核心概念

| 概念 | 说明 | 类比 |
|------|------|------|
| **镜像（Image）** | 只读的模板，包含运行应用所需的一切 | 类（Class） |
| **容器（Container）** | 镜像的运行实例 | 对象（Object） |
| **Dockerfile** | 定义镜像构建步骤的脚本 | 食谱 |
| **卷（Volume）** | 持久化数据存储，容器删除后数据还在 | 外接硬盘 |

#### 22.2 Dockerfile 示例

```dockerfile
# 使用 Python 官方镜像作为基础
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 5001

# 启动命令
CMD ["python", "app.py"]
```

#### 22.3 常用命令

```bash
# 构建镜像（. 表示当前目录）
docker build -t travel-assistant:latest .

# 运行容器
# -d: 后台运行
# -p: 端口映射（主机端口:容器端口）
# -v: 卷映射
# --name: 容器名称
docker run -d -p 5001:5001 --name travel-app travel-assistant:latest

# 查看运行中的容器
docker ps

# 查看日志
docker logs -f travel-app

# 进入容器内部
docker exec -it travel-app /bin/bash

# 停止容器
docker stop travel-app

# 删除容器
docker rm travel-app

# 删除镜像
docker rmi travel-assistant:latest
```

---

### 23. Docker Compose

#### 23.1 配置文件

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "5001:5001"
    environment:
      - FLASK_ENV=production
      - DATABASE_URI=mysql+pymysql://root:rootpassword@db:3306/travel
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
      - ./scenic_images:/app/scenic_images

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: travel
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  mysql_data:
```

#### 23.2 常用命令

```bash
# 启动所有服务（-d 后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 重启某个服务
docker-compose restart app

# 停止所有服务
docker-compose down

# 停止并删除卷（清空数据库数据）
docker-compose down -v

# 重新构建镜像
docker-compose up -d --build
```

---

### 24. Waitress

#### 24.1 为什么不用 Flask 开发服务器

Flask 的 `app.run()` 是**单线程、单进程**的，一次只能处理一个请求，且存在安全隐患，**绝对不能用于生产**。

#### 24.2 Waitress 使用

```bash
pip install waitress
```

```python
# app.py（生产入口）
from flask import Flask
from waitress import serve

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello, Production!"

if __name__ == "__main__":
    # 生产环境
    serve(app, host="0.0.0.0", port=5001, threads=16)

    # 开发环境
    # app.run(debug=True, port=5001)
```

#### 24.3 参数说明

```python
serve(
    app,
    host="0.0.0.0",      # 监听所有网卡（外网可访问）
    port=5001,           # 端口
    threads=16,          # 线程数（并发处理能力）
    channel_timeout=30,  # 连接超时时间
    cleanup_interval=10, # 清理间隔
)
```

---

### 25. Git

#### 25.1 基础配置

```bash
# 配置用户名和邮箱
git config --global user.name "你的名字"
git config --global user.email "your@email.com"

# 查看配置
git config --list
```

#### 25.2 常用工作流程

```bash
# 1. 克隆仓库
git clone https://github.com/username/travel-assistant.git
cd travel-assistant

# 2. 创建并切换到新分支
git checkout -b feature/user-profile

# 3. 修改代码后查看状态
git status

# 4. 添加修改到暂存区
git add .                    # 添加所有修改
git add src/app/profile.tsx  # 添加单个文件

# 5. 提交修改
git commit -m "feat: 添加用户资料页面"

# 6. 推送到远程
git push origin feature/user-profile

# 7. 切回主分支并拉取最新代码
git checkout main
git pull origin main

# 8. 合并分支
git merge feature/user-profile
```

#### 25.3 提交规范（Conventional Commits）

```bash
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

#### 25.4 实用命令

```bash
# 查看提交历史
git log --oneline --graph

# 撤销工作区的修改（未 add）
git checkout -- filename

# 撤销暂存区的修改（已 add 未 commit）
git reset HEAD filename

# 修改最后一次提交
git commit --amend

# 查看某个文件的修改历史
git log -p filename

# 储藏当前修改（临时保存）
git stash
git stash pop  # 恢复
```

---

## 六、安全相关技术

### 26. 密码哈希

#### 26.1 为什么不能用明文存密码

- 数据库泄露 → 所有用户密码暴露
- 很多用户多个网站用同一套密码 → 连锁反应

#### 26.2 Werkzeug 密码工具

```python
from werkzeug.security import generate_password_hash, check_password_hash

# 注册：生成哈希
password = "123456"
hashed = generate_password_hash(password)
# 结果示例：pbkdf2:sha256:600000$abc123$def456...
# 格式说明：算法:哈希方式:迭代次数$盐值$哈希值

# 验证：检查密码
is_valid = check_password_hash(hashed, "123456")  # True
is_valid = check_password_hash(hashed, "wrong")   # False
```

#### 26.3 完整注册/登录流程

```python
from werkzeug.security import generate_password_hash, check_password_hash

# ========== 注册 ==========
def register(username, password):
    hashed_password = generate_password_hash(password)
    user = User(username=username, password_hash=hashed_password)
    db.session.add(user)
    db.session.commit()
    return user

# ========== 登录 ==========
def login(username, password):
    user = User.query.filter_by(username=username).first()
    if not user:
        return None, "用户不存在"

    if not check_password_hash(user.password_hash, password):
        return None, "密码错误"

    return user, None
```

---

### 27. CORS（跨域资源共享）

#### 27.1 浏览器的同源策略

浏览器默认禁止一个源的网页向另一个源的服务器发送请求。

**什么是同源**：协议 + 域名 + 端口 完全相同。

```
http://localhost:3000  →  http://localhost:5001  ❌ 不同源（端口不同）
https://a.com          →  https://b.com          ❌ 不同源（域名不同）
http://localhost:3000  →  http://localhost:3000  ✅ 同源
```

#### 27.2 解决方案

服务器在响应头中告诉浏览器"我允许这个来源访问我"：

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

#### 27.3 Flask-CORS 配置

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# 开发环境：允许所有
CORS(app)

# 生产环境：只允许特定域名
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://yourdomain.com"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
    }
})
```

#### 27.4 预检请求（Preflight）

对于非简单请求（PUT/DELETE/自定义头），浏览器会先发送一个 `OPTIONS` 预检请求，询问服务器是否允许。

```
OPTIONS /api/users/1 HTTP/1.1
Origin: http://localhost:3000
Access-Control-Request-Method: PUT
```

服务器返回允许的方法，浏览器确认后才发送真正的请求。

---

### 28. 参数化查询（防 SQL 注入）

#### 28.1 什么是 SQL 注入

攻击者在输入框中填入 SQL 代码，如果直接拼接到查询语句中执行，就会执行恶意代码。

```python
# ❌ 危险代码：直接拼接
user_input = "' OR 1=1 --"
query = f"SELECT * FROM users WHERE username = '{user_input}'"
# 实际执行的 SQL：
# SELECT * FROM users WHERE username = '' OR 1=1 --'
# 1=1 永远为真，-- 注释掉后面的内容，结果返回所有用户！
```

#### 28.2 参数化查询

```python
# ✅ 安全做法：参数化查询
user_input = "' OR 1=1 --"

# SQLite
cursor.execute("SELECT * FROM users WHERE username = ?", (user_input,))

# MySQL
cursor.execute("SELECT * FROM users WHERE username = %s", (user_input,))

# SQLAlchemy（自动参数化）
User.query.filter_by(username=user_input).first()
```

参数化查询把 SQL 语句和数据分开传给数据库，数据库会把数据当成**纯文本**处理，不会当作 SQL 代码执行。

---

## 七、监控与日志

### 29. Prometheus

#### 29.1 基本原理

Prometheus 采用**拉取（Pull）**模式：你的应用暴露一个 `/metrics` HTTP 端点，Prometheus 定期（默认 15 秒）来抓取数据。

#### 29.2 Python 集成

```bash
pip install prometheus-client
```

```python
from flask import Flask
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

app = Flask(__name__)

# 定义指标
REQUEST_COUNT = Counter(
    "app_request_count",
    "请求总数",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "app_request_latency_seconds",
    "请求处理时间",
    ["endpoint"]
)

@app.before_request
def before_request():
    from time import time
    request.start_time = time()

@app.after_request
def after_request(response):
    from time import time
    latency = time() - request.start_time

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.endpoint or "unknown",
        status=response.status_code
    ).inc()

    REQUEST_LATENCY.labels(
        endpoint=request.endpoint or "unknown"
    ).observe(latency)

    return response

@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}
```

#### 29.3 Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "travel-assistant"
    static_configs:
      - targets: ["localhost:5001"]
```

#### 29.4 常用指标类型

| 类型 | 说明 | 示例 |
|------|------|------|
| Counter | 只增不减的计数器 | 请求总数、错误总数 |
| Gauge | 可增可减的数值 | 当前在线人数、内存使用量 |
| Histogram | 采样分布（桶统计） | 请求延迟分布 |
| Summary | 分位数统计 | 95% 的请求延迟 |

---

### 30. Grafana

#### 30.1 安装

```bash
# Docker
docker run -d \
  -p 3000:3000 \
  --name grafana \
  -e GF_SECURITY_ADMIN_PASSWORD=admin123 \
  grafana/grafana
```

访问 `http://localhost:3000`，用户名 `admin`，密码 `admin123`。

#### 30.2 添加数据源

1. 左侧菜单 → Configuration → Data Sources
2. Add data source → Prometheus
3. URL 填 `http://localhost:9090`
4. Save & Test

#### 30.3 创建仪表盘

1. Create → Dashboard → Add new panel
2. 在 Query 中输入 PromQL：

```promql
# 每秒请求数
rate(app_request_count[5m])

# 平均响应时间
histogram_quantile(0.95, rate(app_request_latency_seconds_bucket[5m]))

# 错误率
rate(app_request_count{status=~"4..|5.."}[5m])
```

3. 选择图表类型（折线图/柱状图/仪表盘）
4. 保存面板

#### 30.4 设置告警

1. 左侧菜单 → Alerting → Notification channels
2. 添加钉钉/邮件/Slack 通知渠道
3. 在面板中设置告警规则：
   - 当 `错误率 > 1%` 持续 5 分钟时告警
   - 当 `95% 延迟 > 500ms` 时告警

---

## 附录：学习路径建议

### 第 1 周：前端基础
- React 基础（组件、props、useState、useEffect）
- TypeScript 基础类型和接口
- Tailwind CSS 工具类使用

### 第 2 周：前端进阶
- Next.js 路由和页面
- Zustand 状态管理
- React Query 数据获取
- Axios API 调用

### 第 3 周：后端基础
- Flask 路由和请求处理
- SQLAlchemy 模型定义和 CRUD
- Flask-SQLAlchemy 集成

### 第 4 周：后端进阶
- PyJWT 认证
- Redis 缓存
- Docker 容器化
- Nginx 反向代理

### 第 5 周：AI 集成
- 大模型 API 调用
- Prompt Engineering 技巧
- 多模态（图片理解）

### 第 6 周：部署与监控
- Docker Compose 编排
- 生产环境部署
- Prometheus + Grafana 监控

---

**文档说明**：本文档所有代码示例均为教学用途，可直接复制运行。生产环境请根据实际情况调整配置（特别是密钥、密码等敏感信息）。
