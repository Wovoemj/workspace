import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserPreferences } from '@/types'

interface UserState {
  user: User | null
  preferences: UserPreferences | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  updateProfile: (profile: Partial<User>) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  setLoading: (loading: boolean) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      preferences: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false })
      },

      logout: () => {
        set({ user: null, preferences: null, isAuthenticated: false, isLoading: false })
        localStorage.removeItem('auth_token')
      },

      updateProfile: (profile: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...profile } })
        }
      },

      updatePreferences: (preferences: Partial<UserPreferences>) => {
        const currentPreferences = get().preferences
        if (currentPreferences) {
          set({ preferences: { ...currentPreferences, ...preferences } })
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        preferences: state.preferences,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Token missing => don't keep a stale "logged in" UI state.
        try {
          if (typeof window === 'undefined') return
          const token = window.localStorage.getItem('auth_token')
          if (!token) state?.logout?.()
        } catch {
          // ignore
        }
      },
    }
  )
)

interface CartState {
  items: Array<{
    product_id: string
    product_name: string
    product_type: 'flight' | 'hotel' | 'ticket' | 'experience'
    quantity: number
    unit_price: number
    total_price: number
  }>
  addItem: (item: any) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    const cart = get()
    const existingItem = cart.items.find(i => i.product_id === item.product_id)

    if (existingItem) {
      const updatedItems = cart.items.map(i =>
        i.product_id === item.product_id
          ? { ...i, quantity: i.quantity + item.quantity, total_price: i.unit_price * (i.quantity + item.quantity) }
          : i
      )
      set({ items: updatedItems })
    } else {
      const newItem = {
        ...item,
        total_price: item.unit_price * item.quantity,
      }
      set({ items: [...cart.items, newItem] })
    }
  },

  removeItem: (productId) => {
    const cart = get()
    const updatedItems = cart.items.filter(i => i.product_id !== productId)
    set({ items: updatedItems })
  },

  updateQuantity: (productId, quantity) => {
    const cart = get()
    const updatedItems = cart.items.map(i =>
      i.product_id === productId
        ? { ...i, quantity, total_price: i.unit_price * quantity }
        : i
    )
    set({ items: updatedItems })
  },

  clearCart: () => {
    set({ items: [] })
  },

  getTotal: () => {
    const cart = get()
    return cart.items.reduce((total, item) => total + item.total_price, 0)
  },
}))

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    timestamp: string
  }>
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  addNotification: (notification: any) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: false,
  theme: 'light',
  notifications: [],

  toggleSidebar: () => {
    set({ sidebarOpen: !get().sidebarOpen })
  },

  setSidebar: (open: boolean) => {
    set({ sidebarOpen: open })
  },

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

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }))
  },

  clearNotifications: () => {
    set({ notifications: [] })
  },

  setTheme: (theme: 'light' | 'dark') => {
    set({ theme })
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      localStorage.setItem('theme', theme)
    }
  },
}))

// 初始化主?
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  if (savedTheme) {
    useUIStore.getState().setTheme(savedTheme)
  } else {
    useUIStore.getState().setTheme('light')
  }
}
