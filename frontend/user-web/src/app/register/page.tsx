'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { Mail, User, Lock, Sparkles, ArrowRight } from 'lucide-react'
import { isValidEmail } from '@/lib/validation'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useUserStore()
  const returnUrl = searchParams.get('returnUrl') || '/'

  const [form, setForm] = useState({
    email: '',
    nickname: '',
    password: '',
    password2: '',
  })
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!form.email.trim()) {
            toast.error('请输入邮?')
      return
    }
    if (!isValidEmail(form.email)) {
            toast.error('邮箱格式不正?')
      return
    }
    if (!form.nickname.trim()) {
            toast.error('请填写昵?')
      return
    }
    if (!form.password || form.password.length < 6) {
            toast.error('密码至少 6 ?')
      return
    }
    if (form.password !== form.password2) {
            toast.error('两次密码不一?')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          nickname: form.nickname.trim(),
          password: form.password,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        const errText = data?.error || `HTTP ${res.status}`
        throw new Error(errText)
      }
      if (!data?.token || !data?.user) throw new Error('注册返回数据不完整')
      localStorage.setItem('auth_token', data.token)
      login(data.user)
      toast.success('注册成功')
      router.push(returnUrl)
    } catch (err: any) {
      toast.error(err?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-indigo-50 to-sky-100">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-40 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-400/15 blur-3xl"
        aria-hidden
      />

      <Navbar />
      <main className="relative z-10 pt-20 pb-16">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/70 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              加入智能旅游助手
            </div>
            <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
              创建账号
            </h1>
            <p className="mt-2 text-sm text-slate-600">使用邮箱注册，几分钟完成</p>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl shadow-indigo-200/40 backdrop-blur-md sm:p-9">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <span className="text-sm font-medium text-slate-500">已有账号</span>
              <Link
                href={returnUrl !== '/' ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
                className="group inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
              >
                去登?
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

            <form className="mt-6 space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Mail className="h-4 w-4 text-indigo-500" />
                  邮箱
                </label>
                <input
                  type="email"
                  className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 px-4 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-400"
                  value={form.email}   // value?
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <User className="h-4 w-4 text-indigo-500" />
                  昵称
                </label>
                <input
                  className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 px-4 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-400"
                  value={form.nickname}   // value?
                  onChange={(e) => setForm((s) => ({ ...s, nickname: e.target.value }))}
                  placeholder="例如：旅行者小?
                  required
                  autoComplete="nickname"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Lock className="h-4 w-4 text-indigo-500" />
                  密码
                </label>
                <input
                  type="password"
                  className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 px-4 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-400"
                  value={form.password}   // value?
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  placeholder="至少 6 ?
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Lock className="h-4 w-4 text-indigo-400" />
                  确认密码
                </label>
                <input
                  type="password"
                  className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 px-4 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-400"
                  value={form.password2}   // value?
                  onChange={(e) => setForm((s) => ({ ...s, password2: e.target.value }))}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="travel-btn-gradient mt-2 flex w-full items-center justify-center gap-2 py-3.5 text-base disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                                {loading ? '注册中? : '注册并登?'}
              </button>

              <p className="text-center text-xs leading-relaxed text-slate-500">
                注册即表示你同意安全存储密码哈希；登录态使?JWT（token ?localStorage: auth_token）?
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
