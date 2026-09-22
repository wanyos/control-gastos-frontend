// Frontend types for the review queue (feature 15), written from
// gastos-backend/docs/api-contract.md → `GET /api/movements` and `GET /api/categories`.
// Types are not shared between features (docs/architecture.md), so the decimal and
// date aliases are declared here like import/types.ts does.

// `Category` and `CategoryKind` live in `@/shared/categories` since feature 17
// (the rules screen needs the same tree); they are re-exported here so every
// import written for features 15 and 16 keeps working.
export type { Category, CategoryKind } from '@/shared/categories'

import type { CategoryKind } from '@/shared/categories'

export type DecimalString = string
export type DateOnly = string

export type MovementType = 'expense' | 'income' | 'neutral'
export type MovementStatus = 'confirmed' | 'pending_review'

/** The account as it travels embedded in a movement (no `balance`). */
export interface MovementAccount {
  id: number
  iban: string
  bank: string
  alias: string
  /** Open text: a new account type must not break the list. */
  type: string
}

export interface MovementCategory {
  id: number
  name: string
  kind: CategoryKind
  parentId: number | null
}

export interface Movement {
  id: number
  type: MovementType
  bookingDate: DateOnly
  valueDate: DateOnly
  /** Always positive; the sign comes from `type`. */
  amount: DecimalString
  description: string
  balanceAfter: DecimalString | null
  currency: string
  note: string | null
  accountId: number
  account: MovementAccount
  categoryId: number | null
  category: MovementCategory | null
  /** Open text, always null today. */
  paymentMethod: string | null
  /** Open text. */
  origin: string
  status: MovementStatus
  transferId: string | null
  daySequence: number | null
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Totals {
  income: DecimalString
  expense: DecimalString
  net: DecimalString
}

export interface MovementPage {
  movements: Movement[]
  pagination: Pagination
  totals: Totals
}

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

/**
 * What a request to `GET /api/movements` asks for. `categoryId` and
 * `uncategorized` are mutually exclusive (the backend answers 400 to both).
 */
export interface MovementQuery {
  status?: MovementStatus
  accountId?: number
  from?: string
  to?: string
  type?: MovementType
  categoryId?: number
  uncategorized?: true
  q?: string
  page?: number
  pageSize?: number
}
