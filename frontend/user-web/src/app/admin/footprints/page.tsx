/**
 * =====================================================
 * 管理后台 - 足迹管理模块
 * =====================================================
 * 
 * 【功能列表】
 * - 用户足迹记录列表展示
 * - 用户 ID 筛选
 * - 目的地 ID 筛选
 * - 足迹详情查看（用户、目的地、来源、时间）
 * - 删除足迹记录
 * - 导出足迹数据
 * - 刷新列表功能
 * - 管理员权限校验
 * 
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 * - AdminGuard: 管理员权限守卫
 * 
 * 【API 接口】
 * - GET /api/footprints?user_id=xxx&destination_id=xxx&limit=300: 获取足迹列表
 * - DELETE /api/footprints/${id}: 删除足迹记录
 * 
 * 【状态管理】
 * - useState: rows, userId, destinationId, loading, isAdmin
 * - 认证：admin_token 存储在 localStorage
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AdminGuard } from '@/components/AdminGuard'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'

type FootprintRow = {
  id: string
  user_id: string
  destination_id: number
  source?: string
  visited_at?: string | null
  destination?: {
    id: number
    name: string
    city: string
    province: string
  } | null
}

export default function AdminFootprintsPage() {
  const router = useRouter()

  const [userId, setUserId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<FootprintRow[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const load = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    if (!token) {
      setRows([])
      setLoading(false)
      return
    }
    setIsAdmin(true)
    const authHeaders = { Authorization: `Bearer ${token}` }

    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '300')
      if (userId.trim()) qs.set('user_id', userId.trim())
      if (destinationId.trim()) qs.set('destination_id', destinationId.trim())

      const res = await fetch(`${API_BASE}/api/admin/footprints?${qs.toString()}`, { headers: authHeaders })
      if (res.status === 401) return router.push('/admin')
      if (res.status === 403) {
        toast.error('没有管理员权限')
        setLoading(false)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      setRows((data?.footprints ?? []) as FootprintRow[])
    } catch (e: any) {
      toast.error(e?.message || '加载足迹失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, destinationId])

  const onDelete = async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    if (!token) return router.push('/admin')
    if (!confirm('确定删除该足迹吗？')) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/footprints/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return router.push('/admin')
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      toast.success('删除成功')
      await load()
      window.parent?.postMessage({ type: 'admin:changed', reason: 'footprints' }, '*')
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen page-bg">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* 页面标题区域 */}
            <div className="mb-8">
              <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 mb-3 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回管理首页
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
                  足迹管理
                </h1>
              </div>
              <p className="text-gray-500 ml-13">查看和管理所有用户的足迹记录</p>
            </div>

            {!isAdmin ? (
              <div className="card p-8 bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 text-center">
                <div className="animate-pulse">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-indigo-200"></div>
                  <div className="h-4 w-32 mx-auto bg-indigo-200 rounded"></div>
                </div>
                <p className="text-indigo-400 mt-4">正在检查管理员权限...</p>
              </div>
            ) : (
              <>
                {/* 统计卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="card p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
                    <div className="text-3xl font-bold">{rows.length}</div>
                    <div className="text-indigo-100 text-sm">足迹总数</div>
                  </div>
                  <div className="card p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200">
                    <div className="text-3xl font-bold">{rows.filter(r => r.source === 'view').length}</div>
                    <div className="text-emerald-100 text-sm">浏览足迹</div>
                  </div>
                  <div className="card p-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-200">
                    <div className="text-3xl font-bold">{rows.filter(r => r.source === 'search').length}</div>
                    <div className="text-amber-100 text-sm">搜索足迹</div>
                  </div>
                  <div className="card p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-200">
                    <div className="text-3xl font-bold">{new Set(rows.map(r => r.user_id)).size}</div>
                    <div className="text-purple-100 text-sm">用户数</div>
                  </div>
                </div>

                {/* 过滤区域 */}
                <div className="card p-5 bg-gradient-to-r from-gray-50 to-indigo-50 border border-gray-100 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">筛选条件</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[150px]">
                      <input className="input bg-white/80 backdrop-blur shadow-sm" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="用户 ID" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <input className="input bg-white/80 backdrop-blur shadow-sm" value={destinationId} onChange={(e) => setDestinationId(e.target.value)} placeholder="目的地 ID" />
                    </div>
                    <button 
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-95 flex items-center gap-2"
                      onClick={() => load()} 
                      disabled={loading}
                    >
                      {loading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      刷新
                    </button>
                  </div>
                </div>

                {/* 列表区域 */}
                <div className="space-y-3">
                  {loading ? (
                    <div className="card p-8 bg-white border border-gray-100">
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="animate-pulse flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-200"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="card p-12 bg-gradient-to-br from-gray-50 to-indigo-50 border border-gray-100 text-center">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-gray-400 font-medium">暂无足迹记录</p>
                      <p className="text-gray-300 text-sm mt-1">用户访问后将显示在这里</p>
                    </div>
                  ) : (
                    rows.map((r, idx) => (
                      <div 
                        key={r.id} 
                        className="group card p-5 bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300 hover:-translate-y-0.5"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                {r.destination?.name || `目的地 ${r.destination_id}`}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-sm">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  用户 {r.user_id}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  {r.source || 'view'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                {r.destination?.city && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {r.destination.city}
                                  </span>
                                )}
                                {r.visited_at && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {new Date(r.visited_at).toLocaleString('zh-CN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Link href={`/destinations/${r.destination_id}`} className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              查看
                            </Link>
                            <button 
                              className="px-4 py-2 text-sm bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-1.5"
                              onClick={() => onDelete(r.id)}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </AdminGuard>
  )
}

