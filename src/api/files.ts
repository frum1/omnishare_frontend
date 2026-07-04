import { http, uploadFormData, type UploadProgress } from './http'
import type {
  AdminFileList,
  FileOut,
  UpdateCaptionRequest,
  UploadFileParams,
  UserFileList,
} from './types'

export const filesApi = {
  /** POST /api/files — multipart upload with optional progress reporting. */
  upload(
    params: UploadFileParams,
    options: {
      onProgress?: (p: UploadProgress) => void
      signal?: AbortSignal
    } = {},
  ): Promise<FileOut> {
    const form = new FormData()
    form.append('file', params.file)
    if (params.ttl_seconds !== undefined) {
      form.append('ttl_seconds', String(params.ttl_seconds))
    }
    if (params.max_downloads !== undefined) {
      form.append('max_downloads', String(params.max_downloads))
    }
    if (params.caption !== undefined) {
      form.append('caption', params.caption)
    }
    return uploadFormData<FileOut>('/api/files', form, options)
  },

  /**
   * GET /api/files. Returns a flat array for regular users and an object
   * keyed by owner id for admins. Callers should narrow based on role.
   */
  list(): Promise<UserFileList | AdminFileList> {
    return http.get<UserFileList | AdminFileList>('/api/files')
  },

  /** PATCH /api/files/{id} — update the caption. */
  updateCaption(fileId: string, caption: string | null): Promise<FileOut> {
    const payload: UpdateCaptionRequest = { caption }
    return http.patch<FileOut>(`/api/files/${fileId}`, payload)
  },

  /** DELETE /api/files/{id} — 204 on success. */
  remove(fileId: string): Promise<void> {
    return http.delete<void>(`/api/files/${fileId}`)
  },

  /** GET /api/files/{id}/info — public file metadata (FileOut) for the download page. */
  info(fileId: string): Promise<FileOut> {
    return http.get<FileOut>(`/api/files/${fileId}/info`, { auth: false })
  },
}
