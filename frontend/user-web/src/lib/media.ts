/**
 * ============================================
 * 媒体资源处理工具
 * ============================================
 * 
 * 【功能说明】
 * - 提供图片URL处理
 * - 处理占位图逻辑
 * - 统一媒体资源访问路径
 */

/** 占位图路径 - 当图片加载失败时显示的默认图片 */
export const FALLBACK_MEDIA_PATH = 'scenic_images/__auto__/placeholder.png'

/**
 * 生成媒体API访问URL
 * 
 * @param path - 媒体文件路径
 * @returns 完整的API访问URL
 * 
 * @example
 * apiMediaUrl('scenic_images/beijing.jpg')
 * // 返回: '/api/media?path=scenic_images%2Fbeijing.jpg'
 */
export function apiMediaUrl(path: string) {
  // 使用相对路径，通过 Next.js rewrites 代理到后端，兼容公网隧道访问
  // SSR 和客户端均使用相同相对路径，避免 hydration 不一致
  return `/api/media?path=${encodeURIComponent(path)}`
}

/**
 * 解析封面图片URL
 * 
 * @param coverImage - 封面图片路径（可能为空）
 * @returns 可访问的图片URL
 * 
 * @处理逻辑】
 * 1. 空值 → 返回占位图
 * 2. 外部URL（http/https开头）→ 直接返回
 * 3. scenic_images/开头 → 通过API代理
 * 4. 其他情况 → 返回占位图
 */
export function resolveCoverSrc(coverImage?: string | null) {
  const v = (coverImage || '').trim()
  
  // 空值或空白 → 使用占位图
  if (!v) return apiMediaUrl(FALLBACK_MEDIA_PATH)
  
  // 外部URL（如CDN图片）→ 直接返回
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  
  // 本地scenic_images目录 → 通过API代理
  if (v.startsWith('scenic_images/')) return apiMediaUrl(v)
  
  // 其他情况 → 降级到占位图
  return apiMediaUrl(FALLBACK_MEDIA_PATH)
}

/**
 * 图片加载失败时使用的回调函数
 * 
 * @param e - React的img元素error事件
 * 
 * @description 
 * 将图片src替换为占位图，防止死链显示
 * 如果已经是占位图则不再替换，避免循环
 */
import type { SyntheticEvent } from 'react'

export function onImgErrorUseFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img) return
  
  const fallback = apiMediaUrl(FALLBACK_MEDIA_PATH)
  
  // 如果当前src已经是占位图，跳过避免循环
  // 使用 encodeURIComponent 后的路径来匹配，因为 URL 是编码的
  const encodedFallback = encodeURIComponent(FALLBACK_MEDIA_PATH)
  if (img.src && img.src.includes(encodedFallback)) return
  
  // 替换为占位图
  img.src = fallback
}
