'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Share2,
  Trash2,
  MapPin,
  Clock,
  Sparkles,
  Users,
  Plane,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ExternalLink,
  Download,
  ChevronRight,
  Star,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { TripCalendar } from '@/components/TripCalendar'

type TripItem = {
  id: number
  trip_id: number
  destination_id?: number | null
  day_number: number
  title?: string
  description?: string
  location?: string
  start_time?: string | null
  end_time?: string | null
  sort_order?: number
  destination?: {
    id: number
    name: string
    city: string
    province: string
    cover_image?: string | null
    rating?: number
    ticket_price?: number
  }
}

type Trip = {
  id: number
  user_id: number
  title: string
  description?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
  travel_style?: string
  budget_max?: number
  group_size?: number
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null
  return dateStr.split('T')[0]
}

function formatTime(v?: string | null) {
  if (!v) return null
  const s = String(v)
  return s.length >= 5 ? s.slice(0, 5) : s
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: '待完善', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: AlertCircle },
  planning: { label: '规划中', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Clock },
  in_progress: { label: '进行中', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: PlayCircle },
  completed: { label: '已完成', color: 'text-violet-600', bgColor: 'bg-violet-50', icon: CheckCircle2 },
}

const styleLabels: Record<string, { label: string; emoji: string }> = {
  relaxation: { label: '休闲放松', emoji: '🏖️' },
  cultural: { label: '人文探索', emoji: '🏛️' },
  adventure: { label: '冒险体验', emoji: '🧗' },
  business: { label: '商务出行', emoji: '💼' },
}

