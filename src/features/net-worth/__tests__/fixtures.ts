// Test data for the net worth view (feature 9). Every figure here adds up:
// the contract example of GET /api/net-worth does not (its investments.total is
// off by 9810.25), so it is deliberately not used as a coherent fixture.

import type { NetWorth } from '../types'

/**
 * Coherent response: the five product types, checking and savings accounts, a
 * negative balance, a `value: null`, the five real bank slugs and the three
 * issue reasons. Neutral English names, so no Spanish comes from the data.
 *
 * accounts    3450.20 - 45.30 + 6000.00                  =  9404.90
 * investments 12810.75 + 2500.00 + 10000.00 + 5208.40    = 30519.15
 * total                                                  = 39924.05
 */
export function coherentNetWorth(): NetWorth {
  return {
    asOf: '2026-09-12',
    total: '39924.05',
    accounts: {
      total: '9404.90',
      accounts: [
        {
          id: 1,
          iban: 'ES9121000418450200051332',
          bank: 'bankinter',
          alias: 'Main account',
          type: 'checking',
          balance: '3450.20',
        },
        {
          id: 2,
          iban: 'DE89370400440532013000',
          bank: 'n26',
          alias: 'Daily card',
          type: 'checking',
          balance: '-45.30',
        },
        {
          id: 3,
          iban: 'ES7600730100510123456789',
          bank: 'openbank',
          alias: 'Rainy day',
          type: 'savings',
          balance: '6000.00',
        },
      ],
    },
    investments: {
      total: '30519.15',
      products: [
        {
          id: 11,
          bank: 'myinvestor',
          name: 'Global Fund',
          type: 'fund',
          value: '12810.75',
          marketValue: '12800.50',
          uninvestedCash: '10.25',
          valuedAt: '2026-08-29',
          stale: false,
        },
        {
          id: 12,
          bank: 'myinvestor',
          name: 'World ETF',
          type: 'etf',
          value: null,
          marketValue: null,
          uninvestedCash: null,
          valuedAt: null,
          stale: false,
        },
        {
          id: 13,
          bank: 'myinvestor',
          name: 'Robo Portfolio',
          type: 'managed_portfolio',
          value: '2500.00',
          marketValue: '2500.00',
          uninvestedCash: null,
          valuedAt: '2026-08-31',
          stale: false,
        },
        {
          id: 14,
          bank: 'myinvestor',
          name: 'Deposit 12m',
          type: 'deposit',
          value: '10000.00',
          principal: '10000.00',
          expectedGain: '275.00',
          maturityDate: '2026-08-15',
          matured: true,
        },
        {
          id: 15,
          bank: 'trade-republic',
          name: 'Interest Pot',
          type: 'savings_account',
          value: '5208.40',
          valuedAt: '2026-06-30',
          stale: true,
        },
      ],
      issues: [
        { productId: 12, name: 'World ETF', reason: 'no_valuation', valuedAt: null },
        {
          productId: 14,
          name: 'Deposit 12m',
          reason: 'matured_not_closed',
          valuedAt: '2026-08-15',
        },
        {
          productId: 15,
          name: 'Interest Pot',
          reason: 'stale_valuation',
          valuedAt: '2026-06-30',
        },
      ],
    },
  }
}

/** Same parts as the coherent one, but a `total` they do not add up to. */
export function inconsistentNetWorth(): NetWorth {
  return { ...coherentNetWorth(), total: '999.99' }
}

/** A base without accounts or products: 200 with empty lists, totals at zero. */
export function emptyNetWorth(): NetWorth {
  return {
    asOf: '2026-09-12',
    total: '0.00',
    accounts: { total: '0.00', accounts: [] },
    investments: { total: '0.00', products: [], issues: [] },
  }
}
