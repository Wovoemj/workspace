'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeft, Heart, Share2, Edit, Trash2, 
  Loader2, MapPin, Calendar, Eye, MessageCircle
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { apiMediaUrl } from '@/lib/media'

type TravelNote = {
  id: number
  title: string
  cover_image?: string
  content: string
  tags: string[]
  view_count: number
  like_count: number
  status: string
  created_at: string
  updated_at?: string
  user: { id: number; nickname: string; avatar_url?: string }
  destination?: { id: number; name: string; city: string }
}

export default function TravelNoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useUserStore()
  
  const [note, setNote] = useState<TravelNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [deleting, setDeleting] = useState(false)
  
  const noteId = Number(params.id)
  
  const loadNote = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/travel-notes/${noteId}`)
      const data = await res.json()
      if (data.success) {
        setNote(data.travel_note)
        setLikeCount(data.travel_note.like_count || 0)
      } else {
        toast.error('游记不存在')
        router.push('/travel-notes')
      }
    } catch (e) {
      console.error(e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [noteId, router])
  
  useEffect(() => {
    loadNote()
  }, [loadNote])
  
  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('请先登录')
      return
    }
    
    try {
      const url = liked 
        ? `/api/travel-notes/${noteId}/unlike`
        : `/api/travel-notes/${noteId}/like`
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setLiked(!liked)
        setLikeCount(data.like_count)
      } else if (data.error !== '已点赞' && data.error !== '未点赞') {
        toast.error(data.error || '操作失败')
      }
    } catch (e) {
      console.error(e)
    }
  }
  
  const handleDelete = async () => {
    if (!confirm('确定要删除这篇游记吗？')) return
    
    setDeleting(true)
    try {
      const res = await fetch(`/api/travel-notes/${noteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('删除成功')
        router.push('/travel-notes')
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }
  
  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: note?.title,
          text: `${note?.title} - 旅行攻略`,
          url
        })
      } catch {}
    } else {
      navigator.clipboard.writeText(url)
      toast.success('链接已复制')
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      </div>
    )
  }
  
  if (!note) return null
  
  const isAuthor = isAuthenticated && user?.id === note.user?.id
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back */}
          <Link href="/travel-notes" className="inline-flex items-center gap-2 text-gray-600 hover:text-sky-600 mb-6">
            <ArrowLeft className="h-5 w-5" />
            返回攻略
          </Link>
          
          {/* Cover */}
          {note.cover_image && (
            <div className="rounded-2xl overflow-hidden mb-8">
              <img 
                src={apiMediaUrl(note.cover_image)} 
                alt={note.title}
                className="w-full max-h-[400px] object-cover"
              />
            </div>
          )}
          
          {/* Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h1 className="text-3xl font-black text-gray-900 mb-4">{note.title}</h1>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {note.user?.avatar_url && (
                  <img src={apiMediaUrl(note.user.avatar_url)} className="w-10 h-10 rounded-full" alt="" />
                )}
                <div>
                  <div className="font-semibold text-gray-800">{note.user?.nickname || '匿名用户'}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(note.created_at).toLocaleDateString('zh-CN')}
                    {note.destination && <> · {note.destination.city}</>}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full border transition-colors ${
                    liked 
                      ? 'bg-red-50 border-red-200 text-red-600' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{likeCount}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                {isAuthor && (
                  <>
                    <Link
                      href={`/travel-notes/${note.id}/edit`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {note.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-sky-50 text-sky-600 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ 
              __html: note.content.replace(/\n/g, '<br/>') 
            }} />
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {note.view_count} 阅读
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="h-4 w-4" />
              {likeCount} 点赞
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}