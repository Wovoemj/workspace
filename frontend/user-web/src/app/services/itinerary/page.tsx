'use client'

import Link from 'next/link'
import {
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
  Bot,
  Brain,
  Route,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const features = [
  { icon: Brain, title: 'AI智能规划', desc: '基于您的偏好和预算，AI智能生成最优行程路线' },
  { icon: Route, title: '个性化定制', desc: '根据您的兴趣点，定制专属旅行体验' },
  { icon: Calendar, title: '日程管理', desc: '自动生成每日时间表，合理安排行程' },
  { icon: MapPin, title: '景点推荐', desc: '精选目的地，发现当地独特风景' },
]

const steps = [
        { step: '1', title: '输入需求', desc: '告诉AI您的旅行目的地、时间、人数和偏好' },
  { step: '2', title: 'AI生成', desc: '智能算法为您规划最优路线和日程安排' },
  { step: '3', title: '自由调整', desc: '根据您的意见随时修改行程细节' },
        { step: '4', title: '一键出行', desc: '生成完整行程单，随时查看和分享' },
]

export default function ItineraryServicePage() {
  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-8 w-8" />
              <span className="text-xl font-bold">智能服务</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">智能行程规划</h1>
            <p className="text-white/90 text-lg max-w-2xl mb-8">
              让AI成为您的私人旅行规划师，只需告诉需求，即可获得专属定制的完美行?
            </p>
            <Link href="/assistant"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition shadow-lg">
              <Bot className="h-6 w-6" />
              立即体验 AI 规划
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">为什么选择智能规划</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg transition">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-500">{feature.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>


          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">简单四步，生成完美行程</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {steps.map((item) => (
                <div key={item.step} className="text-center relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-sky-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                  {item.step !== '4' && (
                    <ArrowRight className="hidden md:block absolute top-6 -right-3 h-5 w-5 text-blue-300" />
                  )}
                </div>
              ))}
            </div>
          </div>


          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-3xl p-8 mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">适用场景</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                                                                '周末周边自驾？', '小长假深度游', '亲子家庭？',
                                                                '情侣浪漫之旅', '闺蜜购物之旅', '商务出差顺便？',
              ].map((scene) => (
                <div key={scene} className="flex items-center gap-3 bg-white rounded-xl p-4">
                  <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />
                  <span className="text-slate-700">{scene}</span>
                </div>
              ))}
            </div>
          </div>


          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">准备好开始您的旅程了吗？</h2>
            <p className="text-slate-500 mb-8">让AI为您的下一段旅行保驾护</p>
            <Link href="/assistant"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition">
              <Bot className="h-6 w-6" />
              开?AI 智能规划
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
