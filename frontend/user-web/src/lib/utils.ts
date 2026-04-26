/**
 * ============================================
 * 工具函数库
 * ============================================
 * 
 * 【提供的功能】
 * - cn: 合并ClassName，支持条件类名
 */

import { clsx, type ClassValue } from 'clsx'

/**
 * 合并ClassName
 * 
 * @param inputs - 一个或多个class值
 * @returns 合并后的class字符串
 * 
 * @example
 * // 普通用法
 * cn('text-red-500', 'bg-blue-500')
 * 
 * // 条件类名
 * cn('base-class', isActive && 'active-class')
 * 
 * // 合并多个
 * cn(class1, class2, { conditional: shouldApply })
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
