'use client'

interface SkeletonCardProps {
  variant?: 'default' | 'destination' | 'product'
  className?: string
}

// 目的地卡片骨架
export function DestinationCardSkeleton({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white overflow-hidden ${className}`}>
      <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
      <div className="p-4">
        <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse mb-3" />
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// 产品卡片骨架
export function ProductCardSkeleton({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white overflow-hidden ${className}`}>
      <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
      <div className="p-4">
        <div className="h-5 bg-gray-200 rounded w-full animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse mb-3" />
        <div className="flex items-center justify-between mt-3">
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// 通用骨架
export function SkeletonCard({ variant = 'default', className = '' }: SkeletonCardProps) {
  if (variant === 'destination') {
    return <DestinationCardSkeleton className={className} />
  }
  if (variant === 'product') {
    return <ProductCardSkeleton className={className} />
  }
  
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-4 ${className}`}>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
      </div>
    </div>
  )
}

// 列表骨架
export function SkeletonList({ count = 3, className = '' }: { count?: number } & SkeletonCardProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export default SkeletonCard