/**
 * =====================================================
 * 通知中心模块 - 用户消息通知管理
 * =====================================================
 * 
 * 【功能列表】
 * - 未读通知计数展示
 * - 通知列表展示（标题、内容、创建时间）
 * - 单条标记已读功能
 * - 全部标记已读功能
 * - 已读/未读状态区分样式（未读：靛蓝色背景；已读：灰色背景）
 * - 分页加载（每页 20 条）
 * - 登录状态校验
 * 
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 * - useUserStore: 用户状态（Zustand）
 * - AppNotification 类型定义
 * 
 * 【API 接口】
 * - GET /api/notifications?user_id=xxx&page=1&per_page=20: 获取通知列表
 * - PUT /api/notifications/${id}/read: 标记单条通知已读
 * - PUT /api/notifications/read-all: 标记全部已读
 * 
 * 【状态管理】
 * - useState: notifications(通知列表), loading, error, unreadCount(计算属性)
 * - useMemo: unreadCount 计算（过滤未读通知数量）
 * - 依赖: isAuthenticated, user?.id（登录状态变化时重新加载）
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { AppNotification } from '@/types'

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const { user, isAuthenticated } = useUserStore()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  )

  const fetchNotifications = async () => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `${backendUrl}/api/notifications?user_id=${encodeURIComponent(user.id)}&page=1&per_page=${PAGE_SIZE}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('获取通知失败')
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || '获取通知失败')
      setNotifications(data.notifications || [])
    } catch (e: any) {
      setError(e?.message || '获取通知失败')
    } finally {
      setLoading(false)
    }
  }

  const markRead = async (id: number) => {
    try {
      const res = await fetch(`${backendUrl}/api/notifications/${id}/read`, { method: 'PUT' })
      if (!res.ok) throw new Error('操作失败')
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      )
    } catch {
      // 静默失败，避免打断阅?
    }
  }

  const markAllRead = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${backendUrl}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      if (!res.ok) throw new Error('操作失败')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // 静默失败
    }
  }

  useEffect(() => {
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id])

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      <main className="pt-20 pb-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">通知中心</h1>
                <p className="text-sm text-gray-500 mt-1">未读 ({unreadCount})</p>
              </div>
              <button
                onClick={markAllRead}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                disabled={!notifications.length}
              >
                全部标记已读
              </button>
            </div>

            {!isAuthenticated && (
              <div className="text-gray-600">请先登录后查看通知</div>
            )}

            {isAuthenticated && loading && (
              <div className="text-gray-500">加载?..</div>
            )}

            {isAuthenticated && !loading && error && (
              <div className="text-red-500">{error}</div>
            )}

            {isAuthenticated && !loading && !error && notifications.length === 0 && (
              <div className="text-gray-500">暂无通知</div>
            )}

            {isAuthenticated && !loading && !error && notifications.length > 0 && (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`border rounded-xl p-4 ${n.is_read ? 'bg-gray-50 border-gray-200' : 'bg-indigo-50 border-indigo-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{n.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{n.content}</div>
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="text-sm px-3 py-1 rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                        >
                          标记已读
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
