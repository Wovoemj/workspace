'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import { MapPin, TreePine, Coffee, ShoppingBag, Utensils, Store } from 'lucide-react'

// 抑制高德地图 SDK 的错误（如 stadium.js）
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    // 过滤掉高德地图相关的错误
    const message = args[0]?.toString?.() || ''
    if (message.includes('stadium') || 
        message.includes('AMap') || 
        message.includes('高德') ||
        message.includes('maps?')) {
      return
    }
    originalConsoleError.apply(console, args)
  }
}

interface NearbyItem {
  id: string | number
  name: string
  description: string
  address?: string
  distance: string
  price?: string
  rating?: number
  icon?: 'tree' | 'coffee' | 'shopping' | 'park' | 'restaurant' | 'store'
  position?: [number, number] // [lng, lat]
  type?: string
  data_source?: string
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
  restaurant: Utensils,
  store: Store,
}

// 图标类型映射
const iconColorMap: Record<string, string> = {
  tree: '#22c55e',
  coffee: '#a855f7',
  shopping: '#f97316',
  park: '#22c55e',
  restaurant: '#ef4444',
  store: '#3b82f6',
}

// 根据类型判断图标
function getIconByType(type: string): 'tree' | 'coffee' | 'shopping' | 'park' | 'restaurant' | 'store' {
  if (!type) return 'tree'
  const t = type.toLowerCase()
  if (t.includes('咖啡') || t.includes('美食')) return 'coffee'
  if (t.includes('餐厅') || t.includes('饭馆') || t.includes('酒楼')) return 'restaurant'
  if (t.includes('购物') || t.includes('商场') || t.includes('超市') || t.includes('便利')) return 'shopping'
  if (t.includes('公园') || t.includes('广场') || t.includes('花园') || t.includes('绿地')) return 'park'
  if (t.includes('景点') || t.includes('风景') || t.includes('旅游')) return 'tree'
  return 'store'
}

