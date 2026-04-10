'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Loader2, MapPin, Star, ArrowLeft, Clock, MessageSquare, RotateCcw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUserStore } from '@/store'
import type { DestinationComment } from '@/types'
import { formatPriceStart, formatRating, shouldShowRating } from '@/lib/display'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'
import HeroCard from '@/components/HeroCard'
import QuickGlance from '@/components/QuickGlance'
import Timeline from '@/components/Timeline'
import TipsAccordion from '@/components/TipsAccordion'
import NearbyMap from '@/components/NearbyMap'

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

  const [comments, setComments] = useState<DestinationComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    if (!params.id) return
    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        const dest = await getDestination(params.id)
        if (!cancelled) setItem(dest)

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

  const loadComments = async () => {
    if (!params.id) return
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      const res = await fetch(`/api/destinations/${params.id}/comments?limit=50`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      setComments((data?.comments ?? []) as DestinationComment[])
    } catch (e: any) {
      const msg = e?.message || '评论加载失败'
      setCommentsError(msg)
      toast.error(msg)
    } finally {
      setCommentsLoading(false)
    }
  }

  // 简单轮询实现"实时评论"效果
  useEffect(() => {
    if (!params.id) return
    let t: number | undefined
    loadComments().catch(() => {})
    t = window.setInterval(() => {
      loadComments().catch(() => {})
    }, 8000)
    return () => {
      if (t) window.clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const submitComment = async () => {
    if (!params.id) return
    if (!isAuthenticated) {
      toast.error('请先登录再发表评论')
      router.push('/login')
      return
    }
    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('未找到登录 token，请重新登录')
      router.push('/login')
      return
    }
    const content = commentText.trim()
    if (!content) {
      toast.error('评论内容不能为空')
      return
    }
    try {
      const res = await fetch(`/api/destinations/${params.id}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      setCommentText('')
      toast.success('评论发布成功')
      await loadComments()
    } catch (e: any) {
      toast.error(e?.message || '发布评论失败')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-6">
            <Link href="/destinations" className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </Link>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>加载中…</span>
            </div>
          )}
          {error && <div className="card p-4 border-red-200 bg-red-50 text-red-700">加载失败：{error}</div>}

          {!loading && !error && item && (
            <>
              {/* 场馆名片 Hero Card */}
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

              {/* 必看清单 Quick Glance */}
              <QuickGlance
                title="必看清单"
                items={[
                  {
                    id: 1,
                    title: '贾湖骨笛',
                    description: '世界最早的可吹奏乐器，距今约9000年',
                    icon: 'star',
                  },
                  {
                    id: 2,
                    title: '云纹铜禁',
                    description: '春秋时期青铜器，工艺精湛',
                    icon: 'gem',
                  },
                  {
                    id: 3,
                    title: '武则天金简',
                    description: '唯一一件属于武则天的文物',
                    icon: 'crown',
                  },
                  {
                    id: 4,
                    title: '四神云气图壁画',
                    description: '西汉早期墓葬壁画，气势恢宏',
                    icon: 'history',
                  },
                ]}
              />

              {/* 简介与门票卡片 */}
              <div className="card p-6 mt-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <h2 className="text-h2 text-gray-900 mb-4">简介</h2>
                    <p className="text-body text-gray-700 leading-relaxed">
                      {item.description || '暂无简介（可在后端更新 description 字段）。'}
                    </p>
                  </div>
                  <div className="md:w-72">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="text-small text-gray-600">门票</div>
                      <div className="mt-2 text-3xl font-bold text-primary">
                        {formatPriceStart(item.ticket_price)}
                      </div>
                      <div className="mt-6 flex gap-3">
                        <Link className="btn btn-primary flex-1" href="/assistant">
                          让 AI 规划行程
                        </Link>
                      </div>
                      <div className="mt-4 text-tiny text-gray-500">
                        数据来源：后端 `/api/destinations/{item.id}`
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 时间轴行程 Timeline */}
              <Timeline
                title="一日游时间轴"
                items={[
                  {
                    id: 1,
                    timeLabel: '上午',
                    title: '常设展厅参观',
                    description: '建议路线：1楼→2楼→3楼，重点看“中原古代文明之光”',
                    tags: ['2小时', '室内', '步行'],
                  },
                  {
                    id: 2,
                    timeLabel: '中午',
                    title: '院内餐厅午餐',
                    description: '推荐尝试河南特色烩面，人均约30元',
                    tags: ['1小时', '餐饮', '推荐'],
                  },
                  {
                    id: 3,
                    timeLabel: '下午',
                    title: '专题展览深度游',
                    description: '根据当天开放的特展，可选择“楚国青铜器”或“唐宋文物”',
                    tags: ['2.5小时', '室内', '讲解'],
                  },
                  {
                    id: 4,
                    timeLabel: '晚上',
                    title: '文创商店购物',
                    description: '购买纪念品，推荐骨笛复制品、云纹铜禁书签',
                    tags: ['1小时', '购物', '纪念品'],
                  },
                ]}
              />

              {/* 实用锦囊 Tips Accordion */}
              <TipsAccordion
                title="实用锦囊"
                items={[
                  {
                    id: 1,
                    title: '交通指南',
                    content: '地铁2号线关虎屯站C口出，步行约8分钟。院内停车场较小，建议公共交通。',
                  },
                  {
                    id: 2,
                    title: '餐饮建议',
                    content: '院内餐厅提供河南特色烩面、胡辣汤等，人均30-50元。周边有正弘城购物中心，餐饮选择丰富。',
                  },
                  {
                    id: 3,
                    title: '拍照提示',
                    content: '室内禁止使用闪光灯，部分展厅禁止拍照（有明确标识）。最佳拍摄点：大厅旋转楼梯、青铜器展柜前。',
                  },
                  {
                    id: 4,
                    title: '最佳游览时间',
                    content: '工作日早上9:00-11:00人较少，周末下午较拥挤。特展刚开放时人流最多，建议避开。',
                  },
                  {
                    id: 5,
                    title: '特殊服务',
                    content: '提供免费轮椅租赁（需押金）、语音导览器（20元/次）、定时免费讲解（10:00、14:00各一场）。',
                  },
                ]}
              />

              {/* 周边联动 Nearby Map */}
              <NearbyMap
                title="周边联动"
                center={item.lng && item.lat ? [item.lng, item.lat] : undefined}
                destinationName={item.name}
              />

              {/* 评论区域保持不变 */}
              <div className="card p-6 mt-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">实时评论</h3>
                </div>

                {commentsLoading ? (
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="card p-4 bg-white">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
                        <div className="mt-2 h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                        <div className="mt-4 h-14 bg-gray-200 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : commentsError ? (
                  <div className="mt-3 card p-4 border-red-200 bg-red-50 text-red-700">
                    <div className="font-semibold">评论加载失败</div>
                    <div className="text-sm opacity-90 mt-1">{commentsError}</div>
                    <div className="mt-4 flex gap-3 flex-wrap">
                      <button className="btn btn-outline" onClick={() => loadComments()} type="button">
                        <RotateCcw className="h-4 w-4" />
                        重试
                      </button>
                    </div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="mt-3 card p-4 text-gray-600 text-sm">
                    暂无评论。可以先发一条，分享你的旅行体验。
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="card p-4 bg-white">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {c.user?.nickname || '匿名用户'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-700 mt-3 whitespace-pre-wrap break-words">{c.content}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 card p-4 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900">发表评论</div>
                  {!isAuthenticated && (
                    <div className="text-sm text-gray-600 mt-2">
                      请先 <Link className="underline text-blue-600" href="/login">登录</Link>。
                    </div>
                  )}
                  <textarea
                    className="input bg-white w-full mt-3 min-h-[92px] resize-y"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="写下你的旅行体验/建议…"
                    disabled={!isAuthenticated}
                  />
                  <div className="mt-3 flex justify-end">
                    <button className="btn btn-primary" onClick={submitComment} disabled={!isAuthenticated}>
                      发布评论
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

