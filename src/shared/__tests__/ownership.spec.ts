import { describe, it, expect } from 'vitest'

import {
  BETWEEN_OWN_ACCOUNTS_LABEL,
  isBetweenOwnAccounts,
  isDoubtfulOwnership,
  ownershipLine,
  withKnownOwnership,
} from '@/shared/ownership'
import type { Movement, MovementDeposit, MovementOwnership } from '@/shared/movements'

// Invented figures and names, shaped like the contract (`GET /api/movements`, `ownership`).
const movement = (
  ownership: MovementOwnership | null | undefined,
  deposit: MovementDeposit | null = null,
): Movement => {
  const parsed: Movement = {
    id: 71,
    type: 'expense',
    bookingDate: '2026-10-13',
    valueDate: '2026-10-13',
    amount: '350.00',
    description: 'TRANSF /BANCO FICTICIO NORTE',
    balanceAfter: null,
    currency: 'EUR',
    note: null,
    accountId: 1,
    account: {
      id: 1,
      iban: 'ES0000000000000000000001',
      bank: 'bankinter',
      alias: 'bankinter ···0001',
      type: 'checking',
    },
    categoryId: null,
    category: null,
    paymentMethod: null,
    origin: 'imported',
    status: 'confirmed',
    excludedFromTotals: false,
    transferId: null,
    daySequence: 1,
    createdAt: '2026-10-14T08:00:00.000Z',
    updatedAt: '2026-10-14T08:00:00.000Z',
    deposit,
  }
  if (ownership !== undefined) parsed.ownership = ownership
  return parsed
}

const ownership = (
  status: MovementOwnership['status'],
  matchedText: string | null = 'Banco Ficticio Norte',
): MovementOwnership => ({
  status,
  ownAccountId: matchedText === null ? null : 4,
  ownAccountName: matchedText === null ? null : 'Cartera inventada',
  matchedText,
})

const OPENING: MovementDeposit = {
  kind: 'opening',
  principal: '6000.00',
  countedAmount: '0.00',
  ambiguous: false,
  reason: null,
  candidateMovementIds: [],
}

describe('ownership: how money between your accounts is painted (feature 35)', () => {
  it('writes the line of each ownership status and nothing on a deposit', () => {
    expect(ownershipLine(movement(ownership('own')))).toBe(BETWEEN_OWN_ACCOUNTS_LABEL)
    expect(ownershipLine(movement(ownership('mine', null)))).toBe('Between your accounts')
    expect(ownershipLine(movement(ownership('doubtful')))).toBe(
      'Doubtful · names Banco Ficticio Norte · counts until you answer in Transfers',
    )
    expect(ownershipLine(movement(ownership('doubtful', null)))).toBe(
      'Doubtful · counts until you answer in Transfers',
    )
    expect(ownershipLine(movement(ownership('not_mine')))).toBeNull()
    expect(ownershipLine(movement(null))).toBeNull()
    expect(ownershipLine(movement(undefined))).toBeNull()

    // A deposit movement counts what its own rule says, whatever its ownership.
    expect(ownershipLine(movement(ownership('own'), OPENING))).toBeNull()
    expect(ownershipLine(movement(ownership('doubtful'), OPENING))).toBeNull()
    expect(isBetweenOwnAccounts(movement(ownership('own'), OPENING))).toBe(false)
    expect(isDoubtfulOwnership(movement(ownership('doubtful'), OPENING))).toBe(false)

    expect(isBetweenOwnAccounts(movement(ownership('own')))).toBe(true)
    expect(isBetweenOwnAccounts(movement(ownership('mine')))).toBe(true)
    expect(isBetweenOwnAccounts(movement(ownership('doubtful')))).toBe(false)
    expect(isBetweenOwnAccounts(movement(ownership('not_mine')))).toBe(false)
    expect(isDoubtfulOwnership(movement(ownership('doubtful')))).toBe(true)
    expect(isDoubtfulOwnership(movement(ownership('mine')))).toBe(false)
  })

  it('keeps the ownership a PATCH answer does not carry', () => {
    const known = ownership('own')
    const answer = movement(undefined)

    expect(withKnownOwnership(answer, known).ownership).toEqual(known)
    expect(withKnownOwnership(answer, null).ownership).toBeNull()
    // Nothing known: the answer stays as it came.
    expect('ownership' in withKnownOwnership(answer, undefined)).toBe(false)
    // An answer that does carry it wins.
    expect(withKnownOwnership(movement(null), known).ownership).toBeNull()
  })
})
