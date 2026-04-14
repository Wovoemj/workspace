'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useCartStore, useUserStore } from '@/store'
import type { OrderItem } from '@/types'

export default function CartPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useUserStore()
  const { items, removeItem, updateQuantity, clearCart, getTotal, addItem } = useCartStore()

  const [submitting, setSubmitting] = useState(false)

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
    if (!user?.id) {
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
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">购物车</h1>
                <p className="text-gray-600 mt-2">提交订单会调用后端 `/api/orders` 创建订单（不包含真实支付）</p>
              </div>
              {isAuthenticated ? (
                <button onClick={onLogout} className="btn btn-outline">
                  退出登录
                </button>
              ) : null}
            </div>

            {!isAuthenticated ? (
              <div className="mt-6 card p-4 bg-white border border-gray-200 text-gray-700">
                请先 <Link href="/login" className="underline text-blue-600">登录</Link> 后查看购物车并提交订单
              </div>
            ) : items.length === 0 ? (
              <div className="mt-6 card p-6 text-gray-600">
                购物车为空?
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="btn btn-primary" onClick={onAddSample}>
                    添加示例商品
                  </button>
                  <Link href="/destinations" className="btn btn-outline">
                    去目的地列表
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <div className="space-y-3">
                  {items.map((it) => (
                    <div key={it.product_id} className="card p-4 bg-white">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <div className="font-semibold text-gray-900">{it.product_name}</div>
                          <div className="text-sm text-gray-600 mt-1">类型：{it.product_type}</div>
                          <div className="text-sm text-gray-600 mt-1">单价：¥{Number(it.unit_price).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="btn btn-outline"
                              onClick={() => updateQuantity(it.product_id, Math.max(1, it.quantity - 1))}
                            >
                              -
                            </button>
                            <div className="w-12 text-center text-gray-900 font-semibold">{it.quantity}</div>
                            <button
                              className="btn btn-outline"
                              onClick={() => updateQuantity(it.product_id, it.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">小计</div>
                            <div className="text-lg font-bold text-blue-600">¥{Number(it.total_price).toLocaleString()}</div>
                          </div>
                          <button className="btn btn-outline" onClick={() => removeItem(it.product_id)}>
                            移除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 card p-5 bg-white">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-sm text-gray-600">合计</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        ¥{Number(total).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <button className="btn btn-outline" onClick={clearCart}>
                        清空购物?
                      </button>
                      <button className="btn btn-primary" onClick={onCheckout} disabled={submitting}>
                        {submitting ? '提交中...' : '提交订单'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

