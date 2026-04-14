'use client'

import Link from 'next/link'
import {
  Newspaper,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const news = [
  { id: 1, title: '智能旅游助手V2.0发布：AI规划能力全面升级', date: '2026-04-01', category: '产品更新', excerpt: '全新AI算法，更智能的行程规划，更精准的景点推荐...' },
  { id: 2, title: '清明小长假热门目的地榜单发布', date: '2026-03-28', category: '行业资讯', excerpt: '清明假期将至，哪些目的地最受欢迎？一起来?..' },
        { id: 3, title: '智能旅游助手与多家航空公司达成战略合？', date: '2026-03-20', category: '合作动？', excerpt: '强强联合，为用户提供更优惠的机票和更便捷的服?..' },
        { id: 4, title: '春季出游指南：全国赏花胜地推？', date: '2026-03-15', category: '旅行攻略', excerpt: '春天来了，这些赏花胜地不可错?..' },
        { id: 5, title: '智能旅游助手用户突破1000？', date: '2026-03-10', category: '公司新闻', excerpt: '感谢每一位用户的信任与支持，我们将继续努?..' },
  { id: 6, title: '五一假期旅行趋势预测报告', date: '2026-03-05', category: '行业资讯', excerpt: '五一假期即将到来，出行趋势如何？一起来看预?..' },
]

export default function NewsPage() {
  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Newspaper className="h-8 w-8" />
              <span className="text-xl font-bold">新闻资讯</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">最新资</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              了解行业动态、获取旅行灵感、发现最新优?
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="flex flex-wrap gap-3 mb-8">
                                                {['全部', '产品更新', '行业资讯', '合作动？', '旅行攻略', '公司新闻'].map((cat, index) => (
              <button key={cat}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  index === 0 ? 'bg-orange-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300'
                }`}>
                {cat}
              </button>
            ))}
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <Link key={item.id} href="#"
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-orange-300 transition group">
                <div className="h-40 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <Newspaper className="h-16 w-16 text-white/50" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">{item.category}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />{item.date}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition">{item.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{item.excerpt}</p>
                  <span className="text-sm text-orange-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                    阅读全文 <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>


          <div className="text-center mt-12">
            <button className="px-8 py-3 border border-slate-300 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition">
              加载更多
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
