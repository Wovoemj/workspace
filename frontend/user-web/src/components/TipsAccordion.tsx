'use client'

/**
 * =====================================================
 * 折叠面板组件 (TipsAccordion)
 * =====================================================
 * 
 * 功能说明：
 * - 手风琴式折叠面板组件
 * - 支持单个或多个面板同时展开
 * - 用于展示实用锦囊、FAQ等内容
 * - 展开/收起动画效果
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/** 锦囊条目类型 */
interface TipsItem {
  id: string | number
  title: string
  content: string
}

interface TipsAccordionProps {
  title?: string
  items: TipsItem[]
  defaultOpenId?: string | number | null
}

/**
 * 折叠面板组件
 * @description 手风琴式折叠面板，支持展开/收起操作
 * @param props - 组件属性
 * @param props.title - 面板标题（默认：实用锦囊）
 * @param props.items - 条目列表
 * @param props.defaultOpenId - 默认展开的条目ID（可选）
 */
export default function TipsAccordion({ title = '实用锦囊', items, defaultOpenId = null }: TipsAccordionProps) {
  const [openId, setOpenId] = useState<string | number | null>(defaultOpenId)

  const toggleItem = (id: string | number) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="card p-6">
      <h3 className="text-h3 text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => {
          const isOpen = openId === item.id
          return (
            <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => toggleItem(item.id)}
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-gray-900">{item.title}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="p-4 pt-0 border-t border-gray-200 bg-gray-50">
                  <p className="text-small text-gray-700">{item.content}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
