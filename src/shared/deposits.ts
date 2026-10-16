// How a deposit movement is painted, shared by `Movements` and `Review` (feature 31).
// It lives in `shared/` because both features need it and neither may import from the
// other (architecture.md). Pure functions: what a deposit movement counts is the
// backend's `deposit` field (contract, `GET /api/movements`); nothing is computed here.

import { formatMoney } from '@/shared/money'
import type { DepositKind, DepositReason, Movement, MovementDeposit } from '@/shared/movements'

const RESOLVED_LINES: Record<DepositKind, string> = {
  opening: 'Deposit opening',
  cancellation: 'Deposit cancellation',
  maturity: 'Deposit maturity · only the interest counts',
}

const REASONS: Record<DepositReason, string> = {
  principal_not_found: 'no deposit amount found for it',
  several_principals: 'it could belong to more than one deposit',
  opening_not_found: 'no opening of this amount found',
}

/** A resolved opening or cancellation: what the checkbox takes off the list (R11). */
export function hiddenWhenHiding(m: Movement): boolean {
  const deposit = m.deposit
  return deposit != null && !deposit.ambiguous && deposit.kind !== 'maturity'
}

/** Counts 0 in sight: a resolved opening or cancellation, or a doubtful one (R3, R7). */
export function depositCountsNothing(m: Movement): boolean {
  const deposit = m.deposit
  return deposit != null && (deposit.ambiguous || deposit.kind !== 'maturity')
}

/** The text under the description, or null when it is not a deposit movement (R4, R7). */
export function depositLine(m: Movement): string | null {
  const deposit = m.deposit
  if (deposit == null) return null
  if (!deposit.ambiguous) return RESOLVED_LINES[deposit.kind]
  const parts = [`Doubtful deposit ${deposit.kind}`]
  if (deposit.reason !== null) parts.push(REASONS[deposit.reason])
  parts.push('not counted for now')
  return parts.join(' · ')
}

/** `Counts 37,07 €` on a resolved maturity; null on anything else (R5). */
export function countedLine(m: Movement): string | null {
  const deposit = m.deposit
  if (deposit == null || deposit.ambiguous || deposit.kind !== 'maturity') return null
  return `Counts ${formatMoney(deposit.countedAmount)}`
}

/**
 * The movement a PATCH answered with, carrying the `deposit` of the last read: the
 * PATCH answers never bring it (R2). An answer that does bring it wins.
 */
export function withKnownDeposit(
  updated: Movement,
  known: MovementDeposit | null | undefined,
): Movement {
  if (updated.deposit !== undefined || known === undefined) return updated
  return { ...updated, deposit: known }
}
