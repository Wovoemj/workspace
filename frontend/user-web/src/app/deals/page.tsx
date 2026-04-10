'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Heart, Tag, Timer, Flame, ArrowRight, Percent } from 'lucide-react'
import type { Product } from '@/types'
import { ProductCard } from '@/components/ProductCard'

export default function DealsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // 简易倒计时：本地每天 24:00 截止（演示用，后续可接后端活动配置）
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const endsAt = useMemo(() => {
    const d = new Date(now)
    d.setHours(24, 0, 0, 0)
    return d.getTime()
  }, [now])

  const leftMs = Math.max(0, endsAt - now)
  const hh = Math.floor(leftMs / 3600000)
  const mm = Math.floor((leftMs % 3600000) / 60000)
  const ss = Math.floor((leftMs % 60000) / 1000)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/products?status=active&sort=rating&limit=12&offset=0', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const list = (data?.products ?? data?.items ?? data?.data ?? []) as Product[]
        if (!cancelled) setProducts(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dealProducts = useMemo(() => {
    // 规则：有原价且更?=> 真折扣；否则给一个“活动价”展示（不改后端真实价格?
    return products
      .map((p) => {
        const original = typeof p.original_price === 'number' ? p.original_price : null
        const hasDiscount = typeof original === 'number' && original > p.price
        const discountPct = hasDiscount ? Math.max(1, Math.min(99, Math.round((1 - p.price / original) * 100))) : null
        return { p, hasDiscount, discountPct }
      })
      .sort((a, b) => {
        // 折扣优先，其次评?
        if (a.hasDiscount !== b.hasDiscount) return a.hasDiscount ? -1 : 1
        return (b.p.rating ?? 0) - (a.p.rating ?? 0)
      })
  }, [products])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-indigo-100">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-3xl border border-border/60 bg-white/80 backdrop-blur p-7 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-coral-500 to-coral-600 text-white flex items-center justify-center shadow-md">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">限时优惠</h1>
                    <p className="text-sm text-muted-foreground mt-1">每天更新 · 热门产品活动?· 先到先得</p>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-coral-200/60 bg-coral-50/80 px-4 py-2 text-sm font-semibold text-coral-700">
                  <Timer className="h-4 w-4" />
                  本场截止：{String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/destinations" className="btn btn-primary">
                  <Tag className="h-4 w-4" />
                  <span className="ml-2">去逛目的地</span>
                </Link>
                <Link href="/assistant" className="btn btn-outline">
                  去做行程规划 <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-600" />
                <h2 className="text-lg font-extrabold text-foreground">今日热卖</h2>
                <span className="text-sm text-muted-foreground">（优先展示有原价折扣的商品）</span>
              </div>
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Percent className="h-4 w-4" />
                折扣仅为演示展示，后续可接真实活?
              </div>
            </div>

            {loading ? (
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
            ) : dealProducts.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {dealProducts.map(({ p, hasDiscount, discountPct }) => (
                  <div key={p.id} className="relative">
                    {hasDiscount && discountPct ? (
                      <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-coral-600 to-coral-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-md">
                        <Flame className="h-3.5 w-3.5" />
                        直降 {discountPct}%
                      </div>
                    ) : (
                      <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                        今日特惠
                      </div>
                    )}
                    <Link href={`/products/${p.id}`} className="block">
                      <ProductCard product={p} />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-muted-foreground">
                暂无优惠数据。请确认后端 `/api/products` 可用?
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

