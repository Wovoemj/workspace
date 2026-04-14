'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Copy, X, QrCode, Wechat, MessageCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ShareButtonProps {
  title: string
  description?: string
  url?: string
  image?: string
  type?: 'destination' | 'trip' | 'product'
}

export function ShareButton({ 
  title, 
  description = '智能旅行助手', 
  url,
  image,
  type = 'destination'
}: ShareButtonProps) {
  const [showPanel, setShowPanel] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
  const shareTitle = `${title} — 智能旅行助手`

  // 点击外部关闭面板
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false)
      }
    }
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPanel])

  // 移动端原生分享
  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: description,
          url: shareUrl,
        })
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          toast.error('分享失败')
        }
      }
    }
  }

  // 复制链接
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('链接已复制')
      setShowPanel(false)
    } catch {
      toast.error('复制失败')
    }
  }

  // 微信分享（显示二维码）
  function handleWechatShare() {
    setShowQR(true)
  }

  // 微博分享
  function handleWeiboShare() {
    const wbUrl = encodeURIComponent(shareUrl)
    const wbTitle = encodeURIComponent(title)
    window.open(`https://service.weibo.com/share/share.php?url=${wbUrl}&title=${wbTitle}`, '_blank')
  }

  // 生成海报（简化版）
  function handleGeneratePoster() {
    toast.success('海报生成功能开发中，敬请期待')
  }

  // 生成二维码 SVG
  function generateQRCode(text: string): string {
    // 简化的二维码生成（实际项目中可使用 qrcode.react 等库）
    const size = 120
    const cells = 21
    const cellSize = size / cells
    
    // 简单的占位符二维码图案
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
    svg += `<rect width="${size}" height="${size}" fill="white"/>`
    
    // 三个定位角
    const drawFinder = (x: number, y: number) => {
      svg += `<rect x="${x}" y="${y}" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>`
      svg += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>`
      svg += `<rect x="${x + cellSize * 2}" y="${y + cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>`
    }
    drawFinder(0, 0)
    drawFinder(size - cellSize * 7, 0)
    drawFinder(0, size - cellSize * 7)
    
    // 中间数据区（简化）
    svg += `<rect x="${cellSize * 8}" y="${cellSize * 8}" width="${cellSize * 5}" height="${cellSize * 5}" fill="black"/>`
    
    svg += `</svg>`
    return svg
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-medium hover:from-sky-600 hover:to-indigo-600 transition-all shadow-md"
      >
        <Share2 className="h-4 w-4" />
        分享
      </button>

      {showPanel && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-gray-100 bg-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <span className="font-semibold text-gray-800">分享到</span>
            <button onClick={() => setShowPanel(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          
          <div className="p-4 grid grid-cols-4 gap-3">
            {/* 复制链接 - 始终显示 */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Copy className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xs text-gray-600">复制链接</span>
            </button>

            {/* 微信 - 显示二维码 */}
            <button
              onClick={handleWechatShare}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Wechat className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs text-gray-600">微信</span>
            </button>

            {/* 微博 */}
            <button
              onClick={handleWeiboShare}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-xs text-gray-600">微博</span>
            </button>

            {/* 生成海报 */}
            <button
              onClick={handleGeneratePoster}
              className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <QrCode className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-600">海报</span>
            </button>
          </div>

          {/* 移动端原生分享 */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <div className="p-4 pt-0">
              <button
                onClick={handleNativeShare}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
              >
                更多分享方式
              </button>
            </div>
          )}

          {/* URL 预览 */}
          <div className="px-4 pb-4">
            <div className="p-3 rounded-xl bg-gray-50 text-xs text-gray-500 truncate">
              {shareUrl}
            </div>
          </div>
        </div>
      )}

      {/* 微信二维码弹窗 */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">微信扫码分享</h3>
              <button onClick={() => setShowQR(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex justify-center">
              <div 
                className="p-2 bg-white rounded-lg"
                dangerouslySetInnerHTML={{ __html: generateQRCode(shareUrl) }}
              />
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              打开微信扫一扫，分享「{title}」
            </p>
          </div>
        </div>
      )}
    </div>
  )
}