<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { ApiError, settingsApi, type Settings } from "@/api";

const toast = useToast();
const { t } = useI18n();

const form = ref<Settings | null>(null);
const loading = ref(true);
const saving = ref(false);

// Max file size is stored in MB by the API; expose a MB/GB unit picker.
// The unit value is a multiplier in MB terms (GB = 1024 MB).
const SIZE_UNITS = computed(() => [
  { label: "MB", value: 1 },
  { label: "GB", value: 1024 },
]);
const sizeValue = ref(1);
const sizeUnit = ref(1);

function initSizeFields(mb: number): void {
  // Show GB when it divides evenly into whole GBs, otherwise MB.
  if (mb >= 1024 && mb % 1024 === 0) {
    sizeUnit.value = 1024;
    sizeValue.value = mb / 1024;
  } else {
    sizeUnit.value = 1;
    sizeValue.value = mb;
  }
}

onMounted(async () => {
  try {
    form.value = await settingsApi.get();
    initSizeFields(form.value.max_file_size_mb);
  } catch (err) {
    toast.add({
      severity: "error",
      summary: t("admin.couldNotLoadSettings"),
      detail: err instanceof ApiError ? err.detail : t("common.error"),
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
});

async function save(): Promise<void> {
  if (!form.value) return;
  // Fold the MB/GB picker back into the API's MB field.
  form.value.max_file_size_mb = Math.round(sizeValue.value * sizeUnit.value);
  saving.value = true;
  try {
    form.value = await settingsApi.update(form.value);
    initSizeFields(form.value.max_file_size_mb);
    toast.add({
      severity: "success",
      summary: t("admin.settingsSaved"),
      life: 2500,
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: t("admin.couldNotSaveSettings"),
      detail: err instanceof ApiError ? err.detail : t("common.error"),
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="settings">
    <h2 class="section-title">
      <i class="pi pi-cog" />
      {{ t("admin.serviceConfiguration") }}
    </h2>

    <div v-if="loading" class="loading">{{ t("common.loading") }}</div>

    <form v-else-if="form" class="grid" @submit.prevent="save">
      <div class="field span-2">
        <label for="public-url">{{ t("admin.publicBaseUrl") }}</label>
        <span class="hint">{{ t("admin.publicBaseUrlHint") }}</span>
        <InputText id="public-url" v-model="form.public_base_url" fluid />
      </div>

      <div class="field span-2 toggle-field">
        <div class="toggle-row">
          <ToggleSwitch v-model="form.local_mode" input-id="show-local-link" />
          <div class="toggle-labels">
            <label for="show-local-link">{{ t("admin.showLocalLink") }}</label>
            <span class="hint">{{ t("admin.showLocalLinkHint") }}</span>
          </div>
        </div>
      </div>

      <div v-if="form.local_mode" class="field span-2">
        <label for="local-url">{{ t("admin.localBaseUrl") }}</label>
        <span class="hint">{{ t("admin.localBaseUrlHint") }}</span>
        <InputText id="local-url" v-model="form.local_base_url" fluid />
      </div>

      <div class="field">
        <label for="local-port">{{ t("admin.localPort") }}</label>
        <span class="hint">{{ t("admin.localPortHint") }}</span>
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
        <label for="max-size">{{ t("admin.maxFileSize") }}</label>
        <span class="hint">{{ t("admin.maxFileSizeHint") }}</span>
        <div class="size-inputs">
          <InputNumber
            input-id="max-size"
            v-model="sizeValue"
            :min="1"
            :use-grouping="false"
            class="size-value"
          />
          <Select
            v-model="sizeUnit"
            :options="SIZE_UNITS"
            option-label="label"
            option-value="value"
            class="size-unit"
          />
        </div>
      </div>

      <div class="field">
        <label for="cleanup">{{ t("admin.cleanupInterval") }}</label>
        <span class="hint">{{ t("admin.cleanupIntervalHint") }}</span>
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
          :label="t('admin.saveChanges')"
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

.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-labels {
  display: flex;
  flex-direction: column;
}

.toggle-labels label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--p-text-color);
  cursor: pointer;
}

.hint {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.size-inputs {
  display: flex;
  gap: 0.5rem;
}

.size-value {
  flex: 1;
}

.size-unit {
  flex: 0 0 6rem;
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
