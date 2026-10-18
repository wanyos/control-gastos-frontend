import { describe, it, expect } from 'vitest'

import { ValidationError } from '@/shared/errors'
import {
  CLOSING_SOURCE_LABEL,
  buildMovementsQuery,
  closingSourceLine,
  parseBulkResult,
  parseMovementPage,
  parseUpdatedMovement,
} from '@/shared/movements'
import type { MovementQuery } from '@/shared/movements'

// The two parameters the backend added in its feature 49 and the statement started
// asking for in the feature 23. Everything else about `buildMovementsQuery` is covered
// where it was born, in `features/review/__tests__/service.spec.ts` (which re-exports
// it letter by letter); here only the pair that hides the noise.
describe('buildMovementsQuery: the two scopes of the noise switch (R1, R2)', () => {
  it('carries neither key when the switch is off: without them the backend filters nothing', () => {
    const query = buildMovementsQuery({ from: '2026-07-01', to: '2026-07-31', page: 1 })

    expect(query).toBe('from=2026-07-01&to=2026-07-31&page=1')
    expect(query).not.toContain('excluded')
    expect(query).not.toContain('transfer')
  })

  it('carries excluded=none AND transfer=none in the SAME request when it is on (R2)', () => {
    const query = buildMovementsQuery({
      from: '2026-07-01',
      to: '2026-07-31',
      excluded: 'none',
      transfer: 'none',
      page: 1,
      pageSize: 200,
    })

    expect(query).toBe(
      'from=2026-07-01&to=2026-07-31&excluded=none&transfer=none&page=1&pageSize=200',
    )
  })

  it('keeps them next to every other filter, not instead of them (R10)', () => {
    const query = buildMovementsQuery({
      accountId: 3,
      from: '2026-07-01',
      to: '2026-07-31',
      uncategorized: true,
      q: 'luz',
      excluded: 'none',
      transfer: 'none',
      page: 1,
      pageSize: 200,
    })

    expect(query).toBe(
      'accountId=3&from=2026-07-01&to=2026-07-31&uncategorized=true&q=luz&excluded=none&transfer=none&page=1&pageSize=200',
    )
  })

  it('sends only the one it was given', () => {
    expect(buildMovementsQuery({ excluded: 'only' })).toBe('excluded=only')
    expect(buildMovementsQuery({ transfer: 'only' })).toBe('transfer=only')
  })

  it('has no third value to send: only `only` and `none` type-check', () => {
    // @ts-expect-error the contract answers 400 to anything else, so it cannot be written
    const rejected: MovementQuery = { excluded: 'all' }

    expect(buildMovementsQuery(rejected)).toBe('excluded=all')
  })
})

