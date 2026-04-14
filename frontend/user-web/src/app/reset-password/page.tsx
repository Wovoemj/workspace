'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Mail, Loader2, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { isValidEmail } from '@/lib/validation'

export default function ResetPasswordPage() {
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 提交
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // 校验邮箱
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }
    if (!isValidEmail(email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })
      
      const data = await res.json().catch(() => ({}))
      
      // 即使失败也显示成功（防止邮箱枚举）
      setSubmitted(true)
      
    } catch (e: any) {
      // 即使出错也显示成功
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  // 已提交状态
  if (submitted) {
    return (
      <div className="min-h-screen page-bg">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-md mx-auto px-4 py-8">
            <div className="card p-8 text-center">
              <div className="mx-auto w-fit rounded-full bg-green-100 p-4 text-green-600 mb-4">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">邮件已发送</h2>
              <p className="text-gray-600 mt-3">
                如果该邮箱已注册，我们已发送密码重置链接到<br />
                <span className="font-medium text-gray-900">{email}</span>
              </p>
              <div className="mt-6 bg-blue-50 rounded-xl p-4 text-sm text-blue-700 text-left">
                <p>📧 请注意：</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>邮件可能出现在垃圾邮件文件夹</li>
                  <li>重置链接 24 小时有效</li>
                  <li>如未收到，请重新尝试</li>
                </ul>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <Link href="/login" className="btn btn-primary">
                  返回登录
                </Link>
                <button onClick={() => setSubmitted(false)} className="btn btn-outline">
                  重新填写
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="card p-6">
            {/* 头部 */}
            <div className="flex items-center gap-4 mb-6">
              <Link href="/login" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">找回密码</h1>
                <p className="text-sm text-gray-500">通过邮箱验证找回账号</p>
              </div>
            </div>

            {/* 步骤提示 */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-amber-50 rounded-xl text-sm text-amber-800">
              <Sparkles className="h-4 w-4" />
              <span>为保护账户安全，暂不支持邮件发送，请联系管理员重置密码</span>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {/* 邮箱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  邮箱地址 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError(null)
                    }}
                    placeholder="请输入注册时的邮箱"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {error && (
                  <p className="mt-1 text-sm text-red-500">{error}</p>
                )}
              </div>

              {/* 提示信息 */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                <p>📌 温馨提示：</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>请输入注册时使用的邮箱地址</li>
                  <li>如果邮箱不存在，系统不会暴露信息</li>
                  <li>重置链接有效期为 24 小时</li>
                </ul>
              </div>

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    发送中...
                  </>
                ) : (
                  '发送重置链接'
                )}
              </button>
            </form>

            {/* 底部链接 */}
            <div className="mt-6 text-center text-sm text-gray-500">
              想起密码了？{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                立即登录
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}