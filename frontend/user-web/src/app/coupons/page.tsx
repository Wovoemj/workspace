'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { 
  Ticket, 
  Gift, 
  ChevronRight, 
  Loader2, 
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Percent
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { couponApi } from '@/lib/api'

type Coupon = {
  id: number
  code: string
  name: string
  type: 'fixed' | 'percent'
  value: number
  min_order: number
  max_uses: number
  used_count: number
  start_date: string | null
  end_date: string | null
  status: string
}

type UserCoupon = {
  id: number
  coupon_id: number
  is_used: boolean
  used_at: string | null
  created_at: string
  coupon: Coupon
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '不限'
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function formatDiscount(coupon: Coupon) {
  if (coupon.type === 'fixed') {
    return `¥${coupon.value}`
  }
  return `${coupon.value}%`
}

export default function CouponsPage() {
  const { isAuthenticated, user } = useUserStore()
  const [activeTab, setActiveTab] = useState<'available' | 'my'>('available')
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<number | null>(null)

  const loadAvailable = useCallback(async () => {
    try {
      const res = await couponApi.available()
      if (res.success) {
        setAvailableCoupons(res.coupons || [])
      }
    } catch (e) {
      console.error('加载优惠券失败', e)
    }
  }, [])

  const loadMyCoupons = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await couponApi.my()
      if (res.success) {
        setMyCoupons(res.coupons || [])
      }
    } catch (e) {
      console.error('加载我的优惠券失败', e)
    }
  }, [isAuthenticated])

  useEffect(() => {
    setLoading(true)
    if (activeTab === 'available') {
      loadAvailable().finally(() => setLoading(false))
    } else {
      loadMyCoupons().finally(() => setLoading(false))
    }
  }, [activeTab, loadAvailable, loadMyCoupons])

  const handleClaim = async (couponId: number) => {
    if (!isAuthenticated) {
      toast.error('请先登录')
      return
    }
    setClaiming(couponId)
    try {
      const res = await couponApi.claim(couponId)
      if (res.success) {
        toast.success('领取成功')
        loadAvailable()
        loadMyCoupons()
      } else {
        toast.error(res.error || '领取失败')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || '领取失败')
    } finally {
      setClaiming(null)
    }
  }

  const renderCouponCard = (coupon: Coupon, isMyCoupon = false) => {
    const isExpired = coupon.end_date && new Date(coupon.end_date) < new Date()
    const isFull = coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses

    return (
      <div 
        key={coupon.id}
        className={`relative overflow-hidden rounded-2xl border ${
          isExpired || isFull 
            ? 'border-gray-200 bg-gray-50 opacity-75' 
            : 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50'
        }`}
      >
        <div className="flex items-stretch">
          {/* 左侧金额 */}
          <div className={`flex flex-col items-center justify-center px-6 py-4 ${
            isExpired || isFull ? 'bg-gray-100' : 'bg-orange-500'
          } text-white`}>
            <div className="flex items-baseline">
              {coupon.type === 'fixed' ? (
                <DollarSign className="h-5 w-5" />
              ) : (
                <Percent className="h-5 w-5" />
              )}
              <span className="text-3xl font-black">{coupon.value}</span>
              {coupon.type === 'percent' && <span className="text-lg">折</span>}
            </div>
            <span className="text-xs opacity-80">
              {coupon.min_order > 0 ? `满${coupon.min_order}可用` : '无门槛'}
            </span>
          </div>

          {/* 右侧信息 */}
          <div className="flex-1 p-4">
            <h3 className="font-bold text-gray-800">{coupon.name}</h3>
            <p className="mt-1 text-xs text-gray-500">
              有效期：{formatDate(coupon.start_date)} - {formatDate(coupon.end_date)}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">券码：{coupon.code}</span>
              {isMyCoupon ? (
                <span className={`text-xs font-medium ${
                  isExpired ? 'text-gray-400' : 'text-orange-600'
                }`}>
                  {isExpired ? '已过期' : '未使用'}
                </span>
              ) : (
                <button
                  onClick={() => handleClaim(coupon.id)}
                  disabled={claiming === coupon.id || isExpired || isFull}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    isExpired || isFull
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {claiming === coupon.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isExpired ? (
                    '已过期'
                  ) : isFull ? (
                    '已领完'
                  ) : (
                    '立即领取'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 装饰 */}
        <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
        <div className="absolute -right-2 bottom-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 left-0 h-80 w-80 rounded-full bg-amber-300/15 blur-3xl" />

      <Navbar />
      <main className="relative z-10 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4">
          {/* 标题 */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg">
              <Gift className="h-8 w-8 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-gray-900 via-orange-800 to-amber-900 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              领券中心
            </h1>
            <p className="mt-2 text-gray-600">领取优惠券，畅享优惠出行</p>
          </div>

          {/* Tab 切换 */}
          <div className="mb-6 flex rounded-2xl bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 rounded-xl py-3 text-center font-semibold transition-all ${
                activeTab === 'available'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Ticket className="mr-2 inline h-4 w-4" />
              可领取
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 rounded-xl py-3 text-center font-semibold transition-all ${
                activeTab === 'my'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              我的优惠券
            </button>
          </div>

          {/* 内容 */}
          {!isAuthenticated && activeTab === 'my' ? (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-12 text-center shadow-2xl backdrop-blur-md">
              <Gift className="mx-auto h-16 w-16 text-orange-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">登录后查看优惠券</h2>
              <p className="text-gray-600 mb-6">登录账号以查看和管理你的优惠券</p>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 font-semibold text-white shadow-lg hover:from-orange-600 hover:to-amber-600">
                去登录
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : activeTab === 'available' ? (
            <div className="space-y-4">
              {availableCoupons.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
                  <Ticket className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">暂无优惠券</p>
                </div>
              ) : (
                availableCoupons.map(c => renderCouponCard(c))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {myCoupons.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">还没有优惠券</p>
                  <button 
                    onClick={() => setActiveTab('available')}
                    className="text-orange-600 hover:underline"
                  >
                    去领取 →
                  </button>
                </div>
              ) : (
                myCoupons.map(uc => renderCouponCard(uc.coupon, true))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}