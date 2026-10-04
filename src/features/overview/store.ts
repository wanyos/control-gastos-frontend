import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { currentMonth } from '@/features/statement/months'
import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import { buildMonthRows, shownMonths, summedPeriod } from './previousMonths'
import { buildComparison, monthSentence, monthState, priorMonths } from './reading'
import {
  getLatestBookingDate,
  getMonthFigures,
  getPeriodTotals,
  getUncategorizedSpending,
} from './service'
import type {
  Comparison,
  DateOnly,
  LoadState,
  MonthFigures,
  MonthKey,
  MonthRow,
  MonthState,
  PeriodTotals,
  Uncategorized,
} from './types'

/**
 * The month at a glance (feature 25). It only reads: the month's figures, the date of
 * the newest movement, the twelve months before and the spending with no category.
 * What is read of a month is kept for one visit, in here and never in a module
 * variable (C3). No action throws: each group of reads has its own state, so a failed
 * comparison never takes the month's figures down with it (R13, R14).
 *
 * The months below the month (feature 26) live here too, so that both parts share what
 * was read: a month is asked for once in a visit, whoever needs it.
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
  /** The 24 months below the month: the date of the newest movement and their figures. */
  const previousLoad = ref<LoadState>('idle')
  /** What the backend adds up over the complete months of the 24. */
  const period = ref<PeriodTotals | null>(null)
  const periodLoad = ref<LoadState>('idle')

  // Only the latest `show` may paint: the arrows are clicked faster than the network (C4).
  let run = 0
  // A visit ends at `reset`: an answer that started before it must not be kept (C3).
  let visit = 0
  let isLatestKnown = false
  // Reads still on their way: whoever asks for the same thing meanwhile waits for them.
  const figuresInFlight = new Map<MonthKey, Promise<MonthFigures>>()
  let latestInFlight: Promise<void> | null = null

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

  /** The 24 months that end where the data ends; they do not move with the month above. */
  const previousMonths = computed<MonthKey[]>(() => shownMonths(latest.value))

  /** Only with the 24 months read: there are no rows by halves (feature 26, R13). */
  const monthRows = computed<MonthRow[] | null>(() =>
    previousLoad.value === 'ready'
      ? buildMonthRows(previousMonths.value, figuresByMonth.value, latest.value, month.value)
      : null,
  )

  /**
   * Reads one month unless this visit already has it or is already reading it.
   * A stale answer is still that month's.
   */
  function readFigures(key: MonthKey, client?: HttpClient): Promise<MonthFigures> {
    const known = figuresByMonth.value[key]
    if (known) return Promise.resolve(known)
    const pending = figuresInFlight.get(key)
    if (pending) return pending

    const started = visit
    const reading = getMonthFigures(key, client)
      .then((read) => {
        if (started === visit) figuresByMonth.value[key] = read
        return read
      })
      .finally(() => {
        // Not after a `reset`: by then the entry may be another visit's read.
        if (figuresInFlight.get(key) === reading) figuresInFlight.delete(key)
      })
    figuresInFlight.set(key, reading)
    return reading
  }

  function readLatest(client?: HttpClient): Promise<void> {
    if (isLatestKnown) return Promise.resolve()
    if (latestInFlight) return latestInFlight

    const started = visit
    const reading = getLatestBookingDate(client)
      .then((date) => {
        if (started !== visit) return
        latest.value = date
        isLatestKnown = true
      })
      .finally(() => {
        if (latestInFlight === reading) latestInFlight = null
      })
    latestInFlight = reading
    return reading
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

  /** The figures of the 24 months still missing. One failure and there are no rows (R13). */
  async function loadPreviousFigures(started: number, client?: HttpClient): Promise<void> {
    const missing = previousMonths.value.filter((key) => !figuresByMonth.value[key])
    // Settled, not all: the months that did arrive stay for the retry.
    const answers = await Promise.allSettled(missing.map((key) => readFigures(key, client)))
    if (started !== visit) return
    previousLoad.value = answers.some((answer) => answer.status === 'rejected') ? 'error' : 'ready'
  }

  /** Its own state: a failed sum leaves the rows where they are (R14). */
  async function loadPeriod(started: number, client?: HttpClient): Promise<void> {
    const span = summedPeriod(latest.value)
    if (span === null || period.value || periodLoad.value === 'loading') return
    periodLoad.value = 'loading'
    try {
      const read = await getPeriodTotals(span.from, span.to, client)
      if (started !== visit) return
      period.value = read
      periodLoad.value = 'ready'
    } catch {
      if (started !== visit) return
      periodLoad.value = 'error'
    }
  }

  /**
   * Reads the 24 months and their sum. It does not hang off the month shown above, so
   * `run` does not matter here; `visit` does. Called again, it asks only for what is
   * still missing, the sum included (R13, R14).
   */
  async function loadPreviousMonths(client?: HttpClient): Promise<void> {
    if (previousLoad.value === 'loading') return
    const started = visit
    // Rows already read stay while only the sum is asked for again (R14).
    const hasRows = isLatestKnown && previousMonths.value.every((key) => figuresByMonth.value[key])
    previousLoad.value = hasRows ? 'ready' : 'loading'

    try {
      await readLatest(client)
    } catch {
      if (started === visit) previousLoad.value = 'error'
      return
    }
    if (started !== visit) return
    if (latest.value === null) {
      // A base with no movements: no months to show and nothing to add up (R1).
      previousLoad.value = 'ready'
      return
    }
    await Promise.all([loadPreviousFigures(started, client), loadPeriod(started, client)])
  }

  /** Forgets everything read: a visit starts clean (C3). */
  function reset(): void {
    run++
    visit++
    isLatestKnown = false
    figuresInFlight.clear()
    latestInFlight = null
    figuresByMonth.value = {}
    latest.value = null
    core.value = 'idle'
    coreError.value = null
    comparisonLoad.value = 'idle'
    uncategorized.value = null
    uncategorizedLoad.value = 'idle'
    previousLoad.value = 'idle'
    period.value = null
    periodLoad.value = 'idle'
  }

  /** After an import the figures may have changed: read again, if anything was read (C3). */
  async function refreshIfLoaded(client?: HttpClient): Promise<void> {
    const hadMonth = core.value !== 'idle'
    const hadPreviousMonths = previousLoad.value !== 'idle'
    if (!hadMonth && !hadPreviousMonths) return
    reset()
    // The month above first: its request stays the first one of the screen.
    const showing = hadMonth ? show(month.value, client) : undefined
    await Promise.all([showing, hadPreviousMonths ? loadPreviousMonths(client) : undefined])
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
    previousLoad,
    period,
    periodLoad,
    figures,
    state,
    comparison,
    sentence,
    previousMonths,
    monthRows,
    show,
    retry,
    retryComparison,
    loadPreviousMonths,
    reset,
    refreshIfLoaded,
  }
})
