<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
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
import { formatBytes } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()

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

// --- Change quota dialog ---
const MB = 1024 * 1024
const GB = 1024 * MB
const QUOTA_UNITS = [
  { label: 'MB', value: MB },
  { label: 'GB', value: GB },
]
const quotaTarget = ref<User | null>(null)
const quotaUnlimited = ref(false)
const quotaValue = ref(1)
const quotaUnit = ref(GB)
const quotaSaving = ref(false)
const quotaError = ref('')

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
      summary: t('admin.couldNotLoadUsers'),
      detail: err instanceof ApiError ? err.detail : t('common.error'),
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
    createError.value = t('admin.usernameAndPasswordRequired')
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
      summary: t('admin.userCreated', { username: user.username }),
      life: 2500,
    })
  } catch (err) {
    createError.value =
      err instanceof ApiError && err.status === 409
        ? t('admin.userAlreadyExists')
        : err instanceof ApiError
          ? err.detail
          : t('common.error')
  } finally {
    creating.value = false
  }
}

function resetPassword(user: User): void {
  confirm.require({
    header: t('admin.resetPassword'),
    message: t('admin.resetPasswordConfirm', { username: user.username }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('admin.resetPassword'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        resetResult.value = await usersApi.resetPassword(user.id)
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: t('admin.resetPassword'),
          detail: err instanceof ApiError ? err.detail : t('common.error'),
          life: 4000,
        })
      }
    },
  })
}

function openQuota(user: User): void {
  quotaError.value = ''
  if (user.quota_bytes == null) {
    // Currently unlimited: default the form to a sensible starting value.
    quotaUnlimited.value = true
    quotaValue.value = 1
    quotaUnit.value = GB
  } else {
    quotaUnlimited.value = false
    // Show GB for large quotas, MB otherwise, keeping the number readable.
    const unit = user.quota_bytes >= GB ? GB : MB
    quotaUnit.value = unit
    quotaValue.value = Math.round((user.quota_bytes / unit) * 100) / 100
  }
  quotaTarget.value = user
}

async function submitQuota(): Promise<void> {
  const user = quotaTarget.value
  if (!user) return

  const bytes = quotaUnlimited.value
    ? null
    : Math.round(quotaValue.value * quotaUnit.value)

  if (bytes !== null && bytes <= 0) {
    quotaError.value = t('admin.enterQuotaGreaterThanZero')
    return
  }

  quotaSaving.value = true
  quotaError.value = ''
  try {
    const updated = await usersApi.setQuota(user.id, bytes)
    // Reflect the new quota in the list (used_bytes is unchanged).
    user.quota_bytes = updated.quota_bytes ?? bytes
    quotaTarget.value = null
    toast.add({ severity: 'success', summary: t('admin.quotaUpdated'), life: 2500 })
  } catch (err) {
    quotaError.value =
      err instanceof ApiError ? err.detail : t('common.error')
  } finally {
    quotaSaving.value = false
  }
}

function deleteUser(user: User): void {
  confirm.require({
    header: t('admin.deleteUser'),
    message: t('admin.userDeleteConfirm', { username: user.username }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await usersApi.remove(user.id)
        users.value = users.value.filter((u) => u.id !== user.id)
        delete filesByUser.value[user.id]
        toast.add({ severity: 'success', summary: t('admin.userDeleted'), life: 2500 })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: t('admin.couldNotDeleteUser'),
          detail: err instanceof ApiError ? err.detail : t('common.error'),
          life: 4000,
        })
      }
    },
  })
}

