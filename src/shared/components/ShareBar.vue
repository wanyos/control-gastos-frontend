<template>
  <div class="h-1.5 overflow-hidden rounded-pill bg-surface-sunken" aria-hidden="true">
    <div
      class="h-full rounded-pill transition-[width] duration-[var(--dur-slow)]"
      :class="fillClass"
      :style="{ width }"
      data-test="share-bar-fill"
    />
  </div>
</template>

<script setup lang="ts">
// Track + fill of design-system ProgressBar/CategoryBar, without budget logic.
import { computed } from 'vue'

const props = defineProps<{
  /** Tenths of a percentage point (383 = 38,3 %); clamped to 0..1000. */
  permille: number
  /** Full literal utility for the fill color, e.g. a chart color. */
  fillClass: string
}>()

const width = computed(() => `${Math.min(Math.max(props.permille, 0), 1000) / 10}%`)
</script>
