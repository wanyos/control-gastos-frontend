import { describe, it, expect } from 'vitest'

import { formatDate } from '@/shared/money'

import { holdingTypeLabel, issueMessage } from '../issues'

describe('issueMessage (R14)', () => {
  it('explains a product without valuation', () => {
    expect(
      issueMessage({ productId: 12, name: 'World ETF', reason: 'no_valuation', valuedAt: null }),
    ).toBe('World ETF has no valuation yet, so it is not counted in your net worth.')
  })

  it('explains a stale valuation with its date', () => {
    expect(
      issueMessage({
        productId: 15,
        name: 'Interest Pot',
        reason: 'stale_valuation',
        valuedAt: '2026-06-30',
      }),
    ).toBe(
      `Interest Pot was last valued on ${formatDate('2026-06-30')}; its value may be out of date.`,
    )
  })

  it('explains a matured deposit that is not closed, with its maturity date', () => {
    expect(
      issueMessage({
        productId: 14,
        name: 'Deposit 12m',
        reason: 'matured_not_closed',
        valuedAt: '2026-08-15',
      }),
    ).toBe(
      `Deposit 12m matured on ${formatDate('2026-08-15')} but is not closed yet; ` +
        'its money may be counted twice.',
    )
  })

  it('drops the date clause instead of inventing one when the date is missing', () => {
    expect(
      issueMessage({ productId: 15, name: 'Pot', reason: 'stale_valuation', valuedAt: null }),
    ).toBe('Pot was last valued; its value may be out of date.')
  })
})

describe('holdingTypeLabel (R12, R15)', () => {
  it('names every account and product type in English', () => {
    expect(
      (
        [
          'checking',
          'savings',
          'fund',
          'etf',
          'managed_portfolio',
          'savings_account',
          'deposit',
        ] as const
      ).map(holdingTypeLabel),
    ).toEqual([
      'Checking account',
      'Savings account',
      'Fund',
      'ETF',
      'Managed portfolio',
      'Interest account',
      'Fixed-term deposit',
    ])
  })
})
