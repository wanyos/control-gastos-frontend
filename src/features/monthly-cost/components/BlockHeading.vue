<template>
  <header class="flex items-baseline justify-between gap-3">
    <h2
      class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong"
      data-test="block-title"
    >
      {{ title }}
    </h2>
    <span
      class="font-mono text-lg font-semibold text-ink-strong tabular-nums"
      data-test="block-subtotal"
    >
      {{ formatMoney(subtotal) }}
    </span>
  </header>
</template>

<script setup lang="ts">
// The heading of a block: its title on the left, what it adds up to a month on the right (R14).
import { formatMoney } from '@/shared/money'

import type { DecimalString } from '../types'

defineProps<{
  title: string
  subtotal: DecimalString
}>()
</script>
