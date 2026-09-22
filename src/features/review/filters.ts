// Pure filter logic of the review queue (feature 15): filters ↔ API query,
// filters ↔ URL query, and the local guards of `q`. No state, no HTTP: the store
// and the view use it, the tests exercise it directly.

import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import type { MovementQuery, MovementType, ReviewFilters } from './types'

/**
 * 100 per page: the F16 will be able to act on a whole page in one request (the
 * backend caps both `pageSize` and the bulk PATCH at 200) and a page is still
 * short enough to read. Not selectable: one control and one URL key less.
 */
export const PAGE_SIZE = 100

/** The queue is, by definition, what is waiting for review: there is no status control. */
export const QUEUE_STATUS = 'pending_review' as const

export const MOVEMENT_TYPES: readonly MovementType[] = ['expense', 'income', 'neutral']

/** Long enough to swallow a burst of keystrokes, short enough to feel live. */
export const SEARCH_DEBOUNCE_MS = 350

export const SEARCH_MIN = 2
export const SEARCH_MAX = 100
export const SEARCH_TOO_LONG = `Search is limited to ${SEARCH_MAX} characters`

export const EMPTY_FILTERS: ReviewFilters = {
  accountId: null,
  from: '',
  to: '',
  type: '',
  categoryId: null,
  uncategorized: false,
  q: '',
}

/**
 * The contract's two limits, measured where the backend measures them: the maximum
 * over the text as typed (spaces included), the minimum over the trimmed text. Under
 * the minimum there is no error — typing the first letter is not a mistake — the
 * search simply does not travel.
 */
export function searchTerm(q: string): { value?: string; error?: string } {
  if (q.length > SEARCH_MAX) {
    return { error: SEARCH_TOO_LONG }
  }
  const trimmed = q.trim()
  return trimmed.length >= SEARCH_MIN ? { value: trimmed } : {}
}

/** True when something other than the queue status narrows the list. */
export function hasActiveFilters(filters: ReviewFilters): boolean {
  return (
    filters.accountId !== null ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.type !== '' ||
    filters.categoryId !== null ||
    filters.uncategorized ||
    searchTerm(filters.q).value !== undefined
  )
}

/** What travels to the API. `uncategorized` wins over `categoryId`: both is a 400 (R6). */
export function toQuery(filters: ReviewFilters, page: number): MovementQuery {
  const query: MovementQuery = { status: QUEUE_STATUS, page, pageSize: PAGE_SIZE }

  if (filters.accountId !== null) query.accountId = filters.accountId
  if (filters.from !== '') query.from = filters.from
  if (filters.to !== '') query.to = filters.to
  if (filters.type !== '') query.type = filters.type
  if (filters.uncategorized) {
    query.uncategorized = true
  } else if (filters.categoryId !== null) {
    query.categoryId = filters.categoryId
  }
  const { value } = searchTerm(filters.q)
  if (value !== undefined) query.q = value

  return query
}

/** What travels to the URL: short keys, and nothing for a filter that is not set. */
export function toRouteQuery(filters: ReviewFilters, page: number): LocationQueryRaw {
  const query: LocationQueryRaw = {}

  if (filters.accountId !== null) query.account = String(filters.accountId)
  if (filters.from !== '') query.from = filters.from
  if (filters.to !== '') query.to = filters.to
  if (filters.type !== '') query.type = filters.type
  if (filters.uncategorized) {
    query.uncategorized = 'true'
  } else if (filters.categoryId !== null) {
    query.category = String(filters.categoryId)
  }
  if (filters.q.trim() !== '') query.q = filters.q.trim()
  if (page > 1) query.page = String(page)

  return query
}

/** `noUncheckedIndexedAccess`: a key the URL does not carry reads as undefined. */
type QueryValue = LocationQuery[string] | undefined

const first = (value: QueryValue): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : undefined
}

/** A positive integer, or undefined: anything else in the URL falls back to the default. */
const positiveInteger = (value: QueryValue): number | undefined => {
  const raw = first(value)
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined
  const parsed = Number(raw)
  return parsed >= 1 ? parsed : undefined
}

const dateOnly = (value: QueryValue): string => {
  const raw = first(value) ?? ''
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

/**
 * Reads back what `toRouteQuery` wrote. Tolerant on purpose: a hand-edited or stale
 * URL (`page=abc`, `type=foo`) falls back to the defaults instead of throwing (R10).
 */
export function fromRouteQuery(query: LocationQuery): { filters: ReviewFilters; page: number } {
  const type = first(query.type) ?? ''
  const uncategorized = first(query.uncategorized) === 'true'
  const category = positiveInteger(query.category)
  const q = first(query.q) ?? ''

  return {
    filters: {
      accountId: positiveInteger(query.account) ?? null,
      from: dateOnly(query.from),
      to: dateOnly(query.to),
      type: (MOVEMENT_TYPES as readonly string[]).includes(type) ? (type as MovementType) : '',
      categoryId: uncategorized ? null : (category ?? null),
      uncategorized,
      q: q.length > SEARCH_MAX ? '' : q,
    },
    page: positiveInteger(query.page) ?? 1,
  }
}
