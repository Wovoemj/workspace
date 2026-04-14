'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SWROptions {
  refreshInterval?: number
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  dedupingInterval?: number
  cacheTime?: number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

interface SWRState<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isValidating: boolean
}

type Fetcher<T> = (url: string) => Promise<T>

// 简单的内存缓存
const cache = new Map<string, { data: any; timestamp: number }>()

export function useSWR<T>(
  key: string | null,
  fetcher?: Fetcher<T>,
  options: SWROptions = {}
): SWRState<T> & { mutate: () => Promise<void> } {
  const {
    refreshInterval = 0,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    dedupingInterval = 2000,
    cacheTime = 5 * 60 * 1000, // 5分钟默认缓存
    onSuccess,
    onError,
  } = options

  const [state, setState] = useState<SWRState<T>>({
    data: null,
    error: null,
    isLoading: key !== null && !cache.has(key),
    isValidating: false,
  })

  const isMounted = useRef(true)
  const lastFetchTime = useRef(0)
  const intervalId = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    if (!key || !fetcher) return

    // 去重：如果在 dedupingInterval 内已经请求过，跳过
    const now = Date.now()
    if (now - lastFetchTime.current < dedupingInterval && state.data) {
      return
    }

    // 检查缓存
    const cached = cache.get(key)
    if (cached && now - cached.timestamp < cacheTime) {
      if (isMounted.current) {
        setState(prev => ({ ...prev, data: cached.data, isLoading: false }))
        onSuccess?.(cached.data)
      }
      return
    }

    if (isMounted.current) {
      setState(prev => ({ ...prev, isValidating: true }))
    }

    try {
      lastFetchTime.current = now
      const data = await fetcher(key)
      
      // 更新缓存
      cache.set(key, { data, timestamp: now })
      
      if (isMounted.current) {
        setState({ data, error: null, isLoading: false, isValidating: false })
        onSuccess?.(data)
      }
    } catch (error) {
      if (isMounted.current) {
        const err = error instanceof Error ? error : new Error(String(error))
        setState(prev => ({ ...prev, error: err, isLoading: false, isValidating: false }))
        onError?.(err)
      }
    }
  }, [key, fetcher, dedupingInterval, cacheTime, onSuccess, onError, state.data])

  // 初始加载
  useEffect(() => {
    isMounted.current = true
    
    if (key) {
      fetchData()
    } else {
      setState({ data: null, error: null, isLoading: false, isValidating: false })
    }

    return () => {
      isMounted.current = false
    }
  }, [key])

  // 自动刷新
  useEffect(() => {
    if (refreshInterval > 0 && key) {
      intervalId.current = setInterval(fetchData, refreshInterval)
      return () => {
        if (intervalId.current) {
          clearInterval(intervalId.current)
        }
      }
    }
  }, [key, refreshInterval, fetchData])

  // 页面重新聚焦时刷新
  useEffect(() => {
    if (!revalidateOnFocus || !key) return

    const handleFocus = () => {
      // 确保至少过去5秒才刷新
      if (Date.now() - lastFetchTime.current > 5000) {
        fetchData()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [key, revalidateOnFocus, fetchData])

  // 网络重连时刷新
  useEffect(() => {
    if (!revalidateOnReconnect || !key) return

    const handleOnline = () => fetchData()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [key, revalidateOnReconnect, fetchData])

  const mutate = useCallback(async () => {
    // 清除缓存并重新请求
    if (key) {
      cache.delete(key)
    }
    await fetchData()
  }, [key, fetchData])

  return { ...state, mutate }
}

// 默认 fetcher
export const defaultFetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  })
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  
  const data = await res.json()
  return data
}

// 带认证的 fetcher
export const authFetcher = async <T,>(url: string): Promise<T> => {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const res = await fetch(url, { headers })
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  
  const data = await res.json()
  return data
}

// 预加载函数
export function preloadSWR<T>(key: string, fetcher: Fetcher<T>): Promise<T> {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return Promise.resolve(cached.data)
  }
  
  return fetcher(key).then(data => {
    cache.set(key, { data, timestamp: Date.now() })
    return data
  })
}

// 清除缓存
export function clearSWRCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}
