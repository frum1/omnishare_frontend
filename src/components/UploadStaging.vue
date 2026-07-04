<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import Message from 'primevue/message'
import UploadDropzone from '@/components/UploadDropzone.vue'
import { ApiError, filesApi, type FileOut } from '@/api'
import { formatBytes } from '@/utils/format'

const emit = defineEmits<{
  uploaded: [file: FileOut]
}>()

const { t } = useI18n()

const TTL_UNITS = computed(() => [
  { label: t('upload.minutes'), value: 60 },
  { label: t('upload.hours'), value: 3600 },
  { label: t('upload.days'), value: 86400 },
])

interface Pending {
  file: File
  /** 0 = never expires. Multiplied by ttlUnit to get seconds. */
  ttlValue: number
  ttlUnit: number
  /** 0 = unlimited downloads. */
  maxDownloads: number
  caption: string
  status: 'idle' | 'uploading' | 'error'
  progress: number
  error: string
  controller?: AbortController
}

// One upload = one file, so only a single file is ever staged at a time.
const pending = ref<Pending | null>(null)

function onFiles(files: File[]): void {
  const file = files[0]
  if (!file) return
  pending.value = {
    file,
    ttlValue: 0,
    ttlUnit: 86400,
    maxDownloads: 0,
    caption: '',
    status: 'idle',
    progress: 0,
    error: '',
  }
}

function clear(): void {
  pending.value?.controller?.abort()
  pending.value = null
}

async function upload(): Promise<void> {
  const item = pending.value
  if (!item) return

  item.status = 'uploading'
  item.progress = 0
  item.error = ''
  item.controller = new AbortController()

  const ttl = item.ttlValue > 0 ? item.ttlValue * item.ttlUnit : 0

  try {
    const created = await filesApi.upload(
      {
        file: item.file,
        ttl_seconds: ttl,
        max_downloads: item.maxDownloads > 0 ? item.maxDownloads : 0,
        caption: item.caption.trim() || undefined,
      },
      { onProgress: (p) => (item.progress = p.percent), signal: item.controller.signal },
    )
    emit('uploaded', created)
    pending.value = null
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      item.status = 'idle'
      item.progress = 0
      return
    }
    item.status = 'error'
    item.error =
      err instanceof ApiError && err.status === 413
        ? t('upload.fileExceedsMaxSize')
        : err instanceof ApiError
          ? err.detail
          : t('upload.uploadFailed')
  }
}
</script>

<template>
  <div class="staging">
    <UploadDropzone v-if="!pending" @files="onFiles" />

    <div v-else class="draft">
      <div class="draft-head">
        <div class="file-name">
          <i class="pi pi-file" />
          <span class="name" :title="pending.file.name">{{ pending.file.name }}</span>
          <span class="size">{{ formatBytes(pending.file.size) }}</span>
        </div>
        <Button
          icon="pi pi-times"
          severity="secondary"
          text
          rounded
          :aria-label="t('upload.removeFile')"
          :disabled="pending.status === 'uploading'"
          @click="clear"
        />
      </div>

      <div class="options">
        <div class="field ttl">
          <label>{{ t('upload.expiresAfter') }}</label>
          <div class="ttl-inputs">
            <InputNumber
              v-model="pending.ttlValue"
              :min="0"
              :use-grouping="false"
              :disabled="pending.status === 'uploading'"
              class="ttl-value"
            />
            <Select
              v-model="pending.ttlUnit"
              :options="TTL_UNITS"
              option-label="label"
              option-value="value"
              :disabled="pending.status === 'uploading'"
              class="ttl-unit"
            />
          </div>
          <small class="hint">{{ t('upload.neverExpires') }}</small>
        </div>

        <div class="field">
          <label>{{ t('upload.maxDownloads') }}</label>
          <InputNumber
            v-model="pending.maxDownloads"
            :min="0"
            :use-grouping="false"
            :disabled="pending.status === 'uploading'"
            fluid
          />
          <small class="hint">{{ t('upload.unlimited') }}</small>
        </div>

        <div class="field span-2">
          <label>{{ t('upload.caption') }}</label>
          <InputText
            v-model="pending.caption"
            :disabled="pending.status === 'uploading'"
            fluid
          />
        </div>
      </div>

      <div v-if="pending.status === 'uploading'" class="progress">
        <ProgressBar :value="pending.progress" />
      </div>

      <Message
        v-if="pending.status === 'error'"
        severity="error"
        variant="simple"
        class="draft-error"
      >
        {{ pending.error }}
      </Message>

      <div class="draft-actions">
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          text
          :disabled="pending.status === 'uploading'"
          @click="clear"
        />
        <Button
          :label="t('upload.upload')"
          icon="pi pi-upload"
          :loading="pending.status === 'uploading'"
          @click="upload"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.staging {
  display: flex;
  flex-direction: column;
}

.draft {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  padding: 1.25rem;
}

.draft-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.file-name {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.file-name .pi-file {
  color: var(--p-primary-color);
}

.file-name .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--p-text-color);
  font-weight: 500;
}

.file-name .size {
  flex: none;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.span-2 {
  grid-column: 1 / -1;
}

.ttl-inputs {
  display: flex;
  gap: 0.5rem;
}

.ttl-value {
  flex: 1;
}

.ttl-unit {
  flex: 0 0 8rem;
}

.hint {
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.progress {
  padding-top: 1rem;
}

.draft-error {
  margin-top: 1rem;
}

.draft-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

@media (max-width: 560px) {
  .options {
    grid-template-columns: 1fr;
  }
}
</style>
