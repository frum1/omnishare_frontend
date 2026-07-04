<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { ApiError, authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function submit(): Promise<void> {
  if (!newPassword.value) {
    error.value = t('auth.enterNewPassword')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = t('auth.passwordsDoNotMatch')
    return
  }
  error.value = ''
  loading.value = true
  try {
    await authApi.changePassword(newPassword.value)
    // Security: the current token belongs to the temporary password, so force
    // a fresh login with the new one.
    auth.logout()
    router.push({ name: 'login', query: { passwordChanged: '1' } })
  } catch (err) {
    error.value =
      err instanceof ApiError ? err.detail : t('common.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="auth.isAuthenticated && auth.mustChangePassword"
    :header="t('auth.setNewPassword')"
    modal
    :closable="false"
    :close-on-escape="false"
    :draggable="false"
    :style="{ width: '26rem' }"
    :breakpoints="{ '480px': '92vw' }"
  >
    <Message severity="info" variant="simple" class="intro">
      {{ t('auth.passwordMustChange') }}
    </Message>

    <form class="form" @submit.prevent="submit">
      <div class="field">
        <label for="fp-new">{{ t('auth.newPassword') }}</label>
        <Password
          input-id="fp-new"
          v-model="newPassword"
          :feedback="false"
          toggle-mask
          autocomplete="new-password"
          fluid
          :disabled="loading"
        />
      </div>

      <div class="field">
        <label for="fp-confirm">{{ t('auth.confirmPassword') }}</label>
        <Password
          input-id="fp-confirm"
          v-model="confirmPassword"
          :feedback="false"
          toggle-mask
          autocomplete="new-password"
          fluid
          :disabled="loading"
        />
      </div>

      <Message v-if="error" severity="error" variant="simple">
        {{ error }}
      </Message>

      <Button
        type="submit"
        :label="t('auth.saveAndSignOut')"
        icon="pi pi-check"
        :loading="loading"
        fluid
      />
    </form>
  </Dialog>
</template>

<style scoped>
.intro {
  margin-bottom: 1.25rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}
</style>
