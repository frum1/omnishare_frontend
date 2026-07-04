<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Menu from 'primevue/menu'
import Avatar from 'primevue/avatar'
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isDark, toggle } = useDarkMode()
const { t, locale } = useI18n()

const languages = computed(() => [
  { label: 'English', value: 'en' },
  { label: 'Русский', value: 'ru' },
])

const accountMenu = ref<InstanceType<typeof Menu>>()

// Center tabs are only meaningful for admins (Upload vs Administration).
// Regular users have a single page, so they get no tabs at all.
const tabs = computed(() => {
  if (!auth.isAdmin) return []
  return [
    { label: t('header.upload'), to: '/', name: 'dashboard' },
    { label: t('header.administration'), to: '/admin', name: 'admin' },
  ]
})

const accountItems = computed<MenuItem[]>(() => [
  { label: auth.user?.username ?? t('header.account'), disabled: true },
  { separator: true },
  {
    label: t('header.logout'),
    icon: 'pi pi-sign-out',
    command: () => {
      auth.logout()
      router.push('/login')
    },
  },
])

function toggleAccount(event: Event): void {
  accountMenu.value?.toggle(event)
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
      <Select
        v-model="locale"
        :options="languages"
        option-label="label"
        option-value="value"
        class="language-select"
      />

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
          <Avatar icon="pi pi-user" shape="circle" />
        </button>
        <Menu ref="accountMenu" :model="accountItems" :popup="true" />
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

.language-select {
  width: 8rem;
}

.language-select :deep(.p-select-label) {
  padding: 0.25rem 0.5rem;
}

.language-select :deep(.p-select-trigger) {
  width: auto;
  padding: 0.25rem 0.5rem;
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
