export const FALLBACK_MEDIA_PATH = 'scenic_images/__auto__/placeholder.png'

export function apiMediaUrl(path: string) {
  return `/api/media?path=${encodeURIComponent(path)}`
}

export function resolveCoverSrc(coverImage?: string | null) {
  const v = (coverImage || '').trim()
  if (!v) return apiMediaUrl(FALLBACK_MEDIA_PATH)
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  if (v.startsWith('scenic_images/')) return apiMediaUrl(v)
  // 后端 /api/media 只允?scenic_images/ 开头；其它情况统一降级到本地占位图
  return apiMediaUrl(FALLBACK_MEDIA_PATH)
}

import type { SyntheticEvent } from 'react'

export function onImgErrorUseFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img) return
  const fallback = apiMediaUrl(FALLBACK_MEDIA_PATH)
  if (img.src && img.src.includes(FALLBACK_MEDIA_PATH)) return
  img.src = fallback
}

