// How money between your own accounts is painted in `Movements` (feature 35). It lives
// in `shared/` next to `deposits.ts`, which it follows: pure functions over the backend's
// `ownership` field (contract, `GET /api/movements`); nothing is computed here. A deposit
// movement paints nothing of it: it counts what its own rule says (contract).

import type { Movement, MovementOwnership } from '@/shared/movements'

export const BETWEEN_OWN_ACCOUNTS_LABEL = 'Between your accounts'
export const OWN_MONEY_HINT = "Money between your accounts: not counted in this month's figures"
const DOUBTFUL_TAIL = 'counts until you answer in Transfers'

const isDepositMovement = (m: Movement): boolean => m.deposit != null

/** `own` or `mine`, and not a deposit movement: it does not count, and the checkbox hides it. */
export function isBetweenOwnAccounts(m: Movement): boolean {
  const status = m.ownership?.status
  return !isDepositMovement(m) && (status === 'own' || status === 'mine')
}

/** `doubtful`, and not a deposit movement: it still counts until the human answers. */
export function isDoubtfulOwnership(m: Movement): boolean {
  return !isDepositMovement(m) && m.ownership?.status === 'doubtful'
}

/** The text next to the account, or null when there is nothing to say. */
export function ownershipLine(m: Movement): string | null {
  if (isBetweenOwnAccounts(m)) return BETWEEN_OWN_ACCOUNTS_LABEL
  if (!isDoubtfulOwnership(m)) return null
  const matched = m.ownership?.matchedText ?? null
  return matched === null
    ? `Doubtful · ${DOUBTFUL_TAIL}`
    : `Doubtful · names ${matched} · ${DOUBTFUL_TAIL}`
}

/**
 * The movement a PATCH answered with, carrying the `ownership` of the last read: the
 * PATCH answers never bring it. An answer that does bring it wins.
 */
export function withKnownOwnership(
  updated: Movement,
  known: MovementOwnership | null | undefined,
): Movement {
  if (updated.ownership !== undefined || known === undefined) return updated
  return { ...updated, ownership: known }
}
