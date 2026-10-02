import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { currentMonth } from '@/features/statement/months'
import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import { buildComparison, monthSentence, monthState, priorMonths } from './reading'
import { getLatestBookingDate, getMonthFigures, getUncategorizedSpending } from './service'
import type {
  Comparison,
  DateOnly,
  LoadState,
  MonthFigures,
  MonthKey,
  MonthState,
  Uncategorized,
} from './types'

/**
 * The month at a glance (feature 25). It only reads: the month's figures, the date of
 * the newest movement, the twelve months before and the spending with no category.
 * What is read of a month is kept for one visit, in here and never in a module
 * variable (C3). No action throws: each group of reads has its own state, so a failed
 * comparison never takes the month's figures down with it (R13, R14).
 */
export const useOverviewStore = defineStore('overview', () => {
  const month = ref<MonthKey>(currentMonth())
  /** What was read in this visit, by month. */
  const figuresByMonth = ref<Record<MonthKey, MonthFigures>>({})
  /** The date of the newest movement of the whole base; null when there is none. */
  const latest = ref<DateOnly | null>(null)
  const core = ref<LoadState>('idle')
  const coreError = ref<AppError | null>(null)
  const comparisonLoad = ref<LoadState>('idle')
  const uncategorized = ref<Uncategorized | null>(null)
  const uncategorizedLoad = ref<LoadState>('idle')

  // Only the latest `show` may paint: the arrows are clicked faster than the network (C4).
  let run = 0
  // A visit ends at `reset`: an answer that started before it must not be kept (C3).
  let visit = 0
  let isLatestKnown = false

  const figures = computed<MonthFigures | null>(() => figuresByMonth.value[month.value] ?? null)

  const state = computed<MonthState | null>(() =>
    core.value === 'ready' && figures.value ? monthState(figures.value, latest.value) : null,
  )

  /**
   * Only with the twelve previous months read: a median over the ones that did arrive
   * would be an invented figure (R14).
   */
  const comparison = computed<Comparison | null>(() => {
    if (state.value !== 'complete' || comparisonLoad.value !== 'ready' || !figures.value) {
      return null
    }
    const prior = priorMonths(month.value).flatMap((key) => figuresByMonth.value[key] ?? [])
    return prior.length === priorMonths(month.value).length
      ? buildComparison(figures.value, prior)
      : null
  })

  const sentence = computed<string | null>(() =>
    core.value === 'ready' && figures.value ? monthSentence(figures.value, latest.value) : null,
  )

  /** Reads one month unless this visit already has it. A stale answer is still that month's. */
  async function readFigures(key: MonthKey, client?: HttpClient): Promise<MonthFigures> {
    const known = figuresByMonth.value[key]
    if (known) return known
    const started = visit
    const read = await getMonthFigures(key, client)
    if (started === visit) figuresByMonth.value[key] = read
    return read
  }

  async function readLatest(client?: HttpClient): Promise<void> {
    if (isLatestKnown) return
    const started = visit
    const date = await getLatestBookingDate(client)
    if (started !== visit) return
    latest.value = date
    isLatestKnown = true
  }

  async function loadComparison(current: number, client?: HttpClient): Promise<void> {
    comparisonLoad.value = 'loading'
    const missing = priorMonths(month.value).filter((key) => !figuresByMonth.value[key])
    // Settled, not all: the months that did arrive stay for the retry.
    const answers = await Promise.allSettled(missing.map((key) => readFigures(key, client)))
    if (current !== run) return
    comparisonLoad.value = answers.some((answer) => answer.status === 'rejected')
      ? 'error'
      : 'ready'
  }

  async function loadUncategorized(current: number, client?: HttpClient): Promise<void> {
    uncategorizedLoad.value = 'loading'
    try {
      const read = await getUncategorizedSpending(month.value, client)
      if (current !== run) return
      uncategorized.value = read
      uncategorizedLoad.value = 'ready'
    } catch {
      if (current !== run) return
      uncategorizedLoad.value = 'error'
    }
  }

  async function show(next: MonthKey, client?: HttpClient): Promise<void> {
    const current = ++run
    month.value = next
    coreError.value = null
    comparisonLoad.value = 'idle'
    uncategorized.value = null
    uncategorizedLoad.value = 'idle'
    // A month this visit already read does not go back to «loading».
    core.value = figuresByMonth.value[next] && isLatestKnown ? 'ready' : 'loading'

    let shown: MonthFigures
    try {
      const [read] = await Promise.all([readFigures(next, client), readLatest(client)])
      shown = read
    } catch (rejection) {
      if (current !== run) return
      coreError.value = toAppError(rejection)
      core.value = 'error'
      return
    }
    if (current !== run) return
    core.value = 'ready'

    const reached = monthState(shown, latest.value)
    if (reached === 'empty') return
    await Promise.all([
      loadUncategorized(current, client),
      // An incomplete month has no comparison, so its previous months are not asked for.
      reached === 'complete' ? loadComparison(current, client) : undefined,
    ])
  }

  async function retry(client?: HttpClient): Promise<void> {
    await show(month.value, client)
  }

  /** Asks only for the previous months still missing. */
  async function retryComparison(client?: HttpClient): Promise<void> {
    if (state.value !== 'complete' || comparisonLoad.value === 'loading') return
    await loadComparison(run, client)
  }

  /** Forgets everything read: a visit starts clean (C3). */
  function reset(): void {
    run++
    visit++
    isLatestKnown = false
    figuresByMonth.value = {}
    latest.value = null
    core.value = 'idle'
    coreError.value = null
    comparisonLoad.value = 'idle'
    uncategorized.value = null
    uncategorizedLoad.value = 'idle'
  }

  /** After an import the figures may have changed: read again, if anything was read (C3). */
  async function refreshIfLoaded(client?: HttpClient): Promise<void> {
    if (core.value === 'idle') return
    reset()
    await show(month.value, client)
  }

  return {
    month,
    figuresByMonth,
    latest,
    core,
    coreError,
    comparisonLoad,
    uncategorized,
    uncategorizedLoad,
    figures,
    state,
    comparison,
    sentence,
    show,
    retry,
    retryComparison,
    reset,
    refreshIfLoaded,
  }
})
