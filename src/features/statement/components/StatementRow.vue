<template>
  <li
    class="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-surface-sunken"
    data-test="statement-row"
    :data-movement-id="movement.id"
  >
    <!-- Only while the selection mode is on: off, the statement reads as a month and
         93 checkboxes would undo that (R4, decisions.md 🔴 1). -->
    <BaseCheckbox
      v-if="selectable"
      class="shrink-0"
      label=""
      :model-value="selected ?? false"
      :disabled="busy"
      :aria-label="`Select ${movement.description}`"
      data-test="statement-row-select"
      @update:model-value="emit('toggle')"
    />

    <span class="size-2 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />

    <div class="min-w-0 flex-1">
      <p
        class="truncate text-sm font-semibold"
        :class="isLeftOut ? 'text-ink-muted' : 'text-ink-strong'"
        data-test="statement-row-description"
      >
        {{ movement.description }}
      </p>
      <!-- `Transfer` and `Not counted` are words next to the account, not badges: the
           only thing shaped like a label in a line is its category (feature 29, R5).
           A deposit movement says what kind it is instead: the mark and the pairing do
           not change what it counts (feature 31, R4, R8). -->
      <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
        <span data-test="statement-row-account">{{ accountName }}</span>
        <span
          v-if="depositText !== null"
          class="font-semibold"
          :class="isDoubtful ? 'text-warning' : 'text-ink-muted'"
          data-test="statement-row-deposit"
        >
          {{ depositText }}
        </span>
        <span
          v-if="!isDeposit && movement.transferId"
          class="font-semibold"
          :title="TRANSFER_HINT"
          :aria-label="TRANSFER_HINT"
          data-test="statement-row-transfer"
        >
          Transfer
        </span>
        <span
          v-if="!isDeposit && movement.excludedFromTotals"
          class="font-semibold"
          :title="EXCLUDED_HINT"
          :aria-label="EXCLUDED_HINT"
          data-test="statement-row-excluded"
        >
          Not counted
        </span>
        <!-- Feature 34: only when the closing of the import set the category. -->
        <span v-if="closingText !== null" data-test="statement-row-closing">
          {{ closingText }}
        </span>
      </p>
    </div>

    <RowCategoryEditor
      v-if="editing"
      :movement="movement"
      :categories="categories ?? null"
      :busy="busy"
      @change="(categoryId) => emit('categorize', categoryId)"
      @create-rule="emit('create-rule')"
      @close="emit('close-editor')"
    />

    <!-- The badge IS the control (R2): pressing it turns it into the editor above, in
         its own place, so the row keeps its width and the month keeps reading as a
         month (decisions.md 🔴 1). A neutral movement has no editor to open (R5). -->
    <button
      v-else-if="canCategorize && !selectable"
      type="button"
      class="shrink-0 rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      :title="CHANGE_HINT"
      :aria-label="`Change category of ${movement.description}`"
      data-test="statement-row-category-button"
      @click="emit('edit')"
    >
      <BaseBadge
        v-if="movement.category"
        size="sm"
        tone="neutral"
        data-test="statement-row-category"
      >
        {{ movement.category.name }}
      </BaseBadge>
      <span v-else :class="UNCATEGORIZED_CLASS" data-test="statement-row-category">
        Uncategorized
      </span>
    </button>

    <BaseBadge
      v-else-if="movement.category"
      size="sm"
      tone="neutral"
      :title="NEUTRAL_HINT"
      data-test="statement-row-category"
    >
      {{ movement.category.name }}
    </BaseBadge>
    <span
      v-else
      :class="UNCATEGORIZED_CLASS"
      :title="NEUTRAL_HINT"
      data-test="statement-row-category"
    >
      Uncategorized
    </span>

    <!-- The bank's amount, always; on a deposit maturity, what counts goes under it
         (feature 31, R5, R6). -->
    <div class="flex w-28 shrink-0 flex-col items-end">
      <span
        class="text-right font-mono text-sm font-semibold tabular-nums"
        :class="amountClass"
        data-test="statement-row-amount"
      >
        {{ amount }}
      </span>
      <span
        v-if="counted !== null"
        class="text-right font-mono text-xs tabular-nums text-positive"
        data-test="statement-row-counted"
      >
        {{ counted }}
      </span>
    </div>
  </li>
</template>

