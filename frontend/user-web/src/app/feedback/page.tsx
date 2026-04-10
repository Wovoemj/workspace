'use client'

import Link from 'next/link'
import {
  MessageSquare,
  Send,
  Star,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="h-8 w-8" />
              <span className="text-xl font-bold">意见反馈</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">您的反馈是我们进步的动力</h1>
            <p className="text-white/80">我们珍视每一位用户的意见，期待您的宝贵建</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">提交反馈</h2>
            <form className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">您的姓名</label>
                                    <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="请输入姓名（选填?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">联系方式</label>
                                    <input type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="手机号或邮箱（选填?" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">反馈类型</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['功能建议', '问题反馈', '体验优化', '其他'].map((type) => (
                    <label key={type} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                      <input type="radio" name="type" value={type} className="text-blue-600" />
                      <span className="text-sm text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">满意度评</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" className="p-1 hover:scale-110 transition">
                      <Star className="h-8 w-8 text-slate-300 hover:text-amber-400 fill-transparent hover:fill-amber-400 transition" />
                    </button>
                  ))}
                  <span className="ml-3 text-sm text-slate-500">（点击星星评分）</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">详细描述</label>
                <textarea rows={5}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="请详细描述您的问题或建议..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">上传截图（选填</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-slate-500 text-sm">点击或拖拽上传图</p>
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                提交反馈
              </button>
            </form>
          </div>


          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 mb-2">温馨提示</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>?我们重视每一位用户的反馈，通常?-3个工作日内回</li>
                  <li>?如果您的问题紧急，请拨打客服热线：400-888-9999</li>
                  <li>?如需实时帮助，建议使用在线客服功</li>
                </ul>
              </div>
            </div>
          </div>


          <div className="mt-8 text-center">
            <p className="text-slate-500 mb-4">您也可以通过以下方式反馈</p>
            <div className="flex justify-center gap-4">
              <Link href="/contact" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition">
                联系客服
              </Link>
              <a href="mailto:feedback@travelai.com" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition">
                发送邮?
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
