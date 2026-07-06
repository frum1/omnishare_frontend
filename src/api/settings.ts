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

  /** GET /api/local-mode-available — whether the server offers a local network link. */
  localModeAvailable(): Promise<boolean> {
    return http.get<boolean>('/api/local-mode-available')
  },
}