// Feature 31: `deposit` travels only in `GET /api/movements`, and there it is mandatory.
// Invented figures; the four objects are the four shapes of the contract's example.
const rawMovement = (id: number, deposit?: unknown): Record<string, unknown> => {
  const raw: Record<string, unknown> = {
    id,
    type: 'income',
    bookingDate: '2026-10-07',
    valueDate: '2026-10-07',
    amount: '6014.80',
    description: 'INTERESES DEP. 000004',
    balanceAfter: null,
    currency: 'EUR',
    note: null,
    accountId: 2,
    account: {
      id: 2,
      iban: 'ES0000000000000000000002',
      bank: 'myinvestor',
      alias: 'myinvestor',
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
    createdAt: '2026-10-08T09:00:00.000Z',
    updatedAt: '2026-10-08T09:00:00.000Z',
  }
  if (deposit !== undefined) raw.deposit = deposit
  return raw
}

const pageOf = (...movements: unknown[]): Record<string, unknown> => ({
  movements,
  pagination: { page: 1, pageSize: 200, total: movements.length, totalPages: 1 },
  totals: { income: '14.80', expense: '0.00', net: '14.80' },
})

const OPENING = {
  kind: 'opening',
  principal: '6000.00',
  countedAmount: '0.00',
  ambiguous: false,
  reason: null,
  candidateMovementIds: [],
}
const CANCELLATION = { ...OPENING, kind: 'cancellation', principal: '2500.00' }
const MATURITY = { ...OPENING, kind: 'maturity', countedAmount: '14.80' }
const DOUBTFUL = {
  kind: 'maturity',
  principal: null,
  countedAmount: '0.00',
  ambiguous: true,
  reason: 'several_principals',
  candidateMovementIds: [301, 318],
}

describe('parseMovementPage: the deposit of every movement (feature 31, R1)', () => {
  it('reads the deposit of every movement and rejects a missing one', () => {
    const page = parseMovementPage(
      pageOf(
        rawMovement(1, OPENING),
        rawMovement(2, CANCELLATION),
        rawMovement(3, MATURITY),
        rawMovement(4, DOUBTFUL),
        rawMovement(5, null),
      ),
    )
    expect(page.movements.map((movement) => movement.deposit)).toEqual([
      OPENING,
      CANCELLATION,
      MATURITY,
      DOUBTFUL,
      null,
    ])

    // A missing key is not «not a deposit»: it is the contract drifting.
    expect(() => parseMovementPage(pageOf(rawMovement(1)))).toThrow(ValidationError)
    expect(() => parseMovementPage(pageOf(rawMovement(1)))).toThrow(
      'GET /api/movements: movements[0].deposit',
    )
    expect(() =>
      parseMovementPage(pageOf(rawMovement(1, { ...OPENING, kind: 'renewal' }))),
    ).toThrow('movements[0].deposit.kind')
    expect(() =>
      parseMovementPage(pageOf(rawMovement(1, { ...DOUBTFUL, reason: 'unknown_reason' }))),
    ).toThrow('movements[0].deposit.reason')
    expect(() =>
      parseMovementPage(pageOf(rawMovement(1, { ...MATURITY, countedAmount: 14.8 }))),
    ).toThrow(ValidationError)

    // A PATCH answer never carries it, and is read without error and without the key.
    const updated = parseUpdatedMovement(rawMovement(7))
    expect(updated.id).toBe(7)
    expect('deposit' in updated).toBe(false)
  })
})

// Feature 34: who set the category (contract, backend feature 60). Optional: an answer
// without it reads as null, so it only paints a line, never blanks the list.
describe('categorySource: who set the category (feature 34, R15)', () => {
  const withSource = (id: number, source?: unknown): Record<string, unknown> => {
    const raw = rawMovement(id, null)
    if (source !== undefined) raw.categorySource = source
    return raw
  }

  it('reads categorySource and takes an absent one as null', () => {
    const page = parseMovementPage(
      pageOf(
        withSource(1, 'manual'),
        withSource(2, 'rule'),
        withSource(3, 'closing'),
        withSource(4, null),
        withSource(5),
      ),
    )
    expect(page.movements.map((movement) => movement.categorySource)).toEqual([
      'manual',
      'rule',
      'closing',
      null,
      null,
    ])

    // The PATCH answers carry it too, the single and the bulk one.
    const updated = parseUpdatedMovement({ ...rawMovement(7), categorySource: 'manual' })
    expect(updated.categorySource).toBe('manual')
    const bulk = parseBulkResult({
      updated: 1,
      movements: [{ ...rawMovement(8), categorySource: 'manual' }],
    })
    expect(bulk.movements[0]?.categorySource).toBe('manual')
    expect(parseUpdatedMovement(rawMovement(9)).categorySource).toBeNull()

    // Only the closing of the import says anything on the row.
    expect(page.movements.map((movement) => closingSourceLine(movement))).toEqual([
      null,
      null,
      CLOSING_SOURCE_LABEL,
      null,
      null,
    ])
    expect(CLOSING_SOURCE_LABEL).toBe('Set when the import was closed')
  })

  it('rejects a categorySource outside the three of the contract', () => {
    expect(() => parseMovementPage(pageOf(withSource(1, 'import')))).toThrow(ValidationError)
    expect(() => parseMovementPage(pageOf(withSource(1, 'import')))).toThrow(
      'GET /api/movements: movements[0].categorySource',
    )
    expect(() => parseMovementPage(pageOf(withSource(1, 'Closing')))).toThrow(ValidationError)
    expect(() => parseUpdatedMovement({ ...rawMovement(2), categorySource: 3 })).toThrow(
      'response.categorySource',
    )
  })
})
