<script setup lang="ts">
import ServiceSettings from '@/components/admin/ServiceSettings.vue'
import UserManager from '@/components/admin/UserManager.vue'
</script>

<template>
  <div class="admin">
    <ServiceSettings />
    <UserManager />
  </div>
</template>

<style scoped>
.admin {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>
