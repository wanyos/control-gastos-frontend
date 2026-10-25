<template>
  <li class="flex flex-col gap-2 py-3" data-test="category-line">
    <div
      class="flex flex-wrap items-center gap-x-4 gap-y-1.5 md:grid md:gap-y-0"
      :class="LINE_COLUMNS[mode]"
    >
      <div class="flex w-full min-w-0 items-center gap-2 md:w-auto">
        <span class="truncate text-sm font-semibold text-ink-strong" data-test="line-name">
          {{ name }}
        </span>
        <BaseBadge
          v-if="badge"
          :tone="badge.tone"
          size="sm"
          :data-change="line.change"
          data-test="line-badge"
        >
          {{ badge.text }}
        </BaseBadge>
      </div>

      <div class="flex w-full min-w-0 items-center gap-2 md:w-auto">
        <ShareBar class="min-w-0 flex-1" :permille="permille" :fill-class="fillClass" />
        <span
          class="w-14 text-right font-mono text-xs text-ink-muted tabular-nums"
          data-test="line-share"
        >
          {{ formatPercent(permille) }}
        </span>
      </div>

      <span
        class="text-right font-mono text-sm font-semibold text-ink-strong tabular-nums"
        data-test="line-amount"
      >
        {{ formatMoney(line.amount) }}
      </span>
      <span
        class="text-right font-mono text-sm text-ink-muted tabular-nums"
        data-test="line-compared"
      >
        {{ formatMoney(line.comparedAmount) }}
      </span>
      <span
        class="text-right font-mono text-sm tabular-nums"
        :class="DIFFERENCE_CLASSES[differenceTone(line.difference)]"
        data-test="line-difference"
      >
        {{ formatDifference(line.difference) }}
      </span>
      <span
        v-if="mode === 'year'"
        class="text-right font-mono text-sm text-ink-body tabular-nums"
        data-test="line-monthly"
      >
        {{ line.monthlyAmount === null ? '' : formatMoney(line.monthlyAmount) }}
      </span>

      <div class="md:justify-self-end">
        <BaseButton
          v-if="line.movements.length > 0"
          variant="secondary"
          size="sm"
          :aria-expanded="open ? 'true' : 'false'"
          data-test="line-toggle"
          @click="open = !open"
        >
          {{ open ? HIDE_MOVEMENTS : SHOW_MOVEMENTS }}
        </BaseButton>
      </div>
    </div>

    <LineMovements v-if="open && line.movements.length > 0" :movements="line.movements" />
  </li>
</template>

<script setup lang="ts">
// One line of a group (R10–R13): name and its mark, the bar as the share of the period
// total, the backend's figures and, open, its movements. Opening asks nothing: the
// movements already came with the line.
import { computed } from 'vue'

import BaseBadge from '@/shared/components/BaseBadge.vue'
import type { BadgeTone } from '@/shared/components/BaseBadge.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import ShareBar from '@/shared/components/ShareBar.vue'
import { formatMoney, formatPercent } from '@/shared/money'

import {
  DIFFERENCE_CLASSES,
  GONE_BADGE,
  HIDE_MOVEMENTS,
  LINE_COLUMNS,
  NEW_BADGE,
  NO_CATEGORY,
  SHOW_MOVEMENTS,
  barPermille,
  differenceTone,
  formatDifference,
} from '../reading'
import type { DecimalString, ExpenseLine, PeriodMode } from '../types'
import LineMovements from './LineMovements.vue'

const props = defineProps<{
  line: ExpenseLine
  /** The period's `amount` at the root: what every bar is a share of. */
  total: DecimalString
  mode: PeriodMode
  /** Full literal utility for the bar fill. */
  fillClass: string
}>()
const open = defineModel<boolean>('open', { default: false })

const name = computed(() => props.line.category?.name ?? NO_CATEGORY)

const permille = computed(() => barPermille(props.line.amount, props.total))

const badge = computed((): { text: string; tone: BadgeTone } | null => {
  if (props.line.change === 'new') return { text: NEW_BADGE, tone: 'info' }
  if (props.line.change === 'gone') return { text: GONE_BADGE, tone: 'neutral' }
  return null
})
</script>
