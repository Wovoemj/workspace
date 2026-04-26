/**
 * ============================================
 * 智能旅游助手 - 统一API客户端
 * ============================================
 * 
 * 【功能说明】
 * - 封装所有与后端 Flask API 的交互
 * - 自动处理 JWT Token 认证
 * - 统一错误处理（401跳转登录页）
 * - 支持浏览器端和服务端（SSR）调用
 * 
 * 【调用约定】
 * - 浏览器环境：使用相对路径 `/api/*`，由 next.config.js 代理到后端
 * - SSR环境：使用绝对路径，直连后端 http://127.0.0.1:5001
 * 
 * 【API模块】
 * - userApi: 用户注册/登录/个人信息
 * - destinationApi: 景点列表/详情/搜索
 * - favoritesApi: 收藏景点
 * - tripApi: 行程管理
 * - chatApi: AI对话
 * - couponApi: 优惠券
 * - miscApi: 订单/推荐/健康检查
 */

import axios from 'axios';

/**
 * 获取API基础URL
 * @description 浏览器环境返回空字符串（使用相对路径），SSR环境返回后端地址
 */
function apiBaseURL() {
  // 浏览器环境：使用相对路径
  if (typeof window !== 'undefined') return ''
  // SSR环境：直连后端
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'
}

/**
 * 创建axios实例
 * @description 配置超时时间和默认请求头
 */
export const api = axios.create({
  baseURL: apiBaseURL(),
  timeout: 20000,  // 请求超时时间：20秒
  headers: { 'Content-Type': 'application/json' },  // 默认发送JSON格式
})

