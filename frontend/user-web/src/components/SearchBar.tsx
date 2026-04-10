'use client'

import { useState, useEffect } from 'react'
import { Search, MapPin, Calendar, Filter } from 'lucide-react'
import { useDebounce } from '@/hooks'

interface SearchBarProps {
  onSearch: (query: string, filters: any) => void
  className?: string
}

export function SearchBar({ onSearch, className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    travelStyle: ''
  })

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery) {
      onSearch(debouncedQuery, filters)
    }
  }, [debouncedQuery, filters, onSearch])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      destination: '',
      startDate: '',
      endDate: '',
      budget: '',
      travelStyle: ''
    })
    setQuery('')
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="搜索目的地、景点、酒?.."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={query}   // value?
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>


      {showFilters && (
        <div className="mt-4 bg-white p-4 rounded-lg shadow-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="text-gray-400 h-4 w-4" />
              <select
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.destination}   // value?
                onChange={(e) => handleFilterChange('destination', e.target.value)}
              >
                <option value="">目的</option>
                <option value="beijing">北京</option>
                <option value="shanghai">上海</option>
                <option value="guangzhou">广州</option>
                <option value="shenzhen">深圳</option>
                <option value="chengdu">成都</option>
                <option value="hangzhou">杭州</option>
                <option value="xiamen">厦门</option>
                <option value="sanya">三亚</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400 h-4 w-4" />
              <input
                type="date"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.startDate}   // value?
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400 h-4 w-4" />
              <input
                type="date"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.endDate}   // value?
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 h-4 w-4">¥</span>
              <select
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.budget}   // value?
                onChange={(e) => handleFilterChange('budget', e.target.value)}
              >
                <option value="">预算范围</option>
                <option value="0-1000">¥1000以下</option>
                <option value="1000-3000">¥1000-3000</option>
                <option value="3000-5000">¥3000-5000</option>
                <option value="5000-10000">¥5000-10000</option>
                <option value="10000+">¥10000以上</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 h-4 w-4">🎯</span>
              <select
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.travelStyle}   // value?
                onChange={(e) => handleFilterChange('travelStyle', e.target.value)}
              >
                <option value="">旅行风格</option>
                <option value="adventure">探险</option>
                <option value="relaxation">休闲</option>
                <option value="cultural">文化</option>
                <option value="business">商务</option>
                <option value="family">家庭</option>
                <option value="romantic">浪漫</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={clearFilters}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除筛?
            </button>
            <button
              onClick={() => {
                setShowFilters(false)
                onSearch(query, filters)
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              应用筛?
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
