'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Loader2, Send, Sparkles, ShieldCheck, Mic, Paperclip, MapPin, Calendar, Plane, Lightbulb, CheckCircle2, Square } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'

type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  planTrip?: any
  planItems?: any[]
}

// ========== 行程规划输入解析函数 ==========
function parsePlannerInput(text: string) {
  let destination = ''
  let days = 3

  // 1. 优先匹配 "去XXX玩" / "去XXX旅行"
  const patternGo = text.match(/去([\u4e00-\u9fa5a-zA-Z0-9]{1,10})(?:玩|旅行|旅游)/)
  if (patternGo && patternGo[1]) {
    destination = patternGo[1].trim()
  }

  // 2. 匹配 "XXXN日游" 或 "XXXN天游" 格式
  if (!destination) {
    const tourMatch = text.match(/(\d+)\s*[日天]?/)
    if (tourMatch && tourMatch.index !== undefined) {
      const matchEnd = tourMatch.index
      const matchStart = Math.max(matchEnd - 1, 0)

      let start = matchStart
      while (start >= 0 && !/[\s？！?？、；;，,、]/.test(text[start])) {
        start--
      }
      start++

      let candidate = text.slice(start, matchEnd).trim()

      if (candidate.length > 4) {
        const chineseChars: string[] = []
        for (let i = candidate.length - 1; i >= 0 && chineseChars.length < 4; i--) {
          const code = candidate.charCodeAt(i)
          if (code >= 0x4e00 && code <= 0x9fa5) {
            chineseChars.unshift(candidate[i])
          } else {
            break
          }
        }
        candidate = chineseChars.join('')
      }
      candidate = candidate.replace(/^[帮我请让给咱生成计划请安排]/g, '').trim()
      candidate = candidate.replace(/^(一|几|这|那|该|这[份次个款项])/, '').trim()

      if (candidate.length >= 2) {
        destination = candidate
      }
    }
  }

  // 3. 匹配 "目的地是/：XX"
  if (!destination) {
    const patternDest = text.match(/目的地[是为\s]*([\u4e00-\u9fa5]+)/)
    if (patternDest && patternDest[1]) {
      destination = patternDest[1].trim()
    }
  }

  // 4. 匹配 "计划去XX" / "准备去XX"
  if (!destination) {
    const patternPlan = text.match(/(?:计划|准备|想要)[去]?([\u4e00-\u9fa5]+)/)
    if (patternPlan && patternPlan[1]) {
      destination = patternPlan[1].trim()
    }
  }

  // 天数提取 - 优先从"X日游/X天游"格式中提取
  const dayInTour = text.match(/(\d+)\s*[日天]?/)
  if (dayInTour) {
    days = Math.max(1, Math.min(14, parseInt(dayInTour[1])))
  } else {
    const dayMatch = text.match(/(\d+)\s*[日天]/)
    if (dayMatch) {
      days = Math.max(1, Math.min(14, parseInt(dayMatch[1])))
    }
  }

  // 预算提取
  const budgetMatch = text.match(/预算[是为\s等]*(\d+)|(\d+)\s*[元块RMB￥¥]?/)
  const budget = budgetMatch ? parseInt(budgetMatch[1] || budgetMatch[2]) : 0

  return {
    destination: destination.trim(),
    days,
    budget,
  }
}

// ========== 智能助手核心函数 ==========

const INTENT_PATTERNS = {
  itinerary: [/\d+[日天]/, /[日天]/, /行程/, /路线/, /攻略/, /规划/, /去.*?(?:玩|旅行|旅游)/, /计划/, /准备/, /想去/],
  budget: [/预算/, /费用/, /多少/, /贵不/, /人均/],
  weather: [/天气/, /气温/, /温度/, /下雨/],
  food: [/美食/, /好吃/, /餐厅/, /小吃/],
  transport: [/怎么去/, /交通/, /高铁/, /飞机/, /火车/],
  hotel: [/酒店/, /民宿/],
  attraction: [/景点/, /好玩/, /必去/, /打卡/],
}

function detectIntent(text: string) {
  const lowerText = text.toLowerCase()
  const matched: string[] = []

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const p of patterns) {
      if (p.test(text) || p.test(lowerText)) {
        matched.push(intent)
        break
      }
    }
  }

  const isPlanning = matched.includes('itinerary') || /\d+[日天]/.test(text)

  const missing: string[] = []
  if (isPlanning) {
    const { destination, days } = parsePlannerInput(text)
    if (!destination || destination.length < 2) missing.push('目的地')
    if (!days || days < 1) missing.push('天数')
  }

  return { intents: matched, isPlanning, missingInfo: missing }
}

// ========== 行程卡片可视化组件 ==========

type TripDay = {
  day: number
  date?: string
  city?: string
  theme?: string
  totalCost?: string
  morning?: TripActivity
  afternoon?: TripActivity
  evening?: TripActivity
  hotel?: string
  tips?: string[]
  publicTransport?: {
    bus?: string[]
    metro?: string[]
    taxi?: string
    rideShare?: string
  }
  nearbyRecommendations?: {
    restaurants?: Array<{
      name: string
      cuisine: string
      priceRange: string
      distance: string
      rating?: number
    }>
    attractions?: Array<{
      name: string
      type: string
      distance: string
      estimatedTime: string
    }>
    shopping?: Array<{
      name: string
      type: string
      distance: string
    }>
  }
  detailedSchedule?: Array<{
    time: string
    activity: string
    location: string
    notes?: string
  }>
  weather?: {
    condition: string
    temperature: string
    precipitation?: string
    wind?: string
  }
  food?: string[]
}

type TripActivity = {
  place?: string
  activity?: string
  duration?: string
  cost?: string
  food?: string[]
  transport?: string
  note?: string
  publicTransportDetails?: {
    bus?: Array<{
      route: string
      from: string
      to: string
      duration: string
      frequency: string
    }>
    metro?: Array<{
      line: string
      station: string
      direction: string
      duration: string
    }>
    walking?: string
    taxi?: {
      estimatedTime: string
      estimatedCost: string
    }
  }
  timeSlots?: Array<{
    startTime: string
    endTime: string
    activity: string
  }>
  bookingInfo?: {
    needsBooking: boolean
    bookingWebsite?: string
    ticketPrice?: string
    openingHours?: string
    contact?: string
  }
  facilities?: {
    parking?: string
    restroom?: string
    wifi?: string
    accessibility?: string
  }
  highlights?: string[]
}

