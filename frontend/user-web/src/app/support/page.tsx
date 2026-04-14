'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { 
  MessageCircle, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'

type Ticket = {
  id: number
  title: string
  description: string
  ticket_type: string
  status: string
  created_at: string
  updated_at: string
  replies?: TicketReply[]
}

type TicketReply = {
  id: number
  content: string
  is_admin: boolean
  created_at: string
}

const ticketTypes = [
  { value: 'order', label: '订单问题' },
  { value: 'payment', label: '支付问题' },
  { value: 'refund', label: '退款申请' },
  { value: 'account', label: '账号问题' },
  { value: 'bug', label: '功能反馈' },
  { value: 'other', label: '其他' },
]

const faqs = [
  {
    q: '如何修改订单信息？',
    a: '您可以在"我的订单"中找到对应订单，点击"查看详情"进行修改。如订单已支付，请联系客服处理。'
  },
  {
    q: '如何申请退款？',
    a: '在订单详情页点击"申请退款"，填写退款原因后提交。我们的客服会在1-3个工作日内处理。'
  },
  {
    q: '积分有什么用？',
    a: '积分可以兑换优惠券、礼品或在下单时抵扣金额。积分越多，会员等级越高，享受的特权越多。'
  },
  {
    q: '如何联系人工客服？',
    a: '您可以点击本页面的"联系客服"按钮提交工单，也可以在工作时间（9:00-21:00）拨打客服热线。'
  },
]

export default function SupportPage() {
  const { isAuthenticated, user } = useUserStore()
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets' | 'create'>('faq')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  
  // 创建工单表单
  const [formData, setFormData] = useState({
    ticket_type: 'order',
    title: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const loadTickets = useCallback(async () => {
    if (!isAuthenticated) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('加载工单失败:', error)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets()
    }
  }, [activeTab, loadTickets])

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('请填写完整信息')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      
      if (data.success) {
        toast.success('工单提交成功')
        setFormData({ ticket_type: 'order', title: '', description: '' })
        setActiveTab('tickets')
        loadTickets()
      } else {
        toast.error(data.error || '提交失败')
      }
    } catch (error) {
      toast.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return { label: '待处理', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock }
      case 'processing':
        return { label: '处理中', color: 'text-blue-600', bg: 'bg-blue-50', icon: MessageCircle }
      case 'closed':
        return { label: '已解决', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle }
      default:
        return { label: status, color: 'text-gray-600', bg: 'bg-gray-50', icon: AlertCircle }
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="relative z-10 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h1 className="bg-gradient-to-r from-gray-900 via-sky-800 to-indigo-900 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              客服中心
            </h1>
            <p className="mt-2 text-gray-600">有问题？我们随时为您服务</p>
          </div>

          {/* 联系方式 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-lg backdrop-blur-md flex items-center gap-4">
              <div className="rounded-full bg-sky-100 p-3">
                <Phone className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-800">客服热线</div>
                <div className="text-sm text-gray-500">400-888-9999</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-lg backdrop-blur-md flex items-center gap-4">
              <div className="rounded-full bg-indigo-100 p-3">
                <Mail className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-800">邮箱</div>
                <div className="text-sm text-gray-500">support@travelai.com</div>
              </div>
            </div>
          </div>

          {/* Tab 切换 */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-2xl w-fit mx-auto">
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'faq' 
                  ? 'bg-white text-sky-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              常见问题
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'tickets' 
                  ? 'bg-white text-sky-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              我的工单
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'create' 
                  ? 'bg-white text-sky-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              联系客服
            </button>
          </div>

          {/* FAQ */}
          {activeTab === 'faq' && (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">常见问题</h2>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-800">{faq.q}</span>
                      {expandedFaq === idx ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-4 pb-4 text-gray-600">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 工单列表 */}
          {activeTab === 'tickets' && (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">我的工单</h2>
              
              {!isAuthenticated ? (
                <div className="text-center py-12 text-gray-500">
                  请先登录查看工单
                </div>
              ) : loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">暂无工单</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-sky-600 hover:underline"
                  >
                    提交新工单
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => {
                    const statusConfig = getStatusConfig(ticket.status)
                    const StatusIcon = statusConfig.icon
                    return (
                      <div key={ticket.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{ticket.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {ticketTypes.find(t => t.value === ticket.ticket_type)?.label}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                        <div className="text-xs text-gray-400 mt-2">
                          {ticket.created_at?.split('T')[0]}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 创建工单 */}
          {activeTab === 'create' && (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">提交工单</h2>
              
              {!isAuthenticated ? (
                <div className="text-center py-12 text-gray-500">
                  请先 <a href="/login" className="text-sky-600 hover:underline">登录</a> 后提交工单
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">问题类型</label>
                    <select
                      value={formData.ticket_type}
                      onChange={(e) => setFormData({ ...formData, ticket_type: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {ticketTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">问题标题</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="请简要描述您的问题"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">详细描述</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="请详细描述您遇到的问题，以便我们更好地帮助您"
                      rows={5}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    提交工单
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}