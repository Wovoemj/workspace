'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Book,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const faqs = [
  { q: '如何注册账号？', a: '点击页面右上角的"注册"按钮，填写手机号、验证码和密码即可完成注册。也可以使用第三方账号（微信、QQ）快速登录' },
  { q: '忘记密码怎么办？', a: '在登录页面点击"忘记密码"，输入注册手机号，通过验证码重置密码' },
  { q: '如何使用AI行程规划？', a: '登录后进入"AI助手"页面，描述您的旅行需求（目的地、时间、人数等），AI将自动为您生成专属行程规划' },
  { q: '行程规划可以修改吗？', a: '当然可以！AI生成的行程只是建议，您可以自由调整每一天的安排，添加或删除景点' },
  { q: '如何联系客服？', a: '您可以通过以下方式联系我们：1. 拨打客服热线 400-888-9999；2. 点击页面右下角在线客服；3. 发送邮件至 service@travelai.com' },
  { q: '会员等级有哪些？', a: '会员分为10个等级（LV1-LV10），从普通会员到至尊VIP。等级越高，享受的权益越多，包括专属折扣、优先客服、免费增值服务等' },
  { q: '订单如何取消和退款？', a: '在"我的订单"中找到对应订单，点击"取消"即可。退款将在1-7个工作日内原路返回支付账户。特殊商品退款规则可能不同' },
  { q: '景点门票如何购买？', a: '在景点详情页面选择日期和数量，点击"预订"即可完成购买。购票成功后，凭电子票或身份证即可入园' },
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredFaqs = searchTerm
    ? faqs.filter(f => f.q.includes(searchTerm) || f.a.includes(searchTerm))
    : faqs

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-4">
              <Book className="h-8 w-8" />
              <span className="text-xl font-bold">常见问题</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">FAQ</h1>
            <p className="text-white/80">快速找到您想了解的问题答案</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="bg-white rounded-xl border border-slate-200 p-3 mb-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索问题..."
                value={searchTerm}   // value?
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-slate-700"
              />
            </div>
          </div>


          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition"
                >
                  <span className="font-medium text-slate-900 pr-4">{faq.q}</span>
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-5 pb-5 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">没有找到相关问题</p>
              <Link href="/contact" className="text-blue-600 hover:underline">联系客服获取帮助</Link>
            </div>
          )}


          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-slate-900 mb-2">没有找到答案</h3>
            <p className="text-slate-500 mb-4">我们的客服团队随时为您解</p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
              联系我们
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
