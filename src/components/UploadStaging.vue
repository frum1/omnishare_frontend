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
import { ApiError, createUpload, type FileOut, type UploadHandle, type UploadStats } from '@/api'
import { formatBytes, formatSpeed, formatDuration } from '@/utils/format'

const props = defineProps<{
  /** Hard cap from service settings, in MB. null/undefined = unknown, skip the check. */
  maxFileSizeMb?: number | null
  /** Current user's quota in bytes. null = unlimited, skip the check. */
  quotaBytes?: number | null
  /** Bytes already used by the current user, for the quota check. */
  usedBytes?: number
}>()

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
  status: 'idle' | 'uploading' | 'paused' | 'error'
  progress: number
  /** Smoothed transfer rate in bytes/second; 0 until the first sample. */
  bytesPerSecond: number
  /** Estimated seconds remaining; Infinity while unknown. */
  etaSeconds: number
  error: string
  /** Set when the file was rejected client-side before any request was made
   *  (too large, or over quota). Retrying is pointless without a different
   *  file, so the Upload action stays hidden. */
  invalid: boolean
  /** The resumable tus upload; present once uploading has started. */
  handle?: UploadHandle
}

// One upload = one file, so only a single file is ever staged at a time.
const pending = ref<Pending | null>(null)

// A transfer is in flight (or paused mid-flight): the options are locked and the
// staged file can only be cancelled, not re-configured.
const busy = computed(
  () => pending.value?.status === 'uploading' || pending.value?.status === 'paused',
)

/**
 * Reject files up front — too large or over quota — so the user finds out
 * before a multi-GB transfer starts, instead of failing partway through.
 */
function validate(file: File): string | null {
  const maxBytes = props.maxFileSizeMb ? props.maxFileSizeMb * 1024 * 1024 : null
  if (maxBytes !== null && file.size > maxBytes) {
    return t('upload.fileTooLarge', {
      size: formatBytes(file.size),
      limit: formatBytes(maxBytes),
    })
  }

  const quota = props.quotaBytes ?? null
  if (quota !== null) {
    const used = props.usedBytes ?? 0
    const remaining = Math.max(0, quota - used)
    if (file.size > remaining) {
      return t('upload.notEnoughStorage', {
        needed: formatBytes(file.size),
        available: formatBytes(remaining),
      })
    }
  }

  return null
}

function onFiles(files: File[]): void {
  const file = files[0]
  if (!file) return

  const error = validate(file)
  pending.value = {
    file,
    ttlValue: 0,
    ttlUnit: 86400,
    maxDownloads: 0,
    caption: '',
    status: error ? 'error' : 'idle',
    progress: 0,
    bytesPerSecond: 0,
    etaSeconds: Infinity,
    error: error ?? '',
    invalid: error !== null,
  }
}

function clear(): void {
  // Discard any partial upload on the server before dropping the staged file.
  void pending.value?.handle?.abort()
  pending.value = null
}

/** Start, or resume after a pause, the resumable upload for the staged file. */
function upload(): void {
  const item = pending.value
  if (!item || item.invalid) return

  // Resume a paused transfer: reuse the existing handle so tus continues from
  // the negotiated offset instead of re-sending from zero.
  if (item.handle && item.status === 'paused') {
    item.status = 'uploading'
    item.error = ''
    void item.handle.start()
    return
  }

  item.status = 'uploading'
  item.progress = 0
  item.bytesPerSecond = 0
  item.etaSeconds = Infinity
  item.error = ''

  const ttl = item.ttlValue > 0 ? item.ttlValue * item.ttlUnit : 0

  item.handle = createUpload(
    {
      file: item.file,
      ttl_seconds: ttl,
      max_downloads: item.maxDownloads > 0 ? item.maxDownloads : 0,
      caption: item.caption.trim() || undefined,
    },
    {
      onProgress: (stats: UploadStats) => {
        // Ignore late callbacks after a pause so the UI freezes at the offset.
        if (item.status !== 'uploading') return
        item.progress = stats.percent
        item.bytesPerSecond = stats.bytesPerSecond
        item.etaSeconds = stats.etaSeconds
      },
      onSuccess: (created: FileOut) => {
        emit('uploaded', created)
        pending.value = null
      },
      onError: (err: Error) => {
        item.status = 'error'
        item.error =
          err instanceof ApiError && err.status === 413
            ? t('upload.fileExceedsMaxSize')
            : err instanceof ApiError && err.detail
              ? err.detail
              : t('upload.uploadFailed')
      },
    },
  )

  void item.handle.start()
}

/** Pause the in-flight transfer, keeping progress for a later resume. */
function pauseUpload(): void {
  const item = pending.value
  if (!item?.handle || item.status !== 'uploading') return
  item.handle.pause()
  item.status = 'paused'
  item.bytesPerSecond = 0
  item.etaSeconds = Infinity
}
</script>

<template>
  <div class="staging">
    <UploadDropzone
      v-if="!pending"
      :max-size-mb="props.maxFileSizeMb ?? undefined"
      @files="onFiles"
    />

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
          @click="clear"
        />
      </div>

      <div v-if="!pending.invalid" class="options">
        <div class="field ttl">
          <label>{{ t('upload.expiresAfter') }}</label>
          <div class="ttl-inputs">
            <InputNumber
              v-model="pending.ttlValue"
              :min="0"
              :use-grouping="false"
              :disabled="busy"
              class="ttl-value"
            />
            <Select
              v-model="pending.ttlUnit"
              :options="TTL_UNITS"
              option-label="label"
              option-value="value"
              :disabled="busy"
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
            :disabled="busy"
            fluid
          />
          <small class="hint">{{ t('upload.unlimited') }}</small>
        </div>

        <div class="field span-2">
          <label>{{ t('upload.caption') }}</label>
          <InputText v-model="pending.caption" :disabled="busy" fluid />
        </div>
      </div>

      <div v-if="busy" class="progress">
        <ProgressBar :value="pending.progress" />
        <div class="progress-stats">
          <span class="pct">{{ pending.progress }}%</span>
          <span v-if="pending.status === 'paused'" class="paused-tag">
            <i class="pi pi-pause-circle" /> {{ t('upload.paused') }}
          </span>
          <template v-else>
            <span class="speed">{{ formatSpeed(pending.bytesPerSecond) }}</span>
            <span class="eta">{{ t('upload.eta', { time: formatDuration(pending.etaSeconds) }) }}</span>
          </template>
        </div>
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
          @click="clear"
        />
        <Button
          v-if="pending.status === 'uploading'"
          :label="t('upload.pause')"
          icon="pi pi-pause"
          severity="secondary"
          @click="pauseUpload"
        />
        <Button
          v-else-if="pending.status === 'paused'"
          :label="t('upload.resume')"
          icon="pi pi-play"
          @click="upload"
        />
        <Button
          v-else-if="!pending.invalid"
          :label="t('upload.upload')"
          icon="pi pi-upload"
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

.progress-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.progress-stats .pct {
  font-weight: 600;
  color: var(--p-text-color);
}

.progress-stats .eta {
  margin-left: auto;
}

.progress-stats .paused-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
  color: var(--p-primary-color);
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
