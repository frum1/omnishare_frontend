// Core HTTP layer: base URL, auth token injection, typed error handling.

/**
 * Base URL of the OmniShare backend. Empty by default: requests go to the same
 * origin (dev uses the Vite proxy, prod is served behind a reverse proxy).
 * Override with VITE_API_BASE_URL when the API lives on a different host.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const TOKEN_STORAGE_KEY = 'omnishare_token'

// The token lives in localStorage so it survives reloads. The auth store is the
// source of truth for reactive UI, but the http layer reads it directly to stay
// dependency-free (no circular import with the store).
let inMemoryToken: string | null =
  localStorage.getItem(TOKEN_STORAGE_KEY) ?? null

export function getToken(): string | null {
  return inMemoryToken
}

export function setToken(token: string | null): void {
  inMemoryToken = token
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

/** An error carrying the HTTP status and the backend's `detail` message. */
export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

type Body = object | FormData | URLSearchParams | undefined

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: Body
  /** Skip the Authorization header (for public endpoints like login). */
  auth?: boolean
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options

  const headers = new Headers()
  if (auth && inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`)
  }

  let payload: BodyInit | undefined
  if (body instanceof FormData || body instanceof URLSearchParams) {
    // Let the browser set the correct Content-Type (incl. multipart boundary).
    payload = body
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: payload,
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Network error — could not reach the server')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractDetail(response))
  }

  // 204 No Content and empty bodies.
  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return undefined as T
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }
  return undefined as T
}

async function extractDetail(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (data && typeof data.detail === 'string') return data.detail
  } catch {
    // fall through
  }
  return `Request failed with status ${response.status}`
}

export const http = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: Body, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: Body, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
