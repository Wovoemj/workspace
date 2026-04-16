// 导入 Next.js 的元数据类型定义
import { Metadata, Viewport } from 'next'
// 导入全局样式文件
import './globals.css'

// 定义网站的元数据配置
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    template: '%s - 完美旅程',
    default: '完美旅程 - 智能旅行规划助手',
  },
  description: '发现你的完美旅程，一站式旅行规划平台。热门目的地 + 精选产品，AI驱动的智能旅行规划与个性化推荐，让旅行更轻松🌍',
  keywords: '旅行规划, 智能助手, 旅游推荐, 行程安排, 目的地推荐',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '完美旅程',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: '完美旅程 - 智能旅行规划助手',
    description: '发现你的完美旅程，一站式旅行规划平台。热门目的地 + 精选产品，AI驱动的智能旅行规划与个性化推荐，让旅行更轻松🌍',
    images: ['/api/media/fallback-hero.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '完美旅程 - 智能旅行规划助手',
    description: '发现你的完美旅程，一站式旅行规划平台。热门目的地 + 精选产品，AI驱动的智能旅行规划与个性化推荐，让旅行更轻松🌍',
  },
}

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

// 定义根布局组件
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        {/* 云朵装饰层 */}
        <div className="bg-cloud-1" aria-hidden="true" />
        <div className="bg-cloud-2" aria-hidden="true" />
        <div className="bg-cloud-3" aria-hidden="true" />
        <div className="bg-cloud-4" aria-hidden="true" />
        <div className="bg-cloud-5" aria-hidden="true" />
        
        {/* 山形波浪层 */}
        <div className="bg-mountains" aria-hidden="true" />
        
        {/* 底部波浪动画 */}
        <div className="bg-wave-1" aria-hidden="true" />
        <div className="bg-wave-2" aria-hidden="true" />
        <div className="bg-wave-3" aria-hidden="true" />
        
        {children}
      </body>
    </html>
  )
}