function deleteFile(user: User, file: FileOut): void {
  confirm.require({
    header: t('dashboard.deleteFile'),
    message: t('admin.fileDeleteConfirm', { filename: file.original_filename }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await filesApi.remove(file.id)
        filesByUser.value[user.id] = (filesByUser.value[user.id] ?? []).filter(
          (f) => f.id !== file.id,
        )
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

async function copyTempPassword(): Promise<void> {
  if (!resetResult.value) return
  try {
    await navigator.clipboard.writeText(resetResult.value.temporary_password)
    toast.add({ severity: 'success', summary: t('admin.passwordCopied'), life: 2000 })
  } catch {
    // ignore — the value is visible for manual copy
  }
}

const isSelf = (user: User) => user.id === auth.user?.id
const userFiles = (id: string): FileOut[] => filesByUser.value[id] ?? []

/** "used / quota" label from the API's per-user usage (∞ when unlimited). */
const usageLabel = (user: User): string => {
  const used = formatBytes(user.used_bytes ?? 0)
  const quota = user.quota_bytes == null ? '∞' : formatBytes(user.quota_bytes)
  return `${used} / ${quota}`
}
</script>

<template>
  <section class="users">
    <h2 class="section-title">
      <i class="pi pi-users" />
      {{ t('admin.users') }}
    </h2>

    <!-- Create user card -->
    <button class="create-card" @click="openCreate">
      <i class="pi pi-plus" />
      <span>{{ t('admin.createUser') }}</span>
    </button>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>

    <Accordion v-else :multiple="true" class="user-accordion">
      <AccordionPanel v-for="user in users" :key="user.id" :value="user.id">
        <AccordionHeader>
          <span class="user-head">
            <i class="pi pi-user" />
            <span class="username">{{ user.username }}</span>
            <Tag v-if="user.is_admin" :value="t('admin.admin')" severity="info" />
            <Tag v-if="isSelf(user)" :value="t('admin.you')" severity="secondary" />
            <span class="user-stats">
              <span class="stat">
                <i class="pi pi-file" />
                {{ userFiles(user.id).length }}
              </span>
              <span class="stat">
                <i class="pi pi-database" />
                {{ usageLabel(user) }}
              </span>
            </span>
          </span>
        </AccordionHeader>
        <AccordionContent>
          <div class="panel-body">
            <div class="actions-block">
              <h3 class="block-title">{{ t('admin.actions') }}</h3>
              <div class="action-buttons">
                <Button
                  :label="t('admin.changeQuota')"
                  icon="pi pi-database"
                  severity="secondary"
                  outlined
                  size="small"
                  @click="openQuota(user)"
                />
                <Button
                  :label="t('admin.resetPassword')"
                  icon="pi pi-key"
                  severity="secondary"
                  outlined
                  size="small"
                  @click="resetPassword(user)"
                />
                <Button
                  :label="t('admin.deleteUser')"
                  icon="pi pi-trash"
                  severity="danger"
                  outlined
                  size="small"
                  :disabled="isSelf(user)"
                  v-tooltip.top="isSelf(user) ? t('admin.cannotDeleteOwnAccount') : undefined"
                  @click="deleteUser(user)"
                />
              </div>
            </div>

            <div class="files-block">
              <h3 class="block-title">{{ t('admin.files') }}</h3>
              <FileList
                :files="userFiles(user.id)"
                :empty-text="t('admin.userHasNoFiles')"
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
      :header="t('admin.createUserTitle')"
      modal
      :draggable="false"
      :style="{ width: '25rem' }"
    >
      <form class="dialog-form" @submit.prevent="submitCreate">
        <div class="field">
          <label for="new-username">{{ t('common.username') }}</label>
          <InputText id="new-username" v-model="createForm.username" fluid />
        </div>
        <div class="field">
          <label for="new-password">{{ t('common.password') }}</label>
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
          <label for="new-admin">{{ t('admin.adminCheckbox') }}</label>
        </div>
        <Message v-if="createError" severity="error" variant="simple">
          {{ createError }}
        </Message>
      </form>
      <template #footer>
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          text
          @click="createOpen = false"
        />
        <Button :label="t('common.save')" icon="pi pi-check" :loading="creating" @click="submitCreate" />
      </template>
    </Dialog>

    <!-- Reset password result dialog -->
    <Dialog
      :visible="resetResult !== null"
      :header="t('admin.temporaryPassword')"
      modal
      :draggable="false"
      :style="{ width: '25rem' }"
      @update:visible="(v) => { if (!v) resetResult = null }"
    >
      <p class="reset-note">
        {{ t('admin.sharePasswordWith', { username: resetResult?.username || '' }) }}
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
        <Button :label="t('admin.done')" icon="pi pi-check" @click="resetResult = null" />
      </template>
    </Dialog>

    <!-- Change quota dialog -->
    <Dialog
      :visible="quotaTarget !== null"
      :header="t('admin.changeQuotaTitle')"
      modal
      :draggable="false"
      :style="{ width: '25rem' }"
      :breakpoints="{ '480px': '92vw' }"
      @update:visible="(v) => { if (!v) quotaTarget = null }"
    >
      <form class="dialog-form" @submit.prevent="submitQuota">
        <p class="quota-note">
          {{ t('admin.quotaNote', { username: quotaTarget?.username || '' }) }}
        </p>

        <div class="checkbox-row">
          <Checkbox input-id="q-unlimited" v-model="quotaUnlimited" binary />
          <label for="q-unlimited">{{ t('admin.noLimit') }}</label>
        </div>

        <div v-if="!quotaUnlimited" class="field">
          <label>{{ t('admin.changeQuota') }}</label>
          <div class="quota-inputs">
            <InputNumber
              v-model="quotaValue"
              :min="0"
              :min-fraction-digits="0"
              :max-fraction-digits="2"
              class="quota-value"
            />
            <Select
              v-model="quotaUnit"
              :options="QUOTA_UNITS"
              option-label="label"
              option-value="value"
              class="quota-unit"
            />
          </div>
        </div>

        <Message v-if="quotaError" severity="error" variant="simple">
          {{ quotaError }}
        </Message>
      </form>
      <template #footer>
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          text
          @click="quotaTarget = null"
        />
        <Button
          :label="t('common.save')"
          icon="pi pi-check"
          :loading="quotaSaving"
          @click="submitQuota"
        />
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
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.25rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.section-title .pi {
  color: var(--p-primary-color);
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
  flex: 1;
  min-width: 0;
}

.user-stats {
  margin-left: auto;
  display: flex;
  gap: 1rem;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.user-stats .stat {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
}

.user-stats .stat .pi {
  font-size: 0.75rem;
}

@media (max-width: 480px) {
  .user-stats {
    display: none;
  }
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

.quota-note {
  margin: 0;
  color: var(--p-text-muted-color);
}

.quota-inputs {
  display: flex;
  gap: 0.5rem;
}

.quota-value {
  flex: 1;
}

.quota-unit {
  flex: 0 0 6rem;
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
