// Everything pure about narrowing a month (feature 20): the four filters, what they
// turn into for the API, what they turn into in the URL, how they are read back from
// a hand-written URL, and the sentences that name them. No state and no HTTP.
//
// The month lives here too, because the query of this screen is «this month AND these
// filters» in one request: `monthQuery` moved from `months.ts`, which knows nothing
// about filters. The guards of `q` and the readers of the querystring come from
// `@/shared/movement-filters`, shared with the review queue letter by letter (C3).

import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import {
  SEARCH_MAX,
  firstQueryValue,
  positiveIntegerQuery,
  searchTerm,
} from '@/shared/movement-filters'

import { STATEMENT_PAGE_SIZE, formatMonthLabel, monthFromRouteQuery, monthRange } from './months'
import type { MonthKey } from './months'
import type { MovementQuery } from './types'

/**
 * The four controls of the bar, and nothing else: no type (the sign of the amount
 * already says it), no status (the statement shows pending and confirmed alike) and
 * no date range (the month rules) — decisions.md 🔴 1.
 */
export interface StatementFilters {
  accountId: number | null
  categoryId: number | null
  uncategorized: boolean
  q: string
}

/** Entering the statement shows the whole month: `uncategorized` starts off (🔴 5). */
export const EMPTY_FILTERS: StatementFilters = {
  accountId: null,
  categoryId: null,
  uncategorized: false,
  q: '',
}

/** True when something narrows the month. A `q` too short to travel does not count. */
export function hasActiveFilters(filters: StatementFilters): boolean {
  return (
    filters.accountId !== null ||
    filters.categoryId !== null ||
    filters.uncategorized ||
    searchTerm(filters.q).value !== undefined
  )
}

/**
 * The exact query this screen asks for: the whole month AND the active filters, in one
 * request, so `totals` and `pagination.total` come back computed over what is on
 * screen (R1, R4). No `status`, so pending and confirmed both come back.
 * `uncategorized` wins over `categoryId`: sending both is a 400 (R9).
 */
export function monthQuery(
  month: MonthKey,
  filters: StatementFilters = EMPTY_FILTERS,
  page = 1,
): MovementQuery {
  const { from, to } = monthRange(month)
  const query: MovementQuery = { from, to, page, pageSize: STATEMENT_PAGE_SIZE }

  if (filters.accountId !== null) query.accountId = filters.accountId
  if (filters.uncategorized) {
    query.uncategorized = true
  } else if (filters.categoryId !== null) {
    query.categoryId = filters.categoryId
  }
  // Sent as typed: the backend already compares without case and without accents.
  const { value } = searchTerm(filters.q)
  if (value !== undefined) query.q = value

  return query
}

/**
 * What travels to the URL: the month of the F19 untouched, plus the same keys the
 * review queue already uses, so two URLs of the same app read alike (R8). No page
 * key: the statement does not paginate, it has `Load more`.
 */
export function toRouteQuery(month: MonthKey, filters: StatementFilters): LocationQueryRaw {
  const query: LocationQueryRaw = { month }

  if (filters.accountId !== null) query.account = String(filters.accountId)
  if (filters.uncategorized) {
    query.uncategorized = 'true'
  } else if (filters.categoryId !== null) {
    query.category = String(filters.categoryId)
  }
  if (filters.q.trim() !== '') query.q = filters.q.trim()

  return query
}

/**
 * Reads back what `toRouteQuery` wrote. Tolerant on purpose, and it is the barrier
 * that keeps the forbidden combination from ever being requested: with
 * `uncategorized=true` in the URL the category is dropped, whichever came first in
 * the text, so the 400 of the contract is never seen (R10).
 */
export function fromRouteQuery(
  query: LocationQuery,
  now?: Date,
): { month: MonthKey; filters: StatementFilters } {
  const uncategorized = firstQueryValue(query.uncategorized) === 'true'
  const category = positiveIntegerQuery(query.category)
  const q = firstQueryValue(query.q) ?? ''

  return {
    month: monthFromRouteQuery(query, now),
    filters: {
      accountId: positiveIntegerQuery(query.account) ?? null,
      categoryId: uncategorized ? null : (category ?? null),
      uncategorized,
      q: q.length > SEARCH_MAX ? '' : q,
    },
  }
}

/** The API's own count of the filtered month, in singular or plural. */
const countLine = (total: number): string =>
  total === 1 ? '1 movement matches these filters' : `${total} movements match these filters`

/**
 * The line under the figures that says what was filtered and how many matched (R5).
 * It does NOT compare against the unfiltered month: that would cost one request per
 * keystroke (decisions.md 🔴 2). The names come from the view, which has the lists;
 * an id with no name left (a deleted account) is shown as the id.
 */
export function filterScopeLine(
  filters: StatementFilters,
  total: number,
  month: MonthKey,
  names: { account?: string; category?: string } = {},
): string {
  const parts = [`${countLine(total)} in ${formatMonthLabel(month)}`]

  if (filters.uncategorized) {
    parts.push('Uncategorized')
  } else if (filters.categoryId !== null) {
    parts.push(`Category ${names.category ?? `#${filters.categoryId}`}`)
  }
  if (filters.accountId !== null) {
    parts.push(`Account ${names.account ?? `#${filters.accountId}`}`)
  }
  const { value } = searchTerm(filters.q)
  if (value !== undefined) parts.push(`"${value}"`)

  return parts.join(' · ')
}

/** Nothing matched, which is not the same as an empty month (R13). */
export function noMatchesLine(month: MonthKey): string {
  return `No movements match these filters in ${formatMonthLabel(month)}.`
}
