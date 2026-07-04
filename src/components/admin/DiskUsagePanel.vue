<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ProgressBar from "primevue/progressbar";
import { ApiError, filesApi, type DiskUsage } from "@/api";
import { formatBytes } from "@/utils/format";

const data = ref<DiskUsage | null>(null);
const loading = ref(true);
const error = ref("");

const percent = computed(() =>
  data.value && data.value.total_bytes > 0
    ? Math.min(
        100,
        Math.round((data.value.used_bytes / data.value.total_bytes) * 100),
      )
    : 0,
);
const nearFull = computed(() => percent.value >= 90);

onMounted(async () => {
  try {
    data.value = await filesApi.diskUsage();
  } catch (err) {
    error.value =
      err instanceof ApiError ? err.detail : "Could not load disk usage.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="disk">
    <div class="head">
      <h2 class="section-title">
        <i class="pi pi-server" />
        Disk space
      </h2>
    </div>

    <div v-if="loading" class="muted">Loading…</div>
    <div v-else-if="error" class="muted">{{ error }}</div>

    <template v-else-if="data">
      <ProgressBar
        :value="percent"
        :show-value="false"
        :class="{ 'disk-full': nearFull }"
      />
      <div class="foot">
        <span>{{ formatBytes(data.used_bytes) }} used ({{ percent }}%)</span>
        <span>{{ formatBytes(data.total_bytes) }} total</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.disk {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  padding: 1.5rem;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.section-title .pi {
  color: var(--p-primary-color);
}

.free {
  font-size: 0.95rem;
  color: var(--p-text-muted-color);
}

.free.warn {
  color: var(--p-red-500);
}

.foot {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.muted {
  color: var(--p-text-muted-color);
}

.disk :deep(.p-progressbar) {
  height: 0.6rem;
}

.disk :deep(.disk-full .p-progressbar-value) {
  background: var(--p-red-500);
}
</style>
