// Responses of GET /api/investments/gains for the Investments tests (feature 40).
// Invented figures, shaped like the contract example, with one more product that
// loses so the order and the bar show on both sides (spec 40, design §7).

import type { InvestmentGains } from '../types'

/**
 * `live` in the backend order (openedAt ascending, no openedAt at the end); on screen
 * the order is Fondo Global, Deposito 12m, Cartera Indexada, ETF Mundo.
 * total.gain = 500.50 - 120.40 + 185.85 = 565.95, on 12300.00 + 5733.30 + 10000.00.
 * `closed`: Deposito 3m matured, Deposito 6m cancelled before its maturity date.
 */
export function investmentGains(): InvestmentGains {
  return {
    asOf: '2026-11-03',
    total: {
      gain: '565.95',
      invested: '28033.30',
      gainPercent: '2.02',
      excluded: [{ productId: 2, name: 'ETF Mundo', reason: 'no_photo' }],
    },
    live: [
      {
        id: 1,
        bank: 'myinvestor',
        name: 'Fondo Global',
        type: 'fund',
        openedAt: '2025-11-03',
        closedAt: null,
        invested: '12300.00',
        currentValue: '12800.50',
        gain: '500.50',
        gainPercent: '4.07',
        uninvestedCash: '10.25',
        valuedAt: '2026-09-30',
        reason: null,
      },
      {
        id: 5,
        bank: 'myinvestor',
        name: 'Cartera Indexada',
        type: 'managed_portfolio',
        openedAt: '2026-01-15',
        closedAt: null,
        invested: '5733.30',
        currentValue: '5612.90',
        gain: '-120.40',
        gainPercent: '-2.1',
        uninvestedCash: null,
        valuedAt: '2026-10-31',
        reason: null,
      },
      {
        id: 4,
        bank: 'myinvestor',
        name: 'Deposito 12m',
        type: 'deposit',
        openedAt: '2026-03-02',
        closedAt: '2027-03-01',
        conditions: {
          principal: '10000.00',
          interestRate: '2.75',
          expectedGain: '275.00',
          maturityDate: '2027-03-01',
        },
        invested: '10000.00',
        currentValue: '10185.85',
        gain: '185.85',
        gainPercent: '1.86',
        valuedAt: '2026-11-03',
        reason: null,
      },
      {
        id: 2,
        bank: 'myinvestor',
        name: 'ETF Mundo',
        type: 'etf',
        openedAt: null,
        closedAt: null,
        invested: null,
        currentValue: null,
        gain: null,
        gainPercent: null,
        uninvestedCash: null,
        valuedAt: null,
        reason: 'no_photo',
      },
    ],
    closed: [
      {
        id: 7,
        bank: 'myinvestor',
        name: 'Deposito 3m',
        type: 'deposit',
        openedAt: '2026-06-01',
        closedAt: '2026-09-01',
        closedOn: '2026-09-01',
        conditions: {
          principal: '5000.00',
          interestRate: '2.5',
          expectedGain: '31.25',
          maturityDate: '2026-09-01',
        },
        invested: '5000.00',
        currentValue: '5031.20',
        gain: '31.20',
        gainPercent: '0.62',
        valuedAt: '2026-09-01',
        reason: null,
      },
      {
        id: 3,
        bank: 'myinvestor',
        name: 'Deposito 6m',
        type: 'deposit',
        openedAt: '2026-01-12',
        closedAt: '2026-04-20',
        closedOn: '2026-04-20',
        conditions: {
          principal: '2000.00',
          interestRate: '2.2',
          expectedGain: '22.00',
          maturityDate: '2026-07-12',
        },
        invested: '2000.00',
        currentValue: '2000.00',
        gain: '0.00',
        gainPercent: '0.00',
        valuedAt: '2026-04-20',
        reason: null,
      },
    ],
  }
}

/** No products at all: what the contract sends with an empty database. */
export function emptyInvestmentGains(): InvestmentGains {
  return {
    asOf: '2026-11-03',
    total: { gain: '0.00', invested: '0.00', gainPercent: null, excluded: [] },
    live: [],
    closed: [],
  }
}

/** Only closed products: nothing is live, so the total is empty. */
export function onlyClosedGains(): InvestmentGains {
  return { ...emptyInvestmentGains(), closed: investmentGains().closed }
}
