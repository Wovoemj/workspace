'use client'

/**
 * =====================================================
 * 产品卡片组件 (ProductCard)
 * =====================================================
 * 
 * 功能说明：
 * - 展示旅游产品（机票、酒店、门票、体验）信息
 * - 根据产品类型显示不同的图标和标签
 * - 支持特色产品高亮显示
 * - 显示价格、评分、标签等信息
 * 
 * 产品类型：
 * - flight: 机票
 * - hotel: 酒店
 * - ticket: 门票
 * - experience: 当地体验
 */

import { useState } from 'react'
import { Hotel, Plane, Star, Ticket, Theater, MapPin } from 'lucide-react'
import { Product } from '@/types'
import { formatRating, shouldShowRating } from '@/lib/display'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'

/** 产品卡片属性接口 */
interface ProductCardProps {
  product: Product
  onClick?: () => void
  className?: string
  variant?: 'default' | 'featured'
}

/**
 * 产品卡片主组件
 * @description 展示旅游产品信息的卡片组件
 * @param props - 组件属性
 * @param props.product - 产品数据
 * @param props.onClick - 点击回调（可选）
 * @param props.className - 自定义样式
 * @param props.variant - 变体类型：default | featured
 */
export function ProductCard({ product, onClick, className = '', variant = 'default' }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const formatPrice = (price: number) => `¥${price.toLocaleString()}`

  const getTypeMeta = (type: Product['type']) => {
    switch (type) {
      case 'flight':
        return { icon: Plane, label: '机票' }
      case 'hotel':
        return { icon: Hotel, label: '酒店' }
      case 'ticket':
        return { icon: Ticket, label: '门票' }
      case 'experience':
        return { icon: Theater, label: '当地体验' }
      default:
        return { icon: MapPin, label: '产品' }
    }
  }

  const getImageSrc = (p: Product) => {
    // 优先使用 images[0]，其次用 cover_image
    const img = (p.images && p.images.length > 0) ? p.images[0] : p.cover_image || null
    return resolveCoverSrc(img)
  }

  const typeMeta = getTypeMeta(product.type)
  const clickable = typeof onClick === 'function'
  const isFeatured = variant === 'featured'
  const rootClass = [
    'bg-card text-foreground border border-border rounded-2xl shadow-sm overflow-hidden transition-all',
    'hover:shadow-md hover:-translate-y-1',
    clickable ? 'cursor-pointer' : 'cursor-default',
    isFeatured ? 'ring-1 ring-primary/15' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      onClick={onClick}
    >
      <div className={`relative ${isFeatured ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
        <div
          className={`absolute inset-0 bg-gradient-to-br from-muted to-muted/60 dark:from-slate-800 dark:to-slate-900 animate-pulse transition-opacity duration-300 ${
            imgLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-hidden
        />

        <img
          src={getImageSrc(product)}
          alt={product.name}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            onImgErrorUseFallback(e)
            setImgLoaded(true)
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

        <div className="absolute left-3 top-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-white/95 backdrop-blur-sm">
            {(() => {
              const Icon = typeMeta.icon
              return <Icon className="h-4 w-4" />
            })()}
            <span className="text-xs font-semibold">{typeMeta.label}</span>
          </div>
        </div>

        {product.inventory === 0 && product.status === 'sold_out' && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-white font-bold text-lg">已售罄</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`font-bold truncate ${isFeatured ? 'text-base' : 'text-[15px]'}`}>{product.name}</h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{product.location?.city || product.city || product.subtitle?.replace('推荐', '') || '未知'}</span>
            </div>
          </div>

          <div className="text-right">
            <div className={`font-extrabold text-primary ${isFeatured ? 'text-xl' : 'text-lg'}`}>
              <span className="text-xs font-semibold text-muted-foreground mr-1.5">{typeMeta.label}</span>
              {formatPrice(product.price)}
            </div>
            {product.original_price && product.original_price > product.price ? (
              <div className="text-xs text-muted-foreground line-through">
                ¥{product.original_price.toLocaleString()}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          {shouldShowRating(product.rating) ? (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="font-semibold">{formatRating(product.rating)}</span>
              {Number(product.review_count ?? 0) > 0 ? (
                <span className="text-muted-foreground text-xs">（{Number(product.review_count).toLocaleString()}条评价）</span>
              ) : null}
            </div>
          ) : (
            <div />
          )}
        </div>

        {product.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
