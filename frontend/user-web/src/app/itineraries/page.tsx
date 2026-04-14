'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Plus, Calendar, Compass } from 'lucide-react'
import { useUserStore } from '@/store'
import Link from 'next/link'

export default function ItinerariesPage() {
  const { isAuthenticated, user } = useUserStore()

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute -bottom-8 left-0 h-80 w-80 rounded-full bg-indigo-300/15 blur-3xl" />

      <Navbar />
      <main className="relative z-10 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h1 className="bg-gradient-to-r from-gray-900 via-sky-800 to-indigo-900 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              我的行程
            </h1>
            <p className="mt-2 text-gray-600">规划你的下一次旅行</p>
          </div>

          {!isAuthenticated ? (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-12 text-center shadow-2xl backdrop-blur-md">
              <Compass className="mx-auto h-16 w-16 text-sky-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">登录后查看行程</h2>
              <p className="text-gray-600 mb-6">登录账号以查看和管理你的旅行行程</p>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg hover:from-sky-700 hover:to-indigo-700">
                去登录
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-12 text-center shadow-2xl backdrop-blur-md">
              <Calendar className="mx-auto h-16 w-16 text-sky-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">暂无行程</h2>
              <p className="text-gray-600 mb-6">开始规划你的第一次旅行吧</p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/assistant" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg hover:from-sky-700 hover:to-indigo-700">
                  <Plus className="h-5 w-5" />
                  AI 创建行程
                </Link>
                <Link href="/destinations" className="inline-flex items-center gap-2 rounded-xl border-2 border-sky-200 bg-white px-6 py-3 font-semibold text-sky-700 hover:bg-sky-50">
                  浏览目的地
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
