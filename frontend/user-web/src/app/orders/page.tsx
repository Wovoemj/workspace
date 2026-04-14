'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, CreditCard, Calendar, Clock, MapPin, Package, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import type { Order } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'


const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        pending: { label: '待支？', color: 'text-orange-500 bg-orange-50', icon: <CreditCard className="h-4 w-4" /> },
        paid: { label: '已支？', color: 'text-green-500 bg-green-50', icon: <CheckCircle className="h-4 w-4" /> },
        cancelled: { label: '已取？', color: 'text-gray-500 bg-gray-50', icon: <XCircle className="h-4 w-4" /> },
        refunded: { label: '已退？', color: 'text-blue-500 bg-blue-50', icon: <RefreshCw className="h-4 w-4" /> },
}

export default function OrdersPage() {
  const router = useRouter()
  const { isAuthenticated, logout } = useUserStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated) {
        setOrders([])
        setLoading(false)
        return
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        router.push('/login')
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 401) {
          router.push('/login')
          return
        }
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
        setOrders((data?.orders ?? []) as Order[])
      } catch (e: any) {
        toast.error(e?.message || '加载订单失败')
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const onLogout = () => {
    logout()
                toast.success('已退出登？')
    router.push('/')
  }

  // 支付订单
  const handlePay = async (orderId: string) => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('请先登录')
      router.push('/login')
      return
    }

    setPayingOrderId(orderId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: 'alipay' }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '支付请求失败')
      }

      // 模拟支付流程：直接调用回调完成支?
      const payRes = await fetch(`${API_BASE_URL}${data.payment.pay_url}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_no: data.payment.order_no }),
      })
      const payData = await payRes.json().catch(() => ({}))

      if (payData?.success) {
                                toast.success('支付成功？')
        // 刷新订单列表
        const refreshRes = await fetch(`${API_BASE_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } })
        const refreshData = await refreshRes.json().catch(() => ({}))
        if (refreshData?.success) {
          setOrders(refreshData.orders)
        }
      } else {
        throw new Error(payData?.error || '支付失败')
      }
    } catch (e: any) {
      toast.error(e?.message || '支付失败')
    } finally {
      setPayingOrderId(null)
    }
  }

  // 取消订单
  const handleCancel = async (orderId: string) => {
                if (!confirm('确定要取消这个订单吗？')) return

    const token = localStorage.getItem('auth_token')
    if (!token) return

    setCancellingOrderId(orderId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '取消失败')
      }

                        toast.success('订单已取？')
      // 刷新订单列表
      const refreshRes = await fetch(`${API_BASE_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } })
      const refreshData = await refreshRes.json().catch(() => ({}))
      if (refreshData?.success) {
        setOrders(refreshData.orders)
      }
    } catch (e: any) {
      toast.error(e?.message || '取消失败')
    } finally {
      setCancellingOrderId(null)
    }
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">我的订单</h1>
                <p className="text-gray-600 mt-2">订单来自后端 `/api/orders`</p>
              </div>
              {isAuthenticated ? (
                <button onClick={onLogout} className="btn btn-outline">
                  退出登?
                </button>
              ) : null}
            </div>

            {!isAuthenticated ? (
              <div className="mt-6 card p-4 bg-white border border-gray-200 text-gray-700">
                请先 <Link href="/login" className="underline text-blue-600">登录</Link> 后查看订单?
              </div>
            ) : (
              <div className="mt-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600">加载订单?..</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="card p-8 text-center text-gray-600 bg-white">
                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>暂无订单</p>
                    <Link href="/products" className="text-blue-600 hover:underline mt-2 inline-block">
                      去逛逛商?
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((o) => {
                      const statusInfo = statusMap[o.status] || { label: o.status, color: 'text-gray-500 bg-gray-50', icon: null }
                      return (
                        <div key={o.id} className="card p-5 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">

                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-500">订单号：{o.order_no}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                  {statusInfo.icon}
                                  {statusInfo.label}
                                </span>
                              </div>
                              <div className="text-gray-900 font-bold text-lg mt-1">
                                ¥{Number(o.total_amount || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              {o.created_at ? new Date(o.created_at).toLocaleString('zh-CN') : ''}
                            </div>
                          </div>


                          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                            {(o.items || []).map((it: any) => (
                              <div key={it.id || it.product_id} className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{it.product_name}</div>
                                  <div className="text-sm text-gray-500 mt-0.5">
                                    {it.product_type === 'ticket' ? '门票' : it.product_type} · x{it.quantity}
                                  </div>

                                  {it.booking_details && (
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                      {it.booking_details.date && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded">
                                          <Calendar className="h-3 w-3" />
                                          {it.booking_details.date}
                                        </span>
                                      )}
                                      {it.booking_details.time_slot && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded">
                                          <Clock className="h-3 w-3" />
                                          {it.booking_details.time_slot}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="font-semibold text-gray-900">
                                  ¥{Number(it.total_price || 0).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>


                          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                            {o.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleCancel(o.id)}
                                  disabled={cancellingOrderId === o.id}
                                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                                >
                                  {cancellingOrderId === o.id ? (
                                    <span className="flex items-center gap-1">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      取消?..
                                    </span>
                                  ) : (
                                    '取消订单'
                                  )}
                                </button>
                                <button
                                  onClick={() => handlePay(o.id)}
                                  disabled={payingOrderId === o.id}
                                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
                                >
                                  {payingOrderId === o.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      支付?..
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="h-4 w-4" />
                                      立即支付
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                            {o.status === 'paid' && (
                              <Link
                                href={`/orders/${o.id}/ticket`}
                                className="px-5 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                              >
                                查看电子?
                              </Link>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

