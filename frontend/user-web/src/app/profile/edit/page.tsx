'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'
import { ArrowLeft, Camera, Loader2 } from 'lucide-react'

export default function ProfileEditPage() {
  const router = useRouter()
  const { user, isAuthenticated, login } = useUserStore()

  const [form, setForm] = useState({
    nickname: '',
    travel_style: 'relaxation' as 'adventure' | 'relaxation' | 'cultural' | 'business',
    group_size: 1,
    interests: '',
    destinations: '',
    budget_min: 0,
    budget_max: 0,
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    setForm({
      nickname: user.nickname || '',
      travel_style: user.preferences?.travel_style || 'relaxation',
      group_size: user.preferences?.group_size || 1,
      interests: user.preferences?.interests?.join(', ') || '',
      destinations: user.preferences?.destinations?.join(', ') || '',
      budget_min: user.preferences?.budget_range?.min ?? 0,
      budget_max: user.preferences?.budget_range?.max ?? 0,
    })
    setAvatarPreview(user.avatar_url || null)
  }, [user])

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?returnUrl=' + encodeURIComponent('/profile/edit'))
    }
  }, [isAuthenticated, router])

  const canSave = useMemo(() => isAuthenticated && !!user, [isAuthenticated, user])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 验证文件大小（最?MB?
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过2MB')
      return
    }

    // 预览
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // 上传
    await uploadAvatar(file)
  }

  const uploadAvatar = async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
            toast.error('未登?')
      return
    }

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const res = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '上传失败')
      }

      // 更新本地用户数据
      if (data.avatar_url) {
        login({ ...user!, avatar_url: data.avatar_url })
        setAvatarPreview(data.avatar_url)
        toast.success('头像上传成功')
      }
    } catch (err: any) {
      toast.error(err?.message || '头像上传失败')
      // 恢复原头?
      setAvatarPreview(user?.avatar_url || null)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      toast.error('未登录或 token 失效')
      router.push('/login?returnUrl=' + encodeURIComponent('/profile/edit'))
      return
    }
    const authHeaders = { Authorization: `Bearer ${token}` }

    const prefs = {
      destinations: form.destinations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      budget_range: {
        min: Number(form.budget_min) || 0,
        max: Number(form.budget_max) || 0,
      },
      travel_style: form.travel_style,
      group_size: Math.max(1, Number(form.group_size) || 1),
      interests: form.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }

    try {
      const profileRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: form.nickname.trim() || user.nickname,
        }),
      })
      if (profileRes.status === 401) {
        router.push('/login?returnUrl=' + encodeURIComponent('/profile/edit'))
        return
      }
      const profileData = await profileRes.json().catch(() => ({}))
      if (!profileRes.ok || !profileData?.success) {
        throw new Error(profileData?.error || `HTTP ${profileRes.status}`)
      }

      const prefRes = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (prefRes.status === 401) {
        router.push('/login?returnUrl=' + encodeURIComponent('/profile/edit'))
        return
      }
      const prefData = await prefRes.json().catch(() => ({}))
      if (!prefRes.ok || !prefData?.success) {
        throw new Error(prefData?.error || `HTTP ${prefRes.status}`)
      }

      const meRes = await fetch('/api/users/me', { headers: authHeaders })
      const meData = await meRes.json().catch(() => ({}))
      if (!meRes.ok || !meData?.success) throw new Error(meData?.error || `HTTP ${meRes.status}`)

      login(meData.user)
      toast.success('保存成功')
      router.push('/profile')
    } catch (err: any) {
      toast.error(err?.message || '保存失败')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              返回我的
            </Link>
          </div>

          <div className="card p-6">
            <h1 className="text-2xl font-bold text-gray-900">编辑资料与偏</h1>
            <p className="text-sm text-gray-500 mt-1">保存后将影响行程生成与推荐</p>

            {!user ? (
              <p className="mt-6 text-gray-600">
                请先 <Link href="/login" className="text-blue-600 underline">登录</Link>?
              </p>
            ) : (
              <form className="space-y-4 mt-6" onSubmit={onSave}>

                <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/60">
                  <div
                    className="relative shrink-0 group cursor-pointer"
                    title="点击更换头像"
                    onClick={handleAvatarClick}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 border-white ${
                      avatarPreview ? '' : 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold'
                    }`}>
                      {uploadingAvatar ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                      ) : avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarPreview}
                          alt="头像"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(form.nickname || user?.nickname || '?)[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="h-6 w-6" />
                    </div>

                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                      <Camera className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-slate-800 truncate">{user?.nickname || '旅行?'}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{user?.email || user?.phone || '?}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {user?.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                          🔐 管理?
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                          普通用?
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        注册?{user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '?}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm text-gray-600">昵称</span>
                    <input
                      className="input bg-white w-full mt-1"
                      value={form.nickname}   // value?
                      onChange={(e) => setForm((s) => ({ ...s, nickname: e.target.value }))}
                      placeholder={user?.nickname ? `当前：${user.nickname}` : '设置你的昵称'}
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">2-20个字符，支持中英文和数字</span>
                  </label>

                  <label className="block">
                    <span className="text-sm text-gray-600">偏好风格</span>
                    <select
                      className="input bg-white w-full mt-1"
                      value={form.travel_style}   // value?
                      onChange={(e) => setForm((s) => ({ ...s, travel_style: e.target.value as typeof form.travel_style }))}
                    >
                      <option value="adventure">🧗 冒险 ?追求刺激与挑</option>
                      <option value="relaxation">🏖 休闲 ?放松身心为主</option>
                      <option value="cultural">🏛 人文 ?探索历史文化</option>
                      <option value="business">💼 商务 ?兼顾工作与出</option>
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1 block">影响行程推荐的整体基</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm text-gray-600">出行人数</span>
                    <input
                      className="input bg-white w-full mt-1"
                      type="number"
                      min={1}
                      value={form.group_size}   // value?
                      onChange={(e) => setForm((s) => ({ ...s, group_size: Number(e.target.value) }))}
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">用于预算和行程规划参</span>
                  </label>

                  <label className="block">
                    <span className="text-sm text-gray-600">预算区间（元</span>
                    <div className="flex gap-2 mt-1">
                      <input
                        className="input bg-white w-1/2"
                        type="number"
                        value={form.budget_min}   // value?
                        onChange={(e) => setForm((s) => ({ ...s, budget_min: Number(e.target.value) }))}
                        placeholder="最?
                      />
                      <input
                        className="input bg-white w-1/2"
                        type="number"
                        value={form.budget_max}   // value?
                        onChange={(e) => setForm((s) => ({ ...s, budget_max: Number(e.target.value) }))}
                        placeholder="最?
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">0 表示不设上限</span>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm text-gray-600">兴趣标签</span>
                  <input
                    className="input bg-white w-full mt-1"
                    value={form.interests}   // value?
                    onChange={(e) => setForm((s) => ({ ...s, interests: e.target.value }))}
                                        placeholder="美食, 自然风景, 博物?" 摄影"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">多个标签用逗号分隔，帮?AI 推荐更精</span>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">常去目的</span>
                  <input
                    className="input bg-white w-full mt-1"
                    value={form.destinations}   // value?
                    onChange={(e) => setForm((s) => ({ ...s, destinations: e.target.value }))}
                    placeholder="上海, 杭州, 北京"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">你曾经去过或常去的地方，方便个性化推荐</span>
                </label>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button className="btn btn-primary justify-center gap-2" type="submit" disabled={!canSave}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    保存修改
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline justify-center gap-1 text-slate-500"
                    onClick={() => {
                      if (user) {
                        setForm({
                          nickname: user.nickname || '',
                          travel_style: user.preferences?.travel_style || 'relaxation',
                          group_size: user.preferences?.group_size || 1,
                          interests: user.preferences?.interests?.join(', ') || '',
                          destinations: user.preferences?.destinations?.join(', ') || '',
                          budget_min: user.preferences?.budget_range?.min ?? 0,
                          budget_max: user.preferences?.budget_range?.max ?? 0,
                        })
                                                toast('已重置为原始?')
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.52"/>
                    </svg>
                    重置
                  </button>
                  <Link href="/profile" className="btn btn-outline justify-center ml-auto">
                    返回我的
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
