export function formatPriceStart(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '价格待补充'
  if (n === 0) return '免费'
  if (n > 0) return `¥${Math.round(n).toLocaleString()}起`
  return '价格待补充'
}

export function shouldShowRating(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0
}

export function formatRating(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(1)
}

export function formatCountOrFallback(count: number, fallback: string = '服务中'): string {
  return count > 0 ? `${count.toLocaleString()}+` : fallback
}

