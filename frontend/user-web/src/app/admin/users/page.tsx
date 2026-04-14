'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import {
  Users, Plus, Search, ChevronLeft, ChevronRight,
  Edit2, Save, X, Trash2, RefreshCw, Loader2, UserPlus, Shield
} from 'lucide-react'
import { AdminGuard } from '@/components/AdminGuard'

/** 后端地址 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'

/* ==================== 类型定义 ==================== */

type AdminUser = {
  id: string; username: string; nickname: string;
  email: string | null; phone: string | null;
  avatar_url: string | null; is_admin: boolean;
  membership_level: number; created_at: string | null
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

/* ==================== 用户管理表格组件 ==================== */

function UserManagementTable() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [searchTimer, setSearchTimer] = useState<any>(null)
  /* 编辑状态 */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<AdminUser>>({})
  /* 创建用户弹窗 */
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    username: '', password: '', nickname: '',
    email: '', phone: '', membership_level: '1',
  })

  const perPage = 10

  /* ---- 加载用户列表 ---- */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (keyword.trim()) params.set('keyword', keyword.trim())
      const data = await adminFetch<{ success: boolean; users: AdminUser[]; total: number; page: number }>(
        `/api/admin/users?${params.toString()}`
      )
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      console.error('加载用户失败:', e.message)
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  /* ---- 搜索 ---- */
  const handleSearch = (val: string) => {
    setKeyword(val); setPage(1)
    if (searchTimer) clearTimeout(searchTimer)
    setSearchTimer(setTimeout(() => {}, 300))
  }

  /* ---- 内联编辑 ---- */
  const startEdit = (u: AdminUser) => { setEditingId(u.id); setEditData({ ...u }) }
  const cancelEdit = () => { setEditingId(null); setEditData({}) }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      const res = await adminFetch<{ success: boolean; user: AdminUser }>(
        `/api/admin/users/${editingId}`,
        { method: 'PUT', body: JSON.stringify(editData) }
      )
      // 更新本地数据
      setUsers(prev => prev.map(u => u.id === editingId ? res.user : u))
      setEditingId(null); setEditData({})
    } catch (e: any) { alert('❌ 保存失败: ' + e.message) }
  }

  /* ---- 删除用户 ---- */
  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`确定删除用户「${name}」？此操作不可逆，且会级联删除该用户的评论！`)) return
    try {
      await adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      setUsers(prev => prev.filter(u => u.id !== id))
      if ((total - 1) <= (page - 1) * perPage && page > 1) setPage(p => p - 1)
      else fetchUsers()
    } catch (e: any) { alert('删除失败: ' + e.message) }
  }

  /* ---- 创建用户 ---- */
  const createUser = async () => {
    const f = createForm
    console.log('=== createUser called ===', JSON.stringify(f))
    if (!f.username.trim()) { alert('请输入用户名'); return }
    if (!f.password.trim()) { alert('请输入密码'); return }
    if (f.password.length < 4) { alert('密码至少4位'); return }

    setCreating(true)
    try {
      const payload = {
        username: f.username.trim(),
        password: f.password.trim(),
        nickname: f.nickname.trim() || f.username.trim(),
        email: f.email.trim() || null,
        phone: f.phone.trim() || null,
        membership_level: parseInt(f.membership_level) || 1,
      }
      console.log('发送请求', payload)

      const res = await adminFetch<{ success: boolean; user: AdminUser }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      console.log('响应:', res)
      setShowCreate(false)
      setCreateForm({ username: '', password: '', nickname: '', email: '', phone: '', membership_level: '1' })
      fetchUsers()
      alert(`✅ 用户「${res.user.username}」创建成功（ID: ${res.user.id}）`)
    } catch (e: any) {
      console.error('创建失败:', e)
      alert('创建失败: ' + e.message + '\n\n请确认后端已重启（新增了POST /api/admin/users接口）')
    } finally {
      setCreating(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  /* ==================== 渲染 ==================== */

  return (
    <>

      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="搜索用户名/昵称/邮箱/手机..." value={keyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent w-72"
            />
          </div>
          <button onClick={fetchUsers} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="刷新">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">共 <strong>{total}</strong> 位用户</span>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" /> 新增用户
          </button>
        </div>
      </div>


      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-left">
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">用户</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">昵称</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">邮箱</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">手机</th>
                <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">等级</th>
                <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">角色</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">注册时间</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-50 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">暂无用户数据</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-green-50/30 transition-colors group">
                    {editingId === u.id ? (
                      /* ===== 编辑模式 ===== */
                      <>
                        <td className="px-4 py-2 text-gray-400 font-mono text-xs">{u.id}</td>
                        <td className="px-4 py-2">
                          <input value={editData.username || ''} onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editData.nickname || ''} onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" type="email" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={editData.membership_level ?? 1} onChange={(e) => setEditData({ ...editData, membership_level: parseInt(e.target.value) })}
                            className="px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                            {[
                              { l: 1, name: 'LV1 普通会员' },
                              { l: 2, name: 'LV2 铜牌会员' },
                              { l: 3, name: 'LV3 银牌会员' },
                              { l: 4, name: 'LV4 金牌会员' },
                              { l: 5, name: 'LV5 白金会员' },
                              { l: 6, name: 'LV6 钻石会员' },
                              { l: 7, name: 'LV7 大师会员' },
                              { l: 8, name: 'LV8 超级会员' },
                              { l: 9, name: 'LV9 尊享会员' },
                              { l: 10, name: 'LV10 至尊VIP' },
                            ].map(item => <option key={item.l} value={item.l}>{item.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {u.is_admin && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold"><Shield className="h-3 w-3 mr-1" />管理</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={saveEdit} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" title="保存">
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors" title="取消">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      /* ===== 普通显示行 ===== */
                      <>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">#{u.id}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">{u.username}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.nickname || '-'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[180px]">{u.email || '-'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{u.phone || '-'}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            u.membership_level >= 5 ? 'bg-purple-100 text-purple-700' :
                            u.membership_level >= 3 ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            LV{u.membership_level ?? 1}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {u.is_admin
                            ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold"><Shield className="h-3 w-3" />管理</span>
                            : <span className="text-gray-400 text-xs">普通用</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity justify-end">
                            <button onClick={() => startEdit(u)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="编辑用户">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {!u.is_admin && (
                              <button onClick={() => deleteUser(u.id, u.nickname || u.username)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除用户">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {u.is_admin && (
                              <span className="text-[10px] text-gray-300 italic" title="不能删除管理员账号">保留</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-400">第 {page} / {totalPages} 页，共 {total} 条</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p = i + 1
                if (totalPages > 7 && page > 4) p = page - 3 + i
                if (p < 1 || p > totalPages) return null
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === page ? 'bg-green-600 text-white' : 'border border-gray-200 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                )
              })}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>


      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">新增用户</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>


            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">用户名<span className="text-red-500">*</span></label>
                  <input autoFocus value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="2-30位字符"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">密码 <span className="text-red-500">*</span></label>
                  <input type="password" value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="至少4位"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">昵称</label>
                <input value={createForm.nickname}
                  onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })}
                  placeholder="默认同用户名"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">邮箱</label>
                  <input type="email" value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="可选"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">手机</label>
                  <input value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="可选"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">会员等级</label>
                <select value={createForm.membership_level}
                  onChange={(e) => setCreateForm({ ...createForm, membership_level: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                >
                  {[
                                                                                { l: 1, name: 'LV1 · 普通会？', desc: '基础用户权限' },
                    { l: 2, name: 'LV2 · 铜牌会员', desc: '初级特权' },
                    { l: 3, name: 'LV3 · 银牌会员', desc: '中级特权 + 折扣' },
                    { l: 4, name: 'LV4 · 金牌会员', desc: '高级特权 + 优先服务' },
                    { l: 5, name: 'LV5 · 白金会员', desc: '尊贵体验' },
                    { l: 6, name: 'LV6 · 钻石会员', desc: '专属客服通道' },
                    { l: 7, name: 'LV7 · 大师会员', desc: '定制化服务' },
                    { l: 8, name: 'LV8 · 超级会员', desc: '全平台权益解锁' },
                    { l: 9, name: 'LV9 · 尊享会员', desc: '顶级礼遇' },
                    { l: 10, name: 'LV10 · 至尊VIP', desc: '最高级别，全部权益' },
                  ].map(item => (
                    <option key={item.l} value={item.l}>{item.name} · {item.desc}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400">不同等级对应不同的平台权益和折扣力度</p>
              </div>
            </div>


            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                取消
              </button>
              <button
                onClick={(ev) => { ev.preventDefault(); createUser() }}
                disabled={creating}
                className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors cursor-pointer ${creating ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> 创建中...</> : <><Plus className="h-4 w-4" /> 确认创建</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ==================== 页面主体 ==================== */

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen page-bg">
        <Navbar />
        <main className="pt-16 pb-12">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">


            <div className="flex items-end justify-between gap-4 mt-8 mb-6">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25">
                  <Users className="h-6.5 w-6.5" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">用户管理</h1>
                  <p className="text-sm text-gray-500 mt-0.5">查看、编辑、新增和删除平台用户（删除会级联删除其评论）</p>
                </div>
              </div>
              <Link href="/admin" className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors flex items-center gap-1">
                                ?返回后台首页
              </Link>
            </div>


            <UserManagementTable />

          </div>
        </main>
        <Footer />
      </div>
    </AdminGuard>
  )
}
