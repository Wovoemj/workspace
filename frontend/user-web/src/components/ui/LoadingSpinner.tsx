'use client'

/**
 * =====================================================
 * 加载动画组件 (LoadingSpinner)
 * =====================================================
 * 
 * 功能说明：
 * - 页面/内容加载中的旋转动画指示器
 * - 支持三种尺寸：sm (16px)、md (32px)、lg (48px)
 * - 可选显示加载文本
 */

import { Loader2 } from 'lucide-react'

/** 加载动画组件属性 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
}

/**
 * 加载动画组件
 * @description 旋转加载指示器
 * @param props - 组件属性
 * @param props.size - 尺寸：sm | md | lg
 * @param props.className - 自定义样式
 * @param props.text - 加载文本（可选）
 */
export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
      {text && <span className="text-gray-600">{text}</span>}
    </div>
  )
}

export default LoadingSpinner