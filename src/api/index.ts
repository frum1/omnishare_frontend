import { API_BASE_URL } from './http'

export * from './types'
export { ApiError, API_BASE_URL, getToken, setToken } from './http'
export { authApi } from './auth'
export { filesApi } from './files'
export {
  createUpload,
  type UploadHandle,
  type UploadStats,
  type CreateUploadParams,
  type UploadCallbacks,
} from './upload'
export { usersApi } from './users'
export { settingsApi } from './settings'

/** Public download URL for a file id, served by `GET /f/{file_id}`. */
export function downloadUrl(fileId: string): string {
  return `${API_BASE_URL}/f/${fileId}`
}
