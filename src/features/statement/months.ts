// Everything pure about the month (feature 19): the key, the range it asks the API
// for, the jump between months, the URL, the grouping by day and the sentences.
// No state and no HTTP: the store and the view use it, the tests exercise it directly.
//
// The month — not a loose date — is the unit of this screen: the figures, the day
// headers and the URL all hang off it. Dates are built as TEXT, never with day
// arithmetic, so no timezone can shift a day (design.md §5).

import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import { API_NETWORK, ApiError, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { formatDate } from '@/shared/money'

import type { DayGroup, Movement } from './types'

/** `2026-09`. */
export type MonthKey = string

/**
 * The contract's maximum. The busiest real month has ~93 movements, so a whole
 * month always arrives in one request; `Load more` is the safety net, not the
 * everyday gesture (R1, R13).
 */
export const STATEMENT_PAGE_SIZE = 200

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/

// Immutable formatter, not state. UTC so the label never slips to the month before.
const MONTH_LABEL = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const isMonthKey = (value: string): boolean => MONTH.test(value)

/** `2026-09` → `{ year: 2026, index: 8 }`, or null when it is not a month key. */
function parts(month: MonthKey): { year: number; index: number } | null {
  const match = MONTH.exec(month)
  if (!match) return null
  return { year: Number(match[1]), index: Number(match[2]) - 1 }
}

const key = (year: number, index: number): MonthKey =>
  `${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`

/** The natural month of today, read in local time: the month the user lives in. */
export function currentMonth(now: Date = new Date()): MonthKey {
  return key(now.getFullYear(), now.getMonth())
}

/** `2026-09` → `{ from: '2026-09-01', to: '2026-09-30' }`, both ends included. */
export function monthRange(month: MonthKey): { from: string; to: string } {
  const at = parts(month)
  if (!at) {
    throw new ValidationError(`${JSON.stringify(month)} is not a YYYY-MM month`)
  }
  // Day 0 of the next month is the last day of this one, read in UTC.
  const lastDay = new Date(Date.UTC(at.year, at.index + 1, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

/** `shiftMonth('2026-01', -1)` → `'2025-12'`. Crosses the year without touching days. */
export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const at = parts(month)
  if (!at) {
    throw new ValidationError(`${JSON.stringify(month)} is not a YYYY-MM month`)
  }
  const moved = at.index + Math.trunc(delta)
  return key(at.year + Math.floor(moved / 12), ((moved % 12) + 12) % 12)
}

/** `2026-09` → `September 2026`. */
export function formatMonthLabel(month: MonthKey): string {
  const at = parts(month)
  if (!at) {
    throw new ValidationError(`${JSON.stringify(month)} is not a YYYY-MM month`)
  }
  return MONTH_LABEL.format(Date.UTC(at.year, at.index, 1))
}

/** True when there is nothing to look at ahead: the shown month is this one or later. */
export function isAtOrAfterCurrentMonth(month: MonthKey, now?: Date): boolean {
  return month >= currentMonth(now)
}

/** `noUncheckedIndexedAccess`: a key the URL does not carry reads as undefined. */
type QueryValue = LocationQuery[string] | undefined

const first = (value: QueryValue): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : undefined
}

/**
 * Reads `?month=`. Tolerant on purpose: a hand-edited or stale URL (`2026-13`,
 * `26-09`, empty) falls back to the current month with no error (R4).
 */
export function monthFromRouteQuery(query: LocationQuery, now?: Date): MonthKey {
  const raw = first(query.month) ?? ''
  return isMonthKey(raw) ? raw : currentMonth(now)
}

export function monthToRouteQuery(month: MonthKey): LocationQueryRaw {
  return { month }
}

/**
 * Splits the list the API already ordered into consecutive days. It never sorts:
 * the order is the backend's (`bookingDate DESC, daySequence DESC`), and a day
 * header is just where the date changes (R8).
 */
export function groupByDay(movements: readonly Movement[]): DayGroup[] {
  const days: DayGroup[] = []
  for (const movement of movements) {
    const last = days.at(-1)
    if (last && last.date === movement.bookingDate) {
      last.movements.push(movement)
      continue
    }
    days.push({
      date: movement.bookingDate,
      label: formatDate(movement.bookingDate),
      movements: [movement],
    })
  }
  return days
}

/** `93 movements` / `1 movement`. */
export function movementCountLine(total: number): string {
  return `${total} ${total === 1 ? 'movement' : 'movements'}`
}

/** `Showing 200 of 412`: what is on screen against the whole month (R13). */
export function showingLine(shown: number, total: number): string {
  return `Showing ${shown} of ${total}`
}

/** The empty-month sentence (R11), which names the month so it cannot be mistaken. */
export function emptyMonthLine(month: MonthKey): string {
  return `No movements in ${formatMonthLabel(month)}.`
}

export function loadingMonthLine(month: MonthKey): string {
  return `Loading ${formatMonthLabel(month)}…`
}

export interface StatementErrorText {
  message: string
  /** `clear` offers Clear filters, `retry` offers Try again (design.md §5). */
  action: 'clear' | 'retry'
}

/**
 * The English sentence for a failed month, and which button goes with it. The
 * backend's own `message` is never painted: it comes in Spanish and names database
 * ids (R12). A stale URL can still name an account or a category that was deleted —
 * that is a legitimate 404 — and then the way out is dropping the filters, not
 * retrying the same request (feature 20, R10).
 */
export function statementErrorMessage(error: AppError, hasFilters = false): StatementErrorText {
  if (error instanceof ApiError && error.status === 404) {
    return { message: 'That account or category no longer exists.', action: 'clear' }
  }
  if (error instanceof ApiError && error.status === 400) {
    return hasFilters
      ? { message: 'The backend rejected these filters.', action: 'clear' }
      : { message: 'The backend rejected that month.', action: 'retry' }
  }
  if (error instanceof ValidationError) {
    return {
      message: "The server answered, but the statement couldn't be read.",
      action: 'retry',
    }
  }
  if (error.code === API_NETWORK) {
    return { message: "Couldn't reach the server.", action: 'retry' }
  }
  return { message: 'Something went wrong loading this month.', action: 'retry' }
}
