'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import AMapLoader from '@amap/amap-jsapi-loader'
import { 
  MapPin, 
  Search, 
  Navigation, 
  Layers,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  Locate
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

type Destination = {
  id: number
  name: string
  city: string
  province: string
  lng: number
  lat: number
  cover_image?: string
  rating?: number
  ticket_price?: number
}

interface MapInstance {
  setCenter: (position: [number, number]) => void
  setZoom: (level: number) => void
  add: (marker: any) => void
  remove: (marker: any) => void
  getMap?: () => any
}

// 抑制高德地图 SDK 错误
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const message = args[0]?.toString?.() || ''
    if (message.includes('stadium') || message.includes('AMap') || message.includes('高德')) {
      return
    }
    originalConsoleError.apply(console, args)
  }
}

export default function DestinationMapPage() {
  const searchParams = useSearchParams()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [map, setMap] = useState<MapInstance | null>(null)
  const [loading, setLoading] = useState(true)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null)
  const [mapType, setMapType] = useState<'normal' | 'satellite'>('normal')
  const [searchCity, setSearchCity] = useState(searchParams.get('city') || '')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

  // 加载地图
  useEffect(() => {
    if (!mapContainerRef.current) return

    AMapLoader.load({
      key: 'd5d03e5e0e8e5e0e8e5e0e8e5e0e8e5e', // 高德地图 Key
      version: '2.0',
      plugins: ['AMap.Geolocation', 'AMap.Geocoder']
    }).then((AMap) => {
      const mapInstance = new AMap.Map(mapContainerRef.current!, {
        viewMode: '2D',
        zoom: 4,
        center: [105, 36], // 中国中心
        mapStyle: mapType === 'satellite' 
          ? 'amap://styles/satellite' 
          : 'amap://styles/normal'
      })

      mapRef.current = mapInstance
      setMap(mapInstance as unknown as MapInstance)
      setLoading(false)

      // 定位用户当前位置
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords
            setUserLocation([longitude, latitude])
            // 定位到用户附近
            mapInstance.setCenter([longitude, latitude])
            mapInstance.setZoom(10)
          },
          () => {
            console.log('定位失败')
          }
        )
      }
    }).catch((e) => {
      console.error('地图加载失败:', e)
      setLoading(false)
    })

    return () => {
      mapRef.current?.destroy()
    }
  }, [])

  // 切换地图类型
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setMapStyle(
      mapType === 'satellite' 
        ? 'amap://styles/satellite' 
        : 'amap://styles/normal'
    )
  }, [mapType])

  // 加载目的地数据
  const loadDestinations = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchCity) params.set('city', searchCity)
      params.set('per_page', '100')
      
      const res = await fetch(`/api/destinations?${params}`)
      const data = await res.json()
      
      if (data.success && data.destinations) {
        setDestinations(data.destinations.filter((d: Destination) => d.lng && d.lat))
      }
    } catch (error) {
      console.error('加载目的地失败:', error)
    }
  }, [searchCity])

  useEffect(() => {
    loadDestinations()
  }, [loadDestinations])

  // 添加标记点
  useEffect(() => {
    if (!map || destinations.length === 0) return

    // 清除旧标记
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    const AMap = (window as any).AMap
    if (!AMap) return

    destinations.forEach(dest => {
      const marker = new AMap.Marker({
        position: [dest.lng, dest.lat],
        title: dest.name,
        extData: dest,
        icon: new AMap.Icon({
          size: new AMap.Size(32, 32),
          image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
          imageSize: new AMap.Size(32, 32)
        })
      })

      marker.on('click', () => {
        setSelectedDestination(dest)
        map.setCenter([dest.lng, dest.lat])
        map.setZoom(14)
      })

      marker.setMap(map)
      markersRef.current.push(marker)
    })

    // 自动调整视野
    if (destinations.length > 1) {
      map.setFitView()
    }
  }, [map, destinations])

  // 定位到用户位置
  const handleLocate = () => {
    if (userLocation && map) {
      map.setCenter(userLocation)
      map.setZoom(12)
    }
  }

  // 缩放控制
  const handleZoom = (delta: number) => {
    if (!mapRef.current) return
    const currentZoom = mapRef.current.getZoom()
    mapRef.current.setZoom(currentZoom + delta)
  }

  return (
    <div className="relative h-screen flex flex-col">
      <Navbar />
      
      {/* 搜索栏 */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="flex items-center bg-white rounded-full shadow-lg px-4 py-2">
          <Search className="h-4 w-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="搜索城市..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadDestinations()}
            className="outline-none text-sm w-40"
          />
          {searchCity && (
            <button onClick={() => setSearchCity('')} className="ml-1">
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setMapType(m => m === 'normal' ? 'satellite' : 'normal')}
          className="bg-white rounded-full shadow-lg p-2 hover:bg-gray-50"
          title={mapType === 'normal' ? '切换卫星地图' : '切换普通地图'}
        >
          <Layers className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* 地图容器 */}
      <div ref={mapContainerRef} className="flex-1 w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-0">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
              <p className="mt-2 text-gray-500">地图加载中...</p>
            </div>
          </div>
        )}
      </div>

      {/* 缩放控件 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
        <button
          onClick={() => handleZoom(1)}
          className="bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50"
        >
          <ZoomIn className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={() => handleZoom(-1)}
          className="bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50"
        >
          <ZoomOut className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={handleLocate}
          disabled={!userLocation}
          className="bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 disabled:opacity-50"
          title="定位到我的位置"
        >
          <Locate className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* 选中景点卡片 */}
      {selectedDestination && (
        <div className="absolute bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-xl z-10 overflow-hidden">
          <button
            onClick={() => setSelectedDestination(null)}
            className="absolute top-2 right-2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
          
          {selectedDestination.cover_image && (
            <div className="h-32 bg-gray-200">
              <img
                src={selectedDestination.cover_image}
                alt={selectedDestination.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-4">
            <h3 className="font-bold text-gray-800">{selectedDestination.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedDestination.province} · {selectedDestination.city}
            </p>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1">
                <span className="text-amber-500">★</span>
                <span className="text-sm font-medium">{selectedDestination.rating?.toFixed(1) || '暂无'}</span>
              </div>
              {selectedDestination.ticket_price !== undefined && (
                <span className="text-sm font-medium text-sky-600">
                  {selectedDestination.ticket_price > 0 ? `¥${selectedDestination.ticket_price}起` : '免费'}
                </span>
              )}
            </div>
            
            <a
              href={`/destinations/${selectedDestination.id}`}
              className="mt-3 block w-full text-center bg-gradient-to-r from-sky-500 to-indigo-500 text-white py-2 rounded-lg text-sm font-medium hover:from-sky-600 hover:to-indigo-600"
            >
              查看详情
            </a>
          </div>
        </div>
      )}

      {/* 底部统计 */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-4 py-2 z-10">
        <span className="text-sm text-gray-600">
          共 {destinations.length} 个景点
        </span>
      </div>

      <Footer />
    </div>
  )
}