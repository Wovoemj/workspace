'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import type { User } from '@/types'
import type { Order } from '@/types'
import {
  ArrowRight,
  Bell,
  Bookmark,
  ChevronRight,
  ClipboardList,
  Copy,
  Footprints,
  Gift,
  Headphones,
  HelpCircle,
  Info,
  Loader2,
  MapPin,
  Maximize2,
  Settings,
  Share2,
  Sparkles,
  Ticket,
  UserCircle2,
  X,
} from 'lucide-react'
import { resolveCoverSrc, onImgErrorUseFallback } from '@/lib/media'

const ONBOARDING_KEY = 'profile_complete_profile_prompt_v1'

export type MobileFavoritePreview = {
  id: number
  name: string
  city: string
  province: string
  cover_image?: string | null
  rating?: number | null
  ticket_price?: number | null
}

export type MobileFootprint = {
  id: string
  destination: {
    id: number
    name: string
    city: string
    province: string
    cover_image?: string | null
    rating?: number | null
  }
  visitDate: string
  visitCount: number
}

export type MobileTab = 'favorite' | 'footprint' | 'messages' | 'orders' | 'coupons'

type MobileProfileProps = {
  user: User
  router: { push: (href: string) => void }
  counts: { trips: number; favorites: number; orders: number }
  countsLoading: boolean
  favoritesLoading: boolean
  favoritesAll: MobileFavoritePreview[]
  footprints: MobileFootprint[]
  footprintsLoading: boolean
  footprintTotal: number
  ordersAll: Order[]
  messagesUnread: number
  reviewCount: number
  couponCount: number
  onLogout: () => void
  onRefresh: () => Promise<void>
  onDeleteFootprint: (footprintId: string) => Promise<void>
}

function isGuestNickname(nickname: string | undefined) {
  const n = (nickname || '').trim()
  return !n || /^游客\d+$/.test(n)
}

function formatVisitLabel(iso: string) {
  if (!iso) return '?
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '?
  return `${d.getFullYear()}?{d.getMonth() + 1}?到访`
}

function levelFromUser(user: User) {
  const m = user.membership_level || 1
  return Math.min(12, Math.max(1, m * 3))
}

