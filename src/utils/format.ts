/**
 * Human-readable file size. Picks the largest unit under which the value is
 * >= 1: bytes → KB → MB → GB (binary, 1024-based), matching the reference UI
 * (e.g. "784.8 KB", "1.5 MB"). Whole numbers drop the decimal.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text} ${units[unit]}`
}

/**
 * Convert an API direct-download URL (`{base}/f/{id}`) into the frontend share
 * page URL (`{base}/s/{id}`). Keeps the API's public/local base host, but points
 * at the nice landing page instead of the raw file. Falls back to the input.
 */
export function toSharePage(directUrl: string): string {
  return directUrl.replace(/\/f\/([^/?#]+)/, '/s/$1')
}
