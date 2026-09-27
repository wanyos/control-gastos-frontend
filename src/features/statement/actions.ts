// Everything pure about correcting a category from the statement (feature 21): which
// rows still belong under the active filter, what the notice says, and the English
// sentence of a failed write. No state and no HTTP: the store and the view use it, the
// tests exercise it directly.
//
// The sentences are the ones the review queue uses, in the singular: here a write
// always touches ONE movement, and saying «some of those movements» would be false.

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

/**
 * The English sentence for a failed write. The backend's own `message` is never
 * painted: it comes in Spanish and names ids (R14). A 400 and a network failure are the
 * only two cases where nothing was written for sure (the contract is all or nothing);
 * the rest may have gone through, so the month is reloaded instead of claiming that
 * nothing happened (R15).
 */
export function writeErrorMessage(error: AppError): string {
  if (error instanceof ApiError && error.status === 400) {
    return "Nothing changed. That movement doesn't accept that category."
  }
  if (error instanceof ApiError && error.status === 404) {
    return 'Nothing changed: the movement or the category no longer exists. Reloading the month.'
  }
  if (error.code === API_NETWORK) {
    return "Couldn't reach the server. Nothing changed."
  }
  if (error instanceof ValidationError) {
    return "The server answered, but the reply couldn't be read. Reloading the month to show what really happened."
  }
  return 'Something went wrong. Reloading the month to show what really happened.'
}