export function MobileProfile({
  user,
  router,
  counts,
  countsLoading,
  favoritesLoading,
  favoritesAll,
  footprints,
  footprintsLoading,
  footprintTotal,
  ordersAll,
  messagesUnread,
  reviewCount,
  couponCount,
  onLogout,
  onRefresh,
  onDeleteFootprint,
}: MobileProfileProps) {
  const [tab, setTab] = useState<MobileTab>('favorite')
  const tabWrapRef = useRef<HTMLDivElement>(null)
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [ptrDist, setPtrDist] = useState(0)
  const ptrStart = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFp = useRef<MobileFootprint | null>(null)

  const avatarInitial = user?.nickname?.trim()?.[0] || user?.phone?.trim()?.[0] || '?
  const avatarGradients = [
    'from-sky-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-orange-500',
    'from-violet-500 to-fuchsia-600',
  ]
  const avatarIdx = Math.abs((avatarInitial?.charCodeAt(0) || 0) % avatarGradients.length)
  const coverSrc = (d: { cover_image?: string | null }) => resolveCoverSrc(d?.cover_image)

  const cityCount = countUniqueCities(footprints)

  const tabs: Array<{ key: MobileTab; label: string; badge?: number }> = [
    { key: 'favorite', label: '收藏', badge: counts.favorites },
    { key: 'footprint', label: '足迹', badge: footprintTotal || footprints.length },
    { key: 'messages', label: '消息', badge: messagesUnread },
    { key: 'orders', label: '订单', badge: counts.orders },
        { key: 'coupons', label: '优惠?', badge: couponCount },
  ]

  const tabIndex = tabs.findIndex((t) => t.key === tab)

  useLayoutEffect(() => {
    const wrap = tabWrapRef.current
    const btn = tabBtnRefs.current[tabIndex]
    if (!wrap || !btn) return
    const wl = wrap.getBoundingClientRect().left
    const bl = btn.getBoundingClientRect()
    setIndicator({ left: bl.left - wl + 8, width: bl.width - 16 })
  }, [tab, tabIndex])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isGuestNickname(user.nickname)) return
    if (localStorage.getItem(ONBOARDING_KEY)) return
    const t = window.setTimeout(() => setOnboardingOpen(true), 400)
    return () => clearTimeout(t)
  }, [user.nickname])

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setOnboardingOpen(false)
  }

  const runRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await onRefresh()
            toast.success('已更?')
    } catch {
      toast.error('刷新失败')
    } finally {
      setRefreshing(false)
      setPtrDist(0)
    }
  }, [onRefresh, refreshing])

  const onCopyId = () => {
    const id = String(user.id || '')
    if (!id) return
    void navigator.clipboard.writeText(id).then(
            () => toast.success('ID 已复?'),
      () => toast.error('复制失败'),
    )
  }

  const onTouchStartPtr = (e: React.TouchEvent) => {
    const el = scrollRef.current
    if (!el || el.scrollTop > 0) return
    ptrStart.current = e.touches[0].clientY
  }

  const onTouchMovePtr = (e: React.TouchEvent) => {
    const el = scrollRef.current
    if (!el || el.scrollTop > 0) return
    const dy = e.touches[0].clientY - ptrStart.current
    if (dy > 0) setPtrDist(Math.min(dy * 0.45, 72))
  }

  const onTouchEndPtr = () => {
    if (ptrDist > 48) void runRefresh()
    setPtrDist(0)
  }

  const startLongPress = (fp: MobileFootprint) => {
    longPressFp.current = fp
    longPressTimer.current = setTimeout(() => {
      const ok = window.confirm(`删除?{fp.destination.name}」的这条足迹？`)
      if (ok) {
        void onDeleteFootprint(fp.id).then(
                    () => toast.success('已删?'),
          () => toast.error('删除失败'),
        )
      }
      longPressFp.current = null
    }, 520)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
    longPressFp.current = null
  }

  const clearCacheDemo = () => {
    try {
      const keys = Object.keys(localStorage).filter(
        (k) => !k.includes('auth_token') && !k.includes('user-storage') && !k.includes('persist'),
      )
      keys.forEach((k) => localStorage.removeItem(k))
    } catch {
      // ignore
    }
    toast.success('已清理本地缓存（保留登录状态）')
  }

  return (
    <div className="pb-8">

      <div className="relative overflow-hidden bg-gradient-to-b from-sky-100/90 via-white to-slate-50 pb-6 pt-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-sky-200/40 via-indigo-100/30 to-transparent" />

        <div className="relative px-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void runRefresh()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 active:scale-95 transition"
              aria-label="刷新"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 active:scale-95 transition"
                aria-label="设置"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className="relative shrink-0 outline-none"
              aria-label="查看头像"
            >
              <div
                className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${avatarGradients[avatarIdx]} text-white flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-white/80`}
              >
                {avatarInitial}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950 shadow">
                Lv.{levelFromUser(user)}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 truncate">
                                    {user.nickname?.trim() || '旅行?'}
                </h1>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  旅行达人
                </span>
                {isGuestNickname(user.nickname) ? (
                  <button
                    type="button"
                    onClick={() => router.push('/profile/edit')}
                    className="rounded-full bg-sky-600 px-2.5 py-0.5 text-[11px] font-semibold text-white active:scale-95"
                  >
                    去设?
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => router.push('/profile/edit')}
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-left active:bg-white"
              >
                <span className="text-sm text-slate-600">编辑资料</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  ID {String(user.id).slice(0, 8)}?
                  <button type="button" onClick={onCopyId} className="rounded p-0.5 text-sky-600" aria-label="复制 ID">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  {user.phone
                    ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
                                        : '未绑定手?'}
                </span>
              </div>

              <p className="mt-2 text-xs font-medium text-slate-600">
                {cityCount} 座城?· {counts.favorites} 条收?· {reviewCount} 条点?
              </p>
            </div>
          </div>
        </div>
      </div>


      <div className="sticky top-16 z-20 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div
          ref={tabWrapRef}
          className="relative flex gap-0 overflow-x-auto px-2 pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]"
        >
          {tabs.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => {
                tabBtnRefs.current[i] = el
              }}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex min-w-[4.5rem] shrink-0 flex-col items-center px-2 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'text-sky-700' : 'text-slate-500'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {t.label}
                {typeof t.badge === 'number' && t.badge > 0 ? (
                  <span className="min-w-[1.125rem] rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-tight text-white">
                    {t.badge > 99 ? '99+' : t.badge}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
          <span
            className="absolute bottom-0 h-0.5 rounded-full bg-sky-600 transition-all duration-300 ease-out"
            style={{ left: indicator.left, width: Math.max(indicator.width, 24) }}
          />
        </div>
      </div>


      {ptrDist > 8 ? (
        <div className="flex justify-center py-1 text-xs text-sky-600" style={{ height: ptrDist }}>
          {ptrDist > 48 ? '松开刷新' : '下拉刷新'}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-[50vh] px-4 pt-3"
        onTouchStart={onTouchStartPtr}
        onTouchMove={onTouchMovePtr}
        onTouchEnd={onTouchEndPtr}
      >
        {tab === 'favorite' && (
          <FavoriteTab
            loading={favoritesLoading}
            items={favoritesAll}
            router={router}
            coverSrc={coverSrc}
            emptyHref="/destinations"
          />
        )}
        {tab === 'footprint' && (
          <FootprintTab
            loading={footprintsLoading}
            footprints={footprints}
            total={footprintTotal}
            router={router}
            coverSrc={coverSrc}
            onLongPressStart={startLongPress}
            onLongPressEnd={cancelLongPress}
          />
        )}
        {tab === 'messages' && <MessagesTab unread={messagesUnread} router={router} />}
        {tab === 'orders' && (
          <OrdersTab loading={countsLoading} orders={ordersAll} router={router} />
        )}
        {tab === 'coupons' && <CouponsTab count={couponCount} router={router} />}
      </div>


      <div className="mx-4 mt-6 grid grid-cols-4 gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <Quick href="/orders" icon={ClipboardList} label="我的订单" />
                <Quick href="/cart" icon={Ticket} label="购物?" />
        <Quick href="/help" icon={Headphones} label="帮助反馈" />
        <Quick href="/about" icon={Info} label="关于我们" />
      </div>


      <div className="mx-4 mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">精选旅行灵</h2>
          <Link href="/destinations" className="text-xs font-medium text-sky-600">
            更多
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {[
            { t: '草原星空', s: '锡林郭勒 · 自驾', img: 'scenic_images/__auto__/placeholder.png' },
                        { t: '森林温泉', s: '兴安?· 慢旅?', img: 'scenic_images/__auto__/placeholder.png' },
            { t: '沙漠公路', s: '阿拉?· 出片', img: 'scenic_images/__auto__/placeholder.png' },
          ].map((c) => (
            <Link
              key={c.t}
              href="/destinations"
              className="relative w-40 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100"
            >
              <img
                src={resolveCoverSrc(c.img)}
                alt=""
                className="h-24 w-full object-cover"
                onError={onImgErrorUseFallback}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 text-white">
                <div className="text-xs font-bold">{c.t}</div>
                <div className="text-[10px] opacity-90">{c.s}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>


      {settingsOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40" role="dialog">
          <button type="button" className="min-h-0 flex-1" aria-label="关闭" onClick={() => setSettingsOpen(false)} />
          <div className="rounded-t-3xl bg-white p-4 pb-8 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">设置</h3>
              <button type="button" onClick={() => setSettingsOpen(false)} className="p-2 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 divide-y divide-slate-100">
              <SettingsRow
                icon={Bell}
                label="通知与消?
                onClick={() => {
                  setSettingsOpen(false)
                  router.push('/notifications')
                }}
              />
              <SettingsRow
                icon={HelpCircle}
                label="帮助与常见问?
                onClick={() => {
                  setSettingsOpen(false)
                  router.push('/help')
                }}
              />
              <SettingsRow
                icon={Share2}
                label="邀请好?
                                onClick={() => toast('邀请活动即将上?')}
              />
              <SettingsRow icon={Sparkles} label="清除缓存" onClick={clearCacheDemo} />
              <SettingsRow
                icon={Info}
                label="隐私政策"
                onClick={() => {
                  setSettingsOpen(false)
                  router.push('/help')
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false)
                onLogout()
              }}
              className="mt-4 w-full rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-700"
            >
              退出登?
            </button>
            <p className="mt-4 text-center text-[11px] text-slate-400">智旅助手 · v2.0</p>
          </div>
        </div>
      ) : null}


      {avatarOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-6" role="dialog">
          <button type="button" className="absolute inset-0" aria-label="关闭" onClick={() => setAvatarOpen(false)} />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div
              className={`flex h-40 w-40 items-center justify-center rounded-3xl bg-gradient-to-br ${avatarGradients[avatarIdx]} text-6xl font-bold text-white shadow-2xl`}
            >
              {avatarInitial}
            </div>
            <p className="text-sm text-white/90">点击背景关闭</p>
          </div>
        </div>
      ) : null}


      {onboardingOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-6" role="dialog">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <UserCircle2 className="h-10 w-10 shrink-0 text-sky-600" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">设置你的昵称与头</h3>
                <p className="mt-1 text-sm text-slate-600">
                  完善资料可解锁更多个性化推荐；完成资料还可领取专属优惠券（演示）?
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  dismissOnboarding()
                }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700"
              >
                稍后再说
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissOnboarding()
                  router.push('/profile/edit')
                }}
                className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white"
              >
                去完?
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function countUniqueCities(footprints: MobileFootprint[]) {
  const s = new Set<string>()
  for (const f of footprints) {
    const c = (f.destination.city || '').trim()
    if (c) s.add(c)
  }
  return s.size
}

function Quick({ href, icon: Icon, label }: { href: string; icon: typeof MapPin; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 rounded-xl py-2 text-center active:bg-slate-50">
      <Icon className="h-5 w-5 text-sky-600" />
      <span className="text-[11px] font-medium text-slate-700">{label}</span>
    </Link>
  )
}

function SettingsRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Settings
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3.5 text-left active:bg-slate-50">
      <Icon className="h-5 w-5 text-slate-500" />
      <span className="flex-1 text-sm text-slate-800">{label}</span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  )
}

function FavoriteTab({
  loading,
  items,
  router,
  coverSrc,
  emptyHref,
}: {
  loading: boolean
  items: MobileFavoritePreview[]
  router: { push: (href: string) => void }
  coverSrc: (d: { cover_image?: string | null }) => string
  emptyHref: string
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    )
  }
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
        <Bookmark className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-600">还没有收藏目的地</p>
        <Link href={emptyHref} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600">
          探索热门目的?
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => router.push(`/destinations/${f.id}`)}
          className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm"
        >
          <div className="relative aspect-[4/3] w-full">
            <img
              src={coverSrc(f)}
              alt={f.name}
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-active:scale-105"
              onError={onImgErrorUseFallback}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <div className="text-xs font-bold line-clamp-1">{f.name}</div>
              <div className="text-[10px] opacity-90 line-clamp-1">
                {f.city} · {f.province}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function FootprintTab({
  loading,
  footprints,
  total,
  router,
  coverSrc,
  onLongPressStart,
  onLongPressEnd,
}: {
  loading: boolean
  footprints: MobileFootprint[]
  total: number
  router: { push: (href: string) => void }
  coverSrc: (d: { cover_image?: string | null }) => string
  onLongPressStart: (fp: MobileFootprint) => void
  onLongPressEnd: () => void
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-20 w-28 shrink-0 animate-pulse rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-[75%] animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (!footprints.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
        <Footprints className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-600">还没去过任何地方</p>
        <Link href="/destinations" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600">
          探索热门目的?
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {footprints.map((p) => (
        <div
          key={p.id}
          className="flex gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-sm"
          onTouchStart={() => onLongPressStart(p)}
          onTouchEnd={onLongPressEnd}
          onTouchCancel={onLongPressEnd}
        >
          <button
            type="button"
            onClick={() => router.push(`/destinations/${p.destination.id}`)}
            className="flex min-w-0 flex-1 gap-3 text-left"
          >
            <img
              src={coverSrc(p.destination)}
              alt={p.destination.name}
              className="h-20 w-28 shrink-0 rounded-xl object-cover"
              onError={onImgErrorUseFallback}
            />
            <div className="min-w-0 flex-1 py-0.5">
              <div className="font-semibold text-slate-900 line-clamp-1">{p.destination.name}</div>
              <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                {p.destination.city} · {p.destination.province}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">{formatVisitLabel(p.visitDate)}</div>
              <div className="mt-1 text-[11px] font-medium text-sky-700">
                去过 {p.visitCount} ?
              </div>
            </div>
          </button>
        </div>
      ))}
      {total > footprints.length ? (
        <button
          type="button"
          onClick={() =>
            toast(`?${total} 条足迹，当前展示最?${footprints.length} 条`)
          }
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
        >
          查看全部足迹（{total}?
          <Maximize2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

function MessagesTab({ unread, router }: { unread: number; router: { push: (href: string) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">站内消息</div>
          <div className="mt-1 text-xs text-slate-500">
            {unread > 0 ? `未读 ${unread} 条` : '暂无未读'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/notifications')}
          className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white"
        >
          查看全部
        </button>
      </div>
      <p className="mt-4 text-xs text-slate-500">订单提醒、系统公告与活动通知会出现在这里</p>
    </div>
  )
}

function OrdersTab({
  loading,
  orders,
  router,
}: {
  loading: boolean
  orders: Order[]
  router: { push: (href: string) => void }
}) {
  if (loading) {
    return <div className="py-8 text-center text-sm text-slate-500">加载订单</div>
  }
  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
        <p className="text-sm text-slate-600">暂无订单</p>
        <button
          type="button"
          onClick={() => router.push('/cart')}
          className="mt-4 text-sm font-semibold text-sky-600"
        >
          去下?
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {orders.map((o: any) => (
        <div key={String(o.id)} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">订单?{o.order_no || '?}</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">¥{Number(o.total_amount || 0).toLocaleString()}</div>
          <div className="mt-1 text-xs text-slate-600">{o.status || '?}</div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => router.push('/orders')}
        className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-800"
      >
        订单中心
      </button>
    </div>
  )
}

function CouponsTab({ count, router }: { count: number; router: { push: (href: string) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md">
          <Gift className="h-6 w-6" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">我的优惠</div>
          <div className="mt-0.5 text-xs text-slate-600">
                        {count > 0 ? `可用 ${count} 张` : '暂无可用优惠?'}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          toast('领券中心即将上线')
          router.push('/destinations')
        }}
        className="mt-4 w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white active:scale-[0.99]"
      >
        去领?/ 看看目的?
      </button>
    </div>
  )
}
