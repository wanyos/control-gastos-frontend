import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import { getInvestmentGains } from './service'
import type { InvestmentGains } from './types'

/** What each investment gains or loses (feature 40), read by the Investments screen. */
export const useInvestmentsStore = defineStore('investments', () => {
  const gains = ref<InvestmentGains | null>(null)
  const gainsLoading = ref(false)
  const gainsError = ref<AppError | null>(null)

  /** Never rethrows: the failure lives in `gainsError` for the view to show. */
  async function loadGains(client?: HttpClient): Promise<void> {
    gainsLoading.value = true
    gainsError.value = null
    try {
      gains.value = await getInvestmentGains(client)
    } catch (rejection) {
      gains.value = null
      gainsError.value = toAppError(rejection)
    } finally {
      gainsLoading.value = false
    }
  }

  /** After an import: asks the gains again only if they had been read (R13). */
  async function refreshGainsIfLoaded(client?: HttpClient): Promise<void> {
    if (gains.value === null) return
    await loadGains(client)
  }

  return {
    gains,
    gainsLoading,
    gainsError,
    loadGains,
    refreshGainsIfLoaded,
  }
})
