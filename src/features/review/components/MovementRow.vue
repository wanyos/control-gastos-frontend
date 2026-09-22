<template>
  <li
    class="flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 hover:bg-surface-sunken"
    :class="selected ? 'border-brand bg-surface-sunken' : 'border-transparent'"
    data-test="movement-row"
  >
    <BaseCheckbox
      class="w-6 shrink-0"
      label=""
      :model-value="selected"
      :aria-label="`Select ${movement.description}`"
      data-test="movement-select"
      @update:model-value="emit('toggle')"
    />

    <span class="size-2 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold text-ink-strong" data-test="movement-description">
        {{ movement.description }}
      </p>
      <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
        <span data-test="movement-account">{{ accountName }}</span>
        <span aria-hidden="true">·</span>
        <span data-test="movement-date">{{ formatDate(movement.bookingDate) }}</span>
      </p>
    </div>

    <BaseBadge
      size="sm"
      :tone="movement.category ? 'brand' : 'neutral'"
      data-test="movement-category"
    >
      {{ movement.category?.name ?? 'Uncategorized' }}
    </BaseBadge>

    <span
      class="w-28 shrink-0 text-right font-mono text-sm font-semibold tabular-nums"
      :class="amountClass"
      data-test="movement-amount"
    >
      {{ amount }}
    </span>

    <MovementCategorySelect
      :movement="movement"
      :categories="categories ?? null"
      :disabled="busy"
      @change="(categoryId) => emit('categorize', categoryId)"
    />

    <BaseButton
      variant="secondary"
      size="sm"
      :disabled="busy"
      data-test="movement-confirm"
      @click="emit('confirm')"
    >
      <template #icon><Check :size="14" aria-hidden="true" /></template>
      Confirm
    </BaseButton>

    <BaseButton
      variant="ghost"
      size="sm"
      :disabled="cannotRule"
      :aria-label="`Create a rule from ${movement.description}`"
      data-test="movement-create-rule"
      @click="emit('create-rule')"
    >
      <template #icon><WandSparkles :size="14" aria-hidden="true" /></template>
      Create rule
    </BaseButton>
  </li>
</template>

<script setup lang="ts">
// Port of design-system/components/finance/TransactionRow.jsx. The row shows the
// banking fact and never edits it: the only two controls that write on the movement
// touch `categoryId` and `status`, the two fields the contract lets anyone touch (C4).
// The third one, Create rule (feature 17), writes nothing here: it only asks for the
// dialog where a rule is born.
import { computed } from 'vue'
import { Check, WandSparkles } from '@lucide/vue'

import { bankLabel } from '@/shared/banks'
import BaseBadge from '@/shared/components/BaseBadge.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCheckbox from '@/shared/components/BaseCheckbox.vue'
import { formatDate, formatMoney } from '@/shared/money'

import MovementCategorySelect from './MovementCategorySelect.vue'
import type { Category, Movement } from '../types'

const props = defineProps<{
  movement: Movement
  /** Null while unknown or after a failure (the selector then has nothing to offer). */
  categories?: Category[] | null
  selected?: boolean
  /** An action is running: the row's own controls wait for it (R11). */
  busy?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  categorize: [number | null]
  confirm: []
  'create-rule': []
}>()

/**
 * A rule born from a neutral movement would never categorize anything (the pass
 * skips them), and without the category tree there is nothing to point it at (R1).
 */
const cannotRule = computed(
  () => props.busy === true || props.movement.type === 'neutral' || !props.categories,
)

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

/** Stable hue per category, so the same category keeps its dot across pages. */
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
