<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import FileList from '@/components/FileList.vue'
import {
  ApiError,
  filesApi,
  usersApi,
  type FileOut,
  type User,
} from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

const users = ref<User[]>([])
const filesByUser = ref<Record<string, FileOut[]>>({})
const loading = ref(true)

// --- Create user dialog ---
const createOpen = ref(false)
const createForm = ref({ username: '', password: '', is_admin: false })
const creating = ref(false)
const createError = ref('')

// --- Reset password result dialog ---
const resetResult = ref<{ username: string; temporary_password: string } | null>(
  null,
)

onMounted(load)

async function load(): Promise<void> {
  loading.value = true
  try {
    const [userList, files] = await Promise.all([
      usersApi.list(),
      filesApi.list(),
    ])
    users.value = userList
    // Admin file list is grouped by owner id; regular arrays shouldn't occur here.
    filesByUser.value = Array.isArray(files) ? {} : files
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Could not load users',
      detail: err instanceof ApiError ? err.detail : 'Please try again.',
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  createForm.value = { username: '', password: '', is_admin: false }
  createError.value = ''
  createOpen.value = true
}

async function submitCreate(): Promise<void> {
  if (!createForm.value.username || !createForm.value.password) {
    createError.value = 'Username and password are required.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const user = await usersApi.create({ ...createForm.value })
    users.value.push(user)
    createOpen.value = false
    toast.add({
      severity: 'success',
      summary: `User "${user.username}" created`,
      life: 2500,
    })
  } catch (err) {
    createError.value =
      err instanceof ApiError && err.status === 409
        ? 'A user with this username already exists.'
        : err instanceof ApiError
          ? err.detail
          : 'Something went wrong. Please try again.'
  } finally {
    creating.value = false
  }
}

async function resetPassword(user: User): Promise<void> {
  try {
    resetResult.value = await usersApi.resetPassword(user.id)
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Could not reset password',
      detail: err instanceof ApiError ? err.detail : 'Please try again.',
      life: 4000,
    })
  }
}

function deleteUser(user: User): void {
  confirm.require({
    header: 'Delete user',
    message: `Delete "${user.username}" and all their files? This can't be undone.`,
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Delete', severity: 'danger' },
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await usersApi.remove(user.id)
        users.value = users.value.filter((u) => u.id !== user.id)
        delete filesByUser.value[user.id]
        toast.add({ severity: 'success', summary: 'User deleted', life: 2500 })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Could not delete user',
          detail: err instanceof ApiError ? err.detail : 'Please try again.',
          life: 4000,
        })
      }
    },
  })
}

