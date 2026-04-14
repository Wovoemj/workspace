'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  MapPin, Clock, Trash2, Loader2, Eye, 
  Calendar, ChevronRight, Search, Sparkles
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'

interface Footprint {
  id: number
  destination_id: number
  destination?: {
    id: number
    name: string
    city: string
    province: string
    cover_image?: string
    rating?: number
  }
  visited_at: string
  view_duration?: number
  source?: string
}

interface FootprintGroup {
  date: string
  footprints: Footprint[]
}

export default function FootprintsPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useUserStore()
  
  const [footprints, setFootprints] = useState<Footprint[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [groupedFootprints, setGroupedFootprints] = useState<FootprintGroup[]>([])

  const loadFootprints = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    const token = localStorage.getItem('auth_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/footprints', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json().catch(() => ({}))
      
      if (data?.success && Array.isArray(data.footprints)) {
        setFootprints(data.footprints)
        
        // 按日期分组
        const grouped = groupFootprintsByDate(data.footprints)
        setGroupedFootprints(grouped)
      } else {
        setFootprints([])
        setGroupedFootprints([])
      }
    } catch (error) {
      console.error('加载足迹失败:', error)
      setFootprints([])
      setGroupedFootprints([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    loadFootprints()
  }, [loadFootprints])

  // 按日期分组
  const groupFootprintsByDate = (items: Footprint[]): FootprintGroup[] => {
    const groups: Record<string, Footprint[]> = {}
    
    items.forEach(item => {
      const date = item.visited_at 
        ? new Date(item.visited_at).toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : '未知日期'
      
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
    })
    
    return Object.entries(groups).map(([date, footprints]) => ({
      date,
      footprints
    }))
  }

  // 清除所有足迹
  const clearAllFootprints = async () => {
    if (!confirm('确定要清除所有浏览足迹吗？此操作不可恢复。')) return
    
    const token = localStorage.getItem('auth_token')
    if (!token) return

    setClearing(true)
    try {
      // 逐个删除
      for (const fp of footprints) {
        await fetch(`/api/footprints/${fp.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      toast.success('已清除所有足迹')
      setFootprints([])
      setGroupedFootprints([])
    } catch (error) {
      toast.error('清除足迹失败')
    } finally {
      setClearing(false)
    }
  }

  // 格式化浏览时长
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '短暂浏览'
    if (seconds < 60) return `${seconds}秒`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`
  }

  // 格式化浏览时间
  const formatVisitTime = (isoDate?: string) => {
    if (!isoDate) return ''
    const date = new Date(isoDate)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen page-bg">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="card p-8 text-center">
              <MapPin className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">请先登录</h2>
              <p className="text-gray-600 mt-2">登录后即可查看您的浏览足迹</p>
              <Link href="/login" className="btn btn-primary mt-4 inline-block">
                去登录
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-6">
            {/* 头部 */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">我的足迹</h1>
                <p className="text-gray-600 mt-2">
                  共浏览 {footprints.length} 个目的地
                </p>
              </div>
              {footprints.length > 0 && (
                <button
                  onClick={clearAllFootprints}
                  disabled={clearing}
                  className="btn btn-outline flex items-center gap-2"
                >
                  {clearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  清除足迹
                </button>
              )}
            </div>

            {/* 加载状态 */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">加载中...</span>
              </div>
            ) : footprints.length === 0 ? (
              /* 空状态 */
              <div className="mt-8 text-center py-12">
                <div className="mx-auto w-fit rounded-full bg-blue-50 p-4 text-blue-600 mb-4">
                  <Eye className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">还没有浏览记录</h3>
                <p className="text-gray-600 mt-2 mb-6">
                  去发现更多精彩目的地吧
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/destinations" className="btn btn-primary">
                    发现目的地
                  </Link>
                  <Link href="/products" className="btn btn-outline">
                    浏览产品
                  </Link>
                </div>
              </div>
            ) : (
              /* 足迹列表 - 按日期分组 */
              <div className="mt-6 space-y-8">
                {groupedFootprints.map((group) => (
                  <div key={group.date}>
                    {/* 日期标题 */}
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{group.date}</span>
                      <span className="text-xs text-gray-400">
                        ({group.footprints.length} 个)
                      </span>
                    </div>
                    
                    {/* 足迹卡片 */}
                    <div className="space-y-3">
                      {group.footprints.map((fp) => (
                        <Link
                          key={fp.id}
                          href={`/destinations/${fp.destination_id}`}
                          className="block card p-4 bg-white border border-gray-100 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4">
                            {/* 封面图 */}
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                              {fp.destination?.cover_image ? (
                                <img
                                  src={fp.destination.cover_image}
                                  alt={fp.destination.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="h-8 w-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                            
                            {/* 信息 */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {fp.destination?.name || '未知目的地'}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {fp.destination?.province || ''} {fp.destination?.city || ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatVisitTime(fp.visited_at)}
                                </span>
                                <span>{formatDuration(fp.view_duration)}</span>
                              </div>
                            </div>
                            
                            {/* 箭头 */}
                            <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}