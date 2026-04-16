'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Loader2, Send, Sparkles, ShieldCheck, Mic, Paperclip, MapPin, Calendar, Plane, Lightbulb, CheckCircle2, Square } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'

type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  // 行程规划专用
  planTrip?: any
  planItems?: any[]
}

// ========== 行程规划输入解析函数 ==========
type IntentResult = {
  intents: string[]
  isPlanning: boolean
  missingInfo: string[]
}

type TripActivity = {
  place?: string
  activity?: string
  duration?: string
  cost?: string
  food?: string[]
  transport?: string
  note?: string
  publicTransportDetails?: {
    bus?: Array<{ route: string; from?: string; to?: string; duration?: string; frequency?: string }>
    metro?: Array<{ line: string; station?: string; direction?: string; duration?: string }>
    walking?: string
    taxi?: { estimatedTime?: string; estimatedCost?: string }
  }
  bookingInfo?: {
    needsBooking: boolean
    bookingWebsite?: string
    ticketPrice?: string
    openingHours?: string
    contact?: string
  }
  facilities?: {
    parking?: string
    restroom?: string
    wifi?: string
    accessibility?: string
  }
  highlights?: string[]
}

type TripDay = {
  day: number
  date?: string
  city?: string
  theme?: string
  totalCost?: string
  morning?: TripActivity
  afternoon?: TripActivity
  evening?: TripActivity
  hotel?: string
  tips?: string[]
  publicTransport?: {
    bus?: string[]
    metro?: string[]
    taxi?: string
    rideShare?: string
  }
  nearbyRecommendations?: {
    restaurants?: Array<{ name: string; cuisine: string; priceRange: string; distance: string; rating?: number }>
    attractions?: Array<{ name: string; type: string; distance: string; estimatedTime: string }>
    shopping?: Array<{ name: string; type: string; distance: string }>
  }
  detailedSchedule?: Array<{ time: string; activity: string; location: string; notes?: string }>
  weather?: {
    condition: string
    temperature: string
    precipitation?: string
    wind?: string
  }
  food?: string[]
}

function parsePlannerInput(text: string) {
  const normalized = text.trim()
  let destination = ''
  let days = 3

  const cityLike = normalized.match(/去\s*([\u4e00-\u9fa5A-Za-z]{2,12})/) ||
    normalized.match(/([\u4e00-\u9fa5A-Za-z]{2,12})\s*(?:旅行|旅游|行程|攻略)/)
  if (cityLike?.[1]) destination = cityLike[1].trim()

  const dayLike = normalized.match(/(\d{1,2})\s*(?:天|日)/)
  if (dayLike?.[1]) {
    const n = parseInt(dayLike[1], 10)
    if (!Number.isNaN(n)) days = Math.max(1, Math.min(14, n))
  }

  const budgetLike = normalized.match(/(?:预算|人均)\s*(?:约|大概|大约)?\s*(\d{2,7})/) || normalized.match(/(\d{2,7})\s*(?:元|块|RMB)/i)
  const budget = budgetLike?.[1] ? parseInt(budgetLike[1], 10) : 0

  return { destination, days, budget }
}

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  itinerary: [/\d+\s*(?:天|日)/, /行程/, /路线/, /攻略/, /计划/, /旅游/, /旅行/, /itinerary/i, /plan/i],
  budget: [/预算/, /费用/, /花费/, /人均/, /cost/i, /budget/i],
  weather: [/天气/, /温度/, /下雨/, /weather/i],
  food: [/美食/, /餐厅/, /小吃/, /food/i],
  transport: [/怎么去/, /交通/, /高铁/, /火车/, /飞机/, /transport/i],
  hotel: [/酒店/, /民宿/, /住宿/, /hotel/i],
  attraction: [/景点/, /打卡/, /必去/, /attraction/i],
}

function detectIntent(text: string): IntentResult {
  const intents: string[] = []
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) intents.push(intent)
  }

  const isPlanning = intents.includes('itinerary') || /\d+\s*(?:天|日)/.test(text)
  const missingInfo: string[] = []
  if (isPlanning) {
    const parsed = parsePlannerInput(text)
    if (!parsed.destination) missingInfo.push('目的地')
    if (!parsed.days) missingInfo.push('天数')
  }

  return { intents, isPlanning, missingInfo }
}

function parseActivity(text: string): TripActivity {
  const raw = text.trim()
  if (!raw) return {}

  const place = raw.split(/[，,。；;：:\-]/)[0]?.trim() || raw
  const durationMatch = raw.match(/(\d+\s*(?:小时|分钟|h|min))/i)
  const costMatch = raw.match(/([¥￥$]?\s*\d+\s*(?:元|RMB|USD)?)/i)

  return {
    place,
    activity: raw,
    duration: durationMatch?.[1],
    cost: costMatch?.[1],
  }
}

