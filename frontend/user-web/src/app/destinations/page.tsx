'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronRight,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Loader2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import { DestinationCard } from '@/components/DestinationCard'
import type { Product } from '@/types'
import { useDebounce } from '@/hooks'
import { type ContinentKey } from '@/lib/destinationRegions'

const perPage = 12
const destPerPage = 9

type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'rating_desc' | 'sales_desc'
type DestSortKey = 'hot_desc' | 'rating_desc' | 'created_desc'

type DestinationRow = {
  id: number
  name: string
  city: string
  province: string
  description?: string
  cover_image?: string
  rating?: number
  created_at?: string
}

// 使用 IntersectionObserver 实现无限滚动
function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean,
  loading: boolean
) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const targetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (loading || !hasMore) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          callback()
        }
      },
      { rootMargin: '100px' }
    )

    if (targetRef.current) {
      observerRef.current.observe(targetRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback, hasMore, loading])

  return targetRef
}

export default function DestinationsPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const initialKeyword = searchParams.get('keyword') ?? ''
  const initialCity = searchParams.get('city') ?? ''
  const initialType = (searchParams.get('type') ?? 'all') as 'all' | Product['type']
  const initialSort = (searchParams.get('sort') ?? 'recommended') as SortKey
  const initialPage = Number(searchParams.get('page') ?? '1') || 1
  const initialView = searchParams.get('view') === 'products' ? 'products' : 'spots'

  const [tab, setTab] = useState<'spots' | 'products'>(initialView)

  const [keyword, setKeyword] = useState(initialKeyword)
  const debouncedKeyword = useDebounce(keyword, 300)

  const [city, setCity] = useState(initialCity)
  const [province, setProvince] = useState('')
  const [type, setType] = useState<'all' | Product['type']>(initialType)
  const [ratingMin, setRatingMin] = useState<number | ''>('')
  const [priceMin, setPriceMin] = useState<number | ''>('')
  const [priceMax, setPriceMax] = useState<number | ''>('')
  const [sortKey, setSortKey] = useState<SortKey>(initialSort)
  const [page, setPage] = useState(initialPage)

  // 景点相关状态 - 服务端分页
  const [spotsDest, setSpotsDest] = useState<DestinationRow[]>([])
  const [loadingSpots, setLoadingSpots] = useState(false)
  const [spotsError, setSpotsError] = useState<string | null>(null)
  const [continent] = useState<ContinentKey>('all')
  const [destSort, setDestSort] = useState<DestSortKey>('hot_desc')
  const [destPage, setDestPage] = useState(1)
  const [destTotal, setDestTotal] = useState(0)
  const [hasMoreSpots, setHasMoreSpots] = useState(true)

  // 元数据状态
  const [provinces, setProvinces] = useState<{ name: string; count: number }[]>([])
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [cities, setCities] = useState<{ name: string; count: number }[]>([])
  const [loadingCities, setLoadingCities] = useState(false)

  // 产品相关状态
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncTabToUrl = (next: 'spots' | 'products') => {
    const q = new URLSearchParams(searchParams.toString())
    if (next === 'products') q.set('view', 'products')
    else q.delete('view')
    const qs = q.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const sortMeta = useMemo(() => {
    const map: Record<SortKey, { apiSort: string; order: 'asc' | 'desc' }> = {
      recommended: { apiSort: 'rating', order: 'desc' },
      rating_desc: { apiSort: 'rating', order: 'desc' },
      price_asc: { apiSort: 'price', order: 'asc' },
      price_desc: { apiSort: 'price', order: 'desc' },
      sales_desc: { apiSort: 'sales', order: 'desc' },
    }
    return map[sortKey]
  }, [sortKey])

  const sortLabel = useMemo(() => {
    switch (sortKey) {
      case 'recommended':
        return '推荐（评分优先）'
      case 'sales_desc':
        return '销量优先'
      case 'rating_desc':
        return '评分优先'
      case 'price_asc':
        return '价格从低到高'
      case 'price_desc':
        return '价格从高到低'
      default:
        return '推荐'
    }
  }, [sortKey])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  // 获取元数据（省份列表等）
  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoadingProvinces(true)
      try {
        const res = await fetch(`/api/destinations/metadata`, {
          cache: 'default' // 使用浏览器缓存
        })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && data.success) {
          setProvinces(data.metadata?.provinces || [])
        }
      } catch {
        if (!cancelled) setProvinces([])
      } finally {
        if (!cancelled) setLoadingProvinces(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  // 获取景点列表 - 服务端分页
  const fetchDestinations = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
    setLoadingSpots(true)
    if (!isLoadMore) {
      setSpotsError(null)
    }

    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('per_page', String(destPerPage))
      params.set('light', 'true') // 轻量模式

      // 排序映射
      const sortMap: Record<DestSortKey, { sort: string; order: string }> = {
        'hot_desc': { sort: 'popular', order: 'desc' },
        'rating_desc': { sort: 'rating', order: 'desc' },
        'created_desc': { sort: 'created_at', order: 'desc' },
      }
      const sortConfig = sortMap[destSort]
      params.set('sort_by', sortConfig.sort)
      params.set('order', sortConfig.order)

      if (debouncedKeyword.trim()) {
        params.set('keyword', debouncedKeyword.trim())
      }

      if (province.trim()) {
        params.set('province', province.trim())
      }

      const res = await fetch(`/api/destinations?${params.toString()}`, {
        cache: 'default'
      })

      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`)
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || '获取数据失败')
      }

      const list = (data?.destinations || []) as DestinationRow[]
      const total = data?.total || 0

      setSpotsDest(prev => isLoadMore ? [...prev, ...list] : list)
      setDestTotal(total)
      setHasMoreSpots(list.length === destPerPage && pageNum * destPerPage < total)
    } catch (e: any) {
      setSpotsError(e?.message || '加载失败')
      toast.error(e?.message || '加载失败')
    } finally {
      setLoadingSpots(false)
    }
  }, [province, debouncedKeyword, destSort])

  // 初始加载景点
  useEffect(() => {
    setDestPage(1)
    fetchDestinations(1, false)
  }, [fetchDestinations])

  // 计算景点总页数
  const destTotalPages = Math.max(1, Math.ceil(destTotal / destPerPage))

  // 获取产品列表
  useEffect(() => {
    if (tab !== 'products') return
    const controller = new AbortController()
    async function run() {
      try {
        setLoadingProducts(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('status', 'active')
        params.set('sort', sortMeta.apiSort)
        params.set('order', sortMeta.order)
        params.set('limit', String(perPage))
        params.set('offset', String((page - 1) * perPage))

        if (city.trim()) params.set('destination', city.trim())
        if (type !== 'all') params.set('type', type)
        if (typeof ratingMin === 'number') params.set('rating_min', String(ratingMin))
        if (typeof priceMin === 'number') params.set('budget_min', String(priceMin))
        if (typeof priceMax === 'number') params.set('budget_max', String(priceMax))
        if (debouncedKeyword.trim()) params.set('q', debouncedKeyword.trim())

        const res = await fetch(`/api/products?${params.toString()}`, { 
          cache: 'default', 
          signal: controller.signal 
        })
        const data = await res.json().catch(() => ({}))

        const list = (data?.products ?? data?.items ?? data?.data ?? []) as Product[]
        const nextTotal = Number(data?.total ?? data?.count ?? data?.total_count ?? list.length)

        const sorted = [...list].sort((a, b) => {
          switch (sortKey) {
            case 'price_asc':
              return a.price - b.price
            case 'price_desc':
              return b.price - a.price
            case 'rating_desc':
            case 'recommended':
              return b.rating - a.rating || b.review_count - a.review_count
            case 'sales_desc':
              return b.review_count - a.review_count || b.rating - a.rating
            default:
              return b.rating - a.rating
          }
        })

        const keywordLower = debouncedKeyword.trim().toLowerCase()
        const pageFiltered =
          keywordLower.length > 0
            ? sorted.filter((p) => {
                const hay = `${p.name} ${p.location.city} ${(p.tags ?? []).join(' ')}`.toLowerCase()
                return hay.includes(keywordLower)
              })
            : sorted

        setProducts(pageFiltered)
        setTotal(nextTotal)
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        const msg = e?.message || '加载失败'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoadingProducts(false)
      }
    }

    run()
    return () => controller.abort()
  }, [tab, city, type, ratingMin, priceMin, priceMax, sortKey, page, debouncedKeyword, sortMeta])

  const loadingSkeleton = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/60 overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-muted-foreground/10" />
          <div className="p-4">
            <div className="h-4 bg-muted-foreground/10 rounded w-2/3" />
            <div className="mt-2 h-3 bg-muted-foreground/10 rounded w-1/2" />
            <div className="mt-4 h-5 bg-muted-foreground/10 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )

  const spotsSkeleton = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/60 overflow-hidden animate-pulse">
          <div className="h-40 sm:aspect-[4/3] sm:h-auto bg-muted-foreground/10" />
          <div className="p-4">
            <div className="h-4 bg-muted-foreground/10 rounded w-2/3" />
            <div className="mt-2 h-3 bg-muted-foreground/10 rounded w-full" />
            <div className="mt-4 h-3 bg-muted-foreground/10 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen page-bg">
      <Navbar />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">探索目的地</h1>
              <p className="text-sm text-muted-foreground mt-1">浏览目的地景点，或筛选旅行产品</p>
            </div>
            <div className="inline-flex rounded-2xl border border-border/70 bg-card/80 p-1 backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  setTab('spots')
                  syncTabToUrl('spots')
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  tab === 'spots' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                目的地
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('products')
                  syncTabToUrl('products')
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  tab === 'products' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                旅行产品
              </button>
            </div>
          </div>

          {tab === 'spots' ? (
            <section className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                {/* 大洲筛选已移除 */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:min-w-[260px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={keyword}
                      onChange={(e) => {
                        setKeyword(e.target.value)
                        setDestPage(1)
                      }}
                      placeholder="搜索景点 / 省份"
                      className="input pl-10 w-full"
                    />
                  </div>
                  <select
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value)
                      setDestPage(1)
                    }}
                    className="input w-full sm:w-auto"
                  >
                    <option value="">所有省份</option>
                    {loadingProvinces ? (
                      <option disabled>加载中...</option>
                    ) : (
                      provinces.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} ({p.count})
                        </option>
                      ))
                    )}
                  </select>
                  <select
                    value={destSort}
                    onChange={(e) => {
                      setDestSort(e.target.value as DestSortKey)
                      setDestPage(1)
                    }}
                    className="input w-full sm:w-auto"
                  >
                    <option value="hot_desc">按热度排序</option>
                    <option value="rating_desc">按评分排序</option>
                  </select>
                </div>
              </div>

              {spotsError ? (
                <div className="card p-6 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-700 dark:text-red-200">
                  <div className="font-semibold">加载失败</div>
                  <div className="text-sm opacity-90 mt-2">{spotsError}</div>
                  <button 
                    className="btn btn-outline mt-4" 
                    onClick={() => fetchDestinations(1, false)}
                    type="button"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    重试
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    共 {destTotal} 个景点
                    {province ? ` · ${province}` : ''}
                    {debouncedKeyword ? ` · 搜索 "${debouncedKeyword}"` : ''}
                  </p>
                  
                  {spotsDest.length === 0 && !loadingSpots ? (
                    <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-muted-foreground">
                      暂无符合条件的景点。试试其它筛选条件
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {spotsDest.map((d) => (
                          <DestinationCard key={d.id} destination={d} imageHeightClass="h-40" />
                        ))}
                        {loadingSpots && (
                          <>
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={`loading-${i}`} className="rounded-2xl bg-card border border-border/60 overflow-hidden animate-pulse">
                                <div className="h-40 sm:aspect-[4/3] sm:h-auto bg-muted-foreground/10" />
                                <div className="p-4">
                                  <div className="h-4 bg-muted-foreground/10 rounded w-2/3" />
                                  <div className="mt-2 h-3 bg-muted-foreground/10 rounded w-full" />
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                      
                      {/* 底部分页器 */}
                      {destTotalPages > 1 && spotsDest.length > 0 && (
                        <div className="mt-7 flex items-center justify-between gap-4">
                          <button
                            type="button"
                            disabled={destPage <= 1}
                            onClick={() => {
                              setDestPage((p) => Math.max(1, p - 1))
                              fetchDestinations(Math.max(1, destPage - 1), false)
                            }}
                            className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            上一页
                          </button>

                          <div className="flex items-center gap-2">
                            {Array.from({ length: Math.min(destTotalPages, 7) }).map((_, i) => {
                              const start = Math.max(1, destPage - 3)
                              const idx = start + i
                              if (idx > destTotalPages) return null
                              const active = idx === destPage
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setDestPage(idx)
                                    fetchDestinations(idx, false)
                                  }}
                                  className={`h-9 min-w-9 rounded-xl border px-3 text-sm font-semibold transition ${
                                    active
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-transparent border-border hover:bg-card/70'
                                  }`}
                                >
                                  {idx}
                                </button>
                              )
                            })}
                          </div>

                          <button
                            type="button"
                            disabled={destPage >= destTotalPages}
                            onClick={() => {
                              const nextPage = destPage + 1
                              setDestPage(nextPage)
                              fetchDestinations(nextPage, false)
                            }}
                            className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                          >
                            下一页
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </section>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="lg:w-80 shrink-0">
                <div className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <SlidersHorizontal className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground">产品筛选</h2>
                      <p className="text-sm text-muted-foreground mt-1">价格区间 · 评分 · 类型 · 城市</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-foreground mb-2">关键词</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          value={keyword}
                          onChange={(e) => {
                            setKeyword(e.target.value)
                            setPage(1)
                          }}
                          placeholder="目的地/商品/标签"
                          className="input pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-foreground mb-2">城市</div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        {loadingCities ? (
                          <input disabled className="input pl-10" value="加载城市中..." />
                        ) : (
                          <select
                            value={city}
                            onChange={(e) => {
                              setCity(e.target.value)
                              setPage(1)
                            }}
                            className="input pl-10"
                          >
                            <option value="">不限</option>
                            {cities.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name} ({c.count})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-foreground mb-2">类型</div>
                      <select
                        value={type}
                        onChange={(e) => {
                          setType(e.target.value as any)
                          setPage(1)
                        }}
                        className="input"
                      >
                        <option value="all">全部</option>
                        <option value="flight">机票</option>
                        <option value="hotel">酒店</option>
                        <option value="ticket">门票</option>
                        <option value="experience">当地体验</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-foreground mb-2">价格区间</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">最低</div>
                          <input
                            inputMode="numeric"
                            type="number"
                            value={priceMin}
                            onChange={(e) => {
                              const v = e.target.value
                              setPriceMin(v === '' ? '' : Number(v))
                              setPage(1)
                            }}
                            placeholder="例如 200"
                            className="input"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">最高</div>
                          <input
                            inputMode="numeric"
                            type="number"
                            value={priceMax}
                            onChange={(e) => {
                              const v = e.target.value
                              setPriceMax(v === '' ? '' : Number(v))
                              setPage(1)
                            }}
                            placeholder="例如 1200"
                            className="input"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-foreground mb-2">评分</div>
                      <select
                        value={ratingMin === '' ? '' : String(ratingMin)}
                        onChange={(e) => {
                          const v = e.target.value
                          setRatingMin(v === '' ? '' : Number(v))
                          setPage(1)
                        }}
                        className="input"
                      >
                        <option value="">不限</option>
                        <option value="4.8">4.8+ 优质</option>
                        <option value="4.5">4.5+ 推荐</option>
                        <option value="4.2">4.2+ 好评</option>
                        <option value="4.0">4.0+ 及格</option>
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="flex-1 btn btn-outline"
                        onClick={() => {
                          setKeyword('')
                          setCity('')
                          setType('all')
                          setRatingMin('')
                          setPriceMin('')
                          setPriceMax('')
                          setSortKey('recommended')
                          setPage(1)
                        }}
                      >
                        重置
                      </button>
                      <Link href="/assistant" className="flex-1 btn btn-primary inline-flex items-center justify-center gap-2">
                        <Filter className="h-4 w-4" />
                        AI筛选
                      </Link>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="flex-1 min-w-0">
                <div className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <h2 className="text-lg md:text-xl font-extrabold text-foreground">产品列表</h2>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {total ? `共${total}个产品 · ${sortLabel}` : `根据筛选条件实时更新 · ${sortLabel}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block text-sm text-muted-foreground">排序</div>
                      <select
                        value={sortKey}
                        onChange={(e) => {
                          setSortKey(e.target.value as SortKey)
                          setPage(1)
                        }}
                        className="input"
                      >
                        <option value="recommended">推荐（评分优先）</option>
                        <option value="sales_desc">销量优先</option>
                        <option value="rating_desc">评分优先</option>
                        <option value="price_asc">价格从低到高</option>
                        <option value="price_desc">价格从高到低</option>
                      </select>
                    </div>
                  </div>

                  {loadingProducts && products.length === 0 ? (
                    loadingSkeleton
                  ) : error ? (
                    <div className="card p-6 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-700 dark:text-red-200">
                      <div className="font-semibold">加载失败</div>
                      <div className="text-sm opacity-90 mt-2">{error}</div>
                      <div className="mt-4 flex gap-3 flex-wrap">
                        <button className="btn btn-outline" onClick={() => window.location.reload()} type="button">
                          <RotateCcw className="h-4 w-4" />
                          重试
                        </button>
                      </div>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-muted-foreground">
                      暂无符合条件的产品。你可以放宽筛选条件再试试
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((p, idx) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.id}`}
                          className={idx === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}
                        >
                          <ProductCard product={p} variant={idx === 0 ? 'featured' : 'default'} className="h-full" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {!loadingProducts && !error && totalPages > 1 && products.length > 0 && (
                    <div className="mt-7 flex items-center justify-between gap-4">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>

                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                          const start = Math.max(1, page - 3)
                          const idx = start + i
                          if (idx > totalPages) return null
                          const active = idx === page
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPage(idx)}
                              className={`h-9 min-w-9 rounded-xl border px-3 text-sm font-semibold transition ${
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-transparent border-border hover:bg-card/70'
                              }`}
                            >
                              {idx}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                      >
                        下一页
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
