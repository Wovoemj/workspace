'use client'

import Link from 'next/link'
import {
  Building2,
  Plane,
  Globe,
  ArrowRight,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const countries = [
  { name: '日本', flag: '🇯🇵', description: '樱花与和风的完美融合', price: '¥7999? },
  { name: '韩国', flag: '🇰🇷', description: '时尚与传统的交织', price: '¥4999? },
    { name: '泰国', flag: '🇹🇭', description: '微笑国度的热带风?', price: '¥3999? },
    { name: '新加?', flag: '🇸🇬', description: '花园城市的现代魅?', price: '¥5999? },
    { name: '马尔代夫', flag: '🇲🇻', description: '印度洋上的度假天?', price: '¥12999? },
  { name: '欧洲', flag: '🇪🇺', description: '古典与现代的艺术殿堂', price: '¥19999? },
    { name: '美国', flag: '🇺🇸', description: '多元文化的超级大?', price: '¥15999? },
  { name: '澳大利亚', flag: '🇦🇺', description: '南半球的自然奇观', price: '¥13999? },
]

const features = [
  { icon: '🛂', title: '签证服务', desc: '专业签证指导，全程无? },
    { icon: '✈️', title: '往返机?', desc: '优质航班，舒适出? },
    { icon: '🏨', title: '精选酒?', desc: '特色住宿，舒适体? },
  { icon: '🎯', title: '当地向导', desc: '专业导游，深度讲? },
]

export default function InternationalDestinationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-violet-600 to-purple-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-8 w-8" />
              <span className="text-xl font-bold">出境旅游</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">出境游精</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              环游世界，探索不同文化的魅力，从亚洲近邻到遥远大陆，开启您的全球之?
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/destinations/popular" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">热门推荐</Link>
              <Link href="/destinations/domestic" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">国内</Link>
              <Link href="/destinations/local" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">周边</Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">热门出境目的</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {countries.map((country) => (
                <Link key={country.name} href="/assistant"
                  className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-violet-300 transition-all">
                  <div className="text-5xl mb-4">{country.flag}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{country.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{country.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-violet-600 font-bold">{country.price}</span>
                    <span className="text-sm text-slate-400 group-hover:text-violet-600 flex items-center gap-1 transition-colors">
                      咨询 <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>


          <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-3xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">一站式出境服务</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="text-4xl mb-3">{feature.icon}</div>
                  <h3 className="font-bold text-slate-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>


          <div className="bg-white rounded-3xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">预订流程</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                                { step: '01', title: '选择目的?', desc: '浏览目的地，选择心仪行程' },
                                { step: '02', title: '提交需?', desc: '填写出行信息，提交预? },
                { step: '03', title: '确认行程', desc: '客服联系，确认细? },
                { step: '04', title: '出发旅行', desc: '轻松出行，享受旅? },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-violet-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
