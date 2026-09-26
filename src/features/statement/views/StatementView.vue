<template>
  <div class="flex flex-col gap-5" data-test="statement-view">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">Movements</h1>
      <p class="text-sm text-ink-muted">
        Your whole history, month by month, exactly as the bank reported it.
      </p>
    </header>

    <MonthNav :month="store.month" @change="onMonth" />

    <MonthTotals
      v-if="store.result"
      :pagination="store.result.pagination"
      :totals="store.result.totals"
    />

    <p v-if="store.isLoading" class="text-sm text-ink-muted" data-test="statement-loading">
      {{ loadingMonthLine(store.month) }}
    </p>

    <BaseCard v-if="failure" data-test="statement-error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="statement-error-message">{{ failure }}</p>
        <BaseButton
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
      :has-more="store.hasMore"
      :loading-more="store.isLoadingMore"
      @load-more="store.loadMore()"
    />
  </div>
</template>

<script setup lang="ts">
// The statement screen. The URL is the single writer of the month: the nav rewrites
// the query and the watcher below turns that into the request, so back, forward,
// reload and a shared link all behave the same (R3, R4). Read only: not one request
// of this screen writes anything (C1).
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import MonthNav from '../components/MonthNav.vue'
import MonthTotals from '../components/MonthTotals.vue'
import StatementList from '../components/StatementList.vue'
import {
  loadingMonthLine,
  monthFromRouteQuery,
  monthToRouteQuery,
  statementErrorMessage,
} from '../months'
import type { MonthKey } from '../months'
import { useStatementStore } from '../store'

const route = useRoute()
const router = useRouter()
const store = useStatementStore()

function syncFromRoute(): void {
  void store.show(monthFromRouteQuery(route.query))
}

onMounted(syncFromRoute)

watch(() => route.query.month, syncFromRoute)

/** A month change IS a step you want to come back from, so it is pushed. */
function onMonth(next: MonthKey): void {
  void router.push({ query: monthToRouteQuery(next) })
}

const failure = computed(() => (store.error ? statementErrorMessage(store.error) : null))
</script>
