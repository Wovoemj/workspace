'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { Mail, User as UserIcon, Lock, Sparkles, ArrowRight, Phone, CheckCircle2, XCircle } from 'lucide-react'
import { isValidEmail, isValidPhone } from '@/lib/validation'

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
  autoComplete,
  error,
  required = false,
  optional = false,
}: {
  label: string
  fieldKey: string
  icon: any
  type?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder: string
  autoComplete?: string
  error?: string | null
  touched?: boolean
  required?: boolean
  optional?: boolean
}) {
  const hasError = error && value && value.length > 0
  const hasSuccess = !error && value.trim() && value.length >= (fieldKey === 'username' ? 3 : fieldKey === 'nickname' ? 2 : 1)
  const showIcon = hasError || hasSuccess

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
        <Icon className="h-4 w-4 text-indigo-500" />
        {label}
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-xs text-gray-400 font-normal">(选填)</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          className={`h-12 w-full rounded-xl border-2 bg-white text-gray-900 text-base transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
              : hasSuccess
              ? 'border-green-300 focus:border-green-400 focus:ring-green-200'
              : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-200'
          }`}
          style={{ paddingLeft: '2.5rem', paddingRight: showIcon ? '2.5rem' : '1rem' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
        {hasError && (
          <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
        )}
        {hasSuccess && !hasError && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
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

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useUserStore()
  const returnUrl = searchParams.get('returnUrl') || '/'

  const [form, setForm] = useState({
    username: '',
    nickname: '',
    phone: '',
    email: '',
    password: '',
    password2: '',
  })
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)

  // 实时校验状态
  const [touched, setTouched] = useState<Record<string, boolean>>({
    username: false,
    nickname: false,
    phone: false,
    email: false,
    password: false,
    password2: false,
  })

  // 已存在错误状态
  const [existsError, setExistsError] = useState<Record<string, string>>({})

  // 检查用户名/邮箱/手机号是否已存在
  const checkExists = async (field: string, value: string) => {
    if (!value.trim()) return
    if (field === 'username' && !/^[a-zA-Z0-9_]+$/.test(value)) return
    if (field === 'email' && !isValidEmail(value)) return
    if (field === 'phone' && value && !isValidPhone(value)) return

    try {
      const res = await fetch(`/api/users/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (data.success && data.exists && data.exists[field]) {
        const fieldNames: Record<string, string> = {
          username: '用户名',
          email: '邮箱',
          phone: '手机号'
        }
        setExistsError(prev => ({ ...prev, [field]: `该${fieldNames[field]}已被注册` }))
      } else {
        setExistsError(prev => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    } catch {
      // 忽略检查错误
    }
  }

  // 校验函数 - 使用 useMemo 避免每次渲染重新创建
  const validateUsername = (v: string) => {
    if (!v.trim()) return '请输入用户名'
    if (v.length < 3) return '用户名至少3位'
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return '用户名只能包含字母、数字、下划线'
    return null
  }
  const validateNickname = (v: string) => {
    if (!v.trim()) return '请输入昵称'
    if (v.length < 2) return '昵称至少2位'
    return null
  }
  const validatePhone = (v: string) => {
    if (!v.trim()) return null
    if (!isValidPhone(v)) return '手机号格式不正确'
    return null
  }
  const validateEmail = (v: string) => {
    if (!v.trim()) return '请输入邮箱'
    if (!isValidEmail(v)) return '邮箱格式不正确'
    return null
  }
  const validatePassword = (v: string) => {
    if (!v) return '请输入密码'
    if (v.length < 6) return '密码至少6位'
    return null
  }
  const validatePassword2 = (v: string) => {
    if (!v) return '请确认密码'
    if (v !== form.password) return '两次密码不一致'
    return null
  }

  // 密码强度检测
  const passwordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, text: '', color: '' }
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 8) score++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++

    if (score <= 2) return { level: 1, text: '弱', color: 'bg-red-500' }
    if (score <= 3) return { level: 2, text: '中等', color: 'bg-yellow-500' }
    return { level: 3, text: '强', color: 'bg-green-500' }
  }

  const strength = passwordStrength(form.password)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const errors: string[] = []
    const vUsername = validateUsername(form.username)
    const vNickname = validateNickname(form.nickname)
    const vPhone = validatePhone(form.phone)
    const vEmail = validateEmail(form.email)
    const vPassword = validatePassword(form.password)
    const vPassword2 = validatePassword2(form.password2)

    if (vUsername) errors.push(vUsername)
    if (vNickname) errors.push(vNickname)
    if (vPhone) errors.push(vPhone)
    if (vEmail) errors.push(vEmail)
    if (vPassword) errors.push(vPassword)
    if (vPassword2) errors.push(vPassword2)

    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          nickname: form.nickname.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 409) {
        if (data?.error?.includes('用户名')) {
          toast.error('用户名已被注册，请换一个吧～')
        } else if (data?.error?.includes('邮箱')) {
          toast.error('邮箱已被注册，请换一个或直接登录～')
        } else if (data?.error?.includes('手机')) {
          toast.error('手机号已被注册，请换一个～')
        } else {
          toast.error('账号已存在，请直接登录或换一个用户名～')
        }
        return
      }

      if (!res.ok || !data?.success) {
        const errText = data?.error || `注册失败 (${res.status})`
        throw new Error(errText)
      }
      if (!data?.token || !data?.user) throw new Error('注册返回数据不完整')

      localStorage.setItem('auth_token', data.token)
      login(data.user)
      toast.success('🎉 注册成功，欢迎加入！')
      router.push(returnUrl)
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('用户名') || msg.includes('username')) {
        toast.error('用户名已被注册，请换一个～')
      } else if (msg.includes('邮箱') || msg.includes('email')) {
        toast.error('邮箱已被注册，请换一个或直接登录～')
      } else {
        toast.error(msg || '注册失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* 装饰圆形 - 增强视觉效果 */}
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 opacity-20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-24 bottom-40 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-300 to-blue-400 opacity-20 blur-3xl animate-float-reverse" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 opacity-15 blur-3xl" />

      <div className="relative z-10">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center sm:mb-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/80 px-5 py-2 text-sm font-semibold text-indigo-700 shadow-lg backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                加入智能旅游助手
              </div>
              <h1 className="bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-900 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
                创建账号
              </h1>
              <p className="mt-3 text-base text-gray-600">完善信息即可开始探索世界的精彩</p>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/95 p-8 shadow-2xl backdrop-blur-md">
              <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-5">
                <span className="text-sm font-medium text-gray-500">已有账号</span>
                <Link
                  href={returnUrl !== '/' ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
                  className="group inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
                >
                  去登录
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {isAuthenticated && (
                <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  你已登录，可直接返回{' '}
                  <Link href="/" className="font-semibold underline underline-offset-2">
                    首页
                  </Link>
                  ?
                </div>
              )}

              <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                {/* 用户名 */}
                <InputField
                  label="用户名"
                  fieldKey="username"
                  icon={UserIcon}
                  value={form.username}
                  onChange={(v) => {
                    setForm((s) => ({ ...s, username: v }))
                    if (existsError.username) {
                      setExistsError(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.username
                        return newErrors
                      })
                    }
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, username: true }))
                    checkExists('username', form.username)
                  }}
                  placeholder="用于登录，建议字母+数字"
                  autoComplete="username"
                  error={existsError.username || validateUsername(form.username)}
                  required
                />

                {/* 昵称 */}
                <InputField
                  label="昵称"
                  fieldKey="nickname"
                  icon={UserIcon}
                  value={form.nickname}
                  onChange={(v) => setForm((s) => ({ ...s, nickname: v }))}
                  onBlur={() => setTouched((t) => ({ ...t, nickname: true }))}
                  placeholder="大家看到的名字"
                  autoComplete="nickname"
                  error={validateNickname(form.nickname)}
                  required
                />

                {/* 手机号 */}
                <InputField
                  label="手机号"
                  fieldKey="phone"
                  icon={Phone}
                  type="tel"
                  value={form.phone}
                  onChange={(v) => {
                    setForm((s) => ({ ...s, phone: v }))
                    if (existsError.phone) {
                      setExistsError(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.phone
                        return newErrors
                      })
                    }
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, phone: true }))
                    checkExists('phone', form.phone)
                  }}
                  placeholder="选填，便于接收行程通知"
                  autoComplete="tel"
                  error={existsError.phone || validatePhone(form.phone)}
                  optional
                />

                {/* 邮箱 */}
                <InputField
                  label="邮箱"
                  fieldKey="email"
                  icon={Mail}
                  type="email"
                  value={form.email}
                  onChange={(v) => {
                    setForm((s) => ({ ...s, email: v }))
                    if (existsError.email) {
                      setExistsError(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.email
                        return newErrors
                      })
                    }
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, email: true }))
                    checkExists('email', form.email)
                  }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  error={existsError.email || validateEmail(form.email)}
                  required
                />

                {/* 密码 */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Lock className="h-4 w-4 text-indigo-500" />
                    密码<span className="text-red-500">*</span>
                    {form.password && (
                      <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full text-white ${strength.color}`}>
                        {strength.text}
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    className={`h-12 w-full rounded-xl border-2 bg-white text-gray-900 text-base transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      validatePassword(form.password) && touched.password
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                        : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-200'
                    }`}
                    style={{ paddingLeft: '1rem', paddingRight: '1rem' }}
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                  />
                  {validatePassword(form.password) && touched.password && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <XCircle className="h-3 w-3" />
                      {validatePassword(form.password)}
                    </p>
                  )}
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              level <= strength.level ? strength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 确认密码 */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Lock className="h-4 w-4 text-indigo-400" />
                    确认密码<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      className={`h-12 w-full rounded-xl border-2 bg-white text-gray-900 text-base transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                        validatePassword2(form.password2) && touched.password2
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                          : !validatePassword2(form.password2) && form.password2
                          ? 'border-green-300 focus:border-green-400 focus:ring-green-200'
                          : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-200'
                      }`}
                      style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                      value={form.password2}
                      onChange={(e) => setForm((s) => ({ ...s, password2: e.target.value }))}
                      onBlur={() => setTouched((t) => ({ ...t, password2: true }))}
                      placeholder="再次输入密码"
                      autoComplete="new-password"
                    />
                    {form.password2 && !validatePassword2(form.password2) && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                    {form.password2 && validatePassword2(form.password2) && touched.password2 && (
                      <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                    )}
                  </div>
                  {validatePassword2(form.password2) && touched.password2 && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <XCircle className="h-3 w-3" />
                      {validatePassword2(form.password2)}
                    </p>
                  )}
                  {form.password2 && !validatePassword2(form.password2) && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      两次密码一致
                    </p>
                  )}
                </div>

                {/* 提示信息 */}
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    <span className="font-semibold">💡 温馨提示：</span>
                    <br /><span className="text-red-500">*</span> 为必填项 · 密码建议包含大小写字母和特殊字符
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : null}
                  {loading ? '注册中...' : '注册并登录'}
                </button>

                <p className="text-center text-xs text-gray-500">
                  注册即表示同意服务条款，登录态使用JWT（token 存储于 localStorage）
                </p>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
