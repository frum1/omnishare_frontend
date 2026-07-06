<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { ApiError, filesApi, settingsApi, type FileOut } from '@/api'
import {
  formatBytes,
  formatDownloads,
  formatExpiry,
  parseApiDate,
  toSharePage,
} from '@/utils/format'

defineProps<{
  files: FileOut[]
  /** Optional message shown when the list is empty. */
  emptyText?: string
}>()

const emit = defineEmits<{
  delete: [file: FileOut]
}>()

const toast = useToast()
const { t } = useI18n()

// The file whose share links are shown in the dialog (null = closed).
const shareTarget = ref<FileOut | null>(null)
const localModeAvailable = ref(false)
const publicQr = ref('')
const localQr = ref('')

// --- Edit dialog ---
const TTL_UNITS = computed(() => [
  { label: t('upload.minutes'), value: 60 },
  { label: t('upload.hours'), value: 3600 },
  { label: t('upload.days'), value: 86400 },
])

const editTarget = ref<FileOut | null>(null)
const editForm = reactive({
  ttlValue: 0,
  ttlUnit: 86400,
  maxDownloads: 0,
  caption: '',
})
const editSaving = ref(false)
const editError = ref('')

/** Remaining time-to-live, decomposed into a value/unit pair for editing. */
function secondsToTtl(seconds: number): { value: number; unit: number } {
  if (seconds <= 0) return { value: 0, unit: 86400 }
  const minutes = seconds / 60
  if (minutes < 60) return { value: Math.max(1, Math.ceil(minutes)), unit: 60 }
  const hours = seconds / 3600
  if (hours < 24) return { value: Math.max(1, Math.ceil(hours)), unit: 3600 }
  return { value: Math.max(1, Math.ceil(seconds / 86400)), unit: 86400 }
}

function openEdit(file: FileOut): void {
  const remaining = file.expires_at
    ? Math.round((parseApiDate(file.expires_at) - Date.now()) / 1000)
    : 0
  const ttl = secondsToTtl(remaining)
  editForm.ttlValue = ttl.value
  editForm.ttlUnit = ttl.unit
  editForm.maxDownloads = file.max_downloads ?? 0
  editForm.caption = file.caption ?? ''
  editError.value = ''
  editTarget.value = file
}

async function submitEdit(): Promise<void> {
  const file = editTarget.value
  if (!file) return

  const expiresAt =
    editForm.ttlValue > 0
      ? new Date(Date.now() + editForm.ttlValue * editForm.ttlUnit * 1000).toISOString()
      : null
  const maxDownloads = editForm.maxDownloads > 0 ? editForm.maxDownloads : null
  const caption = editForm.caption.trim() || null

  editSaving.value = true
  editError.value = ''
  try {
    await filesApi.updateInfo(file.id, {
      caption,
      expires_at: expiresAt,
      max_downloads: maxDownloads,
    })
    file.caption = caption
    file.expires_at = expiresAt
    file.max_downloads = maxDownloads
    editTarget.value = null
    toast.add({ severity: 'success', summary: t('fileList.fileUpdated'), life: 2500 })
  } catch (err) {
    editError.value =
      err instanceof ApiError ? err.detail : t('common.error')
  } finally {
    editSaving.value = false
  }
}

onMounted(async () => {
  try {
    localModeAvailable.value = await settingsApi.localModeAvailable()
  } catch {
    localModeAvailable.value = false
  }
})

async function openShare(file: FileOut): Promise<void> {
  shareTarget.value = file
  publicQr.value = await QRCode.toDataURL(toSharePage(file.public_url), {
    margin: 1,
    width: 160,
  })
  localQr.value = localModeAvailable.value
    ? await QRCode.toDataURL(toSharePage(file.local_url), { margin: 1, width: 160 })
    : ''
}

async function copy(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
    toast.add({ severity: 'success', summary: t('fileList.linkCopied'), life: 2000 })
  } catch {
    toast.add({
      severity: 'warn',
      summary: t('fileList.couldNotCopy'),
      detail: url,
      life: 4000,
    })
  }
}
</script>

