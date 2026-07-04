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

export interface UploadProgress {
  loaded: number
  total: number
  /** 0–100; 0 when total is unknown. */
  percent: number
}

/**
 * Upload FormData with progress reporting. Uses XMLHttpRequest because fetch
 * cannot report upload progress. Mirrors `request`'s auth + ApiError behavior.
 */
export function uploadFormData<T>(
  path: string,
  form: FormData,
  options: {
    onProgress?: (p: UploadProgress) => void
    signal?: AbortSignal
  } = {},
): Promise<T> {
  const { onProgress, signal } = options

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${path}`)
    if (inMemoryToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${inMemoryToken}`)
    }

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return
      const percent = e.lengthComputable
        ? Math.round((e.loaded / e.total) * 100)
        : 0
      onProgress({ loaded: e.loaded, total: e.total, percent })
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : (undefined as T))
        } catch {
          resolve(undefined as T)
        }
      } else {
        reject(new ApiError(xhr.status, parseXhrDetail(xhr)))
      }
    }
    xhr.onerror = () =>
      reject(new ApiError(0, 'Network error — could not reach the server'))
    xhr.onabort = () =>
      reject(new DOMException('Upload aborted', 'AbortError'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
      } else {
        signal.addEventListener('abort', () => xhr.abort(), { once: true })
      }
    }

    xhr.send(form)
  })
}

function parseXhrDetail(xhr: XMLHttpRequest): string {
  try {
    const data = JSON.parse(xhr.responseText)
    if (data && typeof data.detail === 'string') return data.detail
  } catch {
    // fall through
  }
  return `Request failed with status ${xhr.status}`
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
