import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { getMovements } from '@/shared/movements'

import { currentMonth, groupByDay, monthQuery, shiftMonth } from './months'
import type { MonthKey } from './months'
import type { DayGroup, Movement, MovementPage } from './types'

/**
 * The statement: the month on screen and what the API answered for it. Read only —
 * nothing here writes on a movement (C1) — and no action throws: a failure lives in
 * `error` and the view paints it (net-worth's pattern).
 */
export const useStatementStore = defineStore('statement', () => {
  const month = ref<MonthKey>(currentMonth())
  /** Null while never loaded, or when the last load of a month failed. */
  const result = ref<MovementPage | null>(null)
  /** The movements of pages 2..n the user brought with `Load more`, in order (R13). */
  const extra = ref<Movement[]>([])
  /** The last page of this month already on screen. */
  const page = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref<AppError | null>(null)

  // Only the latest request may write the state: the arrows are clicked faster than
  // the network answers, and September must never show July's figures (R15).
  let loadRun = 0

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

  /** Loads a month from scratch. Whatever `Load more` had brought goes with it. */
  async function show(next: MonthKey, client?: HttpClient): Promise<void> {
    const run = ++loadRun
    month.value = next
    isLoading.value = true
    error.value = null
    extra.value = []
    page.value = 0
    try {
      const loaded = await getMovements(monthQuery(next), client)
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

  /** The two arrows: one month back or forward from the month on screen (R2). */
  function shift(delta: number, client?: HttpClient): Promise<void> {
    return show(shiftMonth(month.value, delta), client)
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
      const loaded = await getMovements(monthQuery(month.value, next), client)
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

  return {
    month,
    result,
    extra,
    page,
    isLoading,
    isLoadingMore,
    error,
    days,
    shown,
    hasMore,
    show,
    shift,
    loadMore,
  }
})
