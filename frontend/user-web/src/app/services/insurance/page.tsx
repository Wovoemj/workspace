'use client'

import Link from 'next/link'
import {
  Shield,
  Heart,
  Clock,
  DollarSign,
  CheckCircle,
  Phone,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const plans = [
        { name: '基础保障', price: '¥20', coverage: ['意外伤害 10万', '意外医疗 1万', '航班延误 200元'], popular: false },
        { name: '尊享保障', price: '¥50', coverage: ['意外伤害 30万', '意外医疗 3万', '航班延误 500元', '行李丢失 500元'], popular: true },
        { name: '至尊保障', price: '¥100', coverage: ['意外伤害 50万', '意外医疗 5万', '航班延误 1000元', '行李丢失 2000元', '紧急救援'], popular: false },
]

export default function InsurancePage() {
  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8" />
              <span className="text-xl font-bold">增值服</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">旅游保险</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              安心出行，让每一次旅行都有保障。我们与多家知名保险公司合作，提供多种保障方?
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[
              { icon: Heart, title: '全程保障', desc: '从出发到返回，全程守护' },
                                                        { icon: Clock, title: '快速理赔', desc: '线上报案，快速审核' },
                                                        { icon: DollarSign, title: '高性价比', desc: '最低20元起，保障一整程' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="bg-white rounded-xl border border-slate-200 p-5 text-center hover:shadow-md transition">
                  <Icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              )
            })}
          </div>


          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">选择您的保障方案</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <div key={plan.name} className={`bg-white rounded-2xl border-2 p-6 ${plan.popular ? 'border-blue-500 shadow-lg' : 'border-slate-200'} relative`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm rounded-full">
                    最受欢?
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-blue-600">{plan.price}<span className="text-base text-slate-500">/起</span></div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.coverage.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-xl font-medium transition ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                  立即购买
                </button>
              </div>
            ))}
          </div>


          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">理赔流程</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', title: '报案', desc: '发生事故后，联系客服或线上报案' },
                { step: '02', title: '提交材料', desc: '上传相关证明材料' },
                { step: '03', title: '审核', desc: '保险公司审核材料' },
                { step: '04', title: '理赔', desc: '审核通过后，快速打款' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>


          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">需要更多帮助？</h2>
            <p className="text-slate-500 mb-6">我们的保险顾问随时为您解</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="tel:400-888-9999" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
                <Phone className="h-5 w-5" />
                400-888-9999
              </a>
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition">
                在线咨询
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
