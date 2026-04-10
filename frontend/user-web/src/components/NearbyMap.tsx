'use client'

import { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import { MapPin, TreePine, Coffee, ShoppingBag } from 'lucide-react'

interface NearbyItem {
  id: string | number
  name: string
  description: string
  address?: string
  distance: string
  price?: string
  rating?: number
  icon?: 'tree' | 'coffee' | 'shopping' | 'park'
  position?: [number, number] // [lng, lat]
  type?: string
}

interface NearbyMapProps {
  title?: string
  items?: NearbyItem[]
  center?: [number, number]
  destinationName?: string
}

const iconMap = {
  tree: TreePine,
  coffee: Coffee,
  shopping: ShoppingBag,
  park: TreePine,
}

// 图标类型映射
const iconColorMap: Record<string, string> = {
  tree: '#22c55e',
  coffee: '#a855f7',
  shopping: '#f97316',
  park: '#22c55e',
}

// 根据类型判断图标
function getIconByType(type: string) {
  if (!type) return 'tree'
  const t = type.toLowerCase()
  if (t.includes('咖啡') || t.includes('餐厅') || t.includes('美食')) return 'coffee'
  if (t.includes('购物') || t.includes('商场') || t.includes('超市')) return 'shopping'
  if (t.includes('公园') || t.includes('广场') || t.includes('花园') || t.includes('绿地')) return 'park'
  return 'tree'
}

export default function NearbyMap({
  title = '周边联动',
  items,
  center = [116.397428, 39.90923],
  destinationName = '景点位置'
}: NearbyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([])
  const [loading, setLoading] = useState(false)

  // 动态获取周边数?
  useEffect(() => {
    const fetchNearby = async () => {
      if (!center || center[0] === 0) return

      setLoading(true)
      try {
        const location = `${center[0]},${center[1]}`
        const response = await fetch(`/api/nearby?location=${location}`)
        const data = await response.json()

        if (data.success && data.items) {
          // 转换经纬度为 position
          const processedItems = data.items.map((item: any, index: number) => ({
            ...item,
            icon: getIconByType(item.type || ''),
            position: item.lng && item.lat ? [item.lng, item.lat] : undefined,
            distance: item.distance,
            description: item.address || '暂无描述',
          })).filter((item: any) => item.position)

          setNearbyItems(processedItems)
        } else {
          // API 失败时使用默认数?
          setNearbyItems([])
        }
      } catch (error) {
        console.error('获取周边数据失败:', error)
        setNearbyItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchNearby()
  }, [center])

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return

    const initMap = async () => {
      try {
        const AMap = await AMapLoader.load({
          key: process.env.NEXT_PUBLIC_AMAP_KEY || '',
          version: '2.0',
          plugins: ['AMap.ToolBar', 'AMap.Scale'],
        })

        if (!mapContainer.current) return

        const map = new AMap.Map(mapContainer.current, {
          zoom: 15,
          center: center,
          viewMode: '2D',
          mapStyle: 'amap://styles/whitesmoke',
        })

        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar())

        // 景点中心标记
        const centerMarker = new AMap.Marker({
          position: center,
          title: destinationName,
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
            imageSize: new AMap.Size(32, 32),
          }),
          offset: new AMap.Pixel(-16, -32),
        })
        centerMarker.setLabel({
          offset: new AMap.Pixel(0, -10),
          content: `<div style="background:#3b82f6;color:white;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${destinationName}</div>`,
        })
        map.add(centerMarker)

        // 周边地点标记
        const allItems = nearbyItems.length > 0 ? nearbyItems : (items || [])
        allItems.forEach((item) => {
          if (item.position) {
            const IconComp = iconMap[item.icon || 'tree']
            const color = iconColorMap[item.icon || 'tree']

            // 创建自定义标?
            const marker = new AMap.Marker({
              position: item.position,
              title: item.name,
              content: `<div style="background:${color};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${item.id}</div>`,
              offset: new AMap.Pixel(-12, -12),
            })

            marker.setLabel({
              offset: new AMap.Pixel(0, -10),
              content: `<div style="background:white;padding:2px 6px;border-radius:4px;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;">${item.name}</div>`,
            })

            marker.on('click', () => {
              const infoWindow = new AMap.InfoWindow({
                content: `
                  <div style="padding:8px;min-width:200px;">
                    <h4 style="margin:0 0 4px;font-weight:bold;">${item.name}</h4>
                    <p style="margin:0;font-size:12px;color:#666;">${item.description}</p>
                    <p style="margin:4px 0 0;font-size:12px;">距离: ${item.distance}</p>
                  </div>
                `,
                offset: new AMap.Pixel(0, -30),
              })
              infoWindow.open(map, item.position)
            })

            map.add(marker)
            markersRef.current.push(marker)
          }
        })

        mapInstance.current = map
        setMapLoaded(true)
      } catch (error) {
        console.error('高德地图加载失败:', error)
        setMapError('地图加载失败，请检查网络连接')
      }
    }

    initMap()

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy()
        mapInstance.current = null
      }
    }
  }, [center, destinationName, nearbyItems, items])

  // 如果没有传入 items 且没有获取到数据，显示提?
  const displayItems = nearbyItems.length > 0 ? nearbyItems : (items || [])
  const hasRealData = nearbyItems.length > 0

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-h3 text-gray-900">{title}</h3>
        {loading && (
          <span className="text-small text-gray-500">正在搜索周边...</span>
        )}
        {hasRealData && (
          <span className="text-small text-green-600">✅ 已加载真实周边数据</span>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            ref={mapContainer}
            className="rounded-xl h-64 w-full"
            style={{ borderRadius: '12px', overflow: 'hidden' }}
          />
          {mapError && (
            <div className="mt-2 text-center text-small text-red-500">
              {mapError}
            </div>
          )}
          {!hasRealData && !items && (
            <div className="mt-2 text-center text-small text-gray-500">
              暂无周边数据
            </div>
          )}
        </div>
        <div className="space-y-4">
          {displayItems.length > 0 ? (
            displayItems.map((item) => {
              const Icon = iconMap[item.icon || 'tree']
              const color = iconColorMap[item.icon || 'tree']
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    <p className="text-small text-gray-600 mt-1">{item.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-tiny text-gray-500">距离 {item.distance}</span>
                      {item.type && (
                        <>
                          <span className="text-tiny text-gray-500">·</span>
                          <span className="text-tiny text-gray-500">{item.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center text-gray-500 py-8">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-small">暂无周边数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
