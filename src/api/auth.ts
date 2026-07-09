import { http } from './http'
import type { ChangePasswordRequest, LoginResponse, User } from './types'

export const authApi = {
  /** POST /api/auth/login — expects x-www-form-urlencoded credentials. */
  login(username: string, password: string): Promise<LoginResponse> {
    const body = new URLSearchParams({ username, password })
    return http.post<LoginResponse>('/api/auth/login', body, { auth: false })
  },

  /** GET /api/auth/me — the currently authenticated user. */
  me(): Promise<User> {
    return http.get<User>('/api/auth/me')
  },

  /** POST /api/auth/change-password — 204 on success. */
  changePassword(newPassword: string): Promise<void> {
    const payload: ChangePasswordRequest = { new_password: newPassword }
    return http.post<void>('/api/auth/change-password', payload)
  },
}
