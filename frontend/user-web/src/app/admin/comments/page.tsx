'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import type { DestinationComment } from '@/types'
import { AdminGuard } from '@/components/AdminGuard'

export default function AdminCommentsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useUserStore()

  const [destinationId, setDestinationId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<DestinationComment[]>([])

  const load = async () => {
    if (!isAuthenticated) {
      setComments([])
      setLoading(false)
      return
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return router.push('/login')
    const authHeaders = { Authorization: `Bearer ${token}` }

    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '200')
      if (destinationId.trim()) qs.set('destination_id', destinationId.trim())

      const res = await fetch(`/api/admin/comments?${qs.toString()}`, { headers: authHeaders })
      if (res.status === 401) {
        router.push('/login')
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
  }, [destinationId, isAuthenticated])

  const onDelete = async (commentId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return router.push('/login')
    const authHeaders = { Authorization: `Bearer ${token}` }
        if (!confirm('确定删除该评论吗？')) return
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE', headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        router.push('/login')
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">评论管理</h1>
                <p className="text-gray-600 mt-2">删除/管理所有目的地评论</p>
              </div>
              <Link href="/admin" className="btn btn-outline">
                返回后台首页
              </Link>
            </div>

            {!isAuthenticated ? (
              <div className="mt-6 card p-4 bg-white border border-gray-200 text-gray-700">
                请先 <Link href="/login" className="underline text-blue-600">登录</Link>?
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-end gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">按目的地 ID 过滤（可选）</div>
                    <input
                      className="input bg-white"
                      value={destinationId}   // value?
                      onChange={(e) => setDestinationId(e.target.value)}
                      placeholder="例如 1"
                    />
                  </div>
                  <button className="btn btn-primary" onClick={() => load()} disabled={loading}>
                    {loading ? '加载中...' : '刷新'}
                  </button>
                </div>

                <div className="mt-6">
                  {loading ? (
                    <div className="text-gray-600">加载评论中...</div>
                  ) : comments.length === 0 ? (
                    <div className="card p-6 text-gray-600">暂无评论</div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="card p-4 bg-white">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <div className="text-sm text-gray-500">
                                评论 ID：{c.id} · 目的地：{c.destination_id}
                              </div>
                              <div className="font-semibold mt-1">{c.user?.nickname || '匿名用户'}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                              </div>
                              <div className="text-gray-800 mt-3 whitespace-pre-wrap break-words">{c.content}</div>
                            </div>
                            <div>
                              <button className="btn btn-outline" onClick={() => onDelete(c.id)}>
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AdminGuard>
  )
}

