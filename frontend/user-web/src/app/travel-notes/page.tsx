'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  Search, Plus, Heart, Eye, MessageCircle, 
  ChevronLeft, ChevronRight, Loader2, MapPin, User
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
  user: { id: number; nickname: string; avatar_url?: string }
  destination?: { id: number; name: string; city: string }
}

function NoteCard({ note }: { note: TravelNote }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  
  return (
    <Link href={`/travel-notes/${note.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all">
        <div className="relative aspect-[16/10] bg-gray-100">
          {note.cover_image ? (
            <img 
              src={apiMediaUrl(note.cover_image)} 
              alt={note.title}
              className={`w-full h-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center">
              <MapPin className="h-12 w-12 text-sky-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="p-4">
          <h3 className="font-bold text-gray-800 line-clamp-2 mb-2 group-hover:text-sky-600 transition-colors">
            {note.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            {note.user?.avatar_url && (
              <img src={apiMediaUrl(note.user.avatar_url)} className="w-5 h-5 rounded-full" alt="" />
            )}
            <span>{note.user?.nickname || '匿名用户'}</span>
            {note.destination && (
              <>
                <span>·</span>
                <span>{note.destination.city}</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {note.view_count}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {note.like_count}
              </span>
            </div>
            <span>{new Date(note.created_at).toLocaleDateString('zh-CN')}</span>
          </div>
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {note.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 bg-sky-50 text-sky-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function TravelNotesPage() {
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useUserStore()
  
  const [notes, setNotes] = useState<TravelNote[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  
  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', '12')
      params.set('status', 'published')
      if (search) params.set('q', search)
      
      const res = await fetch(`/api/travel-notes?${params}`)
      const data = await res.json()
      if (data.success) {
        setNotes(data.travel_notes || [])
        setTotalPages(data.pages || 1)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, search])
  
  useEffect(() => {
    loadNotes()
  }, [loadNotes])
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadNotes()
  }
  
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="py-10 text-center">
            <h1 className="text-3xl font-black text-white drop-shadow mb-2">旅行攻略</h1>
            <p className="text-white/80">分享你的旅行故事，发现更多旅行灵感</p>
          </div>

          {/* Decorative gradient banner */}
          <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
            <div className="h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center">
              <div className="text-center">
                <p className="text-white text-xl font-bold drop-shadow-lg">发现精彩旅程</p>
                <p className="text-white/80 text-sm mt-2">浏览来自旅行者的真实分享</p>
              </div>
            </div>
          </div>
          
          {/* Search & Actions */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索游记..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                />
              </div>
            </form>
            
            {isAuthenticated && (
              <Link 
                href="/travel-notes/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-sky-700 hover:to-indigo-700 transition-all"
              >
                <Plus className="h-5 w-5" />
                写游记
              </Link>
            )}
          </div>
          
          {/* Notes Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无游记</h3>
              <p className="text-gray-500 mb-4">成为第一个分享旅行故事的人吧</p>
              {isAuthenticated && (
                <Link href="/travel-notes/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-xl">
                  <Plus className="h-5 w-5" />
                  写游记
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="px-4 text-gray-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}