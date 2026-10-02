import { describe, it, expect, vi, afterEach } from 'vitest'

import { ValidationError } from '@/shared/errors'

import {
  getAmbiguousGroups,
  getTransferPairs,
  linkMovements,
  parseAmbiguousGroups,
  parseTransferPairs,
  unlinkPair,
} from '../service'
import {
  FINE_100,
  FINE_100_ID,
  FOUR_PAIRS,
  GROUP_OF_3,
  GROUP_OF_4,
  NO_AMBIGUOUS,
  NO_PAIRS,
  ambiguous,
  json,
  linked,
  mockApi,
  noContent,
} from './fixtures'

type Raw = Record<string, unknown>

describe('transfers service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('links with a body that is letter by letter the two ids, expense first (R15, C1)', async () => {
    const api = mockApi({ link: json(linked('new-link'), 201) })

    const transferId = await linkMovements(33339, 24377)

    expect(transferId).toBe('new-link')
    expect(api.calls).toEqual([
      { method: 'POST', path: '/api/transfers', rawBody: '{"movementIds":[33339,24377]}' },
    ])
    expect(Object.keys(JSON.parse(api.calls[0]?.rawBody ?? '{}') as object)).toEqual([
      'movementIds',
    ])
  })

  it('rejects a 201 that carries no transferId', async () => {
    mockApi({ link: json({ movements: [] }, 201) })

    await expect(linkMovements(1, 2)).rejects.toBeInstanceOf(ValidationError)
  })

  it('unlinks with a DELETE, no body, and the transferId encoded in the path (R15)', async () => {
    const api = mockApi({ unlink: noContent })

    await expect(unlinkPair('a/b c')).resolves.toBeUndefined()

    expect(api.calls).toEqual([
      { method: 'DELETE', path: '/api/transfers/a%2Fb%20c', rawBody: undefined },
    ])
  })

  it('reads every pair in the order received, expense leg first (R2, R3)', async () => {
    const api = mockApi({ pairs: json(FOUR_PAIRS) })

    const pairs = await getTransferPairs()

    expect(api.log()).toEqual(['GET /api/transfers'])
    expect(pairs.map((pair) => pair.transferId)).toEqual(
      FOUR_PAIRS.pairs.map((pair) => pair.transferId),
    )
    const fine = pairs[2]
    expect(fine?.transferId).toBe(FINE_100_ID)
    expect(fine?.expense).toMatchObject({
      id: 33339,
      type: 'expense',
      bookingDate: '2025-06-30',
      amount: '100.00',
      description: 'AYTO MADRID PAGO INTER',
    })
    expect(fine?.expense.account.alias).toBe('n26 ···4136')
    expect(fine?.income).toMatchObject({ id: 24377, type: 'income', bookingDate: '2025-06-27' })
  })

  it('takes an empty list of pairs and an empty list of groups as plain answers', async () => {
    mockApi({ pairs: json(NO_PAIRS), ambiguous: json(NO_AMBIGUOUS) })

    await expect(getTransferPairs()).resolves.toEqual([])
    await expect(getAmbiguousGroups()).resolves.toEqual([])
  })

  it('refuses a pair whose first leg is not the expense, or with 1 or 3 legs', () => {
    const [expense, income] = FINE_100.movements as [Raw, Raw]
    const withLegs = (movements: Raw[]) => ({ pairs: [{ transferId: 'x', movements }] })

    expect(() => parseTransferPairs(withLegs([income, expense]))).toThrow(ValidationError)
    expect(() => parseTransferPairs(withLegs([expense]))).toThrow(ValidationError)
    expect(() => parseTransferPairs(withLegs([expense, income, income]))).toThrow(ValidationError)
    expect(() => parseTransferPairs(withLegs([expense, expense]))).toThrow(ValidationError)
    expect(() => parseTransferPairs({})).toThrow(ValidationError)
  })

  it('splits a group of 3 in out and in, keeping the received order (R8)', async () => {
    mockApi({ ambiguous: json(ambiguous(GROUP_OF_3)) })

    const [group] = await getAmbiguousGroups()

    expect(group?.key).toBe('812-840-841')
    expect(group?.amount).toBe('500.00')
    expect(group?.out.map((one) => one.id)).toEqual([812])
    expect(group?.in.map((one) => one.id)).toEqual([840, 841])
    expect(group?.in[0]).toEqual({
      id: 840,
      accountId: 16563,
      accountAlias: 'openbank ···4073',
      type: 'income',
      bookingDate: '2026-08-01',
      description: 'TRANSFERENCIA RECIBIDA',
    })
  })

  it('splits an interleaved group of 4 without reordering either column', () => {
    const [group] = parseAmbiguousGroups(ambiguous(GROUP_OF_4))

    expect(group?.out.map((one) => one.id)).toEqual([901, 902])
    expect(group?.in.map((one) => one.id)).toEqual([903, 904])
  })

  it('refuses a doubtful movement that is neither an expense nor an income', () => {
    const neutral = { ...GROUP_OF_3.movements[0], type: 'neutral' }

    expect(() => parseAmbiguousGroups(ambiguous({ amount: '1.00', movements: [neutral] }))).toThrow(
      ValidationError,
    )
  })
})
