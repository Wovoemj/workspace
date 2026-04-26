'use client'

/**
 * =====================================================
 * Markdown 渲染组件 (MarkdownRenderer)
 * =====================================================
 * 
 * 功能说明：
 * - Markdown 格式内容渲染组件
 * - 支持 GFM (GitHub Flavored Markdown) 扩展语法
 * - 代码块语法高亮
 * - 支持明暗主题切换
 * 
 * 依赖库：
 * - react-markdown: React Markdown 渲染
 * - remark-gfm: GFM 语法支持（表格、任务列表等）
 * - rehype-highlight: 代码高亮
 * - highlight.js: 代码语法高亮样式
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

/** Markdown 渲染组件属性 */
interface MarkdownRendererProps {
  content: string
  className?: string
  darkMode?: boolean
}

/**
 * Markdown 渲染组件
 * @description 富文本 Markdown 渲染组件，支持代码高亮和主题切换
 * @param props - 组件属性
 * @param props.content - Markdown 格式内容
 * @param props.className - 自定义样式
 * @param props.darkMode - 是否启用暗色模式
 */
export default function MarkdownRenderer({ content, className = '', darkMode = false }: MarkdownRendererProps) {
  const textColor = darkMode ? 'text-white' : 'text-gray-800'
  const lightTextColor = darkMode ? 'text-gray-300' : 'text-gray-700'
  const borderColor = darkMode ? 'border-gray-600' : 'border-gray-200'
  const bgColor = darkMode ? 'bg-gray-800' : 'bg-gray-100'
  const codeBgColor = darkMode ? 'bg-gray-700' : 'bg-gray-100'
  const codeTextColor = darkMode ? 'text-gray-100' : 'text-gray-800'
  
  return (
    <div className={`markdown-renderer ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 标题样式 - 添加渐变效果
          h1: ({ node, ...props }) => (
            <h1 className={`text-2xl font-bold ${textColor} mt-6 mb-4 pb-2 border-b ${borderColor}`} {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className={`text-xl font-bold ${textColor} mt-5 mb-3 flex items-center gap-2`} {...props}>
              <span className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full inline-block" />
              <span>{props.children}</span>
            </h2>
          ),
          h3: ({ node, ...props }) => (
            <h3 className={`text-lg font-semibold ${textColor} mt-4 mb-2`} {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className={`text-base font-medium ${textColor} mt-3 mb-2`} {...props} />
          ),
          // 段落间距
          p: ({ node, ...props }) => (
            <p className={`${textColor} leading-relaxed mb-4 last:mb-0`} {...props} />
          ),
          // 加粗
          strong: ({ node, ...props }) => (
            <strong className={`font-bold ${textColor}`} {...props} />
          ),
          // 斜体
          em: ({ node, ...props }) => (
            <em className={`italic ${lightTextColor}`} {...props} />
          ),
          // 列表 - 美化样式
          ul: ({ node, ...props }) => (
            <ul className={`list-disc list-inside ${lightTextColor} mb-4 space-y-2 ml-2`} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className={`list-decimal list-inside ${lightTextColor} mb-4 space-y-2 ml-2`} {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className={`${textColor} leading-relaxed marker:text-blue-500`} {...props} />
          ),
          // 代码块
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <div className="relative my-4">
                <div className={`absolute top-0 left-0 right-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-800'} ${darkMode ? 'text-gray-300' : 'text-gray-200'} text-xs px-4 py-2 rounded-t-lg flex justify-between items-center`}>
                  <span>{match[1]}</span>
                  <button
                    className="text-xs hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(String(children))
                    }}
                  >
                    复制
                  </button>
                </div>
                <pre className={`${darkMode ? 'bg-gray-900' : 'bg-gray-800'} ${darkMode ? 'text-gray-100' : 'text-gray-200'} p-4 pt-10 rounded-lg overflow-x-auto`}>
                  <code className={`hljs ${className}`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code
                className={`${codeBgColor} ${codeTextColor} px-1.5 py-0.5 rounded text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            )
          },
          // 引用块 - 美化样式
          blockquote: ({ node, ...props }) => (
            <blockquote
              className={`border-l-4 ${darkMode ? 'border-blue-400' : 'border-blue-500'} pl-4 py-3 my-4 rounded-r-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50/80'} ${lightTextColor} italic`}
              {...props}
            />
          ),
          // 链接
          a: ({ node, ...props }) => (
            <a
              className={`${darkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'} underline transition-colors`}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // 表格 - 美化样式
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl shadow-lg border border-gray-200/50">
              <table className={`min-w-full ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`} {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className={darkMode ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'} {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`} {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50/80'} transition-colors duration-150`} {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className={`px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap`}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className={`px-4 py-3 text-sm ${textColor}`} {...props} />
          ),
          // 水平线
          hr: ({ node, ...props }) => (
            <hr className={`my-6 border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}