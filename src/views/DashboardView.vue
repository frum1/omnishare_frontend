<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import UploadStaging from '@/components/UploadStaging.vue'
import FileList from '@/components/FileList.vue'
import { ApiError, filesApi, type FileOut } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

const files = ref<FileOut[]>([])
const loading = ref(true)

onMounted(loadFiles)

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
      summary: 'Could not load files',
      detail: err instanceof ApiError ? err.detail : 'Please try again.',
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
    header: 'Delete file',
    message: `Delete "${file.original_filename}"? This can't be undone.`,
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Delete', severity: 'danger' },
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await filesApi.remove(file.id)
        files.value = files.value.filter((f) => f.id !== file.id)
        toast.add({ severity: 'success', summary: 'File deleted', life: 2500 })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Could not delete file',
          detail: err instanceof ApiError ? err.detail : 'Please try again.',
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

    <FileList
      :files="files"
      empty-text="No files uploaded yet. Drop some above to get started."
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
