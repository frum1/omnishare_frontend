import { http } from './http'
import type { CreateUserRequest, ResetPasswordResponse, User } from './types'

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

  /** DELETE /admin/users/{id} — 204 on success. Cannot delete self. */
  remove(userId: string): Promise<void> {
    return http.delete<void>(`/admin/users/${userId}`)
  },
}
