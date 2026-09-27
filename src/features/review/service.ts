// Review queue data access (features 15 and 16): the PATCH that writes the same change
// on many movements at once; every body is built field by field, so nothing else can
// ever travel.
// Reading the list moved to `@/shared/movements` in feature 18 (the rule preview reads
// the same endpoint and `category-rules` may not import from `review`), and the
// single-movement PATCH moved there in feature 21 (the statement writes it too); both
// are re-exported below so every caller written for features 15 and 16 keeps importing
// them from here. Per ADR-002 the raw responses are mapped to the frontend types with the
// shared boundary checks, so a contract drift surfaces as a ValidationError naming the
// failing field.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { CATEGORIES_PATH, getCategories, parseCategories } from '@/shared/categories'
import {
  MOVEMENTS_PATH,
  buildMovementsQuery,
  changesBody,
  getMovements,
  parseMovement,
  parseMovementPage,
  parseUpdatedMovement,
  patch,
  updateMovement,
} from '@/shared/movements'
import { createValidators } from '@/shared/validation'

import { MAX_IDS } from './actions'

import type { BulkResult, BulkUpdate } from './types'

export { MAX_IDS }

// The category tree moved to `@/shared/categories` in feature 17 and the read of the
// movements list to `@/shared/movements` in feature 18; both are re-exported so every
// caller written for features 15 and 16 keeps importing them from here.
export { CATEGORIES_PATH, getCategories, parseCategories }
export { MOVEMENTS_PATH, buildMovementsQuery, getMovements, parseMovement, parseMovementPage }
// The single-movement PATCH moved to `@/shared/movements` in feature 21.
export { parseUpdatedMovement, updateMovement }

const bulkChecks = createValidators(`PATCH ${MOVEMENTS_PATH}`)

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
