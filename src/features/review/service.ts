// Review queue data access (features 15 and 16): the two PATCHes that write the only
// editable fields of a movement — `categoryId` and `status`; every body is built field
// by field, so nothing else can ever travel.
// Reading the list moved to `@/shared/movements` in feature 18 (the rule preview reads
// the same endpoint and `category-rules` may not import from `review`); it is
// re-exported below so every caller written for features 15 and 16 keeps importing it
// from here. Per ADR-002 the raw responses are mapped to the frontend types with the
// shared boundary checks, so a contract drift surfaces as a ValidationError naming the
// failing field.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { CATEGORIES_PATH, getCategories, parseCategories } from '@/shared/categories'
import {
  MOVEMENTS_PATH,
  buildMovementsQuery,
  getMovements,
  parseMovement,
  parseMovementPage,
} from '@/shared/movements'
import { createValidators } from '@/shared/validation'

import { MAX_IDS } from './actions'

import type { BulkResult, BulkUpdate, Movement, MovementChanges } from './types'

export { MAX_IDS }

// The category tree moved to `@/shared/categories` in feature 17 and the read of the
// movements list to `@/shared/movements` in feature 18; both are re-exported so every
// caller written for features 15 and 16 keeps importing them from here.
export { CATEGORIES_PATH, getCategories, parseCategories }
export { MOVEMENTS_PATH, buildMovementsQuery, getMovements, parseMovement, parseMovementPage }

const updateChecks = createValidators(`PATCH ${MOVEMENTS_PATH}/:id`)
const bulkChecks = createValidators(`PATCH ${MOVEMENTS_PATH}`)

/** Maps the movement `PATCH /api/movements/:id` answers with, or throws ValidationError. */
export function parseUpdatedMovement(raw: unknown): Movement {
  return parseMovement(updateChecks, raw, 'response')
}

/** Maps `PATCH /api/movements`, or throws ValidationError. */
export function parseBulkResult(raw: unknown): BulkResult {
  const v = bulkChecks
  const body = v.asObject(raw, 'response')
  return {
    updated: v.asInteger(body.updated, 'updated'),
    movements: v
      .asArray(body.movements, 'movements')
      .map((item, i) => parseMovement(v, item, `movements[${i}]`)),
  }
}

/**
 * The body of both PATCHes, built field by field: a spread of an object coming from
 * the view could carry a property the contract answers 400 to (R9). `categoryId`
 * travels when the key is present, so `null` — remove the category — does travel.
 */
function changesBody(changes: MovementChanges): MovementChanges {
  const body: MovementChanges = {}
  if ('categoryId' in changes) body.categoryId = changes.categoryId ?? null
  if (changes.status !== undefined) body.status = changes.status
  return body
}

/** The PATCH wire format: JSON in, JSON out. */
const patch = (body: unknown): RequestInit => ({
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Writes the two editable fields of one movement. */
export async function updateMovement(
  id: number,
  changes: MovementChanges,
  client: HttpClient = http,
): Promise<Movement> {
  const body = changesBody(changes)
  if (Object.keys(body).length === 0) {
    updateChecks.reject('body', 'a change of categoryId or status')
  }
  return parseUpdatedMovement(await client<unknown>(`${MOVEMENTS_PATH}/${id}`, patch(body)))
}

/**
 * Writes the same change on many movements in one request. The ids are deduplicated
 * and the contract's limits are checked here, before the network: the backend answers
 * 400 to an empty `ids`, to repeated ids and to more than MAX_IDS.
 */
export async function updateMovements(
  update: BulkUpdate,
  client: HttpClient = http,
): Promise<BulkResult> {
  const ids = [...new Set(update.ids)]
  if (ids.length === 0 || ids.length > MAX_IDS) {
    bulkChecks.reject('ids', `between 1 and ${MAX_IDS} movements`)
  }
  const changes = changesBody(update)
  if (Object.keys(changes).length === 0) {
    bulkChecks.reject('body', 'a change of categoryId or status')
  }
  return parseBulkResult(await client<unknown>(MOVEMENTS_PATH, patch({ ids, ...changes })))
}
