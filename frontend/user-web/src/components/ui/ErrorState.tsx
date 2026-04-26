'use client'

/**
 * =====================================================
 * 错误状态组件 (ErrorState)
 * =====================================================
 * 
 * 功能说明：
 * - 显示加载失败/错误状态
 * - 提供重试按钮重新加载
 * - 可自定义错误消息文本
 */

import { AlertCircle, RefreshCw } from 'lucide-react'

/** 错误状态组件属性 */
interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

/**
 * 错误状态组件
 * @description 加载失败时显示的错误状态界面
 */
export function ErrorState({ 
  message = '出错了，请稍后重试', 
  onRetry,
  className = '' 
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="rounded-full bg-red-50 p-4 mb-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">加载失败</h3>
      <p className="text-gray-600 mt-2 text-center max-w-sm">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          重试
        </button>
      )}
    </div>
  )
}

export default ErrorState