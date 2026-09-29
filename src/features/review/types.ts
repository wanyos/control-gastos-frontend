// Frontend types for the review queue (features 15 and 16), written from
// gastos-backend/docs/api-contract.md → `GET /api/movements`, `PATCH /api/movements/:id`
// and `PATCH /api/movements`.
// Types are not shared between features (docs/architecture.md), so only what a
// second feature genuinely needs moved to `shared/`:
//
// - `Category` and `CategoryKind` live in `@/shared/categories` since feature 17
//   (the rules screen needs the same tree);
// - the movement itself and everything that describes a read of the list live in
//   `@/shared/movements` since feature 18 (the rule preview reads the same list).
//
// Both are re-exported here, so every import written for features 15 and 16 keeps
// working untouched.
export type { Category, CategoryKind } from '@/shared/categories'

export type {
  DateOnly,
  DecimalString,
  Movement,
  MovementAccount,
  MovementCategory,
  MovementPage,
  MovementQuery,
  MovementStatus,
  MovementType,
  Pagination,
  Totals,
} from '@/shared/movements'

// `MovementChanges` went with the single-movement PATCH to `@/shared/movements` in
// feature 21, and `BulkUpdate` / `BulkResult` with the bulk PATCH in feature 22;
// re-exported so every import written for features 15 and 16 still works.
export type { BulkResult, BulkUpdate, MovementChanges } from '@/shared/movements'

import type { DateOnly, MovementChanges, MovementType } from '@/shared/movements'

/** One PATCH of the undo: the ids that shared the same previous value. */
export interface UndoGroup {
  ids: number[]
  changes: MovementChanges
}

export interface LastAction {
  /** English sentence already built: "3 movements confirmed". */
  summary: string
  undo: UndoGroup[]
}

/** What the user chose. Empty string / null means "not filtering by this". */
export interface ReviewFilters {
  accountId: number | null
  from: DateOnly | ''
  to: DateOnly | ''
  type: MovementType | ''
  categoryId: number | null
  uncategorized: boolean
  /** Raw, as typed; trimmed at the boundary. */
  q: string
}
