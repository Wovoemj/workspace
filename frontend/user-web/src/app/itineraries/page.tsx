/**
 * =====================================================
 * 行程重定向页模块
 * =====================================================
 * 功能说明：
 *   - 将旧版行程页面重定向到攻略页面的行程 Tab
 *   - 展示跳转过渡动画
 *   - 行程功能已整合到 /travel-notes?tab=itineraries
 *
 * 依赖项：
 *   - lucide-react/Layers：行程图标
 *
 * 行为：
 *   - 页面加载时自动重定向
 *   - 使用 useRouter.replace 实现无痕跳转
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layers } from 'lucide-react'

export default function ItinerariesRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // 重定向到攻略页面的行程Tab
    router.replace('/travel-notes?tab=itineraries')
  }, [router])

  return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 shadow-2xl">
            <Layers className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          行程功能已整合到攻略页面
        </h1>
        <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
          现在你可以在攻略页面查看和管理所有行程
        </p>
        <div className="text-gray-500">
          正在跳转到攻略页面...
        </div>
        <div className="mt-8 flex justify-center">
          <div className="h-2 w-64 bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
