// Pure logic of the review actions (feature 16): who accepts a category, how an
// action is undone and what the screen says about it. No state, no HTTP: the store
// and the components use it, the tests exercise it directly.

import { API_NETWORK, ApiError, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { MAX_IDS, needsReload } from '@/shared/movements'

import type { Category, CategoryKind, Movement, MovementChanges, UndoGroup } from './types'

// `needsReload` moved to `@/shared/movements` in feature 21 — it describes the contract
// of the PATCH, not this screen — and is re-exported so nothing that imported it from
// here had to change.
export { needsReload }

// `MAX_IDS` moved to `@/shared/movements` in feature 22 with the bulk PATCH it belongs
// to — it is the contract's cap, not this screen's — and is re-exported so nothing that
// imported it from here had to change.
export { MAX_IDS }

/** Finds a category anywhere in the tree: the children are one level deep, but this walks it whole. */
export function findCategory(categories: Category[] | null, id: number | null): Category | null {
  if (id === null) return null
  for (const category of categories ?? []) {
    if (category.id === id) return category
    const child = findCategory(category.children, id)
    if (child) return child
  }
  return null
}

/** From here up, a bulk action asks first (decisions.md 🔴 3). */
export const BULK_CONFIRM_THRESHOLD = 20

/**
 * Which of the selected movements accept that category, decided in the client so a
 * request the backend would reject never leaves (R7). `kind` comes from
 * `GET /api/categories`: `GET /api/movements` only carries the kind of the category
 * a movement already has. `null` means "remove the category", which every movement
 * but a neutral one accepts.
 */
export function eligibleForCategory(movements: Movement[], kind: CategoryKind | null): Movement[] {
  return movements.filter((movement) =>
    kind === null ? movement.type !== 'neutral' : movement.type === kind,
  )
}

/** The fields the undo has to restore, read from a movement as it was before. */
function previousValue(movement: Movement, changes: MovementChanges): MovementChanges {
  const previous: MovementChanges = {}
  if ('categoryId' in changes) previous.categoryId = movement.categoryId
  if (changes.status !== undefined) previous.status = movement.status
  return previous
}

/**
 * How to put `before` back the way it was: one group — one `PATCH` — per set of ids
 * that shared the same previous value, carrying only the fields the action changed.
 */
export function undoPlan(before: Movement[], changes: MovementChanges): UndoGroup[] {
  const groups = new Map<string, UndoGroup>()
  for (const movement of before) {
    const previous = previousValue(movement, changes)
    const key = JSON.stringify([previous.status ?? null, previous.categoryId ?? null])
    const group = groups.get(key)
    if (group) group.ids.push(movement.id)
    else groups.set(key, { ids: [movement.id], changes: previous })
  }
  return [...groups.values()]
}

/** `1 movement` / `3 movements`: every sentence about a count goes through here. */
export const countOf = (count: number): string =>
  `${count} ${count === 1 ? 'movement' : 'movements'}`

/** What the notice says an action did, e.g. `3 movements confirmed`. */
export function actionSummary(
  count: number,
  changes: MovementChanges,
  categoryName?: string,
): string {
  const parts: string[] = []
  if (changes.status === 'confirmed') parts.push('confirmed')
  if (changes.status === 'pending_review') parts.push('moved back to pending')
  if ('categoryId' in changes) {
    parts.push(
      changes.categoryId === null
        ? 'left without a category'
        : `categorized as ${categoryName ?? 'a category'}`,
    )
  }
  return parts.length === 0
    ? `${countOf(count)} updated`
    : `${countOf(count)} ${parts.join(' and ')}`
}

/**
 * The English sentence for a failed action. The backend's own `message` is never
 * painted: it comes in Spanish and names ids. A 400 and a network failure are the
 * only two cases where nothing was written for sure (the contract is all or
 * nothing); the rest may have gone through, so the list is reloaded instead of
 * claiming that nothing happened (R12).
 */
export function actionErrorMessage(error: AppError): string {
  if (error instanceof ApiError && error.status === 400) {
    return "Nothing changed. Some of those movements don't accept that category."
  }
  if (error instanceof ApiError && error.status === 404) {
    return 'Nothing changed: a movement or the category no longer exists. Reloading the list.'
  }
  if (error.code === API_NETWORK) {
    return "Couldn't reach the server. Nothing changed."
  }
  if (error instanceof ValidationError) {
    return "The server answered, but the reply couldn't be read. Reloading the list to show what really happened."
  }
  return 'Something went wrong. Reloading the list to show what really happened.'
}

/** What the undo says when it stopped between groups (R14). */
export const UNDO_PARTIAL =
  'Undo stopped halfway: some movements may already be back. Reloading the list to show what really happened.'
