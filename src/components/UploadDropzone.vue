<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps<{
  /** Max total size hint shown in the subtitle, in MB. */
  maxSizeMb?: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  files: [files: File[]];
}>();

const input = ref<HTMLInputElement>();
const dragging = ref(false);

function openPicker(): void {
  if (!props.disabled) input.value?.click();
}

function onInputChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  emitFiles(target.files);
  target.value = ""; // allow re-selecting the same file
}

function onDrop(event: DragEvent): void {
  dragging.value = false;
  if (props.disabled) return;
  emitFiles(event.dataTransfer?.files);
}

function emitFiles(list: FileList | null | undefined): void {
  if (!list || !list.length) return;
  emit("files", Array.from(list));
}

// Paste is a keyboard event with no click target, so it's captured on the
// window rather than the dropzone element — the user shouldn't have to
// click into the dropzone first just to give it focus.
function onPaste(event: ClipboardEvent): void {
  if (props.disabled) return;
  const files = event.clipboardData?.files;
  if (!files || !files.length) return;
  // Only claim the paste when it actually carries files, so pasting text
  // into an unrelated input elsewhere on the page is left alone.
  event.preventDefault();
  emitFiles(files);
}

onMounted(() => window.addEventListener("paste", onPaste));
onUnmounted(() => window.removeEventListener("paste", onPaste));

function sizeHint(): string {
  if (!props.maxSizeMb) return "";
  const gb = props.maxSizeMb / 1024;
  const limit =
    gb >= 1
      ? `${(Math.round(gb * 10) / 10).toString()} GB`
      : `${props.maxSizeMb} MB`;
  return `${t("admin.uploadSizeLimit", { limit })}`;
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ dragging, disabled }"
    role="button"
    tabindex="0"
    @click="openPicker"
    @keydown.enter.prevent="openPicker"
    @keydown.space.prevent="openPicker"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <i class="pi pi-cloud-upload icon" />
    <h2 class="title">{{ t("admin.uploadFileTitle") }}</h2>
    <p class="subtitle">
      {{ t("admin.uploadFile") }}
      <br />
      {{ sizeHint() }}
    </p>

    <input
      ref="input"
      type="file"
      hidden
      :disabled="disabled"
      @change="onInputChange"
    />
  </div>
</template>

<style scoped>
.dropzone {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1.5rem;
  border: 2px dashed var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.dropzone:hover,
.dropzone:focus-visible {
  border-color: var(--p-primary-color);
  outline: none;
}

.dropzone.dragging {
  border-color: var(--p-primary-color);
  background: var(--p-highlight-background);
}

.dropzone.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon {
  font-size: 2.75rem;
  color: var(--p-primary-color);
}

.title {
  margin: 0.5rem 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.subtitle {
  margin: 0;
  max-width: 32rem;
  color: var(--p-text-muted-color);
}
</style>
