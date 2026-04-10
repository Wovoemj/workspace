# 智能旅游助手设计规范 v1.0

> 完整的设计系统文档，涵盖色彩、字体、间距、组件等全维度

---

## 一、设计原则

| 原则 | 定义 | 应用 |
|------|------|------|
| **清晰** | 信息层级一目了然 | 标题>副标题>正文>辅助，对比度符合WCAG 2.1 |
| **高效** | 减少用户决策时间 | 搜索预设、智能推荐、一键操作 |
| **信任** | 专业感建立安全感 | 统一图片质量、真实评分、透明价格 |
| **愉悦** | 微交互带来惊喜 | 流畅动效、即时反馈、成就感知 |

---

## 二、色彩系统

### 2.1 主色板

```
┌─────────────────────────────────────────────────────────┐
│  品牌主色 Primary    │  #1E40AF  │  深蓝  │  按钮/强调   │
│  品牌辅色 Secondary  │  #0EA5E9  │  天蓝  │  链接/标签   │
│  功能成功 Success    │  #10B981  │  翠绿  │  可用/完成   │
│  功能警告 Warning    │  #F59E0B  │  琥珀  │  提示/限量   │
│  功能错误 Error      │  #EF4444  │  正红  │  错误/售罄   │
│  中性色 Neutral      │  #64748B  │  Slate │  正文/图标   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 灰度色阶（用于文字、背景、边框）

| Token | 色值 | 用途 |
|-------|------|------|
| gray-900 | #0F172A | 主标题、重要文字 |
| gray-700 | #334155 | 正文、按钮文字 |
| gray-500 | #64748B | 次要信息、占位符 |
| gray-300 | #CBD5E1 | 禁用状态、分割线 |
| gray-100 | #F1F5F9 | 卡片背景、hover态 |
| gray-50 | #F8FAFC | 页面底色、输入框背景 |
| white | #FFFFFF | 卡片、浮层、反白文字 |

### 2.3 色彩使用规则

**✅ 正确用法**
- 主按钮：bg-primary + white文字，hover时加深10%
- 价格标签：warning色背景 + white文字，右上角定位
- 评分：star用warning填充，数字用gray-700

**❌ 错误用法**
- 避免在同一页面使用超过3种主色
- 避免在图片上使用半透明遮罩+彩色文字
- 避免用error色做非错误状态的强调

---

## 三、字体系统

### 3.1 字体栈

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
```

### 3.2 字号规范（基于16px基准）

| 层级 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| Display | 48px | 700 | 1.1 | 首页大标题 |
| H1 | 32px | 700 | 1.2 | 页面标题 |
| H2 | 24px | 600 | 1.3 | 区块标题（如"热门目的地"）|
| H3 | 18px | 600 | 1.4 | 卡片标题 |
| Body | 16px | 400 | 1.5 | 正文、按钮 |
| Small | 14px | 400 | 1.5 | 辅助信息、标签 |
| Tiny | 12px | 400 | 1.4 | 时间戳、法律声明 |

### 3.3 字体颜色映射

```
Display/H1/H2:  gray-900
H3/Body:        gray-700
Small/Tiny:     gray-500
反白文字:        white（用于深色背景/图片遮罩）
```

---

## 四、间距系统（8px基准网格）

### 4.1 基础间距Token

| Token | 值 | 用途 |
|-------|-----|------|
| space-1 | 4px | 图标与文字间距、紧凑内边 |
| space-2 | 8px | 行内元素间距、标签间距 |
| space-3 | 12px | 卡片内部小间距 |
| space-4 | 16px | 标准内边距、表单间距 |
| space-6 | 24px | 卡片间距、区块内部 |
| space-8 | 32px | 区块标题与内容间距 |
| space-12 | 48px | 大区块分隔 |
| space-16 | 64px | 页面上下留白 |

### 4.2 布局规范

```
页面容器:  max-width: 1200px; margin: 0 auto; padding: 0 24px;
卡片网格:  gap: 24px;  4列布局（桌面）/ 2列（平板）/ 1列（手机）
区块间距:  上下各64px（space-16）
```

---

## 五、组件规范

### 5.1 导航栏（Navbar）

**结构**
```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  首页  目的地  行程规划  关于我们    [AI助手] [🔔] [🛒] [头像] │
│  ─────────────────────────────────────────────────────  │
│  高度: 64px                                             │
│  背景: white + 底部1px分割线（gray-100）                   │
│  定位: sticky top-0, z-50                               │
└─────────────────────────────────────────────────────────┘
```

**状态**
- 默认：文字gray-700，图标gray-500
- Hover：文字primary，图标gray-700
- 当前页：文字primary，底部2px primary色指示条
- 滚动后：加阴影 `shadow-sm`

### 5.2 搜索框（Search Bar）

**结构**
```
┌─────────────────────────────────────────────────────────┐
│  🔍  [输入框：想去哪里？如：成都、青海...]  │  📅 选择日期  │  [搜索] │
│  ─────────────────────────────────────────────────────  │
│  高度: 56px                                             │
│  背景: white                                            │
│  圆角: 16px（整体）/ 12px（输入框内部）                   │
│  阴影: 0 4px 20px rgba(0,0,0,0.08)                      │
└─────────────────────────────────────────────────────────┘
```

**交互**
- Focus：外框加2px primary色，阴影加深
- 输入中：下方展开"热门搜索" + "历史记录"
- 日期选择：点击后弹出日历浮层，选中日期显示为"4月15日-4月20日"

### 5.3 目的地卡片（Destination Card）

