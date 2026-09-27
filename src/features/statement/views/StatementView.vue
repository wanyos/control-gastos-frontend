<template>
  <div class="flex flex-col gap-5" data-test="statement-view">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">Movements</h1>
      <p class="text-sm text-ink-muted">
        Your whole history, month by month, exactly as the bank reported it.
      </p>
    </header>

    <MonthNav :month="store.month" @change="onMonth" />

    <StatementFilterBar
      :filters="store.filters"
      :accounts="store.accounts"
      :accounts-failed="store.accountsFailed"
      :categories="store.categories"
      :categories-failed="store.categoriesFailed"
      @change="onFilters"
    />

    <MonthTotals
      v-if="store.result"
      :pagination="store.result.pagination"
      :totals="store.result.totals"
      :scope="scope"
    />

    <p v-if="store.isLoading" class="text-sm text-ink-muted" data-test="statement-loading">
      {{ loadingMonthLine(store.month) }}
    </p>

    <BaseCard v-if="failure" data-test="statement-error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="statement-error-message">
          {{ failure.message }}
        </p>
        <BaseButton
          v-if="failure.action === 'clear'"
          variant="secondary"
          size="sm"
          data-test="statement-error-clear"
          @click="onFilters({ ...EMPTY_FILTERS })"
        >
          Clear filters
        </BaseButton>
        <BaseButton
          v-else
          variant="secondary"
          size="sm"
          data-test="statement-retry"
          @click="store.show(store.month)"
        >
          Try again
        </BaseButton>
      </div>
    </BaseCard>

    <StatementList
      v-if="store.result && !store.isLoading"
      :month="store.month"
      :days="store.days"
      :pagination="store.result.pagination"
      :shown="store.shown"
      :empty-state="emptyState"
      :has-more="store.hasMore"
      :loading-more="store.isLoadingMore"
      @load-more="store.loadMore()"
      @clear="onFilters({ ...EMPTY_FILTERS })"
    />
  </div>
</template>

<script setup lang="ts">
// The statement screen. The URL is the single writer of the month AND of the filters:
// the nav and the bar rewrite the query and the watcher below turns that into the
// request, so back, forward, reload and a shared link all behave the same (R3, R4, R8).
// Read only: not one request of this screen writes anything (C1).
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import MonthNav from '../components/MonthNav.vue'
import MonthTotals from '../components/MonthTotals.vue'
import StatementFilterBar from '../components/StatementFilterBar.vue'
import StatementList from '../components/StatementList.vue'
import {
  EMPTY_FILTERS,
  filterScopeLine,
  fromRouteQuery,
  hasActiveFilters,
  toRouteQuery,
} from '../filters'
import type { StatementFilters } from '../filters'
import { loadingMonthLine, statementErrorMessage } from '../months'
import type { MonthKey } from '../months'
import { useStatementStore } from '../store'

const route = useRoute()
const router = useRouter()
const store = useStatementStore()

function syncFromRoute(): void {
  const { month, filters } = fromRouteQuery(route.query)
  void store.show(month, filters)
}

onMounted(() => {
  syncFromRoute()
  // One request each per session; a failure only switches its own select off (R14, R15).
  void store.loadAccounts()
  void store.loadCategories()
})

watch(() => route.query, syncFromRoute)

/** A month change IS a step you want to come back from, so it is pushed (R12). */
function onMonth(next: MonthKey): void {
  void router.push({ query: toRouteQuery(next, store.filters) })
}

/** Filters are replaced, not pushed: typing in the search box must not fill the history. */
function onFilters(next: StatementFilters): void {
  void router.replace({ query: toRouteQuery(store.month, next) })
}

const failure = computed(() =>
  store.error ? statementErrorMessage(store.error, hasActiveFilters(store.filters)) : null,
)

/** The names of the two chosen ids, so the scope line reads like the selects (R5). */
const scope = computed(() => {
  const pagination = store.result?.pagination
  if (!pagination || !hasActiveFilters(store.filters)) return undefined
  return filterScopeLine(store.filters, pagination.total, store.month, {
    account: store.accounts?.find((account) => account.id === store.filters.accountId)?.alias,
    category: findCategoryName(store.filters.categoryId),
  })
})

function findCategoryName(id: number | null): string | undefined {
  if (id === null) return undefined
  for (const root of store.categories ?? []) {
    if (root.id === id) return root.name
    const child = root.children.find((one) => one.id === id)
    if (child) return child.name
  }
  return undefined
}

const emptyState = computed<'month' | 'noMatches'>(() =>
  hasActiveFilters(store.filters) ? 'noMatches' : 'month',
)
</script>
