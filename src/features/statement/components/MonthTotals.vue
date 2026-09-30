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

      <!-- Permanent on purpose: no close button, no tooltip (decisions.md 🔴 2). Since
           the F23 it is no longer an amber warning: the figures are not inflated any
           more, so it is a grey note that says what they are made of. -->
      <p class="flex items-start gap-2 text-xs text-ink-muted" data-test="statement-totals-note">
        <Info :size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {{ FIGURES_NOTE }}
          <template v-if="ambiguousGroups !== null && ambiguousGroups > 0">
            <span data-test="statement-ambiguous-note">{{ ambiguousNote(ambiguousGroups) }}</span>
          </template>
        </span>
      </p>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
// The three figures the backend computed over the WHOLE month, with neutral labels:
// calling them spent or earned would be a lie while the deposits are inside them
// (R5, R7). Nothing here is ever derived from the movements on screen; `toCents` is
// only used to learn the sign of the difference.
//
// Feature 23 rewrote the permanent note underneath. The old one said the figures were
// inflated beyond repair and quoted July 2026 in euros; both stopped being true the day
// the deposits were marked. The new one carries no hand-written number at all: what no
// count can know goes in words, and the single live figure is the one the backend counts
// itself, `ambiguousCount`, read once per session (R14, R15, design §8).
import { computed } from 'vue'
import { Info } from '@lucide/vue'

import BaseCard from '@/shared/components/BaseCard.vue'
import { formatMoney, toCents } from '@/shared/money'

import { movementCountLine } from '../months'
import type { Pagination, Totals } from '../types'

/**
 * The only piece of the screen that says what these figures are made of, so it is
 * always visible and cannot be dismissed (R14). It carries NO figure of any kind — not
 * of a month, not of movements, not of transfers: a number written by hand is exactly
 * what made the F19's note expire the day the deposits were marked (design §8). What
 * no count can know is said in words; the one number the backend counts itself comes
 * below, in `ambiguousNote` (kept local: `<script setup>` cannot export, and the text
 * belongs to the note it is read with).
 */
const FIGURES_NOTE =
  'These figures already leave out what does not count: the two legs of a paired ' +
  'transfer, and everything you marked as not counted. Both stay in the list — turn ' +
  'on "Hide what does not count" to read the month without them. Two things no count ' +
  'can tell you: a transfer of yours whose other leg was never imported still counts ' +
  'as money in and out until you mark it, and a pair the app detected may not be a ' +
  'transfer at all.'

/**
 * The only live figure of the note (R15), and it is not «the transfers you have left to
 * mark»: a movement with no candidate at all — a transfer whose other leg was never
 * imported — is not listed as doubtful by the backend, which is why the sentence above
 * also says it in words. Absent with zero groups, and absent when the read failed.
 */
const ambiguousNote = (groups: number): string =>
  groups === 1
    ? '1 group looks like a transfer but could not be paired automatically.'
    : `${groups} groups look like transfers but could not be paired automatically.`

const props = withDefaults(
  defineProps<{
    pagination: Pagination
    totals: Totals
    /** The line that names the active filters and their count (R5); absent without filters. */
    scope?: string
    /** Feature 23: doubtful groups the backend counted, or null to say nothing (R15). */
    ambiguousGroups?: number | null
  }>(),
  { scope: undefined, ambiguousGroups: null },
)

const isNetNegative = computed(() => toCents(props.totals.net) < 0n)
</script>
