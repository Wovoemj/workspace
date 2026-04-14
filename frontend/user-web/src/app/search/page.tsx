'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, MapPin, Package, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { DestinationCard } from '@/components/DestinationCard'
import { ProductCard } from '@/components/ProductCard'

interface SearchResult {
  id: number
  name: string
  description?: string
  city?: string
  province?: string
  cover_image?: string
  rating?: number
  ticket_price?: number
  category?: string
  base_price?: number
  discount_price?: number
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const typeParam = searchParams.get('type') || 'all'
  
  const [searchType, setSearchType] = useState(typeParam)
  const [results, setResults] = useState<{ destinations: SearchResult[]; products: SearchResult[] }>({
    destinations: [],
    products: []
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Fetch search results
  const fetchResults = useCallback(async () => {
    if (!query.trim()) {
      setResults({ destinations: [], products: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${searchType}&page=${page}&per_page=12`
      )
      const data = await res.json()
      if (data?.success) {
        setResults({
          destinations: data.destinations || [],
          products: data.products || []
        })
        setTotal(data.total || 0)
      }
    } catch (e) {
      console.error('Search error:', e)
    } finally {
      setLoading(false)
    }
  }, [query, searchType, page])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  // Update URL when type changes
  const handleTypeChange = (newType: string) => {
    setSearchType(newType)
    setPage(1)
    router.push(`/search?q=${encodeURIComponent(query)}&type=${newType}`)
  }

  // Get display results based on current type
  const displayDestinations = searchType === 'products' ? [] : results.destinations
  const displayProducts = searchType === 'destinations' ? [] : results.products
  const displayTotal = searchType === 'products' 
    ? displayProducts.length 
    : searchType === 'destinations' 
    ? displayDestinations.length 
    : total

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                defaultValue={query}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement
                    router.push(`/search?q=${encodeURIComponent(input.value)}&type=${searchType}`)
                  }
                }}
                placeholder="搜索目的地或产品..."
                className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
              {query && (
                <button
                  onClick={() => router.push('/search?type=all')}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Type Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { id: 'all', label: '全部' },
              { id: 'destinations', label: '目的地' },
              { id: 'products', label: '产品' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTypeChange(tab.id)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  searchType === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              {query ? (
                <>找到 <span className="font-semibold text-gray-900">{displayTotal}</span> 个相关结果</>
              ) : (
                '请输入搜索关键词'
              )}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">搜索中...</span>
            </div>
          )}

          {/* Results */}
          {!loading && query && (
            <>
              {/* Destinations */}
              {searchType !== 'products' && displayDestinations.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    目的地 ({displayDestinations.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayDestinations.map((dest) => (
                      <DestinationCard
                        key={dest.id}
                        destination={dest as any}
                        onClick={() => router.push(`/destinations/${dest.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {searchType !== 'destinations' && displayProducts.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    产品 ({displayProducts.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayProducts.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod as any}
                        onClick={() => router.push(`/products/${prod.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {displayDestinations.length === 0 && displayProducts.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">未找到相关结果</h3>
                  <p className="text-gray-600 mb-6">试试其他关键词或调整筛选条件</p>
                  <div className="flex justify-center gap-3">
                    <Link href="/destinations" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      浏览目的地
                    </Link>
                    <Link href="/products" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      浏览产品
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}

          {/* No Query State */}
          {!loading && !query && (
            <div className="text-center py-16">
              <Search className="h-16 w-16 mx-auto text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mt-4">输入关键词开始搜索</h3>
              <p className="text-gray-600 mt-2">搜索目的地、酒店、景点门票等</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}