**结构**
```
┌─────────────────────────┐
│  ┌─────────────────┐    │
│  │                 │ ¥60起│  ← 价格标签：右上角，warning色，圆角4px
│  │    图片区域      │    │     图片：16:10比例，object-fit: cover
│  │   16:10 比例     │    │
│  │                 │ ★4.7│  ← 评分：左下角，白字+暗渐变遮罩
│  └─────────────────┘    │
│  丹噶尔古城              │  ← 标题：H3，gray-900，单行截断
│  西宁市 · 青海           │  ← 位置：Small，gray-500
│  ─────────────────────  │
│  门票          ¥60起     │  ← 底部：类型标签 + 价格（与右上角标签呼应）
└─────────────────────────┘
尺寸：宽280px（桌面）/ 自适应（响应式）
圆角：16px
背景：white
阴影：0 2px 8px rgba(0,0,0,0.06)
```

**状态**
| 状态 | 样式 |
|------|------|
| 默认 | 阴影0 2px 8px rgba(0,0,0,0.06) |
| Hover | translateY(-4px)，阴影0 12px 24px rgba(0,0,0,0.12)，过渡300ms ease-out |
| 按下 | translateY(-2px)，阴影减弱 |
| 加载中 | 骨架屏：gray-100背景， shimmer动画 |

**图片规范**
- 比例：16:10（宽:高）
- 处理：统一亮度+20%，饱和度+10%，确保风格一致
- 占位：加载前显示gray-100背景 + 地点图标居中

### 5.4 按钮（Button）

**类型**

| 类型 | 背景 | 文字 | 圆角 | 高度 | 用途 |
|------|------|------|------|------|------|
| Primary | primary | white | 12px | 48px | 主要操作（搜索、预订）|
| Secondary | white | primary | 12px | 40px | 次要操作（筛选、更多）|
| Ghost | transparent | gray-700 | 8px | 36px | 文字按钮（编辑、删除）|
| Icon | gray-100 | gray-700 | 50% | 40px | 图标按钮（收藏、分享）|

**交互**
- Hover：Primary加深10%，Secondary背景变gray-50
- 按下：scale(0.98)
- 禁用：opacity 0.5，cursor not-allowed

### 5.5 评分组件（Rating）

**结构**
```
★★★★★ 4.7  (2.3k条评价)
```

**规范**
- 星星：20px，warning色填充，支持半星（clip-path实现）
- 数字：16px，gray-700，精确到小数点后1位
- 评价数：14px，gray-500，括号包裹
- 空状态：灰色星星 + "暂无评分"

---

## 六、动效规范

### 6.1 过渡曲线

| 名称 | 曲线 | 用途 |
|------|------|------|
| ease-out | cubic-bezier(0,0,0.2,1) | 元素进入、展开 |
| ease-in-out | cubic-bezier(0.4,0,0.2,1) | 状态切换、hover |
| spring | cubic-bezier(0.34,1.56,0.64,1) | 弹性反馈（点赞、收藏）|

### 6.2 时长规范

| 场景 | 时长 | 说明 |
|------|------|------|
| 微交互（hover、focus） | 150ms | 即时反馈 |
| 状态切换 | 200-300ms | 自然流畅 |
| 页面过渡 | 400-500ms | 明显但不拖沓 |
| 复杂动画 | 600-800ms | 引导注意力 |

### 6.3 具体动效

**卡片Hover**
```css
.card {
  transition: transform 300ms cubic-bezier(0,0,0.2,1),
                box-shadow 300ms cubic-bezier(0,0,0.2,1);
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
}
```

**搜索框展开**
```css
.search-dropdown {
  animation: slideDown 200ms cubic-bezier(0,0,0.2,1);
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**骨架屏加载**
```css
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 七、响应式断点

| 断点 | 宽度 | 布局调整 |
|------|------|----------|
| Desktop | ≥1280px | 4列卡片，侧边栏展开 |
| Laptop | 1024-1279px | 4列卡片，紧凑间距 |
| Tablet | 768-1023px | 2列卡片，汉堡菜单 |
| Mobile | <768px | 1列卡片，底部固定导航 |

---

## 八、图片资源规范

### 8.1 尺寸标准

| 用途 | 尺寸 | 格式 | 大小 |
|------|------|------|------|
| 卡片封面 | 560×350px | WebP/JPG | <80KB |
| 详情页头图 | 1920×600px | WebP | <200KB |
| 用户头像 | 200×200px | WebP | <20KB |
| 图标 | 24×24px | SVG | - |

### 8.2 处理流程
1. 原图压缩（TinyPNG/TinyJPG）
2. 亮度+10%，对比度+5%，饱和度+8%
3. 导出WebP（质量85%），fallback JPG
4. 懒加载：loading="lazy"，占位图gray-100

---

## 九、Tailwind 配置速查

### 颜色类名
```
文字: text-primary / text-secondary / text-gray-700 / text-gray-500
背景: bg-primary / bg-secondary / bg-gray-100 / bg-white
边框: border-primary / border-gray-200
```

### 字号类名
```
text-display / text-h1 / text-h2 / text-h3 / text-body / text-small / text-tiny
```

### 间距类名
```
p-4 / px-6 / py-8 / gap-6 / space-y-4
```

### 阴影类名
```
shadow-card / shadow-card-hover / shadow-search
```

### 组件类名
```
.btn-primary / .btn-secondary / .card / .card-hover / .input / .tag-primary
```

---

## 十、交付物清单

- [x] Tailwind配置文件（tailwind.config.js）
- [x] 全局样式文件（globals.css）
- [x] 设计规范文档（DESIGN_SYSTEM.md）
- [ ] Figma源文件（组件库+页面）
- [ ] 切图资源（1x/2x/3x，WebP+PNG）
- [ ] 动效演示视频/GIF
- [ ] 标注文档（Zeplin/Figma Dev Mode）

---

**版本**: v1.0
**更新日期**: 2026-04-09
**维护者**: 智能旅游助手团队
