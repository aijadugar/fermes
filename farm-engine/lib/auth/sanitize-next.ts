export function sanitizeNext(next: string | null | undefined): string {
  if (!next) return '/'
  if (!next.startsWith('/')) return '/'
  if (next.startsWith('//')) return '/'
  if (next.includes('\\')) return '/'
  return next
}