function deleteFile(user: User, file: FileOut): void {
  confirm.require({
    header: 'Delete file',
    message: `Delete "${file.original_filename}"? This can't be undone.`,
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Delete', severity: 'danger' },
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await filesApi.remove(file.id)
        filesByUser.value[user.id] = (filesByUser.value[user.id] ?? []).filter(
          (f) => f.id !== file.id,
        )
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

async function copyTempPassword(): Promise<void> {
  if (!resetResult.value) return
  try {
    await navigator.clipboard.writeText(resetResult.value.temporary_password)
    toast.add({ severity: 'success', summary: 'Password copied', life: 2000 })
  } catch {
    // ignore — the value is visible for manual copy
  }
}

const isSelf = (user: User) => user.id === auth.user?.id
const userFiles = (id: string): FileOut[] => filesByUser.value[id] ?? []
</script>

<template>
  <section class="users">
    <h2 class="section-title">Users</h2>

    <!-- Create user card -->
    <button class="create-card" @click="openCreate">
      <i class="pi pi-plus" />
      <span>Create user</span>
    </button>

    <div v-if="loading" class="loading">Loading…</div>

    <Accordion v-else :multiple="true" class="user-accordion">
      <AccordionPanel v-for="user in users" :key="user.id" :value="user.id">
        <AccordionHeader>
          <span class="user-head">
            <i class="pi pi-user" />
            <span class="username">{{ user.username }}</span>
            <Tag v-if="user.is_admin" value="Admin" severity="info" />
            <Tag v-if="isSelf(user)" value="You" severity="secondary" />
          </span>
        </AccordionHeader>
        <AccordionContent>
          <div class="panel-body">
            <div class="actions-block">
              <h3 class="block-title">Actions</h3>
              <div class="action-buttons">
                <Button
                  label="Reset password"
                  icon="pi pi-key"
                  severity="secondary"
                  outlined
                  size="small"
                  @click="resetPassword(user)"
                />
                <Button
                  label="Delete user"
                  icon="pi pi-trash"
                  severity="danger"
                  outlined
                  size="small"
                  :disabled="isSelf(user)"
                  v-tooltip.top="isSelf(user) ? 'You cannot delete your own account' : undefined"
                  @click="deleteUser(user)"
                />
              </div>
            </div>

            <div class="files-block">
              <h3 class="block-title">Files</h3>
              <FileList
                :files="userFiles(user.id)"
                empty-text="This user has no files."
                @delete="(file) => deleteFile(user, file)"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>

    <!-- Create user dialog -->
    <Dialog
      v-model:visible="createOpen"
      header="Create user"
      modal
      :style="{ width: '25rem' }"
    >
      <form class="dialog-form" @submit.prevent="submitCreate">
        <div class="field">
          <label for="new-username">Username</label>
          <InputText id="new-username" v-model="createForm.username" fluid />
        </div>
        <div class="field">
          <label for="new-password">Password</label>
          <Password
            input-id="new-password"
            v-model="createForm.password"
            :feedback="false"
            toggle-mask
            fluid
          />
        </div>
        <div class="checkbox-row">
          <Checkbox
            input-id="new-admin"
            v-model="createForm.is_admin"
            binary
          />
          <label for="new-admin">Administrator</label>
        </div>
        <Message v-if="createError" severity="error" variant="simple">
          {{ createError }}
        </Message>
      </form>
      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          text
          @click="createOpen = false"
        />
        <Button label="Create" icon="pi pi-check" :loading="creating" @click="submitCreate" />
      </template>
    </Dialog>

    <!-- Reset password result dialog -->
    <Dialog
      :visible="resetResult !== null"
      header="Temporary password"
      modal
      :style="{ width: '25rem' }"
      @update:visible="(v) => { if (!v) resetResult = null }"
    >
      <p class="reset-note">
        Share this one-time password with
        <strong>{{ resetResult?.username }}</strong>. They must change it on next
        login.
      </p>
      <div class="temp-password">
        <code>{{ resetResult?.temporary_password }}</code>
        <Button
          icon="pi pi-copy"
          severity="secondary"
          text
          rounded
          aria-label="Copy password"
          @click="copyTempPassword"
        />
      </div>
      <template #footer>
        <Button label="Done" @click="resetResult = null" />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.users {
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

.create-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
  border: 2px dashed var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: transparent;
  color: var(--p-text-muted-color);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.create-card:hover {
  border-color: var(--p-primary-color);
  color: var(--p-primary-color);
}

/* The default accordion header focus ring uses a -1px inset outline, which
   draws a thick box around the whole user row (and lingers after a click in
   browsers that apply :focus-visible on pointer). Drop the boxy outline and
   indicate keyboard focus with a subtle background instead. */
.user-accordion :deep(.p-accordionheader) {
  outline: none;
  box-shadow: none;
}

.user-accordion :deep(.p-accordionheader:focus-visible) {
  background: var(--p-content-hover-background);
}

.user-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.username {
  font-weight: 500;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.block-title {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--p-text-muted-color);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dialog-form {
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
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reset-note {
  margin: 0 0 1rem;
  color: var(--p-text-muted-color);
}

.temp-password {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--p-content-border-radius);
  background: var(--p-highlight-background);
}

.temp-password code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 1rem;
  word-break: break-all;
  color: var(--p-text-color);
}

.loading {
  color: var(--p-text-muted-color);
}
</style>
