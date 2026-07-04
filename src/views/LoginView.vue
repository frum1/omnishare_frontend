<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// Shown after a forced password change redirects the user back to log in.
const passwordChanged = computed(() => route.query.passwordChanged === '1')

async function onSubmit(): Promise<void> {
  if (!username.value || !password.value) {
    error.value = t('auth.enterCredentials')
    return
  }
  error.value = ''
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' ? redirect : '/')
  } catch (err) {
    error.value =
      err instanceof ApiError && err.status === 401
        ? t('auth.invalidCredentials')
        : err instanceof ApiError
          ? err.detail
          : t('common.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <h1 class="welcome">{{ t('auth.welcome') }}</h1>

    <Message
      v-if="passwordChanged"
      severity="success"
      variant="simple"
      class="notice"
    >
      {{ t('auth.passwordChanged') }}
    </Message>

    <form class="card" @submit.prevent="onSubmit">
      <div class="field">
        <label for="username">{{ t('auth.usernameLabel') }}</label>
        <InputText
          id="username"
          v-model="username"
          autocomplete="username"
          fluid
          :disabled="loading"
        />
      </div>

      <div class="field">
        <label for="password">{{ t('auth.passwordLabel') }}</label>
        <Password
          input-id="password"
          v-model="password"
          :feedback="false"
          toggle-mask
          autocomplete="current-password"
          fluid
          :disabled="loading"
        />
      </div>

      <Message v-if="error" severity="error" variant="simple">
        {{ error }}
      </Message>

      <Button
        type="submit"
        :label="t('auth.signIn')"
        icon="pi pi-sign-in"
        :loading="loading"
        fluid
      />
    </form>
  </div>
</template>

<style scoped>
.login {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  min-height: 60vh;
}

.welcome {
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.notice {
  width: 100%;
  max-width: 360px;
}

.card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}
</style>
