import axios from 'axios'

/**
 * ?Flask 后端 `app.py` 对齐的统一 API 客户端?
 * 浏览器内使用相对路径 `/api/*`，由 `next.config.js` ?rewrites 代理?`NEXT_PUBLIC_API_URL`?
 * SSR 时使用绝?baseURL 直连后端?
 */
function apiBaseURL() {
  if (typeof window !== 'undefined') return ''
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'
}

export const api = axios.create({
  baseURL: apiBaseURL(),
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/** 用户 */
export const userApi = {
  register: (body: { phone?: string; email?: string; password: string; nickname?: string }) =>
    api.post('/api/users/register', body),
  login: (body: { phone?: string; email?: string; password: string }) => api.post('/api/users/login', body),
  me: () => api.get('/api/users/me'),
  updateProfile: (body: Record<string, unknown>) => api.put('/api/users/profile', body),
  getPreferences: () => api.get('/api/users/preferences'),
  updatePreferences: (body: Record<string, unknown>) => api.put('/api/users/preferences', body),
}

/** 景点与搜?*/
export const destinationApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get('/api/destinations', { params }),
  get: (id: number) => api.get(`/api/destinations/${id}`),
  search: (params: { q?: string; city?: string; limit?: number }) => api.get('/api/search', { params }),
}

/** 收藏 */
export const favoritesApi = {
  list: () => api.get('/api/favorites'),
  toggle: (destination_id: number) => api.post('/api/favorites', { destination_id }),
  remove: (destinationId: number) => api.delete(`/api/favorites/${destinationId}`),
}

/** 行程（登录用户优先使?/api/me/trips?*/
export const tripApi = {
  mine: () => api.get('/api/me/trips'),
  createMine: (body: Record<string, unknown>) => api.post('/api/me/trips', body),
  get: (id: number) => api.get(`/api/trips/${id}`),
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/trips/${id}`, body),
  remove: (id: number) => api.delete(`/api/trips/${id}`),
  items: (id: number) => api.get(`/api/trips/${id}/items`),
  generateItinerary: (body: Record<string, unknown>) => api.post('/api/itinerary/generate', body),
}

/** AI 对话（同一后端，非独立 8081 服务?*/
export const chatApi = {
  complete: (body: {
    messages: { role: string; content: string }[]
    temperature?: number
    max_tokens?: number
  }) => api.post('/api/chat', body),
}

/** 订单、推荐、健康检?*/
export const miscApi = {
  orders: () => api.get('/api/orders'),
  recommendations: (params?: { limit?: number; city?: string }) => api.get('/api/recommendations', { params }),
  health: () => api.get('/api/health'),
}

export { api as axiosInstance }
