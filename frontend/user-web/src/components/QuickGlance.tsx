'use client'

/**
 * =====================================================
 * 快速浏览清单组件 (QuickGlance)
 * =====================================================
 * 
 * 功能说明：
 * - 目的地必看清单展示组件
 * - 网格布局展示多个景点/活动
 * - 每个条目包含图标、标题和描述
 * - 支持多种图标类型和渐变色组合
 * 
 * 图标类型：
 * - star: 星星（默认）
 * - gem: 宝石
 * - crown: 皇冠
 * - award: 奖项
 * - eye: 眼睛
 * - history: 历史
 */

import React from 'react'
import { Star, Gem, Crown, Award, Eye, History, Sparkles } from 'lucide-react'

/** 快速浏览条目类型 */
interface QuickGlanceItem {
  id: string | number
  title: string
  description: string
  icon?: 'star' | 'gem' | 'crown' | 'award' | 'eye' | 'history'
}

interface QuickGlanceProps {
  title?: string
  items: QuickGlanceItem[]
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  gem: Gem,
  crown: Crown,
  award: Award,
  eye: Eye,
  history: History,
}

// 渐变色组合
const gradients = [
  'from-amber-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-green-400 to-emerald-500',
  'from-pink-400 to-rose-500',
  'from-purple-400 to-violet-500',
  'from-cyan-400 to-teal-500',
]

/**
 * 快速浏览清单组件
 * @description 展示景点必看清单的网格卡片组件
 * @param props - 组件属性
 * @param props.title - 标题（默认：必看清单）
 * @param props.items - 条目列表
 */
export default function QuickGlance({ title = '必看清单', items }: QuickGlanceProps) {
  return (
    <div className="card overflow-hidden mt-6">
      {/* 标题栏 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-white" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, index) => {
            const Icon = iconMap[item.icon || 'star'] || Star
            const gradient = gradients[index % gradients.length]
            
            return (
              <div 
                key={item.id} 
                className="group relative bg-white border border-gray-100 rounded-xl p-4 hover:shadow-lg hover:border-primary-200 transition-all duration-300 cursor-pointer"
              >
                {/* 背景装饰 */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full transition-opacity group-hover:opacity-20`} />
                
                <div className="flex items-start gap-4">
                  {/* 图标 */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    {Icon && <Icon className="w-6 h-6 text-white" />}
                  </div>
                  
                  {/* 文字内容 */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
