<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { ApiError, authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function submit(): Promise<void> {
  if (!newPassword.value) {
    error.value = 'Please enter a new password.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
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
      err instanceof ApiError ? err.detail : 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="auth.isAuthenticated && auth.mustChangePassword"
    header="Set a new password"
    modal
    :closable="false"
    :close-on-escape="false"
    :draggable="false"
    :style="{ width: '26rem' }"
    :breakpoints="{ '480px': '92vw' }"
  >
    <Message severity="info" variant="simple" class="intro">
      Your account uses a temporary password. Choose a new one to continue —
      you'll be signed out afterwards and can log in with it.
    </Message>

    <form class="form" @submit.prevent="submit">
      <div class="field">
        <label for="fp-new">New password</label>
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
        <label for="fp-confirm">Confirm password</label>
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
        label="Save & sign out"
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
