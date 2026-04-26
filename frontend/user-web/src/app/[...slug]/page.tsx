/**
 * =====================================================
 * 营销占位页面模块 - 捕获未匹配路由
 * =====================================================
 * 
 * 【功能说明】
 * - Next.js catch-all 路由 [...slug] 捕获所有未匹配的 URL
 * - 作为占位页面，避免 Footer 链接 404
 * - 显示当前访问的路径
 * - 提供返回首页/目的地的快捷入口
 * 
 * 【使用场景】
 * - Footer 中的营销页面链接
 * - 临时保留的页面入口
 * - 未来实现完整业务
 * 
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 */
'use client'

import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useParams } from 'next/navigation'

export default function MarketingPlaceholderPage() {
  const params = useParams<{ slug?: string[] }>()
  const path = params?.slug?.join('/') || ''

  const title = path ? `页面：${path}` : '页面'

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card p-8">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 mt-3">
              该页面暂未实现完整业务，但已为你保留入口，避免点击 Footer 链接后出现 404。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="btn btn-primary">
                返回首页
              </Link>
              <Link href="/destinations" className="btn btn-outline">
                去目的地
              </Link>
              <Link href="/assistant" className="btn btn-outline">
                AI 助手
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

