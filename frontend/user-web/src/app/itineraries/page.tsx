'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Calendar,
  Sparkles,
  Plus,
  ClipboardList,
  CalendarDays,
  FileText,
  Users,
  Wallet,
  Compass,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useUserStore } from '@/store'

type Trip = {
  id: number
  user_id: number
  title: string
  description?: string
  status?: string
  created_at?: string | null
  start_date?: string | null
  end_date?: string | null
}

const coverGradients = [
  'from-sky-600 to-blue-700',
  'from-emerald-600 to-teal-700',
  'from-coral-500 to-coral-600',
  'from-violet-600 to-indigo-700',
  'from-rose-500 to-pink-600',
]

function tripCoverClass(id: number) {
  return coverGradients[Math.abs(id) % coverGradients.length]
}

type PlanFormProps = {
  showHandle: boolean
  planTitle: string
  setPlanTitle: (v: string) => void
  planDesc: string
  setPlanDesc: (v: string) => void
  planStart: string
  setPlanStart: (v: string) => void
  planEnd: string
  setPlanEnd: (v: string) => void
  planBudget: string
  setPlanBudget: (v: string) => void
  planGroup: string
  setPlanGroup: (v: string) => void
  planStyle: 'adventure' | 'relaxation' | 'cultural' | 'business'
  setPlanStyle: (v: 'adventure' | 'relaxation' | 'cultural' | 'business') => void
  creating: boolean
  onSubmit: () => void
  onCancel: () => void
}

