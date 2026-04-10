'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDebounce } from '@/hooks'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { apiClient } from '@/lib/apiClient'
import { LeafletMap } from '@/components/search/LeafletMap'
import { ProductResultsList } from '@/components/search/ProductResultsList'
import { Check, Search, SlidersHorizontal, Tag } from 'lucide-react'

type ProductLike = {
  id: string | number
  name?: string
  price?: number
  rating?: number
  review_count?: number
  tags?: string[]
  images?: string[]
  location?: any
}

type SuggestResponse = {
  success: boolean
  tags?: string[]
  cities?: string[]
  hot_tags?: string[]
}

type ViewMode = 'split' | 'map' | 'list'

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'flight', label: '机票' },
  { value: 'hotel', label: '酒店' },
  { value: 'ticket', label: '门票' },
  { value: 'experience', label: '当地体验' },
]

export default function SearchPage() {
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebounce(keyword, 300)

  const [type, setType] = useState<string>('all')
  const [city, setCity] = useState<string>('')

  // Advanced filters
  const [priceMin, setPriceMin] = useState<number | ''>('')
  const [priceMax, setPriceMax] = useState<number | ''>('')
  const [ratingMin, setRatingMin] = useState<number | ''>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [cities, setCities] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [hotTags, setHotTags] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const [products, setProducts] = useState<ProductLike[]>([])
  const [total, setTotal] = useState(0)
  const [loadingProducts, setLoadingProducts] = useState(false)

  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const p of products) {
      for (const t of p.tags || []) tagSet.add(t)
    }
    return Array.from(tagSet).slice(0, 20)
  }, [products])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await apiClient<any>('/api/destinations', {
          query: { per_page: 120, page: 1 },
          cache: 'no-store',
        })
        const list = (data?.destinations ?? data?.items ?? data?.data ?? []) as Array<{ city?: string }>
        const unique = Array.from(new Set(list.map((d) => d.city).filter(Boolean))) as string[]
        if (!cancelled) setCities(unique.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')))
      } catch {
        if (!cancelled) setCities([])
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await apiClient<SuggestResponse>('/api/search/suggest', {
          query: { q: '' },
          cache: 'no-store',
        })
        const nextHot = Array.isArray(data?.hot_tags) ? data.hot_tags : Array.isArray(data?.tags) ? data.tags : []
        if (!cancelled) setHotTags(nextHot)
      } catch {
        if (!cancelled) setHotTags([])
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const q = debouncedKeyword.trim()
      if (!q) {
        setSuggestions([])
        return
      }
      setLoadingSuggestions(true)
      try {
        const data = await apiClient<SuggestResponse>('/api/search/suggest', {
          query: { q },
          cache: 'no-store',
        })
        const tags = Array.isArray(data?.tags) ? data.tags : []
        if (!cancelled) setSuggestions(tags)
      } catch {
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setLoadingSuggestions(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [debouncedKeyword])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function run() {
      setLoadingProducts(true)
      try {
        const params: Record<string, string | number | boolean | undefined> = {
          status: 'active',
          sort: 'rating',
          limit: 50,
          offset: 0,
        }
        if (city.trim()) params['destination'] = city.trim()
        if (type !== 'all') params['type'] = type
        if (ratingMin !== '' && Number.isFinite(ratingMin)) params['rating_min'] = ratingMin
        if (priceMin !== '' && Number.isFinite(priceMin)) params['budget_min'] = priceMin
        if (priceMax !== '' && Number.isFinite(priceMax)) params['budget_max'] = priceMax
        if (debouncedKeyword.trim()) params['q'] = debouncedKeyword.trim()

        // Products API is not uniform across services; we rely on FE-side fallback filtering too.
        const data = await apiClient<any>(`/api/products`, {
          query: params,
          cache: 'no-store',
          signal: controller.signal,
        })

        const list = (data?.products ?? data?.items ?? data?.data ?? []) as ProductLike[]
        const nextTotal = Number(data?.total ?? list.length)

        const keywordLower = debouncedKeyword.trim().toLowerCase()
        const filtered = keywordLower
          ? list.filter((p) => {
              const hay = `${p.name || ''} ${(p.location?.city || '')} ${(p.tags || []).join(' ')}`.toLowerCase()
              return hay.includes(keywordLower)
            })
          : list

        const tagFiltered =
          selectedTags.length > 0
            ? filtered.filter((p) => {
                const set = new Set(p.tags || [])
                return selectedTags.every((t) => set.has(t))
              })
            : filtered

        const priceFiltered =
          priceMin !== '' || priceMax !== ''
            ? tagFiltered.filter((p) => {
                const v = Number(p.price || 0)
                if (priceMin !== '' && v < Number(priceMin)) return false
                if (priceMax !== '' && v > Number(priceMax)) return false
                return true
              })
            : tagFiltered

        const ratingFiltered =
          ratingMin !== '' ? priceFiltered.filter((p) => Number(p.rating || 0) >= Number(ratingMin)) : priceFiltered

        if (!cancelled) {
          setProducts(ratingFiltered)
          setTotal(nextTotal)
          if (ratingFiltered.length && !selectedId) setSelectedId(String(ratingFiltered[0].id))
        }
      } catch (e: any) {
        if (cancelled) return
        toast.error(e?.message || '搜索失败')
        setProducts([])
        setTotal(0)
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }

    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [debouncedKeyword, type, city, ratingMin, priceMin, priceMax, selectedTags])

  const resetFilters = () => {
    setKeyword('')
    setType('all')
    setCity('')
    setPriceMin('')
    setPriceMax('')
    setRatingMin('')
    setSelectedTags([])
    setSelectedId(null)
  }

  const showList = viewMode === 'split' || viewMode === 'list'
  const showMap = viewMode === 'split' || viewMode === 'map'

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="card p-5 bg-white/80 border border-[#0ea5e9]/20 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-[280px] flex-1">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4 text-[#0ea5e9]" />
                  增强搜索
                </div>

                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 min-w-[220px]">
                    <input
                      className="input bg-white pl-10 pr-3 rounded-2xl border-[#0ea5e9]/10"
                      value={keyword}   // value?
                      onChange={(e) => {
                        setKeyword(e.target.value)
                      }}
                      placeholder="关键词：目的?产品/标签"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                    {keyword.trim() ? (
                      <div className="absolute z-[60] left-0 right-0 mt-2 rounded-2xl border border-border/60 bg-white shadow-lg overflow-hidden">
                        <div className="p-3 border-b border-border/60 text-xs text-muted-foreground">
                          {loadingSuggestions ? '联想中? : '搜索建议（点击添加标签筛选）'}
                        </div>
                        <div className="p-3 flex flex-wrap gap-2">
                          {(suggestions.length ? suggestions : []).slice(0, 10).map((t) => {
                            const active = selectedTags.includes(t)
                            return (
                              <button
                                type="button"
                                key={t}
                                className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
                                  active
                                    ? 'bg-[#0ea5e9]/15 border-[#0ea5e9]/30 text-[#0ea5e9]'
                                    : 'bg-white border-border/60 hover:border-[#0ea5e9]/30 text-foreground'
                                }`}
                                onClick={() => {
                                  setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                                }}
                              >
                                {t}
                              </button>
                            )
                          })}
                          {!loadingSuggestions && suggestions.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-1">暂无联想标签</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <select
                    className="input rounded-2xl sm:w-[180px]"
                    value={type}   // value?
                    onChange={(e) => setType(e.target.value)}
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  <select className="input rounded-2xl sm:w-[180px]" value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="">不限城市</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {hotTags.length ? (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-2">热门搜索标签</div>
                    <div className="flex flex-wrap gap-2">
                      {hotTags.slice(0, 10).map((t) => {
                        const active = selectedTags.includes(t)
                        return (
                          <button
                            type="button"
                            key={t}
                            className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
                              active ? 'bg-[#10b981]/15 border-[#10b981]/35 text-[#059669]' : 'bg-white border-border/60 hover:border-[#10b981]/35'
                            }`}
                            onClick={() => setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={resetFilters} className="btn btn-outline rounded-2xl">
                  重置
                </button>
                <div className="text-xs text-muted-foreground">
                  {loadingProducts ? '加载中? : `?${total} 条`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`btn btn-outline rounded-2xl ${viewMode === 'split' ? 'border-[#0ea5e9]/50' : ''}`}
                  >
                    地图+列表
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    className={`btn btn-outline rounded-2xl ${viewMode === 'map' ? 'border-[#0ea5e9]/50' : ''}`}
                  >
                    仅地?
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`btn btn-outline rounded-2xl ${viewMode === 'list' ? 'border-[#0ea5e9]/50' : ''}`}
                  >
                    仅列?
                  </button>
                </div>
              </div>
            </div>


            <div className="mt-5 pt-4 border-t border-border/60">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <SlidersHorizontal className="h-4 w-4 text-[#10b981]" />
                  高级筛?
                </div>

                <div className="flex gap-3 flex-wrap">
                  <div className="w-[180px]">
                    <div className="text-xs text-muted-foreground mb-1">价格下限</div>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="input rounded-2xl"
                      value={priceMin}   // value?
                      placeholder="0"
                      onChange={(e) => setPriceMin(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  <div className="w-[260px]">
                    <div className="text-xs text-muted-foreground mb-1">价格上限（滑块）</div>
                    <input
                      type="range"
                      min={0}
                      max={10000}
                      step={100}
                      value={priceMax === '' ? 5000 : priceMax}   // value?
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">当前：¥{priceMax === '' ? 5000 : priceMax}</div>
                  </div>

                  <div className="w-[180px]">
                    <div className="text-xs text-muted-foreground mb-1">评分（最低）</div>
                    <select
                      className="input rounded-2xl"
                      value={ratingMin === '' ? '' : String(ratingMin)}   // value?
                      onChange={(e) => setRatingMin(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <option value="">不限</option>
                      <option value="4.8">4.8+ 优质</option>
                      <option value="4.5">4.5+ 推荐</option>
                      <option value="4.2">4.2+ 好评</option>
                      <option value="4.0">4.0+ 及格</option>
                    </select>
                  </div>

                  <div className="w-full max-w-[520px]">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-[#10b981]" />
                      标签多?
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(allTags.length ? allTags : suggestions).slice(0, 14).map((t) => {
                        const active = selectedTags.includes(t)
                        return (
                          <button
                            type="button"
                            key={t}
                            onClick={() => {
                              setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                            }}
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition ${
                              active
                                ? 'bg-[#10b981]/15 border-[#10b981]/35 text-[#059669]'
                                : 'bg-white border-border/60 hover:border-[#10b981]/35'
                            }`}
                          >
                            <span className="inline-flex items-center gap-2">
                              {active ? <Check className="h-4 w-4 text-[#10b981]" /> : null}
                              {t}
                            </span>
                          </button>
                        )
                      })}
                      {selectedTags.length ? (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-full border border-red-200 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => setSelectedTags([])}
                        >
                          清空标签
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          <div className="mt-6 flex flex-col lg:flex-row gap-6 items-start">
            {showMap ? (
              <div className={`lg:flex-1 ${showList ? '' : 'w-full'}`}>
                <div className="text-sm font-semibold text-foreground mb-3">地图视图</div>
                <LeafletMap
                  products={products}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId(id)}
                  heightClass="h-[620px]"
                />
              </div>
            ) : null}

            {showList ? (
              <div className={`lg:w-[440px] w-full ${showMap ? '' : ''}`}>
                <div className="text-sm font-semibold text-foreground mb-3">结果列表</div>
                {loadingProducts ? (
                  <div className="rounded-2xl border border-border/60 bg-white/70 p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-xl bg-muted-foreground/10 animate-pulse" />
                    ))}
                  </div>
                ) : products.length ? (
                  <div className="rounded-2xl border border-border/60 bg-white/70 p-4">
                    <ProductResultsList products={products} selectedId={selectedId} onSelect={setSelectedId} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-white/70 p-10 text-center text-muted-foreground">
                    暂无符合条件的结果。你可以放宽价格/评分/标签筛选?
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