<template>
  <div class="file-list">
    <div class="head">
      <span class="col-name">{{ t('fileList.name') }}</span>
      <span class="col-size">{{ t('fileList.size') }}</span>
      <span class="col-actions" />
    </div>

    <p v-if="!files.length" class="empty">
      {{ emptyText ?? t('fileList.noFiles') }}
    </p>

    <div v-for="file in files" :key="file.id" class="row">
      <div class="col-name">
        <span class="name" :title="file.original_filename">
          {{ file.original_filename }}
        </span>
        <span v-if="file.caption" class="caption">{{ file.caption }}</span>
        <span class="meta">
          <span
            class="meta-item"
            :title="t('admin.downloads', { count: formatDownloads(file.download_count, file.max_downloads) })"
          >
            <i class="pi pi-download" />
            {{ formatDownloads(file.download_count, file.max_downloads) }}
          </span>
          <span class="meta-item" :title="t('admin.expires', { date: formatExpiry(file.expires_at) })">
            <i class="pi pi-clock" />
            {{ formatExpiry(file.expires_at) }}
          </span>
        </span>
      </div>
      <span class="col-size">{{ formatBytes(file.size_bytes) }}</span>
      <div class="col-actions">
        <Button
          icon="pi pi-share-alt"
          severity="secondary"
          text
          rounded
          :aria-label="t('header.shareLinks')"
          @click="openShare(file)"
        />
        <Button
          icon="pi pi-pencil"
          severity="secondary"
          text
          rounded
          :aria-label="t('fileList.editFile')"
          @click="openEdit(file)"
        />
        <Button
          icon="pi pi-trash"
          severity="danger"
          text
          rounded
          :aria-label="t('dashboard.deleteFile')"
          @click="emit('delete', file)"
        />
      </div>
    </div>

    <Dialog
      :visible="shareTarget !== null"
      modal
      :draggable="false"
      :style="{ width: '34rem' }"
      :breakpoints="{ '480px': '92vw' }"
      @update:visible="(v) => { if (!v) shareTarget = null }"
    >
      <template #header>
        <div class="share-header">
          <span class="share-title">{{ t('fileList.shareTitle') }}</span>
          <span
            v-if="shareTarget"
            class="share-subtitle"
            :title="shareTarget.original_filename"
          >
            {{ shareTarget.original_filename }}
          </span>
        </div>
      </template>

      <div v-if="shareTarget" class="share-links">
        <div class="share-panel">
          <div v-if="publicQr" class="qr-block">
            <img :src="publicQr" :alt="t('fileList.qrCodeAlt')" class="qr" />
            <span class="qr-hint">{{ t('fileList.qrScanHint') }}</span>
          </div>
          <div class="panel-head">
            <i class="pi pi-globe" />
            <span class="panel-title">{{ t('fileList.publicLink') }}</span>
          </div>
          <p class="panel-desc">{{ t('fileList.publicLinkDesc') }}</p>
          <div class="link-row">
            <InputText
              :model-value="toSharePage(shareTarget.public_url)"
              readonly
              fluid
            />
            <Button
              icon="pi pi-copy"
              severity="secondary"
              :aria-label="t('fileList.publicLink')"
              @click="copy(toSharePage(shareTarget.public_url))"
            />
          </div>
        </div>

        <div v-if="localModeAvailable" class="share-panel">
          <div v-if="localQr" class="qr-block">
            <img :src="localQr" :alt="t('fileList.qrCodeAlt')" class="qr" />
            <span class="qr-hint">{{ t('fileList.qrScanHint') }}</span>
          </div>
          <div class="panel-head">
            <i class="pi pi-wifi" />
            <span class="panel-title">{{ t('fileList.localLink') }}</span>
          </div>
          <p class="panel-desc">{{ t('fileList.localLinkDesc') }}</p>
          <div class="link-row">
            <InputText
              :model-value="toSharePage(shareTarget.local_url)"
              readonly
              fluid
            />
            <Button
              icon="pi pi-copy"
              severity="secondary"
              :aria-label="t('fileList.localLink')"
              @click="copy(toSharePage(shareTarget.local_url))"
            />
          </div>
        </div>
      </div>
    </Dialog>

    <Dialog
      :visible="editTarget !== null"
      :header="t('fileList.editFile')"
      modal
      :draggable="false"
      :style="{ width: '26rem' }"
      :breakpoints="{ '480px': '92vw' }"
      @update:visible="(v) => { if (!v) editTarget = null }"
    >
      <form v-if="editTarget" class="edit-form" @submit.prevent="submitEdit">
        <div class="field">
          <label>{{ t('upload.expiresAfter') }}</label>
          <div class="ttl-inputs">
            <InputNumber
              v-model="editForm.ttlValue"
              :min="0"
              :use-grouping="false"
              class="ttl-value"
            />
            <Select
              v-model="editForm.ttlUnit"
              :options="TTL_UNITS"
              option-label="label"
              option-value="value"
              class="ttl-unit"
            />
          </div>
          <small class="hint">{{ t('upload.neverExpires') }}</small>
        </div>

        <div class="field">
          <label>{{ t('upload.maxDownloads') }}</label>
          <InputNumber
            v-model="editForm.maxDownloads"
            :min="0"
            :use-grouping="false"
            fluid
          />
          <small class="hint">{{ t('upload.unlimited') }}</small>
        </div>

        <div class="field">
          <label>{{ t('upload.caption') }}</label>
          <InputText v-model="editForm.caption" fluid />
        </div>

        <Message v-if="editError" severity="error" variant="simple">
          {{ editError }}
        </Message>
      </form>
      <template #footer>
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          text
          @click="editTarget = null"
        />
        <Button
          :label="t('common.save')"
          icon="pi pi-check"
          :loading="editSaving"
          @click="submitEdit"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.file-list {
  width: 100%;
}

