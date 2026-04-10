/** 后端直连地址（SSR 用） */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'

function apiBaseURL() {
  // SSR: direct-call backend with absolute base URL.
  if (typeof window === 'undefined') return BACKEND_URL
  // Browser: hit Next.js origin, rewrites proxy /api/* to backend.
  return window.location.origin
}

type ApiClientOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  auth?: boolean
  /** 管理员认证：?localStorage.admin_token 取值，并直连后端（绕过 Next.js rewrite?*/
  adminAuth?: boolean
  cache?: RequestCache
  signal?: AbortSignal
}

function buildUrl(pathOrUrl: string, query?: ApiClientOptions['query']) {
  // pathOrUrl: '/api/xxx' or 'https://...'
  const base = pathOrUrl.startsWith('http') ? '' : apiBaseURL()
  const url = pathOrUrl.startsWith('http') ? new URL(pathOrUrl) : new URL(pathOrUrl, base)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue
      url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

export async function apiClient<T>(pathOrUrl: string, options: ApiClientOptions = {}): Promise<T> {
  const {
    method = 'GET',
    query,
    body,
    auth = false,
    adminAuth = false,
    cache = 'no-store',
    signal,
  } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (typeof window !== 'undefined') {
    if (adminAuth) {
      const token = window.localStorage.getItem('admin_token')
      if (token) headers.Authorization = `Bearer ${token}`
    } else if (auth) {
      const token = window.localStorage.getItem('auth_token')
      if (token) headers.Authorization = `Bearer ${token}`
    }
  }

  // 管理员请求直连后端，绕过 Next.js rewrite（rewrite 会丢?Authorization 头）
  let url: string
  if (adminAuth && typeof window !== 'undefined') {
    const backendBase = BACKEND_URL
    const parsed = pathOrUrl.startsWith('http')
      ? new URL(pathOrUrl)
      : new URL(pathOrUrl, backendBase)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue
        parsed.searchParams.set(k, String(v))
      }
    }
    url = parsed.toString()
  } else {
    url = buildUrl(pathOrUrl, query)
  }

  const res = await fetch(url, {
    method,
    headers,
    cache,
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data && (data as any).error) || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

