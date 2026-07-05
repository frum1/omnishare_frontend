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

/** Transfer rate as a human-readable string, e.g. "12.4 MB/s". */
export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '—'
  return `${formatBytes(bytesPerSecond)}/s`
}

/**
 * A duration in seconds as a compact ETA: "45s", "3m 20s", "1h 5m". Returns
 * "—" when the estimate is not yet meaningful (unknown or non-finite).
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const total = Math.round(seconds)
  if (total < 60) return `${total}s`

  const minutes = Math.floor(total / 60)
  const secs = total % 60
  if (minutes < 60) return secs ? `${minutes}m ${secs}s` : `${minutes}m`

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Convert an API direct-download URL (`{base}/f/{id}`) into the frontend share
 * page URL (`{base}/s/{id}`). Keeps the API's public/local base host, but points
 * at the nice landing page instead of the raw file. Falls back to the input.
 */
export function toSharePage(directUrl: string): string {
  return directUrl.replace(/\/f\/([^/?#]+)/, '/s/$1')
}

/** Download counter as `used / limit`, with ∞ for an unlimited (null) cap. */
export function formatDownloads(count: number, max: number | null): string {
  return `${count} / ${max ?? '∞'}`
}

/**
 * Parse an API timestamp to epoch ms. The backend emits naive UTC ISO strings
 * (no timezone), which JS would otherwise read as *local* time — so we append
 * 'Z' when the string carries no zone designator to force UTC.
 */
export function parseApiDate(value: string): number {
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)
  return new Date(hasZone ? value : `${value}Z`).getTime()
}

/**
 * Time left until expiry as a compact label ("2 d", "5 h", "30 min"), or
 * "Never" when there is no TTL and "Expired" once the moment has passed.
 */
export function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Never'
  const ms = parseApiDate(expiresAt) - Date.now()
  if (ms <= 0) return 'Expired'

  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}
