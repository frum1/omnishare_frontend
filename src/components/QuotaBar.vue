<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'
import { formatBytes } from '@/utils/format'

const props = defineProps<{
  used: number
  /** null = unlimited (no bar, just the used total). */
  quota: number | null
}>()

const percent = computed(() =>
  props.quota && props.quota > 0
    ? Math.min(100, Math.round((props.used / props.quota) * 100))
    : 0,
)

// Warn as the user approaches the limit.
const nearLimit = computed(() => props.quota !== null && percent.value >= 90)
</script>

<template>
  <div class="quota">
    <div class="quota-head">
      <span class="label">
        <i class="pi pi-database" />
        Storage
      </span>
      <span class="value" :class="{ warn: nearLimit }">
        {{ formatBytes(used) }} / {{ quota === null ? '∞' : formatBytes(quota) }}
        <span v-if="quota !== null" class="percent">({{ percent }}%)</span>
      </span>
    </div>
    <ProgressBar
      v-if="quota !== null"
      :value="percent"
      :show-value="false"
      :class="{ 'quota-full': nearLimit }"
    />
  </div>
</template>

<style scoped>
.quota {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quota-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.value {
  color: var(--p-text-color);
}

.value.warn {
  color: var(--p-red-500);
}

.percent {
  color: var(--p-text-muted-color);
}

.quota :deep(.p-progressbar) {
  height: 0.5rem;
}

/* Turn the bar red near the limit. */
.quota :deep(.quota-full .p-progressbar-value) {
  background: var(--p-red-500);
}
</style>
