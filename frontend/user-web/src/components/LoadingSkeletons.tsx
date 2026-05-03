'use client'

/**
 * =====================================================
 * 骨架屏组件 (LoadingSkeletons)
 * =====================================================
 * 
 * 功能说明：
 * - 内容加载时的占位骨架屏组件
 * - 使用 CSS 动画模拟内容加载效果
 * - 提供多种骨架屏模板：
 *   - DestinationDetailSkeleton: 目的地详情页骨架
 *   - CardSkeleton: 通用卡片骨架
 *   - ListSkeleton: 列表骨架
 * 
 * 使用场景：
 * - 数据请求尚未返回时显示
 * - 改善用户体验，避免页面闪烁
 */

 /** 景点详情页骨架屏 */
export function DestinationDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 返回按钮 */}
      <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      
      {/* Hero 卡片 */}
      <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
        <div className="h-72 md:h-80 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
        <div className="bg-white p-4">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 text-center">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 必看清单 */}
      <div className="card p-6 mb-6">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 简介卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card p-6">
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="card p-5">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-10 w-full bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 时间轴 */}
      <div className="card p-6 mb-6">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4">
                <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse mb-3" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 地图区域 */}
      <div className="card p-6 mb-6">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

// 通用卡片骨架屏
export function CardSkeleton() {
  return (
    <div className="card p-4">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-3 w-full bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// 列表骨架屏
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
          <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
