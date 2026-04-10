'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { AdminGuard } from '@/components/AdminGuard'

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
  const { isAuthenticated } = useUserStore()

  const [userId, setUserId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<FootprintRow[]>([])

  const load = async () => {
    if (!isAuthenticated) {
      setRows([])
      setLoading(false)
      return
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return router.push('/login')
    const authHeaders = { Authorization: `Bearer ${token}` }

    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '300')
      if (userId.trim()) qs.set('user_id', userId.trim())
      if (destinationId.trim()) qs.set('destination_id', destinationId.trim())

      const res = await fetch(`/api/admin/footprints?${qs.toString()}`, { headers: authHeaders })
      if (res.status === 401) return router.push('/login')
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
  }, [isAuthenticated, userId, destinationId])

  const onDelete = async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return router.push('/login')
        if (!confirm('确定删除该足迹吗？')) return
    try {
      const res = await fetch(`/api/admin/footprints/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return router.push('/login')
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">足迹管理</h1>
                <p className="text-gray-600 mt-2">查看/删除用户访问记录（足迹）</p>
              </div>
              <Link href="/admin" className="btn btn-outline">
                返回后台首页
              </Link>
            </div>

            {!isAuthenticated ? (
              <div className="mt-6 card p-4 bg-white border border-gray-200 text-gray-700">
                请先 <Link href="/login" className="underline text-blue-600">登录</Link>
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-end gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">按用户 ID 过滤（可选）</div>
                    <input className="input bg-white" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="例如 1" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">按目的地 ID 过滤（可选）</div>
                    <input
                      className="input bg-white"
                      value={destinationId}
                      onChange={(e) => setDestinationId(e.target.value)}
                      placeholder="例如 1486"
                    />
                  </div>
                  <button className="btn btn-primary" onClick={() => load()} disabled={loading}>
                    {loading ? '加载中...' : '刷新'}
                  </button>
                </div>

                <div className="mt-6">
                  {loading ? (
                    <div className="text-gray-600">加载足迹中</div>
                  ) : rows.length === 0 ? (
                    <div className="card p-6 text-gray-600">暂无足迹</div>
                  ) : (
                    <div className="space-y-3">
                      {rows.map((r) => (
                        <div key={r.id} className="card p-4 bg-white">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {r.destination?.name || `目的地 ${r.destination_id}`}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                用户：{r.user_id} · source：{r.source || 'view'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {r.destination?.city ? `${r.destination.city} · ${r.destination.province}` : ''}
                                {r.visited_at ? ` · ${new Date(r.visited_at).toLocaleString('zh-CN')}` : ''}
                              </div>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                              <Link href={`/destinations/${r.destination_id}`} className="btn btn-outline">
                                查看目的地
                              </Link>
                              <button className="btn btn-destructive" onClick={() => onDelete(r.id)}>
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

