/**
 * =====================================================
 * 格式化显示工具函数
 * =====================================================
 * 
 * 本模块提供用于界面显示的格式化函数：
 * - formatPriceStart: 门票/价格显示格式化
 * - shouldShowRating: 评分是否显示判断
 * - formatRating: 评分数字格式化
 * - formatCountOrFallback: 数量显示格式化
 */

/**
 * 格式化价格/门票起价显示
 * @param value - 价格数值
 * @returns 格式化后的价格文本，如 "¥299起"、"免费"、"价格待补充"
 */
export function formatPriceStart(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '价格待补充'
  if (n === 0) return '免费'
  if (n > 0) return `¥${Math.round(n).toLocaleString()}起`
  return '价格待补充'
}

/**
 * 判断评分是否应该显示
 * @param value - 评分数值
 * @returns 是否应该显示评分
 */
export function shouldShowRating(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0
}

/**
 * 格式化评分为一位小数
 * @param value - 评分数值
 * @returns 格式化后的评分，如 "4.5"
 */
export function formatRating(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(1)
}

/**
 * 格式化数量显示，超过0时显示带+号
 * @param count - 数量
 * @param fallback - 数量为0时的显示文本
 * @returns 格式化后的数量文本
 */
export function formatCountOrFallback(count: number, fallback: string = '服务中'): string {
  return count > 0 ? `${count.toLocaleString()}+` : fallback
}

