'use client'

/**
 * =====================================================
 * 时间轴组件 (Timeline)
 * =====================================================
 * 
 * 功能说明：
 * - 一日游/行程时间轴展示组件
 * - 按时间段（上午、下午、晚上等）展示活动安排
 * - 每个时间段显示图标、时间标签、标题、描述和标签
 * 
 * 时间段图标映射：
 * - 上午/清晨 → Sun
 * - 中午 → Clock
 * - 下午 → Clock
 * - 傍晚 → Sunset
 * - 晚上/夜间 → Moon
 */

import { Clock, Sun, Sunset, Moon } from 'lucide-react'

/** 时间轴单个条目类型 */
interface TimelineItem {
  id: string | number
  timeLabel: string
  title: string
  description: string
  tags?: string[]
}

interface TimelineProps {
  title?: string
  items: TimelineItem[]
}

const timeIcons: Record<string, string> = {
  '上午': 'from-amber-400 to-yellow-500',
  '中午': 'from-orange-400 to-red-500',
  '下午': 'from-blue-400 to-indigo-500',
  '傍晚': 'from-purple-400 to-pink-500',
  '晚上': 'from-indigo-400 to-purple-600',
}

const getTimeIcon = (label: string) => {
  if (label.includes('上') || label.includes('晨')) return Sun
  if (label.includes('午') || label.includes('中')) return Clock
  if (label.includes('午') && label.includes('下')) return Clock
  if (label.includes('午') && !label.includes('上')) return Sunset
  if (label.includes('晚') || label.includes('夜')) return Moon
  return Clock
}

/**
 * 时间轴组件
 * @description 按时间段展示行程活动的时间轴组件
 * @param props - 组件属性
 * @param props.title - 标题（默认：一日游时间轴）
 * @param props.items - 时间轴条目列表
 */
export default function Timeline({ title = '一日游时间轴', items }: TimelineProps) {
  return (
    <div className="card overflow-hidden mt-6">
      {/* 标题栏 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-white" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
      </div>
      
      {/* 时间轴内容 */}
      <div className="p-6">
        <div className="relative">
          {/* 连接线 */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-300 via-primary-400 to-primary-300" />

          {items.map((item, index) => {
            const TimeIcon = getTimeIcon(item.timeLabel)
            const gradient = timeIcons[item.timeLabel] || 'from-gray-400 to-gray-500'
            const isLast = index === items.length - 1
            
            return (
              <div 
                key={item.id} 
                className={`relative flex gap-6 ${isLast ? '' : 'pb-8'}`}
              >
                {/* 时间节点 */}
                <div className={`relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <TimeIcon className="w-7 h-7 text-white" />
                </div>
                
                {/* 内容卡片 */}
                <div className="flex-1 bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                    {/* 时间标签 */}
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${gradient}`}>
                      {item.timeLabel}
                    </span>
                    {/* 标题 */}
                    <h4 className="font-bold text-gray-900 text-lg">{item.title}</h4>
                  </div>
                  
                  {/* 描述 */}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                  
                  {/* 标签 */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-medium border border-primary-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
