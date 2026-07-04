<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { ApiError, downloadUrl, filesApi, type FileOut } from '@/api'
import { formatBytes } from '@/utils/format'

const route = useRoute()
const fileId = String(route.params.fileId)

type State = 'loading' | 'ready' | 'not-found' | 'gone' | 'error'

const state = ref<State>('loading')
const file = ref<FileOut | null>(null)

onMounted(async () => {
  try {
    file.value = await filesApi.info(fileId)
    state.value = 'ready'
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) state.value = 'not-found'
    else if (err instanceof ApiError && err.status === 410) state.value = 'gone'
    else state.value = 'error'
  }
})

function download(): void {
  // The backend serves /f/:id with Content-Disposition: attachment, so
  // navigating there triggers a download without leaving the page.
  window.location.href = downloadUrl(fileId)
}
</script>

<template>
  <div class="download">
    <div v-if="state === 'loading'" class="state">
      <ProgressSpinner />
    </div>

    <div v-else-if="state === 'ready' && file" class="panel">
      <i class="pi pi-file panel-icon" />
      <h1 class="filename" :title="file.original_filename">
        {{ file.original_filename }}
      </h1>
      <p v-if="file.caption" class="caption">{{ file.caption }}</p>
      <p class="size">{{ formatBytes(file.size_bytes) }}</p>
      <Button
        label="Download"
        icon="pi pi-download"
        size="large"
        fluid
        @click="download"
      />
    </div>

    <div v-else class="state">
      <i class="pi pi-exclamation-circle state-icon" />
      <h1 class="state-title">
        {{
          state === 'not-found'
            ? 'File not found'
            : state === 'gone'
              ? 'This link has expired'
              : 'Something went wrong'
        }}
      </h1>
      <p class="state-text">
        {{
          state === 'gone'
            ? 'The file is no longer available for download.'
            : state === 'not-found'
              ? 'This file may have been deleted or the link is incorrect.'
              : 'Please try again in a moment.'
        }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.download {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.panel {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 2rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  text-align: center;
}

.panel-icon {
  font-size: 2.75rem;
  color: var(--p-primary-color);
}

.filename {
  margin: 0.5rem 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-text-color);
  word-break: break-word;
}

.caption {
  margin: 0;
  color: var(--p-text-muted-color);
}

.size {
  margin: 0 0 1.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.95rem;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.state-icon {
  font-size: 3rem;
  color: var(--p-text-muted-color);
}

.state-title {
  margin: 0.5rem 0 0;
  font-size: 1.35rem;
  color: var(--p-text-color);
}

.state-text {
  margin: 0;
  color: var(--p-text-muted-color);
  max-width: 28rem;
}
</style>
