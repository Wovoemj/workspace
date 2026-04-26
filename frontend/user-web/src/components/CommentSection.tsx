'use client'

/**
 * =====================================================
 * 评论组件 (CommentSection)
 * =====================================================
 * 
 * 功能说明：
 * - 目的地评论列表展示
 * - 用户评分功能（1-5星）
 * - 评论发布功能（需登录）
 * - 评论时间格式化（相对时间显示）
 * - 用户头像生成（基于昵称首字母）
 * 
 * 数据来源：
 * - GET /api/destinations/{id}/comments - 获取评论列表
 * - POST /api/destinations/{id}/comments - 发布评论
 * 
 * 权限控制：
 * - 查看评论：无需登录
 * - 发布评论：需要登录（JWT Token）
 */

import { useState, useEffect } from 'react'
import { Star, ThumbsUp, MessageSquare, Send, User, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUserStore } from '@/store'
import Link from 'next/link'

/** 评论用户信息 */
interface CommentUser {
  id?: number
  nickname?: string
  username?: string
  avatar?: string
}

interface Comment {
  id: number
  content: string
  rating?: number
  likes_count?: number
  user?: CommentUser
  created_at?: string
}

interface CommentSectionProps {
  destinationId: string | number
  destinationName?: string
  initialComments?: Comment[]
}

/**
 * 评论组件主函数
 * @description 目的地评论展示和发布组件
 * @param props - 组件属性
 * @param props.destinationId - 目的地ID
 * @param props.destinationName - 目的地名称（用于显示）
 * @param props.initialComments - 初始评论列表（可选）
 */
export default function CommentSection({ 
  destinationId, 
  destinationName,
  initialComments = [] 
}: CommentSectionProps) {
  const { isAuthenticated } = useUserStore()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  const loadComments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/destinations/${destinationId}/comments?limit=50`, { 
        cache: 'no-store' 
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      setComments(data?.comments ?? [])
    } catch (e: any) {
      const msg = e?.message || '评论加载失败'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async () => {
    if (!isAuthenticated) {
      toast.error('请先登录再发表评论')
      return
    }
    const content = commentText.trim()
    if (!content) {
      toast.error('评论内容不能为空')
      return
    }
    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('未找到登录 token，请重新登录')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/destinations/${destinationId}/comments`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          content,
          rating: userRating || undefined 
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      setCommentText('')
      setUserRating(0)
      toast.success('评论发布成功！')
      await loadComments()
    } catch (e: any) {
      toast.error(e?.message || '发布评论失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 页面加载时获取评论
  useEffect(() => {
    loadComments()
  }, [destinationId])

  // 格式化时间
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  // 获取用户头像背景色
  const getAvatarColor = (name?: string) => {
    const colors = [
      'from-pink-400 to-rose-500',
      'from-violet-400 to-purple-500',
      'from-blue-400 to-cyan-500',
      'from-emerald-400 to-teal-500',
      'from-amber-400 to-orange-500',
      'from-red-400 to-pink-500',
    ]
    const index = (name?.charCodeAt(0) || 0) % colors.length
    return colors[index]
  }

  // 获取用户首字母
  const getInitial = (name?: string) => {
    return name?.charAt(0).toUpperCase() || '?'
  }

  return (
    <div className="card p-6 mt-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">游客点评</h3>
            <p className="text-sm text-gray-500">{comments.length} 条真实评价</p>
          </div>
        </div>
        <button 
          onClick={() => loadComments()}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          刷新
        </button>
      </div>

      {/* 评分统计 */}
      {comments.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {(comments.reduce((sum, c) => sum + (c.rating || 0), 0) / comments.filter(c => c.rating).length || 5).toFixed(1)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-4 h-4 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-1">平均评分</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">评论趋势</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (comments.length / 50) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {destinationName ? `来自「${destinationName}」的游客真实评价` : '真实游客评价'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 评论列表 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-48" />
                </div>
              </div>
              <div className="mt-3 h-16 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">{error}</div>
          <button 
            onClick={() => loadComments()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-2">还没有人评论过这里</p>
          <p className="text-sm text-gray-400">成为第一个分享旅行体验的人吧！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div 
              key={comment.id} 
              className="group bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                {/* 用户头像 */}
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(comment.user?.nickname)} flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
                  {comment.user?.avatar ? (
                    <img src={comment.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitial(comment.user?.nickname || comment.user?.username)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 用户信息行 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {comment.user?.nickname || comment.user?.username || '匿名用户'}
                      </span>
                      {comment.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= comment.rating! 
                                  ? 'text-amber-400 fill-amber-400' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(comment.created_at)}
                    </span>
                  </div>

                  {/* 评论内容 */}
                  <p className="mt-2 text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>

                  {/* 点赞 */}
                  {comment.likes_count !== undefined && comment.likes_count > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-gray-400 text-xs">
                      <ThumbsUp className="w-3 h-3" />
                      {comment.likes_count} 觉得有用
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 发表评论 */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">
              {isAuthenticated ? '分享你的旅行体验' : '登录后发表评论'}
            </span>
            {isAuthenticated && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500 mr-2">评分：</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setUserRating(star === userRating ? 0 : star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= (hoverRating || userRating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">登录后才能发表评价哦</p>
              <Link 
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
              >
                <User className="w-4 h-4" />
                登录 / 注册
              </Link>
            </div>
          ) : (
            <>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none text-sm bg-white"
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="推荐这个地方吗？分享你的真实感受吧..."
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {commentText.length}/500
                </span>
                <button
                  onClick={submitComment}
                  disabled={submitting || !commentText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? '发布中...' : '发布评论'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
