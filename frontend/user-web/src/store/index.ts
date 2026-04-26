/**
 * ============================================
 * Zustand 状态管理 - 全局状态存储
 * ============================================
 * 
 * 【状态管理说明】
 * - 使用 Zustand + persist 中间件实现全局状态管理
 * - 用户状态持久化到 localStorage
 * - 购物车状态仅在内存中
 * - UI状态包括主题、侧边栏、通知等
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserPreferences } from '@/types'

/** ============================================
 * 用户状态管理
 * ============================================ */
interface UserState {
  // 用户信息
  user: User | null
  // 用户偏好设置
  preferences: UserPreferences | null
  // 是否已认证
  isAuthenticated: boolean
  // 是否正在加载
  isLoading: boolean
  // 登录方法
  login: (user: User) => void
  // 登出方法
  logout: () => void
  // 更新用户资料
  updateProfile: (profile: Partial<User>) => void
  // 更新偏好设置
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  // 设置加载状态
  setLoading: (loading: boolean) => void
}

/**
 * 用户状态Store
 * 
 * 【持久化配置】
 * - 存储到 localStorage，key 为 'user-storage'
 * - 只持久化 user、preferences、isAuthenticated
 * - 页面重载时检查 Token 是否存在
 * - 无 Token 则自动登出
 */
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      preferences: null,
      isAuthenticated: false,
      isLoading: false,

      /**
       * 用户登录
       * @param user - 用户信息对象
       * @description 登录后设置用户信息，清除加载状态
       */
      login: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false })
      },

      /**
       * 用户登出
       * @description 清除用户信息，同时清除 localStorage 中的 Token
       */
      logout: () => {
        set({ user: null, preferences: null, isAuthenticated: false, isLoading: false })
        localStorage.removeItem('auth_token')
      },

      /**
       * 更新用户资料
       * @param profile - 需要更新的字段
       * @description 合并更新用户信息
       */
      updateProfile: (profile: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...profile } })
        }
      },

      /**
       * 更新用户偏好
       * @param preferences - 需要更新的偏好设置
       */
      updatePreferences: (preferences: Partial<UserPreferences>) => {
        const currentPreferences = get().preferences
        if (currentPreferences) {
          set({ preferences: { ...currentPreferences, ...preferences } })
        }
      },

      /**
       * 设置加载状态
       * @param loading - 是否加载中
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'user-storage',  // localStorage 的键名
      // 只持久化这些字段
      partialize: (state) => ({
        user: state.user,
        preferences: state.preferences,
        isAuthenticated: state.isAuthenticated,
      }),
      // 重hydration时的回调：检查Token是否有效
      onRehydrateStorage: () => (state) => {
        try {
          if (typeof window === 'undefined') return
          const authToken = window.localStorage.getItem('auth_token')
          const adminToken = window.localStorage.getItem('admin_token')
          // 如果两个Token都没有，自动登出
          if (!authToken && !adminToken) state?.logout?.()
        } catch {
          // 忽略错误
        }
      },
    }
  )
)

/** ============================================
 * 购物车状态管理
 * ============================================ */
interface CartItem {
  product_id: string       // 商品ID
  product_name: string     // 商品名称
  product_type: 'flight' | 'hotel' | 'ticket' | 'experience'  // 商品类型
  quantity: number         // 数量
  unit_price: number       // 单价
  total_price: number      // 小计
}

interface CartState {
  items: CartItem[]        // 购物车商品列表
  addItem: (item: CartItem) => void        // 添加商品
  removeItem: (productId: string) => void  // 移除商品
  updateQuantity: (productId: string, quantity: number) => void  // 更新数量
  clearCart: () => void                   // 清空购物车
  getTotal: () => number                  // 计算总价
}

/**
 * 购物车Store
 * 
 * 【功能说明】
 * - 支持添加/删除/更新商品数量
 * - 自动计算小计和总价
 * - 仅在内存中，不持久化
 */
