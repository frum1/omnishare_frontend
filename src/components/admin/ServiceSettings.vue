<script setup lang="ts">
import { onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { ApiError, settingsApi, type Settings } from '@/api'

const toast = useToast()

const form = ref<Settings | null>(null)
const loading = ref(true)
const saving = ref(false)

onMounted(async () => {
  try {
    form.value = await settingsApi.get()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Could not load settings',
      detail: err instanceof ApiError ? err.detail : 'Please try again.',
      life: 4000,
    })
  } finally {
    loading.value = false
  }
})

async function save(): Promise<void> {
  if (!form.value) return
  saving.value = true
  try {
    form.value = await settingsApi.update(form.value)
    toast.add({ severity: 'success', summary: 'Settings saved', life: 2500 })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Could not save settings',
      detail: err instanceof ApiError ? err.detail : 'Please try again.',
      life: 4000,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="settings">
    <h2 class="section-title">Service configuration</h2>

    <div v-if="loading" class="loading">Loading…</div>

    <form v-else-if="form" class="grid" @submit.prevent="save">
      <div class="field span-2">
        <label for="public-url">Public base URL</label>
        <InputText id="public-url" v-model="form.public_base_url" fluid />
      </div>

      <div class="field span-2">
        <label for="local-url">Local base URL</label>
        <InputText id="local-url" v-model="form.local_base_url" fluid />
      </div>

      <div class="field">
        <label for="local-port">Local port</label>
        <InputNumber
          input-id="local-port"
          v-model="form.local_port"
          :min="1"
          :max="65535"
          :use-grouping="false"
          fluid
        />
      </div>

      <div class="field">
        <label for="max-size">Max file size (MB)</label>
        <InputNumber
          input-id="max-size"
          v-model="form.max_file_size_mb"
          :min="1"
          :use-grouping="false"
          fluid
        />
      </div>

      <div class="field">
        <label for="cleanup">Cleanup interval (min)</label>
        <InputNumber
          input-id="cleanup"
          v-model="form.cleanup_interval_minutes"
          :min="1"
          :use-grouping="false"
          fluid
        />
      </div>

      <div class="actions span-2">
        <Button
          type="submit"
          label="Save changes"
          icon="pi pi-check"
          :loading="saving"
        />
      </div>
    </form>
  </section>
</template>

<style scoped>
.settings {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  padding: 1.5rem;
}

.section-title {
  margin: 0 0 1.25rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.25rem;
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

.span-2 {
  grid-column: 1 / -1;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.loading {
  color: var(--p-text-muted-color);
}

@media (max-width: 560px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: 1;
  }
}
</style>
