// Domain types mirroring the OmniShare API schema (see api_scheme.md)

/** A user account. Returned by admin user endpoints and derivable from the token owner. */
export interface User {
  id: string
  username: string
  is_admin: boolean
  must_change_password: boolean
  created_at: string // ISO 8601
  /** Bytes currently stored by the user. Present in GET /admin/users. */
  used_bytes?: number
  /** Storage quota in bytes; null = unlimited. Present in GET /admin/users. */
  quota_bytes?: number | null
}

/** A stored file with sharing metadata. */
export interface FileOut {
  id: string
  original_filename: string
  content_type: string
  size_bytes: number
  caption: string | null
  created_at: string // ISO 8601
  expires_at: string | null // ISO 8601
  max_downloads: number | null
  download_count: number
  public_url: string
  local_url: string
}

/** Service configuration (admin only). */
export interface Settings {
  public_base_url: string
  local_mode: boolean
  local_base_url: string
  local_port: number
  max_file_size_mb: number
  cleanup_interval_minutes: number
}

// --- Auth ---

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface ChangePasswordRequest {
  new_password: string
}

// --- Files ---

// Upload parameters live with the tus upload client; see `CreateUploadParams`
// in ./upload.

/** Body for PATCH /api/files/{id}/info. All fields optional; only provided ones change. */
export interface UpdateFileInfoRequest {
  caption?: string | null
  expires_at?: string | null // ISO 8601; null = never expires
  max_downloads?: number | null // null = unlimited
}

/** `GET /api/files` returns a flat array for regular users. */
export type UserFileList = FileOut[]

/** `GET /api/files` returns files grouped by owner id for admins. */
export type AdminFileList = Record<string, FileOut[]>

// --- Users (admin) ---

export interface CreateUserRequest {
  username: string
  password: string
  is_admin?: boolean
  /** Storage quota in bytes; null/omitted = unlimited. */
  quota_bytes?: number | null
}

/** Body for PATCH /admin/users/{id}/quota. null = remove the limit. */
export interface SetQuotaRequest {
  quota_bytes: number | null
}

/** GET /api/files/usage — the current user's storage usage. */
export interface UsageInfo {
  used_bytes: number
  quota_bytes: number | null
}

/** GET /api/files/disk-usage — physical disk space (admin). */
export interface DiskUsage {
  total_bytes: number
  used_bytes: number
  free_bytes: number
}

export interface ResetPasswordResponse {
  username: string
  temporary_password: string
}

// --- Settings (admin) ---

/** All fields optional; only provided fields are updated. */
export type UpdateSettingsRequest = Partial<Settings>
