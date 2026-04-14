'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, TrendingUp, MapPin, Package, Loader2 } from 'lucide-react'

interface SearchResult {
  id: number
  name: string
  type: 'destination' | 'product'
  image?: string
  price?: number
  city?: string
}

interface GlobalSearchProps {
  className?: string
}

export function GlobalSearch({ className = '' }: GlobalSearchProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ destinations: SearchResult[]; products: SearchResult[] }>({
    destinations: [],
    products: []
  })
  const [loading, setLoading] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('search_history')
    if (history) {
      setSearchHistory(JSON.parse(history))
    }
  }, [])

  // Save search history to localStorage
  const saveToHistory = (keyword: string) => {
    if (!keyword.trim()) return
    const newHistory = [keyword, ...searchHistory.filter(h => h !== keyword)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('search_history', JSON.stringify(newHistory))
  }

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('search_history')
  }

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ destinations: [], products: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all&per_page=5`)
        const data = await res.json()
        if (data?.success) {
          setResults({
            destinations: (data.destinations || []).map((d: any) => ({
              id: d.id,
              name: d.name,
              type: 'destination' as const,
              image: d.cover_image,
              city: d.city
            })),
            products: (data.products || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              type: 'product' as const,
              image: p.cover_image,
              price: p.discount_price || p.base_price
            }))
          })
        }
      } catch (e) {
        console.error('Search error:', e)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle search submit
  const handleSearch = (keyword?: string) => {
    const searchTerm = keyword || query
    if (!searchTerm.trim()) return
    saveToHistory(searchTerm)
    setIsOpen(false)
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`)
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const totalResults = results.destinations.length + results.products.length

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors"
      >
        <Search className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-500 hidden sm:inline">搜索目的地或产品...</span>
      </button>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[400px] max-h-[500px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-200 z-50">
          {/* Search Input */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索目的地、产品..."
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
              <p className="text-sm text-gray-500 mt-2">搜索中...</p>
            </div>
          )}

          {/* Search Results */}
          {!loading && query && totalResults > 0 && (
            <div className="p-2">
              {/* Destinations */}
              {results.destinations.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    目的地
                  </div>
                  {results.destinations.map((item) => (
                    <Link
                      key={`dest-${item.id}`}
                      href={`/destinations/${item.id}`}
                      onClick={() => {
                        saveToHistory(query)
                        setIsOpen(false)
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.city}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    产品
                  </div>
                  {results.products.map((item) => (
                    <Link
                      key={`prod-${item.id}`}
                      href={`/products/${item.id}`}
                      onClick={() => {
                        saveToHistory(query)
                        setIsOpen(false)
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.price ? `¥${item.price}` : ''}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* View All Results */}
              <button
                onClick={() => handleSearch()}
                className="w-full mt-2 py-2 text-center text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
              >
                查看全部结果 →
              </button>
            </div>
          )}

          {/* No Results */}
          {!loading && query && totalResults === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500">未找到相关结果</p>
              <p className="text-sm text-gray-400 mt-1">试试其他关键词</p>
            </div>
          )}

          {/* Search History (when no query) */}
          {!query && searchHistory.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">最近搜索</span>
                <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-gray-600">
                  清除
                </button>
              </div>
              {searchHistory.map((keyword, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(keyword)
                    handleSearch(keyword)
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{keyword}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches (when no query and no history) */}
          {!query && searchHistory.length === 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                <TrendingUp className="h-4 w-4" />
                热门搜索
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['北京', '上海', '杭州', '成都', '西安'].map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => {
                      setQuery(keyword)
                      handleSearch(keyword)
                    }}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}