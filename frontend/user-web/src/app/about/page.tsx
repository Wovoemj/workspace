'use client'

import Link from 'next/link'
import {
  Globe,
  Sparkles,
  Users,
  Heart,
  Award,
  Rocket,
  Target,
  Eye,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const team = [
  { name: '张明', role: '创始人 & CEO', avatar: '👨‍💼', desc: '10年旅游行业经验，专注于AI与旅行的融合创新' },
  { name: '李华', role: 'CTO', avatar: '👨‍💻', desc: '前BAT技术专家，AI算法领域资深研究员' },
  { name: '王芳', role: 'COO', avatar: '👩‍💼', desc: '资深旅游运营专家，曾任大型旅行社高管' },
  { name: '刘强', role: '产品总监', avatar: '👨‍🎨', desc: '深耕在线旅游产品设计，追求极致用户体验' },
]

const stats = [
  { value: '1000+', label: '服务用户', icon: Users },
  { value: '500+', label: '覆盖目的地', icon: Globe },
  { value: '98%', label: '用户满意度', icon: Heart },
  { value: '50+', label: '合作伙伴', icon: Award },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <Globe className="h-20 w-20 mx-auto mb-6 opacity-90" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">关于智能旅游助手</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              我们是一家致力于用AI技术革新旅行体验的科技公司，让每个人都能轻松享受个性化的旅行服务
            </p>
          </div>
        </div>


        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg transition">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">我们的使命</h2>
              <p className="text-slate-600 leading-relaxed">
                让旅行更简单、更有趣。通过AI技术，为每一位用户提供个性化的旅行规划、智能推荐和贴心服务，让每一次出发都成为美好回忆。
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg transition">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
                <Eye className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">我们的愿景</h2>
              <p className="text-slate-600 leading-relaxed">
                成为全球领先的AI旅行平台，连接人与世界，让每个人都能轻松探索未知、发现美好、创造独特的旅行记忆。
              </p>
            </div>
          </div>


          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">核心价值观</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Sparkles, title: '创新', desc: '不断探索AI与旅行的无限可能' },
                { icon: Heart, title: '用户为本', desc: '一切从用户需求出发' },
                { icon: Globe, title: '开放共赢', desc: '连接全球优质旅游资源' },
                { icon: Rocket, title: '追求卓越', desc: '打造极致的用户体验' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>


          <div className="bg-gradient-to-r from-blue-600 to-sky-500 rounded-3xl p-8 text-white mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">平台数据</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="text-center">
                    <Icon className="h-8 w-8 mx-auto mb-3 opacity-80" />
                    <div className="text-4xl font-bold mb-1">{stat.value}</div>
                    <div className="text-white/70">{stat.label}</div>
                  </div>
                )
              })}
            </div>
          </div>


          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">核心团队</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member) => (
                <div key={member.name} className="bg-white rounded-2xl border border-slate-200 p-6 text-center hover:shadow-lg transition">
                  <div className="text-5xl mb-4">{member.avatar}</div>
                  <h3 className="font-bold text-slate-900 mb-1">{member.name}</h3>
                  <p className="text-blue-600 text-sm mb-3">{member.role}</p>
                  <p className="text-slate-500 text-sm">{member.desc}</p>
                </div>
              ))}
            </div>
          </div>


          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">加入我们</h2>
            <p className="text-slate-500 mb-6 max-w-2xl mx-auto">
              如果你也对AI和旅行充满热情，欢迎加入我们的团队，一起创造更好的旅行体验
            </p>
            <Link href="/careers" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition">
              查看招聘信息
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