<script setup lang="ts">
// One line of the statement. Same layout as the review row, and since feature 21 it
// carries ONE control: its category badge, which becomes the editor in its own place
// when pressed (R2, R3). Nothing else about the movement can be touched from here (C1).
// Since feature 29 every category badge is neutral: the green lives only in the amount.
// Feature 22 adds a SECOND control, and only while the selection mode is on: a
// checkbox. In that mode the category badge stops being a button, so one click can
// never mean two things (R6); the badge is still there, just not pressable.
// The date is not repeated — the day header above the row carries it (R8, R9) — and
// `balanceAfter` is never painted: only three of the five accounts bring it (R9).
import { computed } from 'vue'

import { accountLabel } from '@/shared/accounts'
import BaseBadge from '@/shared/components/BaseBadge.vue'
import BaseCheckbox from '@/shared/components/BaseCheckbox.vue'
import { countedLine, depositCountsNothing, depositLine } from '@/shared/deposits'
import { formatMoney } from '@/shared/money'
import { closingSourceLine } from '@/shared/movements'

import RowCategoryEditor from './RowCategoryEditor.vue'
import type { Category, Movement } from '../types'

const props = defineProps<{
  movement: Movement
  /** The whole tree; null while unknown or after a failure (feature 21). */
  categories?: Category[] | null
  /** True when THIS row is the one being edited: only one at a time (C2). */
  editing?: boolean
  /** A write is in flight (C2). */
  busy?: boolean
  /** Feature 22: the selection mode is on, so the row shows its checkbox (R4, R5). */
  selectable?: boolean
  /** Feature 22: this row is ticked. */
  selected?: boolean
}>()

const emit = defineEmits<{
  edit: []
  categorize: [number | null]
  'create-rule': []
  'close-editor': []
  toggle: []
}>()

/** Why a neutral badge is not a button (R5). */
const NEUTRAL_HINT = "Neutral movements can't be categorized"

/** Why this row is in the list but out of the three figures (feature 22, R8). */
const EXCLUDED_HINT = "Not counted in this month's figures"
const CHANGE_HINT = 'Change category'

/** A neutral movement accepts no category: the contract answers 400 (R5). */
const canCategorize = computed(() => props.movement.type !== 'neutral')

/** Why a paired transfer is visible here but missing from the month's figures (R10). */
const TRANSFER_HINT = "Paired transfer: not counted in this month's figures"

/** A deposit movement: what it counts is its `deposit`, never the mark (feature 31). */
const isDeposit = computed(() => props.movement.deposit != null)
const isDoubtful = computed(() => props.movement.deposit?.ambiguous === true)
const depositText = computed(() => depositLine(props.movement))
const counted = computed(() => countedLine(props.movement))
const closingText = computed(() => closingSourceLine(props.movement))

/**
 * Left out of the month's figures: marked by the user, or one of a paired transfer; a
 * deposit movement only when it counts nothing (feature 31, R3, R7).
 */
const isLeftOut = computed(() =>
  isDeposit.value
    ? depositCountsNothing(props.movement)
    : props.movement.excludedFromTotals || props.movement.transferId !== null,
)

// No category is said with the shape, not with a colour: dashed edge and no fill, in
// the measures of a `size="sm"` badge. Local on purpose: BaseBadge is shared with
// Review and has no variant without a background (feature 29, R7).
const UNCATEGORIZED_CLASS =
  'inline-flex items-center whitespace-nowrap rounded-pill border border-dashed border-line-default px-[7px] py-[2px] text-2xs leading-[1.4] font-semibold text-ink-muted'

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

const accountName = computed(() => accountLabel(props.movement.account))

/** The API always sends a positive amount; the sign comes from `type`. */
const amount = computed(() =>
  formatMoney(
    props.movement.type === 'expense' ? `-${props.movement.amount}` : props.movement.amount,
  ),
)

const amountClass = computed(() => {
  // What is left out keeps its amount, its sign and its place: crossed out and faint,
  // never green nor white (feature 29, R1).
  if (isLeftOut.value) return 'text-ink-faint line-through'
  // A maturity counts only part of it: grey, not crossed out, never green (feature 31, R5).
  if (isDeposit.value) return 'text-ink-muted'
  if (props.movement.type === 'income') return 'text-positive'
  return props.movement.type === 'neutral' ? 'text-ink-muted' : 'text-ink-strong'
})
</script>
