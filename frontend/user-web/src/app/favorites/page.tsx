'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'

type Favorite = {
  id: number
  name: string
  city: string
  province: string
  cover_image?: string
}

export default function FavoritesPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useUserStore()

  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const count = useMemo(() => favorites.length, [favorites.length])

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return null
    return { Authorization: `Bearer ${token}` }
  }

  const loadFavorites = async () => {
    if (!isAuthenticated) return
    const authHeaders = getAuthHeaders()
    if (!authHeaders) {
      router.push('/login')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/favorites', { headers: authHeaders })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      setFavorites((data?.destinations ?? []) as Favorite[])
    } catch (e: any) {
      const msg = e?.message || '加载收藏失败'
      setError(msg)
      toast.error(e?.message || '加载收藏失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setFavorites([])
      setLoading(false)
      setError(null)
      return
    }
    loadFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const addSample = async () => {
    const authHeaders = getAuthHeaders()
    if (!authHeaders) {
      router.push('/login')
      return
    }
    try {
      // 取一个存在的目的地作为“示例收藏?
      const destRes = await fetch('/api/destinations?page=1&per_page=1', { cache: 'no-store' })
      const destData = await destRes.json().catch(() => ({}))
      const first = destData?.destinations?.[0]
      if (!first?.id) throw new Error('未找到可收藏的目的地')

      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_id: first.id }),
      })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
                        toast.success('已添加示例收？')
      await loadFavorites()
    } catch (e: any) {
      toast.error(e?.message || '添加示例收藏失败')
    }
  }

  const remove = async (id: number) => {
    const authHeaders = getAuthHeaders()
    if (!authHeaders) {
      router.push('/login')
      return
    }
    try {
      const res = await fetch(`/api/favorites/${id}`, { method: 'DELETE', headers: authHeaders })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      toast.success('已取消收藏')
      await loadFavorites()
    } catch (e: any) {
      toast.error(e?.message || '取消收藏失败')
    }
  }

  const coverSrc = (d: Favorite) => resolveCoverSrc(d?.cover_image)

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
                  <p className="text-gray-600 mt-2">收藏数据来自后端 `/api/favorites` 接口</p>
              </div>
              <div className="text-sm text-gray-700">共 {count} 项</div>
            </div>

            {!isAuthenticated ? (
              <div className="mt-6 card p-4 bg-white border border-gray-200 text-gray-700">
                请先 <Link href="/login" className="underline text-blue-600">登录</Link> 后查看收藏
              </div>
            ) : loading ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card p-4 bg-white animate-pulse">
                    <div className="h-24 bg-gray-200 rounded" />
                    <div className="mt-3 h-4 bg-gray-200 rounded w-2/3" />
                    <div className="mt-2 h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="mt-6 card p-6 border-red-200 bg-red-50 text-red-700">
                <div className="font-semibold">加载收藏失败</div>
                <div className="text-sm opacity-90 mt-2">{error}</div>
                <div className="mt-4 flex gap-3 flex-wrap">
                  <button className="btn btn-outline" type="button" onClick={() => loadFavorites()}>
                    重试
                  </button>
                  <Link href="/destinations" className="btn btn-primary">
                    去发现目的地
                  </Link>
                </div>
              </div>
            ) : favorites.length === 0 ? (
              <div className="mt-6 card p-6 text-gray-600">
                暂无收藏。你可以?
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="btn btn-primary" onClick={addSample}>
                    添加示例收藏
                  </button>
                  <Link href="/destinations" className="btn btn-outline">
                    去目的地列表
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {favorites.map((f) => (
                  <div key={f.id} className="card overflow-hidden bg-white">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="md:w-64 aspect-video bg-gradient-to-br from-blue-100 to-purple-100 relative">
                        <img
                          src={coverSrc(f)}
                          alt={f.name}
                          loading="lazy"
                          onError={onImgErrorUseFallback}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="text-sm font-semibold line-clamp-1">{f.name}</div>
                          <div className="text-[11px] opacity-90 line-clamp-1">
                            {f.city} · {f.province}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 flex-1">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="font-semibold text-gray-900">{f.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {f.city} · {f.province}
                            </div>
                          </div>
                          <div className="flex gap-3 flex-wrap">
                            <button className="btn btn-outline" onClick={() => remove(f.id)}>
                              取消收藏
                            </button>
                            <Link href={`/destinations/${f.id}`} className="btn btn-primary">
                              查看详情
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user ? <div className="mt-6 text-xs text-gray-500">当前用户：{user.nickname}</div> : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

