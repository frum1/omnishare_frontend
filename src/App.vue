<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import AppHeader from '@/components/AppHeader.vue'
import ForcePasswordDialog from '@/components/ForcePasswordDialog.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <AppHeader />

  <main class="app-main">
    <div v-if="auth.loading" class="restore">
      <ProgressSpinner />
    </div>
    <div v-else class="container">
      <RouterView />
    </div>
  </main>

  <Toast position="bottom-right" />
  <ConfirmDialog :draggable="false" />
  <ForcePasswordDialog />
</template>

<style scoped>
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.container {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
  flex: 1;
}

.restore {
  flex: 1;
  display: grid;
  place-items: center;
}

@media (max-width: 640px) {
  .container {
    padding: 1.5rem 1rem;
  }
}
</style>
