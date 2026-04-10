'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, QrCode, Calendar, Clock, MapPin, User, CheckCircle, Download, Share2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface TicketItem {
  id: string
  product_name: string
  product_type: string
  quantity: number
  booking_details?: {
    date?: string
    time_slot?: string
  }
}

interface OrderDetail {
  id: string
  order_no: string
  status: string
  total_amount: number
  payment_method: string
  payment_time?: string
  created_at: string
  items: TicketItem[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';

// 生成模拟二维码数据
function generateQRCodeData(orderNo: string, itemId: string) {
  // 实际项目中应该调用后端API生成真实的二维码
  const data = {
    type: 'TRAVEL_TICKET',
    orderNo,
    itemId,
    timestamp: Date.now(),
    verifyCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
  }
  return btoa(JSON.stringify(data))
}

export default function TicketPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const orderId = params?.id

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return

    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    const loadOrder = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || '加载订单失败')
        }

        if (data.order.status !== 'paid') {
          toast.error('订单未支付，无法查看电子票')
          router.push('/orders')
          return
        }

        setOrder(data.order)
      } catch (e: any) {
        setError(e?.message || '加载失败')
        toast.error(e?.message || '加载订单失败')
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId, router])

  const handleDownload = () => {
    toast.success('电子票已保存到相册')
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '我的电子票',
        text: `订单号: ${order?.order_no}`,
        url: window.location.href,
      })
    } else {
      toast.success('链接已复制到剪贴板')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">加载电子票...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="card p-8 text-center bg-white">
              <p className="text-red-500">{error || '订单不存在'}</p>
              <button
                onClick={() => router.push('/orders')}
                className="mt-4 px-4 py-2 text-blue-600 hover:underline"
              >
                返回订单列表
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <QrCode className="h-6 w-6 text-blue-600" />
              电子门票
            </h1>
            <p className="text-gray-600 mt-1">订单号：{order.order_no}</p>
          </div>

          {/* 门票列表 */}
          <div className="space-y-6">
            {order.items.map((item, index) => {
              const qrData = generateQRCodeData(order.order_no, item.id)
              return (
                <div
                  key={item.id}
                  className="card bg-white overflow-hidden shadow-lg"
                >
                  {/* 票头 */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-white">
                        <div className="font-bold text-lg">{item.product_name}</div>
                        <div className="text-blue-100 text-sm mt-0.5">
                          {item.product_type === 'ticket' ? '景区门票' : item.product_type}
                        </div>
                      </div>
                      <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                        <span className="text-white text-sm font-medium">
                          x{item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 票内容 */}
                  <div className="p-6">
                    {/* 预订信息 */}
                    <div className="flex flex-wrap gap-4 mb-6">
                      {item.booking_details?.date && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span>{item.booking_details.date}</span>
                        </div>
                      )}
                      {item.booking_details?.time_slot && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4 text-purple-500" />
                          <span>{item.booking_details.time_slot}</span>
                        </div>
                      )}
                    </div>

                    {/* 二维码区域 */}
                    <div className="flex flex-col items-center py-6 border-t border-b border-gray-100">
                      <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200">
                        {/* 模拟二维码 */}
                        <div className="w-48 h-48 bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                          {/* 二维码图案模拟 */}
                          <div className="absolute inset-2 grid grid-cols-8 grid-rows-8 gap-0.5">
                            {Array.from({ length: 64 }).map((_, i) => (
                              <div
                                key={i}
                                className={`${
                                  Math.random() > 0.5 ? 'bg-white' : 'bg-gray-900'
                                }`}
                              />
                            ))}
                          </div>
                          {/* 定位点 */}
                          <div className="absolute top-3 left-3 w-10 h-10 border-4 border-white rounded-lg" />
                          <div className="absolute top-3 right-3 w-10 h-10 border-4 border-white rounded-lg" />
                          <div className="absolute bottom-3 left-3 w-10 h-10 border-4 border-white rounded-lg" />
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-gray-500">入园时请出示此二维码</p>
                      <p className="text-xs text-gray-400 mt-1">验证码：{qrData.slice(-8)}</p>
                    </div>

                    {/* 使用说明 */}
                    <div className="mt-6 space-y-2 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>请在预约日期当天使用，过期作废</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>每个二维码仅限使用一次</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>请提前30分钟到达景区入口</span>
                      </div>
                    </div>
                  </div>

                  {/* 票根装饰 */}
                  <div className="relative h-4 bg-gray-50">
                    <div className="absolute left-0 top-0 w-4 h-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full -translate-x-1/2" />
                    <div className="absolute right-0 top-0 w-4 h-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full translate-x-1/2" />
                    <div className="absolute inset-x-4 top-1/2 border-t-2 border-dashed border-gray-200" />
                  </div>

                  {/* 操作按钮 */}
                  <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-400">票号：{item.id}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Share2 className="h-4 w-4" />
                        分享
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        <Download className="h-4 w-4" />
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 返回按钮 */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/orders')}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              返回订单列表
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
