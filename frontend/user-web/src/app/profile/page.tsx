'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { MobileProfile } from '@/components/profile/MobileProfile'
import { useUserStore } from '@/store'
import type { Order } from '@/types'
import { ArrowRight, MapPin, Crown, Sparkles, LogOut, Pencil, User, ClipboardList, Heart, Clock, CalendarDays } from 'lucide-react'
import { resolveCoverSrc } from '@/lib/media'

function aggregateFootprintsFromApi(rows: any[], maxDests = 6) {
  const map = new Map<number, { rows: any[] }>()
  for (const r of rows) {
    const dest = r?.destination
    const id = Number(dest?.id ?? r.destination_id)
    if (!Number.isFinite(id) || !dest?.name) continue
    if (!map.has(id)) map.set(id, { rows: [] })
    map.get(id)!.rows.push(r)
  }
  const list: Array<{ id: string; destination: any; visitDate: string; visitCount: number }> = []
  for (const [, { rows }] of map) {
    rows.sort((a, b) => new Date(b.visited_at || 0).getTime() - new Date(a.visited_at || 0).getTime())
    const first = rows[0]
    const dest = first.destination
    list.push({
      id: String(first.id),
      destination: {
        id: Number(dest.id),
        name: String(dest.name || ''),
        city: String(dest.city || ''),
        province: String(dest.province || ''),
        cover_image: dest.cover_image || null,
        rating: dest.rating ?? null,
      },
      visitDate: String(first.visited_at || ''),
      visitCount: rows.length,
    })
  }
  list.sort((a, b) => {
    const ta = a.visitDate ? new Date(a.visitDate).getTime() : 0
    const tb = b.visitDate ? new Date(b.visitDate).getTime() : 0
    return tb - ta
  })
  return list.slice(0, maxDests)
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useUserStore()

  type FavoritePreview = {
    id: number
    name: string
    city: string
    province: string
    cover_image?: string | null
    rating?: number | null
    ticket_price?: number | null
  }

  type Footprint = {
    id: string
    destination: {
      id: number
      name: string
      city: string
      province: string
      cover_image?: string | null
      rating?: number | null
    }
    visitDate: string
    visitCount: number
  }

  const [counts, setCounts] = useState<{ trips: number; favorites: number; orders: number }>({ trips: 0, favorites: 0, orders: 0 })
  const [countsLoading, setCountsLoading] = useState(false)

  const [favoritesPreview, setFavoritesPreview] = useState<FavoritePreview[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  const [footprints, setFootprints] = useState<Footprint[]>([])
  const [footprintsLoading, setFootprintsLoading] = useState(false)
  const [footprintTotal, setFootprintTotal] = useState(0)

  const [recentTrips, setRecentTrips] = useState<Array<{ id: number; created_at?: string | null }>>([])

  type SectionKey = 'info' | 'orders' | 'favorites' | 'footprints' | 'trips'
  const [section, setSection] = useState<SectionKey>('info')

  const [ordersAll, setOrdersAll] = useState<Order[]>([])
  const [favoritesAll, setFavoritesAll] = useState<FavoritePreview[]>([])
  const [tripsAll, setTripsAll] = useState<Array<any>>([])

  const [messagesUnread, setMessagesUnread] = useState(0)
  const couponCount = 2
  const reviewCount = 0

  const [expandedOrderId, setExpandedOrderId] = useState<string | number | null>(null)

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || !user) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return
    const authHeaders = { Authorization: `Bearer ${token}` }
    setCountsLoading(true)
    setFavoritesLoading(true)
    setFootprintsLoading(true)

    try {
      const [tripsData, favoritesData, ordersData] = await Promise.all([
        fetch('/api/me/trips', { headers: authHeaders }).then((r) => r.json().catch(() => ({}))),
        fetch('/api/favorites', { headers: authHeaders }).then((r) => r.json().catch(() => ({}))),
        fetch('/api/orders', { headers: authHeaders }).then((r) => r.json().catch(() => ({}))),
      ])

      const trips = Array.isArray(tripsData?.trips) ? tripsData.trips : []
      const favorites = Array.isArray(favoritesData?.destinations) ? favoritesData.destinations : []
      const orders = Array.isArray(ordersData?.orders) ? ordersData.orders : []

      setCounts({ trips: trips.length, favorites: favorites.length, orders: orders.length })
      setTripsAll(trips as any[])
      setFavoritesAll(favorites as any[])
      setOrdersAll(orders as Order[])
      const rt: Array<{ id: number; created_at: string | null }> = trips
        .slice(0, 3)
        .map((t: any) => ({ id: Number(t.id), created_at: t.created_at || null }))
        .filter((t: any) => Number.isFinite(t.id))
      setRecentTrips(rt)
      setFavoritesPreview((favorites as FavoritePreview[]).slice(0, 3))

      try {
        const uid = Number(user.id)
        if (Number.isFinite(uid)) {
          const nr = await fetch(`/api/notifications?user_id=${uid}&is_read=false&per_page=1`).then((r) =>
            r.json().catch(() => ({})),
          )
          if (nr?.success && typeof nr.total === 'number') setMessagesUnread(nr.total)
          else setMessagesUnread(0)
        }
      } catch {
        setMessagesUnread(0)
      }

      try {
        const res = await fetch('/api/me/footprints?limit=80', { headers: authHeaders })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success && Array.isArray(data?.footprints)) {
          if (typeof data.total === 'number' && Number.isFinite(data.total)) {
            setFootprintTotal(data.total)
          }
          const next = aggregateFootprintsFromApi(data.footprints as any[], 6)
          setFootprints(next as Footprint[])
          return
        }
      } catch {
        // fallback below
      }

      if (!rt.length) {
        setFootprints([])
        setFootprintTotal(0)
        return
      }

      const results = await Promise.all(
        rt.map(async (t) => {
          const res = await fetch(`/api/trips/${t.id}/items`, { headers: authHeaders })
          const data = await res.json().catch(() => ({}))
          if (!res.ok || !data?.success) return { tripCreatedAt: t.created_at, items: [] }
          return { tripCreatedAt: t.created_at, items: data?.items || [] }
        }),
      )
      const merged: Array<Omit<Footprint, 'visitCount'> & { visitCount?: number }> = []
      for (const r of results) {
        const visitDate = r.tripCreatedAt || ''
        for (const it of r.items || []) {
          if (!it?.destination?.id) continue
          const dest = it.destination
          merged.push({
            id: `${dest.id}-${visitDate}-${it.id || it.sort_order || ''}`,
            destination: {
              id: Number(dest.id),
              name: String(dest.name || ''),
              city: String(dest.city || ''),
              province: String(dest.province || ''),
              cover_image: dest.cover_image || null,
              rating: dest.rating || null,
            },
            visitDate,
          })
        }
      }
      merged.sort((a, b) => {
        const ta = a.visitDate ? new Date(a.visitDate).getTime() : 0
        const tb = b.visitDate ? new Date(b.visitDate).getTime() : 0
        return tb - ta
      })
      const counts = new Map<number, number>()
      for (const m of merged) {
        counts.set(m.destination.id, (counts.get(m.destination.id) || 0) + 1)
      }
      const seen = new Set<number>()
      const deduped: Footprint[] = []
      for (const m of merged) {
        if (seen.has(m.destination.id)) continue
        seen.add(m.destination.id)
        deduped.push({
          ...m,
          visitCount: counts.get(m.destination.id) || 1,
        })
        if (deduped.length >= 6) break
      }
      setFootprints(deduped)
      setFootprintTotal(deduped.length)
    } catch {
      setCounts({ trips: 0, favorites: 0, orders: 0 })
      setFavoritesPreview([])
      setRecentTrips([])
      setTripsAll([])
      setFavoritesAll([])
      setOrdersAll([])
      setFootprints([])
      setFootprintTotal(0)
    } finally {
      setCountsLoading(false)
      setFavoritesLoading(false)
      setFootprintsLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const onDeleteFootprint = useCallback(
    async (footprintId: string) => {
      const token = localStorage.getItem('auth_token')
      if (!token) return
      const id = parseInt(footprintId, 10)
      if (!Number.isFinite(id)) throw new Error('bad id')
      const res = await fetch(`/api/me/footprints/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) throw new Error('delete failed')
      await loadProfile()
    },
    [loadProfile],
  )

  const onLogout = () => {
    logout()
        toast.success('已退出登?')
    router.push('/')
  }

  const avatarInitial = user?.nickname?.trim()?.[0] || user?.phone?.trim()?.[0] || '?'
  const avatarGradients = [
    'from-blue-600 to-purple-600',
    'from-emerald-600 to-teal-500',
    'from-rose-600 to-orange-500',
    'from-cyan-600 to-blue-500',
    'from-indigo-600 to-violet-600',
  ]
  const avatarIdx = Math.abs((avatarInitial?.charCodeAt(0) || 0) % avatarGradients.length)
  const membershipText = user?.membership_level && user.membership_level > 1 ? `VIP ${user.membership_level}` : '普通会员'

  const coverSrc = (d: { cover_image?: string | null }) => resolveCoverSrc(d?.cover_image)

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="lg:hidden">
          {!isAuthenticated || !user ? (
            <div className="min-h-[60vh] px-6 py-16 text-center bg-gradient-to-b from-sky-50 to-white">
              <p className="text-slate-600">登录后同步行程、收藏与足迹</p>
              <Link href="/login" className="mt-6 inline-flex rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white">
                登录 / 注册
              </Link>
            </div>
          ) : (
            <MobileProfile
              user={user}
              router={router}
              counts={counts}
              countsLoading={countsLoading}
              favoritesLoading={favoritesLoading}
              favoritesAll={favoritesAll}
              footprints={footprints}
              footprintsLoading={footprintsLoading}
              footprintTotal={footprintTotal}
              ordersAll={ordersAll}
              messagesUnread={messagesUnread}
              reviewCount={reviewCount}
              couponCount={couponCount}
              onLogout={onLogout}
              onRefresh={loadProfile}
              onDeleteFootprint={onDeleteFootprint}
            />
          )}
        </div>

        <div className="hidden lg:block max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card p-6 relative">
            {isAuthenticated ? (
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <Link
                  href="/profile/edit"
                  className="btn btn-outline p-2 h-9 px-3 flex items-center gap-1.5"
                  aria-label="编辑资料"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="text-sm">编辑</span>
                </Link>
                <button
                  onClick={onLogout}
                  className="btn btn-destructive h-9 px-3 flex items-center gap-1.5"
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">退出</span>
                </button>
              </div>
            ) : null}

            <div className="flex items-start gap-4 pr-20">
              <div className="relative group">
                <div
                  className={`w-16 h-16 shrink-0 rounded-full overflow-hidden shadow-lg border-2 border-white ${
                    user?.avatar_url ? '' : `bg-gradient-to-r ${avatarGradients[avatarIdx]} text-white flex items-center justify-center font-bold text-2xl`
                  }`}
                >
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={user.nickname || '用户头像'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement?.classList.add(`bg-gradient-to-r`, avatarGradients[avatarIdx], 'text-white', 'flex', 'items-center', 'justify-center', 'font-bold', 'text-2xl')
                        const span = document.createElement('span')
                        span.textContent = avatarInitial
                        e.currentTarget.parentElement?.appendChild(span)
                      }}
                    />
                  ) : (
                    <span>{avatarInitial}</span>
                  )}
                </div>

                <Link
                  href="/profile/edit"
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all"
                  title="修改头像"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="min-w-0 pt-1">
                <h1 className="text-2xl font-bold text-gray-900">{user?.nickname || '我的'}</h1>
                <p className="text-gray-600 mt-2">
                                    {user?.nickname ? `Hi，欢迎回来～` : '查看你的行程、收藏和订单?'}
                  {user?.phone ? (
                    <span className="block sm:inline sm:ml-1 text-sm text-gray-500 mt-1 sm:mt-0">
                      {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                    </span>
                  ) : null}
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ml-0 sm:ml-2 mt-2 sm:mt-0 align-middle border ${user?.is_admin ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    <Crown className="h-3 w-3" />
                    {user?.is_admin ? '管理员' : membershipText}
                  </span>
                </p>
              </div>
            </div>

            {!isAuthenticated || !user ? (
              <div className="mt-6 card p-4 bg-white border border-gray-200 text-gray-700">
                请先 <Link href="/login" className="underline text-blue-600">登录</Link> 后查看个人信息
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-col lg:flex-row gap-6">
                  <aside className="hidden lg:block lg:w-64 lg:shrink-0">
                    <div className="rounded-2xl border border-gray-200 bg-white p-3 sticky top-24">
                      <div className="text-sm font-semibold text-gray-900 mb-3">个人中心</div>
                      <nav className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setSection('info')}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-sm transition ${
                            section === 'info'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <User className="h-4 w-4" />
                            个人信息
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSection('orders')}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-sm transition ${
                            section === 'orders'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            我的订单
                          </span>
                          <span className="text-xs text-gray-500">{counts.orders}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSection('favorites')}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-sm transition ${
                            section === 'favorites'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Heart className="h-4 w-4" />
                            我的收藏
                          </span>
                          <span className="text-xs text-gray-500">{counts.favorites}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSection('footprints')}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-sm transition ${
                            section === 'footprints'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            浏览足迹
                          </span>
                          <span className="text-xs text-gray-500">{footprintTotal || footprints.length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSection('trips')}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-sm transition ${
                            section === 'trips'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            我的行程
                          </span>
                          <span className="text-xs text-gray-500">{counts.trips}</span>
                        </button>
                        {user?.is_admin ? (
                          <a
                            href="/admin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm transition hover:bg-amber-100"
                          >
                            <span className="inline-flex items-center gap-2 text-amber-700 font-semibold">
                              <Crown className="h-4 w-4" />
                              管理后台
                            </span>
                            <span className="text-xs text-amber-500">🔧</span>
                          </a>
                        ) : null}
                      </nav>
                    </div>
                  </aside>

                  <div className="flex-1 min-w-0">
                    <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto px-1">
                      <button type="button" onClick={() => setSection('info')} className={`shrink-0 px-3 py-1.5 rounded-full border text-xs transition ${section === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700'}`}>
                        个人信息
                      </button>
                      <button type="button" onClick={() => setSection('orders')} className={`shrink-0 px-3 py-1.5 rounded-full border text-xs transition ${section === 'orders' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700'}`}>
                        订单
                      </button>
                      <button type="button" onClick={() => setSection('favorites')} className={`shrink-0 px-3 py-1.5 rounded-full border text-xs transition ${section === 'favorites' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700'}`}>
                        收藏
                      </button>
                      <button type="button" onClick={() => setSection('footprints')} className={`shrink-0 px-3 py-1.5 rounded-full border text-xs transition ${section === 'footprints' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700'}`}>
                        足迹
                      </button>
                      <button type="button" onClick={() => setSection('trips')} className={`shrink-0 px-3 py-1.5 rounded-full border text-xs transition ${section === 'trips' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700'}`}>
                        行程
                      </button>
                    </div>

                    {section === 'info' ? (
                      <>
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => (counts.trips ? router.push('/itineraries') : router.push('/assistant'))}
                    className="card p-4 bg-white border border-gray-200 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-600">我的行程</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                          {counts.trips > 0 ? counts.trips : '0'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                                                    {counts.trips > 0 ? '查看行程时间' : '去创建行程'}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => (counts.favorites ? router.push('/favorites') : router.push('/destinations'))}
                    className="card p-4 bg-white border border-gray-200 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-600">我的收藏</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{counts.favorites > 0 ? counts.favorites : '0'}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {counts.favorites > 0 ? '管理喜欢的目的地' : '去发现目的地'}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => (counts.orders ? router.push('/orders') : router.push('/cart'))}
                    className="card p-4 bg-white border border-gray-200 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-600">我的订单</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{counts.orders > 0 ? counts.orders : '0'}</div>
                        <div className="text-xs text-gray-500 mt-1">
                                                    {counts.orders > 0 ? '查看订单与状态' : '去提交订单'}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                    </div>
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4">
                  <div className="card p-4 bg-white border border-gray-200">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-semibold text-gray-900">我的收藏</div>
                          <div className="text-xs text-gray-500 mt-1">
                                                        {favoritesLoading ? '加载中...' : counts.favorites ? `${counts.favorites} 个` : '还没有收?'}
                          </div>
                        </div>
                      </div>
                      {counts.favorites > 0 ? (
                        <Link
                          href="/favorites"
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          查看全部 {counts.favorites}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      {favoritesLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-lg bg-gray-200 animate-pulse" />
                          ))}
                        </div>
                      ) : favoritesPreview.length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {favoritesPreview.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => router.push(`/destinations/${f.id}`)}
                              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                            >
                              <img
                                src={coverSrc(f)}
                                alt={f.name}
                                loading="lazy"
                                className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                              <div className="absolute bottom-2 left-2 right-2 text-white">
                                <div className="text-xs font-semibold line-clamp-1">{f.name}</div>
                                <div className="text-[11px] opacity-90 line-clamp-1">
                                  {f.city} · {f.province}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="card p-4 bg-gray-50 border-gray-200 text-gray-700">
                          还没有收藏。去 <Link className="underline text-blue-600" href="/destinations">发现目的</Link> 试试吧
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card p-4 bg-white border border-gray-200">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-semibold text-gray-900">最近足</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {footprintsLoading
                              ? '加载中...'
                              : footprintTotal > 0 || footprints.length
                                ? `?${footprintTotal || footprints.length} 条，下方展示最?${footprints.length} 条`
                                : '还没有足迹（?AI 助手生成行程吧）'}
                          </div>
                        </div>
                      </div>
                      <Link href="/itineraries" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                        去行?<ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="mt-4">
                      {footprintsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex gap-3 items-center">
                              <div className="w-16 h-12 rounded-md bg-gray-200 animate-pulse" />
                              <div className="flex-1">
                                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                                <div className="mt-2 h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : footprints.length ? (
                        <div className="space-y-3">
                          {footprints.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => router.push(`/destinations/${p.destination.id}`)}
                              className="w-full flex items-center gap-3 rounded-lg border border-gray-200 p-2 hover:shadow-sm transition"
                            >
                              <img
                                src={coverSrc(p.destination)}
                                alt={p.destination.name}
                                loading="lazy"
                                className="w-16 h-12 rounded-md object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-gray-900 line-clamp-1">{p.destination.name}</div>
                                <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                                  {p.destination.city} · {p.destination.province}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                  访问日期：{p.visitDate ? new Date(p.visitDate).toLocaleDateString('zh-CN') : ''}
                                  {p.visitCount > 1 ? ` · 去过 ${p.visitCount} 次` : ''}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="card p-4 bg-gray-50 border-gray-200 text-gray-700">
                          你还没有足迹。可以先?<Link className="underline text-blue-600" href="/assistant">AI 助手</Link> 里生成行程?
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                <div className="mt-6 card p-4 bg-gray-50 border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-gray-700 text-sm">
                      修改昵称、旅行偏好与预算？前往编辑页一次性保存
                    </div>
                    <Link href="/profile/edit" className="btn btn-primary text-sm shrink-0">
                      编辑资料
                    </Link>
                  </div>
                </div>

                <div className="mt-8 sm:hidden">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="btn btn-outline w-full justify-center text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="ml-2">退出登录</span>
                  </button>
                </div>
                      </>
                    ) : null}

                    {section === 'orders' ? (
                      <div className="mt-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">我的订单</h2>
                            <p className="text-sm text-gray-500 mt-1">点击查看详情与商品明</p>
                          </div>
                          <div className="text-sm text-gray-500">{counts.orders}</div>
                        </div>

                        {countsLoading ? (
                          <div className="mt-4 text-sm text-gray-500">加载中</div>
                        ) : ordersAll.length ? (
                          <div className="mt-4 space-y-3">
                            {ordersAll.map((o: any) => {
                              const orderId = o?.id ?? o?.order_no
                              const expanded = expandedOrderId === orderId
                              return (
                                <div key={String(orderId)} className="card p-4 bg-white border border-gray-200">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="text-sm text-gray-500">订单号：{o?.order_no || '无'}</div>
                                      <div className="text-gray-900 font-semibold mt-1">
                                        总金额：¥{Number(o?.total_amount || 0).toLocaleString()}
                                      </div>
                                      <div className="text-sm text-gray-600 mt-1">
                                        状态：{o?.status || '未知'}
                                        {o?.payment_method ? ` · 支付方式：{o.payment_method}` : ''}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 whitespace-nowrap">
                                      {o?.created_at ? new Date(o.created_at).toLocaleString() : ''}
                                    </div>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedOrderId(expanded ? null : orderId)}
                                      className="btn btn-outline text-sm"
                                    >
                                      {expanded ? '收起详情' : '查看详情'}
                                    </button>
                                  </div>

                                  {expanded ? (
                                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                                      {(o?.items || []).length ? (
                                        (o.items as any[]).map((it: any, idx: number) => (
                                          <div
                                            key={String(it?.id ?? it?.product_id ?? `${orderId}-${idx}`)}
                                            className="flex justify-between gap-3"
                                          >
                                            <span className="min-w-0 truncate">
                                              {it?.product_name || '商品'} · x{it?.quantity || 0}
                                            </span>
                                            <span className="shrink-0">¥{Number(it?.total_price || 0).toLocaleString()}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-gray-500">订单暂无商品明细</div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="mt-4 card p-4 bg-gray-50 border-gray-200 text-gray-700">暂无订单</div>
                        )}
                      </div>
                    ) : null}

                    {section === 'favorites' ? (
                      <div className="mt-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">我的收藏</h2>
                            <p className="text-sm text-gray-500 mt-1">喜欢的目的地产品卡片网格</p>
                          </div>
                          <div className="text-sm text-gray-500">{counts.favorites}</div>
                        </div>

                        {favoritesLoading ? (
                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="h-44 rounded-xl bg-gray-200 animate-pulse" />
                            ))}
                          </div>
                        ) : favoritesAll.length ? (
                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {favoritesAll.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => router.push(`/destinations/${f.id}`)}
                                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white text-left hover:shadow-sm transition"
                              >
                                <div className="relative aspect-[4/3]">
                                  <img
                                    src={coverSrc(f)}
                                    alt={f.name}
                                    loading="lazy"
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                  <div className="absolute bottom-2 left-2 right-2 text-white">
                                    <div className="text-xs font-semibold line-clamp-1">{f.name}</div>
                                    <div className="text-[11px] opacity-90 line-clamp-1">
                                      {f.city} · {f.province}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-bold text-gray-900">
                                      {(() => {
                                        const n = typeof f.ticket_price === 'number' ? f.ticket_price : Number(f.ticket_price)
                                        if (Number.isFinite(n) && n === 0) return '免费'
                                        if (Number.isFinite(n) && n > 0) return `¥${Math.round(n).toLocaleString()}起`
                                        return '价格待补充'
                                      })()}
                                    </div>
                                      {typeof f.rating === 'number' && f.rating > 0 ? (
                                        <div className="text-xs text-coral-600 font-semibold whitespace-nowrap">
                                          <span className="mr-1">★</span>
                                          {f.rating.toFixed(1)}
                                        </div>
                                      ) : null}
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500">收藏</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 card p-4 bg-gray-50 border-gray-200 text-gray-700">
                            还没有收藏。去 <Link className="underline text-blue-600" href="/destinations">发现目的</Link> 试试吧
                          </div>
                        )}
                      </div>
                    ) : null}

                    {section === 'footprints' ? (
                      <div className="mt-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">浏览足迹</h2>
                            <p className="text-sm text-gray-500 mt-1">按时间线展示你最近浏览的目的</p>
                          </div>
                          <div className="text-sm text-gray-500">{footprintTotal || footprints.length}</div>
                        </div>

                        {footprintsLoading ? (
                          <div className="mt-4 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="flex gap-3 items-center">
                                <div className="w-12 h-10 rounded-md bg-gray-200 animate-pulse" />
                                <div className="flex-1">
                                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                                  <div className="mt-2 h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : footprints.length ? (
                          <div className="mt-4 relative pl-4 space-y-4">
                            {footprints.map((p, idx) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => router.push(`/destinations/${p.destination.id}`)}
                                className="w-full flex items-start gap-3 text-left"
                              >
                                <div className="relative flex items-start justify-center w-4">
                                  <span className="absolute top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                                  {idx < footprints.length - 1 ? (
                                    <span className="absolute top-4 bottom-[-16px] w-px bg-gray-200" />
                                  ) : null}
                                </div>
                                <img
                                  src={coverSrc(p.destination)}
                                  alt={p.destination.name}
                                  loading="lazy"
                                  className="w-16 h-12 rounded-md object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-gray-900 line-clamp-1">{p.destination.name}</div>
                                  <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                                    {p.destination.city} · {p.destination.province}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-1">
                                    访问日期：{p.visitDate ? new Date(p.visitDate).toLocaleDateString('zh-CN') : ''}
                                    {p.visitCount > 1 ? ` · 去过 ${p.visitCount} 次` : ''}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 card p-4 bg-gray-50 border-gray-200 text-gray-700">
                            你还没有足迹。去 <Link className="underline text-blue-600" href="/assistant">AI 助手</Link> 里生成行程吧
                          </div>
                        )}
                      </div>
                    ) : null}

                    {section === 'trips' ? (
                      <div className="mt-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">我的行程</h2>
                            <p className="text-sm text-gray-500 mt-1">查看你创建的旅行计划</p>
                          </div>
                          <div className="text-sm text-gray-500">{counts.trips}</div>
                        </div>

                        {countsLoading ? (
                          <div className="mt-4 text-sm text-gray-500">加载中</div>
                        ) : tripsAll.length ? (
                          <div className="mt-4 space-y-3">
                            {tripsAll.map((t: any) => (
                              <Link
                                key={String(t.id)}
                                href={`/itineraries/${t.id}`}
                                className="block card p-4 bg-white border border-gray-200 hover:shadow-sm transition"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                                                        <div className="font-semibold text-gray-900 truncate">{t.title || '未命名行?'}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {t.start_date && t.end_date ? `${t.start_date} ~ ${t.end_date}` : t.status ? `状态：${t.status}` : ''}
                                    </div>
                                  </div>
                                  <div className="text-xs text-blue-600 font-semibold whitespace-nowrap">
                                    查看详情 ?
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 card p-4 bg-gray-50 border-gray-200 text-gray-700">
                            还没有行程记录，?<Link className="underline text-blue-600" href="/assistant">AI 助手</Link> 生成一个吧?
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>

          <nav className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-500" aria-label="页脚链接">
            <Link className="hover:text-blue-600 transition-colors" href="/about">
              关于我们
            </Link>
            <Link className="hover:text-blue-600 transition-colors" href="/help">
              使用条款
            </Link>
            <Link className="hover:text-blue-600 transition-colors" href="/contact">
              联系我们
            </Link>
          </nav>
        </div>
      </main>
      <Footer />
    </div>
  )
}

