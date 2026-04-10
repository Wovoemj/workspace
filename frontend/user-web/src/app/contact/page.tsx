'use client'

import Link from 'next/link'
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock,
  Send,
  Headphones,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-blue-600 to-sky-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-4">
              <Headphones className="h-8 w-8" />
              <span className="text-xl font-bold">联系我们</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">客服中心</h1>
            <p className="text-white/80">我们随时为您提供帮助</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg transition">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">客服热线</h3>
              <p className="text-2xl font-bold text-blue-600 mb-1">400-888-9999</p>
              <p className="text-sm text-slate-500">7×24 小时服务</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg transition">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">在线客服</h3>
              <p className="text-slate-600 mb-1">点击页面右下</p>
              <p className="text-sm text-slate-500">实时响应</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg transition">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">电子邮箱</h3>
              <p className="text-slate-600 mb-1">service@travelai.com</p>
              <p className="text-sm text-slate-500">24小时内回</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">在线留言</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">您的姓名</label>
                                    <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="请输入姓?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">联系电话</label>
                  <input type="tel" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="请输入手机号" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">咨询类型</label>
                  <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300">
                    <option>请选择</option>
                    <option>行程规划咨询</option>
                    <option>订单问题</option>
                    <option>会员服务</option>
                    <option>合作洽谈</option>
                    <option>其他问题</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">留言内容</label>
                  <textarea rows={4} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" placeholder="请详细描述您的问?.." />
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  提交留言
                </button>
              </form>
            </div>


            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">公司信息</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-slate-900">公司地址</h3>
                      <p className="text-slate-500 text-sm">北京市朝阳区建国?8号SOHO现代城A?201</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-slate-900">联系电话</h3>
                      <p className="text-slate-500 text-sm">400-888-9999（客服）</p>
                      <p className="text-slate-500 text-sm">010-8888-6666（商务）</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-slate-900">电子邮箱</h3>
                      <p className="text-slate-500 text-sm">service@travelai.com（客服）</p>
                      <p className="text-slate-500 text-sm">business@travelai.com（商务合作）</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-slate-900">工作时间</h3>
                      <p className="text-slate-500 text-sm">客服?×24 小时</p>
                      <p className="text-slate-500 text-sm">商务：周一至周?9:00-18:00</p>
                    </div>
                  </div>
                </div>
              </div>


              <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">关注我们</h2>
                <div className="flex gap-4">
                  <a href="#" className="w-12 h-12 bg-white rounded-xl flex items-center justify-center hover:shadow-md transition text-2xl">📱</a>
                  <a href="#" className="w-12 h-12 bg-white rounded-xl flex items-center justify-center hover:shadow-md transition text-2xl">💬</a>
                  <a href="#" className="w-12 h-12 bg-white rounded-xl flex items-center justify-center hover:shadow-md transition text-2xl">📧</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
