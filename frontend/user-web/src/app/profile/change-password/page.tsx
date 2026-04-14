'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { isAuthenticated, logout } = useUserStore()
  
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  })
  const [touched, setTouched] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  })

  // 校验旧密码
  const validateOldPassword = (v: string) => {
    if (!v) return '请输入旧密码'
    if (v.length < 8) return '密码至少8位'
    return null
  }

  // 校验新密码
  const validateNewPassword = (v: string) => {
    if (!v) return '请输入新密码'
    if (v.length < 8) return '新密码至少8位'
    if (!/[a-z]/.test(v)) return '需包含小写字母'
    if (!/[A-Z]/.test(v)) return '需包含大写字母'
    if (!/\d/.test(v)) return '需包含数字'
    if (v === form.oldPassword) return '新密码不能与旧密码相同'
    return null
  }

  // 校验确认密码
  const validateConfirmPassword = (v: string) => {
    if (!v) return '请确认新密码'
    if (v !== form.newPassword) return '两次密码不一致'
    return null
  }

  // 密码强度
  const passwordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, text: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++
    
    if (score <= 2) return { level: 1, text: '弱', color: 'bg-red-500' }
    if (score <= 3) return { level: 2, text: '中等', color: 'bg-yellow-500' }
    if (score <= 4) return { level: 3, text: '强', color: 'bg-green-500' }
    return { level: 4, text: '非常强', color: 'bg-emerald-500' }
  }

  const strength = passwordStrength(form.newPassword)

  // 提交
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const vOld = validateOldPassword(form.oldPassword)
    const vNew = validateNewPassword(form.newPassword)
    const vConfirm = validateConfirmPassword(form.confirmPassword)
    
    if (vOld || vNew || vConfirm) {
      if (vOld) toast.error(vOld)
      else if (vNew) toast.error(vNew)
      else if (vConfirm) toast.error(vConfirm)
      return
    }

    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('请先登录')
      router.push('/login')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: form.oldPassword,
          new_password: form.newPassword
        })
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '修改失败')
      }
      
      toast.success('密码修改成功，请重新登录')
      
      // 清除 token 并跳转登录
      localStorage.removeItem('auth_token')
      logout()
      router.push('/login')
      
    } catch (e: any) {
      toast.error(e?.message || '修改密码失败')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen page-bg">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="max-w-md mx-auto px-4">
            <div className="card p-8 text-center">
              <Lock className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">请先登录</h2>
              <p className="text-gray-600 mt-2">登录后即可修改密码</p>
              <Link href="/login" className="btn btn-primary mt-4 inline-block">
                去登录
              </Link>
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
              <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">修改密码</h1>
                <p className="text-sm text-gray-500">定期修改密码保护账户安全</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {/* 旧密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  旧密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.old ? 'text' : 'password'}
                    value={form.oldPassword}
                    onChange={(e) => setForm(s => ({ ...s, oldPassword: e.target.value }))}
                    onBlur={() => setTouched(t => ({ ...t, oldPassword: true }))}
                    placeholder="请输入旧密码"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(s => ({ ...s, old: !s.old }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPasswords.old ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                {touched.oldPassword && validateOldPassword(form.oldPassword) && (
                  <p className="mt-1 text-sm text-red-500">{validateOldPassword(form.oldPassword)}</p>
                )}
              </div>

              {/* 新密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  新密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={form.newPassword}
                    onChange={(e) => setForm(s => ({ ...s, newPassword: e.target.value }))}
                    onBlur={() => setTouched(t => ({ ...t, newPassword: true }))}
                    placeholder="至少8位，包含大小写字母和数字"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(s => ({ ...s, new: !s.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                {touched.newPassword && validateNewPassword(form.newPassword) && (
                  <p className="mt-1 text-sm text-red-500">{validateNewPassword(form.newPassword)}</p>
                )}
                {form.newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(level => (
                        <div key={level} className={`h-1 flex-1 rounded-full ${level <= strength.level ? strength.color : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">密码强度：{strength.text}</p>
                  </div>
                )}
              </div>

              {/* 确认新密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  确认新密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm(s => ({ ...s, confirmPassword: e.target.value }))}
                    onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
                    placeholder="再次输入新密码"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                {touched.confirmPassword && form.confirmPassword && !validateConfirmPassword(form.confirmPassword) && (
                  <p className="mt-1 text-sm text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> 密码一致
                  </p>
                )}
                {touched.confirmPassword && validateConfirmPassword(form.confirmPassword) && (
                  <p className="mt-1 text-sm text-red-500">{validateConfirmPassword(form.confirmPassword)}</p>
                )}
              </div>

              {/* 提示 */}
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                <p>💡 密码要求：</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>至少 8 位字符</li>
                  <li>包含大小写字母</li>
                  <li>包含数字</li>
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
                    修改中...
                  </>
                ) : (
                  '确认修改'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}