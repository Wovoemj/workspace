'use client'

import Link from 'next/link'
import {
  Shield,
  Lock,
  Eye,
  FileText,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="bg-gradient-to-r from-emerald-600 to-green-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8" />
              <span className="text-xl font-bold">法律声明</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">隐私政策</h1>
            <p className="text-white/80">最后更新日期：2026???/p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="prose prose-slate max-w-none">
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. 信息收集</h2>
              <p className="text-slate-600 mb-4">
                我们收集您主动提供的信息，包括注册信息（姓名、手机号、电子邮箱）、行程偏好、搜索记录等，以为您提供个性化的旅行服务?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">2. 信息使用</h2>
              <p className="text-slate-600 mb-4">
                我们使用收集的信息用于：提供和改进我们的服务、个性化推荐、处理订单、发送服务通知、用户账户管理等?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">3. 信息保护</h2>
              <p className="text-slate-600 mb-4">
                我们采用业界领先的安全技术保护您的个人信息，包括数据加密、访问控制、安全审计等措施，确保您的信息安全?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">4. 信息共享</h2>
              <p className="text-slate-600 mb-4">
                除以下情况外，我们不会与第三方共享您的个人信息：
              </p>
              <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-1">
                <li>获得您的明确同意</li>
                <li>履行法定义务</li>
                <li>提供服务的必要（如酒店、航空公司等合作伙伴</li>
              </ul>

              <h2 className="text-xl font-bold text-slate-900 mb-4">5. 您的权利</h2>
              <p className="text-slate-600 mb-4">
                您有权访问、更正、删除您的个人信息。如需行使这些权利，请联系我们的客服团队?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Cookie政策</h2>
              <p className="text-slate-600 mb-4">
                我们使用Cookie技术来改善用户体验，记住您的偏好设置。您可以通过浏览器设置禁用Cookie，但这可能影响部分功能?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">7. 联系我们</h2>
              <p className="text-slate-600 mb-4">
                如您对隐私政策有任何疑问，请联系我们?br />
                邮箱：privacy@travelai.com<br />
                电话?00-888-9999
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-blue-600 hover:underline">返回首页</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
