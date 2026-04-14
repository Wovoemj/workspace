'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { Phone, Lock, LogIn, ArrowRight, Compass, Mail, Eye, EyeOff, User as UserIcon, CheckCircle2, XCircle } from 'lucide-react'
import { isValidEmail, isValidPhone } from '@/lib/validation'

type LoginMode = 'email' | 'phone' | 'username'

// 独立的 InputField 组件 - 移到组件外部避免重渲染问题
function InputField({
  label,
  fieldKey,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  showSuccess = false,
}: {
  label: string
  fieldKey: string
  icon: any
  type?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder: string
  error?: string | null
  showSuccess?: boolean
}) {
  const hasError = error && value && value.length > 0
  const hasSuccess = showSuccess && !error && value.trim() && value.length >= (fieldKey === 'username' ? 3 : 1)
  const showIcon = hasError || hasSuccess

  return (
    <div className="min-h-[80px]">
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Icon className="h-4 w-4 text-sky-500" />
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          className={`h-12 w-full rounded-xl border-2 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-200 focus:border-sky-400 focus:ring-sky-200'}`}
          style={{ paddingLeft: '2.5rem', paddingRight: showIcon ? '2.5rem' : '1rem' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete="off"
        />
        <Icon className="absolute left-3 text-sky-400" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        {hasError && (
          <XCircle className="absolute right-3 text-red-500" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        )}
        {hasSuccess && (
          <CheckCircle2 className="absolute right-3 text-green-500" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        )}
      </div>
      {hasError && error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
          <XCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useUserStore()

  const returnUrl = searchParams.get('returnUrl') || '/'

  const [mode, setMode] = useState<LoginMode>('username')
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    phone: false,
    password: false,
  })

  // 验证函数 - 拆分为独立函数避免重渲染问题
  const validateUsername = (v: string) => {
    if (!v.trim()) return '请输入用户名'
    if (v.length < 3) return '用户名至少3位'
    return null
  }
  const validateEmail = (v: string) => {
    if (!v.trim()) return '请输入邮箱'
    if (!isValidEmail(v)) return '邮箱格式不正确'
    return null
  }
  const validatePhone = (v: string) => {
    if (!v.trim()) return '请输入手机号'
    if (!isValidPhone(v)) return '手机号格式不正确'
    return null
  }
  const validatePassword = (v: string) => {
    if (!v) return '请输入密码'
    if (v.length < 6) return '密码至少6位'
    return null
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // 校验
    const errors: string[] = []
    if (mode === 'username') {
      const err = validateUsername(form.username)
      if (err) errors.push(err)
    } else if (mode === 'email') {
      const err = validateEmail(form.email)
      if (err) errors.push(err)
    } else if (mode === 'phone') {
      const err = validatePhone(form.phone)
      if (err) errors.push(err)
    }
    const pwdErr = validatePassword(form.password)
    if (pwdErr) errors.push(pwdErr)

    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    try {
      setLoading(true)
      let body: Record<string, string> = { password: form.password }
      if (mode === 'email') {
        body.email = form.email.trim().toLowerCase()
      } else if (mode === 'phone') {
        body.phone = form.phone.trim()
      } else {
        body.username = form.username.trim()
      }

      const res = await fetch(`/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))

      // 处理各种登录失败情况
      if (res.status === 401) {
        if (data?.error?.includes('密码')) {
          toast.error('密码错误，请检查后重试')
        } else if (data?.error?.includes('用户')) {
          toast.error('账号不存在，请先注册')
        } else if (data?.error?.includes('手机')) {
          toast.error('手机号未注册，请先注册')
        } else if (data?.error?.includes('邮箱')) {
          toast.error('邮箱未注册，请先注册')
        } else {
          toast.error('登录失败，请检查账号密码')
        }
        return
      }

      if (!res.ok || !data?.success) {
        const errText = data?.error || `登录失败 (${res.status})`
        toast.error(errText)
        return
      }
      if (!data?.token || !data?.user) throw new Error('登录返回数据不完整')

      localStorage.setItem('auth_token', data.token)
      login(data.user)
      toast.success('🎉 登录成功，欢迎回来！')
      router.push(returnUrl)
    } catch (err: any) {
      toast.error(err?.message || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* 装饰背景 */}
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl animate-pulse-glow" aria-hidden />
      <div className="pointer-events-none absolute -bottom-8 left-0 h-80 w-80 rounded-full bg-indigo-300/15 blur-3xl" aria-hidden />

      <Navbar />
      <main className="relative z-10 pt-20 pb-16" style={{ scrollPaddingTop: '5rem' }}>
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/90 bg-white/70 px-4 py-1.5 text-xs font-semibold text-sky-800 shadow-sm backdrop-blur-sm">
              <Compass className="h-3.5 w-3.5" />
              欢迎回来
            </div>
            <h1 className="bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-900 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
              登录账号
            </h1>
            <p className="mt-2 text-sm text-slate-600">用户名、邮箱或手机号均可登录</p>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl shadow-sky-200/40 backdrop-blur-md sm:p-9">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <span className="text-sm font-medium text-slate-500">新用户？</span>
              <Link
                href={returnUrl !== '/' ? `/register?returnUrl=${encodeURIComponent(returnUrl)}` : '/register'}
                className="group inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
              >
                创建账号
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {isAuthenticated && (
              <div className="mt-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
                你已登录，可直接返回{' '}
                <Link href="/" className="font-semibold underline underline-offset-2">
                  首页
                </Link>
                ?
              </div>
            )}

            {/* 登录方式切换 */}
            <div className="mt-6 flex rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1">
              <button
                type="button"
                onClick={() => { setMode('username'); setTouched({ username: false, email: false, phone: false, password: false }) }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === 'username' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                用户名
              </button>
              <button
                type="button"
                onClick={() => { setMode('email'); setTouched({ username: false, email: false, phone: false, password: false }) }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === 'email' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Mail className="h-4 w-4" />
                邮箱
              </button>
              <button
                type="button"
                onClick={() => { setMode('phone'); setTouched({ username: false, email: false, phone: false, password: false }) }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === 'phone' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Phone className="h-4 w-4" />
                手机号
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={onSubmit}>
              {/* 用户名登录 */}
              {mode === 'username' && (
                <InputField
                  label="用户名"
                  fieldKey="username"
                  icon={UserIcon}
                  value={form.username}
                  onChange={(v) => setForm((s) => ({ ...s, username: v }))}
                  onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                  placeholder="请输入用户名"
                  error={validateUsername(form.username)}
                  showSuccess={touched.username}
                />
              )}

              {/* 邮箱登录 */}
              {mode === 'email' && (
                <InputField
                  label="邮箱"
                  fieldKey="email"
                  icon={Mail}
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm((s) => ({ ...s, email: v }))}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="name@example.com"
                  error={validateEmail(form.email)}
                  showSuccess={touched.email}
                />
              )}

              {/* 手机登录 */}
              {mode === 'phone' && (
                <InputField
                  label="手机号"
                  fieldKey="phone"
                  icon={Phone}
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  placeholder="请输入手机号"
                  error={validatePhone(form.phone)}
                  showSuccess={touched.phone}
                />
              )}

              {/* 密码 */}
              <div style={{ minHeight: '80px' }}>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Lock className="h-4 w-4 text-sky-500" />
                  密码
                </label>
                <div style={{ position: 'relative', display: 'block' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    style={{
                      display: 'block',
                      visibility: 'visible',
                      opacity: 1,
                      height: '48px',
                      width: '100%',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      backgroundColor: 'white',
                      paddingLeft: '16px',
                      paddingRight: '48px',
                      fontSize: '16px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="请输入密码"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                    }}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {validatePassword(form.password) && touched.password && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                    <XCircle className="h-3 w-3" />
                    {validatePassword(form.password)}
                  </p>
                )}
              </div>

              {/* 提示 */}
              <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-4">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <span className="font-semibold">💡 登录提示：</span>
                  <br />• 支持用户名、邮箱、手机号三种方式登录
                  <br />• 密码至少6位
                  <br />• <Link href="/reset-password" className="text-indigo-600 hover:underline">忘记密码？</Link>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="travel-btn-gradient mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <LogIn className="h-5 w-5" strokeWidth={2.5} />
                )}
                {loading ? '登录中...' : '登录'}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <Link href="/reset-password" className="text-indigo-600 hover:underline">
                  忘记密码？
                </Link>
                <Link href="/register" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                  还没有账号？立即注册
                </Link>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white/85 px-3 text-xs text-slate-400">或</span>
                </div>
              </div>
              <a
                href="/admin"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                管理员登录
              </a>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
