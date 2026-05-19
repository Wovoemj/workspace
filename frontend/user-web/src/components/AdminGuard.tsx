'use client'

/**
 * =====================================================
 * 管理员权限守卫组件 (AdminGuard)
 * =====================================================
 * 
 * 功能说明：
 * - 管理员页面访问权限控制组件
 * - 未登录时显示登录表单（用户名+密码）
 * - 自动检测后端服务连接状态
 * - Token 存储在 localStorage，支持会话恢复
 * - 提供登出功能
 * 
 * 权限机制：
 * - 使用 admin_token 标识管理员登录状态
 * - 通过 API 验证 Token 有效性
 * - 登录成功后显示子组件内容
 */

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Lock, LogIn, Loader2, Eye, EyeOff, AlertCircle, Shield, ChevronDown, User, LogOut } from 'lucide-react'

/** 后端地址，与 admin/page.tsx 保持一致 */
const API_BASE = ''  // 使用相对路径，通过 Next.js rewrites 代理

type Props = {
  children: React.ReactNode
}

type AdminInfo = {
  id?: number
  username?: string
  nickname?: string
  email?: string
  avatar_url?: string
  membership_level?: number
}

/** 构造带 admin_token 的 headers */
function adminHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

/** 直连后端的认证请求 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒超时
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...adminHeaders(), ...(options?.headers as Record<string, string>) },
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as any)?.error || `HTTP ${res.status}`)
    }
    return res.json()
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') {
      throw new Error('请求超时，请检查后端服务是否运行')
    }
    throw e
  }
}

export function AdminGuard({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [backendOk, setBackendOk] = useState<boolean | null>(null) // null=未检测 true=在线, false=离线
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // 检测后端是否在线
  useEffect(() => {
    if (token) return
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    fetch(`${API_BASE}/api/health`, { method: 'GET', signal: controller.signal })
      .then(r => { if (!cancelled) setBackendOk(r.ok) })
      .catch(() => { if (!cancelled) setBackendOk(false) })
      .finally(() => clearTimeout(timeoutId))
    return () => { cancelled = true }
  }, [token])

  // 获取管理员信息
  const fetchAdminInfo = useCallback(async () => {
    try {
      const data = await apiFetch<{ user?: AdminInfo }>('/api/users/me')
      if (data?.user) {
        setAdminInfo(data.user)
        // 保存到 localStorage 方便其他组件使用
        localStorage.setItem('admin_info', JSON.stringify(data.user))
      }
    } catch {
      // 忽略错误
    }
  }, [])

  // 检查是否已有 admin token 并验证其有效性
  const verifyToken = useCallback(async (tok: string): Promise<boolean> => {
    try {
      // 使用一个实际存在的 API 来验证 token
      await apiFetch<{ destinations?: any[] }>('/api/destinations?page=1&per_page=1')
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    // 尝试从 localStorage 恢复管理员信息
    const storedInfo = localStorage.getItem('admin_info')
    if (storedInfo) {
      try {
        setAdminInfo(JSON.parse(storedInfo))
      } catch {
        // ignore
      }
    }
    
    if (stored) {
      // 有 token 时验证是否有效
      verifyToken(stored).then(valid => {
        if (valid) {
          setToken(stored)
          fetchAdminInfo()
        } else {
          // token 过期或无效，清除并要求重新登录
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_info')
          setToken(null)
          setAdminInfo(null)
        }
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [verifyToken, fetchAdminInfo])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    setError('')
    setLoginLoading(true)

    try {
      // 直连后端登录（不走 Next.js 代理）
      const data = await apiFetch<{ success: boolean; token?: string; error?: string; is_admin?: boolean; user?: AdminInfo }>('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      })

      if (!data.success || !data.token) {
        setError(data.error || '登录失败，请检查用户名和密码')
        return
      }

      localStorage.setItem('admin_token', data.token)
      if (data.user) {
        setAdminInfo(data.user)
        localStorage.setItem('admin_info', JSON.stringify(data.user))
      }
      setToken(data.token)
      toast.success('管理员登录成功')
    } catch (err: any) {
      setError(err?.message || '网络错误，请确认后端服务已启动在 ' + API_BASE)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
    setToken(null)
    setAdminInfo(null)
    setUsername('')
    setPassword('')
    setShowUserMenu(false)
    toast.success('已退出管理员账号')
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // 未登录，显示登录表单
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 p-4">
        <div
          className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-0 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/70 px-4 py-1.5 text-xs font-semibold text-amber-800 shadow-sm backdrop-blur-sm">
              <Lock className="h-3.5 w-3.5" />
              管理员入口
            </div>
            <h1 className="bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-900 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              管理员登录
            </h1>
            <p className="mt-2 text-sm text-slate-600">请输入管理员用户名和密码</p>
          </div>


          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium ${
            backendOk === null ? 'bg-gray-50 text-gray-400' :
            backendOk ? 'bg-emerald-50 text-emerald-700' :
            'bg-red-50 text-red-600'
          }`}>
            {backendOk === null && (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 检测后端服务...</>
            )}
            {backendOk === true && (
              <><span className="h-2 w-2 rounded-full bg-emerald-500" /> 后端服务已连接 ({API_BASE})</>
            )}
            {backendOk === false && (
              <><AlertCircle className="h-3.5 w-3.5" /> 后端服务未启动！请先运行 <code className="mx-1 px-1.5 py-0.5 bg-white rounded border font-mono text-[11px]">python start_v2.py</code></>
            )}
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl shadow-sky-200/40 backdrop-blur-md sm:p-9">
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  用户名
                </label>
                <input
                  type="text"
                  className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 px-4 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  disabled={loginLoading}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Lock className="h-4 w-4 text-amber-600" />
                  密码
                </label>
                <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input h-11 w-full rounded-xl border-slate-200 bg-white/90 pl-4 pr-11 text-slate-900 shadow-inner shadow-slate-100/80 placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="off"
                  tabIndex={1}
                  disabled={loginLoading}
                />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" strokeWidth={2.5} />
                )}
                {loginLoading ? '登录中...' : '登录'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <a
                href="/login"
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                返回用户登录
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 已登录，显示内容
  return children
}