function parseTripContent(content: string): TripDay[] {
  const text = content.replace(/\r\n/g, '\n')
  const dayStart = /(?:^|\n)(?:第\s*([一二三四五六七八九十\d]+)\s*天|Day\s*(\d+))/gi
  const matches = [...text.matchAll(dayStart)]
  if (matches.length === 0) return []

  const toNum = (s?: string) => {
    if (!s) return 0
    const m = s.match(/\d+/)
    if (m) return parseInt(m[0], 10)
    const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
    return map[s] || 0
  }

  const days: TripDay[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length
    const section = text.slice(start, end)
    const dayNum = toNum(matches[i][1]) || toNum(matches[i][2]) || i + 1

    const morning = section.match(/(?:上午|早上|Morning)[:：]?\s*([^\n]+)/i)
    const afternoon = section.match(/(?:下午|午后|Afternoon)[:：]?\s*([^\n]+)/i)
    const evening = section.match(/(?:晚上|傍晚|Evening|Night)[:：]?\s*([^\n]+)/i)
    const hotel = section.match(/(?:住宿|酒店|民宿|Hotel|Accommodation)[:：]?\s*([^\n]+)/i)
    const totalCost = section.match(/(?:费用|预算|花费|Estimated\s*cost)[:：]?\s*([^\n]+)/i)

    const tips = section
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[-•*]/.test(l) || /(?:提示|注意|tips)/i.test(l))
      .map((l) => l.replace(/^[-•*]\s*/, ''))
      .slice(0, 5)

    const day: TripDay = {
      day: dayNum,
      morning: morning?.[1] ? parseActivity(morning[1]) : undefined,
      afternoon: afternoon?.[1] ? parseActivity(afternoon[1]) : undefined,
      evening: evening?.[1] ? parseActivity(evening[1]) : undefined,
      hotel: hotel?.[1]?.trim(),
      totalCost: totalCost?.[1]?.trim(),
      tips: tips.length ? tips : undefined,
    }

    if (day.morning || day.afternoon || day.evening) {
      days.push(day)
    }
  }

  return days
}

function isTripContent(content: string) {
  return /(?:第\s*[一二三四五六七八九十\d]+\s*天|Day\s*\d+)/i.test(content) &&
    /(?:上午|下午|晚上|Morning|Afternoon|Evening|行程|景点|住宿|酒店)/i.test(content)
}