export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  /**
   * 添加商品到购物车
   * @param item - 商品信息
   * @description 如果商品已存在则增加数量，否则添加新商品
   */
  addItem: (item) => {
    const cart = get()
    const existingItem = cart.items.find(i => i.product_id === item.product_id)

    if (existingItem) {
      // 更新已有商品数量
      const updatedItems = cart.items.map(i =>
        i.product_id === item.product_id
          ? { ...i, quantity: i.quantity + item.quantity, total_price: i.unit_price * (i.quantity + item.quantity) }
          : i
      )
      set({ items: updatedItems })
    } else {
      // 添加新商品
      const newItem = {
        ...item,
        total_price: item.unit_price * item.quantity,
      }
      set({ items: [...cart.items, newItem] })
    }
  },

  /**
   * 移除商品
   * @param productId - 商品ID
   */
  removeItem: (productId) => {
    const cart = get()
    const updatedItems = cart.items.filter(i => i.product_id !== productId)
    set({ items: updatedItems })
  },

  /**
   * 更新商品数量
   * @param productId - 商品ID
   * @param quantity - 新数量
   */
  updateQuantity: (productId, quantity) => {
    const cart = get()
    const updatedItems = cart.items.map(i =>
      i.product_id === productId
        ? { ...i, quantity, total_price: i.unit_price * quantity }
        : i
    )
    set({ items: updatedItems })
  },

  /** 清空购物车 */
  clearCart: () => {
    set({ items: [] })
  },

  /**
   * 计算购物车总价
   * @returns 总价
   */
  getTotal: () => {
    const cart = get()
    return cart.items.reduce((total, item) => total + item.total_price, 0)
  },
}))

/** ============================================
 * UI状态管理
 * ============================================ */
interface Notification {
  id: string                                    // 通知ID
  type: 'success' | 'error' | 'warning' | 'info' // 通知类型
  message: string                               // 通知内容
  timestamp: string                             // 时间戳
}

interface UIState {
  sidebarOpen: boolean                           // 侧边栏是否打开
  theme: 'light' | 'dark'                       // 主题模式
  notifications: Notification[]                   // 通知列表
  toggleSidebar: () => void                     // 切换侧边栏
  setSidebar: (open: boolean) => void           // 设置侧边栏
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void  // 添加通知
  removeNotification: (id: string) => void      // 移除通知
  clearNotifications: () => void                // 清空通知
  setTheme: (theme: 'light' | 'dark') => void  // 设置主题
}

/**
 * UI状态Store
 * 
 * 【功能说明】
 * - 管理侧边栏开关状态
 * - 管理明暗主题切换
 * - 管理全局通知列表（最多10条）
 */
export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: false,
  theme: 'light',
  notifications: [],

  /** 切换侧边栏状态 */
  toggleSidebar: () => {
    set({ sidebarOpen: !get().sidebarOpen })
  },

  /** 设置侧边栏 */
  setSidebar: (open: boolean) => {
    set({ sidebarOpen: open })
  },

  /**
   * 添加通知
   * @param notification - 通知内容（不含ID和时间戳）
   * @description 自动添加ID和时间戳，最多保留10条
   */
  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    }
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 10),
    }))
  },

  /** 移除指定通知 */
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }))
  },

  /** 清空所有通知 */
  clearNotifications: () => {
    set({ notifications: [] })
  },

  /**
   * 设置主题
   * @param theme - 主题模式
   * @description 同时更新DOM和localStorage
   */
  setTheme: (theme: 'light' | 'dark') => {
    set({ theme })
    if (typeof window !== 'undefined') {
      // 切换HTML元素的dark类
      document.documentElement.classList.toggle('dark', theme === 'dark')
      // 持久化到localStorage
      localStorage.setItem('theme', theme)
    }
  },
}))

/** ============================================
 * 初始化主题
 * ============================================ */
// 页面加载时恢复保存的主题设置
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  if (savedTheme) {
    useUIStore.getState().setTheme(savedTheme)
  } else {
    useUIStore.getState().setTheme('light')
  }
}
