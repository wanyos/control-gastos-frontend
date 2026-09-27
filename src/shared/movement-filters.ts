// What every screen that filters movements needs letter by letter (feature 20): the
// local guards of `q` and the two tolerant readers of the querystring. It started in
// `features/review` (feature 15) and moved here untouched when a second screen — the
// statement — needed the same rules; `review/filters.ts` re-exports it, so nothing
// that was already importing it had to change (same move as features 17 and 18).
//
// No state, no HTTP: the filters of each screen build on top of this.

import type { LocationQuery } from 'vue-router'

export const SEARCH_MIN = 2
export const SEARCH_MAX = 100
export const SEARCH_TOO_LONG = `Search is limited to ${SEARCH_MAX} characters`

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

/** `noUncheckedIndexedAccess`: a key the URL does not carry reads as undefined. */
type QueryValue = LocationQuery[string] | undefined

export const firstQueryValue = (value: QueryValue): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : undefined
}

/** A positive integer, or undefined: anything else in the URL falls back to the default. */
export const positiveIntegerQuery = (value: QueryValue): number | undefined => {
  const raw = firstQueryValue(value)
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined
  const parsed = Number(raw)
  return parsed >= 1 ? parsed : undefined
}
