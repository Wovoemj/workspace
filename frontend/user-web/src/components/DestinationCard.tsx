'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import { formatRating, shouldShowRating } from '@/lib/display'
import { resolveCoverSrc } from '@/lib/media'
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
  /** 移动端压缩图片高度（tailwind class */
  imageHeightClass?: string
  /** 是否首屏优先加载 */
  priority?: boolean
}

// 生成图片的响应式 srcset
function generateSrcSet(baseSrc: string): string {
  if (!baseSrc || baseSrc.startsWith('data:') || baseSrc.includes('placeholder')) {
    return ''
  }
  
  // 支持的尺寸
  const widths = [320, 480, 640, 800, 1200]
  
  return widths
    .map(w => {
      // 如果图片路径包含查询参数，尝试修改它
      if (baseSrc.includes('?')) {
        return `${baseSrc}&w=${w} ${w}w`
      }
      // 否则添加参数
      return `${baseSrc}?w=${w} ${w}w`
    })
    .join(', ')
}

export function DestinationCard({ 
  destination: d, 
  className = '', 
  imageHeightClass,
  priority = false
}: DestinationCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const src = resolveCoverSrc(d.cover_image)
  const tags = deriveDestinationTags(d.name, d.description)

  const imgWrap = imageHeightClass
    ? `relative w-full ${imageHeightClass} sm:h-auto sm:aspect-[4/3]`
    : 'relative w-full aspect-[4/3]'

  // 生成响应式图片配置
  const { optimizedSrc, srcSet } = useMemo(() => {
    return {
      optimizedSrc: hasError ? '/images/placeholder.jpg' : src,
      srcSet: generateSrcSet(src)
    }
  }, [src, hasError])

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
    }
  }

  return (
    <Link href={`/destinations/${d.id}`} className={`group block h-full ${className}`}>
      <div className="h-full rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        <div className={imgWrap}>
          {/* 骨架屏占位 */}
          <div
            className={`absolute inset-0 bg-gradient-to-br from-muted to-muted/60 dark:from-slate-800 dark:to-slate-900 animate-pulse transition-opacity duration-300 ${
              imgLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            aria-hidden
          />

          {/* 优化后的图片 */}
          <img
            src={optimizedSrc}
            srcSet={srcSet || undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            alt={`${d.name}风景`}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            onLoad={() => setImgLoaded(true)}
            onError={handleError}
          />
          
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* 信息覆盖层 */}
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
            {d.description?.replace(/\[citation:\d+\]/g, '').trim() || '发现这座城市的独特风景与旅行灵感'}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-primary group-hover:underline">探索这座城市</span>
            <Link 
              href={`/destinations/map?city=${encodeURIComponent(d.city)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              地图查看
            </Link>
          </div>
        </div>
      </div>
    </Link>
  )
}
