'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

export default function PlannerRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // 立即重定向到智能问答页面
    router.replace('/assistant')
  }, [router])

  return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 shadow-2xl">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          行程规划功能已整合到智能问答
        </h1>
        <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
          现在你可以在智能问答页面直接描述旅行需求，AI会自动识别并规划行程?
        </p>
        <div className="text-gray-500">
          正在重定向到智能问答页面...
        </div>
        <div className="mt-8 flex justify-center">
          <div className="h-2 w-64 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
