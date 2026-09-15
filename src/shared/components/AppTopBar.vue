<template>
  <header
    class="sticky top-0 z-[var(--z-sticky)] flex h-[var(--topbar-h)] items-center gap-4 border-b border-line-subtle bg-surface-app/85 px-7 backdrop-blur-sm backdrop-saturate-150"
  >
    <h1 class="font-display text-xl font-bold text-ink-strong" data-test="topbar-title">
      {{ title }}
    </h1>
    <div class="ml-auto flex items-center gap-3">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => route.meta.label ?? '')
</script>
