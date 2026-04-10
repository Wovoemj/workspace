/* eslint-disable react/no-unknown-property */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import { Calendar, Heart, Home, MapPinned, Search, User } from 'lucide-react'

type TabKey = 'home' | 'destinations' | 'itineraries' | 'assistant' | 'favorites' | 'profile'

const getActiveKey = (pathname: string): TabKey => {
  const p = pathname || '/'
  if (p === '/' || p === '/home') return 'home'
  if (p.startsWith('/destinations')) return 'destinations'
  if (p.startsWith('/itineraries')) return 'itineraries'
  if (p.startsWith('/assistant')) return 'assistant'
  if (p.startsWith('/favorites')) return 'favorites'
  if (p.startsWith('/profile')) return 'profile'
  return 'home'
}

type TabDef = {
  key: TabKey
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

export function MobileTabs() {
  const pathname = usePathname()
  const active = getActiveKey(pathname)

  const beforeHome: TabDef[] = [
        { key: 'destinations', href: '/destinations', label: '目的?', icon: MapPinned },
    { key: 'itineraries', href: '/itineraries', label: '行程', icon: Calendar },
  ]
  const afterHome: TabDef[] = [
    { key: 'assistant', href: '/assistant', label: 'AI', icon: Search },
    { key: 'favorites', href: '/favorites', label: '收藏', icon: Heart },
    { key: 'profile', href: '/profile', label: '我的', icon: User },
  ]

  function renderSideItem(t: TabDef) {
    const Icon = t.icon
    const isActive = t.key === active
    return (
      <Link
        key={t.key}
        href={t.href}
        className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 pb-1 max-w-[20vw] ${
          isActive ? 'text-blue-600' : 'text-slate-400'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={`h-[20px] w-[20px] ${isActive ? 'text-blue-600 drop-shadow-sm stroke-[2.5]' : 'text-slate-400 stroke-2'}`} />
        <span
          className={`max-w-full truncate px-0.5 text-[9px] sm:text-[10px] leading-tight ${
            isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
          }`}
        >
          {t.label}
        </span>
        {isActive ? <span className="h-0.5 w-7 rounded-full bg-gradient-to-r from-blue-600 to-sky-500" /> : <span className="h-0.5 w-7" />}
      </Link>
    )
  }

  const homeActive = active === 'home'

  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="border-t border-slate-200/80 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <nav className="flex h-[60px] items-end justify-between px-1">
          <div className="flex flex-1">{beforeHome.map(renderSideItem)}</div>

          <div className="relative flex w-[64px] sm:w-[72px] shrink-0 flex-col items-center">
            <Link
              href="/"
              className={`absolute -top-6 flex h-[48px] w-[48px] sm:h-[52px] sm:w-[52px] items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-600 via-sky-500 to-emerald-500 text-white shadow-lg shadow-blue-600/35 transition-transform active:scale-95 ${
                homeActive ? 'ring-2 ring-coral-400 ring-offset-2' : ''
              }`}
              aria-current={homeActive ? 'page' : undefined}
            >
              <Home className="h-6 w-6" strokeWidth={2.5} />
            </Link>
            <span
              className={`mb-0.5 mt-8 text-[10px] ${homeActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'}`}
            >
              首页
            </span>
          </div>

          <div className="flex flex-1">{afterHome.map(renderSideItem)}</div>
        </nav>
      </div>
    </div>
  )
}
