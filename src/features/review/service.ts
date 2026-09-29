// Review queue data access (features 15 and 16): the PATCH that writes the same change
// on many movements at once; every body is built field by field, so nothing else can
// ever travel.
// Reading the list moved to `@/shared/movements` in feature 18 (the rule preview reads
// the same endpoint and `category-rules` may not import from `review`), the
// single-movement PATCH moved there in feature 21 (the statement writes it too) and the
// bulk PATCH in feature 22 (the statement marks a whole selection as not counted);
// all of them are re-exported below so every caller written for features 15 and 16 keeps
// importing them from here. Per ADR-002 the raw responses are mapped to the frontend types
// with the shared boundary checks, so a contract drift surfaces as a ValidationError naming
// the failing field.

import { CATEGORIES_PATH, getCategories, parseCategories } from '@/shared/categories'
import {
  MAX_IDS,
  MOVEMENTS_PATH,
  buildMovementsQuery,
  getMovements,
  parseBulkResult,
  parseMovement,
  parseMovementPage,
  parseUpdatedMovement,
  updateMovement,
  updateMovements,
} from '@/shared/movements'

export { MAX_IDS }

// The category tree moved to `@/shared/categories` in feature 17 and the read of the
// movements list to `@/shared/movements` in feature 18; both are re-exported so every
// caller written for features 15 and 16 keeps importing them from here.
export { CATEGORIES_PATH, getCategories, parseCategories }
export { MOVEMENTS_PATH, buildMovementsQuery, getMovements, parseMovement, parseMovementPage }
// The single-movement PATCH moved to `@/shared/movements` in feature 21.
export { parseUpdatedMovement, updateMovement }
// The bulk PATCH moved to `@/shared/movements` in feature 22, untouched.
export { parseBulkResult, updateMovements }
