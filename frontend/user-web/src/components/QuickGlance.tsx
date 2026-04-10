'use client'

import { Star, Gem, Crown, Award, Eye, History } from 'lucide-react'

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

const iconMap = {
  star: Star,
  gem: Gem,
  crown: Crown,
  award: Award,
  eye: Eye,
  history: History,
}

export default function QuickGlance({ title = '必看清单', items }: QuickGlanceProps) {
  return (
    <div className="card p-6">
      <h3 className="text-h3 text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const Icon = iconMap[item.icon || 'star']
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                <p className="text-small text-gray-600 mt-1">{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
