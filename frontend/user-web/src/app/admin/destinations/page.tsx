/**
 * =====================================================
 * 管理后台 - 目的地管理模块
 * =====================================================
 * 
 * 【功能列表】
 * - 目的地列表展示（分页）
 * - 目的地搜索（关键词、城市筛选）
 * - 目的地信息编辑（名称/城市/省份/描述/评分/价格/开放时间）
 * - 封面图片上传
 * - 删除目的地
 * - 创建新目的地
 * - 刷新列表功能
 * 
 * 【组件依赖】
 * - Navbar, Footer: 布局组件
 * - AdminGuard: 管理员权限守卫
 * - resolveCoverSrc: 图片 URL 处理
 * 
 * 【API 接口】
 * - GET /api/destinations?page=xxx&per_page=12: 获取目的地列表
 * - POST /api/destinations: 创建目的地
 * - PUT /api/destinations/${id}: 更新目的地
 * - DELETE /api/destinations/${id}: 删除目的地
 * 
 * 【状态管理】
 * - useState: destinations, page, total, keyword, editingId, editData, uploadingId
 * - useCallback: fetchDestinations, saveEdit, deleteDestination, uploadCover
 */
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AdminGuard } from '@/components/AdminGuard'
import {
  Loader2, MapPin, Search, ChevronLeft, ChevronRight,
  Edit2, Save, X, Trash2, RefreshCw, ArrowLeft, ImagePlus, Upload
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { resolveCoverSrc } from '@/lib/media'

const API_BASE = ''  // 使用相对路径，通过 Next.js rewrites 代理

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

export default function AdminDestinationsPage() {
  const searchParams = useSearchParams()
  const cityFilter = searchParams.get('city') || ''

  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<Destination>>({})
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const perPage = 12

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage)
      })
      if (keyword.trim()) params.set('keyword', keyword.trim())
      if (cityFilter) params.set('city', cityFilter)

      const token = localStorage.getItem('admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/destinations?${params.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setDestinations(data.destinations || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      console.error('加载目的地失败', e)
      toast.error('加载失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [page, keyword, cityFilter])

  useEffect(() => {
    fetchDestinations()
  }, [fetchDestinations])

  const startEdit = (d: Destination) => {
    setEditingId(d.id)
    setEditData({ ...d })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      const token = localStorage.getItem('admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/destinations/${editingId}`, {
        method: 'PUT',
        headers: { ...adminHeaders(), 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editData)
      })
      if (!res.ok) throw new Error('保存失败')
      toast.success('保存成功')
      setEditingId(null)
      setEditData({})
      fetchDestinations()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteDest = async (id: number) => {
    if (!confirm('确定要删除这个目的地吗？')) return
    try {
      const token = localStorage.getItem('admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/destinations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('删除失败')
      toast.success('删除成功')
      fetchDestinations()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleImageUpload = async (destId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('仅支持 JPG/PNG/WebP 格式')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过 10MB')
      return
    }

    setUploadingId(destId)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const token = localStorage.getItem('admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/destinations/${destId}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) throw new Error('上传失败')
      toast.success('图片上传成功')
      fetchDestinations()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploadingId(null)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="p-2 hover:bg-white rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">目的地管理</h1>
                {cityFilter && (
                  <p className="text-sm text-green-600 mt-1">
                    筛选: {cityFilter} ({total} 处)
                  </p>
                )}
              </div>
            </div>
            <button onClick={fetchDestinations} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>

          {/* 搜索栏 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索目的地名称..."
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">封面</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">名称</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">城市</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">省份</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">评分</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">门票</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                        <p className="mt-2 text-sm text-gray-500">加载中...</p>
                      </td>
                    </tr>
                  ) : destinations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    destinations.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-gray-100">
                            {d.cover_image ? (
                              <>
                                <img src={resolveCoverSrc(d.cover_image)} alt="" className="w-full h-full object-cover" />
                                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(d.id, e)}
                                    disabled={uploadingId === d.id}
                                  />
                                  <ImagePlus className="h-5 w-5 text-white" />
                                </label>
                              </>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-gray-200 transition-colors">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(d.id, e)}
                                  disabled={uploadingId === d.id}
                                />
                                {uploadingId === d.id ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                ) : (
                                  <Upload className="h-5 w-5 text-gray-400" />
                                )}
                              </label>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {editingId === d.id ? (
                            <input
                              value={editData.name || ''}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                          ) : (
                            <span className="font-medium text-gray-900">{d.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {editingId === d.id ? (
                            <input
                              value={editData.city || ''}
                              onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                          ) : (
                            d.city
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {editingId === d.id ? (
                            <input
                              value={editData.province || ''}
                              onChange={(e) => setEditData({ ...editData, province: e.target.value })}
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                          ) : (
                            d.province
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            {d.rating?.toFixed(1) || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          ¥{d.ticket_price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {editingId === d.id ? (
                              <>
                                <button onClick={saveEdit} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200">
                                  <Save className="h-4 w-4" />
                                </button>
                                <button onClick={cancelEdit} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(d)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => deleteDest(d.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {!loading && destinations.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-600">
                  共 {total} 条，第 {page}/{totalPages} 页
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 py-1.5 text-sm">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </AdminGuard>
  )
}
