'use client'

import Link from 'next/link'
import {
  Briefcase,
  MapPin,
  Clock,
  Heart,
  Sparkles,
  Users,
  Rocket,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const jobs = [
    { title: '高级前端工程?', dept: '技术部', location: '北京', type: '全职', salary: '25K-45K' },
    { title: 'AI算法工程?', dept: '技术部', location: '北京/上海', type: '全职', salary: '30K-60K' },
    { title: '产品经理', dept: '产品?', location: '北京', type: '全职', salary: '20K-40K' },
    { title: 'UI/UX设计?', dept: '设计?', location: '北京', type: '全职', salary: '18K-35K' },
    { title: '旅游产品运营', dept: '运营?', location: '北京', type: '全职', salary: '15K-25K' },
    { title: '内容编辑', dept: '内容?', location: '远程', type: '兼职', salary: '8K-15K' },
]

const benefits = [
    { icon: Heart, title: '六险一?', desc: '全额缴纳，安心保? },
    { icon: Sparkles, title: '弹性工?', desc: '灵活上下班，拒绝996' },
  { icon: Rocket, title: '成长空间', desc: '扁平管理，快速晋? },
  { icon: Users, title: '免费旅游', desc: '每年旅游基金，说走就? },
]

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="h-8 w-8" />
              <span className="text-xl font-bold">加入我们</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">热招职位</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              加入我们，一起用AI改变旅行方式，创造更有趣的旅行体?
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.title} className="bg-white rounded-xl border border-slate-200 p-5 text-center hover:shadow-md transition">
                  <Icon className="h-8 w-8 text-violet-600 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900 mb-1">{benefit.title}</h3>
                  <p className="text-sm text-slate-500">{benefit.desc}</p>
                </div>
              )
            })}
          </div>


          <h2 className="text-xl font-bold text-slate-900 mb-6">所有职</h2>
          <div className="space-y-4 mb-12">
            {jobs.map((job, index) => (
              <div key={index} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-violet-300 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded">{job.dept}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-violet-600">{job.salary}</span>
                    <button className="px-5 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition">
                      申请
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>


          <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">没有找到合适的职位</h2>
            <p className="text-slate-500 mb-6">也可以发送简历至 hr@travelai.com，我们会尽快与您联系</p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition">
              联系我们
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
