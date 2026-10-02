<template>
  <div class="flex flex-col gap-5" data-test="overview-view">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">Overview</h1>
      <p class="text-sm text-ink-muted">
        One month at a glance: what came in, what went out and whether it was a usual month.
      </p>
    </header>

    <MonthNav :month="store.month" @change="onMonth" />

    <p v-if="store.core === 'loading'" class="text-sm text-ink-muted" data-test="overview-loading">
      {{ loadingMonthLine(store.month) }}
    </p>

    <BaseCard v-if="failure" data-test="overview-error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="overview-error-message">{{ failure }}</p>
        <BaseButton variant="secondary" size="sm" data-test="overview-retry" @click="store.retry()">
          Try again
        </BaseButton>
      </div>
    </BaseCard>

    <!-- The sentence first, before any figure (R4). An empty month is only its sentence (R9). -->
    <MonthSentence v-if="store.sentence" :text="store.sentence" />

    <template v-if="store.figures && shownState">
      <MonthFiguresGrid
        :totals="store.figures.totals"
        :state="shownState"
        :comparison="store.comparison"
      />

      <div class="flex flex-wrap items-center gap-3" data-test="overview-comparison">
        <p class="text-xs text-ink-muted" data-test="overview-caption">{{ caption }}</p>
        <BaseButton
          v-if="store.comparisonLoad === 'error'"
          variant="secondary"
          size="sm"
          data-test="overview-retry-comparison"
          @click="store.retryComparison()"
        >
          Try again
        </BaseButton>
      </div>

      <UncategorizedLine
        v-if="hasSpending"
        :load="store.uncategorizedLoad"
        :uncategorized="store.uncategorized"
        :expense="store.figures.totals.expense"
      />

      <!-- No colour utility: base.css already paints every `a` with the link ink. -->
      <RouterLink
        :to="{ name: STATEMENT_ROUTE_NAME, query: monthToRouteQuery(store.month) }"
        class="self-start text-sm"
        data-test="overview-statement-link"
      >
        {{ statementLinkText(store.month) }}
      </RouterLink>
    </template>
    <!-- Nothing below the month: the year strip of a later feature goes here (C6). -->
  </div>
</template>

<script setup lang="ts">
// The month at a glance. The URL is the single writer of the month: the nav rewrites
// the query and the watcher turns that into the reads, so back, forward and reload all
// behave the same (R2, R3). The screen only reads.
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import MonthNav from '@/features/statement/components/MonthNav.vue'
import {
  loadingMonthLine,
  monthFromRouteQuery,
  monthToRouteQuery,
} from '@/features/statement/months'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import { toCents } from '@/shared/money'

import MonthFiguresGrid from '../components/MonthFiguresGrid.vue'
import MonthSentence from '../components/MonthSentence.vue'
import UncategorizedLine from '../components/UncategorizedLine.vue'
import {
  COMPARISON_FAILED,
  COMPARISON_LOADING,
  NO_COMPARISON_INCOMPLETE,
  comparisonCaption,
  overviewErrorMessage,
  statementLinkText,
} from '../reading'
import { useOverviewStore } from '../store'
import type { MonthKey } from '../types'

/** The statement's route: the same month there, with no other filter (R15). */
const STATEMENT_ROUTE_NAME = 'movements'

const route = useRoute()
const router = useRouter()
const store = useOverviewStore()

/** The route this view was mounted on: a query that changes on the way out is not ours. */
const ownRoute = route.name

function syncFromRoute(): void {
  if (route.name !== ownRoute) return
  void store.show(monthFromRouteQuery(route.query))
}

onMounted(() => {
  // What was read is worth one visit: coming back starts clean (C3).
  store.reset()
  syncFromRoute()
})

watch(() => route.query, syncFromRoute)

/** A month change is a step you want to come back from, so it is pushed (R3). */
function onMonth(next: MonthKey): void {
  void router.push({ query: monthToRouteQuery(next) })
}

const failure = computed(() =>
  store.core === 'error' && store.coreError ? overviewErrorMessage(store.coreError) : null,
)

/** Null while there is nothing to paint under the sentence: no data yet, or an empty month. */
const shownState = computed(() =>
  store.state === 'incomplete' || store.state === 'complete' ? store.state : null,
)

/** What stands where the comparison's legend goes, whatever happened to it (R8, R11, R14). */
const caption = computed(() => {
  if (shownState.value === 'incomplete') return NO_COMPARISON_INCOMPLETE
  if (store.comparisonLoad === 'error') return COMPARISON_FAILED
  return store.comparison ? comparisonCaption(store.comparison.months) : COMPARISON_LOADING
})

const hasSpending = computed(() =>
  store.figures ? toCents(store.figures.totals.expense) > 0n : false,
)
</script>
