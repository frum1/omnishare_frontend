import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi, getToken, setToken, type User } from '@/api'

/**
 * Owns the session: the auth token and the current user. The token is
 * persisted by the http layer (localStorage); this store mirrors it reactively
 * and resolves the user via GET /auth/me.
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const user = ref<User | null>(null)
  /** True while restoring the session on app start (token present, user not yet loaded). */
  const loading = ref(false)

  const isAuthenticated = computed(() => token.value !== null)
  const isAdmin = computed(() => user.value?.is_admin ?? false)
  const mustChangePassword = computed(
    () => user.value?.must_change_password ?? false,
  )

  /** Authenticate and load the user profile. Throws ApiError on failure. */
  async function login(username: string, password: string): Promise<void> {
    const { access_token } = await authApi.login(username, password)
    applyToken(access_token)
    await fetchUser()
  }

  /** Load the current user from the API using the stored token. */
  async function fetchUser(): Promise<void> {
    user.value = await authApi.me()
  }

  /**
   * Restore the session on app start. If a token exists but is invalid, clear it.
   * Returns true when a valid session was restored.
   */
  async function restore(): Promise<boolean> {
    if (!token.value) return false
    loading.value = true
    try {
      await fetchUser()
      return true
    } catch {
      logout()
      return false
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    applyToken(null)
    user.value = null
  }

  function applyToken(value: string | null): void {
    setToken(value)
    token.value = value
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    isAdmin,
    mustChangePassword,
    login,
    fetchUser,
    restore,
    logout,
  }
})
