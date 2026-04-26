/**
 * =====================================================
 * 目的地详情页模块 - 景点详细信息展示
 * =====================================================
 * 
 * 【功能列表】
 * - 目的地基础信息展示（名称、评分、门票价格、开放时间）
 * - 场馆名片 HeroCard 组件展示
 * - 必看清单 QuickGlance 亮点推荐
 * - 一日游时间轴 Timeline 行程规划
 * - 实用锦囊 TipsAccordion 游玩攻略
 * - 周边联动 NearbyMap 地理信息展示
 * - 用户评论 CommentSection 评论区
 * - 分享功能 ShareButton
 * - 足迹记录（自动记录浏览历史）
 * 
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 * - HeroCard: 场馆名片组件
 * - QuickGlance: 亮点展示组件
 * - Timeline: 时间轴行程组件
 * - TipsAccordion: 实用锦囊组件
 * - NearbyMap: 周边地图组件（动态加载）
 * - CommentSection: 评论区域组件
 * - ShareButton: 分享按钮组件
 * - DestinationDetailSkeleton: 加载骨架屏
 * 
 * 【API 接口】
 * - GET /api/destinations/${id}: 获取目的地详情（1小时缓存）
 * - GET /api/destinations/${id}/recommendations: 获取推荐数据（亮点、时间轴、锦囊）
 * - POST /api/footprints: 记录用户足迹（需登录）
 * 
 * 【状态管理】
 * - useState: item(目的地数据), recommendations(推荐数据), loading/error状态
 * - 登录用户自动记录足迹到 /api/footprints
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Loader2, MapPin, Star, ArrowLeft, Clock, Info, Ticket } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUserStore } from '@/store'
import type { DestinationComment } from '@/types'
import { formatPriceStart, formatRating, shouldShowRating } from '@/lib/display'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'
import HeroCard from '@/components/HeroCard'
import QuickGlance from '@/components/QuickGlance'
import Timeline from '@/components/Timeline'
import TipsAccordion from '@/components/TipsAccordion'
import { ShareButton } from '@/components/ShareButton'
import CommentSection from '@/components/CommentSection'
import { DestinationDetailSkeleton } from '@/components/LoadingSkeletons'
import dynamic from 'next/dynamic'

// 动态导入 NearbyMap，避免 SSR 时访问 window
const NearbyMap = dynamic(() => import('@/components/NearbyMap').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center"><Loader2 className="animate-spin" /></div>
})

type Destination = {
  id: number
  name: string
  city: string
  province: string
  description?: string
  cover_image?: string
  rating?: number
  ticket_price?: number
  open_time?: string
  lng?: number
  lat?: number
  location?: string
}

type TimelineItem = {
  id: number
  timeLabel: string
  title: string
  description: string
  tags: string[]
}

type HighlightItem = {
  id: number
  title: string
  description: string
  icon: 'star' | 'gem' | 'crown' | 'award' | 'eye' | 'history'
}

type TipItem = {
  id: number
  title: string
  content: string
}

type Recommendations = {
  highlights: HighlightItem[]
  timeline: TimelineItem[]
  tips: TipItem[]
}

async function getDestination(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/destinations/${id}`, {
    cache: 'force-cache',
    next: { revalidate: 3600 } // 1小时重新验证
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.destination ?? null
}

export default function DestinationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { isAuthenticated } = useUserStore()
  const [item, setItem] = useState<Destination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 推荐数据
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null)
  const [recLoading, setRecLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    let cancelled = false
    
    async function run() {
      try {
        setLoading(true)
        setError(null)
        
        // 并行加载景点详情和推荐数据
        const [destRes, recRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/destinations/${params.id}`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/destinations/${params.id}/recommendations`)
        ])
        
        const destData = await destRes.json()
        const recData = await recRes.json()
        
        if (!cancelled) {
          if (destData.success) {
            setItem(destData.destination)
          } else {
            setError(destData.error || '加载失败')
          }
          if (recData.success) {
            setRecommendations(recData.recommendations)
          }
        }

        // 记录足迹（登录用户）
        try {
          const token = localStorage.getItem('auth_token')
          if (token) {
            fetch('/api/footprints', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ destination_id: Number(params.id), source: 'view' }),
            }).catch(() => {})
          }
        } catch {
          // ignore
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [params.id])

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-6">
            <Link href="/destinations" className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </Link>
          </div>

          {loading && <DestinationDetailSkeleton />}
          {error && <div className="card p-4 border-red-200 bg-red-50 text-red-700">加载失败：{error}</div>}

          {!loading && !error && item && (
            <>
              {/* 场馆名片 Hero Card */}
              <div className="relative">
                <HeroCard
                  name={item.name}
                  city={item.city}
                  province={item.province}
                  rating={item.rating}
                  openTime={item.open_time}
                  ticketPrice={item.ticket_price}
                  coverImage={item.cover_image}
                  tags={[]}
                />
                <div className="absolute top-4 right-4">
                  <ShareButton 
                    title={item.name} 
                    description={`${item.city} · ${item.province}`}
                    type="destination"
                  />
                </div>
              </div>

              {/* 必看清单 Quick Glance */}
              <QuickGlance
                title="必看清单"
                items={recommendations?.highlights || [
                  { id: 1, title: '核心景点', description: '最具代表性的景观', icon: 'star' },
                  { id: 2, title: '特色体验', description: '当地特色活动', icon: 'gem' },
                  { id: 3, title: '文化遗迹', description: '历史文化遗存', icon: 'crown' },
                  { id: 4, title: '周边美食', description: '特色小吃推荐', icon: 'history' },
                ]}
              />

              {/* 简介与门票卡片 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* 简介区域 */}
                <div className="lg:col-span-2 card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-h2 text-gray-900">景点简介</h2>
                  </div>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-body text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {item.description?.replace(/\[citation:\d+\]/g, '') || '暂无简介'}
                    </p>
                  </div>
                </div>
                
                {/* 门票预订卡片 */}
                <div className="card overflow-hidden">
                  <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="w-5 h-5" />
                      <span className="text-sm opacity-90">门票预订</span>
                    </div>
                    <div className="text-3xl font-bold">
                      {formatPriceStart(item.ticket_price)}
                    </div>
                    <p className="text-xs opacity-75 mt-1">起/人均</p>
                  </div>
                  <div className="p-5">
                    <Link 
                      className="block w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl text-center transition-all duration-200 shadow-md hover:shadow-lg"
                      href="/assistant"
                    >
                      让 AI 规划行程
                    </Link>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{item.city} · {item.province}</span>
                      </div>
                      {item.open_time && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.open_time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 时间轴行程 Timeline */}
              <Timeline
                title="一日游时间轴"
                items={recommendations?.timeline || [
                  { id: 1, timeLabel: '上午', title: '入园游览', description: '开始游览，感受当地风情', tags: ['2小时', '推荐'] },
                  { id: 2, timeLabel: '中午', title: '特色午餐', description: '品尝当地美食', tags: ['1小时', '餐饮'] },
                  { id: 3, timeLabel: '下午', title: '核心景点', description: '参观主要景点', tags: ['2小时', '精华'] },
                  { id: 4, timeLabel: '傍晚', title: '休闲时光', description: '周边漫步，享受悠闲时光', tags: ['1小时', '自由'] },
                ]}
              />

              {/* 实用锦囊 Tips Accordion */}
              <TipsAccordion
                title="实用锦囊"
                items={recommendations?.tips || [
                  { id: 1, title: '交通指南', content: '建议提前规划交通路线，选择合适的出行方式。' },
                  { id: 2, title: '餐饮建议', content: '周边餐饮选择丰富，可品尝当地特色美食。' },
                  { id: 3, title: '拍照提示', content: '建议穿着舒适，热门景点人流较多，建议错峰拍照。' },
                  { id: 4, title: '最佳游览时间', content: '建议避开节假日和周末高峰期，上午早些时候人较少。' },
                  { id: 5, title: '温馨提示', content: '建议提前查看开放时间和门票信息，携带必要的随身物品。' },
                ]}
              />

              {/* 周边联动 Nearby Map */}
              <NearbyMap
                title="周边联动"
                center={item.lng && item.lat ? [item.lng, item.lat] : undefined}
                destinationName={item.name}
              />

              {/* 评论区域 - 新版精美样式 */}
              <CommentSection
                destinationId={item.id}
                destinationName={item.name}
              />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

