<template>
  <li
    class="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-surface-sunken"
    data-test="statement-row"
  >
    <span class="size-2 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />

    <div class="min-w-0 flex-1">
      <p
        class="truncate text-sm font-semibold text-ink-strong"
        data-test="statement-row-description"
      >
        {{ movement.description }}
      </p>
      <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
        <span data-test="statement-row-account">{{ accountName }}</span>
      </p>
    </div>

    <BaseBadge
      v-if="movement.transferId"
      size="sm"
      tone="neutral"
      :title="TRANSFER_HINT"
      :aria-label="TRANSFER_HINT"
      data-test="statement-row-transfer"
    >
      Transfer
    </BaseBadge>

    <BaseBadge
      size="sm"
      :tone="movement.category ? 'brand' : 'neutral'"
      data-test="statement-row-category"
    >
      {{ movement.category?.name ?? 'Uncategorized' }}
    </BaseBadge>

    <span
      class="w-28 shrink-0 text-right font-mono text-sm font-semibold tabular-nums"
      :class="amountClass"
      data-test="statement-row-amount"
    >
      {{ amount }}
    </span>
  </li>
</template>

<script setup lang="ts">
// One line of the statement. Same layout as the review row, with none of its four
// controls: this screen only looks (C1). The date is not repeated here — the day
// header above the row carries it (R8, R9) — and `balanceAfter` is never painted:
// only three of the five accounts bring it, so it is noise (R9).
import { computed } from 'vue'

import { bankLabel } from '@/shared/banks'
import BaseBadge from '@/shared/components/BaseBadge.vue'
import { formatMoney } from '@/shared/money'

import type { Movement } from '../types'

const props = defineProps<{ movement: Movement }>()

/** Why a paired transfer is visible here but missing from the month's figures (R10). */
const TRANSFER_HINT = "Paired transfer: not counted in this month's figures"

// Full literal class names: Tailwind scans source as text (docs/stack.md).
const CATEGORY_FILLS = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
  'bg-chart-6',
  'bg-chart-7',
  'bg-chart-8',
] as const

/** Stable hue per category, so the same category keeps its dot across months. */
const dotClass = computed(() => {
  const category = props.movement.category
  return category ? (CATEGORY_FILLS[category.id % CATEGORY_FILLS.length] ?? '') : 'bg-ink-faint'
})

const accountName = computed(
  () => `${bankLabel(props.movement.account.bank)} · ${props.movement.account.alias}`,
)

/** The API always sends a positive amount; the sign comes from `type`. */
const amount = computed(() =>
  formatMoney(
    props.movement.type === 'expense' ? `-${props.movement.amount}` : props.movement.amount,
  ),
)

const amountClass = computed(() => {
  if (props.movement.type === 'income') return 'text-positive'
  return props.movement.type === 'neutral' ? 'text-ink-muted' : 'text-ink-strong'
})
</script>