function parseTripContent(content: string) {
  const days: TripDay[] = []

  const dayMatches = content.match(/(?:第[一二三四五六七八九十百\d]+天|第\d+天|Day\s*\d+|Day\s*[一二三四五六七八九十]+)/gi)
  if (!dayMatches || dayMatches.length === 0) return []

  const sections = content.split(/(?=第[一二三四五六七八九十百\d]+天|Day\s*\d+|Day\s*[一二三四五六七八九十]+)/gi)

  sections.forEach((section, idx) => {
    const dayMatch = section.match(/(?:第([一二三四五六七八九十百\d]+)天|第(\d+)天|Day\s*(\d+)|Day\s*([一二三四五六七八九十]+))/i)
    if (!dayMatch) return

    const cnNum: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
      '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
      '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20
    }

    let dayNum = 0
    if (dayMatch[1]) {
      dayNum = cnNum[dayMatch[1]] || parseInt(dayMatch[1]) || 0
    } else if (dayMatch[2]) {
      dayNum = parseInt(dayMatch[2])
    } else if (dayMatch[3]) {
      dayNum = parseInt(dayMatch[3])
    } else if (dayMatch[4]) {
      dayNum = cnNum[dayMatch[4]] || 0
    }

    if (!dayNum) dayNum = idx + 1

    const day: TripDay = { day: dayNum }

    const timeSlots = [
      {
        key: 'morning',
        patterns: [
          /上午[\s]*(.*?)(?=下午|中午|晚上|午餐|$)/i,
          /⏰[^\n]*?(?:上午|早晨)[\s]*(.*?)(?=\n|$)/i,
          /☀[^\n]*上午[^\n]*([^\n]+)/i,
        ]
      },
      {
        key: 'afternoon',
        patterns: [
          /下午[\s]*(.*?)(?=晚上|傍晚|$)/i,
          /⏰[^\n]*?(?:下午|午后)[\s]*(.*?)(?=\n|$)/i,
          /🌤[^\n]*下午[^\n]*([^\n]+)/i,
        ]
      },
      {
        key: 'evening',
        patterns: [
          /晚上[\s]*(.*?)(?=住宿|第\d+天|Day\s*\d+|温馨提示|$)/i,
          /🌙[^\n]*?(?:晚上|夜晚)[\s]*(.*?)(?=\n|$)/i,
          /🍜[^\n]*晚餐[^\n]*([^\n]+)/i,
        ]
      },
    ]

    for (const slot of timeSlots) {
      for (const pattern of slot.patterns) {
        const match = section.match(pattern)
        if (match && match[1]) {
          const activityText = match[1].trim()
          const transportMatch = activityText.match(/（[^）]+）/ )
          if (transportMatch) {
            const transportText = transportMatch[1]
            const timeMatch = transportText.match(/⏱️\s*(\d+[小时分钟]+)/i)
            const costMatch = transportText.match(/💰\s*([¥￥]?\d+)/i)

            const activity = parseActivity(activityText.replace(/（[^）]+）/g, '').trim())

            if (timeMatch) activity.duration = timeMatch[1]
            if (costMatch) activity.cost = costMatch[1]
            if (transportText.includes('乘坐') || transportText.includes('前往')) {
              activity.transport = transportText
            }

            if (slot.key === 'morning') day.morning = activity
            if (slot.key === 'afternoon') day.afternoon = activity
            if (slot.key === 'evening') day.evening = activity
          } else {
            if (slot.key === 'morning') day.morning = parseActivity(activityText)
            if (slot.key === 'afternoon') day.afternoon = parseActivity(activityText)
            if (slot.key === 'evening') day.evening = parseActivity(activityText)
          }
          break
        }
      }
    }

    const themeMatch = section.match(/【([^】]+)】[-\s]*([^\n]+)/)
    if (themeMatch) {
      day.city = themeMatch[1]
      day.theme = themeMatch[2].trim()
    }

    const cityMatch = section.match(/City[\s]*([^\n]+)/i)
    if (cityMatch && !day.city) {
      day.city = cityMatch[1].trim()
    }

    const costMatch = section.match(/💰\s*预估费用[\s]*([¥￥]?\d+(?:元)?)/i)
    if (costMatch) {
      day.totalCost = costMatch[1]
    }

    const hotelMatch = section.match(/🏨\s*住宿[\s]*([^\n]+)/i)
    if (hotelMatch) {
      day.hotel = hotelMatch[1].trim()
    }

    const foodMatch = section.match(/🍜\s*(?:午餐|晚餐|美食)[\s]*([^\n]+)/i)
    if (foodMatch) {
      day.food = foodMatch[1].split(/[，]/).map(f => f.trim()).filter(Boolean)
    }

    const tipsMatch = section.match(/(?:💡|小游碎碎念)[\s]*([\s\S]*?)(?=$|第\d+天|##)/i)
    if (tipsMatch) {
      day.tips = tipsMatch[1].split(/[！？\n]/).map(t => t.trim()).filter(Boolean).slice(0, 3)
    }

    if (!day.city) {
      const cityMatch2 = section.match(/【([^】]+)】/)
      if (cityMatch2) {
        day.city = cityMatch2[1]
      }
    }

    if (day.morning || day.afternoon || day.evening) {
      days.push(day)
    }
  })

  return days
}

function parseActivity(text: string) {
  const activity: TripActivity = {}

  const placeMatch = text.match(/([^\s,，]+(?:博物馆|寺|塔|山|湖|公园|广场|街|城|楼|阁|殿|馆|亭|峰|瀑|峡|岛|滩|泉|寨|洞|崖|谷|园|林|海|江|河|池|溪|岩|礁|墩))/)
  if (placeMatch) {
    activity.place = placeMatch[1]
  }

  const durationMatch = text.match(/(?:大约|时长|耗时)[\s]*(\d+[小时分钟]+)/i)
  if (durationMatch) {
    activity.duration = durationMatch[1]
  }

  const costMatch = text.match(/(?:大约|费用|人均|门票)[\s]*([¥￥]?\d+(?:元|块)?)/i)
  if (costMatch) {
    activity.cost = costMatch[1]
  }

  const foodMatches = text.match(/(?:美食)[\s]*(.*?)(?=$|,|，|。|；|\.)/i)
  if (foodMatches) {
    activity.food = foodMatches[1].split(/[，]/).map(f => f.trim()).filter(Boolean)
  }

  const transportMatch = text.match(/(?:交通|前往|乘坐|坐)[\s]*(.*?)(?=$|,|，|。|；|\.)/i)
  if (transportMatch) {
    activity.transport = transportMatch[1].trim()
  }

  const bookingMatch = text.match(/门票[\s]*([¥￥]?\d+(?:元|块)?)/i)
  if (bookingMatch) {
    activity.bookingInfo = {
      needsBooking: true,
      ticketPrice: bookingMatch[1]
    }
  }

  const busMatch = text.match(/公交[\s]*([^。？！；\n]+)/i)
  const metroMatch = text.match(/地铁[\s]*([^。？！；\n]+)/i)
  if (busMatch || metroMatch) {
    activity.publicTransportDetails = {
      bus: busMatch ? busMatch[1].split(/[，]/).map(r => ({
        route: r.trim(),
        from: '起点',
        to: '终点',
        duration: '约5分钟',
        frequency: '约10分钟/班'
      })) : undefined,
      metro: metroMatch ? metroMatch[1].split(/[，]/).map(r => ({
        line: r.trim(),
        station: '最近站点',
        direction: '未知方向',
        duration: '约10分钟'
      })) : undefined
    }
  }

  const highlightMatches = text.match(/特色[\s]*([^。？！；\n]+)/i)
  if (highlightMatches) {
    activity.highlights = highlightMatches[1].split(/[，]/).map(h => h.trim()).filter(Boolean)
  }

  activity.activity = text
    .replace(/([^\s,，]+(?:博物馆|寺|塔|山|湖|公园|广场|街|城|楼|阁|殿|馆|亭|峰|瀑|峡|岛|滩|泉|寨|洞|崖|谷|园|林|海|江|河|池|溪|岩|礁|墩))/g, '[$1]')
    .replace(/[¥￥]\d+(?:元|块)?/g, '')
    .replace(/(?:大约|时长|耗时)[\s]*\d+[小时分钟]+/gi, '')
    .replace(/(?:美食)[\s]*.*?(?=$|,|，|。|；|\.)/gi, '')
    .replace(/(?:交通|前往|乘坐|坐)[\s]*.*?(?=$|,|，|。|；|\.)/gi, '')
    .replace(/门票[\s]*.*?(?=$|,|，|。|；|\.)/gi, '')
    .replace(/公交[\s]*.*?(?=$|,|，|。|；|\.)/gi, '')
    .replace(/地铁[\s]*.*?(?=$|,|，|。|；|\.)/gi, '')
    .replace(/特色[\s]*.*?(?=$|,|，|。|；|\.)/gi, '')
    .replace(/\[|\]/g, '')
    .trim()

  return activity
}

function isTripContent(content: string) {
  const chineseDayPattern = /第[一二三四五六七八九十百\d]+天/
  const englishDayPattern = /Day\s*\d+/i
  const timeSlotPattern = /(?:上午|下午|早上|晚上|中午|傍晚)/i
  const activityPattern = /(?:景点|景区|博物馆|寺|塔|山|湖|公园|广场|街|城|楼|美食|住宿|酒店|民宿|交通|乘车|前往)/i
  const itineraryPattern = /(?:行程|规划|路线|攻略)/i

  if (content.length > 500) {
    const hasDayMarkers = chineseDayPattern.test(content) || englishDayPattern.test(content)
    const hasActivities = activityPattern.test(content) || timeSlotPattern.test(content)
    return hasDayMarkers && hasActivities
  }

  return (
    (chineseDayPattern.test(content) || englishDayPattern.test(content) || itineraryPattern.test(content)) &&
    (timeSlotPattern.test(content) || activityPattern.test(content))
  )
}

function ActivityDetails({ activity, timeSlot }: { activity: TripActivity, timeSlot: string }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-left flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-100 hover:border-blue-300 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold">{timeSlot === 'morning' ? '☀️' : timeSlot === 'afternoon' ? '🌤️' : '🌙'}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-800">{activity.place || '自由活动'}</div>
            {activity.activity && activity.activity !== activity.place && (
              <div className="text-xs text-gray-500 truncate">{activity.activity}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activity.duration && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              ⏱️ {activity.duration}
            </span>
          )}
          <span className="text-gray-400">
            {showDetails ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {showDetails && (
        <div className="mt-3 pl-11 pr-4 pb-3 bg-white border border-blue-100 rounded-xl shadow-sm">
          <div className="space-y-3">
            {activity.activity && activity.activity !== activity.place && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">活动内容</div>
                <div className="text-sm text-gray-700">{activity.activity}</div>
              </div>
            )}

            {activity.cost && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">费用</div>
                <div className="text-sm font-medium text-green-600">{activity.cost}</div>
              </div>
            )}

            {activity.transport && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">交通方式</div>
                <div className="text-sm text-gray-700">{activity.transport}</div>
              </div>
            )}

            {activity.food && activity.food.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">美食推荐</div>
                <div className="flex flex-wrap gap-1">
                  {activity.food.map((item, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-rose-50 text-rose-700 rounded-full">
                      🍜 {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activity.highlights && activity.highlights.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">特色亮点</div>
                <div className="flex flex-wrap gap-1">
                  {activity.highlights.map((highlight, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                      ✨{highlight}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function processMessageContent(content: string): React.ReactNode {
  const imageRegex = /@image:([^\s]+)/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>)
    }

    const imageName = match[1]
    parts.push(
      <div key={`image-${match.index}`} className="my-3">
        <div className="text-xs text-gray-500 mb-1">图片: {imageName}</div>
        <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500 text-sm">
          🖼️ 图片展示区域
          <div className="text-xs mt-1">(这里会显示 {imageName} 的图片)</div>
        </div>
      </div>
    )

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>)
  }

  if (parts.length === 0) {
    return content
  }

  return <>{parts}</>
}

function TripDayCard({ day }: { day: TripDay }) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="rounded-2xl border border-blue-100 bg-white overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div
        className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-5 py-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/25 flex items-center justify-center text-white font-bold shadow-inner">
              {day.day}
            </div>
            <div>
              <div className="text-white font-bold text-lg flex items-center gap-2">
                第{day.day}天
                <span className="text-white/80 text-sm">
                  {isExpanded ? '▲点击收起' : '▼点击展开'}
                </span>
              </div>
              {day.city && (
                <div className="text-blue-100 text-sm flex items-center gap-1">
                  <span className="opacity-80">📍</span>
                  <span>{day.city}</span>
                  {day.theme && <span className="text-blue-200">· {day.theme}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {day.totalCost && (
              <div className="text-right">
                <div className="text-xs text-blue-200 mb-1">当日费用</div>
                <div className="text-white font-semibold text-lg">{day.totalCost}</div>
              </div>
            )}
            <div className="text-white/80 text-lg">
              {isExpanded ? '▲' : '▼'}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-4">
          <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-600">📋</span>
                <div className="font-medium text-gray-800">当天行程概览</div>
              </div>
              <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                共{(day.morning ? 1 : 0) + (day.afternoon ? 1 : 0) + (day.evening ? 1 : 0)}个主要活动
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {day.morning && (
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-500">☀️</span>
                    <div className="text-xs font-medium text-gray-700">上午</div>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm truncate">{day.morning.place || '待安排'}</div>
                  {day.morning.activity && day.morning.activity !== day.morning.place && (
                    <div className="text-xs text-gray-500 truncate mt-1">{day.morning.activity}</div>
                  )}
                </div>
              )}
              {day.afternoon && (
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-orange-500">🌤️</span>
                    <div className="text-xs font-medium text-gray-700">下午</div>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm truncate">{day.afternoon.place || '待安排'}</div>
                  {day.afternoon.activity && day.afternoon.activity !== day.afternoon.place && (
                    <div className="text-xs text-gray-500 truncate mt-1">{day.afternoon.activity}</div>
                  )}
                </div>
              )}
              {day.evening && (
                <div className="bg-white rounded-lg p-3 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-indigo-500">🌙</span>
                    <div className="text-xs font-medium text-gray-700">晚上</div>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm truncate">{day.evening.place || '待安排'}</div>
                  {day.evening.activity && day.evening.activity !== day.evening.place && (
                    <div className="text-xs text-gray-500 truncate mt-1">{day.evening.activity}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {day.morning && <ActivityDetails activity={day.morning} timeSlot="morning" />}
          {day.afternoon && <ActivityDetails activity={day.afternoon} timeSlot="afternoon" />}
          {day.evening && <ActivityDetails activity={day.evening} timeSlot="evening" />}

          {day.hotel && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-blue-600">🏨</span>
                <div>
                  <div className="font-medium text-gray-800">住宿</div>
                  <div className="text-gray-600">{day.hotel}</div>
                </div>
              </div>
            </div>
          )}

          {day.tips && day.tips.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 text-lg mt-0.5">💡</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 mb-1.5">小游碎碎念</div>
                  <div className="space-y-1.5">
                    {day.tips.map((tip, idx) => (
                      <div key={idx} className="text-sm text-gray-600 leading-relaxed flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TripOverview({ days, destination }: { days: TripDay[], destination?: string }) {
  const totalActivities = days.reduce((acc, day) => {
    if (day.morning) acc++
    if (day.afternoon) acc++
    if (day.evening) acc++
    return acc
  }, 0)

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 mb-4 border border-blue-100">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white text-lg">🗺️</span>
        </div>
        <div>
          <div className="font-semibold text-gray-800">
            {destination || '行程概览'}
          </div>
          <div className="text-xs text-gray-500">
            {days.length}天 · {totalActivities} 个活动
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {days.slice(0, 5).map((day, idx) => (
          <div key={idx} className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
            第{day.day}天 {day.morning?.place?.slice(0, 4) || ''}
          </div>
        ))}
        {days.length > 5 && (
          <div className="px-3 py-1.5 bg-blue-100 rounded-full text-xs text-blue-600">
            +{days.length - 5}天
          </div>
        )}
      </div>
    </div>
  )
}

function TripCard({ content }: { content: string }) {
  const days = parseTripContent(content)

  if (days.length === 0) {
    if (content.includes('@image:')) {
      return <>{processMessageContent(content)}</>
    }
    return null
  }

  const destMatch = content.match(/(?:去|目的地[是为]?)[^，。]*(.{0,10}?(?:市|省|县|区|镇|岛|山)?)/i)
  const destination = destMatch ? destMatch[1] : undefined

  return (
    <div className="mt-4 space-y-4">
      <TripOverview days={days} destination={destination} />
      {days.map((day, idx) => (
        <TripDayCard key={idx} day={day} />
      ))}

      {content.includes('@image:') && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {processMessageContent(content)}
        </div>
      )}
    </div>
  )
}

const QUICK_SUGGESTIONS = {
  destination: ['杭州', '云南', '厦门', '成都', '西安'],
  days: [3, 5, 7],
  style: ['休闲游', '探险游', '亲子游', '美食之旅'],
}

function QuickFillButton({ label, value, onClick }: { label: string, value: string, onClick: (v: string) => void }) {
  return (
    <button
      onClick={() => onClick(value)}
      className="px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-600 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors"
    >
      {label}
    </button>
  )
}

function SmartPlannerHelper({
  input,
  onFill,
  onClear
}: {
  input: string
  onFill: (newInput: string) => void
  onClear: () => void
}) {
  const { isPlanning, missingInfo } = detectIntent(input)

  if (!isPlanning || missingInfo.length === 0) return null

  return (
    <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
      <div className="flex items-start gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-700 mb-1">
            💡 让我帮你完善行程信息
          </p>
          <p className="text-xs text-blue-600">
            缺少 <span className="font-medium">{missingInfo.join('、')}</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {missingInfo.includes('目的地') && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">想去哪里？</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.destination.map(d => (
                <QuickFillButton
                  key={d}
                  label={d}
                  value={`${d}${input.match(/\d+[日天]/)?.[0] || '3天'}`}
                  onClick={(v) => onFill(v)}
                />
              ))}
            </div>
          </div>
        )}

        {missingInfo.includes('天数') && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">玩几天？</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.days.map(d => (
                <QuickFillButton
                  key={d}
                  label={`${d}天`}
                  value={`${input} ${d}天`}
                  onClick={(v) => onFill(v)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onClear}
        className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        <span>取消</span>
      </button>
    </div>
  )
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type DestinationPreview = {
  id: number
  name: string
  city: string
  province: string
  cover_image?: string | null
  rating?: number | null
  ticket_price?: number | null
}

export default function AssistantPage() {
  const router = useRouter()

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('moonshot')
  const [selectedModel, setSelectedModel] = useState('kimi-k2.5')
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; createdAt: number; msgs: ChatMsg[] }>>([])
  const [sessionId, setSessionId] = useState<string>(() => uid())
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: uid(),
      role: 'assistant',
      content:
        '🎉 **你好呀！欢迎使用旅行助手！** 🎉\n\n' +
        '🌟 **我是「小游」**，你的专属旅行规划师，很期待为你服务～\n\n' +
        '🌍 **我能帮你做这些事**：\n' +
        '📅 **行程规划** - 想去哪里玩几天？告诉我，我来安排明明白白的行程！\n' +
        '🍜 **美食探索** - 本地人才知道的隐藏美食，我全知道！\n' +
        '🏨 **住宿推荐** - 选对酒店，旅行体验翻倍提升！\n' +
        '🚗 **交通导航** - 公共交通、自驾路线，我帮你规划！\n' +
        '💰 **预算控制** - 帮你精打细算，不花冤枉钱！\n\n' +
        '💬 **试试这样跟我说**：\n' +
        '1️⃣ "想去杭州3天，预算2000"\n' +
        '2️⃣ "周末去南京有什么好玩的"\n' +
        '3️⃣ "云南有什么特色美食推荐？"\n' +
        '4️⃣ "帮我规划一个3天的厦门之旅"\n\n' +
        '🎯 **或者直接说目的地，我来给你推荐**！\n\n' +
        '💡 **小贴士**：点击行程卡片可以展开更多详情，包括公共交通、附近美食、住宿建议等哦～',
      createdAt: Date.now(),
    },
  ])

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const [destPreview, setDestPreview] = useState<DestinationPreview[]>([])
  const [destPreviewLoading, setDestPreviewLoading] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const recognitionRef = useRef<any>(null)

  const [streamMsgId, setStreamMsgId] = useState<string | null>(null)
  const [streamText, setStreamText] = useState('')

  const [agentMode, setAgentMode] = useState(false)
  const [agentTools, setAgentTools] = useState<Array<{tool: string, label: string, status: 'thinking'|'done'}>>([])

  const [showPlannerHelper, setShowPlannerHelper] = useState(false)

  const CHAT_QUICK_ACTIONS = useMemo(
    () =>
      [
        { label: '景点推荐', prompt: '请根据「人少、拍照」偏好，推荐国内 3 个适合周末游的城市，每个城市给 2 个具体景点和游玩时长建议' },
        { label: '价格查询', prompt: '我想了解国内 5 日游大致预算区间（交通/住宿/门票/餐饮分项估算即可），并说明淡旺季差异' },
        { label: '签证办理', prompt: '如果去东南亚短途旅行，签证/入境材料一般有哪些？请按步骤列出清单，并提醒以使馆最新政策为准' },
        { label: '天气查询', prompt: '我计划4 月去云南 5 天，请按区域说明大致气温、降雨和穿衣建议，并提醒以当日预报为准' },
        { label: '交通攻略', prompt: '从杭州到黄山，列举高铁/大巴/自驾三种方式的大致耗时与优缺点，并给一条推荐路线' },
        { label: '住宿推荐', prompt: '在成都春熙路附近住2 晚，请说明选酒店时关注的要素（地铁距离、噪音、预算档），并给选房清单' },
        { label: '旅行清单', prompt: '帮我列一份「5 天国内游」行李与证件清单，按必备/可选分类' },
        { label: '当地习俗', prompt: '去少数民族地区或宗教场所参观，有哪些通用的礼仪与禁忌需要提前了解？' },
      ] as const,
    [],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any })
  }, [])

  useEffect(() => {
    if (!autoScrollEnabled) return
    const container = chatContainerRef.current
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [autoScrollEnabled, msgs.length, streamText.length, sending])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('assistant_sessions_v1')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const next = parsed
        .filter((s) => s && Array.isArray(s.msgs))
        .slice(0, 10)
        .map((s) => ({
          id: String(s.id || uid()),
          title: String(s.title || '对话'),
          createdAt: Number(s.createdAt || Date.now()),
          msgs: s.msgs as ChatMsg[],
        }))
      if (!next.length) return
      setSessions(next)
      const latest = next[0]
      setSessionId(latest.id)
      setMsgs(latest.msgs)
      setStreamMsgId(null)
      setStreamText('')
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!streamMsgId) return
    const full = msgs.find((m) => m.id === streamMsgId)?.content ?? ''
    if (!full) return
    if (streamText.length >= full.length) {
      setStreamMsgId(null)
      return
    }
    const step = full.length > 600 ? 12 : full.length > 200 ? 4 : 2
    const t = window.setTimeout(() => {
      setStreamText(full.slice(0, Math.min(full.length, streamText.length + step)))
    }, 14)
    return () => window.clearTimeout(t)
  }, [streamMsgId, streamText, msgs])

  function formatClock(ts: number) {
    try {
      return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const coverSrc = (d: { cover_image?: string | null }) => resolveCoverSrc(d?.cover_image)

  function buildSessionTitle(messages: ChatMsg[]) {
    const firstUser = messages.find((m) => m.role === 'user')
    const t = firstUser?.content?.trim() || '新对话'
    return t.length > 20 ? `${t.slice(0, 20)}…` : t
  }

  function persistSession(nextMsgs: ChatMsg[], title?: string) {
    const now = Date.now()
    const id = sessionId || uid()
    const nextTitle = title || buildSessionTitle(nextMsgs)
    const nextSession = { id, title: nextTitle, createdAt: now, msgs: nextMsgs }
    setSessionId(id)
    setSessions((prev) => {
      const merged = [nextSession, ...prev.filter((s) => s.id !== id)]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
      try {
        localStorage.setItem('assistant_sessions_v1', JSON.stringify(merged))
      } catch {
        // ignore
      }
      return merged
    })
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!cancelled) setBackendOk(res.ok)
      } catch {
        if (!cancelled) setBackendOk(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setDestPreviewLoading(true)
      try {
        const res = await fetch('/api/recommendations?limit=8', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && Array.isArray(data?.recommendations)) {
          setDestPreview(data.recommendations as DestinationPreview[])
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setDestPreviewLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending])

  function onPickAttachment() {
    fileInputRef.current?.click()
  }

  function onAttachmentChange(e: any) {
    const file = e?.target?.files?.[0]
    if (!file) return
    const next = input.trim()
      ? `${input}\n[附件] ${file.name}`
      : `[附件] ${file.name}`
    setInput(next)
    toast.success('已添加附件到对话（模拟）')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onToggleVoice() {
    if (recognizing) {
      try { recognitionRef.current?.stop?.() } catch { /* ignore */ }
      setRecognizing(false)
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('当前浏览器不支持语音输入（建议使用Chrome）')
      return
    }
    const recog = new SpeechRecognition()
    recognitionRef.current = recog
    recog.lang = 'zh-CN'
    recog.interimResults = true
    recog.maxAlternatives = 1
    recog.onstart = () => setRecognizing(true)
    recog.onend = () => setRecognizing(false)
    recog.onerror = () => setRecognizing(false)
    recog.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || ''
      }
      transcript = transcript.trim()
      if (transcript) setInput(transcript)
    }
    try { recog.start() } catch { toast.error('语音启动失败'); setRecognizing(false) }
  }

  async function onSendChat() {
    const text = input.trim()
    if (!text || sending) return
    setAutoScrollEnabled(true)
    setSending(true)
    const controller = new AbortController()
    setAbortController(controller)
    setInput('')
    setStreamMsgId(null)
    setStreamText('')

    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, createdAt: Date.now() }
    const nextMsgs = [...msgs, userMsg]
    setMsgs(nextMsgs)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMsgs.map(({ role, content }) => ({ role, content })),
          temperature: 0.7,
          max_tokens: 1200,
          provider: selectedProvider,
          model: selectedProvider === 'aws' ? selectedModel : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      const replyBody = data?.reply || '(模型未返回内容)'
      const assistantMsg: ChatMsg = { id: uid(), role: 'assistant', content: replyBody, createdAt: Date.now() }
      const finalMsgs = [...nextMsgs, assistantMsg]
      setMsgs(finalMsgs)
      if (replyBody.length > 0 && replyBody.length < 2400 && !replyBody.startsWith('调用后端')) {
        setStreamText('')
        setStreamMsgId(assistantMsg.id)
      } else {
        setStreamMsgId(null)
      }
      setBackendOk(true)
      persistSession(finalMsgs)
    } catch (e: any) {
      if (e?.name === 'AbortError') return

      let errorMessage = e?.message || '未知错误'
      let friendlyMessage = ''

      if (errorMessage.includes('缺少') && errorMessage.includes('API Key')) {
        friendlyMessage = `📱 **普通模式暂时不可用**\n\n由于缺少AI服务商的API密钥配置，普通聊天模式暂时无法使用。\n\n**你可以：**\n1. ✨**使用Agent模式** - 点击输入框左侧的闪电按钮切换到Agent模式\n2. 🔧 **配置API密钥** - 在.env 文件中配置至少一个AI服务商的API密钥\n\nAgent模式使用工具调用方式，能够提供更智能的旅行规划服务～`
      } else if (errorMessage.includes('HTTP 5')) {
        friendlyMessage = `😅 **服务暂时不可用**\n\nAI服务暂时繁忙或配置有问题，请稍后再试～\n\n**建议**\n1. ✨**切换到Agent模式** - 点击输入框左侧的闪电按钮\n2. ⏰**稍后重试** - 可能是临时网络问题\n3. 📋 **检查配置** - 确保AI服务商API密钥正确配置`
      } else {
        friendlyMessage = `调用后端 /api/chat 失败 ${errorMessage}\n\n**建议**\n1. ✨**切换到Agent模式** - 点击输入框左侧的闪电按钮\n2. 🔧 **检查后端配置** - 确保至少一个AI服务商的API密钥已正确配置\n3. 🌐 **检查网络连接** - 确保后端服务正常运行`
      }

      const assistantMsg: ChatMsg = {
        id: uid(), role: 'assistant',
        content: friendlyMessage,
        createdAt: Date.now(),
      }
      const finalMsgs = [...nextMsgs, assistantMsg]
      setMsgs(finalMsgs)
      setStreamMsgId(null)
      persistSession(finalMsgs, '对话失败重试')
    } finally {
      setSending(false)
      setAbortController(null)
    }
  }

  async function onSendAgent() {
    const text = input.trim()
    if (!text || sending) return
    setAutoScrollEnabled(true)
    setSending(true)
    const controller = new AbortController()
    setAbortController(controller)
    setInput('')
    setStreamMsgId(null)
    setStreamText('')
    setAgentTools([])

    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, createdAt: Date.now() }
    const nextMsgs = [...msgs, userMsg]
    setMsgs(nextMsgs)

    const assistantId = uid()
    const assistantMsg: ChatMsg = { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }
    const msgsWithAssistant = [...nextMsgs, assistantMsg]
    setMsgs(msgsWithAssistant)

    let accContent = ''

    try {
      const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'
      const res = await fetch(`${backendBase}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMsgs.map(({ role, content }) => ({ role, content })),
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const rawData = line.slice(6).trim()
          if (!rawData) continue

          let event: any
          try { event = JSON.parse(rawData) } catch { continue }

          if (event.type === 'content') {
            accContent += event.data
            setMsgs(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: accContent } : m
            ))
          } else if (event.type === 'thinking') {
            setAgentTools(prev => [...prev, { tool: event.tool, label: event.label, status: 'thinking' }])
          } else if (event.type === 'tool_result') {
            setAgentTools(prev => prev.map(t =>
              t.tool === event.tool && t.status === 'thinking' ? { ...t, status: 'done' } : t
            ))
          } else if (event.type === 'done') {
            break
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Agent 执行出错')
          }
        }
      }

      const finalContent = accContent || '(未收到回复)'
      setMsgs(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: finalContent } : m
      ))

      setBackendOk(true)
      persistSession([...nextMsgs, { ...assistantMsg, content: finalContent }])
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      const rawMsg: string = e?.message || '未知错误'
      const isAlreadyFriendly = !rawMsg.includes('Error code:') && !rawMsg.includes('{') && rawMsg.length < 120
      const errContent = isAlreadyFriendly
        ? `😅 ${rawMsg}`
        : `😅 AI 服务暂时繁忙，请稍后再试～`
      setMsgs(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: errContent } : m
      ))
    } finally {
      setSending(false)
      setAbortController(null)
      setTimeout(() => setAgentTools([]), 3000)
    }
  }

  async function onSendPlanner() {
    const text = input.trim()
    if (!text || sending) return

    setAutoScrollEnabled(true)
    setSending(true)
    setInput('')

    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, createdAt: Date.now() }
    const nextMsgs = [...msgs, userMsg]
    setMsgs(nextMsgs)

    const { destination, days, budget } = parsePlannerInput(text)

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      const errMsg: ChatMsg = {
        id: uid(), role: 'assistant',
        content: '需要登录才能生成行程哦。请先登录后再试～',
        createdAt: Date.now(),
      }
      setMsgs((s) => [...s, errMsg])
      setSending(false)
      return
    }

    try {
      const res = await fetch('/api/itinerary/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination: destination || undefined,
          days: days || 3,
          preferences: { travel_style: 'relaxation', interests: [] },
          budget_hint: budget || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      const assistantMsg: ChatMsg = {
        id: uid(), role: 'assistant',
        content: `✨行程已生成并保存！以下是「${data.trip?.title || '行程'}」概览👇`,
        createdAt: Date.now(),
        planTrip: data.trip,
        planItems: data.items || [],
      }
      setMsgs((s) => [...s, assistantMsg])
      toast.success('行程已保存到你的行程列表')
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      const assistantMsg: ChatMsg = {
        id: uid(), role: 'assistant',
        content: `行程生成失败 ${e?.message || '未知错误'}\n\n你可以换一种方式描述目的地和天数，比如"去杭州3天预算2000"`,
        createdAt: Date.now(),
      }
      setMsgs((s) => [...s, assistantMsg])
    } finally {
      setSending(false)
      setAbortController(null)
    }
  }

  function detectPlannerRequest(text: string): boolean {
    const plannerKeywords = [
      '规划', '行程', '计划', '安排', '游', '玩', '预算', '游玩', '旅游', '旅行',
      '路线', '攻略', '日程', '行程单', 'itinerary', 'planner', 'plan',
      '去', '走', '目的地', '天数', '人均'
    ]
    const lowerText = text.toLowerCase()
    return plannerKeywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase()) ||
      /\d+天|\d+日/.test(text) ||
      /预算.*\d+/.test(text) ||
      /去.+[游玩]/.test(text)
    )
  }

  async function onSend() {
    const text = input.trim()
    if (!text || sending) return

    if (agentMode) {
      await onSendAgent()
      return
    }

    if (detectPlannerRequest(text)) {
      await onSendPlanner()
    } else {
      await onSendChat()
    }
  }

  function resetConversation() {
    setMsgs([
      {
        id: uid(),
        role: 'assistant',
        content: '👋 你好呀！我是「小游」，你的专属旅行规划师～\n\n' +
          '我可以帮你做这些事🗺️：\n' +
          '📅 **行程规划** - 告诉我想去哪儿、玩几天，我来安排得明明白白！\n' +
          '🍜 **美食推荐** - 本地人才知道的好吃哒～\n' +
          '🏨 **住宿建议** - 选对酒店，旅行体验翻倍！\n' +
          '💰 **预算估算** - 帮你精打细算，不花冤枉钱\n\n' +
          '💡 **随便聊聊**：\n' +
          '- "想去杭州3天，预算2000"\n' +
          '- "周末去南京怎么玩？"\n' +
          '- "云南有什么好吃的"\n\n' +
          '📍 或者直接说目的地，我来给你推荐～',
        createdAt: Date.now(),
      },
    ])
    setStreamMsgId(null)
    setStreamText('')
    setInput('')
  }

  const groupedByDay = useMemo(() => {
    const map = new Map<number, any[]>()
    for (const it of msgs[msgs.length - 1]?.planItems || []) {
      const day = Number(it.day_number || 1)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(it)
    }
    const days = Array.from(map.keys()).sort((a, b) => a - b)
    return days.map((d) => ({
      day: d,
      items: (map.get(d) || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))
  }, [msgs])

  function formatTime(v: any) {
    if (!v) return null
    const s = String(v)
    return s.length >= 5 ? s.slice(0, 5) : s
  }

  const chatInputPlaceholder = '跟小游说说你想去哪儿玩～ 比如：杭州3天，预算2000，喜欢拍照'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/30">
      <Navbar />
      <main className="pt-16 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-400 shadow-lg shadow-blue-500/25">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                    🗺️ 小游旅行助手
                  </h1>
                  <p className="text-gray-500 text-sm mt-0.5">智能规划 · 美食推荐 · 预算估算 · 你的贴心旅行伙伴</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${backendOk ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                  <ShieldCheck className={`h-3.5 w-3.5 ${backendOk ? 'text-green-600' : 'text-gray-400'}`} />
                  {backendOk === null ? '检测中' : backendOk ? '后端正常' : '后端未连'}
                </div>
                <button
                  type="button"
                  className="btn btn-outline text-xs px-3 py-1.5 rounded-full hover:bg-blue-50"
                  onClick={() => setShowHistory(true)}
                >
                  历史对话
                </button>
              </div>
            </div>
          </div>

          {msgs.length <= 1 && (
            <div className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setInput('推荐几个适合拍照的国内城市')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">智能问答</h3>
                    <p className="text-blue-100 text-sm">解答旅行相关问题</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInput('想去杭州3天，预算2000，喜欢自然风光和美食')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">行程规划</h3>
                    <p className="text-emerald-100 text-sm">智能生成旅行路线</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInput('帮我规划一个周末南京行程')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/25 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">日程安排</h3>
                    <p className="text-violet-100 text-sm">2天短途旅行计划</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInput('云南5天游大概要花多少钱？')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/25 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                      <Plane className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">旅行建议</h3>
                    <p className="text-amber-100 text-sm">专业旅行咨询</p>
                  </div>
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  '去厦门3天预算2000',
                  '杭州3天亲子游',
                  '周末北京文化之旅',
                  '云南拍照打卡路线',
                  '日本7天自由行攻略',
                  '泰国美食之旅',
                  '海边度假推荐',
                  '冬季滑雪去哪'
                ].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setInput(hint)}
                    className="text-xs rounded-full bg-white border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all hover:shadow-sm"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl shadow-blue-500/5">
            <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <div className="text-white font-semibold">🗺️ 小游</div>
                  <div className="text-blue-100 text-xs">你的专属旅行规划师 · 在线</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={selectedProvider}
                    onChange={(e) => {
                      setSelectedProvider(e.target.value)
                      if (e.target.value === 'aws') {
                        setSelectedModel('amazon.titan-text-express-v1')
                      } else if (e.target.value === 'zhipu') {
                        setSelectedModel('glm-4.5-air')
                      } else if (e.target.value === 'moonshot') {
                        setSelectedModel('kimi-k2.5')
                      } else {
                        setSelectedModel('')
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-all cursor-pointer appearance-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <option value="moonshot" style={{ color: '#1e293b' }}>Moonshot AI</option>
                    <option value="zhipu" style={{ color: '#1e293b' }}>智谱 GLM-4</option>
                    <option value="aws" style={{ color: '#1e293b' }}>AWS Bedrock</option>
                    <option value="openai" style={{ color: '#1e293b' }}>OpenAI</option>
                  </select>

                  {selectedProvider === 'moonshot' && (
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-full bg-blue-500/30 text-white border border-blue-400/50 hover:bg-blue-500/40 transition-all cursor-pointer"
                    >
                      <option value="kimi-k2.5" style={{ color: '#1e293b' }}>🌙 Kimi K2.5</option>
                      <option value="moonshot-v1-8k" style={{ color: '#1e293b' }}>📄 v1-8k</option>
                      <option value="moonshot-v1-32k" style={{ color: '#1e293b' }}>📄 v1-32k</option>
                    </select>
                  )}

                  {selectedProvider === 'zhipu' && (
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/30 text-white border border-cyan-400/50 hover:bg-cyan-500/40 transition-all cursor-pointer"
                    >
                      <option value="glm-4.5-air" style={{ color: '#1e293b' }}>✨ GLM-4.5 Air</option>
                      <option value="glm-4.6v" style={{ color: '#1e293b' }}>👁️ GLM-4.6V (视觉)</option>
                    </select>
                  )}

                  {selectedProvider === 'aws' && (
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-full bg-amber-500/30 text-white border border-amber-400/50 hover:bg-amber-500/40 transition-all cursor-pointer"
                    >
                      <option value="amazon.titan-text-express-v1" style={{ color: '#1e293b' }}>🔷 Titan</option>
                      <option value="deepseek.deepseek-v3-0324" style={{ color: '#1e293b' }}>🟢 DeepSeek V3</option>
                      <option value="qwen.qwen3-32b" style={{ color: '#1e293b' }}>🟠 Qwen3 32B</option>
                      <option value="minimax.minimax-m2.5" style={{ color: '#1e293b' }}>🟣 MiniMax M2.5</option>
                    </select>
                  )}
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
                    onClick={resetConversation}
                  >
                    新对话
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[60vh] min-h-[400px] flex flex-col">
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-auto p-6 space-y-6 bg-gradient-to-b from-gray-50/80 via-white/90 to-blue-50/30"
                onScroll={(e) => {
                  const target = e.target as HTMLDivElement
                  const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50
                  if (isAtBottom) setAutoScrollEnabled(true)
                }}
              >
                {msgs.map((m, idx) => {
                  const displayContent =
                    m.role === 'assistant' && streamMsgId === m.id ? streamText || '\u00a0' : m.content
                  const showStreamCaret = m.role === 'assistant' && streamMsgId === m.id && streamText.length < m.content.length
                  const matched =
                    m.role === 'assistant'
                      ? destPreview
                          .filter((d) => {
                            const content = m.content || ''
                            return content.includes(d.name) || content.includes(d.city)
                          })
                          .slice(0, 2)
                      : []

                  return (
                    <div key={m.id} className="group/message">
                      <div className={`flex items-start gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'assistant' ? (
                        <div className="shrink-0 flex flex-col items-center pt-0.5">
                          <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-400 shadow-lg shadow-blue-500/25 group-hover/message:scale-105 transition-transform duration-300">
                            <Sparkles className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xs text-gray-500 mt-1.5 font-medium">小游</span>
                        </div>
                      ) : null}
                      <div
                        className={`max-w-[78%] px-6 py-5 leading-relaxed whitespace-pre-wrap shadow-sm transition-all duration-300 group-hover/message:shadow-md ${
                          m.role === 'user'
                            ? 'rounded-3xl rounded-br-sm bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                            : 'rounded-3xl rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm backdrop-blur-sm'
                        }`}
                      >
                          {m.role === 'assistant' && isTripContent(displayContent) && !m.planTrip ? (
                            <>
                              <TripCard content={displayContent} />
                            </>
                          ) : (
                            <div className="text-sm leading-relaxed tracking-wide text-gray-800">
                              {processMessageContent(displayContent)}
                              {showStreamCaret ? <span className="inline-block w-2 h-4 ml-0.5 align-[-2px] bg-blue-500/80 animate-pulse" /> : null}
                            </div>
                          )}

                          {m.role === 'assistant' && m.planTrip && m.planItems?.length ? (
                            <div className="mt-4 space-y-3">
                              {groupedByDay.map(({ day, items }) => (
                                <div key={`day-${day}`} className="rounded-xl border border-blue-100 bg-white/80 p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                      {day}
                                    </div>
                                    <span className="font-semibold text-gray-900 text-sm">第{day}天</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {items.map((it: any) => (
                                      <div key={it.id ?? `${it.title}-${it.sort_order}`} className="flex items-start gap-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-semibold text-gray-800 truncate">{it.title}</div>
                                          {(it.start_time || it.location) ? (
                                            <div className="text-xs text-gray-500 mt-0.5">
                                              {it.start_time ? `${formatTime(it.start_time)}` : ''}
                                              {it.location ? ` · ${it.location}` : ''}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              <div className="flex gap-2 pt-1">
                                <Link href="/itineraries" className="btn btn-outline text-xs py-1.5 flex-1 justify-center">
                                  <Calendar className="h-3.5 w-3.5 mr-1" />
                                  查看完整行程
                                </Link>
                                <button
                                  type="button"
                                  className="btn btn-outline text-xs py-1.5 flex-1 justify-center"
                                  onClick={() => {
                                    const last = msgs.filter((x) => x.role === 'user').pop()
                                    if (last) setInput(last.content)
                                  }}
                                >
                                  <Plane className="h-3.5 w-3.5 mr-1" />
                                  重新生成
                                </button>
                              </div>
                            </div>
                          ) : null}
                          <div className={`mt-1 text-[11px] opacity-70 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {formatClock(m.createdAt)}
                          </div>
                        </div>
                      </div>

                      {m.role === 'assistant' && matched.length ? (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {matched.map((d) => (
                              <Link
                                key={`cta-${d.id}`}
                                href={`/destinations/${d.id}`}
                                className="inline-flex items-center rounded-full bg-blue-600 text-white text-xs font-medium px-3 py-1 hover:bg-blue-700 transition-colors"
                              >
                                查看{d.name}详情
                              </Link>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 mb-2">{destPreviewLoading ? '识别中' : '相关目的地'}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {matched.map((d) => (
                              <Link
                                key={d.id}
                                href={`/destinations/${d.id}`}
                                className="group flex gap-3 items-center rounded-lg border border-gray-200 bg-white px-2 py-2 hover:shadow-sm transition"
                              >
                                <img src={coverSrc(d)} alt={d.name} loading="lazy" onError={onImgErrorUseFallback}
                                  className="w-16 h-12 rounded-md object-cover flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{d.name}</div>
                                  <div className="text-xs text-gray-600 truncate">{d.city} · {d.province}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}

                {sending ? (
                  <div className="flex justify-start items-end gap-3">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25 animate-pulse">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs text-gray-400 mt-1">小游</span>
                    </div>
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-800 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-blue-700">🤔 让我想想</span>
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>

              {input.length > 3 && (
                <SmartPlannerHelper
                  input={input}
                  onFill={(newInput) => {
                    setInput(newInput)
                    setShowPlannerHelper(false)
                  }}
                  onClear={() => {
                    setShowPlannerHelper(false)
                  }}
                />
              )}

              <div className="border-t border-gray-100 bg-gradient-to-b from-white to-blue-50/50 px-6 py-5">
                {agentTools.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {agentTools.map((t, i) => (
                      <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        t.status === 'thinking'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse'
                          : 'bg-green-50 text-green-600 border border-green-200'
                      }`}>
                        {t.status === 'thinking' ? (
                          <div className="h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>✅</span>
                        )}
                        {t.label}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200">
                  <div className="flex items-center gap-2 pl-3">
                    <button type="button" className="btn btn-ghost w-10 h-10 rounded-full justify-center hover:bg-blue-50 transition-colors hover:scale-105" onClick={onPickAttachment} aria-label="上传图片">
                      <Paperclip className="h-5 w-5 text-gray-500" />
                    </button>
                    <button type="button" className={`btn btn-ghost w-10 h-10 rounded-full justify-center transition-colors hover:scale-105 ${recognizing ? 'text-blue-600 bg-blue-50' : 'hover:bg-blue-50'}`} onClick={onToggleVoice} aria-label="语音输入">
                      <Mic className={`h-5 w-5 ${recognizing ? 'animate-pulse text-blue-600' : 'text-gray-500'}`} />
                    </button>

                    <button
                      type="button"
                      title={agentMode ? '当前：Agent模式（AI会主动调用工具）' : '当前：普通模式（点击开启Agent模式）'}
                      onClick={() => setAgentMode(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 ${
                        agentMode
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm shadow-purple-200'
                          : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50 border border-gray-200'
                      }`}
                    >
                      <span className="text-sm">✨</span>
                      <span className="hidden sm:inline">{agentMode ? 'Agent模式' : 'Agent模式'}</span>
                    </button>
                  </div>

                  <input
                    className="flex-1 bg-transparent text-sm py-4 pr-2 outline-none placeholder-gray-500 placeholder:font-normal"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      const { isPlanning, missingInfo } = detectIntent(e.target.value)
                      if (isPlanning && missingInfo.length > 0) {
                        setShowPlannerHelper(true)
                      } else {
                        setShowPlannerHelper(false)
                      }
                    }}
                    placeholder={agentMode ? '⚡Agent模式：AI会主动查天气、搜景点、生成行程...' : chatInputPlaceholder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
                    }}
                  />

                  {sending && abortController && (
                    <button
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:shadow-lg transition-all mr-1"
                      onClick={() => abortController.abort()}
                      title="停止生成"
                    >
                      <Square className="h-5 w-5" />
                    </button>
                  )}

                  <button
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all mr-1 ${
                      agentMode
                        ? 'bg-gradient-to-r from-violet-600 to-purple-500'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                    }`}
                    disabled={!canSend}
                    onClick={onSend}
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-2 text-center text-xs text-gray-400">
                  {agentMode
                    ? '⚡Agent模式已开启 · AI会自动调用天气、景点、行程等工具获取真实数据'
                    : '⏎ Enter 发送，Shift + Enter 换行 · 小游会主动帮你完善行程信息 💡'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {showHistory ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">对话历史</h2>
                    <div className="text-sm text-gray-600 mt-1">本地保存，刷新不丢失</div>
                  </div>
                </div>
              </div>
              <button className="btn btn-outline rounded-full px-4 py-2" type="button" onClick={() => setShowHistory(false)}>关闭</button>
            </div>
            <div className="mt-4 space-y-3 max-h-[50vh] overflow-auto pr-2">
              {sessions.length ? sessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all duration-200"
                  onClick={() => {
                    setMsgs(s.msgs); setSessionId(s.id); setStreamMsgId(null); setStreamText(''); setShowHistory(false)
                  }}
                  role="button">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate text-lg">{s.title}</div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(s.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-xs text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded-full inline-block">
                        {s.msgs.length} 条消息
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline rounded-full px-3 py-1.5 text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = sessions.filter((x) => x.id !== s.id)
                        setSessions(next)
                        try { localStorage.setItem('assistant_sessions_v1', JSON.stringify(next)) } catch { /* ignore */ }
                      }}>
                      删除
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                  <div className="mx-auto w-fit rounded-full bg-blue-100 p-3 text-blue-600">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <div className="mt-4 text-gray-700 font-medium">暂无历史对话</div>
                  <div className="text-sm text-gray-500 mt-1">开始对话后，历史记录将自动保存</div>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3 flex-wrap">
              <button className="btn bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-full px-6 py-3" type="button"
                onClick={() => {
                  resetConversation()
                  setShowHistory(false)
                }}>
                开始新对话
              </button>
              <button className="btn btn-outline rounded-full px-6 py-3" type="button"
                onClick={() => {
                  if (sessions.length > 0) {
                    setSessions([])
                    try { localStorage.removeItem('assistant_sessions_v1') } catch { /* ignore */ }
                  }
                }}>
                清空所有历史
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}