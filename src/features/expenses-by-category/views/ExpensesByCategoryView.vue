<template>
  <div class="flex flex-col gap-5" data-test="expenses-view">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">{{ TITLE }}</h1>
      <p class="text-sm text-ink-muted">{{ SUBTITLE }}</p>
    </header>

    <PeriodPicker :query="query" @change="onPeriod" />

    <p
      v-if="store.loadState === 'loading'"
      class="text-sm text-ink-muted"
      data-test="expenses-loading"
    >
      {{ LOADING_LINE }}
    </p>

    <BaseCard v-if="failure" data-test="expenses-error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="expenses-error-message">{{ failure }}</p>
        <BaseButton variant="secondary" size="sm" data-test="expenses-retry" @click="store.retry()">
          {{ RETRY }}
        </BaseButton>
      </div>
    </BaseCard>

    <template v-if="data">
      <!-- The sentence first, before any figure (R7). -->
      <p
        class="font-display text-xl leading-snug font-bold tracking-[-0.01em] text-ink-strong"
        data-test="expenses-sentence"
      >
        {{ periodSentence(data) }}
      </p>

      <StatCard :label="TOTAL_LABEL" :value="formatMoney(data.amount)" data-test="expenses-total">
        <p class="font-mono text-sm text-ink-muted tabular-nums" data-test="expenses-compared">
          {{ comparedCaption(data) }}
        </p>
      </StatCard>

      <BaseCard data-test="expenses-uncategorized">
        <p class="text-sm text-ink-body tabular-nums" data-test="expenses-uncategorized-line">
          {{ uncategorizedText(data) }}
        </p>
      </BaseCard>

      <CategoryGroup
        kind="fixed"
        :title="FIXED_TITLE"
        :group="data.fixed"
        :total="data.amount"
        :mode="mode"
        :period-name="periodLabel(data.period)"
        :compared-label="periodLabel(data.compared)"
      />
      <CategoryGroup
        kind="variable"
        :title="VARIABLE_TITLE"
        :group="data.variable"
        :total="data.amount"
        :mode="mode"
        :period-name="periodLabel(data.period)"
        :compared-label="periodLabel(data.compared)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
// What was spent by category, in a month or a year (feature 37). It only reads: one
// `GET /api/expenses-by-category` per period, and again on Try again (R16). The address
// is the single writer of the period: the picker rewrites the query and the watcher
// turns it into the read, so back, forward and reload behave the same (R6).
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import StatCard from '@/shared/components/StatCard.vue'
import { formatMoney } from '@/shared/money'

import CategoryGroup from '../components/CategoryGroup.vue'
import PeriodPicker from '../components/PeriodPicker.vue'
import {
  FIXED_TITLE,
  LOADING_LINE,
  RETRY,
  SUBTITLE,
  TITLE,
  TOTAL_LABEL,
  VARIABLE_TITLE,
  comparedCaption,
  expensesErrorMessage,
  periodFromRouteQuery,
  periodLabel,
  periodSentence,
  periodToRouteQuery,
  uncategorizedText,
} from '../reading'
import { useExpensesByCategoryStore } from '../store'
import type { PeriodQuery } from '../types'

const route = useRoute()
const router = useRouter()
const store = useExpensesByCategoryStore()

/** The route this view was mounted on: a query that changes on the way out is not ours. */
const ownRoute = route.name

const query = computed(() => periodFromRouteQuery(route.query))

function syncFromRoute(): void {
  if (route.name !== ownRoute) return
  void store.load(query.value)
}

onMounted(syncFromRoute)

watch(() => route.query, syncFromRoute)

/** A period change is a step you want to come back from, so it is pushed (R6). */
function onPeriod(next: PeriodQuery): void {
  void router.push({ query: periodToRouteQuery(next) })
}

const data = computed(() => (store.loadState === 'ready' ? store.data : null))

const mode = computed(() => (data.value?.period.year === null ? 'month' : 'year'))

const failure = computed(() =>
  store.loadState === 'error' && store.error ? expensesErrorMessage(store.error) : null,
)
</script>
