'use client'

/**
 * =====================================================
 * 空状态组件 (EmptyState)
 * =====================================================
 * 
 * 功能说明：
 * - 显示无数据/空列表状态
 * - 可配置图标、标题、描述文本
 * - 支持操作按钮（跳转链接或回调函数）
 */

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

/** 空状态组件属性 */
interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionText?: string
  actionHref?: string
  onAction?: () => void
  className?: string
}

/**
 * 空状态组件
 * @description 无数据时显示的空状态界面
 */
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionText, 
  actionHref,
  onAction,
  className = '' 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      {Icon && (
        <div className="rounded-full bg-gray-100 p-4 mb-4">
          <Icon className="h-10 w-10 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-gray-600 mt-2 text-center max-w-sm">{description}</p>
      )}
      {actionText && (
        <div className="mt-4">
          {actionHref ? (
            <Link 
              href={actionHref}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {actionText}
            </Link>
          ) : onAction ? (
            <button 
              onClick={onAction}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {actionText}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default EmptyState