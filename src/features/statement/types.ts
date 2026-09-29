// Frontend types of the statement (feature 19). The screen reads `GET /api/movements`
// and writes exactly two things: the category of a single movement (feature 21,
// `PATCH /api/movements/:id`, body with only `categoryId`) and the exclusion mark of a
// selection (feature 22, `PATCH /api/movements`, body with only `ids` and
// `excludedFromTotals`). So the movement and everything that describes a read of the
// list — and both writes — come from `@/shared/movements`: the same types and the same
// boundary checks the review queue uses (ADR-002, C2). Nothing is imported from another
// feature (C3).

export type {
  BulkResult,
  DateOnly,
  DecimalString,
  Movement,
  MovementAccount,
  MovementCategory,
  MovementPage,
  MovementQuery,
  Pagination,
  Totals,
} from '@/shared/movements'

// The two lists that fill the filter selects (feature 20): both come from `shared/`,
// so this feature still imports nothing from another feature (C3).
export type { AccountSummary } from '@/shared/accounts'
export type { Category, CategoryKind } from '@/shared/categories'

import type { DateOnly, Movement } from '@/shared/movements'

/** One day of the statement: the movements the API sent under the same `bookingDate`. */
export interface DayGroup {
  /** `2026-09-11`, exactly as it came in `bookingDate`. */
  date: DateOnly
  /** Already formatted with `formatDate` of shared/money. */
  label: string
  movements: Movement[]
}
