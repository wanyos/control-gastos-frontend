// Everything pure about reading a month (feature 25): the twelve months before it,
// whether it is complete, the median, the rate, the verdict and every sentence.
// No state and no HTTP.
//
// The figures are the backend's. The ONLY one worked out here is the median of the
// previous months' totals; the rest derives from two backend figures (C2). Always in
// integer cents: no float ever touches an amount.

import { formatMonthLabel, monthRange, shiftMonth } from '@/features/statement/months'
import { API_NETWORK, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import {
  formatDate,
  formatMoney,
  formatMoneyWhole,
  formatPercent,
  fromCents,
  sharePermille,
  toCents,
} from '@/shared/money'

import type {
  Comparison,
  DateOnly,
  DecimalString,
  MonthFigures,
  MonthKey,
  MonthState,
  Totals,
  Uncategorized,
  UsualComparison,
  Verdict,
} from './types'

export const PRIOR_MONTHS = 12
/** ±25 % of the median still reads as a usual month (R10). */
export const USUAL_BAND_PERMILLE = 250

export const MONEY_IN_LABEL = 'Money in'
export const MONEY_OUT_LABEL = 'Money out'
export const SAVINGS_LABEL = 'Savings'
export const SAVINGS_RATE_LABEL = 'Savings rate'

/** What a rate that cannot be shown reads as (R7, R8). */
export const NO_RATE = '—'
export const NO_INCOME_RATE_NOTE = 'No income this month, so there is no savings rate.'
export const INCOMPLETE_RATE_NOTE = 'Not shown: the month is incomplete.'
export const NO_COMPARISON_INCOMPLETE = 'No comparison for an incomplete month.'
export const COMPARISON_LOADING = 'Loading the previous months…'
export const COMPARISON_FAILED = "Couldn't load the previous months, so there is no comparison."
export const UNCATEGORIZED_FAILED = "Couldn't check how much of this spending has a category."
export const ALL_CATEGORIZED = "All of this month's spending has a category."

/** The twelve natural months before `month`, oldest first. */
export function priorMonths(month: MonthKey): MonthKey[] {
  return Array.from({ length: PRIOR_MONTHS }, (_, i) => shiftMonth(month, i - PRIOR_MONTHS))
}

/**
 * Incomplete = the newest movement of the whole base is before the month's last day.
 * Dates are compared as text and no clock is read: the frontend does not know until
 * when the data was imported, only where it ends (R8).
 */
export function monthState(figures: MonthFigures, latest: DateOnly | null): MonthState {
  if (figures.movementCount === 0) return 'empty'
  if (latest !== null && latest < monthRange(figures.month).to) return 'incomplete'
  return 'complete'
}

/**
 * The middle value: with an odd count, the central amount as the backend gave it; with
 * an even count, the mean of the two central ones, rounded once, half away from zero.
 */
export function medianAmount(amounts: readonly DecimalString[]): DecimalString | null {
  const sorted = amounts.map(toCents).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const upper = sorted[Math.floor(sorted.length / 2)]
  if (upper === undefined) return null
  if (sorted.length % 2 === 1) return fromCents(upper)

  const sum = upper + (sorted[sorted.length / 2 - 1] ?? upper)
  const half = sum / 2n
  return fromCents(sum % 2n === 0n ? half : half + (sum < 0n ? -1n : 1n))
}

export function compareWithUsual(value: DecimalString, usual: DecimalString): UsualComparison {
  const differencePermille = sharePermille(fromCents(toCents(value) - toCents(usual)), usual)
  if (differencePermille === null) return { usual, differencePermille, verdict: null }

  let verdict: Verdict = 'usual'
  if (differencePermille > USUAL_BAND_PERMILLE) verdict = 'more'
  if (differencePermille < -USUAL_BAND_PERMILLE) verdict = 'less'
  return { usual, differencePermille, verdict }
}

/**
 * The month against its previous months WITH data. Never called with a partial list:
 * a median over «the months that did arrive» would be an invented figure (R14).
 */
export function buildComparison(month: MonthFigures, prior: readonly MonthFigures[]): Comparison {
  const reference = prior.filter((figures) => figures.movementCount > 0)
  const against = (pick: (totals: Totals) => DecimalString): UsualComparison => {
    const usual = medianAmount(reference.map((figures) => pick(figures.totals)))
    return usual === null
      ? { usual: '0.00', differencePermille: null, verdict: null }
      : compareWithUsual(pick(month.totals), usual)
  }
  return {
    months: reference.length,
    income: against((totals) => totals.income),
    expense: against((totals) => totals.expense),
  }
}

/** `net` / `income` in tenths of a percent; null when nothing came in. */
export function savingsRatePermille(totals: Totals): number | null {
  return sharePermille(totals.net, totals.income)
}

/** The interpreted sentence: the first case of the table of R4 that holds. */
export function monthSentence(figures: MonthFigures, latest: DateOnly | null): string {
  const month = formatMonthLabel(figures.month)
  const state = monthState(figures, latest)

  if (state === 'empty') {
    return latest !== null && monthRange(figures.month).from > latest
      ? `No movements in ${month}. Your data ends on ${formatDate(latest)}.`
      : `No movements in ${month}.`
  }

  const { income, expense, net } = figures.totals
  const moneyIn = formatMoneyWhole(income)
  const moneyOut = formatMoneyWhole(expense)

  if (state === 'incomplete' && latest !== null) {
    return `${month} is incomplete: your data ends on ${formatDate(latest)}. So far, ${moneyIn} came in and ${moneyOut} went out.`
  }
  if (toCents(income) === 0n) {
    return toCents(expense) === 0n
      ? `In ${month}, nothing that counts came in or went out.`
      : `In ${month}, nothing came in and ${moneyOut} went out.`
  }

  const start = `In ${month}, ${moneyIn} came in and ${moneyOut} went out:`
  const saved = toCents(net)
  if (saved > 0n) {
    const rate = formatPercent(savingsRatePermille(figures.totals) ?? 0)
    return `${start} you saved ${formatMoneyWhole(net)}, ${rate} of what came in.`
  }
  if (saved === 0n) return `${start} you spent exactly what came in.`
  return `${start} you spent ${formatMoneyWhole(fromCents(-saved))} more than came in.`
}

/** Says how many months the month was compared with, and that the figure is worked out here (R11). */
export function comparisonCaption(months: number): string {
  if (months >= PRIOR_MONTHS) {
    return `Your usual month is the middle value of the previous ${PRIOR_MONTHS} months, worked out here from each month's totals.`
  }
  if (months >= 2) {
    return `Your usual month is the middle value of the ${months} previous months with data, worked out here from each month's totals.`
  }
  return months === 1
    ? 'Your usual month is the only previous month with data.'
    : 'No earlier months to compare with.'
}

/** `34,9 % above your usual month (2.967,58 €)`: the percentage goes without a sign. */
export function usualLineText(comparison: UsualComparison): string {
  const usual = formatMoney(comparison.usual)
  const difference = comparison.differencePermille
  if (difference === null) return `Your usual month is ${usual}`
  if (difference === 0) return `The same as your usual month (${usual})`
  const side = difference > 0 ? 'above' : 'below'
  return `${formatPercent(Math.abs(difference))} ${side} your usual month (${usual})`
}

export function verdictLabel(verdict: Verdict): string {
  if (verdict === 'more') return 'More than usual'
  return verdict === 'less' ? 'Less than usual' : 'About usual'
}

/** Share of the month's spending with no category, in tenths of a percent. */
export function uncategorizedPermille(
  uncategorized: Uncategorized,
  expense: DecimalString,
): number | null {
  return sharePermille(uncategorized.amount, expense)
}

/** The honesty line (R12): two backend figures and the share one is of the other. */
export function uncategorizedLine(uncategorized: Uncategorized, expense: DecimalString): string {
  if (toCents(uncategorized.amount) === 0n) return ALL_CATEGORIZED
  const share = uncategorizedPermille(uncategorized, expense)
  const count = `${uncategorized.count} ${uncategorized.count === 1 ? 'movement' : 'movements'}`
  const detail = share === null ? count : `${formatPercent(share)}, ${count}`
  return `${formatMoney(uncategorized.amount)} of this month's ${formatMoney(expense)} spending has no category yet (${detail}).`
}

export function statementLinkText(month: MonthKey): string {
  return `See the movements of ${formatMonthLabel(month)}`
}

/** An English sentence of our own: the backend's `message` is never painted (R13). */
export function overviewErrorMessage(error: AppError): string {
  if (error.code === API_NETWORK) return "Couldn't reach the server."
  if (error instanceof ValidationError) {
    return "The server answered, but the month couldn't be read."
  }
  return 'Something went wrong loading this month.'
}
