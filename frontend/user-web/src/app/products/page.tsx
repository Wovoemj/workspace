'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight, 
  Star, ShoppingCart, MapPin, Calendar, Clock, Users, 
  ChevronDown, Loader2, X, Tag, DollarSign, TrendingUp,
  Sparkles, Award, Shield, Heart, Zap, Globe
} from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface Product {
  id: number
  name: string
  subtitle?: string
  description?: string
  category: string
  base_price: number
  discount_price?: number
  cover_image?: string
  images?: string[]
  rating?: number
  review_count?: number
  sold_count?: number
  location?: string
  duration?: string
  tags?: string[]
  inventory_total: number
  inventory_sold: number
  status: string
  created_at: string
  updated_at: string
  type?: string
  destination_id?: number
  booking_type?: string
  need_date?: boolean
  need_time?: boolean
}

interface ApiResponse {
  success: boolean
  products: Product[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// 筛选选项
const CATEGORIES = [
  { id: 'all', label: '全部类别', icon: Tag },
  { id: 'ticket', label: '景点门票', icon: TicketIcon },
  { id: 'experience', label: '体验活动', icon: Zap },
  { id: 'tour', label: '跟团游', icon: Users },
  { id: 'hotel', label: '酒店住宿', icon: HotelIcon },
  { id: 'transport', label: '交通套票', icon: TrainIcon },
  { id: 'food', label: '美食套餐', icon: FoodIcon },
  { id: 'shopping', label: '购物优惠', icon: ShoppingCart }
]

// 价格区间
const PRICE_RANGES = [
  { id: 'all', label: '所有价格', min: null, max: null },
  { id: 'budget', label: '经济实惠 (¥0-200)', min: 0, max: 200 },
  { id: 'midrange', label: '中等价位 (¥200-500)', min: 200, max: 500 },
  { id: 'premium', label: '高端体验 (¥500-1000)', min: 500, max: 1000 },
  { id: 'luxury', label: '奢华享受 (¥1000+)', min: 1000, max: null }
]

// 排序选项
const SORT_OPTIONS = [
  { id: 'recommended', label: '智能推荐', icon: Sparkles },
  { id: 'popular', label: '人气最高', icon: TrendingUp },
  { id: 'rating', label: '评分最高', icon: Star },
  { id: 'newest', label: '最新发布', icon: Award },
  { id: 'price_asc', label: '价格从低到高', icon: DollarSign },
  { id: 'price_desc', label: '价格从高到低', icon: DollarSign }
]

// 时长选项
const DURATION_OPTIONS = [
  { id: 'all', label: '所有时长' },
  { id: 'short', label: '短时体验 (<2小时)' },
  { id: 'half_day', label: '半日游 (2-4小时)' },
  { id: 'full_day', label: '一日游 (4-8小时)' },
  { id: 'multi_day', label: '多日游 (>8小时)' }
]

// 标签选项
const TAG_OPTIONS = [
  { id: 'family', label: '亲子友好', color: 'bg-pink-100 text-pink-800' },
  { id: 'couple', label: '情侣浪漫', color: 'bg-red-100 text-red-800' },
  { id: 'group', label: '团队活动', color: 'bg-blue-100 text-blue-800' },
  { id: 'solo', label: '独自旅行', color: 'bg-green-100 text-green-800' },
  { id: 'photography', label: '摄影打卡', color: 'bg-purple-100 text-purple-800' },
  { id: 'adventure', label: '冒险刺激', color: 'bg-orange-100 text-orange-800' },
  { id: 'relax', label: '休闲放松', color: 'bg-teal-100 text-teal-800' },
  { id: 'cultural', label: '文化体验', color: 'bg-amber-100 text-amber-800' }
]

// 图标组件
const TicketIcon = () => <div className="w-5 h-5">🎫</div>
const HotelIcon = () => <div className="w-5 h-5">🏨</div>
const TrainIcon = () => <div className="w-5 h-5">🚄</div>
const FoodIcon = () => <div className="w-5 h-5">🍜</div>

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // 筛选状态
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    priceRange: searchParams.get('price') || 'all',
    sortBy: searchParams.get('sort') || 'recommended',
    duration: searchParams.get('duration') || 'all',
    keyword: searchParams.get('keyword') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    tags: searchParams.get('tags')?.split(',') || []
  })

  // 获取产品数据
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '12',
        status: 'active'
      })

      // 添加筛选参数
      if (filters.category !== 'all') params.append('category', filters.category)
      if (filters.sortBy !== 'recommended') params.append('sort_by', filters.sortBy)
      if (filters.duration !== 'all') params.append('duration', filters.duration)
      if (filters.keyword) params.append('keyword', filters.keyword)
      if (filters.minPrice) params.append('min_price', filters.minPrice)
      if (filters.maxPrice) params.append('max_price', filters.maxPrice)
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','))

      // 添加价格区间筛选
      const priceRange = PRICE_RANGES.find(r => r.id === filters.priceRange)
      if (priceRange && priceRange.id !== 'all') {
        if (priceRange.min !== null) params.append('min_price', priceRange.min.toString())
        if (priceRange.max !== null) params.append('max_price', priceRange.max.toString())
      }

      const response = await fetch(`/api/products?${params}`)
      const data: ApiResponse = await response.json()
      
      if (data.success) {
        setProducts(data.products)
        setTotal(data.total)
        setTotalPages(Math.ceil(data.total / 12))
      }
    } catch (error) {
      console.error('获取产品列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [filters, currentPage])

  // 初始化时获取数据
  useEffect(() => {
    fetchProducts()
  }, [filters, currentPage, fetchProducts])

  // 处理筛选变化
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  // 处理标签切换
  const handleTagToggle = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter(t => t !== tagId)
      : [...filters.tags, tagId]
    handleFilterChange('tags', newTags)
  }

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      category: 'all',
      priceRange: 'all',
      sortBy: 'recommended',
      duration: 'all',
      keyword: '',
      minPrice: '',
      maxPrice: '',
      tags: []
    })
    setCurrentPage(1)
  }

  // 清空关键词
  const clearKeyword = () => {
    handleFilterChange('keyword', '')
  }

  // 获取活动筛选数量
  const activeFilterCount = [
    filters.category !== 'all',
    filters.priceRange !== 'all',
    filters.sortBy !== 'recommended',
    filters.duration !== 'all',
    filters.keyword !== '',
    filters.minPrice !== '',
    filters.maxPrice !== '',
    filters.tags.length > 0
  ].filter(Boolean).length

  // 渲染筛选器
  const renderFilters = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* 搜索框 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            placeholder="搜索产品、目的地、关键词..."
            className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          />
          {filters.keyword && (
            <button
              onClick={clearKeyword}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">产品类别</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => handleFilterChange('category', cat.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  filters.category === cat.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon />
                <span className="mt-2 text-sm font-medium">{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 价格区间 */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">价格区间</h3>
        <div className="space-y-2">
          {PRICE_RANGES.map(range => (
            <button
              key={range.id}
              onClick={() => handleFilterChange('priceRange', range.id)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-lg border transition-all ${
                filters.priceRange === range.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{range.label}</span>
              <DollarSign className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* 自定义价格 */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">自定义价格</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">最低价</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">最高价</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                placeholder="不限"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 标签筛选 */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">适合人群</h3>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map(tag => (
            <button
              key={tag.id}
              onClick={() => handleTagToggle(tag.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                filters.tags.includes(tag.id)
                  ? tag.color
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={resetFilters}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          重置筛选
        </button>
        <button
          onClick={() => setShowFilters(false)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          应用筛选
        </button>
      </div>
    </div>
  )

  // 渲染移动端筛选按钮
  const renderMobileFilterButton = () => (
    <button
      onClick={() => setShowMobileFilters(true)}
      className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
    >
      <Filter className="h-5 w-5" />
      筛选
      {activeFilterCount > 0 && (
        <span className="ml-1 px-2 py-0.5 bg-white text-blue-600 text-xs rounded-full">
          {activeFilterCount}
        </span>
      )}
    </button>
  )

  // 渲染移动端筛选面板
  const renderMobileFilterPanel = () => (
    showMobileFilters && (
      <div className="lg:hidden fixed inset-0 z-50 bg-white">
        <div className="h-full overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">筛选条件</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-4">
            {renderFilters()}
          </div>
        </div>
      </div>
    )
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧筛选栏 */}
          <div className="lg:w-1/4">
            <div className="hidden lg:block">
              {renderFilters()}
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="lg:w-3/4">
            {/* 头部 */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">产品列表</h1>
                  <p className="mt-2 text-gray-600">
                    发现 {total} 个精彩旅行体验
                  </p>
                </div>
                
                {/* 排序 */}
                <div className="relative">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full sm:w-auto appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    {SORT_OPTIONS.map(option => {
                      const Icon = option.icon
                      return (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 活动筛选标签 */}
              {activeFilterCount > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">已选条件：</span>
                  {filters.category !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {CATEGORIES.find(c => c.id === filters.category)?.label}
                      <button onClick={() => handleFilterChange('category', 'all')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filters.tags.map(tagId => {
                    const tag = TAG_OPTIONS.find(t => t.id === tagId)
                    return tag ? (
                      <span key={tagId} className={`inline-flex items-center gap-1 px-3 py-1 ${tag.color} text-sm rounded-full`}>
                        {tag.label}
                        <button onClick={() => handleTagToggle(tagId)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null
                  })}
                  <button
                    onClick={resetFilters}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    清空所有
                  </button>
                </div>
              )}
            </div>

            {/* 产品网格 */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product}
                      onClick={() => router.push(`/products/${product.id}`)}
                    />
                  ))}
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <nav className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        上一页
                      </button>
                      
                      {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                        const pageNum = i + 1
                        const isCurrent = pageNum === currentPage
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg transition-colors ${
                              isCurrent 
                                ? 'bg-blue-600 text-white' 
                                : 'border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        下一页
                      </button>
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">暂无产品</div>
                <p className="text-gray-600 mb-6">尝试调整筛选条件或搜索关键词</p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重置筛选条件
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 移动端筛选按钮 */}
      {renderMobileFilterButton()}
      {renderMobileFilterPanel()}

      <Footer />
    </div>
  )
}