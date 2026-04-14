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
