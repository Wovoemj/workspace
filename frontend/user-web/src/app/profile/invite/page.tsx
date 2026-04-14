'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Copy, Users, Gift, Link as LinkIcon, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'

export default function InvitePage() {
  const { isAuthenticated, user } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState<{
    invite_code: string
    invite_link: string
    invited_count: number
    reward_points: number
  } | null>(null)
  const [stats, setStats] = useState<{
    total_invited: number
    total_reward_points: number
    invited_users: Array<{ id: number; username: string; nickname: string; created_at: string }>
  } | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      const [infoRes, statsRes] = await Promise.all([
        fetch('/api/users/invite', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/users/invite/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const infoData = await infoRes.json()
      const statsData = await statsRes.json()

      if (infoData.success) {
        setInviteData(infoData)
      }
      if (statsData.success) {
        setStats(statsData)
      }
    } catch (error) {
      console.error('加载邀请数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadData()
  }, [loadData])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('复制成功')
    } catch {
      toast.error('复制失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-3xl border border-white/60 bg-white/85 p-12 shadow-2xl backdrop-blur-md">
              <Users className="mx-auto h-16 w-16 text-sky-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">请先登录</h2>
              <p className="text-gray-600 mb-6">登录后即可邀请好友</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="relative z-10 pt-24 pb-16">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-8 text-center">
            <h1 className="bg-gradient-to-r from-gray-900 via-sky-800 to-indigo-900 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              邀请好友
            </h1>
            <p className="mt-2 text-gray-600">邀请好友注册，双方各得 50 积分</p>
          </div>

          {/* 邀请码卡片 */}
          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-sky-100 p-2">
                <LinkIcon className="h-5 w-5 text-sky-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">我的邀请码</h2>
            </div>
            
            {inviteData && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-xl bg-gray-100 px-4 py-3 font-mono text-xl font-bold text-center tracking-wider">
                    {inviteData.invite_code}
                  </div>
                  <button
                    onClick={() => copyToClipboard(inviteData.invite_code)}
                    className="rounded-xl bg-sky-500 px-4 py-3 text-white hover:bg-sky-600"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 mb-1">邀请链接</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600 truncate">
                      {inviteData.invite_link}
                    </div>
                    <button
                      onClick={() => copyToClipboard(inviteData.invite_link)}
                      className="rounded-xl bg-sky-500 px-4 py-2 text-white hover:bg-sky-600 whitespace-nowrap"
                    >
                      复制链接
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Gift className="h-4 w-4" />
                  <span>已邀请 <strong className="text-sky-600">{inviteData.invited_count}</strong> 人</span>
                  <span className="mx-2">|</span>
                  <span>每次邀请得 <strong className="text-amber-600">{inviteData.reward_points}</strong> 积分</span>
                </div>
              </div>
            )}
          </div>

          {/* 邀请统计 */}
          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-indigo-100 p-2">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">邀请统计</h2>
            </div>
            
            {stats && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl bg-sky-50 p-4 text-center">
                  <div className="text-3xl font-bold text-sky-600">{stats.total_invited}</div>
                  <div className="text-sm text-gray-600">已邀请人数</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 text-center">
                  <div className="text-3xl font-bold text-amber-600">{stats.total_reward_points}</div>
                  <div className="text-sm text-gray-600">累计获得积分</div>
                </div>
              </div>
            )}

            {/* 最近邀请的用户 */}
            {stats && stats.invited_users && stats.invited_users.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">最近邀请</h3>
                <div className="space-y-2">
                  {stats.invited_users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
                      <span className="font-medium text-gray-800">{u.nickname || u.username}</span>
                      <span className="text-sm text-gray-500">
                        {u.created_at?.split('T')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!stats || stats.total_invited === 0) && (
              <div className="text-center py-8 text-gray-500">
                还没有邀请过好友，快去邀请吧！
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}