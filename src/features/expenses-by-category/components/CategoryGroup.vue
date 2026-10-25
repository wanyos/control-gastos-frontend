<template>
  <BaseCard :data-test="`group-${kind}`">
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong"
          data-test="group-title"
        >
          {{ title }}
        </h2>
        <p class="flex flex-wrap items-baseline gap-x-3 text-sm" data-test="group-figures">
          <span
            class="font-mono font-semibold text-ink-strong tabular-nums"
            data-test="group-amount"
          >
            {{ formatMoney(group.amount) }}
          </span>
          <span class="font-mono text-ink-muted tabular-nums" data-test="group-compared">
            {{ comparedLabel }}: {{ formatMoney(group.comparedAmount) }}
          </span>
          <span
            class="font-mono tabular-nums"
            :class="DIFFERENCE_CLASSES[differenceTone(group.difference)]"
            data-test="group-difference"
          >
            {{ formatDifference(group.difference) }}
          </span>
        </p>
      </div>

      <p v-if="group.lines.length === 0" class="text-sm text-ink-muted" data-test="group-empty">
        {{ NO_LINES }}
      </p>

      <template v-else>
        <div
          class="hidden gap-x-4 border-b border-line-subtle pb-2 text-xs font-semibold text-ink-muted md:grid"
          :class="LINE_COLUMNS[mode]"
          data-test="group-columns"
        >
          <span />
          <span />
          <span class="text-right">{{ periodName }}</span>
          <span class="text-right">{{ comparedLabel }}</span>
          <span class="text-right">{{ DIFFERENCE_COLUMN }}</span>
          <span v-if="mode === 'year'" class="text-right">{{ MONTHLY_COLUMN }}</span>
          <span />
        </div>

        <ul class="flex flex-col divide-y divide-line-subtle">
          <CategoryLine
            v-for="line in group.lines"
            :key="line.category?.id ?? 'none'"
            :line="line"
            :total="total"
            :mode="mode"
            :fill-class="line.category === null ? 'bg-chart-4' : FILLS[kind]"
          />
        </ul>
      </template>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
// One group, Fixed or Variable (R9): its sum, the compared one and the difference, all
// the backend's, and its lines in the order they come.
import BaseCard from '@/shared/components/BaseCard.vue'
import { formatMoney } from '@/shared/money'

import {
  DIFFERENCE_CLASSES,
  DIFFERENCE_COLUMN,
  LINE_COLUMNS,
  MONTHLY_COLUMN,
  NO_LINES,
  differenceTone,
  formatDifference,
} from '../reading'
import type { DecimalString, ExpenseGroup, PeriodMode } from '../types'
import CategoryLine from './CategoryLine.vue'

defineProps<{
  kind: 'fixed' | 'variable'
  title: string
  group: ExpenseGroup
  /** The period's `amount` at the root: what every bar is a share of. */
  total: DecimalString
  mode: PeriodMode
  periodName: string
  comparedLabel: string
}>()

// Full literal class names: Tailwind scans source as text. The line with no category
// takes the colour Overview gives it.
const FILLS = { fixed: 'bg-chart-1', variable: 'bg-chart-3' } as const
</script>
