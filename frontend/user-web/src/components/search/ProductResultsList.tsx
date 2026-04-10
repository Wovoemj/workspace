'use client'

import Link from 'next/link'
import { Star, MapPin, Plane, Hotel, Ticket, Theater } from 'lucide-react'
import { formatRating, shouldShowRating } from '@/lib/display'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'

type ProductLike = {
  id: string | number
  type?: string
  name?: string
  price?: number
  rating?: number
  review_count?: number
  tags?: string[]
  images?: string[]
  location?: any
}

function formatPrice(v?: number) {
  return `¥${Number(v || 0).toLocaleString()}`
}

function getTypeMeta(type?: string) {
  switch (type) {
    case 'flight':
      return { label: '机票', Icon: Plane }
    case 'hotel':
      return { label: '酒店', Icon: Hotel }
    case 'ticket':
      return { label: '门票', Icon: Ticket }
    case 'experience':
      return { label: '当地体验', Icon: Theater }
    default:
      return { label: '产品', Icon: Ticket }
  }
}

function getCoverSrc(p: ProductLike) {
  const img = p.images?.[0]
  return resolveCoverSrc(img || null)
}

type Props = {
  products: ProductLike[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ProductResultsList({ products, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {products.map((p) => {
        const id = String(p.id)
        const active = selectedId === id
        const city = p.location?.city || ''
        const province = p.location?.province || ''
        const typeMeta = getTypeMeta(p.type)

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`group w-full text-left rounded-2xl border transition overflow-hidden bg-card/80 backdrop-blur ${
              active
                ? 'border-primary/50 shadow-sm ring-1 ring-primary/15'
                : 'border-border/60 hover:border-primary/25 hover:shadow-sm'
            }`}
            aria-label={`选择结果?{p.name || '产品'}`}
          >
            <div className="flex gap-3 p-3">
              <div className="relative w-28 h-[86px] shrink-0 rounded-xl overflow-hidden bg-muted-foreground/10">

                <img
                  src={getCoverSrc(p)}
                  alt={p.name || '产品'}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  onError={onImgErrorUseFallback}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-2 py-1 text-white/95 backdrop-blur-sm">
                  <typeMeta.Icon className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-semibold">{typeMeta.label}</span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold text-foreground truncate">{p.name || '产品'}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{[city, province].filter(Boolean).join(' · ') || '地区未知'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-primary">
                      <span className="text-[11px] font-semibold text-muted-foreground mr-1">{typeMeta.label}</span>
                      {formatPrice(p.price)}?
                    </div>
                    {shouldShowRating(p.rating) ? (
                      <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-semibold">{formatRating(p.rating)}</span>
                        {Number(p.review_count || 0) > 0 ? (
                          <span className="text-muted-foreground">（{Number(p.review_count || 0).toLocaleString()}?/span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {Array.isArray(p.tags) && p.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-xs rounded-full border border-[#10b981]/25 bg-[#10b981]/10 text-[#059669] px-2 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    点击选择以更新地图定?
                  </div>
                  <Link
                    href={`/products/${id}`}
                    className="text-xs font-semibold text-primary hover:underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    打开详情 ?
                  </Link>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

