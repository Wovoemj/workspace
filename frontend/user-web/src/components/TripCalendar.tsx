'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

type TripItem = {
  id: number
  day_number: number
  title?: string
  location?: string
  destination?: {
    id: number
    name: string
    cover_image?: string | null
  }
}

type Trip = {
  start_date?: string | null
}

interface TripCalendarProps {
  trip: Trip
  items: TripItem[]
  onDayClick: (day: number) => void
  selectedDay: number
}

export function TripCalendar({ trip, items, onDayClick, selectedDay }: TripCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (trip.start_date) {
      return new Date(trip.start_date)
    }
    return new Date()
  })

  // 按天统计每天的项目数
  const dayItemCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const item of items) {
      const day = Number(item.day_number || 1)
      counts.set(day, (counts.get(day) || 0) + 1)
    }
    return counts
  }, [items])

  // 获取总天数
  const totalDays = useMemo(() => {
    if (!trip.start_date || !trip.end_date) {
      return items.length > 0 ? Math.max(...items.map(i => i.day_number)) : 0
    }
    const start = new Date(trip.start_date)
    const end = new Date(trip.end_date)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [trip, items])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const weekNames = ['日', '一', '二', '三', '四', '五', '六']

  // 计算行程开始日期对应的日历偏移
  const tripStartDate = trip.start_date ? new Date(trip.start_date) : new Date()
  const calendarStartDate = new Date(year, month, 1)

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  // 判断某一天是否在行程范围内
  function getDayInfo(day: number) {
    const tripDay = day - Math.floor((calendarStartDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24))
    if (tripDay >= 1 && tripDay <= totalDays) {
      const itemCount = dayItemCounts.get(tripDay) || 0
      return { isInTrip: true, tripDay, itemCount }
    }
    return { isInTrip: false, tripDay: 0, itemCount: 0 }
  }

  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-10" />)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const { isInTrip, tripDay, itemCount } = getDayInfo(day)
    const isSelected = isInTrip && tripDay === selectedDay
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()

    days.push(
      <button
        key={day}
        onClick={() => isInTrip && onDayClick(tripDay)}
        disabled={!isInTrip}
        className={`
          relative h-10 w-10 rounded-lg text-sm font-medium transition-all
          ${isInTrip 
            ? 'cursor-pointer hover:bg-sky-100' 
            : 'cursor-default text-gray-300'
          }
          ${isSelected 
            ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md' 
            : isInTrip 
              ? 'bg-sky-50 text-sky-700' 
              : ''
          }
          ${isToday && !isSelected ? 'ring-2 ring-sky-300' : ''}
        `}
      >
        {day}
        {isInTrip && itemCount > 0 && (
          <span className={`absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
            isSelected ? 'bg-white' : 'bg-sky-500'
          }`} />
        )}
        {isInTrip && (
          <span className={`absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] ${
            isSelected ? 'bg-white text-sky-600' : 'bg-indigo-500 text-white'
          }`}>
            {tripDay}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {/* 月份切换 */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-800">
          {year}年 {monthNames[month]}
        </h3>
        <button
          onClick={nextMonth}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {weekNames.map(week => (
          <div key={week} className="h-8 text-xs font-medium text-gray-500">
            {week}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>

      {/* 图例 */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          有行程
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-300" />
          无行程
        </div>
      </div>

      {/* 快速跳转 */}
      {totalDays > 0 && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-xs font-medium text-gray-500">快速跳转</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: Math.min(totalDays, 14) }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                onClick={() => onDayClick(day)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedDay === day
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                第{day}天
              </button>
            ))}
            {totalDays > 14 && (
              <span className="flex items-center text-xs text-gray-400">
                ...共{totalDays}天
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}