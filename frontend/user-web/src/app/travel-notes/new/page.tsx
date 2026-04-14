'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Loader2, MapPin, X } from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'

type Destination = {
  id: number
  name: string
  city: string
  province: string
}

export default function NewTravelNotePage() {
  const router = useRouter()
  const { isAuthenticated, user } = useUserStore()
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [coverImage, setCoverImage] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState('draft')
  const [submitting, setSubmitting] = useState(false)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destSearch, setDestSearch] = useState('')
  const [showDestDropdown, setShowDestDropdown] = useState(false)
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/travel-notes/new')
    }
  }, [isAuthenticated, router])
  
  const searchDestinations = async (q: string) => {
    if (!q) {
      setDestinations([])
      return
    }
    try {
      const res = await fetch(`/api/destinations?q=${encodeURIComponent(q)}&limit=10`)
      const data = await res.json()
      setDestinations(data.destinations || [])
    } catch (e) {
      console.error(e)
    }
  }
  
  const handleDestSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setDestSearch(v)
    searchDestinations(v)
    setShowDestDropdown(true)
  }
  
  const selectDestination = (d: Destination) => {
    setDestinationId(d.id)
    setDestSearch(`${d.city} · ${d.name}`)
    setShowDestDropdown(false)
  }
  
  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }
  
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }
  
  const handleSubmit = async (publish: boolean = false) => {
    if (!title.trim()) {
      toast.error('请输入标题')
      return
    }
    if (!content.trim()) {
      toast.error('请输入内容')
      return
    }
    
    setSubmitting(true)
    try {
      const res = await fetch('/api/travel-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          destination_id: destinationId,
          cover_image: coverImage || undefined,
          tags,
          status: publish ? 'published' : status
        })
      })
      const data = await res.json()
      
      if (data.success) {
        toast.success(publish ? '发布成功' : '保存成功')
        router.push(`/travel-notes/${data.travel_note.id}`)
      } else {
        toast.error(data.error || '提交失败')
      }
    } catch (e) {
      console.error(e)
      toast.error('提交失败')
    } finally {
      setSubmitting(false)
    }
  }
  
  if (!isAuthenticated) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          {/* Back */}
          <Link href="/travel-notes" className="inline-flex items-center gap-2 text-gray-600 hover:text-sky-600 mb-6">
            <ArrowLeft className="h-5 w-5" />
            返回攻略
          </Link>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h1 className="text-2xl font-black text-gray-900 mb-6">写游记</h1>
            
            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给你的游记起个标题"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                maxLength={200}
              />
            </div>
            
            {/* Destination */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">关联目的地</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={destSearch}
                  onChange={handleDestSearch}
                  onFocus={() => setShowDestDropdown(true)}
                  placeholder="搜索目的地（可选）"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                />
                {showDestDropdown && destinations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {destinations.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => selectDestination(d)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        <span className="font-medium">{d.name}</span>
                        <span className="text-gray-500 text-sm ml-2">{d.city} · {d.province}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Cover Image */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">封面图片 URL</label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
              />
              {coverImage && (
                <div className="mt-2 rounded-lg overflow-hidden h-32">
                  <img src={coverImage} alt="封面预览" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            
            {/* Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-600 text-sm rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="添加标签，回车确认"
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  添加
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="记录你的旅行故事..."
                rows={12}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none resize-none"
              />
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 outline-none"
              >
                <option value="draft">存为草稿</option>
                <option value="published">直接发布</option>
              </select>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  保存草稿
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  发布游记
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}