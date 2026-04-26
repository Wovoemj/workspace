'use client'

/**
 * =====================================================
 * 英雄卡片组件 (HeroCard)
 * =====================================================
 * 
 * 功能说明：
 * - 目的地详情页顶部大图展示组件
 * - 显示景点主图、名称、位置、评分
 * - 底部信息栏：开放时间、门票价格、建议游览时长
 * 
 * 设计特点：
 * - 大尺寸背景图 + 渐变遮罩
 * - 半透明标签展示景点属性
 * - 三栏信息布局
 */

import { MapPin, Star, Clock, Ticket, Sparkles, Info } from 'lucide-react'
import { resolveCoverSrc, onImgErrorUseFallback } from '@/lib/media'
import { formatPriceStart, formatRating, shouldShowRating } from '@/lib/display'

/** 英雄卡片属性接口 */
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

/**
 * 英雄卡片主组件
 * @description 目的地详情页顶部大卡片，展示景点主图和信息
 */
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
  const priceText = ticketPrice !== undefined && ticketPrice > 0 ? formatPriceStart(ticketPrice) : '免费'
  const showRating = shouldShowRating(rating)
  const ratingText = rating !== undefined ? formatRating(rating) : '--'

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg">
      {/* 主图区域 */}
      <div className="relative h-72 md:h-80 bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400">
        <img
          src={resolveCoverSrc(coverImage)}
          alt={`${name}风景`}
          className="w-full h-full object-cover"
          onError={onImgErrorUseFallback}
        />
        
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* 顶部标签区 */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <span 
                key={idx} 
                className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium border border-white/30"
              >
                {tag}
              </span>
            ))}
          </div>
          
          {/* 评分 */}
          {showRating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-md">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-gray-900">{ratingText}</span>
            </div>
          )}
        </div>

        {/* 底部信息区 */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            {name}
          </h1>
          <div className="flex items-center gap-2 text-white/90">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{city} · {province}</span>
          </div>
        </div>
      </div>

      {/* 底部信息栏 */}
      <div className="bg-white border-t border-gray-100">
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {/* 开放时间 */}
          <div className="p-4 text-center hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">开放时间</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {openTime || '09:00-17:00'}
            </p>
            {openTime?.includes('周一闭馆') ? (
              <p className="text-xs text-orange-500 mt-0.5">周一闭馆</p>
            ) : (
              <p className="text-xs text-green-500 mt-0.5">正常开放</p>
            )}
          </div>
          
          {/* 门票价格 */}
          <div className="p-4 text-center bg-primary-50/50 hover:bg-primary-50 transition-colors">
            <div className="flex items-center justify-center gap-1.5 text-primary-600 mb-1">
              <Ticket className="w-4 h-4" />
              <span className="text-xs">门票价格</span>
            </div>
            <p className="text-lg font-bold text-primary">{priceText}</p>
            <p className="text-xs text-gray-500">实时更新</p>
          </div>
          
          {/* 建议时长 */}
          <div className="p-4 text-center hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs">建议时长</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">2-3小时</p>
            <p className="text-xs text-gray-500">深度游览</p>
          </div>
        </div>
      </div>
    </div>
  )
}
