/**
 * =====================================================
 * 管理后台 - 评论管理模块
 * =====================================================
 * 
 * 【功能列表】
 * - 用户评论列表展示
 * - 目的地 ID 筛选
 * - 评论详情查看（用户、内容、评分、时间）
 * - 删除违规评论
 * - 刷新列表功能
 * - 管理员权限校验
 * 
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 * - AdminGuard: 管理员权限守卫
 * - DestinationComment 类型定义
 * 
 * 【API 接口】
 * - GET /api/admin/comments?destination_id=xxx&limit=200: 获取评论列表
 * - DELETE /api/comments/${id}: 删除评论
 * 
 * 【状态管理】
 * - useState: comments, destinationId, loading, isAdmin
 * - 认证：admin_token 存储在 localStorage
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import type { DestinationComment } from '@/types'
import { AdminGuard } from '@/components/AdminGuard'

const API_BASE = ''  // 使用相对路径，通过 Next.js rewrites 代理

export default function AdminCommentsPage() {
  const router = useRouter()

  const [destinationId, setDestinationId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<DestinationComment[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const load = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    if (!token) {
      setComments([])
      setLoading(false)
      return
    }
    setIsAdmin(true)
    const authHeaders = { Authorization: `Bearer ${token}` }

    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '200')
      if (destinationId.trim()) qs.set('destination_id', destinationId.trim())

      const res = await fetch(`${API_BASE}/api/admin/comments?${qs.toString()}`, { headers: authHeaders })
      if (res.status === 401) {
        router.push('/admin')
        return
      }
      if (res.status === 403) {
        toast.error('没有管理员权限')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      setComments((data?.comments ?? []) as DestinationComment[])
    } catch (e: any) {
      toast.error(e?.message || '加载评论失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationId])

  const onDelete = async (commentId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    if (!token) return router.push('/admin')
    const authHeaders = { Authorization: `Bearer ${token}` }
    if (!confirm('确定删除该评论吗？')) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/comments/${commentId}`, { method: 'DELETE', headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        router.push('/admin')
        return
      }
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      toast.success('删除成功')
      await load()
      window.parent?.postMessage({ type: 'admin:changed', reason: 'comments' }, '*')
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
              <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-800 mb-3 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回管理首页
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-rose-800 to-pink-800 bg-clip-text text-transparent">
                  评论管理
                </h1>
              </div>
              <p className="text-gray-500 ml-13">查看和管理所有用户的评论</p>
            </div>

            {!isAdmin ? (
              <div className="card p-8 bg-gradient-to-br from-white to-rose-50 border border-rose-100 text-center">
                <div className="animate-pulse">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-200"></div>
                  <div className="h-4 w-32 mx-auto bg-rose-200 rounded"></div>
                </div>
                <p className="text-rose-400 mt-4">正在检查管理员权限...</p>
              </div>
            ) : (
              <>
                {/* 统计卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="card p-5 bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-200">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <div>
                        <div className="text-3xl font-bold">{comments.length}</div>
                        <div className="text-rose-100 text-sm">评论总数</div>
                      </div>
                    </div>
                  </div>
                  <div className="card p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <div>
                        <div className="text-3xl font-bold">{new Set(comments.map(c => c.destination_id)).size}</div>
                        <div className="text-amber-100 text-sm">涉及目的地</div>
                      </div>
                    </div>
                  </div>
                  <div className="card p-5 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div>
                        <div className="text-3xl font-bold">{new Set(comments.map(c => c.user_id)).size}</div>
                        <div className="text-violet-100 text-sm">评论用户</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 过滤区域 */}
                <div className="card p-5 bg-gradient-to-r from-gray-50 to-rose-50 border border-gray-100 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">筛选条件</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <input
                        className="input bg-white/80 backdrop-blur shadow-sm"
                        value={destinationId}
                        onChange={(e) => setDestinationId(e.target.value)}
                        placeholder="输入目的地 ID 筛选"
                      />
                    </div>
                    <button 
                      className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-medium rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl hover:from-rose-700 hover:to-pink-700 transition-all active:scale-95 flex items-center gap-2"
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
                          <div key={i} className="animate-pulse flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="card p-12 bg-gradient-to-br from-gray-50 to-rose-50 border border-gray-100 text-center">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-gray-400 font-medium">暂无评论</p>
                      <p className="text-gray-300 text-sm mt-1">用户评论后将显示在这里</p>
                    </div>
                  ) : (
                    comments.map((c, idx) => (
                      <div 
                        key={c.id} 
                        className="group card p-5 bg-white border border-gray-100 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-100 transition-all duration-300 hover:-translate-y-0.5"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {c.user?.nickname?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                                  {c.user?.nickname || '匿名用户'}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                  目的地 {c.destination_id}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : '未知时间'}
                              </div>
                              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-gray-700 whitespace-pre-wrap break-words group-hover:bg-gray-100 transition-colors">
                                {c.content}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Link 
                              href={`/destinations/${c.destination_id}`} 
                              className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              查看
                            </Link>
                            <button 
                              className="px-4 py-2 text-sm bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-1.5"
                              onClick={() => onDelete(c.id)}
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

