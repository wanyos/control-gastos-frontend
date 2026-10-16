<template>
  <BaseCard>
    <div class="flex flex-col gap-4" data-test="statement-totals">
      <div class="flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <p class="text-sm text-ink-muted" data-test="statement-totals-count">
          {{ movementCountLine(movementCount ?? pagination.total) }}
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

      <!-- Permanent on purpose: no close button (decisions.md 🔴 2 of the F19). Since
           feature 29 one sentence is always in sight and the rest is folded in a native
           <details>, closed on every visit: nothing is stored (R8, R9). -->
      <div class="flex items-start gap-2 text-xs text-ink-muted" data-test="statement-totals-note">
        <Info :size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        <div class="flex flex-col gap-1">
          <p data-test="statement-totals-line">{{ FIGURES_LINE }}</p>
          <details data-test="statement-totals-more">
            <summary
              class="w-fit cursor-pointer rounded-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {{ MORE_SUMMARY }}
            </summary>
            <ul class="mt-1 flex list-disc flex-col gap-1 pl-4">
              <li v-for="line in MORE_LINES" :key="line">{{ line }}</li>
              <li
                v-if="ambiguousGroups !== null && ambiguousGroups > 0"
                data-test="statement-ambiguous-note"
              >
                {{ ambiguousNote(ambiguousGroups) }}
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
// The three figures the backend computed over the WHOLE month, with neutral labels:
// calling them spent or earned would be a lie while the deposits are inside them
// (R5, R7). Nothing here is ever derived from the movements on screen; `toCents` is
// only used to learn the sign of the difference.
//
// Feature 23 rewrote the permanent note underneath: it carries no hand-written number at
// all, and the single live figure is the one the backend counts itself, `ambiguousCount`,
// read once per session. Feature 29 reworded it and folded all but its first sentence.
import { computed } from 'vue'
import { Info } from '@lucide/vue'

import BaseCard from '@/shared/components/BaseCard.vue'
import { formatMoney, toCents } from '@/shared/money'

import { movementCountLine } from '../months'
import type { Pagination, Totals } from '../types'

/**
 * The one sentence always in sight (feature 29, R8). It names the two labels the user
 * reads in the list, and carries NO figure of any kind: a number written by hand is
 * what made the F19's note expire. Since feature 31 it also says how a deposit counts.
 */
const FIGURES_LINE =
  'These figures leave out the movements labelled "Transfer" or "Not counted", and count a deposit only by its interest.'

const MORE_SUMMARY = 'More about what counts'

/**
 * The folded rest, in this order and word for word (feature 29, R10). No digit either.
 * The sixth sentence, about deposits, came with feature 31 (R10).
 */
const MORE_LINES = [
  'They stay in the list, with the amount crossed out. Tick "Hide what does not count" to take them off the list.',
  '"Transfer" is put by the app on the two movements of a transfer between your accounts. "Not counted" is put by you.',
  'A movement that is left out keeps its category: the category says what it was, the label says it is not in the sums.',
  'If only one of the two movements of a transfer was imported, it still counts until you mark it as "Not counted".',
  'The app can pair two movements that are not a transfer. Unlink them in "Transfers".',
  'Opening or cancelling a deposit is not counted. When one matures, only its interest counts. A doubtful one counts nothing until the app knows how much was put in.',
] as const

/**
 * The only live figure of the note (R15), and it is not «the transfers you have left to
 * mark»: a movement with no candidate at all — a transfer whose other leg was never
 * imported — is not listed as doubtful by the backend, which is why the fourth folded
 * sentence says it in words. Absent with zero groups, and absent when the read failed.
 * Kept local: `<script setup>` cannot export, and the text belongs to the note.
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
    /**
     * Feature 31: the count of the month as the list shows it, without the deposit
     * openings and cancellations the checkbox took off (R13). Absent, `pagination.total`.
     */
    movementCount?: number
  }>(),
  { scope: undefined, ambiguousGroups: null, movementCount: undefined },
)

const isNetNegative = computed(() => toCents(props.totals.net) < 0n)
</script>
