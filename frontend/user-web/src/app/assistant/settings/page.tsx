'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Bot,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  Maximize2,
  Mic2,
  Minimize2,
  Newspaper,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  UserCircle2,
  CloudSun,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import {
  DEFAULT_SETTINGS,
  incrementStats,
  loadAiAgentSettings,
  MODEL_OPTIONS,
  saveAiAgentSettings,
  type AiAgentSettingsState,
  type KbFile,
  type WebToolKey,
} from '@/lib/aiAgentSettings'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** 内联删除确认按钮：首次点击进入「确认？」状态，再次点击执行删除，移开鼠标则重?*/
function DeleteConfirmButton({ onConfirm, label = '删除' }: { onConfirm: () {
  const [confirming, setConfirming] = useState(false)
  return confirming ? (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 active:scale-95 transition"
        onClick={() => { onConfirm(); setConfirming(false) }}
      >
        确认删除
      </button>
      <button
        type="button"
        className="px-2 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition"
        onClick={() => setConfirming(false)}
      >
        取消
      </button>
    </span>
  ) : (
    <button
      type="button"
      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition active:scale-95"
      onClick={() => setConfirming(true)}
      aria-label={label}
      title={label}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const WEB_TOOL_META: Record<
  WebToolKey,
  { label: string; desc: string; icon: typeof Search }
> = {
  brave: {
    label: 'Brave 搜索',
        desc: '网页检索与摘要，适合事实核对与资料查找?',
    icon: Search,
  },
  news: {
    label: '联网新闻',
        desc: '抓取近期新闻标题与摘要（演示：由助手侧工具启用后生效）?',
    icon: Newspaper,
  },
  weather: {
    label: '实时天气',
        desc: '按城市查询当前天气概况（演示：需后端工具接入）?',
    icon: CloudSun,
  },
}

export default function AssistantSettingsPage() {
  const [settings, setSettings] = useState<AiAgentSettingsState>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  const [dhLoading, setDhLoading] = useState(false)
  const [vcLoading, setVcLoading] = useState(false)

  const [previewTab, setPreviewTab] = useState<'model' | 'kb'>('model')
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [previewInput, setPreviewInput] = useState('')
  const [previewSending, setPreviewSending] = useState(false)
  const [previewMsgs, setPreviewMsgs] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const previewEndRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setSettings(loadAiAgentSettings())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    setPreviewMsgs([
      { role: 'assistant', content: settings.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage },
    ])
  }, [hydrated, settings.welcomeMessage])

  useEffect(() => {
    previewEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [previewMsgs.length, previewExpanded])

  const persist = useCallback((next: AiAgentSettingsState) => {
    setSettings(next)
    saveAiAgentSettings(next)
  }, [])

  const onSave = () => {
    setSaving(true)
    try {
      saveAiAgentSettings(settings)
      toast.success('配置已保存到本机')
    } finally {
      setTimeout(() => setSaving(false), 280)
    }
  }

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''   // e.target.value?
    if (!f) return
    const id = uid()
    const row: KbFile = {
      id,
      name: f.name,
      size: f.size,
      status: 'processing',
      uploadedAt: Date.now(),
    }
    persist({ ...settings, kbFiles: [...settings.kbFiles, row] })
        toast.success('已加入处理队?')
    window.setTimeout(() => {
      const next = loadAiAgentSettings()
      const kbFiles = next.kbFiles.map((k) =>
        k.id === id
          ? { ...k, status: (Math.random() > 0.08 ? 'ready' : 'failed') as KbFile['status'] }
          : k,
      )
      persist({ ...next, kbFiles })
      const done = kbFiles.find((k) => k.id === id)
      if (done?.status === 'ready') toast.success(`文档?{done.name}」已就绪`)
      if (done?.status === 'failed') toast.error(`?{done?.name}」处理失败，可删除后重试`)
    }, 1400)
  }

  const removeKb = (id: string) => {
    persist({ ...settings, kbFiles: settings.kbFiles.filter((k) => k.id !== id) })
        toast.success('已移?')
  }

  const openExternal = (kind: 'dh' | 'vc') => {
    if (kind === 'dh') {
      setDhLoading(true)
      window.setTimeout(() => {
        setDhLoading(false)
        persist({ ...settings, digitalHumanConfigured: true })
                toast.success('已标记数字人工作台（演示?')
      }, 900)
      return
    }
    setVcLoading(true)
    window.setTimeout(() => {
      setVcLoading(false)
      persist({ ...settings, voiceCloneName: settings.voiceCloneName || '默认音色 · 旅行女声' })
      toast.success('已打开音色克隆（演示）')
    }, 900)
  }

  const exportJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
            toast.success('配置 JSON 已复?')
    } catch {
      toast.error('复制失败')
    }
  }

  const sendPreview = async () => {
    const text = previewInput.trim()
    if (!text || previewSending) return
    setPreviewSending(true)
    setPreviewInput('')

    const sys =
      previewTab === 'kb'
        ? `${settings.systemPrompt}\n\n【知识库模式】优先根据已上传文档作答；文档未覆盖时请明确说明并给出通用建议。`
        : settings.systemPrompt

    const messages = [
      { role: 'system' as const, content: sys },
      ...previewMsgs.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ]

    const nextUser = [...previewMsgs, { role: 'user' as const, content: text }]
    setPreviewMsgs(nextUser)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(({ role, content }) => ({ role, content })),
          temperature: 0.6,
          max_tokens: 900,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        const errText = data?.error || `HTTP ${res.status}`
        throw new Error(errText)
      }
      const reply = String(data?.reply || '(无内容)')
      setPreviewMsgs((m) => [...m, { role: 'assistant', content: reply }])
      const approx = Math.ceil((text.length + reply.length) / 4)
      setSettings((prev) => {
        const n = incrementStats(prev, approx)
        saveAiAgentSettings(n)
        return n
      })
    } catch (e: any) {
      const reply = `预览调用失败?{e?.message || '未知错误'}。你可先保存配置，并检查后?/api/chat 与模型密钥。`
      setPreviewMsgs((m) => [...m, { role: 'assistant', content: reply }])
    } finally {
      setPreviewSending(false)
    }
  }

  const clearPreview = () => {
    setPreviewMsgs([{ role: 'assistant', content: settings.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage }])
  }

  const kbBadge = useMemo(() => {
    const n = settings.kbFiles.length
    const ready = settings.kbFiles.filter((k) => k.status === 'ready').length
        if (!n) return { text: '未上?', tone: 'bg-slate-100 text-slate-600 border-slate-200' }
        if (ready === n) return { text: '已就?', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
        return { text: '处理?', tone: 'bg-amber-50 text-amber-900 border-amber-200' }
  }, [settings.kbFiles])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-sky-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navbar />

      <main className="pt-16 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/assistant" className="hover:text-primary transition-colors font-medium">AI 助手</Link>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-foreground font-semibold">智能体配置中</span>
          </nav>


          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Settings2 className="h-3.5 w-3.5" />
                智能体配置中?
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">智能体配</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
                集中管理知识库、桌面扩展能力与联网工具开关；下方预览区用于快速调试对话。配置默认保存在浏览器本地，可导?JSON 备份?
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={exportJson}
                className="btn btn-outline inline-flex items-center gap-2 active:scale-[0.98] transition hover:border-primary/50"
              >
                <Copy className="h-4 w-4" />
                导出配置
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="travel-btn-gradient inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-60 active:scale-[0.98] transition"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? '保存中? : '保存并应?'}
              </button>
            </div>
          </div>


          <section className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                人设与模?
              </h2>
              {settings.systemPrompt.trim() ? (
                <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  ?已配?System Prompt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  ⚠️ 未配?System Prompt
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">系统提示词、欢迎语与底层模型（展示用选项可与后端实际可用模型对齐）?/p>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-foreground">系统提示词（System Prompt?/label>
                <textarea
                  className="input mt-1.5 min-h-[100px] w-full resize-y"
                  value={settings.systemPrompt}   // value?
                  onChange={(e) => setSettings((s) => ({ ...s, systemPrompt: e.target.value }))}
                  placeholder="定义助手人设、语气与边界?
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">欢迎</label>
                <textarea
                  className="input mt-1.5 min-h-[72px] w-full"
                  value={settings.welcomeMessage}   // value?
                  onChange={(e) => setSettings((s) => ({ ...s, welcomeMessage: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">对话模型</label>
                <select
                  className="input mt-1.5 w-full"
                  value={settings.modelId}   // value?
                  onChange={(e) => setSettings((s) => ({ ...s, modelId: e.target.value }))}
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-foreground">敏感?/ 输出过滤（每行一条，可选）</label>
                <textarea
                  className="input mt-1.5 min-h-[80px] w-full font-mono text-xs"
                  value={settings.filterRules}   // value?
                  onChange={(e) => setSettings((s) => ({ ...s, filterRules: e.target.value }))}
                  placeholder="例如?#10;竞品名A&#10;内部代号"
                />
                <p className="text-xs text-muted-foreground mt-1">当前为前端记录；真正拦截需在服务端审核链路实现</p>
              </div>
            </div>
          </section>


          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">工具能力</h2>
            <span className="h-px flex-1 bg-border/80" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">

            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center ring-1 ring-amber-200/80">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">知识</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-[240px]">
                      上传文档，让助手基于你的资料回答问题?
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${kbBadge.tone}`}>{kbBadge.text}</span>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                支持格式?span className="font-medium text-foreground">PDF、Word?doc/.docx）、TXT、Markdown</span>
                （演示：任意文件会进入模拟解析队列）
              </p>

              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.md" onChange={onUpload} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 w-full btn btn-outline inline-flex items-center justify-center gap-2 py-2.5 hover:bg-primary/5 hover:border-primary/40 active:scale-[0.99] transition"
              >
                <Upload className="h-4 w-4" />
                上传文件
              </button>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {settings.kbFiles.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-2xl">暂无文件</div>
                ) : (
                  settings.kbFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtBytes(f.size)} ·{' '}
                          {f.status === 'processing' ? (
                            <span className="text-amber-600">处理</span>
                          ) : f.status === 'ready' ? (
                            <span className="text-emerald-600">就绪</span>
                          ) : (
                            <span className="text-red-600">失败</span>
                          )}
                        </div>
                      </div>
                      <DeleteConfirmButton onConfirm={() => removeKb(f.id)} label="删除文件" />
                    </div>
                  ))
                )}
              </div>
            </div>


            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center ring-1 ring-violet-200/80">
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">数字</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">桌面数字人工作台，用于形象与动作配置</p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    settings.digitalHumanConfigured
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                                    {settings.digitalHumanConfigured ? '已配? : '未配?'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                <span className="font-medium text-foreground">什么是数字人？</span> 将助手以虚拟形象呈现，适合接待与讲解场景?
                <button
                  type="button"
                  title="在桌面客户端完成摄像头与形象绑定"
                  className="ml-1 text-primary font-semibold hover:underline"
                >
                  了解更多
                </button>
              </p>
              <button
                type="button"
                disabled={dhLoading}
                onClick={() => openExternal('dh')}
                className="mt-3 w-full travel-btn-gradient inline-flex items-center justify-center gap-2 py-2.5 active:scale-[0.99] transition disabled:opacity-70"
              >
                {dhLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {dhLoading ? '正在打开? : '进入桌面数字人工作台'}
              </button>
            </div>


            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center ring-1 ring-rose-200/80">
                    <Mic2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">音色克隆</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">录制样本生成专属朗读音色</p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    settings.voiceCloneName ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                                    {settings.voiceCloneName ? '已克? : '未配?'}
                </span>
              </div>
              <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">当前默认音色</span>
                                <span className="font-medium">{settings.voiceCloneName || '未设置（使用系统默认?'}</span>
              </div>
              <button
                type="button"
                disabled={vcLoading}
                onClick={() => openExternal('vc')}
                className="mt-3 w-full btn btn-outline inline-flex items-center justify-center gap-2 py-2.5 hover:bg-rose-50/50 hover:border-rose-300/50 active:scale-[0.99] transition"
              >
                {vcLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                                {vcLoading ? '正在打开? : '进入桌面音色克隆工作?'}
              </button>
            </div>


            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center ring-1 ring-cyan-200/80">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">联网搜索</h3>
                  <p className="text-xs text-muted-foreground">控制助手可调用哪些联网工具</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {(Object.keys(WEB_TOOL_META) as WebToolKey[]).map((key) => {
                  const meta = WEB_TOOL_META[key]
                  const Icon = meta.icon
                  const on = settings.webTools[key]
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                        on ? 'border-cyan-200/80 bg-cyan-50/50' : 'border-border/60 bg-background/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-cyan-600' : 'text-muted-foreground'}`} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold flex items-center gap-1.5">
                            {meta.label}
                            <span title={meta.desc} className="inline-flex text-muted-foreground hover:text-foreground cursor-help">
                              <Info className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <div className={`text-[11px] mt-0.5 font-medium ${on ? 'text-cyan-600' : 'text-muted-foreground/60'}`}>
                                                        {on ? '🟢 已启? : '?已关?'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            webTools: { ...s.webTools, [key]: !s.webTools[key] },
                          }))
                        }
                        className={`relative h-7 w-12 rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          on ? 'bg-cyan-500' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                            on ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>


          <section className="rounded-3xl border border-border/70 bg-card/80 p-6 mb-8">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-sky-600" />
              API 调用统计（本地累计）
            </h2>
            <p className="text-sm text-muted-foreground mt-1">预览区每次成功调?/api/chat 后累加，便于观察用量（费用为粗略估算）?/p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { k: '调用次数', v: String(settings.stats.calls) },
                                { k: 'Token（估?', v: String(settings.stats.tokens) },
                                { k: '费用（估?', v: `¥${settings.stats.estCost.toFixed(4)}` },
              ].map((row) => (
                <div key={row.k} className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                  <div className="text-xs text-muted-foreground">{row.k}</div>
                  <div className="text-lg font-extrabold text-foreground mt-1">{row.v}</div>
                </div>
              ))}
            </div>
          </section>


          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">预览调试</h2>
            <span className="h-px flex-1 bg-border/80" />
          </div>

          <section
            className={`rounded-3xl border border-border/70 bg-card shadow-lg overflow-hidden ${
              previewExpanded ? 'fixed inset-3 z-[60] flex flex-col' : 'relative'
            }`}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <span className="font-bold truncate">智能体在线预</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearPreview}
                  className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-background/80 transition active:scale-95"
                >
                  清空对话
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewExpanded((v) => !v)}
                  className="p-2 rounded-xl border border-border/60 hover:bg-background/80 transition active:scale-95"
                  title={previewExpanded ? '退出全? : '全屏预览'}
                >
                  {previewExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="px-4 pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewTab('model')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  previewTab === 'model' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                模型助手
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('kb')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  previewTab === 'kb' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                知识库问?
              </button>
            </div>

            <div className={`px-4 py-3 space-y-3 ${previewExpanded ? 'flex-1 min-h-0 overflow-y-auto' : 'max-h-[360px] overflow-y-auto'}`}>
              {previewMsgs.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-foreground border border-border/50'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={previewEndRef} />
            </div>

            <div className="p-4 border-t border-border/60 bg-background/50">
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder={previewTab === 'kb' ? '基于知识库提问...' : '向模型助手发送消息...'}
                  value={previewInput}   // value?
                  onChange={(e) => setPreviewInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendPreview())}
                />
                <button
                  type="button"
                  disabled={previewSending}
                  onClick={sendPreview}
                  className="travel-btn-gradient px-5 shrink-0 inline-flex items-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
                >
                  {previewSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  发?
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                联网工具开关：<span className="font-medium">{settings.webTools.brave ? '搜索 ' : ''}</span>
                <span className="font-medium">{settings.webTools.news ? '新闻 ' : ''}</span>
                <span className="font-medium">{settings.webTools.weather ? '天气' : ''}</span>
                {!settings.webTools.brave && !settings.webTools.news && !settings.webTools.weather ? '（均已关闭）' : ''}
                （实际生效依赖后端工具接入）
              </p>
            </div>
          </section>


          <div className="mt-6 rounded-3xl border-2 border-dashed border-border/50 bg-background/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-primary/30 hover:bg-primary/2 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl border-2 border-dashed border-border/60 flex items-center justify-center text-2xl group-hover:border-primary/40 transition-colors">
                ?
              </div>
              <div>
                <div className="font-bold text-foreground">创建更多智能</div>
                <div className="text-sm text-muted-foreground mt-0.5">针对不同场景（文案写作、文档分析、行程规划）创建专属配置</div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline shrink-0 inline-flex items-center gap-2 hover:border-primary/50 hover:text-primary"
              onClick={() => toast('多智能体管理功能即将上线 🎉', { icon: '🚀' })}
            >
              <Sparkles className="h-4 w-4" />
              即将推出
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-between items-center text-sm text-muted-foreground">
            <Link href="/assistant" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              ?返回 AI 助手
            </Link>
            <button type="button" onClick={onSave} className="text-primary font-semibold hover:underline">
              再次保存配置
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
