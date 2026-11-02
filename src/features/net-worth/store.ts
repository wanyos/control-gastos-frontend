import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import { getDepositEarnings, getNetWorth } from './service'
import type { DepositEarnings, NetWorth } from './types'

/** Holds the raw net worth; views derive groups and texts through pure functions. */
export const useNetWorthStore = defineStore('netWorth', () => {
  const netWorth = ref<NetWorth | null>(null)
  const isLoading = ref(false)
  const error = ref<AppError | null>(null)

  // What each deposit earned (feature 38): its own state, so a failure here never
  // touches the net worth, and the other way round.
  const deposits = ref<DepositEarnings | null>(null)
  const depositsLoading = ref(false)
  const depositsError = ref<AppError | null>(null)

  async function loadNetWorth(client?: HttpClient): Promise<void> {
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

  async function loadDeposits(client?: HttpClient): Promise<void> {
    depositsLoading.value = true
    depositsError.value = null
    try {
      deposits.value = await getDepositEarnings(client)
    } catch (rejection) {
      deposits.value = null
      depositsError.value = toAppError(rejection)
    } finally {
      depositsLoading.value = false
    }
  }

  /** Asks both at the same time. Never rethrows: each failure lives in its own error. */
  async function load(client?: HttpClient): Promise<void> {
    await Promise.all([loadNetWorth(client), loadDeposits(client)])
  }

  return {
    netWorth,
    isLoading,
    error,
    deposits,
    depositsLoading,
    depositsError,
    load,
  }
})