:deep(.p-dialog-header) {
  border-bottom: 1px solid var(--p-content-border-color);
}

.share-header {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.share-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.share-subtitle {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-links {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-panel {
  padding: 1.1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-hover-background);
}

/* Clearfix: the QR block floats, so the card needs to wrap its full height. */
.share-panel::after {
  content: '';
  display: table;
  clear: both;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.panel-head .pi {
  color: var(--p-primary-color);
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.panel-desc {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.link-row {
  display: flex;
  gap: 0.5rem;
}

.qr-block {
  float: right;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0.75rem 1.25rem;
}

.qr-hint {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.link-row :deep(.p-inputtext) {
  flex: 1;
  min-width: 0;
}

.qr {
  width: 88px;
  height: 88px;
  padding: 6px;
  background: #fff;
  border-radius: calc(var(--p-content-border-radius) * 0.7);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.edit-form .field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.edit-form .field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.edit-form .hint {
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
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

.head,
.row {
  display: grid;
  grid-template-columns: 1fr 8rem 6rem;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0.5rem;
}

.head {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--p-text-muted-color);
  border-bottom: 1px solid var(--p-content-border-color);
}

.row {
  border-bottom: 1px solid var(--p-content-border-color);
}

.row:hover {
  background: var(--p-content-hover-background);
}

.col-name {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--p-text-color);
}

.caption {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.1rem;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
}

.meta-item .pi {
  font-size: 0.72rem;
}

.col-size {
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.col-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
}

.empty {
  padding: 2rem 0.5rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

@media (max-width: 560px) {
  .head {
    display: none;
  }

  .row {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'name actions'
      'size actions';
    gap: 0.15rem 1rem;
    row-gap: 0.15rem;
  }

  .col-name {
    grid-area: name;
  }

  .col-size {
    grid-area: size;
    font-size: 0.85rem;
  }

  .col-actions {
    grid-area: actions;
    align-self: center;
  }
}
</style>
