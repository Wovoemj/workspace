'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, Drama, Hotel, MapPin, Plane, Search, Star, Ticket } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProductCard } from '@/components/ProductCard'
import type { Product } from '@/types'
import { formatRating, shouldShowRating } from '@/lib/display'
import { apiMediaUrl, FALLBACK_MEDIA_PATH, onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'

type Destination = {
  id: number
  name: string
  city: string
  province: string
  description?: string
  cover_image?: string
  rating?: number
  ticket_price?: number
}

function formatDestinationTicket(d: Destination) {
  const v = typeof d.ticket_price === 'number' ? d.ticket_price : NaN
  if (Number.isFinite(v) && v > 0) return `¥${Number(v).toLocaleString()}起`
  if (Number.isFinite(v) && v === 0) return '免费'
  return '价格待补充'
}

function HomeDestinationCarouselCard({ d, coverSrc, ticketLabel }: { d: Destination; coverSrc: string; ticketLabel: string }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  return (
    <Link href={`/destinations/${d.id}`} className="snap-start min-w-[220px] md:min-w-[240px]">
      <div className="group rounded-2xl border border-white/15 bg-white/60 backdrop-blur-md hover:bg-white/80 transition-all overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 will-change-transform">
        <div className="relative h-44 sm:h-48">
          <div
            className={`absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse transition-opacity duration-300 ${
              imgLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            aria-hidden
          />

          <img
            src={coverSrc}
            alt={`${d.name}风景`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              onImgErrorUseFallback(e)
              setImgLoaded(true)
            }}
          />

          <div className="absolute top-2 left-2 flex gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white backdrop-blur-sm">必玩推荐</span>
          </div>

          {shouldShowRating(d.rating) ? (
            <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/20 px-2 py-1 rounded-full text-white shadow-lg">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-bold text-white drop-shadow-sm">{formatRating(d.rating)}</span>
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-white/70 shrink-0" />
              <span className="text-white/80 text-[11px] truncate">{d.city} · {d.province}</span>
            </div>
          </div>
        </div>
        <div className="p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800 truncate">{d.name}</h3>
            <span className="text-xs font-bold text-orange-500 shrink-0">{ticketLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const router = useRouter()

  const [keyword, setKeyword] = useState('')
  const [popularDestinations, setPopularDestinations] = useState<Destination[]>([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  const getDestinationCoverSrc = (d: Destination) => {
    return resolveCoverSrc(d.cover_image)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      setPopularLoading(true)
      try {
        const res = await fetch(`/api/destinations?per_page=12&page=1`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const list = (data?.destinations ?? data?.items ?? data?.data ?? []) as Destination[]
        if (!cancelled) setPopularDestinations(list)
      } catch {
        if (!cancelled) setPopularDestinations([])
      } finally {
        if (!cancelled) setPopularLoading(false)
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
      setProductsLoading(true)
      try {
        const res = await fetch(`/api/products?status=active&sort=rating&limit=8`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const list = (data?.products ?? data?.items ?? data?.data ?? []) as Product[]
        if (!cancelled) setProducts(list)
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(
    () => [
      { type: 'flight' as const, label: '机票', Icon: Plane, hint: '直达省心' },
      { type: 'hotel' as const, label: '酒店', Icon: Hotel, hint: '舒适住宿' },
      { type: 'ticket' as const, label: '门票', Icon: Ticket, hint: '热门景点' },
      { type: 'experience' as const, label: '当地体验', Icon: Drama, hint: '沉浸玩法' },
    ],
    [],
  )

  const features = useMemo(
    () => [
      {
        icon: '🌐',
        title: '永久免费 · 开源共享',
        desc: '完全开源，社区驱动，无隐藏费用，无功能限制，真正的旅行助手为每个人服务 ✨',
        color: '#10b981',
        cta: '了解开源',
        href: '/about',
      },
      {
        icon: '🤖',
        title: 'AI 驱动 · 智能规划',
        desc: '基于大模型的行程规划与个性化推荐，让旅行更轻松愉快，发现更多惊喜 ✨',
        color: '#8b5cf6',
        cta: '开始规划',
        href: '/assistant',
      },
      {
        icon: '🔒',
        title: '隐私保护 · 数据本地化',
        desc: '优先本地化存储与最小化采集，你的旅行数据只属于你，安心使用，放心探索 🛡️',
        color: '#3b82f6',
        cta: '查看隐私',
        href: '/privacy',
      },
    ],
    [],
  )

  const handleHeroSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = keyword.trim()
    router.push(`/destinations?keyword=${encodeURIComponent(q)}`)
  }

  const scrollByAmount = (dir: -1 | 1) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 520, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c4a6e] via-[#0284c7]/5 to-white">
      <Navbar />

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c4a6e] via-[#0369a1] via-[#0284c7]/70 via-[#38bdf8]/40 to-white" />

          <div className="hero-stars" />

          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
          <div className="hero-glow hero-glow-3" />
          <div className="hero-glow hero-glow-4" />
          <div className="hero-glow hero-glow-5" />

          <div className="hero-light-band" />

          <div className="hero-waves absolute bottom-0 left-0 right-0">
            <svg className="hero-wave hero-wave-1" viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path d="M0,80 C360,120 720,40 1080,80 C1260,100 1380,60 1440,80 L1440,120 L0,120 Z" fill="rgba(3,105,161,0.12)" />
            </svg>
            <svg className="hero-wave hero-wave-2" viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path d="M0,60 C240,100 480,40 720,70 C960,100 1200,30 1440,60 L1440,120 L0,120 Z" fill="rgba(2,132,199,0.08)" />
            </svg>
            <svg className="hero-wave hero-wave-3" viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path d="M0,90 C480,60 960,100 1440,70 L1440,120 L0,120 Z" fill="rgba(14,165,233,0.06)" />
            </svg>
          </div>

          <div className="absolute inset-0 hero-content-safe" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="w-full">
              <div className="text-center">
                <p className="text-xs md:text-sm tracking-[0.3em] uppercase text-white/50 font-light mb-2 hero-subtitle-reveal">
                  Discover Your Next Adventure
                </p>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white hero-title-glow">
                  发现你的
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#fcd34d]">
                    {' '}
                    完美旅程
                  </span>
                </h1>
                <p className="mt-2 text-sm md:text-base text-white/65 max-w-xl mx-auto">
                  热门目的地 + 精选产品，一站式为你把行程安排得明明白白
                </p>
              </div>

              <div className="mt-4 max-w-3xl mx-auto">
                <form
                  onSubmit={handleHeroSubmit}
                  className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 rounded-2xl bg-white/85 backdrop-blur-md border border-white/40 shadow-lg shadow-black/10 px-3 py-3"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="inline-flex items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 p-2 shrink-0">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="目的地关键词搜索（如：成都、海鲜、亲子…）"
                      className="w-full bg-transparent outline-none text-sm md:text-base text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => router.push('/search')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white transition-colors"
                    >
                      <CalendarDays className="h-4 w-4" />
                      选择出行日期
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-sm md:text-base shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-md shadow-amber-500/25 hover:shadow-lg hover:brightness-110 transition-all active:scale-[0.98]"
                    >
                      搜索
                    </button>
                  </div>
                </form>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {['川西环线', '亲子酒店', '避暑胜地', '海岛度假', '古镇美食', '雪山徒步'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { setKeyword(tag); router.push(`/destinations?keyword=${encodeURIComponent(tag)}`) }}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-amber-200/80 bg-white/8 border border-white/10 hover:bg-white/15 hover:text-amber-100 transition-all backdrop-blur-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/50">
                  <Link href="/destinations" className="hover:text-white/80 transition-colors">
                    浏览全部目的地
                  </Link>
                  <span className="hidden sm:inline">·</span>
                  <Link href="/search" className="hover:text-white/80 transition-colors">
                    高级搜索与地图
                  </Link>
                </div>
              </div>

              <div className="mt-10">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white/90">热门目的地</h2>
                    <p className="text-sm text-white/60 mt-1">滑动选择，马上发现相似产品</p>
                  </div>
                  <Link
                    href="/destinations"
                    className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                    aria-label="探索更多目的地"
                  >
                    探索更多 <span aria-hidden>→</span>
                  </Link>
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollByAmount(-1)}
                      className="h-10 w-10 rounded-full bg-card border border-border/70 hover:bg-card/90 flex items-center justify-center"
                      aria-label="向左"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollByAmount(1)}
                      className="h-10 w-10 rounded-full bg-card border border-border/70 hover:bg-card/90 flex items-center justify-center"
                      aria-label="向右"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {popularLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="snap-start min-w-[240px] md:min-w-[260px] rounded-2xl bg-card border border-border/70 p-3 animate-pulse"
                        >
                          <div className="h-36 sm:aspect-[16/10] sm:h-auto rounded-xl bg-muted-foreground/10" />
                          <div className="mt-3 h-4 bg-muted-foreground/10 rounded w-2/3" />
                          <div className="mt-2 h-3 bg-muted-foreground/10 rounded w-1/2" />
                        </div>
                      ))
                    ) : popularDestinations.length ? (
                      popularDestinations.map((d) => (
                        <HomeDestinationCarouselCard
                          key={d.id}
                          d={d}
                          coverSrc={getDestinationCoverSrc(d)}
                          ticketLabel={formatDestinationTicket(d)}
                        />
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">暂无数据</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 bg-slate-50/70 dark:bg-slate-950/40 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">核心特色</h2>
              <p className="text-sm md:text-base text-muted-foreground mt-2">为什么选择智旅助手</p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border/60 bg-card dark:bg-slate-900/60 dark:border-border/80 shadow-sm hover:shadow-md dark:shadow-black/30 transition-shadow overflow-hidden"
                >
                  <div
                    className="h-1.5 dark:brightness-125 dark:shadow-[0_0_24px_rgba(0,0,0,0.35)]"
                    style={{ backgroundColor: f.color }}
                  />
                  <div className="p-6">
                    <div className="text-3xl mb-3" aria-hidden>
                      {f.icon}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>

                    <div className="mt-5">
                      <Link
                        href={f.href}
                        className="inline-flex items-center justify-center text-sm font-semibold text-white px-4 py-2 rounded-xl transition-opacity hover:opacity-90 dark:brightness-110 dark:ring-1 dark:ring-white/15"
                        style={{ backgroundColor: f.color }}
                      >
                        {f.cta}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-10">
          <div className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold">快速入口</h2>
                <p className="text-sm text-muted-foreground mt-1">一键直达常用功能</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {categories.map(({ type, label, Icon, hint }) => (
                <Link
                  key={type}
                  href={`/destinations?type=${type}`}
                  className="group rounded-2xl border border-border/60 bg-gradient-to-b from-primary/5 to-transparent hover:shadow-md transition-all p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-foreground truncate">{label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1 w-10 rounded-full bg-primary/20 group-hover:bg-primary/35 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-foreground">精选推荐产品</h2>
              <p className="text-sm text-muted-foreground mt-1">按用户评分与口碑精选，未登录也可浏览</p>
            </div>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-card border border-border/60 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-muted-foreground/10" />
                  <div className="p-4">
                    <div className="h-4 bg-muted-foreground/10 rounded w-2/3" />
                    <div className="mt-2 h-3 bg-muted-foreground/10 rounded w-1/2" />
                    <div className="mt-4 h-6 bg-muted-foreground/10 rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-muted-foreground">暂无推荐产品</div>
          )}
        </section>
      </main>

      <Footer />

      <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2">
        <div className="hidden sm:block px-3 py-2 rounded-2xl rounded-br-sm bg-white shadow-lg shadow-black/10 border border-gray-100 text-xs text-gray-600 font-medium max-w-[160px] ai-bubble-fade">
          Hi，想去哪儿？我帮你安排 ✈️
        </div>
        <Link
          href="/assistant"
          aria-label="AI 助手"
          title="AI 助手"
          className="ai-assistant-bubble group flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 backdrop-blur hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <span className="text-white text-xl drop-shadow-sm">🤖</span>
        </Link>
      </div>
    </div>
  )
}