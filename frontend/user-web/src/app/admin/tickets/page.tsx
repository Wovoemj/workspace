'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Loader2, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight,
  Package, Eye, EyeOff, X, Calendar, DollarSign, Image as ImageIcon,
  ArrowUpDown, CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import { AdminGuard } from '@/components/AdminGuard'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'

type Product = {
  id: number
  name: string
  subtitle: string
  description: string
  destination_id: number | null
  category: string
  base_price: number
  discount_price: number | null
  price: number
  inventory_total: number
  inventory_sold: number
  inventory_available: number
  booking_type: string
  need_date: boolean
  need_time: boolean
  cover_image: string
  images: string[]
  status: string
  rating: number
  sold_count: number
  created_at: string
}

function adminHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...adminHeaders(), ...(options?.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || `HTTP ${res.status}`)
  }
  return res.json()
}

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: '在售', color: 'bg-green-100 text-green-700' },
  inactive: { label: '下架', color: 'bg-gray-100 text-gray-700' },
  sold_out: { label: '售罄', color: 'bg-red-100 text-red-700' },
}

const categoryMap: Record<string, { label: string }> = {
  ticket: { label: '门票' },
  tour: { label: '跟团游' },
  package: { label: '套餐' },
}

export default function AdminTicketsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  const perPage = 20

  const loadProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(perPage))
      if (search) params.set('q', search)
      if (statusFilter) params.set('status', statusFilter)

      const data = await adminFetch<{ success: boolean; products: Product[]; total: number }>(
        `/api/admin/tickets/products?${params}`
      )
      if (data.success) {
        setProducts(data.products)
        setTotal(data.total)
      }
    } catch (e: any) {
      toast.error(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [page, statusFilter])

  const handleSearch = () => {
    setPage(1)
    loadProducts()
  }

  const handleDelete = async (id: number) => {
                if (!confirm('确定要下架这个产品吗？')) return
    try {
      await adminFetch(`/api/admin/tickets/products/${id}`, { method: 'DELETE' })
                        toast.success('已下？')
      loadProducts()
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await adminFetch(`/api/admin/tickets/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      toast.success('状态已更新')
      loadProducts()
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">

        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                  ?返回后台
                </Link>
                <h1 className="text-xl font-bold text-gray-900">门票产品管理</h1>
              </div>
              <button
                onClick={() => { setEditingProduct(null); setShowModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4" />
                添加产品
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}   // value?
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索产品名称..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <select
                value={statusFilter}   // value?
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部状</option>
                <option value="active">在售</option>
                <option value="inactive">下架</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                搜索
              </button>
            </div>
          </div>


          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">加载?..</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>暂无产品</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">产品</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">价格</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">库存</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">销</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.cover_image ? (
                            <img src={product.cover_image} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.subtitle || '无副标题'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {categoryMap[product.category]?.label || product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-medium">¥{product.price}</div>
                        {product.discount_price && product.discount_price < product.base_price && (
                          <div className="text-sm text-gray-400 line-through">¥{product.base_price}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{product.inventory_available}</div>
                        <div className="text-xs text-gray-400">总量: {product.inventory_total}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{product.sold_count}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusMap[product.status]?.color || 'bg-gray-100'}`}>
                          {statusMap[product.status]?.label || product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingProduct(product); setShowModal(true) }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="编辑"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(product.id, product.status === 'active' ? 'inactive' : 'active')}
                            className={`p-2 rounded-lg ${product.status === 'active' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={product.status === 'active' ? '下架' : '上架'}
                          >
                            {product.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}


            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  ?{total} 条记录，?{page}/{totalPages} ?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一?
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一?
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>


        {showModal && (
          <ProductModal
            product={editingProduct}
            onClose={() => { setShowModal(false); setEditingProduct(null) }}
            onSave={() => { setShowModal(false); setEditingProduct(null); loadProducts() }}
          />
        )}
      </div>
    </AdminGuard>
  )
}

// 产品编辑弹窗组件
function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (p: any) => void }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    subtitle: product?.subtitle || '',
    description: product?.description || '',
    category: product?.category || 'ticket',
    base_price: product?.base_price || 0,
    discount_price: product?.discount_price || '',
    inventory_total: product?.inventory_total || 0,
    booking_type: product?.booking_type || 'date',
    need_date: product?.need_date ?? true,
    need_time: product?.need_time ?? false,
    status: product?.status || 'active',
    cover_image: product?.cover_image || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.base_price) {
                        toast.error('请填写必填字？')
      return
    }
    setSaving(true)
    try {
      const url = product ? `/api/admin/tickets/products/${product.id}` : '/api/admin/tickets/products'
      const method = product ? 'PUT' : 'POST'
      const data = await adminFetch<{ success: boolean }>(url, {
        method,
        body: JSON.stringify({
          ...form,
          discount_price: form.discount_price ? Number(form.discount_price) : null,
          inventory_total: Number(form.inventory_total),
          base_price: Number(form.base_price),
        }),
      })
      if (data.success) {
        toast.success(product ? '更新成功' : '创建成功')
        onSave(form)
      }
    } catch (e: any) {
      toast.error(e?.message || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{product ? '编辑产品' : '添加产品'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品名称 *</label>
            <input
              type="text"
              value={form.name}   // value?
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">副标</label>
            <input
              type="text"
              value={form.subtitle}   // value?
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={form.description}   // value?
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={form.category}   // value?
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ticket">门票</option>
                <option value="tour">跟团</option>
                <option value="package">套餐</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状</label>
              <select
                value={form.status}   // value?
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">在售</option>
                <option value="inactive">下架</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">原价 *</label>
              <input
                type="number"
                value={form.base_price}   // value?
                onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优惠</label>
              <input
                type="number"
                value={form.discount_price}   // value?
                onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">库存总量</label>
              <input
                type="number"
                value={form.inventory_total}   // value?
                onChange={(e) => setForm({ ...form, inventory_total: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预约类型</label>
              <select
                value={form.booking_type}   // value?
                onChange={(e) => setForm({ ...form, booking_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">日期预约</option>
                <option value="timeslot">分时预约</option>
                <option value="instant">即时出票</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">封面图片URL</label>
            <input
              type="text"
              value={form.cover_image}   // value?
              onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.need_date}
                onChange={(e) => setForm({ ...form, need_date: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">需要选择日期</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.need_time}
                onChange={(e) => setForm({ ...form, need_time: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">需要选择时段</span>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
