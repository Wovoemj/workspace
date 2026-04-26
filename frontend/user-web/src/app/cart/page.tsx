/**
 * =====================================================
 * 购物车页模块 - 旅行产品预订管理
 * =====================================================
 * 功能说明：
 *   - 购物车商品列表展示
 *   - 商品数量增减调整
 *   - 删除购物车商品
 *   - 清空购物车
 *   - 提交订单（创建订单）
 *
 * 依赖项：
 *   - components/Navbar：顶部导航栏
 *   - components/Footer：底部页脚
 *   - store/index：Zustand 购物车状态管理
 *   - lucide-react：图标库（内联 SVG）
 *   - react-hot-toast：消息提示
 *
 * 数据来源：
 *   - POST /api/orders：创建订单（需认证）
 *     - 参数：order_no, total_amount, payment_method, items[]
 *
 * 状态管理：
 *   - useCartStore：购物车状态
 *     - items：商品列表
 *     - addItem/removeItem/updateQuantity/clearCart
 *     - getTotal：计算总价
 *   - localStorage：JWT Token
 */
'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useCartStore, useUserStore } from '@/store'
import type { OrderItem } from '@/types'

// SVG 图标组件
const CartIcon = () => (
  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const PackageIcon = () => (
  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const MinusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function CartPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useUserStore()
  const { items, removeItem, updateQuantity, clearCart, getTotal, addItem } = useCartStore()

  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasAdminToken, setHasAdminToken] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHasAdminToken(!!localStorage.getItem('admin_token'))
  }, [])

  const isLoggedIn = isAuthenticated || hasAdminToken

  const total = useMemo(() => getTotal(), [items, getTotal])

  const onAddSample = () => {
    addItem({
      product_id: 'demo_exp_1',
      product_name: '示例：杭州周边体验',
      product_type: 'experience',
      quantity: 1,
      unit_price: 199,
    })
    toast.success('已加入示例到购物车')
  }

  const onCheckout = async () => {
    if (!mounted || !user?.id) {
      toast.error('请先登录')
      return
    }
    if (items.length === 0) {
      toast.error('购物车为空')
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      toast.error('未登录或 token 失效')
      router.push('/login')
      return
    }

    const authHeaders = { Authorization: `Bearer ${token}` }

    try {
      setSubmitting(true)
      const orderPayload = {
        order_no: `TA-${Date.now()}`,
        total_amount: total,
        payment_method: 'alipay',
        status: 'pending',
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_type: it.product_type,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
          booking_details: {},
        })),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      clearCart()
      toast.success('订单提交成功')
      router.push('/orders')
    } catch (e: any) {
      toast.error(e?.message || '提交订单失败')
    } finally {
      setSubmitting(false)
    }
  }

  const onLogout = () => {
    logout()
    toast.success('已退出登录')
    router.push('/')
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* 页面标题区 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <CartIcon />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              我的购物车
            </h1>
            <p className="text-gray-500 mt-2">管理您的旅行体验预订</p>
          </div>

          <div className="card-glass rounded-2xl p-6 sm:p-8">
            {/* 顶部操作栏 */}
            <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                  {items.length} 件商品
                </span>
              </div>
              {isLoggedIn && (
                <button 
                  onClick={onLogout} 
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                >
                  退出登录
                </button>
              )}
            </div>

            {/* 登录提示 */}
            {!mounted || !isLoggedIn ? (
              <div className="py-16 text-center">
                {!mounted ? (
                  <div className="animate-pulse">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CartIcon />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">登录后查看购物车</h3>
                    <p className="text-gray-500 mb-6">管理您的旅行体验，开始下一段精彩旅程</p>
                    <Link 
                      href="/login" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                      立即登录
                      <ArrowRightIcon />
                    </Link>
                  </>
                )}
              </div>
            ) : items.length === 0 ? (
              /* 空购物车 */
              <div className="py-16 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <PackageIcon />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">购物车空空如也</h3>
                <p className="text-gray-500 mb-8">还没有添加任何旅行体验，快去探索吧</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    onClick={onAddSample}
                  >
                    <PlusIcon />
                    添加示例商品
                  </button>
                  <Link 
                    href="/destinations" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all"
                  >
                    探索目的地
                    <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            ) : (
              /* 商品列表 */
              <div className="mt-6">
                <div className="space-y-4">
                  {items.map((it, index) => (
                    <div 
                      key={it.product_id} 
                      className="group relative bg-gradient-to-r from-white to-gray-50 rounded-xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* 商品类型标签 */}
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                          {it.product_type === 'experience' ? '体验' : it.product_type === 'hotel' ? '酒店' : '门票'}
                        </span>
                      </div>
                      
                      <div className="flex items-start justify-between gap-4 pr-20">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg leading-tight group-hover:text-indigo-700 transition-colors">
                            {it.product_name}
                          </h3>
                          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="text-gray-400">单价</span>
                              <span className="font-medium text-gray-700">¥{Number(it.unit_price).toLocaleString()}</span>
                            </span>
                          </div>
                        </div>
                        
                        {/* 数量控制 */}
                        <div className="flex items-center gap-4 mt-2 sm:mt-0">
                          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                            <button
                              className="p-2 hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition-colors rounded-l-lg disabled:opacity-50"
                              onClick={() => updateQuantity(it.product_id, Math.max(1, it.quantity - 1))}
                              disabled={it.quantity <= 1}
                            >
                              <MinusIcon />
                            </button>
                            <div className="w-12 text-center font-semibold text-gray-900 text-sm">
                              {it.quantity}
                            </div>
                            <button
                              className="p-2 hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition-colors rounded-r-lg"
                              onClick={() => updateQuantity(it.product_id, it.quantity + 1)}
                            >
                              <PlusIcon />
                            </button>
                          </div>
                          
                          {/* 小计 */}
                          <div className="text-right min-w-[80px]">
                            <div className="text-xs text-gray-400">小计</div>
                            <div className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                              ¥{Number(it.total_price).toLocaleString()}
                            </div>
                          </div>
                          
                          {/* 删除按钮 */}
                          <button 
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            onClick={() => {
                              removeItem(it.product_id)
                              toast.success('已移除')
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 订单摘要 */}
                <div className="mt-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-indigo-100">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <span className="text-sm">订单合计</span>
                        <span className="text-xs text-gray-400">（共 {items.length} 件）</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-gray-500">¥</span>
                        <span className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {Number(total).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 flex-wrap">
                      <button 
                        className="px-5 py-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 font-medium rounded-xl border border-gray-200 hover:border-red-200 transition-all flex items-center gap-2"
                        onClick={() => {
                          clearCart()
                          toast.success('购物车已清空')
                        }}
                      >
                        <TrashIcon />
                        清空购物车
                      </button>
                      <button 
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
                        onClick={onCheckout}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            提交中...
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon />
                            提交订单
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* 提示信息 */}
                <p className="mt-4 text-center text-xs text-gray-400">
                  提交订单将调用后端 API 创建订单（不包含真实支付）
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

