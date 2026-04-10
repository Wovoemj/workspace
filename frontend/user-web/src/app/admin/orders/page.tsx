'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import {
  Loader2, Search, ChevronLeft, ChevronRight, Package, Calendar,
  DollarSign, User, CheckCircle, XCircle, Clock, RefreshCw, Eye
} from 'lucide-react'
import { AdminGuard } from '@/components/AdminGuard'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'

type BookingDetails = {
  date?: string
  time_slot?: string
  [key: string]: unknown
}

type OrderItem = {
  id: string
  product_id: string
  product_name: string
  product_type: string
  quantity: number
  unit_price: number
  total_price: number
  booking_details: BookingDetails
}

type Order = {
  id: string
  user_id: string
  order_no: string
  total_amount: number
  status: string
  payment_method: string
  payment_time: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
}

type OrderStats = {
  status_distribution: { status: string; count: number; amount: number }[]
  today: { count: number; amount: number }
  month: { count: number; amount: number }
  total_orders: number
  total_amount: number
}

function adminHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...adminHeaders(), ...(options?.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || `HTTP ${res.status}`)
  }
  return res.json()
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-orange-100 text-orange-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-700' },
  refunded: { label: '已退款', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', color: 'bg-purple-100 text-purple-700' },
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const perPage = 20

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(perPage))
      if (statusFilter) params.set('status', statusFilter)

      const data = await adminFetch<{ success: boolean; orders: Order[]; total: number }>(
        `/api/admin/orders?${params}`
      )
      if (data.success) {
        setOrders(data.orders)
        setTotal(data.total)
      }
    } catch (e: any) {
      toast.error(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await adminFetch<{ success: boolean; stats: OrderStats }>('/api/admin/orders/stats')
      if (data.success) {
        setStats(data.stats)
      }
    } catch (e) {
      console.error('加载统计失败', e)
    }
  }

  useEffect(() => {
    loadOrders()
    loadStats()
  }, [page, statusFilter])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await adminFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      toast.success('状态已更新')
      loadOrders()
      loadStats()
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">

        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                  ← 返回后台
                </Link>
                <h1 className="text-xl font-bold text-gray-900">订单管理</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500">今日订单</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{stats.today.count}</div>
                <div className="text-sm text-green-600">¥{stats.today.amount.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500">本月订单</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{stats.month.count}</div>
                <div className="text-sm text-green-600">¥{stats.month.amount.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500">总订单数</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total_orders}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-500">总收入</div>
                <div className="text-2xl font-bold text-green-600 mt-1">¥{stats.total_amount.toLocaleString()}</div>
              </div>
            </div>
          )}


          {stats && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">订单状态分布</h3>
              <div className="flex flex-wrap gap-3">
                {stats.status_distribution.map((s) => (
                  <div key={s.status} className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${statusMap[s.status]?.color || 'bg-gray-100'}`}>
                      {statusMap[s.status]?.label || s.status}
                    </span>
                    <span className="text-sm text-gray-600">{s.count} 笔</span>
                  </div>
                ))}
              </div>
            </div>
          )}


          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部状态</option>
                <option value="pending">待支付</option>
                <option value="paid">已支付</option>
                <option value="cancelled">已取消</option>
                <option value="refunded">已退款</option>
              </select>
              <button
                onClick={() => { setPage(1); loadOrders() }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                刷新
              </button>
            </div>
          </div>


          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>暂无订单</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支付方式</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm text-gray-900">{order.order_no}</div>
                        <div className="text-xs text-gray-400">{order.items.length} 个商品</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">用户ID: {order.user_id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">¥{order.total_amount}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusMap[order.status]?.color || 'bg-gray-100'}`}>
                          {statusMap[order.status]?.label || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.payment_method}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : ''}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {order.status === 'paid' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'completed')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="标记完成"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {order.status === 'paid' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'refunded')}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                              title="退款"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'cancelled')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="取消"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}


            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {total} 条记录，第 {page}/{totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>


        {selectedOrder && (
          <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}
      </div>
    </AdminGuard>
  )
}

// 订单详情弹窗
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">订单详情</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">订单</div>
              <div className="font-mono font-medium">{order.order_no}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${statusMap[order.status]?.color || 'bg-gray-100'}`}>
              {statusMap[order.status]?.label || order.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">用户ID</div>
              <div className="font-medium">{order.user_id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">支付方式</div>
              <div className="font-medium">{order.payment_method}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">订单金额</div>
              <div className="font-medium text-green-600">¥{order.total_amount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">创建时间</div>
              <div className="font-medium">
                {order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '-'}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500 mb-2">商品列表</div>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {item.product_type} · x{item.quantity} · ¥{item.total_price}
                  </div>
                  {item.booking_details && Object.keys(item.booking_details).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.booking_details.date && (
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                          📅 {item.booking_details.date as string}
                        </span>
                      )}
                      {item.booking_details.time_slot && (
                        <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded">
                          🕐 {item.booking_details.time_slot as string}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