export default function TripDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = params?.id
  const tripId = typeof idParam === 'string' ? parseInt(idParam, 10) : NaN

  const { isAuthenticated, user } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<TripItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedDay, setSelectedDay] = useState(1)

  const groupedByDay = useMemo(() => {
    const map = new Map<number, TripItem[]>()
    for (const it of items) {
      const day = Number(it.day_number || 1)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(it)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, dayItems]) => ({
        day,
        items: dayItems.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))
  }, [items])

  const load = useCallback(async () => {
    if (!Number.isFinite(tripId)) {
      setError('无效的行程 ID')
      setLoading(false)
      return
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      setError('请先登录')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/items`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        localStorage.removeItem('auth_token')
        toast.error('登录已过期')
        router.replace(`/login?returnUrl=${encodeURIComponent(`/itineraries/${tripId}`)}`)
        return
      }
      if (res.status === 403) {
        setError('无权查看该行程')
        return
      }
      if (res.status === 404) {
        setError('行程不存在或已删除')
        return
      }
      if (!data?.success) {
        setError(data?.error || '加载失败')
        return
      }
      setTrip(data.trip || null)
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [tripId, router])

  useEffect(() => {
    if (!Number.isFinite(tripId)) return
    if (!isAuthenticated || !user) {
      router.replace(`/login?returnUrl=${encodeURIComponent(`/itineraries/${tripId}`)}`)
      return
    }
    load()
  }, [isAuthenticated, user, load, router, tripId])

  async function onShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const title = trip?.title || '我的行程'
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: `${title} — 智能旅游助手`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success('链接已复制，可粘贴分享')
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      toast.error('分享失败，请手动复制地址栏链接')
    }
  }

  async function onDelete() {
    if (!trip || deleting) return
    if (!confirm(`确定删除「${trip.title}」？此操作不可恢复。`)) return
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      toast.success('已删除')
      router.replace('/itineraries')
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  if (!Number.isFinite(tripId)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="pt-20 px-4 text-center text-slate-600">无效的行程地址</main>
        <Footer />
      </div>
    )
  }

  const status = trip?.status || 'pending'
  const statusInfo = statusConfig[status] || statusConfig.pending
  const StatusIcon = statusInfo.icon
  const styleInfo = trip?.travel_style ? styleLabels[trip.travel_style] : null
  const coverGradients = [
    'from-sky-600 to-blue-700',
    'from-emerald-600 to-teal-700',
    'from-coral-500 to-coral-600',
    'from-violet-600 to-indigo-700',
  ]
  const gradient = coverGradients[tripId % coverGradients.length] || coverGradients[0]

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 顶部导航 */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <Link href="/itineraries" className="text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />返回行程列表
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/itineraries/routes" className="text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1">
              行程路线
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <span className="text-lg">加载行程中…</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5" />
                <p className="font-semibold text-lg">{error}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/itineraries" className="px-4 py-2 border border-red-300 rounded-xl hover:bg-red-100 transition">
                  返回行程列表
                </Link>
                {error === '请先登录' && (
                  <Link href={`/login?returnUrl=${encodeURIComponent(`/itineraries/${tripId}`)}`} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
                    去登录
                  </Link>
                )}
              </div>
            </div>
          ) : trip ? (
            <>
              {/* 主封面卡片 */}
              <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-6 text-white mb-6 shadow-xl`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
                        <StatusIcon className="h-4 w-4" />
                        {statusInfo.label}
                      </span>
                      {styleInfo && <span className="text-lg">{styleInfo.emoji}</span>}
                    </div>
                    <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
                    {trip.description && <p className="text-white/90 text-lg mb-4">{trip.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm">
                      {trip.start_date && trip.end_date && (
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                          <Calendar className="h-4 w-4" />{formatDate(trip.start_date)} ~ {formatDate(trip.end_date)}
                        </div>
                      )}
                      {trip.group_size && (
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                          <Users className="h-4 w-4" />{trip.group_size}人
                        </div>
                      )}
                      {trip.budget_max && (
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                          <DollarSign className="h-4 w-4" />预算 ¥{trip.budget_max}
                        </div>
                      )}
                      {styleInfo && (
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                          <Plane className="h-4 w-4" />{styleInfo.label}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button onClick={onShare} className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition">
                      <Share2 className="h-4 w-4" />分享
                    </button>
                    <button onClick={onDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-xl transition disabled:opacity-50">
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}删除
                    </button>
                  </div>
                </div>
              </div>

              {/* 统计卡片 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">{items.length}</div>
                  <div className="text-sm text-slate-500 mt-1">行程节点</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-emerald-600">{groupedByDay.length}</div>
                  <div className="text-sm text-slate-500 mt-1">旅行天数</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-violet-600">{new Set(items.map(i => i.destination_id).filter(Boolean)).size}</div>
                  <div className="text-sm text-slate-500 mt-1">涉及景点</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-coral-500">{trip.budget_max ? `¥${trip.budget_max}` : '-'}</div>
                  <div className="text-sm text-slate-500 mt-1">预算上限</div>
                </div>
              </div>

              {/* AI 优化建议 */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">AI 行程优化</h3>
                    <p className="text-sm text-slate-600 mt-1">根据您的行程安排，AI 可以帮您优化路线、推荐最佳用餐地点、提醒注意事项等。</p>
                    <Link href={`/assistant?trip_id=${tripId}`} className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      让 AI 优化行程<ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* 每日行程 */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />每日行程安排
                  </h2>
                  {items.length > 0 && (
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                          viewMode === 'list' 
                            ? 'bg-sky-100 text-sky-700' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        列表
                      </button>
                      <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                          viewMode === 'calendar' 
                            ? 'bg-sky-100 text-sky-700' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        日历
                      </button>
                    </div>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center">
                    <Sparkles className="h-14 w-14 text-coral-500 mx-auto mb-3 opacity-90" />
                    <p className="text-slate-700 text-lg font-medium">该行程暂无安排</p>
                    <p className="text-slate-500 mt-1 mb-6">让 AI 帮您规划完美的行程吧！</p>
                    <Link href="/assistant" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl font-medium hover:shadow-lg transition">
                      <Sparkles className="h-5 w-5" />AI 生成行程
                    </Link>
                  </div>
                ) : viewMode === 'calendar' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <TripCalendar 
                        trip={trip} 
                        items={items} 
                        selectedDay={selectedDay}
                        onDayClick={setSelectedDay}
                      />
                    </div>
                    <div className="lg:col-span-2 space-y-4">
                      {groupedByDay
                        .filter(({ day }) => selectedDay === 0 || day === selectedDay)
                        .map(({ day, items: dayItems }) => {
                          const totalDuration = dayItems.reduce((acc, it) => {
                            if (it.start_time && it.end_time) {
                              const start = it.start_time.split(':').map(Number)
                              const end = it.end_time.split(':').map(Number)
                              return acc + (end[0] * 60 + end[1]) - (start[0] * 60 + start[1])
                            }
                            return acc
                          }, 0)
                          const hours = Math.floor(totalDuration / 60)
                          const mins = totalDuration % 60

                          return (
                            <div key={day} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                              <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-white">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                      <span className="text-lg font-bold">D{day}</span>
                                    </div>
                                    <div>
                                      <div className="font-bold text-lg">第 {day} 天</div>
                                      {dayItems[0]?.location && (
                                        <div className="text-white/70 text-sm flex items-center gap-1">
                                          <MapPin className="h-3.5 w-3.5" />{dayItems[0].location.split(',')[0]}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {totalDuration > 0 && (
                                    <div className="text-sm text-white/80 bg-white/10 px-3 py-1.5 rounded-lg">
                                      总计 {hours > 0 ? `${hours}小时` : ''}{mins > 0 ? `${mins}分钟` : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="p-5">
                                <div className="relative">
                                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
                                  <div className="space-y-4">
                                    {dayItems.map((it, index) => (
                                      <div key={it.id} className="relative flex gap-4">
                                        <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                          it.destination?.cover_image ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                          <span className="text-sm font-bold">{index + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 pt-1">
                                          {it.start_time && (
                                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md mb-1">
                                              {it.start_time}{it.end_time ? ` - ${it.end_time}` : ''}
                                            </span>
                                          )}
                                          <h4 className="font-semibold text-slate-900">{it.title || '未命名行程'}</h4>
                                          {it.description && (
                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{it.description}</p>
                                          )}
                                          {it.location && (
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />{it.location}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedByDay.map(({ day, items: dayItems }) => {
                      const totalDuration = dayItems.reduce((acc, it) => {
                        if (it.start_time && it.end_time) {
                          const start = it.start_time.split(':').map(Number)
                          const end = it.end_time.split(':').map(Number)
                          return acc + (end[0] * 60 + end[1]) - (start[0] * 60 + start[1])
                        }
                        return acc
                      }, 0)
                      const hours = Math.floor(totalDuration / 60)
                      const mins = totalDuration % 60

                      return (
                        <div key={day} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-white">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                  <span className="text-lg font-bold">D{day}</span>
                                </div>
                                <div>
                                  <div className="font-bold text-lg">第 {day} 天</div>
                                  {dayItems[0]?.location && (
                                    <div className="text-white/70 text-sm flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />{dayItems[0].location.split(',')[0]}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {totalDuration > 0 && (
                                <div className="text-sm text-white/80 bg-white/10 px-3 py-1.5 rounded-lg">
                                  总计 {hours > 0 ? `${hours}小时` : ''}{mins > 0 ? `${mins}分钟` : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="p-5">
                            <div className="relative">
                              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
                              <div className="space-y-4">
                                {dayItems.map((it, index) => (
                                  <div key={it.id} className="relative flex gap-4">
                                    <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                      it.destination?.cover_image ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {it.destination?.cover_image ? <Star className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-blue-200 transition-colors">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-slate-900">{it.title || '行程节点'}</h4>
                                            {index === 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">起点</span>}
                                            {index === dayItems.length - 1 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-xs rounded-full">终点</span>}
                                          </div>
                                          {(it.start_time || it.end_time) && (
                                            <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
                                              <Clock className="h-3.5 w-3.5" />
                                              {it.start_time && formatTime(it.start_time)}
                                              {it.start_time && it.end_time && ' - '}
                                              {it.end_time && formatTime(it.end_time)}
                                            </div>
                                          )}
                                          {it.location && (
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-2">
                                              <MapPin className="h-3.5 w-3.5" />{it.location}
                                            </div>
                                          )}
                                          {it.description && <p className="text-sm text-slate-700 whitespace-pre-wrap">{it.description}</p>}
                                          {it.destination && (
                                            <Link href={`/destinations/${it.destination.id}`} className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition">
                                              <Star className="h-3.5 w-3.5" />查看 {it.destination.name}
                                              {it.destination.rating && <span className="text-amber-500">★{it.destination.rating}</span>}
                                              {it.destination.ticket_price !== undefined && it.destination.ticket_price > 0 && <span className="text-slate-500">¥{it.destination.ticket_price}</span>}
                                            </Link>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-4">更多操作</h3>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/assistant?trip_id=${tripId}`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl hover:shadow-lg transition">
                    <Sparkles className="h-4 w-4" />AI 优化行程
                  </Link>
                  <Link href="/destinations" className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition">
                    <Plus className="h-4 w-4" />添加景点
                  </Link>
                  <button onClick={onShare} className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition">
                    <Share2 className="h-4 w-4" />分享行程
                  </button>
                  <button onClick={onDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition disabled:opacity-50">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}删除行程
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  )
}
