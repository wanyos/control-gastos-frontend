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

import type { DateOnly, Movement, MovementStatus, MovementType } from '@/shared/movements'

/** The only two fields a movement accepts (contract: PATCH /api/movements/:id). */
export interface MovementChanges {
  categoryId?: number | null
  status?: MovementStatus
}

/** Body of PATCH /api/movements: ids plus at least one of the two fields. */
export interface BulkUpdate extends MovementChanges {
  ids: number[]
}

export interface BulkResult {
  updated: number
  movements: Movement[]
}

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
