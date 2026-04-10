'use client'

import { MapPin, Star, Clock, Ticket } from 'lucide-react'
import { resolveCoverSrc, onImgErrorUseFallback } from '@/lib/media'
import { formatPriceStart, formatRating, shouldShowRating } from '@/lib/display'

interface HeroCardProps {
  name: string
  city: string
  province: string
  rating?: number
  openTime?: string
  ticketPrice?: number
  coverImage?: string
  tags?: string[]
}

export default function HeroCard({
  name,
  city,
  province,
  rating,
  openTime,
  ticketPrice,
  coverImage,
  tags = []
}: HeroCardProps) {
  const priceText = ticketPrice !== undefined ? formatPriceStart(ticketPrice) : '免费'
  const showRating = shouldShowRating(rating)
  const ratingText = rating !== undefined ? formatRating(rating) : '--'

  return (
    <div className="card overflow-hidden">

      <div className="relative h-64 bg-gradient-to-r from-primary-900 to-primary-700">

        <img
          src={resolveCoverSrc(coverImage)}
          alt={`${name}风景`}
          className="w-full h-full object-cover opacity-60"
          onError={onImgErrorUseFallback}
        />


        <div className="absolute top-4 left-4 flex gap-2">
          {tags.map((tag, idx) => (
            <span key={idx} className="tag-primary">
              {tag}
            </span>
          ))}
          <span className="price-tag bg-warning text-white text-xs font-bold px-2 py-1 rounded">
            {priceText}
          </span>
        </div>


        {showRating && (
          <div className="absolute top-4 right-4 rating bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="font-semibold text-gray-900">{ratingText}</span>
          </div>
        )}


        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <h1 className="text-display text-white mb-2">{name}</h1>
          <p className="text-body text-white/80 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {city} · {province}
          </p>
        </div>
      </div>


      <div className="grid grid-cols-3 divide-x divide-gray-100 p-4">
        <div className="text-center">
          <p className="text-tiny text-gray-500 mb-1">开放时间</p>
          <p className="text-small font-semibold text-gray-900">
            {openTime || '09:00-17:00'}
          </p>
          {openTime?.includes('周一闭馆') || (
            <p className="text-tiny text-error">周一闭馆</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-tiny text-gray-500 mb-1">门票价格</p>
          <p className="text-small font-semibold text-gray-900">{priceText}</p>
          <p className="text-tiny text-gray-500">实时更新</p>
        </div>
        <div className="text-center">
          <p className="text-tiny text-gray-500 mb-1">建议时长</p>
          <p className="text-small font-semibold text-gray-900">2-3小时</p>
          <p className="text-tiny text-gray-500">深度游览</p>
        </div>
      </div>
    </div>
  )
}
