'use client'

import Link from 'next/link'
import {
  FileText,
  Scale,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="h-8 w-8" />
              <span className="text-xl font-bold">法律声明</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">服务条款</h1>
            <p className="text-white/80">最后更新日期：2026年4月10日</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="prose prose-slate max-w-none">
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. 服务说明</h2>
              <p className="text-slate-600 mb-4">
                智能旅游助手（以下简称"我们"）致力于为用户提供AI驱动的旅行规划、智能推荐和相关服务。使用我们的服务即表示您同意遵守本服务条款。
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">2. 用户注册</h2>
              <p className="text-slate-600 mb-4">
                您需要注册账户才能使用部分功能。注册时您应提供真实、准确的信息，并妥善保管账户信息。您理解并同意对账户下所有活动负责。
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">3. 服务使用</h2>
              <p className="text-slate-600 mb-4">
                您同意仅将服务用于合法目的，不进行任何可能损害我们或其他用户利益的行为。AI生成的内容仅供参考，实际行程安排需您自行判断?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">4. 订单与支</h2>
              <p className="text-slate-600 mb-4">
                当您通过平台预订产品或服务时，需遵守相关供应商的条款和条件。价格和 availability 可能会有所变化，我们不对第三方供应商的行为负责?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">5. 知识产权</h2>
              <p className="text-slate-600 mb-4">
                我们的服务（包括但不限于网站设计、AI算法、界面、内容）受知识产权保护。未经授权，您不得复制、修改或分发我们的内容?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">6. 免责声明</h2>
              <p className="text-slate-600 mb-4">
                我们不对以下情况承担责任：第三方供应商的服务质量、因不可抗力导致的损失、用户因依赖AI推荐而产生的损失等?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">7. 服务变更</h2>
              <p className="text-slate-600 mb-4">
                我们保留随时修改或中断服务的权利，并会提前通知用户。因服务变更导致的任何损失，我们不承担责任?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">8. 终止服务</h2>
              <p className="text-slate-600 mb-4">
                如用户违反本条款，我们有权终止其账户和服务。同时，用户也可随时注销账户?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">9. 适用法律</h2>
              <p className="text-slate-600 mb-4">
                本条款受中华人民共和国法律管辖。如发生争议，双方应友好协商解决；协商不成的，提交有管辖权的人民法院诉讼解决?
              </p>

              <h2 className="text-xl font-bold text-slate-900 mb-4">10. 联系我们</h2>
              <p className="text-slate-600">
                如您对本条款有任何疑问，请联系我们：<br />
                邮箱：legal@travelai.com<br />
                电话?00-888-9999
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="px-4 py-2 text-blue-600 hover:underline">隐私政策</Link>
            <Link href="/" className="px-4 py-2 text-blue-600 hover:underline">返回首页</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
