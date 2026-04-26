/**
 * =====================================================
 * 游记攻略模块 - 旅行攻略与游记分享平台
 * =====================================================
 * 
 * 【功能列表】
 * - 游记列表展示（封面、标题、作者、目的地、标签、点赞/浏览数）
 * - 游记搜索功能（关键词搜索）
 * - 游记分页加载（每页 12 条）
 * - AI 智能推荐区域：
 *   - 基于与小游 AI 的对话推荐目的地
 *   - 行程规划建议卡片（N 日游方案）
 *   - AI 行程生成弹窗（调用 AI 生成行程）
 *   - 历史行程记录与切换
 *   - 保存行程到我的行程
 * - 推荐游记展示（根据对话目的地推荐）
 * - 写游记入口（需登录）
 * 
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 * - NoteCard: 游记卡片组件
 * - ItineraryCard: 行程卡片组件
 * - useUserStore: 用户状态（Zustand）
 * - api: API 请求封装
 * - media: 图片 URL 处理工具
 * 
 * 【API 接口】
 * - GET /api/travel-notes?page=1&per_page=12&status=published&q=xxx: 获取游记列表
 * - GET /api/itineraries/from-chat?session_id=xxx: 获取对话推荐的目的地和行程建议
 * - POST /api/itinerary/generate: AI 生成行程（需登录，超时 120s）
 * - GET /api/travel-notes?destination_id=xxx&sort_by=like_count: 获取目的地相关游记
 * - GET /api/itineraries: 获取用户行程列表
 * 
 * 【状态管理】
 * - useState: notes(游记), itineraries(行程), recommendations(AI推荐), 
 *   planSuggestions(行程建议), recommendedNotes(推荐游记), generatedTrips(生成历史)
 * - useCallback: loadNotes, loadRecommendations, loadRecommendedNotes, loadItineraries
 * - 跨标签页同步：监听 localStorage 变化 + 5秒轮询
 * - localStorage: assistant_sessions_v1 存储对话会话 ID
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  Search, Plus, Heart, Eye, MessageCircle, 
  ChevronLeft, ChevronRight, Loader2, MapPin, User,
  Calendar, Compass, Sparkles, Layers, BookOpen
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { apiMediaUrl, resolveCoverSrc, onImgErrorUseFallback } from '@/lib/media'
import { api } from '@/lib/api'

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

type Itinerary = {
  id: number
  title: string
  destination?: string
  destination_id?: number
  start_date?: string
  end_date?: string
  status: string
  created_at: string
  item_count?: number
}

type Destination = {
  id: number
  name: string
  city: string
  province: string
  cover_image?: string
  rating: number
  ticket_price: number
}

type ChatRecommendation = {
  destination: Destination
  reason: string
  matched_keyword: string | null
  source: string
}

type PlanSuggestion = {
  type: string
  title: string
  destinations: Destination[]
  description: string
}

function NoteCard({ note }: { note: TravelNote }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  
  return (
    <Link href={`/travel-notes/${note.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all">
        <div className="relative aspect-[16/10] bg-gray-100">
          {note.cover_image ? (
            <img 
              src={note.cover_image} 
              alt={note.title}
              className={`w-full h-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                e.currentTarget.src = '/scenic_images/__auto__/placeholder.png'
                setImgLoaded(true)
              }}
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

function ItineraryCard({ itinerary }: { itinerary: Itinerary }) {
  return (
    <Link href={`/itineraries/${itinerary.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
            <Calendar className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 line-clamp-1 mb-1 group-hover:text-emerald-600 transition-colors">
              {itinerary.title}
            </h3>
            {itinerary.destination && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>{itinerary.destination}</span>
              </div>
            )}
            {(itinerary.start_date || itinerary.end_date) && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {itinerary.start_date ? new Date(itinerary.start_date).toLocaleDateString('zh-CN') : '未设置'}
                  {itinerary.end_date && ` - ${new Date(itinerary.end_date).toLocaleDateString('zh-CN')}`}
                </span>
              </div>
            )}
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                itinerary.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                itinerary.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                'bg-sky-100 text-sky-700'
              }`}>
                {itinerary.status === 'active' ? '进行中' :
                 itinerary.status === 'completed' ? '已完成' : '规划中'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function TravelNotesPage() {
  const { isAuthenticated, user } = useUserStore()
  
  const [notes, setNotes] = useState<TravelNote[]>([])
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItineraries, setLoadingItineraries] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  
  // 聊天推荐相关
  const [recommendations, setRecommendations] = useState<ChatRecommendation[]>([])
  const [planSuggestions, setPlanSuggestions] = useState<PlanSuggestion[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  
  // 行程生成相关
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false) // 是否正在生成
  const [generatedTrips, setGeneratedTrips] = useState<any[]>([]) // 生成的历史行程列表
  const [currentTrip, setCurrentTrip] = useState<any>(null) // 当前查看的行程
  const [showTripModal, setShowTripModal] = useState(false) // 是否显示行程弹窗

  // 生成行程
  const handleGenerateItinerary = async (plan: PlanSuggestion) => {
    if (!isAuthenticated) {
      toast.error('请先登录')
      router.push('/login')
      return
    }

    setIsGenerating(true)
    setCurrentTrip(null)
    setShowTripModal(true)
    
    try {
      // 从目的地列表提取主要目的地（取前3个）
      const destinations = plan.destinations || []
      const destNames = destinations.length > 0 
        ? destinations.slice(0, 3).map(d => d.name).join('、')
        : (plan.title.replace(/\d+日.*/, '') || '北京') // 如果没有目的地，从标题提取
      
      const daysMatch = plan.title.match(/(\d+)日/)
      const days = daysMatch ? Math.min(7, Math.max(1, parseInt(daysMatch[1]))) : 3
      
      console.log('开始生成行程:', { destination: destNames, days, plan })
      
      // 使用更长的超时时间（120秒匹配后端AI调用时间）
      const response = await api.post('/api/itinerary/generate', {
        destination: destNames,
        days: days
      }, { timeout: 120000 })
      
      console.log('行程生成响应:', response)
      
      if (response.success) {
        setCurrentTrip(response)
        // 添加到历史列表（保留历史）
        setGeneratedTrips(prev => [response, ...prev])
        toast.success('行程生成成功！')
      } else {
        setCurrentTrip({ success: false, error: response.error || '生成失败' })
        toast.error(response.error || '生成失败，请重试')
      }
    } catch (error: any) {
      console.error('生成行程失败:', error)
      console.error('错误详情:', error.response?.data)
      const errorMsg = error.response?.data?.error || error.message || '生成失败，请重试'
      setCurrentTrip({ success: false, error: errorMsg })
      if (error.response?.status === 401) {
        toast.error('请先登录')
        router.push('/login')
      } else {
        toast.error(errorMsg)
      }
      setShowTripModal(false)
    } finally {
      setIsGenerating(false)
    }
  }

  // 查看历史行程
  const handleViewTrip = (trip: any) => {
    setCurrentTrip(trip)
    setShowTripModal(true)
  }

  // 保存行程到我的行程
  const handleSaveTrip = () => {
    if (currentTrip?.trip?.id) {
      router.push(`/itineraries/${currentTrip.trip.id}`)
    } else {
      toast.error('保存失败，行程数据不完整')
    }
  }
  
  // 基于对话的游记推荐
  const [recommendedNotes, setRecommendedNotes] = useState<TravelNote[]>([])
  const [loadingRecommendedNotes, setLoadingRecommendedNotes] = useState(false)
  
  // 模拟数据 - 当API不可用时显示
  const MOCK_NOTES: TravelNote[] = [
    { id: 1, title: "北京3日游 | 打卡故宫、长城、颐和园", cover_image: "/scenic_images/故宫博物院/故宫博物院_2.jpg", content: "", tags: ["北京", "亲子游", "摄影"], view_count: 2356, like_count: 156, status: "published", created_at: "2024-03-15", user: { id: 1, nickname: "旅行达人小王", avatar_url: "/avatars/user1.jpg" }, destination: { id: 1, name: "故宫", city: "北京" } },
    { id: 2, title: "杭州西湖2日游攻略 | 必去景点推荐", cover_image: "/scenic_images/杭州西湖/杭州西湖_1.jpg", content: "", tags: ["杭州", "闺蜜游", "网红打卡"], view_count: 1890, like_count: 98, status: "published", created_at: "2024-03-10", user: { id: 2, nickname: "摄影爱好者", avatar_url: "/avatars/user2.jpg" }, destination: { id: 3, name: "西湖", city: "杭州" } },
    { id: 3, title: "西安旅行 | 兵马俑、回民街、城墙深度游", cover_image: "/scenic_images/西安城墙/西安城墙_1.jpg", content: "", tags: ["西安", "文化之旅", "美食"], view_count: 3201, like_count: 203, status: "published", created_at: "2024-03-08", user: { id: 3, nickname: "背包客阿明", avatar_url: "/avatars/user3.jpg" }, destination: { id: 5, name: "兵马俑", city: "西安" } },
    { id: 4, title: "丽江古城3天2夜 | 邂逅最美古镇", cover_image: "/scenic_images/丽江古城/丽江古城_1.jpg", content: "", tags: ["丽江", "情侣游", "古镇"], view_count: 4102, like_count: 287, status: "published", created_at: "2024-03-05", user: { id: 4, nickname: "美食探索家", avatar_url: "/avatars/user4.jpg" }, destination: { id: 8, name: "丽江古城", city: "丽江" } },
    { id: 5, title: "上海外滩 | 魔都夜景全攻略", cover_image: "/scenic_images/外滩/外滩_1.jpg", content: "", tags: ["上海", "周末去哪", "拍照圣地"], view_count: 5621, like_count: 334, status: "published", created_at: "2024-03-01", user: { id: 5, nickname: "自驾游达人", avatar_url: "/avatars/user5.jpg" }, destination: { id: 4, name: "外滩", city: "上海" } },
    { id: 6, title: "张家界国家森林公园 | 奇峰怪石之旅", cover_image: "/scenic_images/张家界武陵源/张家界武陵源_1.jpg", content: "", tags: ["张家界", "徒步", "自然风光"], view_count: 1876, like_count: 145, status: "published", created_at: "2024-02-28", user: { id: 6, nickname: "历史爱好者", avatar_url: "/avatars/user6.jpg" }, destination: { id: 7, name: "张家界", city: "张家界" } },
    { id: 7, title: "厦门鼓浪屿 | 文艺小清新之旅", cover_image: "/scenic_images/鼓浪屿/鼓浪屿_1.jpg", content: "", tags: ["厦门", "小众景点", "海岛"], view_count: 2987, like_count: 198, status: "published", created_at: "2024-02-25", user: { id: 7, nickname: "自然风光摄影师", avatar_url: "/avatars/user7.jpg" }, destination: { id: 9, name: "鼓浪屿", city: "厦门" } },
    { id: 8, title: "黄山日出云海 | 摄影师的必去之地", cover_image: "/scenic_images/黄山/黄山_1.jpg", content: "", tags: ["黄山", "摄影", "雪山"], view_count: 2345, like_count: 167, status: "published", created_at: "2024-02-20", user: { id: 8, nickname: "穷游世界", avatar_url: "/avatars/user8.jpg" }, destination: { id: 10, name: "黄山", city: "黄山" } },
    { id: 9, title: "九寨沟秋天 | 童话般的彩色世界", cover_image: "/scenic_images/九寨沟/九寨沟_1.jpg", content: "", tags: ["九寨沟", "秋天", "自然风光"], view_count: 4567, like_count: 389, status: "published", created_at: "2024-02-15", user: { id: 1, nickname: "旅行达人小王", avatar_url: "/avatars/user1.jpg" }, destination: { id: 6, name: "九寨沟", city: "阿坝" } },
    { id: 10, title: "桂林山水 | 泛舟漓江的悠闲时光", cover_image: "/scenic_images/桂林漓江景区/桂林漓江景区_1.jpg", content: "", tags: ["桂林", "周末游", "省钱攻略"], view_count: 3124, like_count: 234, status: "published", created_at: "2024-02-10", user: { id: 2, nickname: "摄影爱好者", avatar_url: "/avatars/user2.jpg" }, destination: { id: 12, name: "桂林山水", city: "桂林" } },
    { id: 11, title: "泰山登顶 | 看日出云海的震撼之旅", cover_image: "/scenic_images/泰山/泰山_1.jpg", content: "", tags: ["泰山", "登山", "日出"], view_count: 2789, like_count: 201, status: "published", created_at: "2024-02-05", user: { id: 3, nickname: "背包客阿明", avatar_url: "/avatars/user3.jpg" }, destination: { id: 11, name: "泰山", city: "泰安" } },
    { id: 12, title: "峨眉山祈福 | 金顶日出与普贤菩萨", cover_image: "/scenic_images/峨眉山_乐山大佛/峨眉山_乐山大佛_1.jpg", content: "", tags: ["峨眉山", "祈福", "寺庙"], view_count: 1987, like_count: 123, status: "published", created_at: "2024-02-01", user: { id: 4, nickname: "美食探索家", avatar_url: "/avatars/user4.jpg" }, destination: { id: 13, name: "峨眉山", city: "乐山" } },
  ]

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
      if (data.success && data.travel_notes && data.travel_notes.length > 0) {
        setNotes(data.travel_notes)
        setTotalPages(data.pages || 1)
      } else {
        // API不可用或返回空数据，使用模拟数据
        setNotes(MOCK_NOTES)
        setTotalPages(Math.ceil(MOCK_NOTES.length / 12))
      }
    } catch (e) {
      // 网络错误，使用模拟数据
      setNotes(MOCK_NOTES)
      setTotalPages(Math.ceil(MOCK_NOTES.length / 12))
    } finally {
      setLoading(false)
    }
  }, [page, search])

  // 加载基于对话目的地的推荐游记
  const loadRecommendedNotes = useCallback(async () => {
    setLoadingRecommendedNotes(true)
    try {
      // 先获取对话推荐的目的地
      let sessionIds: string[] = []
      try {
        const sessionsData = localStorage.getItem('assistant_sessions_v1')
        if (sessionsData) {
          const sessions = JSON.parse(sessionsData)
          if (sessions && Array.isArray(sessions) && sessions.length > 0) {
            sessionIds = sessions.map((s: any) => s.id)
          }
        }
      } catch { /* ignore */ }

      const params = new URLSearchParams()
      if (sessionIds.length > 0) {
        sessionIds.forEach(id => params.append('session_id', id))
      }
      
      const res = await fetch(`/api/itineraries/from-chat?${params.toString()}`)
      const data = await res.json()
      
      if (data.success && data.recommendations && data.recommendations.length > 0) {
        // 获取推荐目的地ID列表
        const destIds = data.recommendations
          .map((r: ChatRecommendation) => r.destination.id)
          .filter((id: number) => id)
        
        if (destIds.length > 0) {
          // 获取这些目的地的游记
          const notesParams = new URLSearchParams()
          destIds.forEach((id: number) => notesParams.append('destination_id', String(id)))
          notesParams.set('per_page', '6')
          notesParams.set('status', 'published')
          notesParams.set('sort_by', 'like_count')
          
          const notesRes = await fetch(`/api/travel-notes?${notesParams}`)
          const notesData = await notesRes.json()
          if (notesData.success) {
            setRecommendedNotes(notesData.travel_notes || [])
          }
        }
      } else {
        setRecommendedNotes([])
      }
    } catch (e) {
      console.error(e)
      setRecommendedNotes([])
    } finally {
      setLoadingRecommendedNotes(false)
    }
  }, [])
  
  const loadItineraries = useCallback(async () => {
    if (!isAuthenticated) {
      setItineraries([])
      return
    }
    setLoadingItineraries(true)
    try {
      const res = await fetch('/api/itineraries')
      const data = await res.json()
      if (data.success) {
        setItineraries(data.itineraries || [])
      }
    } catch (e) {
      console.error(e)
      // 如果API未实现，使用空列表
      setItineraries([])
    } finally {
      setLoadingItineraries(false)
    }
  }, [isAuthenticated])
  
  const loadRecommendations = useCallback(async () => {
    setLoadingRecommendations(true)
    try {
      // 获取所有会话ID（从localStorage读取）
      let sessionIds: string[] = []
      try {
        const sessionsData = localStorage.getItem('assistant_sessions_v1')
        if (sessionsData) {
          const sessions = JSON.parse(sessionsData)
          if (sessions && Array.isArray(sessions) && sessions.length > 0) {
            sessionIds = sessions.map((s: any) => s.id)
          }
        }
      } catch { /* ignore */ }

      // 构建API URL - 传递所有会话ID
      const params = new URLSearchParams()
      if (sessionIds.length > 0) {
        sessionIds.forEach(id => params.append('session_id', id))
      }
      const apiUrl = `/api/itineraries/from-chat?${params.toString()}`

      const res = await fetch(apiUrl)
      const data = await res.json()
      if (data.success) {
        setRecommendations(data.recommendations || [])
        setPlanSuggestions(data.plan_suggestions || [])
      }
    } catch (e) {
      console.error(e)
      setRecommendations([])
      setPlanSuggestions([])
    } finally {
      setLoadingRecommendations(false)
    }
  }, [])
  
  // 监听 localStorage 变化（跨标签页同步）
  useEffect(() => {
    const handleStorageChange = () => {
      loadRecommendedNotes()
      loadRecommendations()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // 每5秒轮询一次（检测同一标签页内的变化）
    const intervalId = setInterval(() => {
      loadRecommendedNotes()
      loadRecommendations()
    }, 5000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(intervalId)
    }
  }, [loadRecommendedNotes, loadRecommendations])

  useEffect(() => {
    loadNotes()
    loadRecommendedNotes()
    loadRecommendations()
    if (isAuthenticated) {
      loadItineraries()
    }
  }, [loadNotes, loadRecommendedNotes, loadRecommendations, loadItineraries, isAuthenticated])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadNotes()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="py-8 text-center">
            <h1 className="text-3xl font-black text-sky-900 drop-shadow mb-2">旅行攻略</h1>
            <p className="text-sky-700/80">分享你的旅行故事，发现更多旅行灵感</p>
          </div>

          {/* AI对话推荐区域 - 合并版 */}
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-emerald-50 border border-amber-100 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">小游智能推荐</h2>
                  <p className="text-sm text-gray-500">基于你与小游的对话推荐</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { loadRecommendations(); loadRecommendedNotes(); }}
                  disabled={loadingRecommendations || loadingRecommendedNotes}
                  className="p-2 rounded-lg hover:bg-white/50 disabled:opacity-50"
                  title="刷新推荐"
                >
                  <Loader2 className={`h-5 w-5 text-gray-600 ${loadingRecommendations || loadingRecommendedNotes ? 'animate-spin' : ''}`} />
                </button>
                <Link 
                  href="/assistant"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                >
                  <Sparkles className="h-4 w-4" />
                  找小游聊聊
                </Link>
              </div>
            </div>
            
            {/* 推荐景点 */}
            {loadingRecommendations ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                <span className="ml-2 text-sm text-gray-500">正在分析对话...</span>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {recommendations.slice(0, 4).map((rec, idx) => (
                  <Link 
                    key={`${rec.source}-${rec.destination.id}-${idx}`}
                    href={`/destinations/${rec.destination.id}`}
                    className="group rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                  >
                    <div className="relative aspect-[16/10] bg-gray-100">
                      <img 
                        src={resolveCoverSrc(rec.destination.cover_image)} 
                        alt={rec.destination.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={onImgErrorUseFallback}
                      />
                      <div className="absolute top-1.5 left-1.5">
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                          {rec.source === 'chat_match' ? '对话匹配' : '热门'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <h4 className="font-semibold text-gray-800 text-sm group-hover:text-amber-600 transition-colors truncate">
                        {rec.destination.name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{rec.destination.city}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600">还没和小游聊过？去聊聊你想去的地方吧！</p>
              </div>
            )}
            
            {/* 行程规划建议 */}
            {planSuggestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-700">推荐行程</span>
                </div>
                {planSuggestions.map((plan, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-100">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-gray-800 text-sm">{plan.title}</h5>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{plan.destinations.slice(0, 3).map(d => d.name).join(' -> ')}</p>
                    </div>
                    <button
                      onClick={() => handleGenerateItinerary(plan)}
                      disabled={isGenerating}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors ml-3 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          生成中
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          生成
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          
          </div>

          {/* 行程生成弹窗 */}
          {showTripModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                {/* 弹窗头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold text-gray-800">
                      {isGenerating ? '正在生成...' : (currentTrip?.trip?.title || '行程规划')}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowTripModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 历史行程标签 */}
                {generatedTrips.length > 1 && !isGenerating && (
                  <div className="px-6 py-2 border-b border-gray-100 flex gap-2 overflow-x-auto flex-shrink-0">
                    {generatedTrips.map((trip, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentTrip(trip)}
                        className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                          currentTrip === trip 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {trip.trip?.title || `行程 ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* 弹窗内容 */}
                <div className="p-6 overflow-y-auto flex-1">
                  {isGenerating ? (
                    // 加载中
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mb-4" />
                      <p className="text-gray-600">正在为你规划完美行程...</p>
                      <p className="text-sm text-gray-400 mt-2">预计需要10-20秒</p>
                    </div>
                  ) : currentTrip?.success === true ? (
                    // 显示行程内容
                    <div className="space-y-4">
                      {currentTrip.trip?.description && (
                        <p className="text-gray-600 bg-emerald-50 p-4 rounded-xl">
                          {currentTrip.trip.description}
                        </p>
                      )}
                      
                      {/* 行程日程 */}
                      {currentTrip.items?.map((item: any, idx: number) => (
                        <div key={idx} className="border-l-2 border-emerald-200 pl-4 relative">
                          <div className="absolute -left-2 top-0 w-4 h-4 bg-emerald-500 rounded-full"></div>
                          <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-1 rounded-full">
                                第{item.day_number}天
                              </span>
                              {item.start_time && (
                                <span className="text-xs text-gray-500">
                                  {item.start_time}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-gray-800">{item.title}</h4>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                            {item.location && (
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {(!currentTrip.items || currentTrip.items.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          暂无详细行程信息
                        </div>
                      )}
                    </div>
                  ) : (
                    // 错误状态
                    <div className="text-center py-8">
                      <div className="text-red-500 mb-2">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="font-medium">行程生成失败</p>
                      </div>
                      {currentTrip && (
                        <p className="text-sm text-gray-500 mt-2">
                          {currentTrip.error || '请检查控制台获取更多信息'}
                        </p>
                      )}
                      <button
                        onClick={() => handleGenerateItinerary(planSuggestions[0] || { title: '重新生成', destinations: [{ name: '北京' }] })}
                        className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        重新生成
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 弹窗底部 */}
                {currentTrip?.success && (
                  <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                    <button
                      onClick={() => setShowTripModal(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      关闭
                    </button>
                    <button
                      onClick={handleSaveTrip}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      保存到我的行程
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 推荐游记 */}
          {(loadingRecommendedNotes || recommendedNotes.length > 0) && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-sky-600" />
                <h3 className="text-lg font-bold text-gray-800">根据你的行程推荐游记</h3>
              </div>
              {loadingRecommendedNotes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedNotes.slice(0, 3).map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* 所有游记搜索和列表 */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-gray-500" />
                全部游记
              </h3>
              <div className="flex items-center gap-3">
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索游记..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                    />
                  </div>
                </form>
                {isAuthenticated && (
                  <Link 
                    href="/travel-notes/new"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-sky-700 hover:to-indigo-700 transition-all whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    写游记
                  </Link>
                )}
              </div>
            </div>
            
            {/* Notes Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无游记</h3>
                <p className="text-gray-500">成为第一个分享旅行故事的人吧</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
            
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
