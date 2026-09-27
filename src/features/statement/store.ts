import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { getAccounts } from '@/shared/accounts'
import { getCategories } from '@/shared/categories'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { getMovements } from '@/shared/movements'

import { EMPTY_FILTERS, monthQuery } from './filters'
import type { StatementFilters } from './filters'
import { currentMonth, groupByDay, shiftMonth } from './months'
import type { MonthKey } from './months'
import type { AccountSummary, Category, DayGroup, Movement, MovementPage } from './types'

/**
 * The statement: the month on screen and what the API answered for it. Read only —
 * nothing here writes on a movement (C1) — and no action throws: a failure lives in
 * `error` and the view paints it (net-worth's pattern).
 */
export const useStatementStore = defineStore('statement', () => {
  const month = ref<MonthKey>(currentMonth())
  /** The four filters that narrow the month on screen (feature 20, R1). */
  const filters = ref<StatementFilters>({ ...EMPTY_FILTERS })
  /** Null while never loaded, or when the last load of a month failed. */
  const result = ref<MovementPage | null>(null)
  /** The movements of pages 2..n the user brought with `Load more`, in order (R13). */
  const extra = ref<Movement[]>([])
  /** The last page of this month already on screen. */
  const page = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref<AppError | null>(null)
  /** Every account there is, asked once per session; null while unknown (R14). */
  const accounts = ref<AccountSummary[] | null>(null)
  const accountsFailed = ref(false)
  /** The whole category tree, asked once per session; null while unknown (R14). */
  const categories = ref<Category[] | null>(null)
  const categoriesFailed = ref(false)

  // Only the latest request may write the state: the arrows are clicked faster than
  // the network answers, and September must never show July's figures (R15).
  let loadRun = 0
  let accountsRequested = false
  let categoriesRequested = false

  /** The whole month on screen, grouped by day in the order the API sent it (R8). */
  const days = computed<DayGroup[]>(() =>
    groupByDay([...(result.value?.movements ?? []), ...extra.value]),
  )

  /** Rows on screen right now: the first page plus whatever `Load more` added. */
  const shown = computed(() => (result.value?.movements.length ?? 0) + extra.value.length)

  /** True while this month still has pages nobody asked for. */
  const hasMore = computed(() => {
    const pagination = result.value?.pagination
    return pagination ? page.value < pagination.totalPages : false
  })

  /**
   * Loads a month with the filters it is looked at through, from scratch. Whatever
   * `Load more` had brought goes with it: that list belonged to the previous filter (R3).
   */
  async function show(
    next: MonthKey,
    nextFilters: StatementFilters = filters.value,
    client?: HttpClient,
  ): Promise<void> {
    const run = ++loadRun
    month.value = next
    filters.value = nextFilters
    isLoading.value = true
    error.value = null
    extra.value = []
    page.value = 0
    try {
      const loaded = await getMovements(monthQuery(next, nextFilters), client)
      if (run !== loadRun) return
      result.value = loaded
      page.value = loaded.pagination.page
    } catch (rejection) {
      if (run !== loadRun) return
      result.value = null
      error.value = toAppError(rejection)
    } finally {
      if (run === loadRun) isLoading.value = false
    }
  }

  /** The two arrows: one month back or forward, keeping the filters put (R12). */
  function shift(delta: number, client?: HttpClient): Promise<void> {
    return show(shiftMonth(month.value, delta), filters.value, client)
  }

  /** A filter changed: same month, first page again (R3). */
  function applyFilters(next: StatementFilters, client?: HttpClient): Promise<void> {
    return show(month.value, next, client)
  }

  /**
   * Brings the next page of the SAME month and appends it. `pagination.total` and
   * `totals` stay the first page's: they belong to the month, not to the page (R13).
   */
  async function loadMore(client?: HttpClient): Promise<void> {
    if (isLoading.value || isLoadingMore.value || !hasMore.value) return
    const run = loadRun
    const next = page.value + 1
    isLoadingMore.value = true
    error.value = null
    try {
      const loaded = await getMovements(monthQuery(month.value, filters.value, next), client)
      if (run !== loadRun) return
      extra.value = [...extra.value, ...loaded.movements]
      page.value = next
    } catch (rejection) {
      if (run !== loadRun) return
      error.value = toAppError(rejection)
    } finally {
      if (run === loadRun) isLoadingMore.value = false
    }
  }

  /**
   * The lists that fill the two selects, one request each per session. A failure only
   * switches its own select off: the rest of the screen keeps working (R15).
   */
  async function loadAccounts(client?: HttpClient): Promise<void> {
    if (accountsRequested) return
    accountsRequested = true
    try {
      accounts.value = await getAccounts(client)
    } catch {
      accounts.value = null
      accountsFailed.value = true
    }
  }

  async function loadCategories(client?: HttpClient): Promise<void> {
    if (categoriesRequested) return
    categoriesRequested = true
    try {
      categories.value = await getCategories(client)
    } catch {
      categories.value = null
      categoriesFailed.value = true
    }
  }

  return {
    month,
    filters,
    result,
    extra,
    page,
    isLoading,
    isLoadingMore,
    error,
    accounts,
    accountsFailed,
    categories,
    categoriesFailed,
    days,
    shown,
    hasMore,
    show,
    shift,
    applyFilters,
    loadMore,
    loadAccounts,
    loadCategories,
  }
})