function ActivityDetails({ activity, timeSlot }: { activity: TripActivity; timeSlot: string }) {
  const [showDetails, setShowDetails] = useState(false)
  const icon = timeSlot === 'morning' ? '🌅' : timeSlot === 'afternoon' ? '🌇' : '🌙'

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowDetails((v) => !v)}
        className="w-full text-left flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-100 hover:border-blue-300 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold">{icon}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-800">{activity.place || '自由活动'}</div>
            {activity.activity && activity.activity !== activity.place ? (
              <div className="text-xs text-gray-500 truncate">{activity.activity}</div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activity.duration ? (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">⏱ {activity.duration}</span>
          ) : null}
          <span className="text-gray-400">{showDetails ? '▲' : '▼'}</span>
        </div>
      </button>

      {showDetails ? (
        <div className="mt-3 pl-11 pr-4 pb-3 bg-white border border-blue-100 rounded-xl shadow-sm">
          <div className="space-y-3">
            {activity.activity && activity.activity !== activity.place ? (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">活动内容</div>
                <div className="text-sm text-gray-700">{activity.activity}</div>
              </div>
            ) : null}
            {activity.cost ? (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">费用</div>
                <div className="text-sm font-medium text-green-600">{activity.cost}</div>
              </div>
            ) : null}
            {activity.transport ? (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">交通方式</div>
                <div className="text-sm text-gray-700">{activity.transport}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function processMessageContent(content: string): React.ReactNode {
  const imageRegex = /@image:([^\s]+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>)
    }

    const imagePath = match[1]
    const src = resolveCoverSrc(imagePath)
    parts.push(
      <img
        key={`img-${match.index}`}
        src={src}
        alt="行程图片"
        loading="lazy"
        onError={onImgErrorUseFallback}
        className="mt-2 max-h-64 rounded-lg border border-gray-200 object-cover"
      />,
    )

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(<span key={`text-tail-${lastIndex}`}>{content.slice(lastIndex)}</span>)
  }

  return <>{parts.length ? parts : content}</>
}

function TripDayCard({ day }: { day: TripDay }) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="rounded-2xl border border-blue-100 bg-white/95 shadow-sm">
      <div
        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-2xl cursor-pointer"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold">第 {day.day} 天</div>
          <div className="text-white/90">{isExpanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {isExpanded ? (
        <div className="p-4">
          {day.morning ? <ActivityDetails activity={day.morning} timeSlot="morning" /> : null}
          {day.afternoon ? <ActivityDetails activity={day.afternoon} timeSlot="afternoon" /> : null}
          {day.evening ? <ActivityDetails activity={day.evening} timeSlot="evening" /> : null}

          {day.hotel ? (
            <div className="mt-2 text-sm text-gray-700">
              <span className="font-medium">住宿：</span>
              <span>{day.hotel}</span>
            </div>
          ) : null}

          {day.tips?.length ? (
            <div className="mt-2">
              <div className="text-sm font-medium text-gray-700">小贴士</div>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {day.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function TripOverview({ days, destination }: { days: TripDay[]; destination?: string }) {
  const totalActivities = days.reduce((acc, day) => acc + (day.morning ? 1 : 0) + (day.afternoon ? 1 : 0) + (day.evening ? 1 : 0), 0)

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 mb-4 border border-blue-100">
      <div className="font-semibold text-gray-800">{destination || '行程概览'}</div>
      <div className="text-xs text-gray-600 mt-1">{days.length} 天 · {totalActivities} 个活动</div>
    </div>
  )
}

function TripCard({ content }: { content: string }) {
  const days = parseTripContent(content)
  if (days.length === 0) {
    return <div className="mt-3 text-sm text-gray-700">{processMessageContent(content)}</div>
  }

  const destination = parsePlannerInput(content).destination
  return (
    <div className="mt-4 space-y-4">
      <TripOverview days={days} destination={destination} />
      {days.map((day, idx) => (
        <TripDayCard key={idx} day={day} />
      ))}
      {content.includes('@image:') ? <div>{processMessageContent(content)}</div> : null}
    </div>
  )
}

const QUICK_SUGGESTIONS = {
  destination: ['杭州', '云南', '厦门', '成都', '西安'],
  days: [3, 5, 7],
}

function QuickFillButton({ label, value, onClick }: { label: string; value: string; onClick: (v: string) => void }) {
  return (
    <button
      onClick={() => onClick(value)}
      className="px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-600 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors"
    >
      {label}
    </button>
  )
}

function SmartPlannerHelper({
  input,
  onFill,
  onClear,
}: {
  input: string
  onFill: (newInput: string) => void
  onClear: () => void
}) {
  const { isPlanning, missingInfo } = detectIntent(input)
  if (!isPlanning || missingInfo.length === 0) return null

  return (
    <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
      <div className="flex items-start gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-700 mb-1">让我帮你补全行程信息</p>
          <p className="text-xs text-blue-600">
            缺少 <span className="font-medium">{missingInfo.join('、')}</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {missingInfo.includes('目的地') ? (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">想去哪里？</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.destination.map((d) => (
                <QuickFillButton
                  key={d}
                  label={d}
                  value={`${input} ${d}`.trim()}
                  onClick={(v) => onFill(v)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {missingInfo.includes('天数') ? (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">玩几天？</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.days.map((d) => (
                <QuickFillButton
                  key={d}
                  label={`${d}天`}
                  value={`${input} ${d}天`.trim()}
                  onClick={(v) => onFill(v)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <button
        onClick={onClear}
        className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        <span>取消</span>
      </button>
    </div>
  )
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type DestinationPreview = {
  id: number
  name: string
  city: string
  province: string
  cover_image?: string | null
  rating?: number | null
  ticket_price?: number | null
}
export default function AssistantPage() {
  const router = useRouter()

  // 统一状态 - 智能问答（包含行程规划识别）
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('moonshot')
  const [selectedModel, setSelectedModel] = useState('kimi-k2.5')
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<
    Array<{ id: string; title: string; createdAt: number; msgs: ChatMsg[] }>
  >([])
  const [sessionId, setSessionId] = useState<string>(() => uid())
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: uid(),
      role: 'assistant',
      content: '??????????',
      createdAt: Date.now(),
    },
  ])

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const [destPreview, setDestPreview] = useState<DestinationPreview[]>([])
  const [destPreviewLoading, setDestPreviewLoading] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const recognitionRef = useRef<any>(null)

  const [streamMsgId, setStreamMsgId] = useState<string | null>(null)
  const [streamText, setStreamText] = useState('')

  // Agent 模式相关 state
  const [agentMode, setAgentMode] = useState(false)
  const [agentTools, setAgentTools] = useState<Array<{tool: string, label: string, status: 'thinking'|'done'}>>([])

  // 智能助手：显示信息补全提示
  const [showPlannerHelper, setShowPlannerHelper] = useState(false)
  const [plannerHelperInput, setPlannerHelperInput] = useState('')

  const CHAT_QUICK_ACTIONS = useMemo(
    () =>
      [
        { label: '景点推荐', prompt: '请根据“人少、好拍照”偏好，推荐国内 3 个周末可去城市，并给出每个城市 2 个景点与建议时长。' },
        { label: '价格咨询', prompt: '我想了解国内 5 日游的大致预算区间（交通/住宿/门票/餐饮分项）。' },
        { label: '签证办理', prompt: '如果去东南亚短途旅行，签证和入境材料一般有哪些？请按步骤列清单。' },
        { label: '天气查询', prompt: '我计划 4 月去云南 5 天，请说明大致温度、降雨和穿衣建议。' },
        { label: '交通攻略', prompt: '从杭州到黄山，比较高铁/大巴/自驾三种方式的耗时和优缺点。' },
        { label: '住宿推荐', prompt: '在成都春熙路附近住 2 晚，选酒店时应关注哪些因素？' },
        { label: '旅行清单', prompt: '帮我列一份 5 天国内游行李与证件清单，按必备/可选分类。' },
        { label: '当地习俗', prompt: '去少数民族地区或宗教场所参观，有哪些通用礼仪与禁忌？' },
      ] as const,
    [],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any })
  }, [])

  useEffect(() => {
    if (!autoScrollEnabled) return
    // 只滚动聊天容器，不影响页面
    const container = chatContainerRef.current
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [autoScrollEnabled, msgs.length, streamText.length, sending])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('assistant_sessions_v1')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const next = parsed
        .filter((s) => s && Array.isArray(s.msgs))
        .slice(0, 10)
        .map((s) => ({
          id: String(s.id || uid()),
          title: String(s.title || '对话'),
          createdAt: Number(s.createdAt || Date.now()),
          msgs: s.msgs as ChatMsg[],
        }))
      if (!next.length) return
      setSessions(next)
      const latest = next[0]
      setSessionId(latest.id)
      setMsgs(latest.msgs)
      setStreamMsgId(null)
      setStreamText('')
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!streamMsgId) return
    const full = msgs.find((m) => m.id === streamMsgId)?.content ?? ''
    if (!full) return
    if (streamText.length >= full.length) {
      setStreamMsgId(null)
      return
    }
    const step = full.length > 600 ? 12 : full.length > 200 ? 4 : 2
    const t = window.setTimeout(() => {
      setStreamText(full.slice(0, Math.min(full.length, streamText.length + step)))
    }, 14)
    return () => window.clearTimeout(t)
  }, [streamMsgId, streamText, msgs])

  function formatClock(ts: number) {
    try {
      return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const coverSrc = (d: { cover_image?: string | null }) => resolveCoverSrc(d?.cover_image)

  function buildSessionTitle(messages: ChatMsg[]) {
    const firstUser = messages.find((m) => m.role === 'user')
    const t = firstUser?.content?.trim() || '新对话'
    return t.length > 20 ? (t.slice(0, 20) + '…') : t
  }

  function persistSession(nextMsgs: ChatMsg[], title?: string) {
    const now = Date.now()
    const id = sessionId || uid()
    const nextTitle = title || buildSessionTitle(nextMsgs)
    const nextSession = { id, title: nextTitle, createdAt: now, msgs: nextMsgs }
    setSessionId(id)
    setSessions((prev) => {
      const merged = [nextSession, ...prev.filter((s) => s.id !== id)]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
      try {
        localStorage.setItem('assistant_sessions_v1', JSON.stringify(merged))
      } catch {
        // ignore
      }
      return merged
    })
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!cancelled) setBackendOk(res.ok)
      } catch {
        if (!cancelled) setBackendOk(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setDestPreviewLoading(true)
      try {
        const res = await fetch('/api/recommendations?limit=8', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && Array.isArray(data?.recommendations)) {
          setDestPreview(data.recommendations as DestinationPreview[])
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setDestPreviewLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending])

  function onPickAttachment() {
    fileInputRef.current?.click()
  }

  function onAttachmentChange(e: any) {
    const file = e?.target?.files?.[0]
    if (!file) return
    const next = input.trim()
      ? `${input}\n[附件] ${file.name}`
      : `[附件] ${file.name}`
    setInput(next)
    toast.success('已添加附件到对话（模拟）')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onToggleVoice() {
    if (recognizing) {
      try { recognitionRef.current?.stop?.() } catch { /* ignore */ }
      setRecognizing(false)
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
            toast.error('当前浏览器不支持语音输入（建议使用 Chrome）')
      return
    }
    const recog = new SpeechRecognition()
    recognitionRef.current = recog
    recog.lang = 'zh-CN'
    recog.interimResults = true
    recog.maxAlternatives = 1
    recog.onstart = () => setRecognizing(true)
    recog.onend = () => setRecognizing(false)
    recog.onerror = () => setRecognizing(false)
    recog.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || ''
      }
      transcript = transcript.trim()
      if (transcript) setInput(transcript)
    }
    try { recog.start() } catch { toast.error('语音启动失败'); setRecognizing(false) }
  }

  // 智能问答模式发送
  async function onSendChat() {
    const text = input.trim()
    if (!text || sending) return
    setAutoScrollEnabled(true)
    setSending(true)
    const controller = new AbortController()
    setAbortController(controller)
    setInput('')
    setStreamMsgId(null)
    setStreamText('')

    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, createdAt: Date.now() }
    const nextMsgs = [...msgs, userMsg]
    setMsgs(nextMsgs)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMsgs.map(({ role, content }) => ({ role, content })),
          temperature: 0.7,
          max_tokens: 1200,
          provider: selectedProvider,
          model: selectedProvider === 'aws' ? selectedModel : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      const replyBody = data?.reply || '(模型未返回内容)'
      const assistantMsg: ChatMsg = { id: uid(), role: 'assistant', content: replyBody, createdAt: Date.now() }
      const finalMsgs = [...nextMsgs, assistantMsg]
      setMsgs(finalMsgs)
      if (replyBody.length > 0 && replyBody.length < 2400 && !replyBody.startsWith('调用后端')) {
        setStreamText('')
        setStreamMsgId(assistantMsg.id)
      } else {
        setStreamMsgId(null)
      }
      setBackendOk(true)
      persistSession(finalMsgs)
    } catch (e: any) {
      // 如果是手动中止，不显示错误
      if (e?.name === 'AbortError') return

      let errorMessage = e?.message || '未知错误'
      let friendlyMessage = ''

      // 根据错误类型提供友好的提示
      if (errorMessage.includes('缺少') && errorMessage.includes('API Key')) {
        friendlyMessage = '普通模式暂时不可用，请切换 Agent 模式，或在 .env 中配置 API Key。'
      } else if (errorMessage.includes('HTTP 5')) {
        friendlyMessage = '服务暂时不可用，请稍后重试，或先切换 Agent 模式。'
      } else {
        friendlyMessage = '调用 /api/chat 失败：' + errorMessage
      }

      const assistantMsg: ChatMsg = {
        id: uid(), role: 'assistant',
        content: friendlyMessage,
        createdAt: Date.now(),
      }
      const finalMsgs = [...nextMsgs, assistantMsg]
      setMsgs(finalMsgs)
      setStreamMsgId(null)
      persistSession(finalMsgs, '对话失败重试')
    } finally {
      setSending(false)
      setAbortController(null)
    }
  }

  // Agent 模式发送（工具调用循环 + SSE 流式输出）
  async function onSendAgent() {
    const text = input.trim()
    if (!text || sending) return
    setAutoScrollEnabled(true)
    setSending(true)
    const controller = new AbortController()
    setAbortController(controller)
    setInput('')
    setStreamMsgId(null)
    setStreamText('')
    setAgentTools([])

    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, createdAt: Date.now() }
    const nextMsgs = [...msgs, userMsg]
    setMsgs(nextMsgs)

    // 创建一个空的assistant消息用于流式填充
    const assistantId = uid()
    const assistantMsg: ChatMsg = { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }
    const msgsWithAssistant = [...nextMsgs, assistantMsg]
    setMsgs(msgsWithAssistant)

    let accContent = ''

    try {
      // SSE 流式请求必须直连后端，绕过 Next.js rewrite（rewrite 会缓存响应导致 SSE 失败）
      const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'
      const res = await fetch(`${backendBase}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMsgs.map(({ role, content }) => ({ role, content })),
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
            if (!reader) throw new Error('无法读取响应')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()   // { done, value }
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const rawData = line.slice(6).trim()
          if (!rawData) continue

          let event: any
          try { event = JSON.parse(rawData) } catch { continue }

          if (event.type === 'content') {
            // 流式文字 - 实时追加到消息中
            accContent += event.data
            setMsgs(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: accContent } : m
            ))
          } else if (event.type === 'thinking') {
            // 工具调用开始 - 显示工具调用状态
            setAgentTools(prev => [...prev, { tool: event.tool, label: event.label, status: 'thinking' }])
          } else if (event.type === 'tool_result') {
            // 工具调用结束 - 更新状态
            setAgentTools(prev => prev.map(t =>
              t.tool === event.tool && t.status === 'thinking' ? { ...t, status: 'done' } : t
            ))
          } else if (event.type === 'done') {
            break
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Agent 执行出错')
          }
        }
      }

      // 最终设置完整消息
      const finalContent = accContent || '(未收到回复)'
      setMsgs(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: finalContent } : m
      ))

      setBackendOk(true)
      persistSession([...nextMsgs, { ...assistantMsg, content: finalContent }])
    } catch (e: any) {
      // 如果是手动中止，不显示错误
      if (e?.name === 'AbortError') return
      const rawMsg: string = e?.message || '未知错误'
      // 后端已返回友好提示时直接用，否则给通用提示
      const isAlreadyFriendly = !rawMsg.includes('Error code:') && !rawMsg.includes('{') && rawMsg.length < 120
      const errContent = isAlreadyFriendly ? ('😅 ' + rawMsg) : '😅 AI 服务暂时繁忙，请稍后再试'

      setMsgs(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: errContent } : m
      ))
    } finally {
      setSending(false)
      setAbortController(null)
      // 3秒后清除工具调用状态
      setTimeout(() => setAgentTools([]), 3000)
    }
  }

  // 行程规划模式
  async function onSendPlanner() {
    const text = input.trim()
    if (!text || sending) return

    setAutoScrollEnabled(true)
    setSending(true)
    setInput('')

    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, createdAt: Date.now() }
    const nextMsgs = [...msgs, userMsg]
    setMsgs(nextMsgs)


    const { destination, days, budget } = parsePlannerInput(text)

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      const errMsg: ChatMsg = {
        id: uid(), role: 'assistant',
                content: '需要登录才能生成行程哦。请先登录后再试',
        createdAt: Date.now(),
      }
      setMsgs((s) => [...s, errMsg])
      setSending(false)
      return
    }

    try {
      const res = await fetch('/api/itinerary/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination: destination || undefined,
          days: days || 3,
          preferences: { travel_style: 'relaxation', interests: [] },
          budget_hint: budget || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      const assistantMsg: ChatMsg = {
        id: uid(), role: 'assistant',
        content: `✅ 行程已生成并保存！以下是「${data.trip?.title || '行程'}」的详细规划 🗺️`,
        createdAt: Date.now(),
        planTrip: data.trip,
        planItems: data.items || [],
      }
      setMsgs((s) => [...s, assistantMsg])
      toast.success('行程已保存到你的行程列表')
    } catch (e: any) {
      // 如果是手动中止，不显示错误
      if (e?.name === 'AbortError') return
      
      // 特殊处理401错误：提示用户登录
      let errorMessage = e?.message || '未知错误'
      if (errorMessage.includes('401') || errorMessage.includes('无效的token') || errorMessage.includes('token已过期')) {
        errorMessage = '需要登录才能生成行程。请先登录后再试，或者切换到 Agent 模式（不需要登录）'
      }
      
      const assistantMsg: ChatMsg = {
        id: uid(), role: 'assistant',
        content: `❌ 行程生成失败：${errorMessage}\n\n你可以：\n1. 先登录后再试\n2. 切换到 Agent 模式（右上角⚡按钮）\n3. 换一种方式描述，比如"去杭州5天预算3000"`,
        createdAt: Date.now(),
      }
      setMsgs((s) => [...s, assistantMsg])
    } finally {
      setSending(false)
      setAbortController(null)
    }
  }

  // 检测是否为行程规划请求
  function detectPlannerRequest(text: string): boolean {
    const plannerKeywords = [
      '规划', '行程', '计划', '安排', '预算', '游玩', '旅游', '旅行',
      '路线', '攻略', '日程', 'itinerary', 'planner', 'plan',
      '目的地', '天数', '人均'
    ]
    const lowerText = text.toLowerCase()
    return plannerKeywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase()) ||
      /\d+天|\d+日/.test(text) ||
      /预算.*\d+/.test(text) ||
      /去哪|去哪里|目的地/.test(text)
    )
  }

  async function onSend() {
    const text = input.trim()
    if (!text || sending) return

    // Agent 模式：走工具调用循环
    if (agentMode) {
      await onSendAgent()
      return
    }

    // 自动检测是否为行程规划请求
    if (detectPlannerRequest(text)) {
      await onSendPlanner()
    } else {
      await onSendChat()
    }
  }


  // 重置对话
  function resetConversation() {
    setMsgs([
      {
        id: uid(),
        role: 'assistant',
        content: '??????3??2000????',
        createdAt: Date.now(),
      },
    ])
    setStreamMsgId(null)
    setStreamText('')
    setInput('')
  }

  const groupedByDay = useMemo(() => {
    const map = new Map<number, any[]>()
    for (const it of msgs[msgs.length - 1]?.planItems || []) {
      const day = Number(it.day_number || 1)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(it)
    }
    const days = Array.from(map.keys()).sort((a, b) => a - b)
    return days.map((d) => ({
      day: d,
      items: (map.get(d) || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))
  }, [msgs])

  function formatTime(v: any) {
    if (!v) return null
    const s = String(v)
    return s.length >= 5 ? s.slice(0, 5) : s
  }

  const chatInputPlaceholder = '跟小游说说你想去哪里玩，例如：杭州3天，预算2000，喜欢拍照和美食'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/30">
      <Navbar />
      <main className="pt-16 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">


        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-400 shadow-lg shadow-blue-500/25">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                  🚀 小游旅行助手
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">智能规划 · 美食推荐 · 预算估算 · 你的贴心旅行伙伴</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${backendOk ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                <ShieldCheck className={`h-3.5 w-3.5 ${backendOk ? 'text-green-600' : 'text-gray-400'}`} />
                                {backendOk === null ? '检测中' : backendOk ? '后端正常' : '后端未连接'}
              </div>
              <button
                type="button"
                className="btn btn-outline text-xs px-3 py-1.5 rounded-full hover:bg-blue-50"
                onClick={() => setShowHistory(true)}
              >
                历史对话
              </button>
            </div>
          </div>
        </div>


          {msgs.length <= 1 && (
            <div className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                <button
                  type="button"
                                    onClick={() => setInput('推荐几个适合拍照的国内城市')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">智能问答</h3>
                    <p className="text-blue-100 text-sm">解答旅行相关问题</p>
                  </div>
                </button>


                <button
                  type="button"
                  onClick={() => setInput('想去杭州3天，预算2000，喜欢自然风光和美食')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">行程规划</h3>
                    <p className="text-emerald-100 text-sm">智能生成旅行路线</p>
                  </div>
                </button>


                <button
                  type="button"
                                    onClick={() => setInput('帮我规划一个周末南京行程')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/25 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">日程安排</h3>
                    <p className="text-violet-100 text-sm">2天短途旅行计</p>
                  </div>
                </button>


                <button
                  type="button"
                  onClick={() => setInput('云南5天游大概要花多少钱？')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/25 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                      <Plane className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">旅行建议</h3>
                    <p className="text-amber-100 text-sm">专业旅行咨询</p>
                  </div>
                </button>
              </div>


              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  '去厦门3天预算3000',
                  '杭州3天亲子游',
                  '周末北京文化之旅',
                  '云南拍照打卡路线',
                  '日本7天自由行攻略',
                  '泰国美食之旅',
                  '海边度假推荐',
                  '冬天滑雪去哪'
                ].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setInput(hint)}
                    className="text-xs rounded-full bg-white border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all hover:shadow-sm"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}


          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl shadow-blue-500/5">

            <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <div className="text-white font-semibold">🚀 小游</div>
                  <div className="text-blue-100 text-xs">你的专属旅行规划师 · 在线</div>
                </div>
                <div className="ml-auto flex items-center gap-2">

                  <select
                    value={selectedProvider}   // value?
                    onChange={(e) => {
                      setSelectedProvider(e.target.value)
                      // 鍒囨崲鏃堕噸缃ā鍨嬮€夋嫨
                      if (e.target.value === 'aws') {
                        setSelectedModel('amazon.titan-text-express-v1')
                      } else if (e.target.value === 'zhipu') {   // } else if (e.target.value?
                        setSelectedModel('glm-4.5-air')
                      } else if (e.target.value === 'moonshot') {   // } else if (e.target.value?
                        setSelectedModel('kimi-k2.5')
                      } else {
                        setSelectedModel('')
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-all cursor-pointer appearance-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <option value="moonshot" style={{ color: '#1e293b' }}>Moonshot AI</option>
                    <option value="zhipu" style={{ color: '#1e293b' }}>智谱 GLM-4</option>
                    <option value="aws" style={{ color: '#1e293b' }}>AWS Bedrock</option>
                    <option value="openai" style={{ color: '#1e293b' }}>OpenAI</option>
                  </select>

                  {selectedProvider === 'moonshot' && (
                    <select
                      value={selectedModel}   // value?
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-full bg-blue-500/30 text-white border border-blue-400/50 hover:bg-blue-500/40 transition-all cursor-pointer"
                    >
                      <option value="kimi-k2.5" style={{ color: '#1e293b' }}>🤖 Kimi K2.5</option>
                      <option value="moonshot-v1-8k" style={{ color: '#1e293b' }}>✨ v1-8k</option>
                      <option value="moonshot-v1-32k" style={{ color: '#1e293b' }}>✨ v1-32k</option>
                    </select>
                  )}

                  {selectedProvider === 'zhipu' && (
                    <select
                      value={selectedModel}   // value?
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/30 text-white border border-cyan-400/50 hover:bg-cyan-500/40 transition-all cursor-pointer"
                    >
                      <option value="glm-4.5-air" style={{ color: '#1e293b' }}>🌬️ GLM-4.5 Air</option>
                      <option value="glm-4.6v" style={{ color: '#1e293b' }}>👁️ GLM-4.6V (视觉)</option>
                    </select>
                  )}

                  {selectedProvider === 'aws' && (
                    <select
                      value={selectedModel}   // value?
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-full bg-amber-500/30 text-white border border-amber-400/50 hover:bg-amber-500/40 transition-all cursor-pointer"
                    >
                      <option value="amazon.titan-text-express-v1" style={{ color: '#1e293b' }}>馃敺 Titan</option>
                      <option value="deepseek.deepseek-v3-0324" style={{ color: '#1e293b' }}>馃煝 DeepSeek V3</option>
                      <option value="qwen.qwen3-32b" style={{ color: '#1e293b' }}>馃煚 Qwen3 32B</option>
                      <option value="minimax.minimax-m2.5" style={{ color: '#1e293b' }}>馃煟 MiniMax M2.5</option>
                    </select>
                  )}
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
                    onClick={resetConversation}
                  >
                    新对话
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[60vh] min-h-[400px] flex flex-col">

              <div
                ref={chatContainerRef}
                className="flex-1 overflow-auto p-6 space-y-6 bg-gradient-to-b from-gray-50/80 via-white/90 to-blue-50/30"
                onScroll={(e) => {
                  const target = e.target as HTMLDivElement
                  const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50
                  if (isAtBottom) setAutoScrollEnabled(true)
                }}
              >
                {msgs.map((m, idx) => {
                  const displayContent =
                    m.role === 'assistant' && streamMsgId === m.id ? streamText || '\u00a0' : m.content
                  const showStreamCaret = m.role === 'assistant' && streamMsgId === m.id && streamText.length < m.content.length
                  const matched =
                    m.role === 'assistant'
                      ? destPreview
                          .filter((d) => {
                            const content = m.content || ''
                            return content.includes(d.name) || content.includes(d.city)
                          })
                          .slice(0, 2)
                      : []

                  return (
                    <div key={m.id} className="group/message">
                      <div className={`flex items-start gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'assistant' ? (
                        <div className="shrink-0 flex flex-col items-center pt-0.5">
                          <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-400 shadow-lg shadow-blue-500/25 group-hover/message:scale-105 transition-transform duration-300">
                            <Sparkles className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xs text-gray-500 mt-1.5 font-medium">小游</span>
                        </div>
                      ) : null}
                      <div
                        className={`max-w-[78%] px-6 py-5 leading-relaxed whitespace-pre-wrap shadow-sm transition-all duration-300 group-hover/message:shadow-md ${
                          m.role === 'user'
                            ? 'rounded-3xl rounded-br-sm bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                            : 'rounded-3xl rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm backdrop-blur-sm'
                        }`}
                      >

                          {m.role === 'assistant' && isTripContent(displayContent) && !m.planTrip ? (
                            <>

                              <TripCard content={displayContent} />
                            </>
                          ) : (
                            /* 闈炶绋嬪唴瀹规椂鎵嶆樉绀哄師濮嬫枃?*/
                            <div className="text-sm leading-relaxed tracking-wide text-gray-800">
                              {processMessageContent(displayContent)}
                              {showStreamCaret ? <span className="inline-block w-2 h-4 ml-0.5 align-[-2px] bg-blue-500/80 animate-pulse" /> : null}
                            </div>
                          )}

                          {m.role === 'assistant' && m.planTrip && m.planItems?.length ? (
                            <div className="mt-4 space-y-3">
                              {groupedByDay.map(({ day, items }) => (
                                <div key={`day-${day}`} className="rounded-xl border border-blue-100 bg-white/80 p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                      {day}
                                    </div>
                                    <span className="font-semibold text-gray-900 text-sm">第{day}天</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {items.map((it: any) => (
                                      <div key={it.id ?? `${it.title}-${it.sort_order}`} className="flex items-start gap-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-semibold text-gray-800 truncate">{it.title}</div>
                                          {(it.start_time || it.location) ? (
                                            <div className="text-xs text-gray-500 mt-0.5">
                                              {it.start_time ? `${formatTime(it.start_time)}` : ''}
                                              {it.location ? ` 路 ${it.location}` : ''}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              <div className="flex gap-2 pt-1">
                                <Link href="/itineraries" className="btn btn-outline text-xs py-1.5 flex-1 justify-center">
                                  <Calendar className="h-3.5 w-3.5 mr-1" />
                                  查看完整行程
                                </Link>
                                <button
                                  type="button"
                                  className="btn btn-outline text-xs py-1.5 flex-1 justify-center"
                                  onClick={() => {
                                    const last = msgs.filter((x) => x.role === 'user').pop()
                                    if (last) setInput(last.content)
                                  }}
                                >
                                  <Plane className="h-3.5 w-3.5 mr-1" />
                                  重新生成
                                </button>
                              </div>
                            </div>
                          ) : null}
                          <div className={`mt-1 text-[11px] opacity-70 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {formatClock(m.createdAt)}
                          </div>
                        </div>
                      </div>


                      {m.role === 'assistant' && matched.length ? (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {matched.map((d) => (
                              <Link
                                key={`cta-${d.id}`}
                                href={`/destinations/${d.id}`}
                                className="inline-flex items-center rounded-full bg-blue-600 text-white text-xs font-medium px-3 py-1 hover:bg-blue-700 transition-colors"
                              >
                                鏌ョ湅{d.name}璇︽儏
                              </Link>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 mb-2">{destPreviewLoading ? '识别中...' : '相关目的地'}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {matched.map((d) => (
                              <Link
                                key={d.id}
                                href={`/destinations/${d.id}`}
                                className="group flex gap-3 items-center rounded-lg border border-gray-200 bg-white px-2 py-2 hover:shadow-sm transition"
                              >
                                <img src={coverSrc(d)} alt={d.name} loading="lazy" onError={onImgErrorUseFallback}
                                  className="w-16 h-12 rounded-md object-cover flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{d.name}</div>
                                  <div className="text-xs text-gray-600 truncate">{d.city} 路 {d.province}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}


                {sending ? (
                  <div className="flex justify-start items-end gap-3">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25 animate-pulse">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs text-gray-400 mt-1">小游</span>
                    </div>
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-800 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-blue-700">🤔 让我想想</span>
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>


              {input.length > 3 && (
                <SmartPlannerHelper
                  input={input}
                  onFill={(newInput) => {
                    setInput(newInput)
                    setShowPlannerHelper(false)
                  }}
                  onClear={() => {
                    setShowPlannerHelper(false)
                  }}
                />
              )}


              <div className="border-t border-gray-100 bg-gradient-to-b from-white to-blue-50/50 px-6 py-5">


                {agentTools.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {agentTools.map((t, i) => (
                      <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        t.status === 'thinking'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse'
                          : 'bg-green-50 text-green-600 border border-green-200'
                      }`}>
                        {t.status === 'thinking' ? (
                          <div className="h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>✓</span>
                        )}
                        {t.label}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200">

                  <div className="flex items-center gap-2 pl-3">
                    <button type="button" className="btn btn-ghost w-10 h-10 rounded-full justify-center hover:bg-blue-50 transition-colors hover:scale-105" onClick={onPickAttachment} aria-label="上传图片">
                      <Paperclip className="h-5 w-5 text-gray-500" />
                    </button>
                    <button type="button" className={`btn btn-ghost w-10 h-10 rounded-full justify-center transition-colors hover:scale-105 ${recognizing ? 'text-blue-600 bg-blue-50' : 'hover:bg-blue-50'}`} onClick={onToggleVoice} aria-label="语音输入">
                      <Mic className={`h-5 w-5 ${recognizing ? 'animate-pulse text-blue-600' : 'text-gray-500'}`} />
                    </button>

                    <button
                      type="button"
                                            title={agentMode ? '当前：Agent模式（AI会主动调用工具）' : '当前：普通模式（点击开启Agent模式？）'}
                      onClick={() => setAgentMode(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 ${
                        agentMode
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm shadow-purple-200'
                          : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50 border border-gray-200'
                      }`}
                    >
                      <span className="text-sm">⚙</span>
                      <span className="hidden sm:inline">{agentMode ? 'Agent模式' : 'Agent模式'}</span>
                    </button>
                  </div>


                  <input
                    className="flex-1 bg-transparent text-sm py-4 pr-2 outline-none placeholder-gray-500 placeholder:font-normal"
                    value={input}   // value?
                    onChange={(e) => {
                      setInput(e.target.value)
                      // 瀹炴椂妫€娴嬫剰鍥撅紝鏄剧ず鏅鸿兘鍔╂墜
                      const { isPlanning, missingInfo } = detectIntent(e.target.value)
                      if (isPlanning && missingInfo.length > 0) {
                        setShowPlannerHelper(true)
                      } else {
                        setShowPlannerHelper(false)
                      }
                    }}
                    placeholder={agentMode ? '🤖 Agent模式：AI会主动查天气、搜景点、生成行程...' : chatInputPlaceholder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
                    }}
                  />


                  {sending && abortController && (
                    <button
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:shadow-lg transition-all mr-1"
                      onClick={() => abortController.abort()}
                      title="停止生成"
                    >
                      <Square className="h-5 w-5" />
                    </button>
                  )}


                  <button
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all mr-1 ${
                      agentMode
                        ? 'bg-gradient-to-r from-violet-600 to-purple-500'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                    }`}
                    disabled={!canSend}
                    onClick={onSend}
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-2 text-center text-xs text-gray-400">
                  {agentMode
                    ? '✨Agent 模式已开启 · AI 会自动调用天气、景点、行程等工具获取真实数据'
                    : '按 Enter 发送，Shift + Enter 换行 · 小游会主动帮你完善行程信息 💡'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />


      {showHistory ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">瀵硅瘽鍘嗗彶</h2>
                    <div className="text-sm text-gray-600 mt-1">鏈湴淇濆瓨锛屽埛鏂颁笉涓㈠け</div>
                  </div>
                </div>
              </div>
              <button className="btn btn-outline rounded-full px-4 py-2" type="button" onClick={() => setShowHistory(false)}>鍏抽棴</button>
            </div>
            <div className="mt-4 space-y-3 max-h-[50vh] overflow-auto pr-2">
              {sessions.length ? sessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all duration-200"
                  onClick={() => {
                    setMsgs(s.msgs); setSessionId(s.id); setStreamMsgId(null); setStreamText(''); setShowHistory(false)
                  }}
                  role="button">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate text-lg">{s.title}</div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(s.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-xs text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded-full inline-block">
                        {s.msgs.length} 鏉℃秷?
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline rounded-full px-3 py-1.5 text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = sessions.filter((x) => x.id !== s.id)
                        setSessions(next)
                        try { localStorage.setItem('assistant_sessions_v1', JSON.stringify(next)) } catch { /* ignore */ }
                      }}>
                      鍒犻櫎
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                  <div className="mx-auto w-fit rounded-full bg-blue-100 p-3 text-blue-600">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <div className="mt-4 text-gray-700 font-medium">鏆傛棤鍘嗗彶瀵硅瘽</div>
                  <div className="text-sm text-gray-500 mt-1">寮€濮嬪璇濆悗锛屽巻鍙茶褰曞皢鑷姩淇濆瓨</div>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3 flex-wrap">
              <button className="btn bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-full px-6 py-3" type="button"
                onClick={() => {
                  resetConversation()
                  setShowHistory(false)
                }}>
                寮€濮嬫柊瀵硅瘽
              </button>
              <button className="btn btn-outline rounded-full px-6 py-3" type="button"
                onClick={() => {
                  if (sessions.length > 0) {
                    setSessions([])
                    try { localStorage.removeItem('assistant_sessions_v1') } catch { /* ignore */ }
                  }
                }}>
                娓呯┖鎵€鏈夊巻?
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

