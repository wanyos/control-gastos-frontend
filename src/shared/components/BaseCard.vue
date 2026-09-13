<template>
  <section class="overflow-hidden rounded-lg border border-line-subtle bg-surface-card shadow-sm">
    <header v-if="title || $slots.action" class="flex items-start justify-between gap-3 px-5 pt-4">
      <div class="min-w-0">
        <h2 v-if="title" class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">
          {{ title }}
        </h2>
        <div v-if="subtitle || $slots.subtitle" class="mt-0.5 text-sm text-ink-muted">
          <slot name="subtitle">{{ subtitle }}</slot>
        </div>
      </div>
      <slot name="action" />
    </header>
    <div class="p-5">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
// Port of design-system/components/layout/Card.jsx, without `interactive`.
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>
