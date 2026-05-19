/**
 * 全局 fetch 拦截器
 * 为所有浏览器端 fetch 请求自动添加 ngrok-skip-browser-warning header
 * 解决 ngrok 免费版拦截浏览器请求显示警告页的问题
 */
'use client'

import { useEffect } from 'react'

export function FetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      // 确保 headers 存在
      const headers = new Headers(init?.headers || {})
      headers.set('ngrok-skip-browser-warning', 'true')

      return originalFetch.call(window, input, {
        ...init,
        headers,
      })
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
