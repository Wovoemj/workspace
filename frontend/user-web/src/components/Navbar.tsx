'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Search,
  MapPin,
  Calendar,
  User,
  Heart,
  ShoppingCart,
  Menu,
  X,
  Bell,
  LogIn,
  UserPlus,
  ChevronDown,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import { useUIStore, useCartStore, useUserStore } from '@/store'
import { GlobalSearch } from './GlobalSearch'

interface NavbarProps {
  className?: string
}

const mobileTitle = (pathname: string) => {
  const p = pathname || '/'
  if (p === '/' || p === '/home') return '发现旅程'
  if (p.startsWith('/destinations')) return '目的地'
  if (p.startsWith('/itineraries')) return '行程规划'
  if (p.startsWith('/assistant/settings')) return '智能体配置'
  if (p.startsWith('/assistant')) return 'AI 助手'
  if (p.startsWith('/profile')) return '我的'
  if (p.startsWith('/login')) return '登录'
  if (p.startsWith('/register')) return '注册'
  return '智能旅游助手'
}

export function Navbar({ className = '' }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { items } = useCartStore()
  const [isScrolled, setIsScrolled] = useState(false)
  const { user, isAuthenticated, logout } = useUserStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.total_price, 0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (!isAuthenticated || !user?.id) {
        setUnreadCount(0)
        return
      }
      try {
        const res = await fetch(
          `/api/notifications?user_id=${encodeURIComponent(user.id)}&is_read=false&per_page=1`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const data = await res.json()
        if (data?.success) {
          setUnreadCount(Number(data.total || 0))
        }
      } catch {
        // 静默失败：不阻塞导航条渲?
      }
    }
    fetchUnreadNotifications()
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!userMenuOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const el = userMenuRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [userMenuOpen])

  useEffect(() => {
    setUserMenuOpen(false)
  }, [pathname])

  const adminThreshold = Number(process.env.NEXT_PUBLIC_ADMIN_MEMBERSHIP_LEVEL || 9)
  const isAdmin = Boolean(isAuthenticated && user && Number(user.membership_level ?? 1) >= (Number.isFinite(adminThreshold) ? adminThreshold : 9))

  const navItems = [
    { href: '/', label: '首页', icon: MapPin },
    { href: '/destinations', label: '目的地', icon: MapPin },
    { href: '/travel-notes', label: '攻略', icon: BookOpen },
    { href: '/itineraries', label: '行程规划', icon: Calendar },
    { href: '/about', label: '关于我们', icon: Heart },
  ]

  return (
    <>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />
      )}


      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${className} ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'max-lg:travel-gradient-header max-lg:shadow-md lg:bg-white/90 lg:backdrop-blur-sm lg:shadow-sm'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            <div className="flex items-center min-w-0 shrink-0">
              <Link href="/" className="flex items-center space-x-2 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shrink-0 lg:from-blue-600 lg:to-purple-600 max-lg:from-white/25 max-lg:to-white/10 max-lg:border max-lg:border-white/30">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0 lg:hidden">
                  <span className="text-lg font-extrabold tracking-tight text-white drop-shadow-sm truncate">
                    {mobileTitle(pathname)}
                  </span>
                  <span className="text-[10px] font-medium text-white/85 truncate">Travel Assistant</span>
                </div>
                <span className={`hidden lg:inline text-xl font-bold transition-colors ${isScrolled ? 'text-gray-900' : 'text-gray-900'}`}>智能旅游助手</span>
              </Link>
            </div>


            <div className="hidden lg:flex items-center gap-2 flex-1 justify-center mx-4">
              {[
                { item: navItems[0], border: 'border-blue-200', bg: 'bg-blue-50', shadow: 'shadow-blue-200/50', icon: 'text-blue-500' },
                { item: navItems[1], border: 'border-emerald-200', bg: 'bg-emerald-50', shadow: 'shadow-emerald-200/50', icon: 'text-emerald-500' },
                { item: navItems[2], border: 'border-violet-200', bg: 'bg-violet-50', shadow: 'shadow-violet-200/50', icon: 'text-violet-500' },
                { item: navItems[3], border: 'border-amber-200', bg: 'bg-amber-50', shadow: 'shadow-amber-200/50', icon: 'text-amber-500' },
                { item: navItems[4], border: 'border-rose-200', bg: 'bg-rose-50', shadow: 'shadow-rose-200/50', icon: 'text-rose-500' },
              ].map(({ item, border, bg, shadow, icon }) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${border} ${bg} text-gray-700 hover:text-gray-900`}
                >
                  <item.icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${icon}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>


            <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
              <GlobalSearch />

              <Link href="/assistant" className="hidden lg:inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl shadow-[0_4px_14px_rgba(99,102,241,0.5)] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 ring-2 ring-indigo-400/60 hover:shadow-[0_6px_20px_rgba(99,102,241,0.7)] hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all">
                <Sparkles className="h-4 w-4 animate-pulse" />
                AI 助手
              </Link>


              <Link
                href="/notifications"
                className={`relative p-2 transition-colors ${
                  isScrolled
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>


              <Link
                href="/cart"
                className={`relative p-2 transition-colors ${
                  isScrolled
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>


              {!isAuthenticated ? (
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <Link
                    href="/login"
                    className={`inline-flex items-center justify-center gap-1 rounded-full border-2 px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm ${
                      pathname.startsWith('/login')
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200/60'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-sky-50 hover:text-blue-800'
                    }`}
                  >
                    <LogIn className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2.25} />
                    <span>登录</span>
                  </Link>
                  <Link
                    href="/register"
                    className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98] sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm ${
                      pathname.startsWith('/register')
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 ring-2 ring-coral-300/90 shadow-violet-600/35'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 shadow-blue-600/30 hover:brightness-110'
                    }`}
                  >
                    <UserPlus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2.25} />
                    <span>注册</span>
                  </Link>
                </div>
              ) : (
                <>
                  {(() => {
                    const avatarInitial = user?.nickname?.trim()?.[0] || user?.phone?.trim()?.[0] || '?'
                    const hasAvatar = Boolean(user?.avatar_url)
                    const bgClass = isScrolled
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-2 border-white shadow-lg'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-2 border-white/50 shadow-lg'
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`hidden sm:inline text-sm truncate max-w-[140px] transition-colors ${isScrolled ? 'text-gray-700' : 'text-gray-700'}`}>
                          你好，{user?.nickname || '用户'}
                        </span>

                        <div className="relative" ref={userMenuRef}>
                          <button
                            type="button"
                            onClick={() => setUserMenuOpen((v) => !v)}
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 overflow-hidden ${hasAvatar ? '' : bgClass}`}
                            aria-haspopup="menu"
                            aria-expanded={userMenuOpen}
                            aria-label="用户菜单"
                          >
                            {hasAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user?.avatar_url as string}
                                alt={user?.nickname || 'user'}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // 图片加载失败时显示文字头?
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.parentElement?.classList.add(bgClass)
                                }}
                              />
                            ) : (
                              <span className="text-lg text-white drop-shadow-md">{avatarInitial.slice(0, 1)}</span>
                            )}
                          </button>

                          {userMenuOpen && (
                            <div
                              className="absolute right-0 mt-2 w-56 rounded-2xl border border-border/60 bg-card/95 shadow-lg p-2 z-[60]"
                              role="menu"
                              aria-label="用户下拉菜单"
                            >
                              {isAdmin ? (
                                <Link
                                  href="/admin"
                                  role="menuitem"
                                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-card transition-colors"
                                  onClick={() => setUserMenuOpen(false)}
                                >
                                  <span className="text-sm font-semibold">后台管理</span>
                                  <ChevronDown className="h-4 w-4 opacity-60 rotate-[-90deg]" />
                                </Link>
                              ) : null}
                              <Link
                                href="/profile"
                                role="menuitem"
                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-card transition-colors"
                                onClick={() => setUserMenuOpen(false)}
                              >
                                <span className="text-sm font-semibold">个人中心</span>
                                <ChevronDown className="h-4 w-4 opacity-60 rotate-[-90deg]" />
                              </Link>
                              <Link
                                href="/orders"
                                role="menuitem"
                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-card transition-colors"
                                onClick={() => setUserMenuOpen(false)}
                              >
                                <span className="text-sm font-semibold">我的订单</span>
                                <ChevronDown className="h-4 w-4 opacity-60 rotate-[-90deg]" />
                              </Link>
                              <Link
                                href="/favorites"
                                role="menuitem"
                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-card transition-colors"
                                onClick={() => setUserMenuOpen(false)}
                              >
                                <span className="text-sm font-semibold">我的收藏</span>
                                <ChevronDown className="h-4 w-4 opacity-60 rotate-[-90deg]" />
                              </Link>

                              <button
                                type="button"
                                role="menuitem"
                                className="mt-1 flex w-full items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                                onClick={() => {
                                  logout()
                                  setUserMenuOpen(false)
                                  router.push('/')
                                }}
                              >
                                <span className="text-sm font-semibold">退出登录</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}


              <button
                onClick={toggleSidebar}
                className={`p-2 transition-colors lg:hidden ${
                  isScrolled
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>


      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">智能旅游助手</span>
            </Link>
            <button onClick={toggleSidebar}>
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleSidebar}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="space-y-2">
              <Link
                href="/assistant"
                onClick={toggleSidebar}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>AI 助手</span>
              </Link>
              <Link
                href="/profile"
                onClick={toggleSidebar}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="h-4 w-4" />
                <span>个人中心</span>
              </Link>
              <Link
                href="/orders"
                onClick={toggleSidebar}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span>我的订单</span>
              </Link>
              <Link
                href="/favorites"
                onClick={toggleSidebar}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Heart className="h-4 w-4" />
                <span>我的收藏</span>
              </Link>
              {!isAuthenticated ? (
                <div className="space-y-2 pt-2">
                  <Link
                    href="/login"
                    onClick={toggleSidebar}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 shadow-sm hover:border-blue-400 hover:bg-sky-50"
                  >
                    <LogIn className="h-4 w-4" />
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={toggleSidebar}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-md hover:brightness-110"
                  >
                    <UserPlus className="h-4 w-4" />
                    注册
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
