// Resumable file uploads via the tus 1.0.0 protocol (https://tus.io).
//
// The backend exposes the tus creation endpoint at the same URL as the REST
// file collection (`POST /api/files` with tus headers → 201 + Location), so a
// single upload survives connection drops, proxy limits and page reloads: the
// client re-negotiates the offset (HEAD) and continues from there (PATCH).
//
// tus-js-client handles the wire protocol, chunking, retries and fingerprinting;
// this module wraps it with auth, our metadata contract, and a live speed/ETA
// meter so the UI only has to render ready-made stats.

import * as tus from 'tus-js-client'
import { API_BASE_URL, ApiError, getToken } from './http'
import { filesApi } from './files'
import type { FileOut } from './types'

/**
 * Bytes per PATCH request. A finite chunk keeps every request bounded, so huge
 * files never hit reverse-proxy body-size limits and a dropped connection only
 * costs the current chunk, not the whole transfer. Override with
 * VITE_UPLOAD_CHUNK_SIZE (bytes) to match the server/proxy configuration.
 */
const CHUNK_SIZE = Number(import.meta.env.VITE_UPLOAD_CHUNK_SIZE) || 64 * 1024 * 1024

/** Backoff schedule for automatic retries on transient network/5xx errors. */
const RETRY_DELAYS = [0, 1000, 3000, 5000, 10000, 20000]

export interface UploadStats {
  loaded: number
  total: number
  /** 0–100. */
  percent: number
  /** Smoothed transfer rate in bytes/second; 0 until the first sample. */
  bytesPerSecond: number
  /** Estimated seconds remaining; Infinity while the rate is still unknown. */
  etaSeconds: number
}

export interface CreateUploadParams {
  file: File
  /** Time-to-live in seconds. 0/omitted = never expires. */
  ttl_seconds?: number
  /** Max downloads before auto-delete. 0/omitted = unlimited. */
  max_downloads?: number
  caption?: string
}

export interface UploadCallbacks {
  onProgress?: (stats: UploadStats) => void
  onSuccess?: (file: FileOut) => void
  onError?: (error: Error) => void
}

/** Imperative handle over a single tus upload. */
export interface UploadHandle {
  /** Begin (or, after a pause/reload, resume) the transfer. */
  start(): Promise<void>
  /** Stop sending without discarding progress; resume later with `start()`. */
  pause(): void
  /** Discard the partial upload on the server (tus DELETE). Safe to call once. */
  abort(): Promise<void>
  readonly paused: boolean
}

/**
 * Smooths the instantaneous transfer rate with an exponential moving average so
 * the displayed speed/ETA don't jitter between chunks.
 */
class SpeedMeter {
  private lastTime = 0
  private lastLoaded = 0
  private smoothedBps = 0
  /** Weight of each new sample; lower = smoother, slower to react. */
  private readonly alpha = 0.3
  /** Ignore samples closer than this (ms) to keep the rate numerically stable. */
  private readonly minIntervalMs = 250

  reset(): void {
    this.lastTime = 0
    this.lastLoaded = 0
    this.smoothedBps = 0
  }

  /** Feed a progress sample; returns the current smoothed bytes/second. */
  sample(loaded: number): number {
    const now = performance.now()
    if (this.lastTime === 0) {
      this.lastTime = now
      this.lastLoaded = loaded
      return this.smoothedBps
    }

    const dt = now - this.lastTime
    if (dt < this.minIntervalMs) return this.smoothedBps

    // Guard against a backwards jump (e.g. a chunk retried from a lower offset).
    const delta = Math.max(0, loaded - this.lastLoaded)
    const instantBps = (delta / dt) * 1000

    this.smoothedBps =
      this.smoothedBps === 0
        ? instantBps
        : this.alpha * instantBps + (1 - this.alpha) * this.smoothedBps

    this.lastTime = now
    this.lastLoaded = loaded
    return this.smoothedBps
  }
}

/** The tus file id is the last path segment of the creation `Location` URL. */
function fileIdFromUploadUrl(url: string): string | null {
  const path = url.split('?')[0].replace(/\/+$/, '')
  const id = path.slice(path.lastIndexOf('/') + 1)
  return id || null
}

/** Absolute origin (scheme + host) we send file requests to. */
const ENDPOINT_ORIGIN = new URL(`${API_BASE_URL}/api/files`, window.location.href).origin

/**
 * Pin an upload URL back to the endpoint origin. The backend may answer creation
 * with an absolute `Location` pointing at its own host (e.g. :8000). Following it
 * verbatim would leave the dev proxy — turning every PATCH into a cross-origin
 * request whose CORS preflight (OPTIONS) the resource route rejects with 405.
 * Re-hosting the path onto ENDPOINT_ORIGIN keeps the transfer on the same origin
 * we created it on (the Vite proxy in dev, the API host in prod).
 */
