import { http } from './http'
import type { Settings, UpdateSettingsRequest } from './types'

export const settingsApi = {
  /** GET /api/admin/settings — current service configuration. */
  get(): Promise<Settings> {
    return http.get<Settings>('/api/admin/settings')
  },

  /** POST /api/admin/settings — update selected fields. */
  update(payload: UpdateSettingsRequest): Promise<Settings> {
    return http.post<Settings>('/api/admin/settings', payload)
  },

  /** GET /api/local-mode-available — whether the server offers a local network link. */
  localModeAvailable(): Promise<boolean> {
    return http.get<boolean>('/api/local-mode-available')
  },
}
