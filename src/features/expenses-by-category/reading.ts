// Everything pure of the spending by category (feature 37): the period in the address,
// the switch between month and year, the names of a period, the sentence, the line of
// what has no category, the signed difference, the share of each bar, the error
// message and every text of the screen. No state and no HTTP.
//
// The figures are the backend's. The only thing worked out here is the share of each
// bar, in exact cents (design §6).

import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import { currentMonth, formatMonthLabel } from '@/features/statement/months'
import { API_NETWORK, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { formatMoney, formatPercent, fromCents, sharePermille, toCents } from '@/shared/money'

import type {
  CompareMonth,
  DateRange,
  DecimalString,
  ExpensesByCategory,
  PeriodMode,
  PeriodQuery,
} from './types'

export const TITLE = 'Expenses by category'
export const SUBTITLE = 'What your spending went on, fixed and variable, against the period before.'
export const MODE_MONTH = 'Month'
export const MODE_YEAR = 'Year'
export const COMPARE_LABEL = 'Compare with'
export const COMPARE_OPTIONS: ReadonlyArray<{ value: CompareMonth; label: string }> = [
  { value: 'previous-month', label: 'Previous month' },
  { value: 'same-month-last-year', label: 'Same month last year' },
]
export const LOADING_LINE = 'Reading your spending…'
export const TOTAL_LABEL = 'Total spent'
export const FIXED_TITLE = 'Fixed'
export const VARIABLE_TITLE = 'Variable'
export const NO_CATEGORY = 'No category'
export const NEW_BADGE = 'New'
export const GONE_BADGE = 'Gone'
export const SHOW_MOVEMENTS = 'Show movements'
export const HIDE_MOVEMENTS = 'Hide movements'
export const MONTHLY_COLUMN = 'A month'
export const DIFFERENCE_COLUMN = 'Difference'
export const NO_LINES = 'Nothing spent here in either period.'
export const ALL_CATEGORIZED = 'All of the spending in this period has a category.'
export const RETRY = 'Try again'

/**
 * The columns of a line and of its header, so both line up: name, bar, the period, the
 * compared one, the difference, in a year `A month`, and the button. Full literal class
 * names: Tailwind scans source as text. Below `md` the row wraps instead.
 */
export const LINE_COLUMNS: Readonly<Record<PeriodMode, string>> = {
  month: 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_7rem_7rem_7rem_10rem]',
  year: 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_7rem_7rem_7rem_6rem_10rem]',
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR = /^\d{4}$/
const COMPARES: readonly string[] = COMPARE_OPTIONS.map((option) => option.value)

// Immutable formatter, not state. UTC, as `formatMonthLabel`, so no month slips.
const MONTH_NAME = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' })

/** `noUncheckedIndexedAccess`: a key the URL does not carry reads as undefined. */
type QueryValue = LocationQuery[string] | undefined

const first = (value: QueryValue): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : undefined
}

const isCompareMonth = (value: string): value is CompareMonth => COMPARES.includes(value)

/** The current month against the previous one: what the screen opens on (R3). */
export function defaultPeriod(now?: Date): PeriodQuery {
  return { mode: 'month', month: currentMonth(now), compare: 'previous-month' }
}

/**
 * Reads `?month=YYYY-MM&compare=…` or `?year=YYYY`. Anything it does not understand —
 * both at once, a month 13, an unknown comparison — reads as the default (R6).
 */
export function periodFromRouteQuery(query: LocationQuery, now?: Date): PeriodQuery {
  const month = first(query.month)
  const year = first(query.year)
  const compare = first(query.compare)

  if (month !== undefined && year === undefined && MONTH.test(month)) {
    if (compare === undefined) return { mode: 'month', month, compare: 'previous-month' }
    if (isCompareMonth(compare)) return { mode: 'month', month, compare }
    return defaultPeriod(now)
  }
  if (year !== undefined && month === undefined && compare === undefined && YEAR.test(year)) {
    return { mode: 'year', year }
  }
  return defaultPeriod(now)
}

export function periodToRouteQuery(query: PeriodQuery): LocationQueryRaw {
  return query.mode === 'month'
    ? { month: query.month, compare: query.compare }
    : { year: query.year }
}

/**
 * Month to year: the year of the month on screen. Year to month: the current month if it
 * is this year, December of that year if not, against the previous month (R4).
 */
export function switchMode(query: PeriodQuery, mode: PeriodMode, now?: Date): PeriodQuery {
  if (query.mode === mode) return query
  if (query.mode === 'month') return { mode: 'year', year: query.month.slice(0, 4) }
  const today = currentMonth(now)
  const month = today.startsWith(`${query.year}-`) ? today : `${query.year}-12`
  return { mode: 'month', month, compare: 'previous-month' }
}

