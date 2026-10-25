import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import { getExpensesByCategory } from './service'
import type { ExpensesByCategory, LoadState, PeriodQuery } from './types'

/**
 * The spending by category (feature 37). One read per period, asked again on every
 * visit: nothing is kept between visits. `load` never throws: a failure is kept in
 * `error` (R16). What is open on the screen belongs to each line, not to this store.
 */
export const useExpensesByCategoryStore = defineStore('expenses-by-category', () => {
  const data = ref<ExpensesByCategory | null>(null)
  const loadState = ref<LoadState>('idle')
  const error = ref<AppError | null>(null)
  /** The last period asked: what Try again asks again. */
  const query = ref<PeriodQuery | null>(null)

  // Only the latest `load` may keep its answer: a quick switch can overtake a slow read.
  let run = 0

  async function load(next: PeriodQuery, client?: HttpClient): Promise<void> {
    const current = ++run
    query.value = next
    // No figure of the old period under the new one.
    data.value = null
    error.value = null
    loadState.value = 'loading'
    try {
      const read = await getExpensesByCategory(next, client)
      if (current !== run) return
      data.value = read
      loadState.value = 'ready'
    } catch (rejection) {
      if (current !== run) return
      error.value = toAppError(rejection)
      loadState.value = 'error'
    }
  }

  /** The same period again (R16). */
  async function retry(client?: HttpClient): Promise<void> {
    if (query.value) await load(query.value, client)
  }

  return { data, loadState, error, query, load, retry }
})
