'use client'

import Link from 'next/link'
import {
  TreePine,
  MapPin,
  Car,
  Bike,
  Footprints,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const tripTypes = [
        { icon: Car, name: '自驾？', desc: '自由驰骋，随心所？', count: 128 },
        { icon: Bike, name: '骑行？', desc: '绿色出行，健康休？', count: 86 },
        { icon: Footprints, name: '徒步？', desc: '亲近自然，挑战自？', count: 64 },
        { icon: MapPin, name: '周末？', desc: '说走就走，周末出？', count: 256 },
]

const nearbySpots = [
  { name: '郊区国家森林公园', distance: '15km', tags: ['自然', '徒步'], price: '免费' },
  { name: '千年古镇水乡', distance: '35km', tags: ['人文', '美食'], price: '¥50' },
  { name: '海滨度假小镇', distance: '50km', tags: ['海滨', '休闲'], price: '免费' },
  { name: '高山草甸露营', distance: '80km', tags: ['露营', '星空'], price: '¥30' },
        { name: '生态农庄采？', distance: '25km', tags: ['亲子', '农家'], price: '¥80' },
  { name: '峡谷漂流探险', distance: '60km', tags: ['刺激', '水上'], price: '¥180' },
]

export default function LocalDestinationsPage() {
  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-center gap-3 mb-4">
              <TreePine className="h-8 w-8" />
              <span className="text-xl font-bold">周边旅游</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">周边</h1>
            <p className="text-white/90 text-lg max-w-2xl">
              周末小长假的好去处，不用远行也能享受美好风景，发现身边的精彩
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/destinations/popular" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">热门推荐</Link>
              <Link href="/destinations/domestic" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">国内</Link>
              <Link href="/destinations/international" className="px-4 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition">出境</Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">选择出行方式</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {tripTypes.map((type) => {
                const Icon = type.icon
                return (
                  <Link key={type.name} href="/assistant"
                    className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-green-300 transition-all text-center">
                    <Icon className="h-10 w-10 text-green-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-slate-900 mb-1">{type.name}</h3>
                    <p className="text-sm text-slate-500 mb-2">{type.desc}</p>
                    <span className="text-xs text-green-600">{type.count} 个目的地</span>
                  </Link>
                )
              })}
            </div>
          </div>


          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">发现周边好去</h2>
              <Link href="/destinations" className="text-green-600 hover:underline flex items-center gap-1 text-sm">
                查看更多 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbySpots.map((spot) => (
                <Link key={spot.name} href="/assistant"
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-green-300 transition-all">
                  <div className="h-32 bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <TreePine className="h-12 w-12 text-white/50" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-slate-900 group-hover:text-green-600 transition-colors">{spot.name}</h3>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{spot.distance}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {spot.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-600 font-bold">{spot.price}</span>
                      <span className="text-sm text-slate-400 group-hover:text-green-600 flex items-center gap-1 transition-colors">
                        规划行程 <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>


          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">周边游小贴士</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">最佳出行时</h3>
                  <p className="text-sm text-slate-500">建议选择周六出发，周日返回，充分利用周末时间</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Car className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">交通建</h3>
                  <p className="text-sm text-slate-500">周边游推荐自驾或租车出行，更加灵活自</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TreePine className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">装备准备</h3>
                  <p className="text-sm text-slate-500">根据目的地准备相应装备，如徒步鞋、防晒霜</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
