'use client'

import Link from 'next/link'
import {
  Users,
  Sparkles,
  Plane,
  Clock,
  Phone,
  MessageCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const services = [
  { icon: Users, title: '专属顾问', desc: '一对一专属旅行顾问，全程服? },
  { icon: Sparkles, title: '量身定制', desc: '根据您的需求，定制专属行程' },
  { icon: Plane, title: '品质保障', desc: '精选酒店、航班、用车服? },
  { icon: Clock, title: '全程跟进', desc: '行前、行中、行后全程服? },
]

export default function CustomServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8" />
              <span className="text-xl font-bold">尊享服务</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">私人定制</h1>
            <p className="text-white/90 text-lg max-w-2xl mb-8">
              专属旅行顾问为您打造独一无二的旅行体验，从行程到细节，全程定制服?
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition">
                <MessageCircle className="h-5 w-5" />
                在线咨询
              </button>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition">
                <Phone className="h-5 w-5" />
                400-888-9999
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">我们的服</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service) => {
                const Icon = service.icon
                return (
                  <div key={service.title} className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg transition">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{service.title}</h3>
                    <p className="text-sm text-slate-500">{service.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>


          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-8 mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">定制流程</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                                { step: '01', title: '需求沟?', desc: '告知旅行目的地、时间和特殊需? },
                { step: '02', title: '方案定制', desc: '专属顾问为您设计行程方案' },
                { step: '03', title: '确认行程', desc: '根据反馈调整至满意为? },
                { step: '04', title: '享受旅程', desc: '全程贴心服务，无忧出? },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>


          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">立即定制您的专属行程</h2>
            <p className="text-slate-500 mb-8">我们的旅行顾问将?4小时内与您联</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition">
                <MessageCircle className="h-5 w-5" />
                在线咨询
              </Link>
              <Link href="/assistant" className="inline-flex items-center gap-2 px-6 py-3 border border-purple-300 text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition">
                AI 快速规?
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
