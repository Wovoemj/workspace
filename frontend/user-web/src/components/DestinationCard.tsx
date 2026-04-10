'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import { formatRating, shouldShowRating } from '@/lib/display'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'
import { deriveDestinationTags } from '@/lib/destinationTags'

export type DestinationCardItem = {
  id: number
  name: string
  city: string
  province: string
  description?: string
  cover_image?: string
  rating?: number
}

interface DestinationCardProps {
  destination: DestinationCardItem
  className?: string
  /** 移动端压缩图片高度（tailwind class?*/
  imageHeightClass?: string
}

export function DestinationCard({ destination: d, className = '', imageHeightClass }: DestinationCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const src = resolveCoverSrc(d.cover_image)
  const tags = deriveDestinationTags(d.name, d.description)

  const imgWrap = imageHeightClass
    ? `relative w-full ${imageHeightClass} sm:h-auto sm:aspect-[4/3]`
    : 'relative w-full aspect-[4/3]'

  return (
    <Link href={`/destinations/${d.id}`} className={`group block h-full ${className}`}>
      <div className="h-full rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        <div className={imgWrap}>
          <div
            className={`absolute inset-0 bg-gradient-to-br from-muted to-muted/60 dark:from-slate-800 dark:to-slate-900 animate-pulse transition-opacity duration-300 ${
              imgLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            aria-hidden
          />

          <img
            src={src}
            alt={`${d.name}风景`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              onImgErrorUseFallback(e)
              setImgLoaded(true)
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="text-white font-bold text-base leading-snug line-clamp-2">{d.name}</div>
                <div className="mt-0.5 flex items-center gap-1 text-white/85 text-xs">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {d.city} · {d.province}
                  </span>
                </div>
              </div>
              {shouldShowRating(d.rating) ? (
                <div className="inline-flex items-center gap-1 bg-white/12 border border-white/20 px-2 py-1 rounded-full text-white shrink-0">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-semibold">{formatRating(d.rating)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-4">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {d.description?.trim() || '发现这座城市的独特风景与旅行灵感'}
          </p>
          <div className="mt-3 text-xs font-semibold text-primary group-hover:underline">探索这座城市</div>
        </div>
      </div>
    </Link>
  )
}
