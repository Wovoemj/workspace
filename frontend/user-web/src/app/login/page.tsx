'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { Phone, Lock, LogIn, ArrowRight, Compass, Mail } from 'lucide-react'
import { isValidEmail } from '@/lib/validation'

type LoginMode = 'email' | 'phone'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useUserStore()

  const returnUrl = searchParams.get('returnUrl') || '/'

  const [mode, setMode] = useState<LoginMode>('email')
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'email') {
      if (!form.email.trim()) {
                toast.error('请输入邮?')
        return
      }
      if (!isValidEmail(form.email)) {
                toast.error('邮箱格式不正?')
        return
      }
    } else {
      if (!form.phone.trim()) {
        toast.error('请输入手机号')
        return
      }
    }
    if (!form.password || form.password.length < 6) {
            toast.error('密码至少 6 ?')
      return
    }

    try {
      setLoading(true)
      const body =
        mode === 'email'
          ? { email: form.email.trim().toLowerCase(), password: form.password }
          : { phone: form.phone.trim(), password: form.password }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        const errText = data?.error || `HTTP ${res.status}`
        throw new Error(errText)
      }
      if (!data?.token || !data?.user) throw new Error('登录返回数据不完整')
      localStorage.setItem('auth_token', data.token)
      login(data.user)
      toast.success('登录成功')
      router.push(returnUrl)
    } catch (err: any) {
      toast.error(err?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100">
      <div
        className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 left-0 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl"
        aria-hidden
      />

      <Navbar />
      <main className="relative z-10 pt-20 pb-16">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/90 bg-white/70 px-4 py-1.5 text-xs font-semibold text-sky-800 shadow-sm backdrop-blur-sm">
              <Compass className="h-3.5 w-3.5" />
              欢迎回来
            </div>
            <h1 className="bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-900 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
              登录账号
            </h1>
            <p className="mt-2 text-sm text-slate-600">使用邮箱或手机号与密码登</p>
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

            <div className="mt-6 flex rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1">
              <button
                type="button"
                onClick={() => setMode('email')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === 'email' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Mail className="h-4 w-4" />
                邮箱登录
              </button>
              <button
                type="button"
                onClick={() => setMode('phone')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === 'phone' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Phone className="h-4 w-4" />
                手机号登?
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={onSubmit}>
              {mode === 'email' ? (
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Mail className="h-4 w-4 text-sky-600" />
                    邮箱
                  </label>
                  <input
                    type="email"
                    className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 px-4 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-500"
                    value={form.email}   // value?
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Phone className="h-4 w-4 text-sky-600" />
                    手机?
                  </label>
                  <input
                    className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 px-4 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-500"
                    value={form.phone}   // value?
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="请输入手机号"
                    autoComplete="tel"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Lock className="h-4 w-4 text-sky-600" />
                  密码
                </label>
                <input
                  type="password"
                  className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 px-4 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-500"
                  value={form.password}   // value?
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  placeholder="请输入密?
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="travel-btn-gradient mt-2 flex w-full items-center justify-center gap-2 py-3.5 text-base disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <LogIn className="h-5 w-5" strokeWidth={2.5} />
                )}
                {loading ? '登录中? : '登录'}
              </button>

              <p className="text-center text-xs leading-relaxed text-slate-500">
                登录凭证经后端校验后签发 JWT，用于保护你的行程与订单数据?
              </p>


              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white/85 px-3 text-xs text-slate-400">?/span>
                </div>
              </div>
              <a
                href="/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                管理员登?
              </a>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
