// Everything pure about the months below the month (feature 26): which 24 months are
// shown, the run of months the backend adds up, the scale of the bars, the rows and
// every sentence. No state and no HTTP.
//
// The figures are the backend's: each row's are its month's and the sentence's are the
// period's. The only arithmetic here is picking the highest figure of the complete
// months, dividing each figure by it for the width of its bar, and flipping the sign of
// `net` in the sentence (C3). Always in integer cents.

import { formatMonthLabel, monthRange, shiftMonth } from '@/features/statement/months'
import { formatDate, formatMoneyWhole, fromCents, sharePermille, toCents } from '@/shared/money'

import { monthState } from './reading'
import type {
  DateOnly,
  DecimalString,
  MonthFigures,
  MonthKey,
  MonthRow,
  NetSign,
  PeriodTotals,
} from './types'

export const SHOWN_MONTHS = 24

export const PREVIOUS_MONTHS_TITLE = 'Month by month'
export const MONTH_COLUMN_LABEL = 'Month'
export const SHOWN_ABOVE = 'Shown above'
export const INCOMPLETE = 'Incomplete'
export const NO_MOVEMENTS = 'No movements'
/** Not `COMPARISON_LOADING`: both can be on screen at once. */
export const PREVIOUS_MONTHS_LOADING = 'Loading month by month…'
export const PREVIOUS_MONTHS_FAILED = "Couldn't load these months."
export const PERIOD_FAILED = "Couldn't add up these months."
export const NOTHING_TO_ADD_UP = 'No complete months to add up yet.'

/**
 * The 24 natural months that end in the month of the newest movement, newest first.
 * They hang off where the data ends, not off the month shown above nor off the clock,
 * so only the first one can be incomplete (R1).
 */
export function shownMonths(latest: DateOnly | null): MonthKey[] {
  if (latest === null) return []
  const newest = latest.slice(0, 7)
  return Array.from({ length: SHOWN_MONTHS }, (_, back) => shiftMonth(newest, -back))
}

/**
 * From the oldest of the 24 months to the newest one that is not incomplete: the month
 * of `latest` when the data reaches its last day, the one before it otherwise (R11).
 */
export function summedPeriod(latest: DateOnly | null): { from: MonthKey; to: MonthKey } | null {
  const months = shownMonths(latest)
  const newest = months[0]
  const oldest = months.at(-1)
  if (latest === null || newest === undefined || oldest === undefined) return null
  return { from: oldest, to: latest === monthRange(newest).to ? newest : shiftMonth(newest, -1) }
}

/** The highest figure, in or out, of the months it is given: what fills a whole bar (R3). */
export function scaleTop(complete: readonly MonthFigures[]): DecimalString | null {
  let top: bigint | null = null
  for (const { totals } of complete) {
    for (const cents of [toCents(totals.income), toCents(totals.expense)]) {
      if (top === null || cents > top) top = cents
    }
  }
  return top === null ? null : fromCents(top)
}

function netSignOf(net: DecimalString): NetSign {
  const cents = toCents(net)
  if (cents > 0n) return 'positive'
  return cents < 0n ? 'negative' : 'zero'
}

/**
 * One row per month, in the order given. Null when any month is still missing: there
 * are no rows by halves (R13). Only complete months get bars and a sign, and only they
 * set the scale (R3, R4, R9, R10).
 */
export function buildMonthRows(
  months: readonly MonthKey[],
  figuresByMonth: Readonly<Record<MonthKey, MonthFigures>>,
  latest: DateOnly | null,
  shown: MonthKey,
): MonthRow[] | null {
  const read: MonthFigures[] = []
  for (const month of months) {
    const figures = figuresByMonth[month]
    if (figures === undefined) return null
    read.push(figures)
  }

  const top = scaleTop(read.filter((figures) => monthState(figures, latest) === 'complete'))
  // A scale of zero has no share to speak of: the bar is simply empty.
  const width = (amount: DecimalString): number =>
    top === null ? 0 : (sharePermille(amount, top) ?? 0)

  return read.map((figures) => {
    const state = monthState(figures, latest)
    const isComplete = state === 'complete'
    return {
      month: figures.month,
      label: formatMonthLabel(figures.month),
      state,
      isShown: figures.month === shown,
      totals: state === 'empty' ? null : figures.totals,
      incomePermille: isComplete ? width(figures.totals.income) : null,
      expensePermille: isComplete ? width(figures.totals.expense) : null,
      netSign: isComplete ? netSignOf(figures.totals.net) : null,
    }
  })
}

/** What was saved over the period: the first case of the table of R11 that holds. */
export function periodSentence(period: PeriodTotals, first: MonthKey): string {
  if (period.movementCount === 0) return NOTHING_TO_ADD_UP

  const { income, expense, net } = period.totals
  const start = `From ${formatMonthLabel(first)} to ${formatMonthLabel(period.to)}, ${formatMoneyWhole(income)} came in and ${formatMoneyWhole(expense)} went out:`
  const saved = toCents(net)
  if (saved > 0n) return `${start} you saved ${formatMoneyWhole(net)}.`
  if (saved === 0n) return `${start} you spent exactly what came in.`
  return `${start} you spent ${formatMoneyWhole(fromCents(-saved))} more than came in.`
}

/** Says which month the sentence leaves out, when the newest of the 24 is incomplete (R12). */
export function leftOutLine(latest: DateOnly | null): string | null {
  const period = summedPeriod(latest)
  if (latest === null || period === null) return null
  const newest = latest.slice(0, 7)
  return newest === period.to ? null : `${formatMonthLabel(newest)} is left out: it is incomplete.`
}

/** Says that the month shown above is none of the rows; null when it is one, or there are none (R6). */
export function notShownLine(shown: MonthKey, months: readonly MonthKey[]): string | null {
  if (months.length === 0 || months.includes(shown)) return null
  return `${formatMonthLabel(shown)} is not one of these months.`
}

/** What an incomplete month shows where its bars would be (R9). */
export function dataEndsLine(latest: DateOnly): string {
  return `Data ends on ${formatDate(latest)}`
}
