'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Mountain,
  Star,
  Loader2,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { DestinationCard } from '@/components/DestinationCard'

type Destination = {
  id: number
  name: string
  city: string
  province: string
  description: string
  cover_image: string
  rating: number
  ticket_price: number
}

const regions = [
  { name: '华北地区', provinces: ['北京', '天津', '河北', '山西', '内蒙古'], emoji: '🏛️' },
  { name: '东北地区', provinces: ['辽宁', '吉林', '黑龙江'], emoji: '❄️' },
  { name: '华东地区', provinces: ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东'], emoji: '🌆' },
  { name: '华中地区', provinces: ['河南', '湖北', '湖南'], emoji: '🌸' },
  { name: '华南地区', provinces: ['广东', '广西', '海南'], emoji: '🌴' },
  { name: '西南地区', provinces: ['重庆', '四川', '贵州', '云南', '西藏'], emoji: '🏔️' },
  { name: '西北地区', provinces: ['陕西', '甘肃', '青海', '宁夏', '新疆'], emoji: '🐪' },
]

export default function DomesticDestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDestinations() {
      try {
        const res = await fetch('/api/destinations?per_page=50')
        const data = await res.json()
        if (data.success) {
          setDestinations(data.destinations || [])
        }
      } catch (e) {
        console.error('加载失败', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDestinations()
  }, [])

  const filteredDestinations = selectedRegion
    ? destinations.filter(d => regions.find(r => r.name === selectedRegion)?.provinces.includes(d.province))
    : destinations

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <Mountain className="h-8 w-8" />
              <span className="text-xl font-bold">国内旅游</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">国内旅游</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              探索祖国大好河山，从北国雪景到南疆海岛，从东海岸到西部高原，每一次出发都是新的发现
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/destinations/popular" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">热门推荐</Link>
              <Link href="/destinations/international" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">出境</Link>
              <Link href="/destinations/local" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">周边</Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">按地区筛</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <button
                onClick={() => setSelectedRegion(null)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  !selectedRegion ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部地区
              </button>
              {regions.map((region) => (
                <button
                  key={region.name}
                  onClick={() => setSelectedRegion(region.name)}
                  className={`px-3 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedRegion === region.name ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{region.emoji}</span>
                  <span className="hidden sm:inline">{region.name}</span>
                </button>
              ))}
            </div>
          </div>


          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              <span className="ml-3 text-slate-600">加载?..</span>
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">暂无{selectedRegion}目的</h3>
              <p className="text-slate-500 mb-6">该地区目的地正在收录</p>
              <button onClick={() => setSelectedRegion(null)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition">
                查看全部目的?
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedRegion || '全国'}目的地
                  <span className="text-slate-500 font-normal text-base ml-2">({filteredDestinations.length} 个)</span>
                </h2>
                {selectedRegion && (
                  <button onClick={() => setSelectedRegion(null)} className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
                    清除筛?<ArrowRight className="h-4 w-4 rotate-180" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDestinations.map((dest) => (
                  <DestinationCard key={dest.id} destination={dest} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
