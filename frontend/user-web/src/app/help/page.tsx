'use client'

import Link from 'next/link'
import {
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  Book,
  ChevronRight,
  Search,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const categories = [
  {
    title: '账户问题',
    icon: '👤',
        items: ['如何注册账号', '忘记密码怎么?', '如何修改个人信息', '账户安全问题']
  },
  {
    title: '行程规划',
    icon: '🗺?,
    items: ['如何使用AI规划', '如何创建行程', '如何添加景点', '行程如何分享']
  },
  {
    title: '订单问题',
    icon: '📦',
        items: ['如何下单', '支付方式有哪?', '如何取消订单', '退款流?']
  },
  {
    title: '会员服务',
    icon: '?,
        items: ['会员等级说明', '如何升级会员', '会员权益有哪?', '积分如何使用']
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="h-8 w-8" />
              <span className="text-xl font-bold">客户支持</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">帮助中心</h1>
            <p className="text-white/80">遇到问题？我们随时为您服</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索您遇到的问题..."
                className="flex-1 outline-none text-slate-700"
              />
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                搜索
              </button>
            </div>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <Link href="/contact"
              className="bg-white rounded-xl border border-slate-200 p-5 text-center hover:shadow-md hover:border-blue-300 transition">
              <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-bold text-slate-900 mb-1">在线客服</h3>
              <p className="text-sm text-slate-500">24小时随时咨询</p>
            </Link>
            <a href="tel:400-888-9999"
              className="bg-white rounded-xl border border-slate-200 p-5 text-center hover:shadow-md hover:border-blue-300 transition">
              <Phone className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-bold text-slate-900 mb-1">电话咨询</h3>
              <p className="text-sm text-slate-500">400-888-9999</p>
            </a>
            <Link href="/help/faq"
              className="bg-white rounded-xl border border-slate-200 p-5 text-center hover:shadow-md hover:border-blue-300 transition">
              <Book className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-bold text-slate-900 mb-1">常见问题</h3>
              <p className="text-sm text-slate-500">FAQ 常见问题解答</p>
            </Link>
          </div>


          <h2 className="text-xl font-bold text-slate-900 mb-6">问题分类</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {categories.map((cat) => (
              <div key={cat.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{cat.icon}</span>
                  <h3 className="font-bold text-slate-900 text-lg">{cat.title}</h3>
                </div>
                <ul className="space-y-2">
                  {cat.items.map((item) => (
                    <li key={item}>
                      <Link href="/help/faq"
                        className="flex items-center justify-between text-slate-600 hover:text-blue-600 transition py-1">
                        <span>{item}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>


          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">更多帮助</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/help/faq" className="flex items-center gap-3 bg-white rounded-xl p-4 hover:shadow-md transition">
                <Book className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">常见问题</h3>
                  <p className="text-sm text-slate-500">FAQ</p>
                </div>
              </Link>
              <Link href="/contact" className="flex items-center gap-3 bg-white rounded-xl p-4 hover:shadow-md transition">
                <MessageCircle className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">意见反馈</h3>
                  <p className="text-sm text-slate-500">提交建议</p>
                </div>
              </Link>
              <Link href="/feedback" className="flex items-center gap-3 bg-white rounded-xl p-4 hover:shadow-md transition">
                <Mail className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">联系邮箱</h3>
                  <p className="text-sm text-slate-500">service@travelai.com</p>
                </div>
              </Link>
              <a href="tel:400-888-9999" className="flex items-center gap-3 bg-white rounded-xl p-4 hover:shadow-md transition">
                <Phone className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">客服热线</h3>
                  <p className="text-sm text-slate-500">400-888-9999</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
