export function isValidEmail(s: string) {
  if (!s || typeof s !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}
