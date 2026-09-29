// The writes of the whole statement. Each one exposes ONE function, and the body it
// sends is written literally here: the store never sees `updateMovement` nor
// `updateMovements`, so a field the contract rejects cannot reach a request — not by
// mistake and not through a spread of something coming from the view (design §2, §3,
// R1, C1).
//
// Feature 21 added the category of ONE movement; feature 22 adds the exclusion mark of a
// SELECTION, and that one always goes through the bulk `PATCH /api/movements`, also when
// a single movement is selected: one body, one function, one test that reads it letter
// by letter (design §2). Reading the month goes through `@/shared/movements` (feature
// 19), where both PATCHes live too, so both screens send the exact same request.

import type { HttpClient } from '@/services/http'
import { updateMovement, updateMovements } from '@/shared/movements'

import type { BulkResult, Movement } from './types'

/** The only write of the whole statement: the category of one movement (R1). */
export function setMovementCategory(
  id: number,
  categoryId: number | null,
  client?: HttpClient,
): Promise<Movement> {
  return updateMovement(id, { categoryId }, client)
}

/**
 * The exclusion mark over a selection (R1). The body is built HERE and carries exactly
 * two properties, `ids` and `excludedFromTotals`: the caller hands over an array of ids
 * and a boolean, so neither a `status` nor a `categoryId` has a way in (C1). The value
 * travels as a literal boolean — the contract answers 400 to `null`, `"true"`, `0` and
 * `1` — and `changesBody` is the last barrier that enforces it.
 */
export function setMovementsExcluded(
  ids: number[],
  excluded: boolean,
  client?: HttpClient,
): Promise<BulkResult> {
  return updateMovements({ ids, excludedFromTotals: excluded }, client)
}
