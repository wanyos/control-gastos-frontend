<template>
  <div
    class="flex items-center gap-3.5 rounded-lg border border-line-subtle bg-surface-card p-3.5 shadow-xs"
    data-test="holding-row"
  >
    <span
      class="inline-flex size-[42px] flex-none items-center justify-center rounded-md font-display text-base font-extrabold text-ink-on-brand"
      :class="tileClass"
      aria-hidden="true"
    >
      {{ initial }}
    </span>
    <div class="min-w-0 flex-1">
      <div class="truncate text-base font-semibold text-ink-strong">{{ name }}</div>
      <div class="mt-px flex flex-wrap items-center gap-x-1.5 text-xs text-ink-muted">
        <span>{{ typeLabel }}</span>
        <span v-if="last4" class="font-mono">···· {{ last4 }}</span>
        <span v-if="detail" data-test="holding-date">{{ detail }}</span>
      </div>
    </div>
    <div class="text-right">
      <span v-if="amount === null" class="text-sm text-ink-faint" data-test="value-gap">
        No valuation
      </span>
      <span
        v-else
        class="font-mono text-md font-semibold tracking-[-0.01em] whitespace-nowrap tabular-nums"
        :class="isNegative ? 'text-negative' : 'text-ink-strong'"
        data-test="money"
      >
        {{ formatMoney(amount) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Port of design-system/components/finance/AccountCard.jsx as a non-interactive
// row for an account or a product. A `null` amount is a gap, never a zero.
import { computed } from 'vue'

import { formatMoney, toCents } from '@/shared/money'

import type { DecimalString } from '../types'

const props = defineProps<{
  name: string
  typeLabel: string
  amount: DecimalString | null
  /** Letter shown in the colored tile. */
  initial: string
  /** Full literal utility for the tile color. */
  tileClass: string
  last4?: string
  /** Date line, e.g. `Valued 29 Aug 2026`. */
  detail?: string
}>()

const isNegative = computed(() => props.amount !== null && toCents(props.amount) < 0n)
</script>
