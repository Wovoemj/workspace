/**
 * =====================================================
 * 目的地标签推断工具
 * =====================================================
 * 
 * 功能说明：
 * - 当目的地没有预设 tags 字段时，从名称和描述自动推断标签
 * - 使用正则表达式匹配关键词
 * - 每个目的地最多返回2个标签
 * 
 * 标签类型：
 * - 🏖️海滨: 海滨/沙滩相关
 * - 🏛️历史: 历史/文化/博物馆相关
 * - 🗼浪漫: 浪漫/夜景相关
 * - 🌿自然: 自然风光相关
 * - 👨‍👩‍👧亲子: 亲子/乐园相关
 * - ♨️度假: 温泉/度假相关
 * - ✈️精选: 默认标签
 */

/** 标签推断规则列表 */
const RULES: Array<{ re: RegExp; label: string }> = [
  { re: /海|滨|沙滩|海岛|青岛|三亚|滨海|鼓浪屿|北海|威海|大连/, label: '🏖?海滨' },
  { re: /历史|古城|故宫|博物馆|遗址|陵|寺|庙|文化|世界遗产|皇家/, label: '🏛?历史' },
  { re: /浪漫|夜景|灯光|情侣|外滩|维多利亚|河畔/, label: '🗼 浪漫' },
  { re: /公园|湖|山|自然|风光|森林|湿地|草原|峡谷|瀑布/, label: '🌿 自然' },
  { re: /亲子|乐园|动物园|海洋馆|主题/, label: '👨‍👩‍?亲子' },
  { re: /温泉|滑雪|度假|休闲/, label: '♨️ 度假' },
]

/**
 * 从名称和描述推断目的地标签
 * @param name - 目的地名称
 * @param description - 目的地描述（可选）
 * @returns 推断出的标签列表（最多2个）
 */
export function deriveDestinationTags(name: string, description?: string): string[] {
  const text = `${name || ''} ${description || ''}`
  const out: string[] = []
  const seen = new Set<string>()
  for (const { re, label } of RULES) {
    if (out.length >= 2) break
    if (re.test(text) && !seen.has(label)) {
      seen.add(label)
      out.push(label)
    }
  }
  if (out.length === 0 && text.trim()) {
    out.push('✈️ 精选')
  }
  return out.slice(0, 2)
}
