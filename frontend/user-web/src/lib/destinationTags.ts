/** 无后?tags 字段时，从名?描述推断 1? 个展示标?*/

const RULES: Array<{ re: RegExp; label: string }> = [
  { re: /海|滨|沙滩|海岛|青岛|三亚|滨海|鼓浪屿|北海|威海|大连/, label: '🏖?海滨' },
  { re: /历史|古城|故宫|博物馆|遗址|陵|寺|庙|文化|世界遗产|皇家/, label: '🏛?历史' },
  { re: /浪漫|夜景|灯光|情侣|外滩|维多利亚|河畔/, label: '🗼 浪漫' },
  { re: /公园|湖|山|自然|风光|森林|湿地|草原|峡谷|瀑布/, label: '🌿 自然' },
  { re: /亲子|乐园|动物园|海洋馆|主题/, label: '👨‍👩‍?亲子' },
  { re: /温泉|滑雪|度假|休闲/, label: '♨️ 度假' },
]

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
