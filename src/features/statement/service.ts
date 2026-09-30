// The writes of the whole statement — and, since the feature 23, the one read that is
// this screen's alone (`GET /api/transfers/ambiguous`, at the bottom).
// Each write exposes ONE function, and the body it
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

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { updateMovement, updateMovements } from '@/shared/movements'
import { createValidators } from '@/shared/validation'

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

// ─── The only read this feature owns (feature 23, R15) ────────────────────
// `GET /api/transfers/ambiguous` is new to this frontend and today ONE feature needs
// it, so it lives here and not in `shared/`: architecture.md moves a piece down when
// the SECOND feature asks for it, the road `getMovements` and both PATCHes already
// walked. Read only by contract: it links nothing and writes nothing, even when the
// calculation finds something pairable (C1).

export const AMBIGUOUS_TRANSFERS_PATH = '/api/transfers/ambiguous'

const ambiguousChecks = createValidators(`GET ${AMBIGUOUS_TRANSFERS_PATH}`)

/**
 * How many groups look like transfers and could not be paired automatically. Only
 * `ambiguousCount` is read: the groups themselves belong to the screen that will let
 * them be resolved, not to a sentence under three figures (design §8). `0` is a plain
 * answer, not a failure.
 */
export async function getAmbiguousCount(client: HttpClient = http): Promise<number> {
  const body = ambiguousChecks.asObject(await client<unknown>(AMBIGUOUS_TRANSFERS_PATH), 'response')
  return ambiguousChecks.asInteger(body.ambiguousCount, 'ambiguousCount')
}
