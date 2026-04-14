export function isValidEmail(s: string) {
  if (!s || typeof s !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

// 验证手机号（中国大陆手机号）
export function isValidPhone(s: string) {
  if (!s || typeof s !== 'string') return false
  // 支持格式：13812345678, 138-1234-5678, +86 13812345678
  return /^1[3-9]\d{9}$/.test(s.trim().replace(/[\s\-]/g, ''))
}
