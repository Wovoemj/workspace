'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Star,
  Eye,
  Loader2,
  Heart,
  Navigation,
  Mountain,
  Building2,
  TreePine,
  MapPin,
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
  open_time: string
}

export default function PopularDestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDestinations() {
      try {
        const res = await fetch('/api/destinations?sort=rating&order=desc&per_page=20')
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

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-8 w-8" />
              <span className="text-xl font-bold">热门推荐</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">热门目的</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              精选全国最受欢迎的旅游目的地，发现绝佳景点，规划您的完美旅?
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link href="/destinations/domestic" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 rounded-xl font-medium hover:bg-red-50 transition">
                <Mountain className="h-5 w-5" />国内热门
              </Link>
              <Link href="/destinations/international" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition">
                <Building2 className="h-5 w-5" />出境精?
              </Link>
              <Link href="/destinations/local" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition">
                <TreePine className="h-5 w-5" />周边?
              </Link>
            </div>
          </div>
        </div>


        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-500 text-sm">热门标签</span>
            {['自然风光', '历史文化', '海滨度假', '美食之旅', '亲子乐园', '浪漫古镇'].map((tag) => (
              <Link key={tag} href={`/destinations?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-blue-300 hover:text-blue-600 transition">
                {tag}
              </Link>
            ))}
          </div>
        </div>


        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600">加载?..</span>
            </div>
          ) : destinations.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">暂无热门目的</h3>
              <p className="text-slate-500 mb-6">热门目的地正在筹备中，敬请期待！</p>
              <Link href="/destinations" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                浏览所有目的地
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6 text-sm text-slate-500">
                <span>?<strong className="text-slate-900">{destinations.length}</strong> 个热门目的地</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />总浏览量 12.8?</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Heart className="h-4 w-4" />收藏?3.2?</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {destinations.map((dest) => (
                  <DestinationCard key={dest.id} destination={dest} />
                ))}
              </div>
            </>
          )}
        </div>


        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-sky-500 rounded-3xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-2">想了解更多目的地</h2>
            <p className="text-white/80 mb-6">探索更多精彩景点，发现属于您的下一段旅</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/destinations" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition">
                <Navigation className="h-5 w-5" />浏览全部目的?
              </Link>
              <Link href="/assistant" className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition">
                ?AI 推荐
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
