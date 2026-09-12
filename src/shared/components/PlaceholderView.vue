<template>
  <section
    class="rounded-lg border border-line-subtle bg-surface-card p-6 shadow-sm"
    data-test="placeholder"
  >
    <h2 class="font-display text-lg font-bold text-ink-strong">{{ title }}</h2>
    <p class="mt-2 text-sm text-ink-muted">{{ note ?? `${title} is not built yet.` }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{
  /** Overrides the default "not built yet" line. */
  note?: string
}>()

const route = useRoute()

const title = computed(() => route.meta.label ?? '')
</script>
