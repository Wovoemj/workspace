'use client'

import Link from 'next/link'
import {
  Stamp,
  FileText,
  Clock,
  CheckCircle,
  Phone,
  MessageCircle,
  Globe,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const countries = [
  { name: '日本', flag: '🇯🇵', days: '5-10个工作日' },
  { name: '韩国', flag: '🇰🇷', days: '3-5个工作日' },
  { name: '美国', flag: '🇺🇸', days: '10-15个工作日' },
  { name: '英国', flag: '🇬🇧', days: '15-20个工作日' },
  { name: '澳大利亚', flag: '🇦🇺', days: '10-15个工作日' },
  { name: '申根国家', flag: '🇪🇺', days: '7-10个工作日' },
]

const services = [
  { icon: FileText, title: '材料指导', desc: '专业顾问一对一指导，准备材料不再迷? },
    { icon: Clock, title: '加急服?', desc: '提供加急办理，最?个工作日出签' },
  { icon: CheckCircle, title: '全程代办', desc: '代填表格、代预约、代取护? },
  { icon: MessageCircle, title: '贴心跟进', desc: '实时进度通知，有问题随时咨询' },
]

export default function VisaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Stamp className="h-8 w-8" />
              <span className="text-xl font-bold">签证服务</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">签证办理</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              专业签证服务，让您的出境旅行更简单。我们提供全?00+国家的签证办理服?
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">热门签证国家</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {countries.map((country) => (
                <Link key={country.name} href="/contact"
                  className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-lg hover:border-violet-300 transition">
                  <div className="text-4xl mb-2">{country.flag}</div>
                  <h3 className="font-bold text-slate-900 mb-1">{country.name}</h3>
                  <p className="text-xs text-slate-500">{country.days}</p>
                </Link>
              ))}
            </div>
          </div>


          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">我们的服</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service) => {
                const Icon = service.icon
                return (
                  <div key={service.title} className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg transition">
                    <Icon className="h-10 w-10 text-violet-600 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-900 mb-2">{service.title}</h3>
                    <p className="text-sm text-slate-500">{service.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>


          <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-3xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">办理流程</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { step: '1', title: '咨询下单', desc: '选择国家，提交订? },
                { step: '2', title: '准备材料', desc: '按清单准备所需材料' },
                { step: '3', title: '邮寄材料', desc: '将材料邮寄给我们' },
                { step: '4', title: '办理签证', desc: '我们代为递交申请' },
                { step: '5', title: '收取护照', desc: '签证办好后寄回给? },
              ].map((item) => (
                <div key={item.step} className="text-center relative">
                  <div className="w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>


          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">常见签证材料</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-violet-600" />
                  通用材料
                </h3>
                <ul className="space-y-2 text-slate-600">
                                    {['护照原件（有效期6个月以上?', '签证申请?', '白底彩照2?', '身份证复印件', '户口本复印件', '在职证明/在读证明'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-violet-600" />
                  资产证明
                </h3>
                <ul className="space-y-2 text-slate-600">
                  {['?个月银行流水', '收入证明', '房产证复印件（可选）', '车辆行驶证复印件（可选）', '存款证明（可选）'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">* 具体材料要求因国家和签证类型而异，请以顾问提供的清单为准</p>
          </div>


          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">开始办理您的签</h2>
            <p className="text-white/80 mb-6">专业顾问在线为您解答，选择最适合您的签证方案</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-600 rounded-xl font-bold hover:bg-violet-50 transition">
                <MessageCircle className="h-5 w-5" />
                在线咨询
              </Link>
              <a href="tel:400-888-9999" className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition">
                <Phone className="h-5 w-5" />
                400-888-9999
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
