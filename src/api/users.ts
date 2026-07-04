import { http } from './http'
import type {
  CreateUserRequest,
  ResetPasswordResponse,
  SetQuotaRequest,
  User,
} from './types'

export const usersApi = {
  /** POST /admin/users — create a user. */
  create(payload: CreateUserRequest): Promise<User> {
    return http.post<User>('/admin/users', { is_admin: false, ...payload })
  },

  /** GET /admin/users — list all users. */
  list(): Promise<User[]> {
    return http.get<User[]>('/admin/users')
  },

  /** POST /admin/users/{id}/reset-password — returns a temporary password. */
  resetPassword(userId: string): Promise<ResetPasswordResponse> {
    return http.post<ResetPasswordResponse>(`/admin/users/${userId}/reset-password`)
  },

  /** PATCH /admin/users/{id}/quota — set or clear (null) a user's quota. */
  setQuota(userId: string, quotaBytes: number | null): Promise<User> {
    const payload: SetQuotaRequest = { quota_bytes: quotaBytes }
    return http.patch<User>(`/admin/users/${userId}/quota`, payload)
  },

  /** DELETE /admin/users/{id} — 204 on success. Cannot delete self. */
  remove(userId: string): Promise<void> {
    return http.delete<void>(`/admin/users/${userId}`)
  },
}