function CreateTripPlanForm({
  showHandle,
  planTitle,
  setPlanTitle,
  planDesc,
  setPlanDesc,
  planStart,
  setPlanStart,
  planEnd,
  setPlanEnd,
  planBudget,
  setPlanBudget,
  planGroup,
  setPlanGroup,
  planStyle,
  setPlanStyle,
  creating,
  onSubmit,
  onCancel,
}: PlanFormProps) {
  return (
    <>
      {showHandle ? (
        <div className="travel-sheet-handle" aria-hidden>
          <span className="travel-sheet-bar" />
          <span className="travel-sheet-bar" />
          <span className="travel-sheet-bar" />
        </div>
      ) : null}
      <h2 id="sheet-title" className="text-center text-xl font-extrabold text-slate-900 tracking-tight">
        创建旅行计划
      </h2>
      <p className="text-center text-xs text-slate-500 mt-1 mb-5">填写基本信息，稍后可关联景点?AI 排程</p>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            计划标题
          </label>
          <input
            className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-base"
            placeholder="例如：五一上海?
            value={planTitle}   // value?
            onChange={(e) => setPlanTitle(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              出发日期
            </label>
            <input
              type="date"
              className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50/80"
              value={planStart}   // value?
              onChange={(e) => setPlanStart(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              结束日期
            </label>
            <input
              type="date"
              className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50/80"
              value={planEnd}   // value?
              onChange={(e) => setPlanEnd(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
            <FileText className="h-4 w-4 text-coral-500" />
            备注 / 心愿
          </label>
          <textarea
            className="input min-h-[88px] w-full rounded-xl border-slate-200 bg-slate-50/80 py-2.5 resize-none"
            placeholder="想去的体验、饮食禁忌等"
            value={planDesc}   // value?
            onChange={(e) => setPlanDesc(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
              <Users className="h-4 w-4 text-violet-600" />
              出行人数
            </label>
            <input
              type="number"
              min={1}
              className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50/80"
              value={planGroup}   // value?
              onChange={(e) => setPlanGroup(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
              <Wallet className="h-4 w-4 text-rose-500" />
              预算上限（元?
            </label>
            <input
              type="number"
              min={0}
              className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50/80"
              placeholder="可?
              value={planBudget}   // value?
              onChange={(e) => setPlanBudget(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">旅行风格</label>
          <select
            className="input h-11 w-full rounded-xl border-slate-200 bg-slate-50/80"
            value={planStyle}   // value?
            onChange={(e) => setPlanStyle(e.target.value as PlanFormProps['planStyle'])}
          >
            <option value="relaxation">休闲放松</option>
            <option value="cultural">人文探索</option>
            <option value="adventure">冒险体验</option>
            <option value="business">商务出行</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        disabled={creating}
        onClick={onSubmit}
        className="mt-6 w-full travel-btn-gradient py-3.5 text-base disabled:opacity-60"
      >
        {creating ? '创建中? : '创建计划'}
      </button>
      <button type="button" className="mt-2 w-full py-2 text-sm text-slate-500" onClick={onCancel}>
        取消
      </button>
    </>
  )
}

export default function ItinerariesPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useUserStore()

  const [loadingTrips, setLoadingTrips] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])

  const [sheetOpen, setSheetOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [planTitle, setPlanTitle] = useState('')
  const [planDesc, setPlanDesc] = useState('')
  const [planStart, setPlanStart] = useState('')
  const [planEnd, setPlanEnd] = useState('')
  const [planBudget, setPlanBudget] = useState('')
  const [planGroup, setPlanGroup] = useState('2')
  const [planStyle, setPlanStyle] = useState<'adventure' | 'relaxation' | 'cultural' | 'business'>('relaxation')

  const loadTrips = useCallback(async () => {
    if (!isAuthenticated || !user) return
    const token = localStorage.getItem('auth_token')
    if (!token) return

    setLoadingTrips(true)
    try {
      const res = await fetch('/api/me/trips', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const text = await res.text().catch(() => '')
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = {}
      }
      const detail = data?.error || (text ? `${text.slice(0, 120)}` : '')

      if (res.status === 401) {
        localStorage.removeItem('auth_token')
                toast.error(detail ? `登录已过?失效?{detail}` : '登录已过期，请重新登?')
        router.push('/login')
        return
      }
      if (!res.ok || !data?.success) {
        throw new Error(detail ? `加载行程失败（HTTP ${res.status}）：${detail}` : `加载行程失败（HTTP ${res.status}）`)
      }
      const nextTrips = data?.trips || []
      setTrips(nextTrips)
    } catch (e: any) {
      toast.error(e?.message || '加载行程失败')
    } finally {
      setLoadingTrips(false)
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('未找?token，请重新登录')
      router.push('/login')
      return
    }
    loadTrips()
  }, [isAuthenticated, user, router, loadTrips])

  async function submitCreatePlan() {
    if (!planTitle.trim()) {
            toast.error('请填写旅行计划标?')
      return
    }
    if (!isAuthenticated) {
      toast.error('请先登录')
      router.push('/login')
      return
    }
    const token = localStorage.getItem('auth_token')
    if (!token) {
            toast.error('请重新登?')
      router.push('/login')
      return
    }
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        title: planTitle.trim(),
        description: planDesc.trim() || undefined,
        start_date: planStart || undefined,
        end_date: planEnd || undefined,
        travel_style: planStyle,
        group_size: Math.max(1, parseInt(planGroup, 10) || 1),
      }
      if (planBudget.trim()) {
        const n = parseFloat(planBudget)
        if (!Number.isNaN(n) && n > 0) body.budget_max = n
      }
      const res = await fetch('/api/me/trips', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `创建失败 HTTP ${res.status}`)
      }
            toast.success('旅行计划已创?')
      setSheetOpen(false)
      setPlanTitle('')
      setPlanDesc('')
      setPlanStart('')
      setPlanEnd('')
      setPlanBudget('')
      setPlanGroup('2')
      setPlanStyle('relaxation')
      await loadTrips()
      if (data.trip?.id) router.push(`/itineraries/${data.trip.id}`)
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const tripListBlock =
    !isAuthenticated || !user ? null : (
      <div className="mt-6">
        <div className="font-semibold text-gray-900 mb-3">我的行程</div>
        <p className="text-sm text-gray-500 mb-4">点击卡片进入详情页，可分享链接或删除行程</p>
        {loadingTrips ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border bg-white animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="mt-3 h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : trips.length ? (
          <div className="space-y-2">
            {trips.map((t) => (
              <Link
                key={t.id}
                href={`/itineraries/${t.id}`}
                className="block w-full text-left p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition"
              >
                <div className="font-medium text-gray-900">{t.title}</div>
                {t.status ? <div className="text-xs text-gray-500 mt-1">状态：{t.status}</div> : null}
                <div className="text-xs text-blue-600 mt-2">查看详情 ?/div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-gray-600 text-sm">暂无行程记录，点击下方「创建旅行计划」或?AI 助手生成</div>
        )}
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white">
      <Navbar />
      <main className="pt-16 pb-28 lg:pb-10">

        <div className="hidden lg:block max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="card p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-blue-600" />
                <h1 className="text-3xl font-bold text-slate-900">行程规划</h1>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSheetOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="ml-2">创建旅行计划</span>
                </button>
                <Link href="/assistant" className="btn btn-outline">
                  <Sparkles className="h-4 w-4" />
                  <span className="ml-2">?AI 生成行程</span>
                </Link>
                <Link href="/destinations" className="btn btn-outline">
                  去目的地列表
                </Link>
              </div>
            </div>

            {!isAuthenticated || !user ? (
              <div className="mt-6 card p-4 bg-white border border-gray-200 text-gray-700">
                请先 <Link href="/login" className="underline text-blue-600">登录</Link> 后查看你保存的行程?
              </div>
            ) : (
              tripListBlock
            )}
          </div>
        </div>


        <div className="lg:hidden px-4 pt-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">行程规划</h1>
              <p className="text-sm text-slate-500 mt-0.5">管理计划 · 查看每日安排</p>
            </div>
            <Link
              href="/assistant"
              className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"
            >
              AI 生成
            </Link>
          </div>

          {!isAuthenticated || !user ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">
              请先 <Link href="/login" className="font-semibold text-blue-600">登录</Link> 后管理行程?
            </div>
          ) : loadingTrips ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-200/60 animate-pulse" />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
              <Compass className="h-12 w-12 text-coral-500 mx-auto mb-3 opacity-90" />
              <p className="text-slate-700 font-medium">还没有行</p>
              <p className="text-sm text-slate-500 mt-1 mb-4">创建计划或让 AI 帮你排行</p>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="travel-btn-gradient px-6 py-2.5 text-sm"
              >
                创建旅行计划
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((t) => (
                <Link
                  key={t.id}
                  href={`/itineraries/${t.id}`}
                  className="block w-full text-left rounded-2xl border overflow-hidden shadow-sm transition border-slate-200 bg-white active:scale-[0.99]"
                >
                  <div className={`h-20 bg-gradient-to-r ${tripCoverClass(t.id)} relative`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <span className="absolute bottom-2 left-3 text-white font-bold text-lg drop-shadow-md line-clamp-1 pr-2">
                      {t.title}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">
                        {t.start_date && t.end_date
                          ? `${t.start_date} ~ ${t.end_date}`
                          : t.status === 'planning'
                            ? '待完善行程'
                                                        : t.status || '进行?'}
                      </div>
                      {t.description ? (
                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">{t.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      查看
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {isAuthenticated && user ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="lg:hidden fixed right-4 bottom-24 z-[54] flex h-14 w-14 items-center justify-center rounded-full travel-btn-gradient shadow-xl shadow-blue-600/30"
          aria-label="创建旅行计划"
        >
          <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
        </button>
      ) : null}

      {sheetOpen ? (
        <>
          <button
            type="button"
            aria-label="关闭"
            className="fixed inset-0 z-[55] bg-slate-900/45 lg:hidden"
            onClick={() => setSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            className="fixed left-0 right-0 bottom-0 z-[56] max-h-[90vh] overflow-y-auto rounded-t-[1.35rem] bg-white px-4 pb-8 pt-1 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] lg:hidden translate-y-0"
          >
            <CreateTripPlanForm
              showHandle
              planTitle={planTitle}
              setPlanTitle={setPlanTitle}
              planDesc={planDesc}
              setPlanDesc={setPlanDesc}
              planStart={planStart}
              setPlanStart={setPlanStart}
              planEnd={planEnd}
              setPlanEnd={setPlanEnd}
              planBudget={planBudget}
              setPlanBudget={setPlanBudget}
              planGroup={planGroup}
              setPlanGroup={setPlanGroup}
              planStyle={planStyle}
              setPlanStyle={setPlanStyle}
              creating={creating}
              onSubmit={submitCreatePlan}
              onCancel={() => setSheetOpen(false)}
            />
          </div>
        </>
      ) : null}

      {sheetOpen ? (
        <div className="hidden lg:flex fixed inset-0 z-[55] items-center justify-center px-6 py-10">
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[56] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
          >
            <CreateTripPlanForm
              showHandle={false}
              planTitle={planTitle}
              setPlanTitle={setPlanTitle}
              planDesc={planDesc}
              setPlanDesc={setPlanDesc}
              planStart={planStart}
              setPlanStart={setPlanStart}
              planEnd={planEnd}
              setPlanEnd={setPlanEnd}
              planBudget={planBudget}
              setPlanBudget={setPlanBudget}
              planGroup={planGroup}
              setPlanGroup={setPlanGroup}
              planStyle={planStyle}
              setPlanStyle={setPlanStyle}
              creating={creating}
              onSubmit={submitCreatePlan}
              onCancel={() => setSheetOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  )
}
