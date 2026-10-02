// Frontend types of the transfers screen (feature 24), derived from
// gastos-backend/docs/api-contract.md → GET /api/transfers[/ambiguous].

import type { DateOnly, DecimalString, Movement } from '@/shared/movements'

export type { DateOnly, DecimalString, Movement }

/** A linked pair: the contract sends the expense leg first, the income leg second. */
export interface TransferPair {
  transferId: string
  expense: Movement
  income: Movement
}

/** A movement of a doubtful group. It carries no amount: the amount is the group's. */
export interface AmbiguousMovement {
  id: number
  accountId: number
  accountAlias: string
  type: 'expense' | 'income'
  bookingDate: DateOnly
  description: string
}

/** A doubtful group, already split in the two columns the screen paints. */
export interface AmbiguousGroup {
  /** The groups carry no id: the sorted movement ids joined by `-`. */
  key: string
  amount: DecimalString
  out: AmbiguousMovement[]
  in: AmbiguousMovement[]
}

/** What is picked in one group: at most one per column, nothing to start with. */
export interface LinkChoice {
  outId: number | null
  inId: number | null
}

export type ListStatus = 'loading' | 'ready' | 'error'

/** What the Undo of the notice would do: the inverse of the last write. */
export type Undo =
  { kind: 'relink'; expenseId: number; incomeId: number } | { kind: 'unlink'; transferId: string }

export interface Notice {
  summary: string | null
  error: string | null
  undo: Undo | null
}

/** Which write failed, only to pick the sentence. */
export type Gesture = 'unlink' | 'link' | 'relink' | 'undo-link'
