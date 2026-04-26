/**
 * =====================================================
 * Markdown 渲染测试模块 - MarkdownRenderer 组件测试
 * =====================================================
 * 
 * 【功能列表】
 * - MarkdownRenderer 组件功能测试
 * - 支持标题渲染（H1-H6）
 * - 支持文本格式（加粗、斜体、删除线）
 * - 支持有序/无序列表
 * - 支持代码块高亮
 * - 支持表格渲染
 * - 支持链接与图片
 * 
 * 【组件依赖】
 * - MarkdownRenderer: Markdown 渲染组件
 * 
 * 【测试内容】
 * - 静态测试 Markdown 字符串
 */
'use client'

import { useState } from 'react'
import MarkdownRenderer from '@/components/MarkdownRenderer'

const testMarkdown = `# Markdown 渲染功能测试

## 支持的功能

### 1. 标题
# H1 标题
## H2 标题
### H3 标题
#### H4 标题

### 2. 文本格式
- **加粗文本**
- *斜体文本*
- ***加粗斜体文本***
- ~~删除线文本~~

### 3. 列表
无序列表：
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2
- 项目 3

有序列表：
1. 第一项
2. 第二项
   1. 子项 2.1
   2. 子项 2.2
3. 第三项

### 4. 代码块
行内代码：\`const x = 10\`

代码块：
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Hello, \${name}!\`;
}
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)
\`\`\`

### 5. 引用
> 这是引用文本
> 可以有多行
> 
> — 引用来源

### 6. 表格
| 姓名 | 年龄 | 城市 |
|------|------|------|
| 张三 | 25   | 北京 |
| 李四 | 30   | 上海 |
| 王五 | 28   | 广州 |

### 7. 链接和图片
[百度](https://www.baidu.com)

### 8. 水平线
---

## 段落间距测试

这是第一个段落。Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

这是第二个段落。Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

这是第三个段落。Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`

export default function TestMarkdownPage() {
  const [darkMode, setDarkMode] = useState(false)
  const [content, setContent] = useState(testMarkdown)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Markdown 渲染功能测试</h1>
        
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 border'}`}
          >
            {darkMode ? '深色模式' : '浅色模式'}
          </button>
          <div className="text-sm text-gray-600">
            模拟用户消息（深色背景）和助手消息（浅色背景）
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 用户消息（深色背景） */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">用户消息（深色背景）</h2>
            <div className="rounded-3xl rounded-br-sm bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 p-6 shadow-lg">
              <MarkdownRenderer content={content} darkMode={true} />
            </div>
          </div>

          {/* 助手消息（浅色背景） */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">助手消息（浅色背景）</h2>
            <div className="rounded-3xl rounded-bl-sm border border-gray-100 bg-white p-6 shadow-sm">
              <MarkdownRenderer content={content} darkMode={false} />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">编辑测试内容</h2>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder="输入 Markdown 内容进行测试..."
          />
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">功能说明</h3>
          <ul className="list-disc list-inside text-blue-700 space-y-1">
            <li>✅ 支持标题（H1-H4）</li>
            <li>✅ 支持加粗、斜体、删除线</li>
            <li>✅ 支持无序列表和有序列表</li>
            <li>✅ 支持行内代码和代码块（带语法高亮）</li>
            <li>✅ 支持引用块</li>
            <li>✅ 支持表格</li>
            <li>✅ 支持链接</li>
            <li>✅ 支持水平线</li>
            <li>✅ 支持段落间距</li>
            <li>✅ 支持深色/浅色模式切换</li>
          </ul>
        </div>
      </div>
    </div>
  )
}