/**
 * 请求拦截器
 * @description 自动为所有请求添加JWT Token到Authorization头
 */
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // 从localStorage获取Token
    const token = localStorage.getItem('auth_token')
    if (token) {
      // 添加到Authorization请求头，格式：Bearer <token>
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

/**
 * 响应拦截器
 * @description 统一处理错误，401时跳转登录页
 */
api.interceptors.response.use(
  // 成功响应：直接返回data
  (res) => res.data,
  // 错误处理
  (error) => {
    // 401错误：清除Token，跳转登录页
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/** ============================================
 * 用户相关API
 * ============================================ */
export const userApi = {
  /**
   * 用户注册
   * @param body - 注册信息（手机号/邮箱/密码/昵称）
   * @returns { success, token, user }
   */
  register: (body: { phone?: string; email?: string; password: string; nickname?: string }) =>
    api.post('/api/users/register', body),
  
  /**
   * 用户登录
   * @param body - 登录凭据（手机号/邮箱/用户名 + 密码）
   * @returns { success, token, user }
   */
  login: (body: { phone?: string; email?: string; password: string }) => api.post('/api/users/login', body),
  
  /**
   * 获取当前用户信息
   * @requires Bearer Token
   */
  me: () => api.get('/api/users/me'),
  
  /**
   * 更新用户资料
   * @requires Bearer Token
   */
  updateProfile: (body: Record<string, unknown>) => api.put('/api/users/profile', body),
  
  /**
   * 获取用户偏好设置
   */
  getPreferences: () => api.get('/api/users/preferences'),
  
  /**
   * 更新用户偏好设置
   */
  updatePreferences: (body: Record<string, unknown>) => api.put('/api/users/preferences', body),
}

/** ============================================
 * 景点相关API
 * ============================================ */
export const destinationApi = {
  /**
   * 获取景点列表
   * @param params - 查询参数（分页page/per_page、城市city、省份province、评分min_rating、价格max_price、排序sort）
   * @returns { success, destinations[], total, pages }
   * @缓存：5分钟（由后端Redis缓存）
   */
  list: (params?: Record<string, string | number | undefined>) => api.get('/api/destinations', { params }),
  
  /**
   * 获取景点详情
   * @param id - 景点ID
   * @returns { success, destination }
   * @缓存：10分钟
   */
  get: (id: number) => api.get(`/api/destinations/${id}`),
  
  /**
   * 搜索景点
   * @param params - 搜索参数（关键词q、城市city、数量限制limit）
   */
  search: (params: { q?: string; city?: string; limit?: number }) => api.get('/api/search', { params }),
}

/** ============================================
 * 收藏相关API
 * ============================================ */
export const favoritesApi = {
  /**
   * 获取收藏列表
   * @requires Bearer Token
   */
  list: () => api.get('/api/favorites'),
  
  /**
   * 切换收藏状态（添加收藏）
   * @param destination_id - 景点ID
   * @requires Bearer Token
   */
  toggle: (destination_id: number) => api.post('/api/favorites', { destination_id }),
  
  /**
   * 取消收藏
   * @param destinationId - 收藏记录ID
   * @requires Bearer Token
   */
  remove: (destinationId: number) => api.delete(`/api/favorites/${destinationId}`),
}

/** ============================================
 * 行程相关API
 * ============================================ */
export const tripApi = {
  /** 获取我的行程列表（需登录） */
  mine: () => api.get('/api/me/trips'),
  
  /** 创建行程 */
  createMine: (body: Record<string, unknown>) => api.post('/api/me/trips', body),
  
  /** 获取行程详情 */
  get: (id: number) => api.get(`/api/trips/${id}`),
  
  /** 更新行程 */
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/trips/${id}`, body),
  
  /** 删除行程 */
  remove: (id: number) => api.delete(`/api/trips/${id}`),
  
  /** 获取行程景点列表 */
  items: (id: number) => api.get(`/api/trips/${id}/items`),
  
  /**
   * AI生成行程规划
   * @param body - { destination: 目的地, days: 天数, budget_hint: 预算提示 }
   * @returns { success, trip, ai_plan }
   * @限流：每分钟10次
   */
  generateItinerary: (body: Record<string, unknown>) => api.post('/api/itinerary/generate', body),
}

/** ============================================
 * AI对话API
 * ============================================ */
export const chatApi = {
  /**
   * 发送对话消息
   * @param body - messages数组格式：[{ role: 'user'/'assistant', content: '消息内容' }]
   * @param temperature - 温度参数，控制创造性（0-1）
   * @param max_tokens - 最大token数
   * @returns { success, reply, timestamp }
   * @限流：每分钟20次
   */
  complete: (body: {
    messages: { role: string; content: string }[]
    temperature?: number
    max_tokens?: number
  }) => api.post('/api/chat', body),
}

/** ============================================
 * 其他API（订单/推荐/健康检查）
 * ============================================ */
export const miscApi = {
  /** 获取订单列表（需登录） */
  orders: () => api.get('/api/orders'),
  
  /**
   * 获取推荐景点
   * @param limit - 返回数量
   * @param city - 推荐城市
   */
  recommendations: (params?: { limit?: number; city?: string }) => api.get('/api/recommendations', { params }),
  
  /**
   * 健康检查
   * @returns { success, database, redis, timestamp }
   */
  health: () => api.get('/api/health'),
}

/** ============================================
 * 优惠券API
 * ============================================ */
export const couponApi = {
  /** 获取可领取的优惠券列表 */
  available: () => api.get('/api/coupons/available'),
  
  /** 领取优惠券（通过优惠券ID） */
  claim: (couponId: number) => api.post('/api/coupons/claim', { coupon_id: couponId }),
  
  /** 领取优惠券（通过券码兑换） */
  claimByCode: (code: string) => api.post('/api/coupons/claim', { code }),
  
  /**
   * 获取我的优惠券
   * @param status - 筛选状态：all（全部）/ unused（未使用）/ used（已使用）
   */
  my: (status?: 'all' | 'unused' | 'used') => api.get('/api/coupons/my', { params: { status } }),
  
  /**
   * 使用优惠券验证（计算折扣金额）
   * @param couponId - 优惠券ID
   * @param orderAmount - 订单金额
   * @returns { success, original_amount, discount, final_amount }
   */
  apply: (couponId: number, orderAmount: number) => 
    api.post('/api/coupons/apply', { coupon_id: couponId, order_amount: orderAmount }),
}

/** 导出axios实例供其他模块直接使用 */
export { api as axiosInstance }
