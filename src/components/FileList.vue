<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import type { FileOut } from '@/api'
import {
  formatBytes,
  formatDownloads,
  formatExpiry,
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

function openShare(file: FileOut): void {
  shareTarget.value = file
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
      :header="t('fileList.shareLinks')"
      modal
      :style="{ width: '30rem' }"
      :breakpoints="{ '480px': '90vw' }"
      @update:visible="(v) => { if (!v) shareTarget = null }"
    >
      <div v-if="shareTarget" class="share-links">
        <div class="share-link">
          <label>{{ t('fileList.publicLink') }}</label>
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

        <div class="share-link">
          <label>{{ t('fileList.localLink') }}</label>
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
  </div>
</template>

<style scoped>
.file-list {
  width: 100%;
}

.share-links {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.share-link {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.share-link label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.link-row {
  display: flex;
  gap: 0.5rem;
}

.link-row :deep(.p-inputtext) {
  flex: 1;
  min-width: 0;
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