function pinUploadUrlToEndpoint(url: string): string {
  try {
    const current = new URL(url, window.location.href)
    if (current.origin === ENDPOINT_ORIGIN) return url
    return `${ENDPOINT_ORIGIN}${current.pathname}${current.search}`
  } catch {
    return url
  }
}

/**
 * Build a resumable upload for `file`. Nothing is sent until `start()` is
 * called. On completion the freshly created FileOut is fetched by id and
 * delivered via `onSuccess`.
 */
export function createUpload(
  params: CreateUploadParams,
  callbacks: UploadCallbacks = {},
): UploadHandle {
  const { file } = params
  const meter = new SpeedMeter()
  let paused = false
  let done = false

  // tus metadata keys the backend expects (see api spec). Values are strings;
  // tus-js-client base64-encodes them into the Upload-Metadata header. Optional
  // fields are omitted when unset so the server applies its own defaults.
  const metadata: Record<string, string> = {
    filename: file.name,
    filetype: file.type || 'application/octet-stream',
  }
  if (params.caption) metadata.caption = params.caption
  if (params.ttl_seconds && params.ttl_seconds > 0) {
    metadata.ttl = String(params.ttl_seconds)
  }
  if (params.max_downloads && params.max_downloads > 0) {
    metadata.maxdownloads = String(params.max_downloads)
  }

  const upload = new tus.Upload(file, {
    endpoint: `${API_BASE_URL}/api/files`,
    chunkSize: CHUNK_SIZE,
    retryDelays: RETRY_DELAYS,
    metadata,
    // Re-read the token on every request so a mid-upload refresh stays valid.
    onBeforeRequest: (req) => {
      const token = getToken()
      if (token) req.setHeader('Authorization', `Bearer ${token}`)
    },
    // Clear the localStorage fingerprint once the server has the whole file.
    removeFingerprintOnSuccess: true,
    // Fires right after the creation Location (or a resume HEAD) sets upload.url,
    // before any PATCH — normalize it so chunks never leave the endpoint origin.
    onUploadUrlAvailable: () => {
      if (upload.url) upload.url = pinUploadUrlToEndpoint(upload.url)
    },
    onProgress: (loaded, total) => {
      const bytesPerSecond = meter.sample(loaded)
      const remaining = Math.max(0, total - loaded)
      callbacks.onProgress?.({
        loaded,
        total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
        bytesPerSecond,
        etaSeconds: bytesPerSecond > 0 ? remaining / bytesPerSecond : Infinity,
      })
    },
    onSuccess: async () => {
      done = true
      const id = upload.url && fileIdFromUploadUrl(upload.url)
      if (!id) {
        callbacks.onError?.(new ApiError(0, 'Upload finished but no file id was returned'))
        return
      }
      try {
        callbacks.onSuccess?.(await filesApi.info(id))
      } catch (err) {
        callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    },
    onError: (error) => {
      // A pause aborts the in-flight request; that surfaces here as an error we
      // deliberately swallow so the UI can stay in a resumable "paused" state.
      if (paused) return
      callbacks.onError?.(normalizeTusError(error))
    },
  })

  async function start(): Promise<void> {
    paused = false
    meter.reset()
    // Resume from a matching upload left by an earlier session (page reload or
    // an aborted attempt on the same file), otherwise start fresh.
    const previous = await upload.findPreviousUploads()
    if (previous.length > 0) {
      upload.resumeFromPreviousUpload(previous[0])
    }
    upload.start()
  }

  function pause(): void {
    if (done) return
    paused = true
    // Abort the current request but keep the partial upload on the server so a
    // later start() picks up from the negotiated offset.
    void upload.abort(false)
  }

  async function abort(): Promise<void> {
    if (done) return
    paused = true
    // `true` sends a tus DELETE, freeing the partial upload server-side.
    try {
      await upload.abort(true)
    } catch {
      // Best-effort cleanup; a failed terminate must not surface to the user.
    }
  }

  return {
    start,
    pause,
    abort,
    get paused() {
      return paused
    },
  }
}

/** Turn a tus error into an ApiError carrying the server's status/detail when present. */
function normalizeTusError(error: Error): ApiError {
  // tus-js-client attaches the failed response to DetailedError instances.
  const response = (error as { originalResponse?: { getStatus(): number; getBody(): string } })
    .originalResponse
  if (response) {
    const status = response.getStatus()
    let detail = ''
    try {
      const body = response.getBody()
      detail = JSON.parse(body)?.detail ?? ''
    } catch {
      // non-JSON body
    }
    return new ApiError(status, detail || `Upload failed with status ${status}`)
  }
  return new ApiError(0, error.message || 'Upload failed')
}
