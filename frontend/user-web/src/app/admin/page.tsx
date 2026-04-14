'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import {
  BarChart3, Loader2, MapPin, Users, Calendar, FileText, MessageSquare,
  ShoppingBag, Footprints, Bell, Settings, Search, ChevronLeft, ChevronRight,
  Edit2, Save, X, TrendingUp, Eye, Trash2, RefreshCw, Database, AlertCircle,
  Upload, ImagePlus
} from 'lucide-react'
import { AdminGuard } from '@/components/AdminGuard'
import { toast } from 'react-hot-toast'

/** 后端地址 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'

/* ==================== 类型定义 ==================== */

type Stats = {
  destinations: number; users: number; trips: number; pages?: number;
  configs?: number; comments?: number; orders?: number; footprints?: number;
  notifications?: number; menus?: number;
  province_distribution?: { province: string; count: number }[]
  city_top?: { city: string; count: number; province?: string }[]
  trip_status?: { status: string; count: number }[]
  order_status?: { status: string; count: number; amount: number }[]
  recent_users?: any[]
  recent_trips?: any[]
  recent_comments?: any[]
  recent_orders?: any[]
  rating_summary?: { avg_rating: number; total_rated: number }
}

type Destination = {
  id: number; name: string; city: string; province: string;
  description: string; cover_image: string; rating: number;
  ticket_price: number; open_time: string; created_at: string
}

type AdminUser = {
  id: string; username: string; nickname: string; email: string;
  phone: string; avatar_url: string; is_admin: boolean;
  membership_level: number; created_at: string
}

/* ==================== 工具函数 ==================== */

function adminHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { ...adminHeaders(), ...(options?.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/* ==================== 统计卡片 ==================== */

function StatCard({ icon: Icon, label, value, color, subText }: {
  icon: any; label: string; value: number | string; color: string; subText?: string
}) {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue:   { bg: 'from-blue-500 to-blue-600', icon: 'text-blue-500', text: 'text-blue-600' },
    green:  { bg: 'from-emerald-500 to-emerald-600', icon: 'text-emerald-500', text: 'text-emerald-600' },
    purple: { bg: 'from-purple-500 to-purple-600', icon: 'text-purple-500', text: 'text-purple-600' },
    orange: { bg: 'from-orange-500 to-orange-600', icon: 'text-orange-500', text: 'text-orange-600' },
    red:    { bg: 'from-red-500 to-red-600', icon: 'text-red-500', text: 'text-red-600' },
    pink:   { bg: 'from-pink-500 to-pink-600', icon: 'text-pink-500', text: 'text-pink-600' },
    cyan:   { bg: 'from-cyan-500 to-cyan-600', icon: 'text-cyan-500', text: 'text-cyan-600' },
    indigo: { bg: 'from-indigo-500 to-indigo-600', icon: 'text-indigo-500', text: 'text-indigo-600' },
  }
  const c = colorMap[color] || colorMap.blue
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Logo移到右上角 */}
      <div className={`absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.bg} shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 pr-12">{label}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">{value.toLocaleString()}</p>
        {subText && <p className="mt-1 text-xs text-gray-400">{subText}</p>}
      </div>
    </div>
  )
}

/* ==================== 省份分布条形图组件（可点击展开）==================== */

type CityInProvince = { city: string; count: number }

function ProvinceChart({ data }: { data: { province: string; count: number }[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cities, setCities] = useState<CityInProvince[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  if (!data.length) return <p className="text-sm text-gray-400">暂无数据</p>
  const maxCount = Math.max(...data.map(d => d.count), 1)

  const toggleProvince = async (province: string) => {
    if (expanded === province) { setExpanded(null); return }
    setExpanded(province); setLoadingCities(true)
    try {
      // 从省份详情API获取该省城市列表
      const res = await adminFetch<{ success: boolean; data: Array<{ province: string; cities: CityInProvince[] }> }>('/api/admin/geo/provinces')
      const provData = res.data?.find(p => p.province === province)
      setCities(provData?.cities || [])
    } catch { setCities([]) } finally { setLoadingCities(false) }
  }

  return (
    <div className="space-y-2.5">
      {data.map((item) => {
        const isOpen = expanded === item.province
        return (
          <div key={item.province}>

            <div
              onClick={() => toggleProvince(item.province)}
              className={`group flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1 transition-colors ${isOpen ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              title={isOpen ? '收起' : `查看 ${item.province} 的所有城市`}
            >

              <svg className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="w-14 truncate text-xs font-medium text-gray-600 group-hover:text-blue-600 shrink-0">{item.province}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                >
                  <span className="text-[10px] font-semibold text-white drop-shadow">{item.count} 处</span>
                </div>
              </div>
            </div>


            {isOpen && (
              <div className="ml-8 mt-1 mb-2 pl-3 border-l-2 border-blue-200 space-y-1 animate-in slide-in-from-left-2 duration-200">
                {loadingCities ? (
                  <div className="py-3 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-blue-400" /></div>
                ) : cities.length === 0 ? (
                  <p className="py-2 text-xs text-gray-400">无城市数据</p>
                ) : (
                  cities.map(c => (
                    <CityLinkRow key={c.city} city={c.city} count={c.count} />
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* 城市链接行：点击跳转景点列表 */
function CityLinkRow({ city, count }: { city: string; count: number }) {
  return (
    <Link
      href={`/admin/destinations?city=${encodeURIComponent(city)}`}
      className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-green-50 hover:text-green-700 text-xs text-gray-600 transition-colors group/city"
    >
      <span className="flex items-center gap-1.5 truncate max-w-[140px]">
        <MapPin className="h-3 w-3 text-green-400 group-hover/city:text-green-500 shrink-0" />
        <span className="truncate group-hover/city:font-medium">{city}</span>
      </span>
      <span className="shrink-0 tabular-nums text-[11px] text-gray-400 group-hover/city:text-green-600">{count} 处</span>
    </Link>
  )
}

/* 城市排行组件（可点击跳转）*/
function CityRanking({ data, onCityClick }: { data: { city: string; count: number; province?: string }[]; onCityClick?: (city: string) => void }) {
  if (!data.length) return <p className="text-sm text-gray-400">暂无数据</p>
  return (
    <div className="space-y-1.5">
      {(data || []).slice(0, 8).map((city, idx) => (
        <Link key={city.city}
          href={`/admin/destinations?city=${encodeURIComponent(city.city)}`}
          className="group/city flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-green-50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
              idx < 3 ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {idx + 1}
            </span>
            <MapPin className="h-3 w-3 text-gray-300 group-hover/city:text-green-400 shrink-0" />
            <span className="text-sm text-gray-700 group-hover/city:text-green-700 group-hover/city:font-medium truncate">{city.city}</span>
          </div>
          <span className="text-xs font-semibold text-gray-400 group-hover/city:text-green-600 shrink-0 tabular-nums ml-2">{city.count} 处</span>
        </Link>
      ))}
      {(data || []).length === 0 && <p className="text-sm text-gray-400 text-center py-2">暂无数据</p>}
    </div>
  )
}

/* ==================== 目的地管理表格 ==================== */

function DestinationTable() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<Destination>>({})
  const [searchTimer, setSearchTimer] = useState<any>(null)
  /* 图片上传状态 */
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const perPage = 8

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (keyword.trim()) params.set('keyword', keyword.trim())
      
      // 使用原生fetch添加错误处理
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''
      const url = `${API_BASE}/api/admin/destinations?${params.toString()}`
      
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const data = await res.json()
      console.log('API Response:', data) // 调试日志
      
      setDestinations(data.destinations || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      console.error('加载目的地失败', e.message)
      toast.error('加载数据失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => { fetchDestinations() }, [fetchDestinations])

  const handleSearch = (val: string) => {
    setKeyword(val); setPage(1)
    if (searchTimer) clearTimeout(searchTimer)
    setSearchTimer(setTimeout(() => {}, 300))
  }

  const startEdit = (d: Destination) => { setEditingId(d.id); setEditData({ ...d }) }
  const cancelEdit = () => { setEditingId(null); setEditData({}) }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      await adminFetch(`/api/admin/destinations/${editingId}`, { method: 'PUT', body: JSON.stringify(editData) })
      setEditingId(null); setEditData({}); fetchDestinations()
    } catch (e: any) { alert('保存失败: ' + e.message) }
  }

  const deleteDest = async (id: number) => {
    if (!confirm('确定要删除这个目的地吗？')) return
    try { await adminFetch(`/api/admin/destinations/${id}`, { method: 'DELETE' }); fetchDestinations() }
    catch (e: any) { alert('删除失败: ' + e.message) }
  }

  /** 图片上传处理 */
  const handleImageUpload = async (destId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 校验类型
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
    if (!allowed.includes(file.type)) { alert('仅支持 JPG/PNG/WebP/GIF/BMP 格式'); return }
    if (file.size > 10 * 1024 * 1024) { alert('文件大小不能超过 10MB'); return }

    setUploadingId(destId)
    try {
      const formData = new FormData()
      formData.append('image', file)

      // 用原生 fetch 上传（multipart 不能用 json headers）
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''
      const res = await fetch(`${API_BASE}/api/admin/destinations/${destId}/upload-image`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json().catch(() => ({ success: false, error: '上传响应解析失败' }))

      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

      // 更新本地数据中的 cover_image
      setDestinations(prev => prev.map(d =>
        d.id === destId ? { ...d, cover_image: data.destination?.cover_image || d.cover_image } : d
      ))

      // 显示成功提示（用简单方式，避免依赖 toast?
      alert(`?${data.message || '图片上传成功'}`)
    } catch (err: any) {
      alert('上传失败: ' + err.message)
    } finally {
      setUploadingId(null)
      // 清空 input 以便重复上传同一文件
      e.target.value = ''   // e.target.value?
    }
  }

  /** 构建图片完整URL */
  const imageUrl = (coverImage?: string | null) => {
    if (!coverImage) return null
    if (coverImage.startsWith('http')) return coverImage
    return `${API_BASE}/api/media?path=${encodeURIComponent(coverImage)}`
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500" />
          目的地管理
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="搜索目的地..." value={keyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent w-48" />
          </div>
          <button onClick={fetchDestinations} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="刷新">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
          <span className="text-xs text-gray-400">共 {total} 处</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 text-left">
              <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">ID</th>
              <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 w-20">封面</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">名称</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">城市</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">省份</th>
              <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">评分</th>
              <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">票价</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-50">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" /></td></tr>
            ) : destinations.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
            ) : destinations.map((d) => (
              <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group">

                <td className="px-3 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">#{d.id}</td>


                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="relative group/img w-[52px] h-[38px] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    {imageUrl(d.cover_image) ? (
                      <>
                        <img src={imageUrl(d.cover_image)!} alt={d.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />

                        <label
                          title="更换封面图"
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 cursor-pointer transition-opacity"
                        >
                          {uploadingId === d.id
                            ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                            : <Upload className="h-4 w-4 text-white" />
                          }
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                            className="hidden" capture="user"
                            onChange={(e) => handleImageUpload(d.id, e)}
                            disabled={uploadingId === d.id}
                          />
                        </label>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors">
                        {uploadingId === d.id
                          ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          : <><ImagePlus className="h-4 w-4 text-gray-300 mb-0.5" /><span className="text-[9px] text-gray-300">上传</span></>
                        }
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                          className="hidden" onChange={(e) => handleImageUpload(d.id, e)}
                          disabled={uploadingId === d.id}
                        />
                      </label>
                    )}
                  </div>
                </td>

                {editingId === d.id ? (
                  <>
                    <td className="px-4 py-2"><input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" /></td>
                    <td className="px-4 py-2"><input value={editData.city || ''} onChange={(e) => setEditData({ ...editData, city: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" /></td>
                    <td className="px-4 py-2"><input value={editData.province || ''} onChange={(e) => setEditData({ ...editData, province: e.target.value })} className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" /></td>
                    <td className="px-3 py-2"><input type="number" step="0.1" min="0" max="5" value={editData.rating ?? ''} onChange={(e) => setEditData({ ...editData, rating: parseFloat(e.target.value) || 0 })} className="w-16 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" /></td>
                    <td className="px-3 py-2"><input type="number" min="0" value={editData.ticket_price ?? ''} onChange={(e) => setEditData({ ...editData, ticket_price: parseFloat(e.target.value) || 0 })} className="w-20 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" /></td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={saveEdit} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"><Save className="h-3.5 w-3.5" /></button>
                        <button onClick={cancelEdit} className="p-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.city}</td>
                    <td className="px-4 py-3 text-gray-600">{d.province}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.rating >= 4 ? 'bg-green-100 text-green-700' : d.rating >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                        ⭐ {d.rating?.toFixed(1) || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600">¥{d.ticket_price || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(d)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="编辑"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteDest(d.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-400">第 {page} / {totalPages} 页</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p = i + 1
              if (totalPages > 5 && page > 3) p = page - 2 + i
              if (p < 1 || p > totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === page ? 'bg-blue-500 text-white' : 'border border-gray-200 hover:bg-gray-100'}`}>
                  {p}
                </button>
              )
            })}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==================== 用户快速列表 ==================== */

function UserQuickList() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch<{ success: boolean; users: AdminUser[] }>('/api/admin/users?limit=10')
      .then(data => { if (data.success) setUsers(data.users || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const deleteUser = async (id: string) => {
    if (!confirm('确定删除该用户？此操作不可逆！')) return
    try {
      await adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      setUsers(users.filter(u => u.id !== id))
    } catch (e: any) { alert('删除失败: ' + e.message) }
  }

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Users className="h-4 w-4 text-green-500" />
          最近注册用户
        </h3>
        <Link href="/admin/users" className="text-xs text-blue-500 hover:text-blue-700 font-medium">查看全部 →</Link>
      </div>
      <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
        {loading ? (
          <div className="px-5 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-green-500" /></div>
        ) : users.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">暂无用户</div>
        ) : (
          users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(u.nickname || u.username || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm truncate">{u.nickname || u.username}</span>
                    {u.is_admin && <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-red-100 text-red-600 text-[10px] font-bold">管理</span>}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{u.email || u.phone || '未填写联系方式'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-[11px] text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}</span>
                <button onClick={() => deleteUser(u.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除用户">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ==================== 最近动态（评论+行程+订单）==================== */

function RecentActivity({ stats }: { stats: Stats | null }) {
  const [activeTab, setActiveTab] = useState<'comments' | 'trips' | 'orders'>('comments')

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-1 px-5 pt-4 pb-0 border-b border-gray-100">
        {[
                    { key: 'comments' as const, label: '最新评论', icon: MessageSquare, color: 'text-orange-500', dataKey: 'recent_comments' as keyof Stats },
                    { key: 'trips' as const, label: '最近行程', icon: Calendar, color: 'text-purple-500', dataKey: 'recent_trips' as keyof Stats },
                    { key: 'orders' as const, label: '最近订单', icon: ShoppingBag, color: 'text-cyan-500', dataKey: 'recent_orders' as keyof Stats },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.key
                ? `border-blue-500 ${tab.color}`
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-5 min-h-[240px]">
        {activeTab === 'comments' && (
          <div className="space-y-3">
            {(stats?.recent_comments || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">暂无评论</p>
            ) : (stats?.recent_comments || []).map((c: any, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-orange-50/40 hover:bg-orange-50/70 transition-colors">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm text-gray-800">{c.user?.nickname || `用户#${c.user_id}`}</span>
                    <span className="text-xs text-gray-400">目标 #{c.destination_id}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'trips' && (
          <div className="space-y-3">
            {(stats?.recent_trips || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">暂无行程</p>
            ) : (stats?.recent_trips || []).map((t: any, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-purple-50/40 hover:bg-purple-50/70 transition-colors">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800">{t.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{t.start_date || '-'}</span>
                    <span>→</span>
                    <span>{t.end_date || '-'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      t.status === 'completed' ? 'bg-green-100 text-green-700' :
                      t.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{t.status || 'planning'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {(stats?.recent_orders || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">暂无订单</p>
            ) : (stats?.recent_orders || []).map((o: any, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-cyan-50/40 hover:bg-cyan-50/70 transition-colors">
                <div className="h-8 w-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-xs text-gray-500">{o.order_no}</span>
                    <span className="font-semibold text-sm text-red-500">¥{o.total_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      o.status === 'paid' || o.status === 'completed' ? 'bg-green-100 text-green-700' :
                      o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{o.status || 'unknown'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================== 状态分布面板 ==================== */

function StatusPanels({ stats }: { stats: Stats | null }) {
  const statusLabels: Record<string, string> = {
        planning: '规划中', ongoing: '进行中', completed: '已完成', cancelled: '已取消',
        pending: '待支付', paid: '已支付', shipped: '已发货', refunded: '已退款',
  }
  const statusColors: Record<string, string> = {
    planning: 'bg-blue-100 text-blue-700', ongoing: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', shipped: 'bg-blue-100 text-blue-700', refunded: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm p-5">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          行程状态分布
        </h3>
        {(stats?.trip_status || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无行程数据</p>
        ) : (
          <div className="space-y-2.5">
            {(stats?.trip_status || []).map((s: any) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabels[s.status] || s.status}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${(s.count / Math.max(...(stats?.trip_status || []).map((t: any) => t.count))) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-right">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm p-5">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
          <ShoppingBag className="h-4 w-4 text-cyan-500" />
          订单状态分布
        </h3>
        {(stats?.order_status || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无订单数据</p>
        ) : (
          <div className="space-y-2.5">
            {(stats?.order_status || []).map((o: any) => (
              <div key={o.status} className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabels[o.status] || o.status}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${(o.count / Math.max(...(stats?.order_status || []).map((x: any) => x.count), 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-right">{o.count}</span>
                  <span className="text-xs text-red-500 w-14 text-right">¥{o.amount?.toFixed(0) || '0'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================== 主页面 ==================== */

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setLoading(true); setError(null)
        const data = await adminFetch<{ stats: Stats }>('/api/stats')
        if (!cancelled) setStats(data?.stats ?? null)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  /* 统计卡片配置 */
  const statCards = [
    { icon: MapPin, label: '目的地总数', value: stats?.destinations ?? 0, color: 'blue' as const, subText: '旅游景点数据' },
    { icon: Users, label: '注册用户', value: stats?.users ?? 0, color: 'green' as const, subText: '平台用户总数' },
    { icon: Calendar, label: '旅行行程', value: stats?.trips ?? 0, color: 'purple' as const, subText: '用户创建的行程' },
    { icon: MessageSquare, label: '用户评论', value: stats?.comments ?? 0, color: 'orange' as const, subText: '景点评论总数' },
    { icon: ShoppingBag, label: '订单数量', value: stats?.orders ?? 0, color: 'red' as const, subText: '交易订单统计' },
    { icon: Footprints, label: '用户足迹', value: stats?.footprints ?? 0, color: 'pink' as const, subText: '浏览访问记录' },
    { icon: FileText, label: '内容页面', value: stats?.pages ?? 0, color: 'cyan' as const, subText: 'CMS 内容管理' },
    { icon: Bell, label: '通知消息', value: stats?.notifications ?? 0, color: 'indigo' as const, subText: '站内通知' },
  ]

  return (
    <AdminGuard>
      <div className="min-h-screen page-bg">
        <Navbar />
        <main className="pt-16 pb-12">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">


            <div className="flex items-end justify-between gap-4 flex-wrap mt-8 mb-8">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                  <BarChart3 className="h-6.5 w-6.5" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">管理仪表</h1>
                  <p className="text-sm text-gray-500 mt-0.5">实时数据监控 · 内容管理 · 用户运营</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/80 backdrop-blur px-3 py-2 rounded-lg border border-gray-200/60">
                <Database className="h-3.5 w-3.5" />
                <span className="font-mono">{API_BASE}</span>
                <div className="relative group">
                  <Eye className="h-3.5 w-3.5 cursor-help text-green-500" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    后端运行正常
                  </div>
                </div>
              </div>
            </div>


            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-gray-500 font-medium">正在加载数据...</p>
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 px-6 py-5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">数据加载失败</p>
                  <p className="text-sm text-red-500 mt-1">{error}</p>
                  <p className="text-xs text-red-400 mt-2">请确认后端服务已在 {API_BASE} 运行</p>
                </div>
              </div>
            )}

            {!loading && !error && stats && (
              <>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
                  {statCards.map(card => (
                    <StatCard key={card.label} {...card} />
                  ))}
                </div>


                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

                  <div className="xl:col-span-1 space-y-6">
                    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm p-5">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        省份分布 TOP 10
                      </h3>
                      <ProvinceChart data={stats.province_distribution || []} />
                    </div>
                    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm p-5">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                        城市排行 TOP 10
                      </h3>
                      <CityRanking data={stats.city_top || []} />
                    </div>
                  </div>


                  <div className="xl:col-span-2">
                    <DestinationTable />
                  </div>
                </div>


                <StatusPanels stats={stats} />


                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                  <div className="xl:col-span-2">
                    <RecentActivity stats={stats} />
                  </div>
                  <div className="xl:col-span-1">
                    <UserQuickList />
                  </div>
                </div>


                <div className="mt-8 rounded-2xl border border-gray-200/80 bg-white shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <Settings className="h-4 w-4 text-gray-500" />
                    快捷操作入口
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { href: '/admin/comments', label: '评论管理', desc: '审核/删除评论' },
                      { href: '/admin/users', label: '用户管理', desc: '查看/编辑用户' },
                      { href: '/admin/footprints', label: '足迹管理', desc: '浏览记录管理' },
                      { href: '/api/docs', label: 'API 文档', desc: '接口说明', external: true },
                      { href: '/api/health', label: '健康检查', desc: '系统状态', external: true },
                      { href: '/destinations', label: '前台目的地', desc: '前端展示' },
                    ].map(link => (
                      <a key={link.href}
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noreferrer' : undefined}
                        className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-200"
                      >
                        <div className="h-10 w-10 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <Settings className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{link.label}</span>
                        <span className="text-[11px] text-gray-400">{link.desc}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
        <Footer />
      </div>
    </AdminGuard>
  )
}
