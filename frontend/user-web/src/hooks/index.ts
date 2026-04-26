/**
 * ============================================
 * React Hooks - 自定义Hooks集合
 * ============================================
 * 
 * 【提供的Hooks】
 * - useAuth: 认证状态管理
 * - useDebounce: 防抖处理
 * - useLocalStorage: localStorage封装
 * - useAsync: 异步数据请求
 * - useClickOutside: 点击外部检测
 * - useIntersectionObserver: 元素可见性观察
 */

import { useState, useEffect, useRef } from 'react'
import { useUserStore } from '@/store'

/** ============================================
 * useAuth - 认证状态Hook
 * ============================================ */
/**
 * 获取用户认证状态
 * 
 * @returns 
 * - user: 当前用户对象
 * - isAuthenticated: 是否已登录
 * - login: 登录方法
 * - logout: 登出方法
 * - isLoading: 是否正在加载（包含挂载状态）
 * 
 * @example
 * const { user, isAuthenticated, logout } = useAuth()
 * if (!isAuthenticated) return <LoginPage />
 */
export function useAuth() {
  const { user, isAuthenticated, login, logout, isLoading } = useUserStore()
  // 用于防止SSR hydration问题
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 组件挂载后标记
    setMounted(true)
  }, [])

  return {
    user,
    isAuthenticated,
    login,
    logout,
    // 未挂载或正在加载时都视为loading
    isLoading: isLoading || !mounted,
  }
}

/** ============================================
 * useDebounce - 防抖Hook
 * ============================================ */
/**
 * 防抖处理 - 延迟更新值
 * 
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 * 
 * @example
 * // 搜索输入防抖，500ms后才更新
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearchTerm = useDebounce(searchTerm, 500)
 * useEffect(() => {
 *   // 这里发起搜索请求
 * }, [debouncedSearchTerm])
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 设置定时器，delay毫秒后更新值
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 清理函数：值变化时清除之前的定时器
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/** ============================================
 * useLocalStorage - localStorage Hook
 * ============================================ */
/**
 * localStorage状态管理
 * 
 * @param key - localStorage的键名
 * @param initialValue - 初始值
 * @returns [storedValue, setValue] - 存储的值和设置方法
 * 
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light')
 * setTheme('dark') // 自动保存到localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 初始值：从localStorage读取或使用默认值
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  /**
   * 设置值
   * @param value - 新值（可以是值或函数）
   */
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // 支持函数式更新
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue] as const
}

/** ============================================
 * useAsync - 异步请求Hook
 * ============================================ */
/**
 * 异步数据请求状态管理
 * 
 * @param asyncFunction - 异步函数
 * @param immediate - 是否立即执行
 * @returns 请求状态和结果
 * 
 * @example
 * const { data, status, error, execute } = useAsync(
 *   () => fetch('/api/user').then(res => res.json()),
 *   true  // 立即执行
 * )
 * 
 * // 手动触发请求
 * <button onClick={execute}>刷新</button>
 */
export function useAsync<T, E = string>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  // 请求状态：idle/pending/success/error
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  // 请求结果数据
  const [data, setData] = useState<T | null>(null)
  // 错误信息
  const [error, setError] = useState<E | null>(null)

  /**
   * 执行异步请求
   */
  const execute = async () => {
    setStatus('pending')
    setData(null)
    setError(null)

    try {
      const response = await asyncFunction()
      setData(response)
      setStatus('success')
    } catch (error) {
      setError(error as E)
      setStatus('error')
    }
  }

  // 组件挂载时立即执行
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate])

  return {
    execute,          // 手动执行函数
    status,           // 当前状态
    data,             // 响应数据
    error,            // 错误信息
    isIdle: status === 'idle',      // 空闲状态
    isPending: status === 'pending', // 请求中
    isSuccess: status === 'success', // 成功
    isError: status === 'error',     // 失败
  }
}

/** ============================================
 * useClickOutside - 点击外部检测
 * ============================================ */
/**
 * 检测点击是否在元素外部
 * 
 * @param handler - 点击外部时执行的回调
 * @returns Ref对象，需要绑定到目标元素
 * 
 * @example
 * const ref = useClickOutside(() => setIsOpen(false))
 * return <div ref={ref}>点击外部关闭</div>
 */
export function useClickOutside<T extends HTMLElement>(
  handler: () => void
): React.RefObject<T> {
  const ref = useRef<T>(null)

  useEffect(() => {
    /**
     * 鼠标点击事件处理
     */
    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击目标是否在ref元素内部
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler()
      }
    }

    // 添加事件监听
    document.addEventListener('mousedown', handleClickOutside)
    // 清理事件监听
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handler])

  return ref
}

/** ============================================
 * useIntersectionObserver - 元素可见性观察
 * ============================================ */
/**
 * 观察元素是否进入视口
 * 
 * @param elementRef - 目标元素的Ref
 * @param options - IntersectionObserver配置
 * @returns ObserverEntry对象
 * 
 * @example
 * // 懒加载图片
 * const ref = useRef<HTMLImageElement>(null)
 * const entry = useIntersectionObserver(ref)
 * 
 * return <img ref={ref} src={entry?.isIntersecting ? src : placeholder} />
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // 创建观察者
    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry)
    }, options)

    // 开始观察
    observer.observe(element)
    
    // 组件卸载时断开观察
    return () => observer.disconnect()
  }, [elementRef, options])

  return entry
}

/** ============================================
 * 重新导出SWR相关Hook
 * ============================================ */
// 提供数据获取和缓存功能
export { useSWR, defaultFetcher, authFetcher, preloadSWR, clearSWRCache } from './useSWR'
