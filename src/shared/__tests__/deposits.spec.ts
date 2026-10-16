import { describe, it, expect } from 'vitest'

import {
  countedLine,
  depositCountsNothing,
  depositLine,
  hiddenWhenHiding,
  withKnownDeposit,
} from '@/shared/deposits'
import type { Movement, MovementDeposit } from '@/shared/movements'

// es-ES puts a no-break space (U+00A0) before `€`, never a typed space.
const NBSP = String.fromCharCode(0xa0)

// Invented figures, shaped like the contract (`GET /api/movements`, `deposit`).
const movement = (deposit: MovementDeposit | null | undefined): Movement => {
  const parsed: Movement = {
    id: 41,
    type: 'income',
    bookingDate: '2026-10-09',
    valueDate: '2026-10-09',
    amount: '25037.07',
    description: 'INTERESES DEP. 000003',
    balanceAfter: null,
    currency: 'EUR',
    note: null,
    accountId: 2,
    account: {
      id: 2,
      iban: 'ES0000000000000000000002',
      bank: 'myinvestor',
      alias: 'myinvestor ···0002',
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
    createdAt: '2026-10-10T08:00:00.000Z',
    updatedAt: '2026-10-10T08:00:00.000Z',
  }
  if (deposit !== undefined) parsed.deposit = deposit
  return parsed
}

const resolved = (kind: MovementDeposit['kind'], countedAmount = '0.00'): MovementDeposit => ({
  kind,
  principal: '25000.00',
  countedAmount,
  ambiguous: false,
  reason: null,
  candidateMovementIds: [],
})

const doubtful = (
  kind: MovementDeposit['kind'],
  reason: MovementDeposit['reason'],
): MovementDeposit => ({
  kind,
  principal: null,
  countedAmount: '0.00',
  ambiguous: true,
  reason,
  candidateMovementIds: reason === 'several_principals' ? [512, 538] : [],
})

describe('deposits: how a deposit movement is painted (feature 31)', () => {
  it('writes the line of each kind of deposit movement and of each doubtful reason', () => {
    expect(depositLine(movement(resolved('opening')))).toBe('Deposit opening')
    expect(depositLine(movement(resolved('cancellation')))).toBe('Deposit cancellation')
    expect(depositLine(movement(resolved('maturity', '37.07')))).toBe(
      'Deposit maturity · only the interest counts',
    )
    expect(depositLine(movement(doubtful('maturity', 'principal_not_found')))).toBe(
      'Doubtful deposit maturity · no deposit amount found for it · not counted for now',
    )
    expect(depositLine(movement(doubtful('maturity', 'several_principals')))).toBe(
      'Doubtful deposit maturity · it could belong to more than one deposit · not counted for now',
    )
    expect(depositLine(movement(doubtful('cancellation', 'opening_not_found')))).toBe(
      'Doubtful deposit cancellation · no opening of this amount found · not counted for now',
    )
    expect(depositLine(movement(doubtful('maturity', null)))).toBe(
      'Doubtful deposit maturity · not counted for now',
    )
    expect(depositLine(movement(null))).toBeNull()
    expect(depositLine(movement(undefined))).toBeNull()

    // Only a resolved maturity says what it counts, from `countedAmount`, never computed.
    expect(countedLine(movement(resolved('maturity', '37.07')))).toBe(`Counts 37,07${NBSP}€`)
    expect(countedLine(movement(resolved('opening')))).toBeNull()
    expect(countedLine(movement(doubtful('maturity', 'principal_not_found')))).toBeNull()
    expect(countedLine(movement(null))).toBeNull()

    // What the checkbox takes off: resolved openings and cancellations, nothing else.
    expect(hiddenWhenHiding(movement(resolved('opening')))).toBe(true)
    expect(hiddenWhenHiding(movement(resolved('cancellation')))).toBe(true)
    expect(hiddenWhenHiding(movement(resolved('maturity', '37.07')))).toBe(false)
    expect(hiddenWhenHiding(movement(doubtful('cancellation', 'opening_not_found')))).toBe(false)
    expect(hiddenWhenHiding(movement(doubtful('maturity', 'principal_not_found')))).toBe(false)
    expect(hiddenWhenHiding(movement(null))).toBe(false)

    // What is painted as counting nothing: those two and every doubtful one.
    expect(depositCountsNothing(movement(resolved('opening')))).toBe(true)
    expect(depositCountsNothing(movement(resolved('cancellation')))).toBe(true)
    expect(depositCountsNothing(movement(doubtful('maturity', 'principal_not_found')))).toBe(true)
    expect(depositCountsNothing(movement(resolved('maturity', '37.07')))).toBe(false)
    expect(depositCountsNothing(movement(null))).toBe(false)
  })

  it('keeps the deposit a PATCH answer does not carry', () => {
    const known = resolved('maturity', '37.07')
    const answer = movement(undefined)

    expect(withKnownDeposit(answer, known).deposit).toEqual(known)
    expect(withKnownDeposit(answer, null).deposit).toBeNull()
    // Nothing known: the answer is left as it came.
    expect(withKnownDeposit(answer, undefined)).toBe(answer)
    // An answer that does carry it wins over the old read.
    const fresh = movement(resolved('opening'))
    expect(withKnownDeposit(fresh, known)).toBe(fresh)
  })
})
