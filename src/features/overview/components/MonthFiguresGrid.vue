<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-test="overview-figures">
    <StatCard :label="MONEY_IN_LABEL" :value="formatMoney(totals.income)" data-test="overview-in">
      <UsualLine v-if="usual" :comparison="usual.income" />
    </StatCard>

    <StatCard
      :label="MONEY_OUT_LABEL"
      :value="formatMoney(totals.expense)"
      data-test="overview-out"
    >
      <UsualLine v-if="usual" :comparison="usual.expense" />
    </StatCard>

    <StatCard :label="SAVINGS_LABEL" :value="formatMoney(totals.net)" data-test="overview-net" />

    <StatCard :label="SAVINGS_RATE_LABEL" :value="rate.value" data-test="overview-rate">
      <p v-if="rate.note" class="text-xs text-ink-muted" data-test="overview-rate-note">
        {{ rate.note }}
      </p>
    </StatCard>
  </div>
</template>

<script setup lang="ts">
// The four cards of a month that has movements. The three amounts are the backend's
// strings, formatted and never recomputed (R5); the rate is one of them over another,
// and it is a dash when the month is incomplete or nothing came in (R6, R7, R8).
import { computed } from 'vue'

import StatCard from '@/shared/components/StatCard.vue'
import { formatMoney, formatPercent } from '@/shared/money'

import {
  INCOMPLETE_RATE_NOTE,
  MONEY_IN_LABEL,
  MONEY_OUT_LABEL,
  NO_INCOME_RATE_NOTE,
  NO_RATE,
  SAVINGS_LABEL,
  SAVINGS_RATE_LABEL,
  savingsRatePermille,
} from '../reading'
import type { Comparison, MonthState, Totals } from '../types'
import UsualLine from './UsualLine.vue'

const props = defineProps<{
  totals: Totals
  state: Exclude<MonthState, 'empty'>
  /** Null while it loads, when it failed and in an incomplete month. */
  comparison: Comparison | null
}>()

/** With no earlier month there is no usual month to stand next to the figure (R10). */
const usual = computed(() =>
  props.comparison && props.comparison.months >= 1 ? props.comparison : null,
)

const rate = computed<{ value: string; note: string | null }>(() => {
  if (props.state === 'incomplete') return { value: NO_RATE, note: INCOMPLETE_RATE_NOTE }
  const permille = savingsRatePermille(props.totals)
  return permille === null
    ? { value: NO_RATE, note: NO_INCOME_RATE_NOTE }
    : { value: formatPercent(permille), note: null }
})
</script>
