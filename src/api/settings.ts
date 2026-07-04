import { http } from './http'
import type { Settings, UpdateSettingsRequest } from './types'

export const settingsApi = {
  /** GET /admin/settings — current service configuration. */
  get(): Promise<Settings> {
    return http.get<Settings>('/admin/settings')
  },

  /** POST /admin/settings — update selected fields. */
  update(payload: UpdateSettingsRequest): Promise<Settings> {
    return http.post<Settings>('/admin/settings', payload)
  },
}
