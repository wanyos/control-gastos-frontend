<template>
  <BaseCard v-if="isVisible" :title="PREVIOUS_MONTHS_TITLE" data-test="previous-months">
    <p v-if="load === 'loading'" class="text-sm text-ink-muted" data-test="previous-months-loading">
      {{ PREVIOUS_MONTHS_LOADING }}
    </p>

    <!-- A month that failed leaves no rows by halves: only the message and the way out (R13). -->
    <div v-else-if="load === 'error'" class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-ink-body" data-test="previous-months-error">
        {{ PREVIOUS_MONTHS_FAILED }}
      </p>
      <BaseButton
        variant="secondary"
        size="sm"
        data-test="previous-months-retry"
        @click="emit('retry')"
      >
        Try again
      </BaseButton>
    </div>

    <div v-else-if="rows" class="flex flex-col gap-2">
      <!-- The sentence first, before any row (R11). If the sum failed, it says so (R14). -->
      <p
        v-if="periodLoad === 'error'"
        class="text-sm text-ink-body"
        data-test="previous-months-period-error"
      >
        {{ PERIOD_FAILED }}
      </p>
      <p
        v-else-if="sentence"
        class="font-display text-base leading-snug font-semibold text-ink-strong"
        data-test="previous-months-sentence"
      >
        {{ sentence }}
      </p>
      <p v-if="leftOut" class="text-xs text-ink-muted" data-test="previous-months-left-out">
        {{ leftOut }}
      </p>
      <p v-if="notShown" class="text-xs text-ink-muted" data-test="previous-months-not-shown">
        {{ notShown }}
      </p>

      <div class="mt-2 overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="text-xs font-semibold text-ink-muted">
              <th scope="col" class="pr-4 pb-2 pl-3 text-left font-semibold">
                {{ MONTH_COLUMN_LABEL }}
              </th>
              <!-- The bars: no text, the two dots beside the amounts are their legend. -->
              <th scope="col" class="pb-2" />
              <th scope="col" class="pb-2 pl-4 text-right font-semibold whitespace-nowrap">
                <span
                  class="mr-1.5 inline-block size-2 rounded-full bg-chart-8"
                  aria-hidden="true"
                />
                {{ MONEY_IN_LABEL }}
              </th>
              <th scope="col" class="pb-2 pl-4 text-right font-semibold whitespace-nowrap">
                <span
                  class="mr-1.5 inline-block size-2 rounded-full bg-chart-5"
                  aria-hidden="true"
                />
                {{ MONEY_OUT_LABEL }}
              </th>
              <th scope="col" class="pb-2 pl-4 text-right font-semibold whitespace-nowrap">
                {{ SAVINGS_LABEL }}
              </th>
            </tr>
          </thead>
          <tbody>
            <PreviousMonthRow
              v-for="row in rows"
              :key="row.month"
              :row="row"
              :data-ends="dataEnds"
              @select="(month) => emit('select', month)"
            />
          </tbody>
        </table>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
// The 24 months below the month: the sentence of what was saved, two notes and one row
// per month. Everything it paints arrives as props, already worked out; it only reads.
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import {
  MONTH_COLUMN_LABEL,
  PERIOD_FAILED,
  PREVIOUS_MONTHS_FAILED,
  PREVIOUS_MONTHS_LOADING,
  PREVIOUS_MONTHS_TITLE,
} from '../previousMonths'
import { MONEY_IN_LABEL, MONEY_OUT_LABEL, SAVINGS_LABEL } from '../reading'
import type { LoadState, MonthKey, MonthRow } from '../types'
import PreviousMonthRow from './PreviousMonthRow.vue'

const props = defineProps<{
  /** Null while any of the 24 months is missing; empty when the base has no movements. */
  rows: MonthRow[] | null
  load: LoadState
  /** Built by `periodSentence`; null while the period is not read. */
  sentence: string | null
  periodLoad: LoadState
  /** Built by `leftOutLine`, `notShownLine` and `dataEndsLine`; null when they do not apply. */
  leftOut: string | null
  notShown: string | null
  dataEnds: string | null
}>()

const emit = defineEmits<{
  retry: []
  /** The name of a month was pressed. */
  select: [month: MonthKey]
}>()

/** Nothing before the first read, and nothing when the base has no movements (R1). */
const isVisible = computed(() => {
  if (props.load === 'loading' || props.load === 'error') return true
  return props.load === 'ready' && props.rows !== null && props.rows.length > 0
})
</script>
