'use client'

import Link from 'next/link'
import { Users, Globe, Star, Building2, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const partners = [
  { name: '携程旅行', category: 'OTA平台', logo: '🏨' },
  { name: '去哪儿', category: 'OTA平台', logo: '✈️' },
  { name: '飞猪旅行', category: 'OTA平台', logo: '🎯' },
  { name: '美团旅行', category: 'OTA平台', logo: '🍜' },
  { name: 'Booking.com', category: '酒店预订', logo: '🏠' },
  { name: 'Airbnb', category: '民宿预订', logo: '🌴' },
  { name: '中国国际航空', category: '航空公司', logo: '🛫' },
  { name: '中国平安', category: '保险服务', logo: '🛡️' },
]

export default function PartnersPage() {
  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8" />
              <span className="text-xl font-bold">合作伙伴</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">合作共赢</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              携手优质合作伙伴，为用户提供更丰富的旅游资源和更优质的服务体验
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Globe, title: '资源共享', desc: '整合双方优势资源，实现互利共赢' },
              { icon: Star, title: '品牌提升', desc: '强强联合，提升品牌影响力' },
              { icon: Building2, title: '深度合作', desc: '全方位战略合作，共创未来' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg transition">
                  <Icon className="h-10 w-10 text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              )
            })}
          </div>


          <h2 className="text-xl font-bold text-slate-900 mb-6">合作伙伴</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {partners.map((partner) => (
              <div key={partner.name} className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg hover:border-emerald-300 transition">
                <div className="text-4xl mb-3">{partner.logo}</div>
                <h3 className="font-bold text-slate-900 mb-1">{partner.name}</h3>
                <p className="text-sm text-emerald-600">{partner.category}</p>
              </div>
            ))}
          </div>


          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">合作方式</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'API接口合作', desc: '通过API接口接入我们的AI行程规划能力，为您的用户提供智能服务' },
                { title: '内容合作', desc: '优质旅游内容入驻平台，共同打造丰富的内容生态' },
                { title: '渠道合作', desc: '分销合作，共享用户资源，实现双赢' },
                { title: '品牌联合', desc: '联合营销活动，共同推广品牌' },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-5">
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>


          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">成为我们的合作伙伴</h2>
            <p className="text-slate-500 mb-6">期待与您携手共创旅游新体验</p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition">
              洽谈合作 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}