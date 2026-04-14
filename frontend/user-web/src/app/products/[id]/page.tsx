'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Star,
  User,
} from 'lucide-react'
import type { Product } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import { formatRating, shouldShowRating } from '@/lib/display'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'

type ProductReview = {
  id?: string | number
  user?: { nickname?: string; avatar_url?: string | null }
  user_id?: string | number
  rating: number
  content: string
  images?: string[]
  created_at?: string
}

function formatPrice(price: number) {
  return `¥${Number(price || 0).toLocaleString()}`
}

function formatDateZh(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function safeMediaSrc(img?: string | null) {
  return resolveCoverSrc(img || null)
}

function StarsPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="评分">
      {stars.map((s) => {
        const active = s <= value
        return (
          <button
            key={s}
            type="button"
            className="p-1 rounded-md transition-colors"
            onClick={() => onChange(s)}
            aria-checked={active}
            role="radio"
          >
            <Star className={`h-5 w-5 ${active ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
          </button>
        )
      })}
    </div>
  )
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const productId = params?.id
  const [product, setProduct] = useState<Product | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [productError, setProductError] = useState<string | null>(null)

  const [galleryIndex, setGalleryIndex] = useState(0)

  const [tab, setTab] = useState<'overview' | 'itinerary' | 'reviews' | 'qa'>('overview')

  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  const [reviewFormRating, setReviewFormRating] = useState(5)
  const [reviewFormContent, setReviewFormContent] = useState('')
  const [reviewFormImages, setReviewFormImages] = useState<string[]>([])
  const [submittingReview, setSubmittingReview] = useState(false)


  const [questions, setQuestions] = useState<any[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questionFormContent, setQuestionFormContent] = useState('')
  const [submittingQuestion, setSubmittingQuestion] = useState(false)

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [timeSlots, setTimeSlots] = useState<{time: string; available: number}[]>([])
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)

  const [ordersSubmitting, setOrdersSubmitting] = useState(false)
  const [related, setRelated] = useState<Product[]>([])
  const [loadingRelated, setLoadingRelated] = useState(true)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';

  useEffect(() => {
    // 默认日期：今天
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    setSelectedDate(iso)
  }, [])

  // 获取时间段库存（当选择日期且产品需要分时预约时）
  useEffect(() => {
    if (!product || !selectedDate) return
    // 检查产品是否需要分时预约（通过metadata或特定字段）
    const needTimeSlot = product.metadata?.opening_hours?.includes('时段') ||
                         product.metadata?.time_slots !== undefined

    if (!needTimeSlot) return

    let cancelled = false
    async function fetchTimeSlots() {
      if (!product) return
      setLoadingTimeSlots(true)
      try {
        // 使用新的库存API
        const res = await fetch(`${API_BASE_URL}/api/tickets/products/${product.id}/inventory?date=${selectedDate}`)
        const data = await res.json().catch(() => ({}))
        if (!cancelled && data?.success) {
          setTimeSlots(data.inventory?.time_slots || [])
        }
      } catch (e) {
        console.error('获取时间段失败:', e)
      } finally {
        if (!cancelled) setLoadingTimeSlots(false)
      }
    }
    fetchTimeSlots()
    return () => { cancelled = true }
  }, [product, selectedDate, API_BASE_URL])

  const galleryImages = useMemo(() => {
    if (!product) return []
    const imgs = product.images?.length ? product.images : []
    if (imgs.length) return imgs
    return [undefined as unknown as string]
  }, [product])

  const unitPrice = product?.price ?? 0
  const totalPrice = unitPrice * quantity

  // 拉取产品详情
  useEffect(() => {
    if (!productId) return
    let cancelled = false
    async function run() {
      setLoadingProduct(true)
      setProductError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const p = (data?.product ?? data?.products ?? data) as Product
        if (!cancelled) setProduct(p || null)
      } catch (e: any) {
        if (!cancelled) setProductError(e?.message || '加载失败')
      } finally {
        if (!cancelled) setLoadingProduct(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [API_BASE_URL, productId])

  // 拉取评论
  useEffect(() => {
    if (!productId) return
    let cancelled = false
    async function run() {
      setLoadingReviews(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/products/${productId}/reviews`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const list = (data?.reviews ?? data?.items ?? data?.data ?? []) as ProductReview[]
        if (!cancelled) setReviews(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setReviews([])
      } finally {
        if (!cancelled) setLoadingReviews(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [API_BASE_URL, productId])

  // 拉取问答
  const loadQuestions = async () => {
    if (!productId) return
    setLoadingQuestions(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/qa`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      const list = (data?.qa ?? data?.items ?? data?.data ?? []) as any[]
      setQuestions(Array.isArray(list) ? list : [])
    } catch {
      setQuestions([])
    } finally {
      setLoadingQuestions(false)
    }
  }

  // 拉取相关推荐
  useEffect(() => {
    if (!product || !product.location?.city) return
    let cancelled = false
    async function run() {
      setLoadingRelated(true)
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/products?status=active&sort=rating&limit=6&destination=${encodeURIComponent(
            product?.location?.city || '',
          )}`,
          { cache: 'no-store' },
        )
        const data = await res.json().catch(() => ({}))
        const list = (data?.products ?? data?.items ?? data?.data ?? []) as Product[]
        const filtered = Array.isArray(list)
          ? list.filter((p) => String(p.id) !== String(product?.id || '')).slice(0, 6)
          : []
        if (!cancelled) setRelated(filtered)
      } catch {
        if (!cancelled) setRelated([])
      } finally {
        if (!cancelled) setLoadingRelated(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [API_BASE_URL, product])

  const loadFavorites = async (pid: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return
    const idNum = Number.parseInt(pid, 10)
    if (Number.isNaN(idNum)) return
    try {
      setFavoritesLoading(true)
      const res = await fetch(`${API_BASE_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      const favs = data?.destinations ?? []
      setIsFavorited(favs.some((d: any) => Number(d?.id) === idNum))
    } catch {
      // ignore
    } finally {
      setFavoritesLoading(false)
    }
  }

  useEffect(() => {
    if (!productId) return
    loadFavorites(productId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const onToggleFavorite = async () => {
    if (!productId) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      toast.error('请先登录')
      router.push('/login')
      return
    }
    const idNum = Number.parseInt(productId, 10)
    if (Number.isNaN(idNum)) {
      toast.error('当前收藏接口仅支持数字ID（目的地收藏）。')
      return
    }
    try {
      setFavoritesLoading(true)
      const res = await fetch(`${API_BASE_URL}/api/favorites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_id: idNum }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      setIsFavorited(Boolean(data?.favorite))
      toast.success(data?.favorite ? '已加入收藏' : '已取消收藏')
    } catch (e: any) {
      toast.error(e?.message || '收藏失败')
    } finally {
      setFavoritesLoading(false)
    }
  }

  const onSubmitQuestion = async () => {
    if (!product || !questionFormContent.trim()) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      toast.error('请先登录')
      router.push('/login')
      return
    }

    const content = questionFormContent.trim()
    if (!content) {
      toast.error('问题内容不能为空')
      return
    }

    try {
      setSubmittingQuestion(true)
      const res = await fetch(`${API_BASE_URL}/api/products/${product.id}/qa`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: content }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      // 清空表单
      setQuestionFormContent('')
      toast.success('问题提交成功')

      // 刷新问答列表
      await loadQuestions()
    } catch (e: any) {
      toast.error(e?.message || '提交问题失败')
    } finally {
      setSubmittingQuestion(false)
    }
  }

  const onCheckout = async () => {
    if (!product) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      toast.error('请先登录')
      router.push('/login')
      return
    }
    if (!selectedDate) {
      toast.error('请选择日期')
      return
    }
    // 如果需要分时预约但未选择时段
    if (timeSlots.length > 0 && !selectedTimeSlot) {
      toast.error('请选择预约时段')
      return
    }
    if (product.inventory === 0) {
      toast.error('该产品已售罄')
      return
    }

    try {
      setOrdersSubmitting(true)

      const bookingDetails: Record<string, unknown> = {
        date: selectedDate,
      }
      if (selectedTimeSlot) {
        bookingDetails.time_slot = selectedTimeSlot
      }

      const orderPayload = {
        order_no: `TA-${Date.now()}`,
        total_amount: totalPrice,
        payment_method: 'alipay',
        status: 'pending',
        items: [
          {
            product_id: String(product.id),
            product_name: product.name,
            product_type: product.type,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            booking_details: bookingDetails,
          },
        ],
      }

      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      toast.success('订单提交成功')
      router.push('/orders')
    } catch (e: any) {
      toast.error(e?.message || '提交订单失败')
    } finally {
      setOrdersSubmitting(false)
    }
  }

  const onSubmitReview = async () => {
    if (!product) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      toast.error('请先登录后再评价')
      router.push('/login')
      return
    }
    const content = reviewFormContent.trim()
    if (!content) {
      toast.error('请填写评价内容')
      return
    }
    if (reviewFormRating < 1 || reviewFormRating > 5) {
      toast.error('请选择星级')
      return
    }

    try {
      setSubmittingReview(true)
      const payload = {
        rating: reviewFormRating,
        content,
        images: reviewFormImages,
      }
      const res = await fetch(`${API_BASE_URL}/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      toast.success('评价发布成功')
      setReviewFormContent('')
      setReviewFormImages([])
      setReviewFormRating(5)

      // 刷新评论
      const refresh = await fetch(`${API_BASE_URL}/api/products/${product.id}/reviews`, { cache: 'no-store' })
      const refreshData = await refresh.json().catch(() => ({}))
      const list = (refreshData?.reviews ?? refreshData?.items ?? refreshData?.data ?? []) as ProductReview[]
      setReviews(Array.isArray(list) ? list : [])
    } catch (e: any) {
      toast.error(e?.message || '发布评价失败')
    } finally {
      setSubmittingReview(false)
    }
  }

  const onPickReviewImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const max = 3
    const slice = Array.from(files).slice(0, max)
    const list: string[] = []
    for (const f of slice) {
      const asDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(f)
      })
      list.push(asDataUrl)
    }
    setReviewFormImages(list)
  }

  const typeBadge = useMemo(() => {
    const m: Record<Product['type'], { label: string; icon: JSX.Element }> = {
      flight: { label: '机票', icon: <span className="text-base">✈️</span> },
      hotel: { label: '酒店', icon: <span className="text-base">🏨</span> },
      ticket: { label: '门票', icon: <span className="text-base">🎫</span> },
      experience: { label: '当地体验', icon: <span className="text-base">🎭</span> },
    }
    return m[product?.type as Product['type']] ?? { label: '产品', icon: <span className="text-base">📍</span> }
  }, [product?.type])

  const maxQty = product?.inventory && product.inventory > 0 ? product.inventory : 1

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loadingProduct ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 rounded-3xl bg-card/70 border border-border/60 animate-pulse h-[420px]" />
              <div className="lg:col-span-1 rounded-3xl bg-card/70 border border-border/60 animate-pulse h-[420px]" />
            </div>
          ) : productError ? (
            <div className="card p-6 border-red-200 bg-red-50 text-red-700 rounded-2xl">
              <div className="font-semibold text-lg">加载失败</div>
              <div className="text-sm opacity-90 mt-2">{productError}</div>
              <div className="mt-4 flex gap-3 flex-wrap">
                <button className="btn btn-outline" onClick={() => window.location.reload()} type="button">
                  重试
                </button>
              </div>
            </div>
          ) : product ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left / Main */}
              <div className="lg:col-span-2 min-w-0">
                {/* Gallery */}
                <section className="rounded-3xl bg-card/70 border border-border/60 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          {typeBadge.icon}
                        </div>
                        <div className="min-w-0">
                          <h1 className="text-xl sm:text-2xl font-extrabold truncate">{product.name}</h1>
                          <div className="mt-1 flex items-center gap-3 text-muted-foreground text-sm">
                            {shouldShowRating(product.rating) ? (
                              <div className="inline-flex items-center gap-1">
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                <span className="font-semibold text-foreground">{formatRating(product.rating)}</span>
                              </div>
                            ) : null}
                            {Number(product.review_count ?? 0) > 0 ? (
                              <span>({Number(product.review_count ?? 0).toLocaleString()} 条评论)</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-extrabold text-primary">
                          {formatPrice(product.price)}起
                        </div>
                        {product.original_price && product.original_price > product.price ? (
                          <div className="text-sm text-muted-foreground line-through">
                            {formatPrice(product.original_price)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 sm:px-5 pb-5">
                    <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-muted-foreground/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={safeMediaSrc(galleryImages[galleryIndex])}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={onImgErrorUseFallback}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                      <button
                        type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/55 text-white flex items-center justify-center"
                        aria-label="上一张"
                        onClick={() => setGalleryIndex((i) => Math.max(0, i - 1))}
                        disabled={galleryIndex <= 0}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/55 text-white flex items-center justify-center"
                        aria-label="下一张"
                        onClick={() => setGalleryIndex((i) => Math.min(galleryImages.length - 1, i + 1))}
                        disabled={galleryIndex >= galleryImages.length - 1}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      <div className="absolute left-4 bottom-4 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 text-white/95 backdrop-blur px-3 py-1.5 text-xs font-semibold">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {galleryIndex + 1}/{galleryImages.length}
                        </span>
                      </div>
                    </div>

                    {galleryImages.length > 1 ? (
                      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                        {galleryImages.map((img, idx) => {
                          const active = idx === galleryIndex
                          return (
                            <button
                              type="button"
                              key={`${idx}`}
                              className={`shrink-0 rounded-xl overflow-hidden border transition ${
                                active ? 'border-primary shadow-[0_0_0_3px_rgba(37,99,235,0.15)]' : 'border-border/70 hover:border-primary/40'
                              }`}
                              onClick={() => setGalleryIndex(idx)}
                              aria-label={`查看第 ${idx + 1} 张图片`}
                            >
                              <img
                                src={safeMediaSrc(img)}
                                alt={`${product.name} ${idx + 1}`}
                                className={`h-16 w-20 object-cover ${active ? 'opacity-100' : 'opacity-80'}`}
                                onError={onImgErrorUseFallback}
                              />
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </section>

                {/* Tabs */}
                <section className="mt-7 rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm overflow-hidden">
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/60">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTab('overview')}
                        className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                          tab === 'overview' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-card/60 border border-border/60'
                        }`}
                      >
                        概述
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('itinerary')}
                        className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                          tab === 'itinerary' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-card/60 border border-border/60'
                        }`}
                      >
                        行程安排
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('reviews')}
                        className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                          tab === 'reviews' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-card/60 border border-border/60'
                        }`}
                      >
                        用户评价
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('qa')
                          loadQuestions()
                        }}
                        className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                          tab === 'qa' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-card/60 border border-border/60'
                        }`}
                      >
                        问答
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    {tab === 'overview' ? (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-lg font-extrabold">产品描述</h2>
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                            {product.description || '暂无描述'}
                          </p>
                        </div>

                        {product.tags?.length ? (
                          <div>
                            <h2 className="text-lg font-extrabold">标签</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {product.tags.map((t) => (
                                <span key={t} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/15 text-primary text-xs font-semibold">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <h2 className="text-lg font-extrabold">位置信息</h2>
                              <p className="text-sm text-muted-foreground mt-2">
                                {product.location?.city ? `${product.location.city} · ` : ''}
                                {product.location?.country || '地区未知'}
                              </p>
                              {product.location?.coordinates ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  坐标：{product.location.coordinates.lat.toFixed(4)}, {product.location.coordinates.lng.toFixed(4)}
                                </p>
                              ) : null}
                            </div>
                            <Link
                              href={`/destinations?city=${encodeURIComponent(product.location?.city || '')}`}
                              className="btn btn-outline rounded-xl px-4 py-2"
                            >
                              查看同城更多
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : tab === 'itinerary' ? (
                      <div className="space-y-4">
                        <h2 className="text-lg font-extrabold">行程安排（由产品元数据生成）</h2>
                        {(() => {
                          const items: { title: string; desc?: string }[] = []
                          const meta = product.metadata || ({} as any)
                          switch (product.type) {
                            case 'flight':
                              items.push(
                                { title: '航班信息', desc: `${meta.airline || '航班'}${meta.flight_number ? ` · ${meta.flight_number}` : ''}` },
                                { title: '出发', desc: `${meta.departure_time || '-'} · ${meta.departure_airport || '-'}` },
                                { title: '到达', desc: `${meta.arrival_time || '-'} · ${meta.arrival_airport || '-'}` },
                                ...(meta.duration ? [{ title: '飞行时长', desc: meta.duration }] : []),
                              )
                              break
                            case 'hotel':
                              items.push(
                                { title: '入住/离店', desc: `${meta.check_in_time || '—'} · ${meta.check_out_time || '—'}` },
                                { title: '房型', desc: meta.room_type || '—' },
                                ...(meta.amenities?.slice(0, 3).map((a: string) => ({ title: '亮点服务', desc: a })) || []),
                              )
                              break
                            case 'ticket':
                              items.push(
                                { title: '景点', desc: meta.attraction_name || '—' },
                                { title: '开放时间', desc: meta.opening_hours || '—' },
                                ...(meta.valid_days ? [{ title: '有效天数', desc: `${meta.valid_days} 天` }] : []),
                              )
                              break
                            case 'experience':
                              items.push(
                                ...(meta.experience_duration ? [{ title: '体验时长', desc: meta.experience_duration }] : []),
                                { title: '难度', desc: meta.difficulty || '—' },
                                ...(meta.includes?.slice(0, 5).map((x: string) => ({ title: '包含内容', desc: x })) || []),
                              )
                              break
                            default:
                              items.push({ title: '行程信息', desc: product.description || '—' })
                          }
                          const unique = Array.from(new Map(items.map((i) => [i.title, i])).values())
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {unique.length ? (
                                unique.map((it) => (
                                  <div key={it.title} className="rounded-2xl border border-border/60 bg-card/50 p-4">
                                    <div className="font-extrabold text-foreground">{it.title}</div>
                                    <div className="text-sm text-muted-foreground mt-2 leading-relaxed">{it.desc || '—'}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-2xl">暂无行程安排信息</div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    ) : tab === 'reviews' ? (
                      <div className="space-y-6">
                        {/* Write review */}
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <h2 className="text-lg font-extrabold">写评价</h2>
                              <p className="text-sm text-muted-foreground mt-1">星级 + 文字 +（可选）图片</p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              当前星级：<span className="font-semibold text-foreground">{reviewFormRating} / 5</span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-4 flex-wrap">
                            <StarsPicker value={reviewFormRating} onChange={setReviewFormRating} />
                            <div className="text-xs text-muted-foreground">提示：真实、具体的文字更有帮助</div>
                          </div>

                          <div className="mt-4">
                            <textarea
                              value={reviewFormContent}
                              onChange={(e) => setReviewFormContent(e.target.value)}
                              placeholder="告诉大家你的真实体验吧：交通、服务、体验感、性价比……"
                              className="w-full min-h-[110px] rounded-2xl border border-border/60 bg-transparent p-4 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>

                          <div className="mt-4">
                            <div className="text-sm font-semibold">图片（最多 3 张）</div>
                            <div className="mt-2 flex items-center gap-3">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => onPickReviewImages(e.target.files)}
                                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border file:border-border/60 file:bg-card/50 file:px-4 file:py-2 file:text-foreground"
                              />
                            </div>
                            {reviewFormImages.length ? (
                              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                                {reviewFormImages.map((img, idx) => (
                                  <div key={idx} className="rounded-xl overflow-hidden border border-border/60">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img} alt={`review-${idx}`} className="h-16 w-16 object-cover" />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-5 flex gap-3 flex-wrap">
                            <button
                              type="button"
                              onClick={onSubmitReview}
                              disabled={submittingReview}
                              className="travel-btn-gradient px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl"
                            >
                              {submittingReview ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" /> 发布中…
                                </span>
                              ) : (
                                '发布评价'
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={submittingReview}
                              onClick={() => {
                                setReviewFormRating(5)
                                setReviewFormContent('')
                                setReviewFormImages([])
                              }}
                              className="btn btn-outline rounded-2xl px-4 py-2"
                            >
                              清空
                            </button>
                          </div>
                        </div>

                        {/* Reviews list */}
                        <div>
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <h2 className="text-lg font-extrabold">用户评价</h2>
                            <button
                              type="button"
                              className="btn btn-outline rounded-xl px-4 py-2 inline-flex items-center gap-2"
                              onClick={() => {
                                setTab('reviews')
                                // 轻刷新：重新触发 useEffect
                                if (productId) {
                                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                  fetch(`${API_BASE_URL}/api/products/${productId}/reviews`, { cache: 'no-store' })
                                    .then((r) => r.json().catch(() => ({})))
                                    .then((data) => {
                                      const list = (data?.reviews ?? data?.items ?? data?.data ?? []) as ProductReview[]
                                      setReviews(Array.isArray(list) ? list : [])
                                    })
                                    .catch(() => toast.error('刷新失败'))
                                }
                              }}
                            >
                              刷新
                            </button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {loadingReviews ? '加载中…' : `共 ${reviews.length} 条`}
                          </p>

                          <div className="mt-4 space-y-3">
                            {loadingReviews ? (
                              Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-border/60 bg-card/50 p-4 animate-pulse">
                                  <div className="h-4 bg-muted-foreground/10 rounded w-2/5" />
                                  <div className="mt-2 h-3 bg-muted-foreground/10 rounded w-3/5" />
                                  <div className="mt-3 h-4 bg-muted-foreground/10 rounded w-full" />
                                </div>
                              ))
                            ) : reviews.length ? (
                              reviews.map((r, idx) => (
                                <div key={r.id ?? idx} className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      {r.user?.avatar_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={safeMediaSrc(r.user.avatar_url)} alt={r.user?.nickname || 'user'} className="h-10 w-10 rounded-full object-cover" />
                                      ) : (
                                        <div className="h-10 w-10 rounded-full bg-primary/10 border border-border/60 flex items-center justify-center text-primary">
                                          <User className="h-5 w-5" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="font-extrabold truncate">{r.user?.nickname || '匿名用户'}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{formatDateZh(r.created_at)}</div>
                                      </div>
                                    </div>
                                    {shouldShowRating(r.rating) ? (
                                      <div className="inline-flex items-center gap-1 text-sm text-amber-500">
                                        <Star className="h-4 w-4 fill-amber-500" />
                                        <span className="font-semibold">{formatRating(r.rating)}</span>
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {r.content || ''}
                                  </div>

                                  {Array.isArray(r.images) && r.images.length ? (
                                    <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                                      {r.images.slice(0, 6).map((img, i) => (
                                        <div key={i} className="rounded-xl overflow-hidden border border-border/60">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={safeMediaSrc(img)} alt="review-img" className="h-16 w-16 object-cover" />
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-6 text-sm text-muted-foreground">
                                暂无用户评价
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : tab === 'qa' ? (
                      <div className="space-y-6">
                        {/* 提问表单 */}
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <h2 className="text-lg font-extrabold">提问</h2>
                              <p className="text-sm text-muted-foreground mt-1">关于这个产品的任何疑问都可以问</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <textarea
                              value={questionFormContent}
                              onChange={(e) => setQuestionFormContent(e.target.value)}
                              placeholder="例如：这个门票包含哪些项目？需要提前预约吗？"
                              className="w-full min-h-[100px] rounded-2xl border border-border/60 bg-transparent p-4 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>

                          <div className="mt-4 flex gap-3 flex-wrap">
                            <button
                              type="button"
                              onClick={onSubmitQuestion}
                              disabled={submittingQuestion || !questionFormContent.trim()}
                              className="travel-btn-gradient px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl"
                            >
                              {submittingQuestion ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" /> 提交中…
                                </span>
                              ) : (
                                '提交问题'
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={submittingQuestion}
                              onClick={() => setQuestionFormContent('')}
                              className="btn btn-outline rounded-2xl px-4 py-2"
                            >
                              清空
                            </button>
                          </div>
                        </div>

                        {/* 问答列表 */}
                        <div>
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <h2 className="text-lg font-extrabold">问答列表</h2>
                            <button
                              type="button"
                              className="btn btn-outline rounded-xl px-4 py-2 inline-flex items-center gap-2"
                              onClick={loadQuestions}
                            >
                              刷新
                            </button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {loadingQuestions ? '加载中…' : `共 ${questions.length} 条问答`}
                          </p>

                          <div className="mt-4 space-y-3">
                            {loadingQuestions ? (
                              Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-border/60 bg-card/50 p-4 animate-pulse">
                                  <div className="h-4 bg-muted-foreground/10 rounded w-2/5" />
                                  <div className="mt-2 h-3 bg-muted-foreground/10 rounded w-3/5" />
                                  <div className="mt-3 h-4 bg-muted-foreground/10 rounded w-full" />
                                </div>
                              ))
                            ) : questions.length ? (
                              questions.map((q: any, idx: number) => (
                                <div key={q.id ?? idx} className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
                                  {/* 问题部分 */}
                                  <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                                      <span className="text-xs font-bold">Q</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-foreground">
                                          {q.author?.nickname || '匿名用户'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatDateZh(q.created_at)}
                                        </span>
                                      </div>
                                      <div className="mt-1 text-sm text-foreground leading-relaxed">
                                        {q.question}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 回答部分 */}
                                  {q.answer ? (
                                    <div className="mt-4 pl-11">
                                      <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600 shrink-0">
                                          <span className="text-xs font-bold">A</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-foreground">
                                              {q.responder?.nickname || '官方回复'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {formatDateZh(q.answered_at)}
                                            </span>
                                          </div>
                                          <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                                            {q.answer}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-4 pl-11">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>等待回复中...</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-6 text-sm text-muted-foreground text-center">
                                <div className="mx-auto w-fit rounded-full bg-blue-100 p-3 text-blue-600 mb-3">
                                  <MessageCircle className="h-6 w-6" />
                                </div>
                                <div className="font-medium">暂无问答</div>
                                <div className="mt-1">成为第一个提问的人吧！</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              {/* Right floating booking sidebar */}
              <aside className="lg:col-span-1">
                <div className="lg:sticky lg:top-[88px]">
                  <div className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-extrabold">预订</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {product.inventory === 0 ? '已售罄' : product.type === 'hotel' ? '选择入住日期' : '选择出行日期'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleFavorite}
                        disabled={favoritesLoading}
                        className={`h-11 w-11 rounded-2xl border inline-flex items-center justify-center transition ${
                          isFavorited ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-transparent border-border/70 text-foreground hover:bg-card/60'
                        } disabled:opacity-60`}
                        aria-label="加入收藏"
                      >
                        <Heart className={`h-5 w-5 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="text-sm font-semibold mb-2">选择日期</div>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                              setSelectedDate(e.target.value)
                              setSelectedTimeSlot('')
                            }}
                            className="input pl-10"
                            disabled={product.inventory === 0}
                          />
                        </div>
                      </div>

                      {/* 分时预约 - 时间段选择 */}
                      {loadingTimeSlots ? (
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
                          <div className="text-sm font-semibold mb-3">选择时段</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            加载可用时段...
                          </div>
                        </div>
                      ) : timeSlots.length > 0 ? (
                        <div>
                          <div className="text-sm font-semibold mb-2">选择时段</div>
                          <div className="grid grid-cols-2 gap-2">
                            {timeSlots.map((slot) => (
                              <button
                                key={slot.time}
                                type="button"
                                onClick={() => setSelectedTimeSlot(slot.time)}
                                disabled={slot.available <= 0}
                                className={`rounded-xl border px-3 py-2 text-sm transition ${
                                  selectedTimeSlot === slot.time
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : slot.available <= 0
                                    ? 'border-border/40 bg-muted/50 text-muted-foreground cursor-not-allowed'
                                    : 'border-border/60 bg-card/50 hover:bg-card hover:border-primary/30'
                                }`}
                              >
                                <div className="font-medium">{slot.time}</div>
                                <div className={`text-xs mt-0.5 ${
                                  slot.available <= 10 ? 'text-orange-500' : 'text-muted-foreground'
                                }`}>
                                  {slot.available <= 0 ? '已售罄' : `剩余 ${slot.available} 张`}
                                </div>
                              </button>
                            ))}
                          </div>
                          {selectedTimeSlot && (
                            <p className="text-xs text-muted-foreground mt-2">
                              已选择: {selectedTimeSlot}
                            </p>
                          )}
                        </div>
                      ) : null}

                      <div>
                        <div className="text-sm font-semibold mb-2">数量</div>
                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/50 px-3 py-3">
                          <button
                            type="button"
                            className="h-10 w-10 rounded-xl border border-border/60 bg-card/50 hover:bg-card transition flex items-center justify-center disabled:opacity-50"
                            disabled={quantity <= 1 || product.inventory === 0}
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">购买数量</div>
                            <div className="text-xl font-extrabold tabular-nums">{quantity}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">库存上限：{maxQty}</div>
                          </div>
                          <button
                            type="button"
                            className="h-10 w-10 rounded-xl border border-border/60 bg-card/50 hover:bg-card transition flex items-center justify-center disabled:opacity-50"
                            disabled={quantity >= maxQty || product.inventory === 0}
                            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm text-muted-foreground">单价</div>
                            <div className="font-extrabold text-foreground mt-1">{formatPrice(unitPrice)}起</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">合计</div>
                            <div className="text-2xl font-extrabold text-primary mt-1 tabular-nums">{formatPrice(totalPrice)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          价格为预估（以订单创建为准）。你可在评价里补充出行体验。
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={onCheckout}
                          disabled={ordersSubmitting || product.inventory === 0}
                          className="travel-btn-gradient px-5 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl w-full"
                        >
                          {ordersSubmitting ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              提交中…
                            </span>
                          ) : (
                            '立即预订'
                          )}
                        </button>
                      </div>

                      <div className="text-xs text-muted-foreground leading-relaxed">
                        点击“立即预订”将调用 `POST /api/orders` 创建订单（不包含真实支付）。
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Bottom: related products */}
              <div className="lg:col-span-3">
                <section className="mt-10">
                  <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
                    <div>
                      <h2 className="text-xl md:text-2xl font-extrabold">相关推荐产品</h2>
                      <p className="text-sm text-muted-foreground mt-1">同城/高评分产品推荐给你</p>
                    </div>
                    <Link href="/destinations" className="btn btn-outline rounded-xl px-4 py-2">
                      去看看更多
                    </Link>
                  </div>

                  {loadingRelated ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl bg-card border border-border/60 overflow-hidden animate-pulse">
                          <div className="aspect-[4/3] bg-muted-foreground/10" />
                          <div className="p-4">
                            <div className="h-4 bg-muted-foreground/10 rounded w-2/3" />
                            <div className="mt-2 h-3 bg-muted-foreground/10 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : related.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {related.map((p) => (
                        <ProductCard key={p.id} product={p} onClick={() => router.push(`/products/${p.id}`)} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-6 text-sm text-muted-foreground">
                      暂无相关推荐
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  )
}

