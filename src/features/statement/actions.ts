// Everything pure about the two writes of the statement: which rows still belong under
// the active filter, what the notice says, and the English sentence of a failed write.
// No state and no HTTP: the store and the view use it, the tests exercise it directly.
//
// Feature 21 (the category of ONE movement) speaks in the singular: saying «some of
// those movements» would be false there. Feature 22 (the exclusion mark over a
// SELECTION) speaks in the plural, so `writeErrorMessage` takes which gesture failed
// and nothing else changes — the sentences of the F21 stay word for word.

import { API_NETWORK, ApiError, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import type { StatementFilters } from './filters'
import type { Category, Movement } from './types'

/** True when what is on screen is narrowed BY CATEGORY, the only filter a write moves. */
export function hasCategoryFilter(filters: StatementFilters): boolean {
  return filters.uncategorized || filters.categoryId !== null
}

/**
 * Whether a movement still belongs under the active category filter (R8). The other
 * two filters (`accountId`, `q`) cannot stop being met by changing a category, so they
 * are not looked at.
 */
export function matchesCategoryFilter(movement: Movement, filters: StatementFilters): boolean {
  if (filters.uncategorized) return movement.categoryId === null
  if (filters.categoryId !== null) return movement.categoryId === filters.categoryId
  return true
}

/** The name of a category anywhere in the tree: the children are one level deep. */
export function findCategoryName(
  categories: Category[] | null,
  id: number | null,
): string | undefined {
  if (id === null) return undefined
  for (const root of categories ?? []) {
    if (root.id === id) return root.name
    const child = root.children.find((one) => one.id === id)
    if (child) return child.name
  }
  return undefined
}

/** What the notice says a write did, e.g. `Categorized as Groceries` (R11). */
export function actionSummary(categoryId: number | null, categoryName?: string): string {
  if (categoryId === null) return 'Category removed'
  return `Categorized as ${categoryName ?? 'a category'}`
}

/** What the notice says after the undo went through (R12). */
export const UNDONE_SUMMARY = 'Change undone'

// ─── Marking movements as not counted (feature 22) ─────────────────────────

/**
 * From here up, the exclusion asks first. The same threshold the F16 fixed for the
 * bulk actions of the review queue (decisions.md 🔴 3): a typical batch here — one
 * account, one month — is 1 to 10 movements and never sees the dialog. It does NOT
 * come from `review/actions.ts`: it is a decision of each screen's interface, and this
 * feature imports nothing from another feature (C3).
 */
export const STATEMENT_BULK_THRESHOLD = 20

/** `1 movement` / `3 movements`: every sentence about a count goes through here. */
export const countOf = (count: number): string =>
  `${count} ${count === 1 ? 'movement' : 'movements'}`

/** What the notice says an exclusion did, e.g. `3 movements excluded from totals` (R14). */
export function exclusionSummary(count: number, excluded: boolean): string {
  return `${countOf(count)} ${excluded ? 'excluded from totals' : 'back in totals'}`
}

/** Everything selected is already the way it was asked to be, so nothing is sent (R3). */
export const NOTHING_TO_CHANGE = 'Nothing to change: those movements are already like that.'

/** Which of the two writes failed: they fail with different words (R15). */
export type WriteGesture = 'category' | 'exclusion'

/**
 * The English sentence for a failed write. The backend's own `message` is never
 * painted: it comes in Spanish and names ids (R14). A 400 and a network failure are the
 * only two cases where nothing was written for sure (the contract is all or nothing);
 * the rest may have gone through, so the month is reloaded instead of claiming that
 * nothing happened (R15).
 */
export function writeErrorMessage(error: AppError, gesture: WriteGesture = 'category'): string {
  if (error instanceof ApiError && error.status === 400) {
    return gesture === 'exclusion'
      ? 'Nothing changed. The server rejected that change.'
      : "Nothing changed. That movement doesn't accept that category."
  }
  if (error instanceof ApiError && error.status === 404) {
    return gesture === 'exclusion'
      ? 'Nothing changed: one of those movements no longer exists. Reloading the month.'
      : 'Nothing changed: the movement or the category no longer exists. Reloading the month.'
  }
  if (error.code === API_NETWORK) {
    return "Couldn't reach the server. Nothing changed."
  }
  if (error instanceof ValidationError) {
    return "The server answered, but the reply couldn't be read. Reloading the month to show what really happened."
  }
  return 'Something went wrong. Reloading the month to show what really happened.'
}
