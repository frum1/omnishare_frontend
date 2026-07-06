<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import Popover from 'primevue/popover'
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isDark, toggle } = useDarkMode()
const { t, locale } = useI18n()

const languageMenu = ref<InstanceType<typeof Menu>>()
const accountPopover = ref<InstanceType<typeof Popover>>()

// Center tabs are only meaningful for admins (Upload vs Administration).
// Regular users have a single page, so they get no tabs at all.
const tabs = computed(() => {
  if (!auth.isAdmin) return []
  return [
    { label: t('header.upload'), to: '/', name: 'dashboard' },
    { label: t('header.administration'), to: '/admin', name: 'admin' },
  ]
})

const languageItems = computed<MenuItem[]>(() => [
  { label: 'English', command: () => (locale.value = 'en') },
  { label: 'Русский', command: () => (locale.value = 'ru') },
])

// First letter of the username, shown in the avatar in place of a generic icon.
const userInitial = computed(() => (auth.user?.username?.[0] ?? '?').toUpperCase())
const roleLabel = computed(() => (auth.isAdmin ? t('header.roleAdmin') : t('header.roleUser')))

function toggleLanguage(event: Event): void {
  languageMenu.value?.toggle(event)
}

function toggleAccount(event: Event): void {
  accountPopover.value?.toggle(event)
}

function logout(): void {
  accountPopover.value?.hide()
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="brand">
      <i class="pi pi-share-alt brand-icon" />
      <span class="brand-name">OmniShare</span>
    </RouterLink>

    <nav v-if="tabs.length" class="tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.to"
        class="tab"
        :class="{ active: route.name === tab.name }"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <div class="actions">
      <button class="lang-toggle" :aria-label="t('header.language')" @click="toggleLanguage">
        <i class="pi pi-globe" />
        <span>{{ locale.toUpperCase() }}</span>
      </button>
      <Menu ref="languageMenu" :model="languageItems" :popup="true" />

      <Button
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        severity="secondary"
        text
        rounded
        :aria-label="isDark ? t('header.switchToLightMode') : t('header.switchToDarkMode')"
        @click="toggle"
      />

      <template v-if="auth.isAuthenticated">
        <button class="account" :aria-label="t('header.account')" @click="toggleAccount">
          <span class="avatar">{{ userInitial }}</span>
        </button>
        <Popover ref="accountPopover" class="account-popover">
          <div class="account-card">
            <span class="avatar avatar-lg">{{ userInitial }}</span>
            <div class="account-text">
              <span class="account-name">{{ auth.user?.username }}</span>
              <span class="account-role">{{ roleLabel }}</span>
            </div>
          </div>
          <div class="account-divider" />
          <button class="logout-row" @click="logout">
            <i class="pi pi-sign-out" />
            <span>{{ t('header.logout') }}</span>
          </button>
        </Popover>
      </template>
      <Button
        v-else
        :label="t('header.login')"
        icon="pi pi-sign-in"
        @click="router.push('/login')"
      />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--p-content-border-color);
  background: var(--p-content-background);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--p-text-color);
  font-weight: 600;
  font-size: 1.15rem;
}

.brand-icon {
  color: var(--p-primary-color);
  font-size: 1.35rem;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  margin: 0 auto;
}

.tab {
  padding: 0.5rem 1rem;
  border-radius: var(--p-content-border-radius);
  text-decoration: none;
  color: var(--p-text-muted-color);
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.tab:hover {
  background: var(--p-content-hover-background);
  color: var(--p-text-color);
}

.tab.active {
  color: var(--p-primary-color);
  background: var(--p-highlight-background);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.lang-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  background: none;
  padding: 0.5rem 0.6rem;
  border-radius: var(--p-content-border-radius);
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.lang-toggle:hover {
  background: var(--p-content-hover-background);
  color: var(--p-text-color);
}

.lang-toggle .pi {
  font-size: 0.95rem;
}

/* When tabs are present they take the auto margin; keep actions pinned right. */
.tabs ~ .actions {
  margin-left: 0;
}

.account {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--p-primary-color);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
}

.avatar-lg {
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.account-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.25rem 0.75rem;
}

.account-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.account-name {
  font-weight: 600;
  color: var(--p-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-role {
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.account-divider {
  height: 1px;
  margin: 0 -0.25rem;
  background: var(--p-content-border-color);
}

.logout-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  margin-top: 0.6rem;
  padding: 0.5rem 0.25rem;
  border: none;
  border-radius: var(--p-content-border-radius);
  background: none;
  color: var(--p-red-500);
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.logout-row:hover {
  background: var(--p-content-hover-background);
}

:deep(.account-popover .p-popover-content) {
  min-width: 13rem;
  padding: 0.75rem;
}

@media (max-width: 640px) {
  .brand-name {
    display: none;
  }

  .tabs {
    margin: 0 auto;
    gap: 0;
  }

  .tab {
    padding: 0.5rem 0.6rem;
    font-size: 0.9rem;
  }
}
</style>
