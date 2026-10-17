import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import { getRecurringExpenses } from './service'
import type { LoadState, MonthlyCost } from './types'

/**
 * What a month costs (feature 32). One read, asked again on every visit: nothing is
 * kept between visits. `load` never throws: a failure is kept in `error` (R16). What is
 * open on the screen is the view's, not this store's.
 */
export const useMonthlyCostStore = defineStore('monthly-cost', () => {
  const data = ref<MonthlyCost | null>(null)
  const loadState = ref<LoadState>('idle')
  const error = ref<AppError | null>(null)

  // Only the latest `load` may keep its answer: a retry can overtake a slow first read.
  let run = 0

  async function load(client?: HttpClient): Promise<void> {
    const current = ++run
    // No figure while reading (R3).
    data.value = null
    error.value = null
    loadState.value = 'loading'
    try {
      const read = await getRecurringExpenses(client)
      if (current !== run) return
      data.value = read
      loadState.value = 'ready'
    } catch (rejection) {
      if (current !== run) return
      error.value = toAppError(rejection)
      loadState.value = 'error'
    }
  }

  return { data, loadState, error, load }
})
