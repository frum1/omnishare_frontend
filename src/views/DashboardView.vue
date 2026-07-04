<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import UploadStaging from '@/components/UploadStaging.vue'
import FileList from '@/components/FileList.vue'
import QuotaBar from '@/components/QuotaBar.vue'
import { ApiError, filesApi, type FileOut } from '@/api'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()

const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

const files = ref<FileOut[]>([])
const loading = ref(true)

// Quota comes from the API; usage is derived from the file list so the bar
// updates instantly on upload/delete without another request.
const quotaBytes = ref<number | null>(null)
const usageAvailable = ref(false)
const usedBytes = computed(() =>
  files.value.reduce((sum, f) => sum + f.size_bytes, 0),
)

onMounted(() => {
  loadFiles()
  loadUsage()
})

async function loadUsage(): Promise<void> {
  try {
    const usage = await filesApi.usage()
    quotaBytes.value = usage.quota_bytes
    usageAvailable.value = true
  } catch {
    // Non-fatal: the quota bar simply stays hidden.
  }
}

async function loadFiles(): Promise<void> {
  loading.value = true
  try {
    const result = await filesApi.list()
    // Admins get files grouped by owner; the Upload tab shows only own files.
    files.value = Array.isArray(result)
      ? result
      : (result[auth.user?.id ?? ''] ?? [])
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('dashboard.couldNotLoadFiles'),
      detail: err instanceof ApiError ? err.detail : t('common.error'),
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}

function onUploaded(file: FileOut): void {
  files.value.unshift(file)
}

function onDelete(file: FileOut): void {
  confirm.require({
    header: t('dashboard.deleteFile'),
    message: t('dashboard.deleteFileConfirm', { filename: file.original_filename }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await filesApi.remove(file.id)
        files.value = files.value.filter((f) => f.id !== file.id)
        toast.add({ severity: 'success', summary: t('dashboard.fileDeleted'), life: 2500 })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: t('dashboard.couldNotDeleteFile'),
          detail: err instanceof ApiError ? err.detail : t('common.error'),
          life: 4000,
        })
      }
    },
  })
}
</script>

<template>
  <div class="dashboard">
    <UploadStaging @uploaded="onUploaded" />

    <QuotaBar v-if="usageAvailable" :used="usedBytes" :quota="quotaBytes" />

    <FileList
      :files="files"
      :empty-text="t('dashboard.noFilesYet')"
      @delete="onDelete"
    />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>
