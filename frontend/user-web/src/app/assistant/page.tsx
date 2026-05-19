/**
 * =====================================================
 * AI 旅行助手页模块 - 小游对话系统
 * =====================================================
 * 功能说明：
 *   - AI 驱动的旅行规划对话界面
 *   - 支持行程规划、景点推荐、问答咨询
 *   - 语音输入、附件上传（模拟）
 *   - 历史对话本地持久化存储
 *   - 流式响应显示
 *
 * 依赖项：
 *   - components/MarkdownRenderer：Markdown 渲染
 *   - lucide-react：图标库
 *   - react-hot-toast：消息提示
 *   - store/index：Zustand 用户状态
 *
 * 数据来源：
 *   - POST /api/agent/chat：AI 对话接口（流式响应）
 *   - GET /api/recommendations：目的地推荐
 *   - GET /api/health：后端健康检查
 *   - POST /api/conversations/save：保存对话
 *   - POST /api/travel-plans：保存行程
 *
 * 核心功能：
 *   - parsePlannerInput：从文本提取目的地和天数
 *   - parseTripContent：解析行程内容为结构化数据
 *   - TripCard：行程卡片展示组件
 *   - 语音识别：Web Speech API
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Loader2, Send, Sparkles, Mic, Paperclip, MapPin, Calendar, Plane, Lightbulb, Square } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { onImgErrorUseFallback, resolveCoverSrc } from '@/lib/media'
import MarkdownRenderer from '@/components/MarkdownRenderer'

type ChatMsg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  planTrip?: any
  planItems?: any[]
}

type TripActivity = {
  place?: string
  activity?: string
  duration?: string
  cost?: string
  transport?: string
}

type TripDay = {
  day: number
  morning?: TripActivity
  afternoon?: TripActivity
  evening?: TripActivity
  hotel?: string
  tips?: string[]
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
  return { destination, days }
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
    const tips = section.split('\n').map((l) => l.trim()).filter((l) => /^[-•*]/.test(l) || /(?:提示|注意|tips)/i.test(l)).map((l) => l.replace(/^[-•*]\s*/, '')).slice(0, 5)
    const day: TripDay = {
      day: dayNum,
      morning: morning?.[1] ? parseActivity(morning[1]) : undefined,
      afternoon: afternoon?.[1] ? parseActivity(afternoon[1]) : undefined,
      evening: evening?.[1] ? parseActivity(evening[1]) : undefined,
      hotel: hotel?.[1]?.trim(),
      tips: tips.length ? tips : undefined,
    }
    if (day.morning || day.afternoon || day.evening) days.push(day)
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
        className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/30"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/60 flex items-center justify-center">
            <span className="font-bold">{icon}</span>
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
            <span className="text-xs px-2 py-1 bg-white/50 text-gray-600 rounded-full font-medium">⏱ {activity.duration}</span>
          ) : null}
          <span className="text-gray-400 text-sm">{showDetails ? '▲' : '▼'}</span>
        </div>
      </button>

      {showDetails ? (
        <div className="mt-3 pl-11 pr-4 pb-3 bg-white/60 border border-white/30 rounded-xl">
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

function processMessageContent(content: string, isUserMessage: boolean = false): React.ReactNode {
  const imageRegex = /@image:([^\s]+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <MarkdownRenderer key={`text-${lastIndex}`} content={content.slice(lastIndex, match.index)} darkMode={isUserMessage} />
      )
    }
    const src = resolveCoverSrc(match[1])
    parts.push(
      <img key={`img-${match.index}`} src={src} alt="行程图片" loading="lazy" onError={onImgErrorUseFallback}
        className="mt-2 max-h-64 rounded-lg border border-gray-200 object-cover" />,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(
      <MarkdownRenderer key={`text-tail-${lastIndex}`} content={content.slice(lastIndex)} darkMode={isUserMessage} />
    )
  }

  return <>{parts.length ? parts : <MarkdownRenderer content={content} darkMode={isUserMessage} />}</>
}

function TripDayCard({ day }: { day: TripDay }) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70">
      <div
        className="px-5 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-2xl cursor-pointer"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold">第 {day.day} 天</div>
          <div className="text-white/90">{isExpanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {isExpanded ? (
        <div className="px-5 py-4">
          {day.morning ? <ActivityDetails activity={day.morning} timeSlot="morning" /> : null}
          {day.afternoon ? <ActivityDetails activity={day.afternoon} timeSlot="afternoon" /> : null}
          {day.evening ? <ActivityDetails activity={day.evening} timeSlot="evening" /> : null}
          {day.hotel ? (
            <div className="mt-2 text-sm text-gray-700">
              <span className="font-medium">住宿：</span><span>{day.hotel}</span>
            </div>
          ) : null}
          {day.tips?.length ? (
            <div className="mt-2">
              <div className="text-sm font-medium text-gray-700">小贴士</div>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {day.tips.map((tip, idx) => (<li key={idx}>{tip}</li>))}
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
    <div className="bg-white/50 rounded-xl p-4 mb-4 border border-white/40">
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
      {days.map((day, idx) => (<TripDayCard key={idx} day={day} />))}
      {content.includes('@image:') ? <div>{processMessageContent(content)}</div> : null}
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
  const searchParams = useSearchParams()

  // 处理 URL 参数中的目的地
  useEffect(() => {
    const destination = searchParams.get('destination')
    if (destination) {
      setInput(`我想去${destination}旅行，帮我规划一份3天的行程`)
    }
  }, [searchParams])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  // 默认使用智谱GLM-4.5 Air模型（隐藏选择器）
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; createdAt: number; msgs: ChatMsg[] }>>([])
  const [sessionId, setSessionId] = useState<string>(() => uid())
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: uid(),
      role: 'assistant',
      content: '您好！我是小游，您的专属旅行规划师。有什么旅行计划我可以帮您规划吗？',
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
  const [agentTools, setAgentTools] = useState<Array<{ tool: string; label: string; status: 'thinking' | 'done' }>>([])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any })
  }, [])

  useEffect(() => {
    if (!autoScrollEnabled) return
    const container = chatContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight })
    }
  }, [autoScrollEnabled, msgs.length, streamText.length, sending])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('assistant_sessions_v1')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const next = parsed.filter((s) => s && Array.isArray(s.msgs)).slice(0, 10).map((s) => ({
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
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!streamMsgId) return
    const full = msgs.find((m) => m.id === streamMsgId)?.content ?? ''
    if (!full) return
    if (streamText.length >= full.length) { setStreamMsgId(null); return }
    const step = full.length > 600 ? 12 : full.length > 200 ? 4 : 2
    const t = window.setTimeout(() => {
      setStreamText(full.slice(0, Math.min(full.length, streamText.length + step)))
    }, 14)
    return () => window.clearTimeout(t)
  }, [streamMsgId, streamText, msgs])

  function formatClock(ts: number) {
    try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
  }

  const coverSrc = (d: { cover_image?: string | null }) => resolveCoverSrc(d?.cover_image)

  function buildSessionTitle(messages: ChatMsg[]) {
    const firstUser = messages.find((m) => m.role === 'user')
    const t = firstUser?.content?.trim() || '新对话'
    return t.length > 20 ? t.slice(0, 20) + '…' : t
  }

  function persistSession(nextMsgs: ChatMsg[], title?: string) {
    const now = Date.now()
    const id = sessionId || uid()
    const nextTitle = title || buildSessionTitle(nextMsgs)
    const nextSession = { id, title: nextTitle, createdAt: now, msgs: nextMsgs }
    setSessionId(id)
    setSessions((prev) => {
      const merged = [nextSession, ...prev.filter((s) => s.id !== id)].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
      try { localStorage.setItem('assistant_sessions_v1', JSON.stringify(merged)) } catch { /* ignore */ }
      return merged
    })
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!cancelled) setBackendOk(res.ok)
      } catch { if (!cancelled) setBackendOk(false) }
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
        if (!cancelled && Array.isArray(data?.recommendations)) setDestPreview(data.recommendations as DestinationPreview[])
      } catch { /* ignore */ }
      finally { if (!cancelled) setDestPreviewLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending])

  function onPickAttachment() { fileInputRef.current?.click() }

  function onAttachmentChange(e: any) {
    const file = e?.target?.files?.[0]
    if (!file) return
    const next = input.trim() ? `${input}\n[附件] ${file.name}` : `[附件] ${file.name}`
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
    if (!SpeechRecognition) { toast.error('当前浏览器不支持语音输入（建议使用 Chrome）'); return }
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
      for (let i = event.resultIndex; i < event.results.length; i += 1) transcript += event.results[i][0]?.transcript || ''
      transcript = transcript.trim()
      if (transcript) setInput(transcript)
    }
    try { recog.start() } catch { toast.error('语音启动失败'); setRecognizing(false) }
  }

  // 保存对话到数据库
  async function saveConversationToDB(userMsg: ChatMsg, assistantMsg: ChatMsg) {
    try {
      const backendBase = ''  // 使用相对路径，通过 Next.js rewrites 代理
      
      // 保存用户消息
      await fetch(`${backendBase}/api/conversations/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: null, // 未登录用户
          session_id: sessionId,
          role: 'user',
          content: userMsg.content,
          intent: detectIntent(userMsg.content)
        })
      })

      // 保存AI回复
      await fetch(`${backendBase}/api/conversations/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: null,
          session_id: sessionId,
          role: 'assistant',
          content: assistantMsg.content,
          intent: detectIntent(assistantMsg.content)
        })
      })

      // 如果是行程规划，尝试保存为行程
      if (isTripContent(assistantMsg.content)) {
        await saveTravelPlan(assistantMsg)
      }
    } catch (e) {
      console.error('保存对话到数据库失败:', e)
    }
  }

  // 检测意图
  function detectIntent(text: string): string {
    const lower = text.toLowerCase()
    if (lower.includes('行程') || lower.includes('规划') || lower.includes('攻略')) return '行程规划'
    if (lower.includes('推荐') || lower.includes('建议')) return '推荐咨询'
    if (lower.includes('酒店') || lower.includes('住宿')) return '酒店咨询'
    if (lower.includes('天气')) return '天气咨询'
    if (lower.includes('价格') || lower.includes('费用')) return '价格咨询'
    if (lower.includes('预订') || lower.includes('订票')) return '预订咨询'
    return '通用咨询'
  }

  // 保存行程到数据库
  async function saveTravelPlan(assistantMsg: ChatMsg) {
    try {
      const backendBase = ''  // 使用相对路径，通过 Next.js rewrites 代理
      const parsed = parseTripContent(assistantMsg.content)
      if (parsed.length === 0) return

      const { destination, days } = parsePlannerInput(assistantMsg.content)
      
      const planData = {
        session_id: sessionId,
        plan_name: `${destination || '行程'}规划`,
        destination: destination,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + days * 86400000).toISOString().split('T')[0],
        status: 'draft',
        items: parsed.flatMap(day => {
          const items = []
          if (day.morning) {
            items.push({
              day_number: day.day,
              time_slot: 'morning',
              title: day.morning.place || '上午活动',
              description: day.morning.activity,
              activity_type: '景点'
            })
          }
          if (day.afternoon) {
            items.push({
              day_number: day.day,
              time_slot: 'afternoon',
              title: day.afternoon.place || '下午活动',
              description: day.afternoon.activity,
              activity_type: '景点'
            })
          }
          if (day.evening) {
            items.push({
              day_number: day.day,
              time_slot: 'evening',
              title: day.evening.place || '晚上活动',
              description: day.evening.activity,
              activity_type: '景点'
            })
          }
          return items
        })
      }

      await fetch(`${backendBase}/api/travel-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      })

      console.log('行程已保存到数据库')
    } catch (e) {
      console.error('保存行程失败:', e)
    }
  }

  // 从数据库加载历史对话
  async function loadHistoryFromDB() {
    try {
      const backendBase = ''  // 使用相对路径，通过 Next.js rewrites 代理
      const res = await fetch(`${backendBase}/api/conversations/sessions?user_id=${null}`, {
        cache: 'no-store'
      })
      if (!res.ok) return
      
      const data = await res.json()
      if (data.sessions?.length > 0) {
        // 可以选择加载某个历史会话
        console.log('找到历史会话:', data.sessions.length)
      }
    } catch (e) {
      console.error('加载历史失败:', e)
    }
  }

  async function onSend() {
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

    const assistantId = uid()
    setMsgs(prev => [...prev, { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }])
    setStreamMsgId(assistantId)  // 设置流式消息ID，用于显示"正在思考"状态

    let accContent = ''

    try {
      const backendBase = ''  // 使用相对路径，通过 Next.js rewrites 代理
      const res = await fetch(`${backendBase}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ messages: nextMsgs.map(({ role, content }) => ({ role, content })) }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('无法读取响应')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
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
            accContent += event.data
            setMsgs(prev => prev.map(m => m.id === assistantId ? { ...m, content: accContent } : m))
          } else if (event.type === 'thinking') {
            setAgentTools(prev => [...prev, { tool: event.tool, label: event.label, status: 'thinking' }])
          } else if (event.type === 'tool_result') {
            setAgentTools(prev => prev.map(t =>
              t.tool === event.tool && t.status === 'thinking' ? { ...t, status: 'done' } : t
            ))
          } else if (event.type === 'done') { break }
          else if (event.type === 'error') { throw new Error(event.message || 'Agent 执行出错') }
        }
      }

      const finalContent = accContent || '(未收到回复)'
      const assistantMsg: ChatMsg = { id: assistantId, role: 'assistant', content: finalContent, createdAt: Date.now() }
      setMsgs(prev => prev.map(m => m.id === assistantId ? { ...m, content: finalContent } : m))
      setBackendOk(true)
      persistSession([...nextMsgs, assistantMsg])
      
      // 保存对话到数据库
      saveConversationToDB(userMsg, assistantMsg)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      const rawMsg = e?.message || '未知错误'
      // 改进错误显示：显示原始错误信息便于调试
      const errContent = '😅 ' + rawMsg
      setMsgs(prev => prev.map(m => m.id === assistantId ? { ...m, content: errContent } : m))
    } finally {
      setSending(false)
      setAbortController(null)
      setTimeout(() => setAgentTools([]), 3000)
    }
  }

  function resetConversation() {
    setMsgs([{
      id: uid(),
      role: 'assistant',
      content: '您好！我是小游，您的专属旅行规划师。有什么旅行计划我可以帮您规划吗？',
      createdAt: Date.now(),
    }])
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
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* 渐变背景 - 纯 CSS，无图片，无模糊 */}
      <div
        className="fixed inset-0"
        style={{
          background: 'linear-gradient(135deg, #e0f2fe 0%, #ede9fe 30%, #fce7f3 60%, #fef3c7 100%)',
        }}
      />

      {/* 主内容 */}
      <div className="relative z-10 flex flex-col h-full">

        {/* 顶部栏 */}
        <header className="flex-shrink-0 bg-white/60 border-b border-white/40">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {/* 返回首页按钮 */}
              <button
                onClick={() => router.push('/')}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md"
                title="返回首页"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-400">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">小游 · 旅行助手</h1>
                <p className="text-xs text-green-600">在线</p>
              </div>
            </div>
            {/* 隐藏AI提供商选择器，默认使用智谱GLM-4.5 Air */}
            <div className="flex items-center gap-2">
              <button type="button" className="text-sm px-4 py-2 rounded-full bg-white/80 text-gray-700 border border-white/50" onClick={() => setShowHistory(true)}>
                历史对话
              </button>
            </div>
          </div>
        </header>

        {/* 快捷入口 */}
        {msgs.length <= 1 && (
          <div className="flex-shrink-0 px-4 pt-4 pb-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '智能问答', desc: '解答旅行相关问题', gradient: 'from-blue-500/90 to-blue-600/90', icon: Sparkles, prompt: '推荐几个适合拍照的国内城市' },
                { label: '行程规划', desc: '智能生成旅行路线', gradient: 'from-emerald-500/90 to-teal-600/90', icon: MapPin, prompt: '想去杭州3天，预算2000，喜欢自然风光和美食' },
                { label: '日程安排', desc: '2天短途旅行计划', gradient: 'from-violet-500/90 to-purple-600/90', icon: Calendar, prompt: '帮我规划一个周末南京行程' },
                { label: '旅行建议', desc: '专业旅行咨询', gradient: 'from-amber-500/90 to-orange-600/90', icon: Plane, prompt: '云南5天游大概要花多少钱？' },
              ].map((item) => (
                <button key={item.label} type="button" onClick={() => setInput(item.prompt)}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} p-5 text-left border border-white/20`}>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 mb-4">
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{item.label}</h3>
                    <p className="text-white/70 text-sm">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {['去厦门3天预算3000', '杭州3天亲子游', '周末北京文化之旅', '云南拍照打卡路线', '日本7天自由行攻略', '泰国美食之旅', '海边度假推荐', '冬天滑雪去哪'].map((hint) => (
                <button key={hint} type="button" onClick={() => setInput(hint)}
                  className="text-xs rounded-full bg-white/70 border border-white/50 px-3 py-1.5 text-gray-600">
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 聊天区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex flex-col">
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-auto px-4 py-6 space-y-6"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement
                if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) setAutoScrollEnabled(true)
              }}
            >
              {msgs.map((m) => {
                const displayContent = m.role === 'assistant' && streamMsgId === m.id ? streamText || '\u00a0' : m.content
                const showStreamCaret = m.role === 'assistant' && streamMsgId === m.id && streamText.length < m.content.length
                const matched = m.role === 'assistant'
                  ? destPreview.filter((d) => (m.content || '').includes(d.name) || (m.content || '').includes(d.city)).slice(0, 2)
                  : []

                return (
                  <div key={m.id}>
                    <div className={`flex items-start gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'assistant' && (
                        <div className="shrink-0 flex flex-col items-center pt-0.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-400">
                            <Sparkles className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-xs text-gray-500 mt-1.5 font-medium">小游</span>
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] px-5 py-3 leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'rounded-3xl rounded-br-md bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'rounded-3xl rounded-bl-md bg-white/70 text-gray-800 border border-white/40'
                        }`}
                      >
                        {/* 小游正在思考/处理时的加载状态 */}
                        {m.role === 'assistant' && m.id === streamMsgId && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            <span>{agentTools.length > 0 ? agentTools[agentTools.length - 1]?.label : '小游正在思考...'}</span>
                          </div>
                        )}
                        {m.role === 'assistant' && isTripContent(displayContent) && !m.planTrip ? (
                          <TripCard content={displayContent} />
                        ) : (
                          <div className="text-sm leading-relaxed tracking-wide">
                            {processMessageContent(displayContent, m.role === 'user')}
                            {showStreamCaret && <span className="inline-block w-2 h-4 ml-0.5 align-[-2px] bg-blue-500/80 animate-pulse" />}
                          </div>
                        )}

                        {m.role === 'assistant' && m.planTrip && m.planItems?.length ? (
                          <div className="mt-4 space-y-3">
                            {groupedByDay.map(({ day, items }) => (
                              <div key={`day-${day}`} className="rounded-xl border border-white/40 bg-white/50 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-xs font-bold">{day}</div>
                                  <span className="font-semibold text-gray-900 text-sm">第{day}天</span>
                                </div>
                                <div className="space-y-1.5">
                                  {items.map((it: any) => (
                                    <div key={it.id ?? `${it.title}-${it.sort_order}`} className="flex items-start gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-gray-800 truncate">{it.title}</div>
                                        {(it.start_time || it.location) && (
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {it.start_time ? formatTime(it.start_time) : ''}
                                            {it.location ? ` · ${it.location}` : ''}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <div className="flex gap-2 pt-1">
                              <Link href="/itineraries" className="btn btn-outline text-xs py-1.5 flex-1 justify-center">
                                <Calendar className="h-3.5 w-3.5 mr-1" />查看完整行程
                              </Link>
                              <button type="button" className="btn btn-outline text-xs py-1.5 flex-1 justify-center"
                                onClick={() => { const last = msgs.filter((x) => x.role === 'user').pop(); if (last) setInput(last.content) }}>
                                <Plane className="h-3.5 w-3.5 mr-1" />重新生成
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <div className={`mt-1 text-[11px] opacity-60 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatClock(m.createdAt)}
                        </div>
                      </div>
                    </div>

                    {m.role === 'assistant' && matched.length > 0 && (
                      <div className="mt-2 ml-14">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {matched.map((d) => (
                            <Link key={`cta-${d.id}`} href={`/destinations/${d.id}`}
                              className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-medium px-3 py-1">
                              查看{d.name}详情
                            </Link>
                          ))}
                        </div>
                        <div className="text-xs text-gray-400 mb-2">{destPreviewLoading ? '识别中...' : '相关目的地'}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {matched.map((d) => (
                            <Link key={d.id} href={`/destinations/${d.id}`}
                              className="group flex gap-3 items-center rounded-xl border border-white/40 bg-white/50 px-2 py-2">
                              <img src={coverSrc(d)} alt={d.name} loading="lazy" onError={onImgErrorUseFallback}
                                className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-gray-900 truncate">{d.name}</div>
                                <div className="text-xs text-gray-500 truncate">{d.city} · {d.province}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 加载指示器 - 只在没有工具调用时显示 */}
              {sending && agentTools.length === 0 && (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 animate-pulse">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs text-gray-400 mt-1">小游</span>
                  </div>
                  <div className="max-w-[85%] rounded-3xl rounded-bl-md bg-white/70 border border-white/40 px-5 py-4 text-sm text-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-600">思考中</span>
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* 底部输入栏 */}
          <div className="flex-shrink-0 px-4 py-3 bg-white/60 border-t border-white/40">
            <div className="flex items-center gap-3 bg-white/80 rounded-2xl border border-white/50">
              <div className="flex items-center gap-2 pl-3">
                <button type="button" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/60" onClick={onPickAttachment} aria-label="上传图片">
                  <Paperclip className="h-5 w-5 text-gray-500" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onAttachmentChange} />

                <button type="button" className={`w-10 h-10 rounded-full flex items-center justify-center ${recognizing ? 'text-blue-600 bg-blue-50/50' : 'hover:bg-white/60'}`} onClick={onToggleVoice} aria-label="语音输入">
                  <Mic className={`h-5 w-5 ${recognizing ? 'animate-pulse text-blue-600' : 'text-gray-500'}`} />
                </button>
              </div>

              <input
                className="flex-1 bg-transparent text-sm py-4 pr-2 outline-none placeholder-gray-400 text-gray-800"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={chatInputPlaceholder}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
              />

              {sending && abortController && (
                <button className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-r from-rose-500 to-pink-500 mr-1"
                  onClick={() => abortController.abort()} title="停止生成">
                  <Square className="h-5 w-5" />
                </button>
              )}

              <button
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-r from-blue-600 to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed mr-1"
                disabled={!canSend} onClick={onSend}>
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-2 text-center text-xs text-gray-400">
              按 Enter 发送，Shift + Enter 换行 · 小游会自动调用工具为你规划行程
            </div>
          </div>
        </div>
      </div>

      {/* 历史对话弹窗 */}
      {showHistory && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/20 bg-white/90 p-6">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">对话历史</h2>
                  <div className="text-sm text-gray-500 mt-1">本地保存，刷新不丢失</div>
                </div>
              </div>
              <button className="btn btn-outline rounded-full px-4 py-2" type="button" onClick={() => setShowHistory(false)}>关闭</button>
            </div>
            <div className="mt-4 space-y-3 max-h-[50vh] overflow-auto pr-2">
              {sessions.length ? sessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-200 bg-white/80 p-4 hover:border-blue-400 cursor-pointer"
                  onClick={() => { setMsgs(s.msgs); setSessionId(s.id); setStreamMsgId(null); setStreamText(''); setShowHistory(false) }}
                  role="button">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate text-lg">{s.title}</div>
                      <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(s.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-xs text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded-full inline-block">{s.msgs.length} 条消息</div>
                    </div>
                    <button type="button" className="btn btn-outline rounded-full px-3 py-1.5 text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = sessions.filter((x) => x.id !== s.id)
                        setSessions(next)
                        try { localStorage.setItem('assistant_sessions_v1', JSON.stringify(next)) } catch { /* ignore */ }
                      }}>删除</button>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
                  <div className="mx-auto w-fit rounded-full bg-blue-100 p-3 text-blue-600">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <div className="mt-4 text-gray-700 font-medium">暂无历史对话</div>
                  <div className="text-sm text-gray-500 mt-1">开始对话后，历史记录将自动保存</div>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3 flex-wrap">
              <button className="btn bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-full px-6 py-3" type="button"
                onClick={() => { resetConversation(); setShowHistory(false) }}>开始新对话</button>
              <button className="btn btn-outline rounded-full px-6 py-3" type="button"
                onClick={() => { if (sessions.length > 0) { setSessions([]); try { localStorage.removeItem('assistant_sessions_v1') } catch { /* ignore */ } } }}>
                清除所有历史
              </button>
              <HistoryPlansButton onSelectPlan={(plan) => {
                setShowHistory(false)
                // 基于历史行程构建提示词
                const prompt = `参考我之前的${plan.destination}行程（${plan.start_date}至${plan.end_date}），帮我规划一个新的行程。预算约${plan.budget || '未知'}元。`
                setInput(prompt)
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 历史行程选择组件
function HistoryPlansButton({ onSelectPlan }: { onSelectPlan: (plan: any) => void }) {
  const [showPlans, setShowPlans] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadPlans = async () => {
    if (plans.length > 0) return
    setLoading(true)
    try {
      const backendBase = ''  // 使用相对路径，通过 Next.js rewrites 代理
      const res = await fetch(`${backendBase}/api/travel-plans?status=completed&limit=10`)
      const data = await res.json()
      if (data.success) {
        setPlans(data.plans || [])
      }
    } catch (e) {
      console.error('加载历史行程失败', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        className="btn btn-outline rounded-full px-6 py-3" 
        type="button"
        onClick={() => { setShowPlans(true); loadPlans() }}
      >
        <MapPin className="h-4 w-4 mr-1" />
        历史行程
      </button>

      {showPlans && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPlans(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">历史行程</h3>
              <button className="btn btn-outline rounded-full px-3 py-1" onClick={() => setShowPlans(false)}>关闭</button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="mt-2 text-gray-500">加载中...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无历史行程
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map(plan => (
                  <div 
                    key={plan.id} 
                    className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-400 cursor-pointer"
                    onClick={() => { onSelectPlan(plan); setShowPlans(false) }}
                  >
                    <div className="font-semibold text-gray-900">{plan.plan_name || plan.destination}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {plan.start_date} 至 {plan.end_date}
                      {plan.budget && ` · ¥${plan.budget}`}
                    </div>
                    <div className="text-xs text-blue-600 mt-2">
                      点击以此为参考规划新行程
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
