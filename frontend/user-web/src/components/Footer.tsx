'use client'

import Link from 'next/link'
import { MapPin, Phone, Mail, Heart, MessageCircle, Share2, Music } from 'lucide-react'

export function Footer() {
  const startYear = 2025
  const currentYear = new Date().getFullYear()
  const yearText = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`

  const footerLinks = {
    destinations: [
      { name: '热门目的地', href: '/destinations/popular' },
      { name: '国内游', href: '/destinations/domestic' },
      { name: '出境游', href: '/destinations/international' },
      { name: '周边游', href: '/destinations/local' },
    ],
    services: [
      { name: '智能行程规划', href: '/services/itinerary' },
      { name: '私人定制', href: '/services/custom' },
      { name: '旅游保险', href: '/services/insurance' },
      { name: '签证办理', href: '/services/visa' },
    ],
    support: [
      { name: '帮助中心', href: '/help' },
      { name: '客服热线', href: '/contact' },
      { name: '常见问题', href: '/help/faq' },
      { name: '意见反馈', href: '/feedback' },
    ],
    company: [
      { name: '关于我们', href: '/about' },
      { name: '加入我们', href: '/careers' },
      { name: '合作伙伴', href: '/partners' },
      { name: '新闻资讯', href: '/news' },
    ],
  }

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">

          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">智能旅游助手</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-sm">
              AI驱动的智能旅游平台，为您提供个性化行程规划、智能推荐和24/7实时助手服务，让每一次旅行都成为美好回忆。
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-gray-300">
                <Phone className="h-4 w-4" />
                <span className="text-sm">400-888-9999</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail className="h-4 w-4" />
                <span className="text-sm">service@travelai.com</span>
              </div>
            </div>
          </div>


          <div>
            <h3 className="text-lg font-semibold mb-4">热门目的地</h3>
            <ul className="space-y-2">
              {footerLinks.destinations.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>


          <div>
            <h3 className="text-lg font-semibold mb-4">服务项目</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>


          <div>
            <h3 className="text-lg font-semibold mb-4">客户支持</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>


          <div>
            <h3 className="text-lg font-semibold mb-4">关于我们</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>


        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <div className="flex items-center space-x-2 text-gray-300">
                <span className="text-sm">© {yearText} 智能旅游助手</span>
                <span>·</span>
                <Link href="/privacy" className="hover:text-white transition-colors text-sm">
                  隐私政策
                </Link>
                <span>·</span>
                <Link href="/terms" className="hover:text-white transition-colors text-sm">
                  服务条款
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">关注我们</span>
              <div className="flex space-x-3">
                <a
                  href="#"
                  aria-label="微信"
                  className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  aria-label="抖音"
                  className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
                >
                  <Music className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  aria-label="微博"
                  className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-400 text-sm">
            Made with <Heart className="h-3 w-3 text-red-500 inline mx-1" /> by Travel Assistant
          </div>
        </div>
      </div>
    </footer>
  )
}
