<script setup lang="ts">
import DiskUsagePanel from '@/components/admin/DiskUsagePanel.vue'
import ServiceSettings from '@/components/admin/ServiceSettings.vue'
import UserManager from '@/components/admin/UserManager.vue'
</script>

<template>
  <div class="admin">
    <DiskUsagePanel />
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
