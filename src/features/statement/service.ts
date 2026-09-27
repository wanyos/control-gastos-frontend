// The only write of the whole statement (feature 21). It exposes ONE function, and the
// body it sends is written literally here: the store never sees `updateMovement`, so a
// `status` cannot reach the request — not by mistake and not through a spread of
// something coming from the view (design §2, R1, C1).
//
// Reading the month still goes through `@/shared/movements` (feature 19); the PATCH of
// one movement moved to the same file in this feature, so both screens send the exact
// same request.

import type { HttpClient } from '@/services/http'
import { updateMovement } from '@/shared/movements'

import type { Movement } from './types'

/** The only write of the whole statement: the category of one movement (R1). */
export function setMovementCategory(
  id: number,
  categoryId: number | null,
  client?: HttpClient,
): Promise<Movement> {
  return updateMovement(id, { categoryId }, client)
}
