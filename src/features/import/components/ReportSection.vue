<template>
  <details :data-test="`report-section-${id}`">
    <summary class="cursor-pointer text-base font-semibold text-ink-strong">
      <span data-test="report-section-title">{{ title }}</span>
      <BaseBadge
        :tone="tone"
        size="sm"
        class="ml-2 font-mono tabular-nums"
        data-test="report-section-count"
      >
        {{ count }}
      </BaseBadge>
    </summary>
    <div class="mt-2">
      <slot />
    </div>
  </details>
</template>

<script setup lang="ts">
// One foldable section of the report detail: a native <details>, closed when the
// summary appears, with its title and count. Keyboard access comes from the browser.
import BaseBadge from '@/shared/components/BaseBadge.vue'

withDefaults(
  defineProps<{ id: string; title: string; count: number; tone?: 'warning' | 'neutral' }>(),
  { tone: 'warning' },
)
</script>
