<template>
  <div class="relative h-1.5 w-full rounded-pill bg-surface-sunken" aria-hidden="true">
    <div class="absolute inset-y-0 left-1/2 w-px bg-line-default" data-test="gain-bar-centre" />
    <div
      v-if="side !== 'none'"
      class="absolute inset-y-0"
      :class="FILLS[side]"
      :style="{ width }"
      :data-side="side"
      data-test="gain-bar-fill"
    />
  </div>
</template>

<script setup lang="ts">
// Two-sided bar of a live investment (feature 40, R6): green from the centre line to the
// right for a gain, red to the left for a loss. Hidden from assistive technology: the
// figure is written next to it.
import { computed } from 'vue'

const props = defineProps<{
  side: 'gain' | 'loss' | 'none'
  /** Tenths of a percentage point of the biggest gain or loss; 1000 fills one half. */
  permille: number
}>()

// Full literal class names: Tailwind scans source as text (docs/stack.md).
const FILLS = {
  gain: 'left-1/2 rounded-r-pill bg-positive',
  loss: 'right-1/2 rounded-l-pill bg-negative',
} as const

const width = computed(() => `${Math.min(Math.max(props.permille, 0), 1000) / 20}%`)
</script>