export default function NearbyMap({
  title = '周边联动',
  items: propItems,
  center: propCenter,
  destinationName = '景点位置'
}: NearbyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // 重试次数限制
  const retryCountRef = useRef(0)
  const MAX_RETRY = 3

  // 使用 useMemo 稳定 center 的引用，避免数组引用变化导致无限循环
  const center = useMemo(() => {
    // 确保 propCenter 存在且有有效值
    if (!propCenter || !Array.isArray(propCenter) || propCenter.length < 2) {
      return null
    }
    const [lng, lat] = propCenter
    // 确保返回有效的坐标
    if (lng === 0 || lat === 0 || isNaN(lng) || isNaN(lat)) {
      return null
    }
    return [lng, lat] as [number, number]
  }, [propCenter])

  // 用于 useEffect 依赖数组的稳定值
  const centerKey = center ? `${center[0]},${center[1]}` : null

  // 使用高德 PlaceSearch 获取真实周边 POI
  const searchNearbyPOIs = (AMap: any, centerPos: [number, number]) => {
    if (!AMap?.PlaceSearch) return

    setLoading(true)

    const placeSearch = new AMap.PlaceSearch({
      type: '050000|060000|070000|080000|100000|110000|141200',
      pageSize: 10,
      pageIndex: 1,
      extensions: 'base',
    })

    placeSearch.searchNearBy('', centerPos, 3000, (status: string, result: any) => {
      if (status === 'complete' && result.poiList?.pois?.length > 0) {
        const amapItems: NearbyItem[] = result.poiList.pois.map((poi: any) => {
          const typeInfo = poi.type || ''
          const mainType = typeInfo.split(';')[0] || '其他'
          return {
            id: `amap_${poi.id}`,
            name: poi.name,
            description: mainType,
            address: poi.address || '',
            distance: poi.distance ? `${(parseInt(poi.distance) / 1000).toFixed(1)}km` : '未知',
            icon: getIconByType(mainType),
            position: poi.location ? [parseFloat(poi.location.lng), parseFloat(poi.location.lat)] : undefined,
            type: mainType,
            data_source: 'amap',
          }
        }).filter((item: NearbyItem) => item.position && item.position.length === 2)

        setNearbyItems(amapItems)
        retryCountRef.current = 0
      } else {
        // 无结果（如偏远地区）或搜索失败，不显示假数据
        setNearbyItems([])
      }
      setLoading(false)
      setErrorMessage(null)
    })
  }

  // 动态获取周边数据 - 已整合到地图初始化完成回调中
  // 此 useEffect 仅作为备用触发（如 props center 变化时重新搜索）
  useEffect(() => {
    if (!centerKey || !mapInstance.current) return
    const AMap = (window as any).AMap
    if (AMap?.PlaceSearch && center) {
      searchNearbyPOIs(AMap, center)
    }
  }, [centerKey])

  // 地图初始化
  useEffect(() => {
    // 如果已有地图实例但 centerKey 变化了，需要销毁旧地图重新初始化
    if (mapInstance.current) {
      mapInstance.current.destroy()
      mapInstance.current = null
      setMapLoaded(false)
    }

    // 检查坐标有效性
    if (!mapContainer.current || !centerKey) return

    const initMap = async () => {
      try {
        const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY
        if (!amapKey) {
          console.error('高德地图 Key 未配置')
          setMapError('地图配置错误')
          return
        }

        const AMap = await AMapLoader.load({
          key: amapKey,
          version: '2.0',
          plugins: ['AMap.ToolBar', 'AMap.Scale', 'AMap.PlaceSearch'],
        })

        if (!mapContainer.current) return

        const map = new AMap.Map(mapContainer.current, {
          zoom: 14,
          center: center,
          viewMode: '2D',
          mapStyle: 'amap://styles/whitesmoke',
        })

        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar({
          position: 'LB',
        }))

        // 景点中心标记 - 使用蓝色大标记
        const centerMarker = new AMap.Marker({
          position: center,
          title: destinationName,
          content: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:bold;box-shadow:0 2px 8px rgba(59,130,246,0.5);border:3px solid white;">📍</div>`,
          offset: new AMap.Pixel(-16, -32),
          zIndex: 100,
        })
        centerMarker.setLabel({
          offset: new AMap.Pixel(0, -35),
          content: `<div style="background:#3b82f6;color:white;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${destinationName}</div>`,
          direction: 'top',
        })
        map.add(centerMarker)

        mapInstance.current = map
        setMapLoaded(true)
        setMapError(null)

        // 地图加载完成后，立即搜索周边真实 POI
        searchNearbyPOIs(AMap, center!)
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
  }, [centerKey, destinationName])

  // 更新地图标记 - 当周边数据变化时
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return

    // 清除旧的周边标记（保留中心标记）
    markersRef.current.forEach(marker => {
      mapInstance.current.remove(marker)
    })
    markersRef.current = []

    // 添加新的周边标记
    const allItems = nearbyItems.length > 0 ? nearbyItems : (propItems || [])
    
    allItems.forEach((item, index) => {
      if (item.position && Array.isArray(item.position) && item.position.length === 2) {
        const color = iconColorMap[item.icon || 'tree']
        const iconEmoji = item.icon === 'coffee' ? '☕' : 
                         item.icon === 'shopping' ? '🛒' : 
                         item.icon === 'park' ? '🌳' :
                         item.icon === 'restaurant' ? '🍽️' :
                         item.icon === 'store' ? '🏪' : '📍'

        // 创建自定义标记
        const marker = new (window as any).AMap.Marker({
          position: item.position,
          title: item.name,
          content: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">${iconEmoji}</div>`,
          offset: new (window as any).AMap.Pixel(-14, -14),
          zIndex: 50 + index,
        })

        marker.setLabel({
          offset: new (window as any).AMap.Pixel(0, -30),
          content: `<div style="background:white;padding:3px 8px;border-radius:4px;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,0.15);white-space:nowrap;font-weight:500;">${item.name}</div>`,
          direction: 'top',
        })

        // 点击弹出信息窗
        marker.on('click', () => {
          const infoWindow = new (window as any).AMap.InfoWindow({
            content: `
              <div style="padding:12px;min-width:200px;max-width:280px;">
                <h4 style="margin:0 0 6px;font-weight:bold;font-size:14px;color:#333;">${item.name}</h4>
                <p style="margin:0 0 4px;font-size:12px;color:#666;line-height:1.4;">${item.description || item.address || '暂无描述'}</p>
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
                  <span style="background:#f0f9ff;color:#0369a1;padding:2px 8px;border-radius:4px;font-size:11px;">${item.type || '设施'}</span>
                  <span style="color:#22c55e;font-size:12px;font-weight:500;">${item.distance}</span>
                </div>
              </div>
            `,
            offset: new (window as any).AMap.Pixel(0, -35),
          })
          infoWindow.open(mapInstance.current, item.position)
        })

        mapInstance.current.add(marker)
        markersRef.current.push(marker)
      }
    })
  }, [nearbyItems, propItems, mapLoaded])

  // 如果没有获取到数据，显示提示
  const displayItems = nearbyItems.length > 0 ? nearbyItems : (propItems || [])
  const hasRealData = nearbyItems.length > 0

  const itemsToShow = displayItems.length > 0 ? displayItems : []

  // 重试函数
  const handleRetry = () => {
    retryCountRef.current = 0
    setErrorMessage(null)
    setNearbyItems([])
    // 触发重新获取数据
    const event = new CustomEvent('retry-nearby')
    window.dispatchEvent(event)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-h3 text-gray-900">{title}</h3>
          {loading && (
            <span className="text-small text-gray-500 animate-pulse">正在搜索周边...</span>
          )}
        </div>
        {hasRealData && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            {displayItems.length} 个周边地点
          </span>
        )}
        {(errorMessage || mapError) && !loading && (
          <button
            onClick={handleRetry}
            className="text-xs text-blue-600 hover:text-blue-700 underline"
          >
            重试
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 地图区域 */}
        <div className="lg:col-span-2">
          {mapError ? (
            /* 地图加载失败时显示占位符 */
            <div className="rounded-xl w-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center"
              style={{ borderRadius: '12px', height: '320px' }}>
              <MapPin className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">地图加载失败</p>
              <p className="text-gray-500 text-sm mt-1">{mapError}</p>
              <button
                onClick={handleRetry}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新加载地图
              </button>
            </div>
          ) : (
            <div
              ref={mapContainer}
              className="rounded-xl w-full bg-gray-100"
              style={{ borderRadius: '12px', overflow: 'hidden', height: '320px' }}
            />
          )}
          {errorMessage && !mapError && (
            <div className="mt-2 p-3 bg-amber-50 rounded-lg text-center text-small text-amber-600">
              {errorMessage}
            </div>
          )}
        </div>

        {/* 周边列表 */}
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {itemsToShow.length > 0 ? (
            itemsToShow.map((item) => {
              const Icon = iconMap[item.icon || 'tree']
              const color = iconColorMap[item.icon || 'tree']
              const isRealData = item.data_source === 'amap'

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => {
                    // 点击列表项时，在地图上高亮对应标记
                    if (mapInstance.current && item.position) {
                      mapInstance.current.setCenter(item.position)
                      mapInstance.current.setZoom(16)
                    }
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                      {isRealData && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">周边</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.address || item.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-green-600">{item.distance}</span>
                      {item.rating && (
                        <>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-amber-500">★ {item.rating}</span>
                        </>
                      )}
                      {item.type && (
                        <>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{item.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center text-gray-400 py-12">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">暂无周边数据</p>
              <p className="text-xs mt-1 opacity-70">该景点位置信息可能不完整</p>
              {!loading && (
                <button
                  onClick={handleRetry}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重新获取
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
