export type KbFileStatus = 'processing' | 'ready' | 'failed'

export type KbFile = {
  id: string
  name: string
  size: number
  status: KbFileStatus
  uploadedAt: number
}

export type WebToolKey = 'brave' | 'news' | 'weather'

export type AiAgentSettingsState = {
  systemPrompt: string
  welcomeMessage: string
  modelId: string
  filterRules: string
  webTools: Record<WebToolKey, boolean>
  digitalHumanConfigured: boolean
  voiceCloneName: string
  stats: { calls: number; tokens: number; estCost: number }
  kbFiles: KbFile[]
}

const STORAGE_KEY = 'ai_agent_settings_v1'

export const MODEL_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'mimo-v2-flash', label: 'Xiaomi MiMo V2 Flash' },
  { id: 'mimo-v2-pro', label: 'Xiaomi MiMo V2 Pro' },
  { id: 'mimo-v2-omni', label: 'Xiaomi MiMo V2 Omni' },
  { id: 'gpt-4o', label: 'GPT-4o（需后端配置）' },
]

export const DEFAULT_SETTINGS: AiAgentSettingsState = {
  systemPrompt:
                '你是「智旅助手」的旅行顾问：语气友好、条理清晰；不确定时主动说明假设；涉及价?政策时提醒以官方为准？',
        welcomeMessage: '你好！我是你的旅行助手，可以帮你规划行程、推荐目的地与估算预算？',
  modelId: 'mimo-v2-flash',
  filterRules: '',
  webTools: { brave: true, news: true, weather: true },
  digitalHumanConfigured: false,
  voiceCloneName: '',
  stats: { calls: 0, tokens: 0, estCost: 0 },
  kbFiles: [],
}

export function loadAiAgentSettings(): AiAgentSettingsState {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const p = JSON.parse(raw) as Partial<AiAgentSettingsState>
    return {
      ...DEFAULT_SETTINGS,
      ...p,
      webTools: { ...DEFAULT_SETTINGS.webTools, ...(p.webTools || {}) },
      stats: { ...DEFAULT_SETTINGS.stats, ...(p.stats || {}) },
      kbFiles: Array.isArray(p.kbFiles) ? p.kbFiles : [],
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveAiAgentSettings(s: AiAgentSettingsState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function incrementStats(s: AiAgentSettingsState, tokensApprox: number): AiAgentSettingsState {
  return {
    ...s,
    stats: {
      calls: s.stats.calls + 1,
      tokens: s.stats.tokens + tokensApprox,
      estCost: Math.round((s.stats.estCost + tokensApprox * 0.00002) * 10000) / 10000,
    },
  }
}
