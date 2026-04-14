'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // 监听 beforeinstallprompt 事件
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // 延迟显示，避免页面加载时弹窗
      setTimeout(() => setShowBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // 检查是否已经安装过
    const isInstalled = localStorage.getItem('pwa_installed')
    if (isInstalled) {
      setShowBanner(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // 显示安装提示
    deferredPrompt.prompt()
    
    // 等待用户选择
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true')
      setShowBanner(false)
    }
    
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa_installed', 'true')
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-sky-100 p-2 shrink-0">
            <Download className="h-5 w-5 text-sky-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">安装应用</h3>
            <p className="text-sm text-gray-500 mt-1">
              添加到主屏幕，随时随地访问
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            暂不
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-xl hover:from-sky-700 hover:to-indigo-700"
          >
            安装
          </button>
        </div>
      </div>
    </div>
  )
}