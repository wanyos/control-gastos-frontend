import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import { getNetWorth } from './service'
import type { NetWorth } from './types'

/** Holds the raw net worth; views derive groups and texts through pure functions. */
export const useNetWorthStore = defineStore('netWorth', () => {
  const netWorth = ref<NetWorth | null>(null)
  const isLoading = ref(false)
  const error = ref<AppError | null>(null)

  /** Never rethrows: the failure lives in `error` for the view to show. */
  async function load(client?: HttpClient): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      netWorth.value = await getNetWorth(client)
    } catch (rejection) {
      netWorth.value = null
      error.value = toAppError(rejection)
    } finally {
      isLoading.value = false
    }
  }

  return { netWorth, isLoading, error, load }
})
