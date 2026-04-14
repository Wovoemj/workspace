'use client'

import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  wrapperClassName?: string
  width?: number
  height?: number
  aspectRatio?: 'square' | 'video' | 'wide' | 'standard'
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty' | 'shimmer'
  fallbackSrc?: string
  onLoad?: () => void
  onError?: () => void
}

// 图片尺寸断点
const SIZE_BREAKPOINTS = [320, 640, 960, 1280, 1920]

// 生成响应式图片 srcset
function generateSrcSet(baseSrc: string, width: number): string {
  if (!baseSrc || baseSrc.startsWith('data:') || baseSrc.startsWith('blob:')) {
    return ''
  }
  
  // 如果是相对路径或本地路径，不生成 srcset
  if (!baseSrc.startsWith('http') && !baseSrc.startsWith('//')) {
    return ''
  }
  
  const widths = SIZE_BREAKPOINTS.filter(w => w <= width * 2)
  return widths
    .map(w => {
      // 假设图片服务支持 w 参数调整宽度
      const url = new URL(baseSrc, typeof window !== 'undefined' ? window.location.href : 'http://localhost')
      url.searchParams.set('w', String(w))
      return `${url.toString()} ${w}w`
    })
    .join(', ')
}

// 检查浏览器是否支持 WebP
function supportsWebP(): boolean {
  if (typeof window === 'undefined') return true
  const canvas = document.createElement('canvas')
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }
  return false
}

// 尝试转换为 WebP URL（如果图片服务支持）
function getWebPUrl(src: string): string {
  if (!src || !supportsWebP()) return src
  
  // 如果是 CDN 图片，尝试添加 format=webp 参数
  if (src.includes('cdn.') || src.includes('img.') || src.includes('image.')) {
    const url = new URL(src, typeof window !== 'undefined' ? window.location.href : 'http://localhost')
    url.searchParams.set('format', 'webp')
    return url.toString()
  }
  
  return src
}

// 获取低质量占位图 URL
function getLQIPUrl(src: string): string {
  if (!src || src.startsWith('data:')) return ''
  
  if (!src.startsWith('http') && !src.startsWith('//')) {
    return ''
  }
  
  const url = new URL(src, typeof window !== 'undefined' ? window.location.href : 'http://localhost')
  url.searchParams.set('w', '20')
  url.searchParams.set('q', '10')
  url.searchParams.set('blur', '10')
  return url.toString()
}

export function OptimizedImage({
  src,
  alt,
  className,
  wrapperClassName,
  width,
  height,
  aspectRatio = 'standard',
  priority = false,
  quality = 80,
  placeholder = 'shimmer',
  fallbackSrc = '/images/placeholder.jpg',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  // 计算宽高比类名
  const aspectRatioClass = useMemo(() => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square'
      case 'video':
        return 'aspect-video'
      case 'wide':
        return 'aspect-[21/9]'
      case 'standard':
      default:
        return 'aspect-[4/3]'
    }
  }, [aspectRatio])

  // 生成响应式图片配置
  const { optimizedSrc, srcSet, sizes } = useMemo(() => {
    const optimized = hasError ? fallbackSrc : getWebPUrl(currentSrc)
    const set = generateSrcSet(optimized, width || 800)
    const sizesAttr = width 
      ? `${width}px` 
      : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    
    return { optimizedSrc: optimized, srcSet: set, sizes: sizesAttr }
  }, [currentSrc, hasError, fallbackSrc, width])

  // 占位图
  const placeholderUrl = useMemo(() => {
    if (placeholder === 'empty') return null
    if (placeholder === 'blur') {
      return getLQIPUrl(src)
    }
    return null
  }, [src, placeholder])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    if (!hasError && currentSrc !== fallbackSrc) {
      setHasError(true)
      setCurrentSrc(fallbackSrc)
      setIsLoaded(false)
    }
    onError?.()
  }, [hasError, currentSrc, fallbackSrc, onError])

  return (
    <div 
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClass,
        wrapperClassName
      )}
    >
      {/* 加载骨架/占位 */}
      {!isLoaded && placeholder !== 'empty' && (
        <div 
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            placeholder === 'shimmer' ? 'animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer' : 'bg-muted'
          )}
          style={{
            backgroundImage: placeholderUrl ? `url(${placeholderUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: placeholder === 'blur' ? 'blur(20px)' : undefined,
          }}
        />
      )}
      
      {/* 实际图片 */}
      <img
        src={optimizedSrc}
        srcSet={srcSet || undefined}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

// 简化的图片卡片组件
interface ImageCardProps {
  src: string
  alt: string
  aspectRatio?: 'square' | 'video' | 'wide' | 'standard'
  className?: string
  overlay?: React.ReactNode
  priority?: boolean
}

export function ImageCard({
  src,
  alt,
  aspectRatio = 'standard',
  className,
  overlay,
  priority = false,
}: ImageCardProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        aspectRatio={aspectRatio}
        priority={priority}
        className="hover:scale-105 transition-transform duration-500"
      />
      {overlay && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {overlay}
        </div>
      )}
    </div>
  )
}

// 瀑布流图片项
interface MasonryImageProps {
  src: string
  alt: string
  height?: number
  className?: string
  onClick?: () => void
}

export function MasonryImage({
  src,
  alt,
  height = 300,
  className,
  onClick,
}: MasonryImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted cursor-pointer',
        className
      )}
      style={{ height }}
      onClick={onClick}
    >
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          'w-full h-full object-cover transition-all duration-500 hover:scale-105',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = '/images/placeholder.jpg'
          setIsLoaded(true)
        }}
      />
    </div>
  )
}
