<template>
  <div class="flex min-h-screen">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopBar />
      <main class="mx-auto w-full max-w-[var(--container-max)] flex-1 p-7">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppSidebar from './AppSidebar.vue'
import AppTopBar from './AppTopBar.vue'
</script>
