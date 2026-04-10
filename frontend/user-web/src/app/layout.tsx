// 导入 Next.js 的元数据类型定义
import { Metadata } from 'next'
// 导入全局样式文件
import './globals.css'

// 定义网站的元数据配置
export const metadata: Metadata = {
  // 设置元数据基础 URL，从环境变量获取或使用默认本地地址
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  // 设置页面标题配置
  title: {
    // 子页面标题模板：页面标题 - 完美旅程
    template: '%s - 完美旅程',
    // 默认标题
    default: '完美旅程 - 智能旅行规划助手',
  },
  // 设置页面描述
  description: '发现你的完美旅程，一站式旅行规划平台。热门目的地 + 精选产品，AI驱动的智能行程规划与个性化推荐，让旅行更轻松🌍',
  // 设置页面关键词
  keywords: '旅行规划, 智能助手, 旅游推荐, 行程安排, 目的地推荐',
  // 设置 Open Graph 元数据（用于社交媒体分享）
  openGraph: {
    // 设置 OG 标题
    title: '完美旅程 - 智能旅行规划助手',
    // 设置 OG 描述
    description: '发现你的完美旅程，一站式旅行规划平台。热门目的地 + 精选产品，AI驱动的智能行程规划与个性化推荐，让旅行更轻松🌍',
    // 设置 OG 图片
    images: ['/api/media/fallback-hero.webp'],
  },
  // 设置 Twitter 卡片元数据
  twitter: {
    // 设置 Twitter 卡片类型为大图
    card: 'summary_large_image',
    // 设置 Twitter 标题
    title: '完美旅程 - 智能旅行规划助手',
    // 设置 Twitter 描述
    description: '发现你的完美旅程，一站式旅行规划平台。热门目的地 + 精选产品，AI驱动的智能行程规划与个性化推荐，让旅行更轻松🌍',
  },
}

// 定义根布局组件
export default function RootLayout({
  // 接收子组件作为属性
  children,
}: {
  // 定义子组件的类型为 React 节点
  children: React.ReactNode
}) {
  // 返回 HTML 结构
  return (
    // 设置语言为简体中文
    <html lang="zh-CN">
      {/* 渲染页面内容 */}
      <body>{children}</body>
    </html>
  )
}