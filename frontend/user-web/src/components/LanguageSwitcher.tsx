'use client'

/**
 * =====================================================
 * 语言切换组件 (LanguageSwitcher)
 * =====================================================
 * 
 * 功能说明：
 * - 多语言切换组件
 * - 支持语言：中文、英文、日文
 * - 通过路由前缀切换语言
 * - 支持国际化 (i18n) 集成
 * 
 * 支持语言：
 * - zh-CN: 中文（默认）
 * - en: English
 * - ja: 日本語
 */

import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Globe } from 'lucide-react'

/** 支持的语言列表 */
const locales = [
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
]

/**
 * 语言切换组件
 * @description 下拉式语言切换器，支持中英文日文
 */
export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  
  // 默认使用 zh-CN
  const locale = 'zh-CN'
  const currentLocale = locales.find(l => l.code === locale) || locales[0]

  const onSelectChange = (nextLocale: string) => {
    startTransition(() => {
      // 替换路由中的语言前缀
      const segments = pathname.split('/')
      if (segments[1] && locales.some(l => l.code === segments[1])) {
        segments[1] = nextLocale
      } else {
        segments.splice(1, 0, nextLocale)
      }
      router.push(segments.join('/'))
    })
  }

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        disabled={isPending}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLocale.flag} {currentLocale.name}</span>
      </button>
      
      {/* 下拉菜单 */}
      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {locales.map((loc) => (
          <button
            key={loc.code}
            onClick={() => onSelectChange(loc.code)}
            disabled={loc.code === locale}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
              loc.code === locale ? 'text-sky-600 font-medium' : 'text-gray-700'
            }`}
          >
            {loc.flag} {loc.name}
          </button>
        ))}
      </div>
    </div>
  )
}
