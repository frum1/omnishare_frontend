import { http } from './http'
import type {
  AdminFileList,
  DiskUsage,
  FileOut,
  UpdateFileInfoRequest,
  UsageInfo,
  UserFileList,
} from './types'

// File uploads use the resumable tus protocol; see `createUpload` in ./upload.

export const filesApi = {
  /**
   * GET /api/files. Returns a flat array for regular users and an object
   * keyed by owner id for admins. Callers should narrow based on role.
   */
  list(): Promise<UserFileList | AdminFileList> {
    return http.get<UserFileList | AdminFileList>('/api/files')
  },

  /** PATCH /api/files/{id}/info — update caption, expiry and/or download limit. 204 on success. */
  updateInfo(fileId: string, payload: UpdateFileInfoRequest): Promise<void> {
    return http.patch<void>(`/api/files/${fileId}/info`, payload)
  },

  /** DELETE /api/files/{id} — 204 on success. */
  remove(fileId: string): Promise<void> {
    return http.delete<void>(`/api/files/${fileId}`)
  },

  /** GET /api/files/{id}/info — public file metadata (FileOut) for the download page. */
  info(fileId: string): Promise<FileOut> {
    return http.get<FileOut>(`/api/files/${fileId}/info`, { auth: false })
  },

  /** GET /api/files/usage — the current user's storage usage and quota. */
  usage(): Promise<UsageInfo> {
    return http.get<UsageInfo>('/api/files/usage')
  },

  /** GET /api/files/disk-usage — physical disk space on the server (admin). */
  diskUsage(): Promise<DiskUsage> {
    return http.get<DiskUsage>('/api/files/disk-usage')
  },
}
