'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudRain, CloudSnow, Sun, CloudLightning, Wind, Droplets, Thermometer, Loader2 } from 'lucide-react'

interface WeatherData {
  temperature: number
  feels_like: number
  condition: string
  condition_code: string
  humidity: number
  wind_direction: string
  wind_speed: number
  update_time: string
}

interface WeatherCardProps {
  city: string
  className?: string
}

// 天气图标映射
const getWeatherIcon = (condition: string, size: number = 24) => {
  const conditionLower = condition?.toLowerCase() || ''
  
  if (conditionLower.includes('晴') || conditionLower.includes('sun')) {
    return <Sun size={size} className="text-amber-500" />
  }
  if (conditionLower.includes('多云') || conditionLower.includes('cloudy') || conditionLower.includes('overcast')) {
    return <Cloud size={size} className="text-gray-400" />
  }
  if (conditionLower.includes('雨') || conditionLower.includes('rain')) {
    return <CloudRain size={size} className="text-blue-500" />
  }
  if (conditionLower.includes('雪') || conditionLower.includes('snow')) {
    return <CloudSnow size={size} className="text-cyan-300" />
  }
  if (conditionLower.includes('雷') || conditionLower.includes('thunder')) {
    return <CloudLightning size={size} className="text-purple-500" />
  }
  if (conditionLower.includes('雾') || conditionLower.includes('fog')) {
    return <Wind size={size} className="text-gray-400" />
  }
  // 默认
  return <Sun size={size} className="text-amber-500" />
}

// 天气背景色
const getWeatherBgClass = (condition: string) => {
  const conditionLower = condition?.toLowerCase() || ''
  
  if (conditionLower.includes('晴') || conditionLower.includes('sun')) {
    return 'from-amber-100 to-orange-50'
  }
  if (conditionLower.includes('多云') || conditionLower.includes('cloudy')) {
    return 'from-gray-100 to-slate-50'
  }
  if (conditionLower.includes('雨') || conditionLower.includes('rain')) {
    return 'from-blue-100 to-sky-50'
  }
  if (conditionLower.includes('雪') || conditionLower.includes('snow')) {
    return 'from-cyan-100 to-blue-50'
  }
  if (conditionLower.includes('雷') || conditionLower.includes('thunder')) {
    return 'from-purple-100 to-indigo-50'
  }
  return 'from-gray-100 to-slate-50'
}

export function WeatherCard({ city, className = '' }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!city) {
      setLoading(false)
      return
    }

    const fetchWeather = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
        const data = await res.json()
        
        if (data?.success && data?.weather) {
          setWeather(data.weather)
        } else {
          setWeather(null)
        }
      } catch (e) {
        console.error('获取天气失败:', e)
        setError('获取天气失败')
        setWeather(null)
      } finally {
        setLoading(false)
      }
    }

    // 防抖
    const timer = setTimeout(fetchWeather, 300)
    return () => clearTimeout(timer)
  }, [city])

  if (!city) return null

  // 加载中
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">加载天气...</span>
      </div>
    )
  }

  // 错误或无数据
  if (error || !weather) {
    return null // 不显示错误信息，保持界面整洁
  }

  return (
    <div 
      className={`rounded-xl bg-gradient-to-br ${getWeatherBgClass(weather.condition)} p-4 ${className}`}
    >
      <div className="flex items-start justify-between">
        {/* 温度和天气 */}
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.condition, 40)}
          <div>
            <div className="text-3xl font-bold text-gray-800">
              {weather.temperature}°
            </div>
            <div className="text-sm text-gray-600">
              {weather.condition}
            </div>
          </div>
        </div>
        
        {/* 详细信息 */}
        <div className="text-right text-sm text-gray-600 space-y-1">
          <div className="flex items-center justify-end gap-1">
            <Thermometer className="h-3 w-3" />
            <span>体感 {weather.feels_like}°</span>
          </div>
          <div className="flex items-center justify-end gap-1">
            <Droplets className="h-3 w-3" />
            <span>湿度 {weather.humidity}%</span>
          </div>
          <div className="flex items-center justify-end gap-1">
            <Wind className="h-3 w-3" />
            <span>{weather.wind_direction} {weather.wind_speed}级</span>
          </div>
        </div>
      </div>
      
      {/* 更新时间 */}
      <div className="mt-2 text-xs text-gray-400 text-right">
        更新时间：{weather.update_time}
      </div>
    </div>
  )
}

export default WeatherCard