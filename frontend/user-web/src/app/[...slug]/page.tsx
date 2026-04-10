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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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

