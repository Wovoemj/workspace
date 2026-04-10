'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Plane,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Archive,
  Loader2,
  Filter,
  ChevronRight,
  Sparkles,
  Plus,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'

type Trip = {
  id: number
  user_id: number
  title: string
  description?: string
  status?: string
  travel_style?: string
  budget_max?: number
  group_size?: number
  created_at?: string | null
  start_date?: string | null
  end_date?: string | null
}

type StatusTab = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const statusTabs: StatusTab[] = [
  { key: 'all', label: '全部', icon: Filter, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    { key: 'pending', label: '待完?', icon: AlertCircle, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { key: 'planning', label: '规划?', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { key: 'in_progress', label: '进行?', icon: PlayCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { key: 'completed', label: '已完?', icon: CheckCircle2, color: 'text-violet-600', bgColor: 'bg-violet-50' },
]

const coverGradients = [
  'from-sky-600 to-blue-700',
  'from-emerald-600 to-teal-700',
  'from-coral-500 to-coral-600',
  'from-violet-600 to-indigo-700',
  'from-rose-500 to-pink-600',
  'from-orange-500 to-red-600',
  'from-cyan-600 to-blue-700',
  'from-lime-600 to-green-700',
]

const styleLabels: Record<string, string> = {
  relaxation: '休闲放松',
  cultural: '人文探索',
  adventure: '冒险体验',
  business: '商务出行',
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null
  return dateStr.split('T')[0]
}

export default function ItineraryRoutesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useUserStore()

  const [loadingTrips, setLoadingTrips] = useState(true)
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>(() => searchParams.get('status') || 'all')

  const loadTrips = useCallback(async () => {
    if (!isAuthenticated || !user) return
    const token = localStorage.getItem('auth_token')
    if (!token) return

    setLoadingTrips(true)
    try {
      const res = await fetch('/api/me/trips', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        localStorage.removeItem('auth_token')
                toast.error('登录已过期，请重新登?')
        router.push('/login')
        return
      }
      if (!data?.success) {
        throw new Error(data?.error || '加载行程失败')
      }
      setTrips(data?.trips || [])
    } catch (e: any) {
      toast.error(e?.message || '加载行程失败')
    } finally {
      setLoadingTrips(false)
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }
    loadTrips()
  }, [isAuthenticated, user, router, loadTrips])

  const filteredTrips = selectedStatus === 'all'
    ? trips
    : trips.filter(t => t.status === selectedStatus)

  const statusCounts = statusTabs.reduce((acc, tab) => {
    if (tab.key === 'all') {
      acc[tab.key] = trips.length
    } else {
      acc[tab.key] = trips.filter(t => t.status === tab.key).length
    }
    return acc
  }, {} as Record<string, number>)

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status)
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'all') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    router.push(`/itineraries/routes?${params.toString()}`, { scroll: false })
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
        <Navbar />
        <main className="pt-16 pb-28 lg:pb-10">
          <div className="max-w-4xl mx-auto px-4 py-10 text-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <Plane className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">我的行程路线</h1>
              <p className="text-slate-600 mb-6">登录后可查看和管理您的所有行</p>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
                立即登录
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-sky-500 rounded-xl flex items-center justify-center">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">我的行程路线</h1>
              <p className="text-slate-500 mt-1">管理和查看您的所有旅行计</p>
            </div>
          </div>


          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">按状态筛</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = selectedStatus === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleStatusChange(tab.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? `${tab.bgColor} ${tab.color} ring-2 ring-current ring-offset-1`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-white/50' : 'bg-slate-200'
                    }`}>
                      {statusCounts[tab.key] || 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>


          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statusTabs.slice(1).map((tab) => {
              const Icon = tab.icon
              const count = statusCounts[tab.key] || 0
              return (
                <button
                  key={tab.key}
                  onClick={() => handleStatusChange(tab.key)}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md text-left ${
                    selectedStatus === tab.key
                      ? `${tab.bgColor} border-transparent`
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${tab.color} mb-2`} />
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="text-sm text-slate-500">{tab.label}</div>
                </button>
              )
            })}
          </div>


          {loadingTrips ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600">加载?..</span>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Archive className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                {selectedStatus === 'all' ? '暂无行程记录' : `暂无${statusTabs.find(t => t.key === selectedStatus)?.label}的行程`}
              </h3>
              <p className="text-slate-500 mb-6">
                {selectedStatus === 'all'
                  ? '创建您的第一个旅行计划，开始探索世界吧！'
                  : '尝试选择其他状态查看，或创建新行程'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {selectedStatus !== 'all' && (
                  <button
                    onClick={() => handleStatusChange('all')}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition"
                  >
                    查看全部
                  </button>
                )}
                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                >
                  <Sparkles className="h-4 w-4" />
                  AI 生成行程
                </Link>
                <Link
                  href="/itineraries"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition"
                >
                  <Plus className="h-4 w-4" />
                  创建新计?
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrips.map((trip) => {
                const gradient = coverGradients[Math.abs(trip.id) % coverGradients.length]
                const startDate = formatDate(trip.start_date)
                const endDate = formatDate(trip.end_date)
                const statusTab = statusTabs.find(t => t.key === (trip.status || 'pending')) || statusTabs[1]

                return (
                  <Link
                    key={trip.id}
                    href={`/itineraries/${trip.id}`}
                    className="block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-300 transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row">

                      <div className={`sm:w-48 h-32 sm:h-auto bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
                        <MapPin className="h-12 w-12 text-white/80" />
                        <div className="absolute inset-0 bg-black/10" />
                        <span className="absolute bottom-3 left-3 text-white font-bold text-lg drop-shadow-md">
                          第{trip.id}号行?
                        </span>
                      </div>


                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {trip.title}
                            </h3>
                            {trip.description && (
                              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{trip.description}</p>
                            )}
                          </div>
                          <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusTab.bgColor} ${statusTab.color}`}>
                            <statusTab.icon className="h-3.5 w-3.5" />
                            {statusTab.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
                          {startDate && endDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {startDate} ~ {endDate}
                            </div>
                          )}
                          {trip.group_size && (
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {trip.group_size}?
                            </div>
                          )}
                          {trip.travel_style && (
                            <div className="flex items-center gap-1.5">
                              <Plane className="h-4 w-4" />
                              {styleLabels[trip.travel_style] || trip.travel_style}
                            </div>
                          )}
                          {trip.budget_max && (
                            <div className="text-amber-600 font-medium">
                              预算 ¥{trip.budget_max}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                          <span className="text-xs text-slate-400">
                            创建?{formatDate(trip.created_at) || '未知'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
                            查看详情
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
