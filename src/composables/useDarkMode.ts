import { ref } from 'vue'
import { DARK_MODE_SELECTOR } from '@/theme'

const STORAGE_KEY = 'omnishare_theme'
type Theme = 'light' | 'dark'

function resolveInitial(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

// Module-level singleton so every component shares one reactive state.
const isDark = ref(resolveInitial() === 'dark')

function apply(dark: boolean): void {
  document.documentElement.classList.toggle(DARK_MODE_SELECTOR, dark)
}

// Apply on load before the first paint of themed components.
apply(isDark.value)

/** Shared dark-mode toggle, persisted to localStorage. */
export function useDarkMode() {
  function toggle(): void {
    isDark.value = !isDark.value
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
    apply(isDark.value)
  }

  return { isDark, toggle }
}