/** `September 2026`, `2025`, or `January – October 2026` (R7). */
export function periodLabel(range: DateRange): string {
  const from = range.from.slice(0, 7)
  const to = range.to.slice(0, 7)
  if (from === to) return formatMonthLabel(from)
  const fromYear = from.slice(0, 4)
  if (fromYear !== to.slice(0, 4)) return `${formatMonthLabel(from)} – ${formatMonthLabel(to)}`
  if (from.endsWith('-01') && to.endsWith('-12')) return fromYear
  const name = MONTH_NAME.format(Date.UTC(Number(fromYear), Number(from.slice(5)) - 1, 1))
  return `${name} – ${formatMonthLabel(to)}`
}

export type DifferenceTone = 'up' | 'down' | 'same'

/** More spending is worse: up in the negative tone, down in the positive one. */
export const DIFFERENCE_CLASSES: Readonly<Record<DifferenceTone, string>> = {
  up: 'text-negative',
  down: 'text-positive',
  same: 'text-ink-muted',
}

export function differenceTone(difference: DecimalString): DifferenceTone {
  const cents = toCents(difference)
  if (cents > 0n) return 'up'
  if (cents < 0n) return 'down'
  return 'same'
}

/** `+25,86 €`, `-23,81 €`, `0,00 €` (R10). */
export function formatDifference(difference: DecimalString): string {
  const money = formatMoney(difference)
  return differenceTone(difference) === 'up' ? `+${money}` : money
}

/** The share of `part` over the period total, for a bar: 0 when there is no total (R10). */
export function barPermille(part: DecimalString, total: DecimalString): number {
  return sharePermille(part, total) ?? 0
}

/** `August 2026: 688,34 € · +25,86 €`, under the total (R8). */
export function comparedCaption(data: ExpensesByCategory): string {
  return `${periodLabel(data.compared)}: ${formatMoney(data.comparedAmount)} · ${formatDifference(data.difference)}`
}

/** Today's month in a month, today's year in a year: a period still running. */
function isInProgress(data: ExpensesByCategory, now?: Date): boolean {
  const today = currentMonth(now)
  if (data.period.month !== null) return data.period.month === today
  return data.period.year === today.slice(0, 4)
}

export function isEmptyPeriod(data: ExpensesByCategory): boolean {
  return toCents(data.amount) === 0n && toCents(data.comparedAmount) === 0n
}

/** `No spending counted in September 2026 or in August 2026.` (R7) */
export function emptySentence(data: ExpensesByCategory): string {
  return `No spending counted in ${periodLabel(data.period)} or in ${periodLabel(data.compared)}.`
}

/**
 * The period read in words, before any figure (R7). «Today» only chooses between `In`
 * and `So far in`; it never works out a date.
 */
export function periodSentence(data: ExpensesByCategory, now?: Date): string {
  if (isEmptyPeriod(data)) return emptySentence(data)

  const running = isInProgress(data, now)
  const lead = `${running ? 'So far in' : 'In'} ${periodLabel(data.period)} you spent ${formatMoney(data.amount)}`
  const compared =
    running && data.period.month !== null
      ? `the whole of ${periodLabel(data.compared)}`
      : periodLabel(data.compared)

  if (toCents(data.comparedAmount) === 0n) {
    return `${lead}. Nothing counted as spending in ${compared}.`
  }
  const cents = toCents(data.difference)
  if (cents === 0n) return `${lead}, the same as in ${compared}.`
  const by = formatMoney(fromCents(cents < 0n ? -cents : cents))
  return `${lead}, ${by} ${cents > 0n ? 'more' : 'less'} than in ${compared}.`
}

/** `1 movement with no category — 2,0 % of the spending` (R14). */
export function uncategorizedLine(count: number, permille: number): string {
  const movements = count === 1 ? 'movement' : 'movements'
  return `${count} ${movements} with no category — ${formatPercent(permille)} of the spending`
}

/** The line with no category in words, or ALL_CATEGORIZED when it spent nothing (R14). */
export function uncategorizedText(data: ExpensesByCategory): string {
  const line = data.variable.lines.find((candidate) => candidate.category === null)
  if (!line || toCents(line.amount) === 0n) return ALL_CATEGORIZED
  return uncategorizedLine(line.movements.length, barPermille(line.amount, data.amount))
}

/** What failed, in words (R16). The backend's own message is never painted. */
export function expensesErrorMessage(error: AppError): string {
  if (error.code === API_NETWORK) return "Couldn't reach the server."
  if (error instanceof ValidationError) {
    return "The server answered, but the spending couldn't be read."
  }
  return 'Something went wrong loading your spending.'
}
