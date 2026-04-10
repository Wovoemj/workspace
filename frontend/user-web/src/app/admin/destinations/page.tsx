'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Search, ChevronLeft, ChevronRight,
  Edit2, Save, X, Trash2, RefreshCw, Loader2, Upload, ImagePlus, ArrowLeft
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AdminGuard } from '@/components/AdminGuard'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'

type Destination = {
  id: number; name: string; city: string; province: string;
  description: string; cover_image: string; rating: number;
  ticket_price: number; open_time: string; created_at: string
}

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

export default function AdminDestinationsPage() {
  const searchParams = useSearchParams()

  /* 筛选参数 */
  const [filterCity, setFilterCity] = useState<string>(() => searchParams.get('city') || '')
  const [filterProvince, setFilterProvince] = useState<string>(() => searchParams.get('province') || '')
  const [keyword, setKeyword] = useState('')
  const [searchTimer, setSearchTimer] = useState<any>(null)

  /* 数据状态 */
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 12

  /* 编辑状态 */
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<Destination>>({})
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (keyword.trim()) params.set('keyword', keyword.trim())
      if (filterCity) params.set('city', filterCity)
      if (filterProvince) params.set('province', filterProvince)
      const data = await adminFetch<{ success: boolean; destinations: Destination[]; total: number }>(
        `/api/admin/destinations?${params.toString()}`
      )
      setDestinations(data.destinations || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      console.error('加载失败:', e.message)
    } finally {
      setLoading(false)
    }
  }, [page, keyword, filterCity, filterProvince])

  useEffect(() => { fetchDestinations() }, [fetchDestinations])

  useEffect(() => {
    // 监听 URL 参数变化（从省份/城市排行跳转过来时）
    const city = searchParams.get('city')
    if (city && city !== filterCity) { setFilterCity(city); setPage(1) }
    const prov = searchParams.get('province')
    if (prov && prov !== filterProvince) { setFilterProvince(prov); setPage(1) }
  }, [searchParams])

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

  /** 图片上传 */
  const handleImageUpload = async (destId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/bmp']
    if (!allowed.includes(file.type)) { alert('仅支持 JPG/PNG/WebP/GIF/BMP'); return }
    if (file.size > 10 * 1024 * 1024) { alert('文件不能超过10MB'); return }
    setUploadingId(destId)
    try {
      const fd = new FormData(); fd.append('image', file)
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''
      const res = await fetch(`${API_BASE}/api/admin/destinations/${destId}/upload-image`, {
        method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
      })
      const data = await res.json().catch(() => ({ success: false }))
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setDestinations(prev => prev.map(d => d.id === destId ? { ...d, cover_image: data.destination?.cover_image || d.cover_image } : d))
      alert(`✅ 上传成功`)
    } catch (err: any) { alert('上传失败: ' + err.message) }
    finally { setUploadingId(null); e.target.value = '' }
  }

  const imageUrl = (ci?: string | null) => {
    if (!ci) return null
    if (ci.startsWith('http')) return ci
    return `${API_BASE}/api/media?path=${encodeURIComponent(ci)}`
  }

  /* 清除筛选 */
  const clearFilters = () => { setFilterCity(''); setFilterProvince(''); setKeyword(''); setPage(1) }

  const totalPages = Math.ceil(total / perPage)
  const hasActiveFilter = !!filterCity || !!filterProvince || !!keyword.trim()

  /* 标题 */
  let pageTitle = '景点管理'
  if (filterCity) pageTitle = `${filterCity} · 景点列表`
  else if (filterProvince) pageTitle = `${filterProvince} · 景点列表`

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
        <Navbar />
        <main className="pt-16 pb-12">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">


            <div className="flex items-end justify-between gap-4 mt-8 mb-6">
              <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="h-5 w-5 text-gray-400" />
                </Link>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{pageTitle}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {hasActiveFilter ? (
                      <span>
                        当前筛选：
                        {filterCity && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium ml-1"><MapPin className="h-3 w-3 mr-1" />{filterCity}</span>}
                        {filterProvince && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium ml-1">{filterProvince}</span>}
                        {keyword.trim() && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium ml-1">搜索：{keyword}</span>}
                        <button onClick={clearFilters} className="ml-2 text-red-500 hover:text-red-700 underline text-xs">清除筛</button>
                      </span>
                    ) : (
                      '所有景点数据，支持按省份/城市/关键词筛选'
                    )}
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-500">?<strong>{total}</strong> 个景</span>
            </div>


            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="搜索景点名称..." value={keyword}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent w-64"
                  />
                </div>
                <button onClick={fetchDestinations} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="刷新">
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>


            <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
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
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">暂无景点数据</td></tr>
                    ) : destinations.map((d) => (
                      <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group">
                        {editingId === d.id ? (
                          <>
                            <td className="px-3 py-2 text-gray-400 font-mono text-xs">{d.id}</td>
                            <td className="px-3 py-2"><img src={imageUrl(d.cover_image)!} alt="" className="w-[52px] h-[38px] object-cover rounded-lg bg-gray-100" /></td>
                            <td className="px-4 py-2"><input value={editData.name||''} onChange={e=>setEditData({...editData,name:e.target.value})} className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/></td>
                            <td className="px-4 py-2"><input value={editData.city||''} onChange={e=>setEditData({...editData,city:e.target.value})} className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/></td>
                            <td className="px-4 py-2"><input value={editData.province||''} onChange={e=>setEditData({...editData,province:e.target.value})} className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/></td>
                            <td className="px-3 py-2"><input type="number" step="0.1" min="0" max="5" value={editData.rating??''} onChange={e=>setEditData({...editData,rating:parseFloat(e.target.value)||0})} className="w-16 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/></td>
                            <td className="px-3 py-2"><input type="number" min="0" value={editData.ticket_price??''} onChange={e=>setEditData({...editData,ticket_price:parseFloat(e.target.value)||0})} className="w-20 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/></td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1">
                                <button onClick={saveEdit} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"><Save className="h-3.5 w-3.5"/></button>
                                <button onClick={cancelEdit} className="p-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"><X className="h-3.5 w-3.5"/></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">#{d.id}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="relative group/img w-[52px] h-[38px] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                {imageUrl(d.cover_image) ? (
                                  <>
                                    <img src={imageUrl(d.cover_image)!} alt={d.name} className="w-full h-full object-cover" loading="lazy"/>
                                    <label title="更换封面图" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 cursor-pointer transition-opacity">
                                      {uploadingId===d.id?<Loader2 className="h-5 w-5 animate-spin text-white"/>:<Upload className="h-4 w-4 text-white"/>}
                                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" className="hidden" onChange={e=>handleImageUpload(d.id,e)} disabled={uploadingId===d.id}/>
                                    </label>
                                  </>
                                ) : (
                                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors">
                                    {uploadingId===d.id?<Loader2 className="h-4 w-4 animate-spin text-blue-500"/>:<><ImagePlus className="h-4 w-4 text-gray-300 mb-0.5"/><span className="text-[9px] text-gray-300">上传</span></>}
                                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" className="hidden" onChange={e=>handleImageUpload(d.id,e)} disabled={uploadingId===d.id}/>
                                  </label>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                            <td className="px-4 py-3 text-gray-600">{d.city}</td>
                            <td className="px-4 py-3 text-gray-600">{d.province}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                d.rating>=4?'bg-green-100 text-green-700':d.rating>=3?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-600'
                              }`}>★{d.rating?.toFixed(1)||'-'}</span>
                            </td>
                            <td className="px-3 py-3 text-gray-600">¥{d.ticket_price||0}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={()=>startEdit(d)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="编辑"><Edit2 className="h-3.5 w-3.5"/></button>
                                <button onClick={()=>deleteDest(d.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除"><Trash2 className="h-3.5 w-3.5"/></button>
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
                  <span className="text-xs text-gray-400">?{page}/{totalPages} ?/span>
                  <div className="flex items-center gap-1">
                    <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"><ChevronLeft className="h-3.5 w-3.5"/></button>
                    {Array.from({length:Math.min(totalPages,7)},(_,i)=>{let p=i+1;if(totalPages>7&&page>4)p=page-3+i;if(p<1||p>totalPages)return null;return(<button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${p===page?'bg-blue-500 text-white':'border border-gray-200 hover:bg-gray-100'}`}>{p}</button>)})}
                    <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"><ChevronRight className="h-3.5 w-3.5"/></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AdminGuard>
  )
}
