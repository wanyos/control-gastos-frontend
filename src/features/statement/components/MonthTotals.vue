<template>
  <BaseCard>
    <div class="flex flex-col gap-4" data-test="statement-totals">
      <div class="flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <p class="text-sm text-ink-muted" data-test="statement-totals-count">
          {{ movementCountLine(pagination.total) }}
        </p>

        <p class="flex items-baseline gap-2 text-sm">
          <span class="text-ink-muted">Money in</span>
          <span
            class="font-mono font-semibold tabular-nums text-ink-strong"
            data-test="statement-totals-in"
          >
            {{ formatMoney(totals.income) }}
          </span>
        </p>
        <p class="flex items-baseline gap-2 text-sm">
          <span class="text-ink-muted">Money out</span>
          <span
            class="font-mono font-semibold tabular-nums text-ink-strong"
            data-test="statement-totals-out"
          >
            {{ formatMoney(totals.expense) }}
          </span>
        </p>
        <p class="flex items-baseline gap-2 text-sm">
          <span class="text-ink-muted">Difference</span>
          <span
            class="font-mono font-semibold tabular-nums"
            :class="isNetNegative ? 'text-negative' : 'text-positive'"
            data-test="statement-totals-net"
          >
            {{ formatMoney(totals.net) }}
          </span>
        </p>
      </div>

      <!-- What the figures above were computed over, when filters narrow the month
           (feature 20, R5). It lives OUTSIDE the permanent note on purpose: that note
           talks about a whole month and does not change a word. -->
      <p v-if="scope" class="text-sm text-ink-muted" data-test="statement-scope">{{ scope }}</p>

      <!-- Permanent on purpose: no close button, no tooltip (decisions.md 🔴 2). -->
      <p
        class="flex items-start gap-2 rounded-md bg-warning-subtle px-3 py-2 text-xs text-warning"
        data-test="statement-totals-note"
      >
        <TriangleAlert :size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{{ FIGURES_NOTE }}</span>
      </p>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
// The three figures the backend computed over the WHOLE month, with neutral labels:
// calling them spent or earned would be a lie while the deposits are inside them
// (R5, R7). Nothing here is ever derived from the movements on screen; `toCents` is
// only used to learn the sign of the difference.
import { computed } from 'vue'
import { TriangleAlert } from '@lucide/vue'

import BaseCard from '@/shared/components/BaseCard.vue'
import { formatMoney, toCents } from '@/shared/money'

import { movementCountLine } from '../months'
import type { Pagination, Totals } from '../types'

/**
 * The only piece of the screen that stops these figures from being read as real
 * spending, so it is always visible and cannot be dismissed (R6). The amounts of the
 * example are written, not computed: they are the measurement in
 * progress/exploration/ruido-traspasos-datos.md §6.
 */
const FIGURES_NOTE =
  'These are raw bank movements. Deposit openings and maturities, and transfers to ' +
  'accounts not imported here, count as money in and out: July 2026 reads 57.949 € in ' +
  'and 59.096 € out, almost all of it one deposit rolling over. Paired transfers are ' +
  'already out of these figures, but you still see them in the list below. A clean view ' +
  'needs the noise switch, which comes in a later step.'

const props = withDefaults(
  defineProps<{
    pagination: Pagination
    totals: Totals
    /** The line that names the active filters and their count (R5); absent without filters. */
    scope?: string
  }>(),
  { scope: undefined },
)

const isNetNegative = computed(() => toCents(props.totals.net) < 0n)
</script>
