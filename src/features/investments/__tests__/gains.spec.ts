import { describe, it, expect } from 'vitest'

import { formatDate } from '@/shared/money'

import {
  barOf,
  cancelledLine,
  closedFacts,
  depositLine,
  excludedLine,
  liveFacts,
  MISSING,
  reasonLine,
  reasonText,
  signedPercent,
  sortLive,
  toneOf,
  typeLabel,
} from '../gains'
import type { ClosedGainsProduct, GainsProduct, GainsReason } from '../types'
import { investmentGains } from './fixtures'

const NBSP = String.fromCharCode(0xa0)

function live(name: string): GainsProduct {
  const product = investmentGains().live.find((item) => item.name === name)
  if (!product) throw new Error(`no ${name} in the sample`)
  return product
}

function closed(name: string): ClosedGainsProduct {
  const product = investmentGains().closed.find((item) => item.name === name)
  if (!product) throw new Error(`no ${name} in the sample`)
  return product
}

describe('sortLive', () => {
  it('sorts live products by gain in euros, with the ones without a figure at the end', () => {
    const sample = investmentGains().live

    expect(sortLive(sample).map((product) => product.name)).toEqual([
      'Fondo Global',
      'Deposito 12m',
      'Cartera Indexada',
      'ETF Mundo',
    ])
    // A copy: the backend order is kept where it came from.
    expect(sample.map((product) => product.name)).toEqual([
      'Fondo Global',
      'Cartera Indexada',
      'Deposito 12m',
      'ETF Mundo',
    ])
  })

  it('compares euros, not percents, and keeps the arrival order at equal gain', () => {
    const small = {
      ...live('Deposito 12m'),
      id: 8,
      name: 'Small',
      gain: '19.00',
      gainPercent: '1.9',
    }
    const big = { ...live('Fondo Global'), id: 9, name: 'Big', gain: '180.00', gainPercent: '1.5' }
    const twin = { ...big, id: 10, name: 'Twin' }
    const gap = { ...live('ETF Mundo'), id: 11, name: 'Gap' }

    expect(sortLive([gap, small, big, twin]).map((product) => product.name)).toEqual([
      'Big',
      'Twin',
      'Small',
      'Gap',
    ])
  })
})

describe('barOf', () => {
  it('scales each bar to the biggest gain or loss of the live products', () => {
    const sample = investmentGains().live

    // 500.50 is the biggest |gain|: the full half of the track.
    expect(barOf(live('Fondo Global'), sample)).toEqual({ side: 'gain', permille: 1000 })
    // 185.85 / 500.50 = 371,3 ‰.
    expect(barOf(live('Deposito 12m'), sample)).toEqual({ side: 'gain', permille: 371 })
    // 120.40 / 500.50 = 240,6 ‰, on the loss side.
    expect(barOf(live('Cartera Indexada'), sample)).toEqual({ side: 'loss', permille: 241 })
    expect(barOf(live('ETF Mundo'), sample)).toEqual({ side: 'none', permille: 0 })
  })

  it('lets a loss be the biggest one and draws nothing for a zero', () => {
    const loss = { ...live('Cartera Indexada'), gain: '-900.00' }
    const zero = { ...live('Deposito 12m'), gain: '0.00' }
    const sample = [live('Fondo Global'), loss, zero]

    expect(barOf(loss, sample)).toEqual({ side: 'loss', permille: 1000 })
    expect(barOf(live('Fondo Global'), sample)).toEqual({ side: 'gain', permille: 556 })
    expect(barOf(zero, sample)).toEqual({ side: 'none', permille: 0 })
    expect(barOf(zero, [zero])).toEqual({ side: 'none', permille: 0 })
  })
})

describe('texts', () => {
  it('names the reason of each figure that cannot be obtained', () => {
    const expected: Record<GainsReason, string> = {
      no_photo: 'no valuation on file',
      gain_not_reported: 'the valuation has no gain',
      gain_percent_not_reported: 'the valuation has no gain percent',
      maturity_not_found: 'its payment is not in your statement',
      ambiguous: 'several possible payments in your statement',
      below_principal: 'it paid back less than you put in',
      missing_conditions: 'its conditions are incomplete',
    }
    for (const [reason, text] of Object.entries(expected)) {
      expect(reasonText(reason as GainsReason)).toBe(text)
    }
    // A live product without gain says it is not in the total; one without % still is.
    expect(reasonLine(live('ETF Mundo'), 'live')).toBe('No valuation on file · Not in the total')
    const noPercent = {
      ...live('Fondo Global'),
      gainPercent: null,
      reason: 'gain_percent_not_reported' as const,
    }
    expect(reasonLine(noPercent, 'live')).toBe('The valuation has no gain percent')
    expect(reasonLine(live('Fondo Global'), 'live')).toBeNull()
    const doubtful = { ...closed('Deposito 3m'), gain: null, reason: 'ambiguous' as const }
    expect(reasonLine(doubtful, 'closed')).toBe('Several possible payments in your statement')
  })

  it('lists the products left out of the total in their order, or nothing', () => {
    expect(
      excludedLine([
        { productId: 2, name: 'ETF Mundo', reason: 'no_photo' },
        { productId: 6, name: 'Fondo Bonos', reason: 'gain_not_reported' },
      ]),
    ).toBe(
      'Not included: ETF Mundo (no valuation on file), Fondo Bonos (the valuation has no gain)',
    )
    expect(excludedLine([])).toBeNull()
  })

  it('says a closed deposit was cancelled only when it closed before its maturity date', () => {
    expect(cancelledLine(closed('Deposito 6m'))).toBe('Cancelled before it matured')
    // Matured on its maturity date.
    expect(cancelledLine(closed('Deposito 3m'))).toBeNull()
    // Closed after it: not a cancellation either.
    const late = { ...closed('Deposito 3m'), closedOn: '2026-09-04' }
    expect(cancelledLine(late)).toBeNull()
    // Without a maturity date nothing can be said.
    const noDate = {
      ...closed('Deposito 6m'),
      conditions: { ...closed('Deposito 6m').conditions!, maturityDate: null },
    }
    expect(cancelledLine(noDate)).toBeNull()
    // Not a deposit.
    const fund = { ...closed('Deposito 6m'), type: 'fund' as const }
    expect(cancelledLine(fund)).toBeNull()
  })

  it('writes the facts of a live and a closed product, with a gap for a missing one', () => {
    const { asOf } = investmentGains()
    expect(liveFacts(live('Fondo Global'), asOf)).toEqual([
      `Started ${formatDate('2025-11-03')}`,
      `Put in 12.300,00${NBSP}€`,
      `Worth 12.800,50${NBSP}€ on ${formatDate('2026-09-30')}`,
    ])
    expect(liveFacts(live('Deposito 12m'), asOf)).toEqual([
      `Started ${formatDate('2026-03-02')}`,
      `Put in 10.000,00${NBSP}€`,
      `Worth 10.185,85${NBSP}€ today`,
    ])
    expect(liveFacts(live('ETF Mundo'), asOf)).toEqual([
      `Started ${MISSING}`,
      `Put in ${MISSING}`,
      `Worth ${MISSING}`,
    ])
    expect(closedFacts(closed('Deposito 3m'))).toEqual([
      `Started ${formatDate('2026-06-01')}`,
      `Closed ${formatDate('2026-09-01')}`,
    ])
  })

  it('writes the day by day line only on a live deposit with its figures', () => {
    expect(depositLine(live('Deposito 12m'))).toBe(
      `Counted day by day: 275,00${NBSP}€ when it matures on ${formatDate('2027-03-01')}`,
    )
    expect(depositLine(live('Fondo Global'))).toBeNull()
    const incomplete = {
      ...live('Deposito 12m'),
      gain: null,
      reason: 'missing_conditions' as const,
    }
    expect(depositLine(incomplete)).toBeNull()
  })

  it('signs the percents and names the types and tones', () => {
    expect(signedPercent('4.07')).toBe(`+4,07${NBSP}%`)
    expect(signedPercent('-2.1')).toBe(`-2,1${NBSP}%`)
    expect(signedPercent('0.00')).toBe(`0,00${NBSP}%`)
    expect(typeLabel('fund')).toBe('Fund')
    expect(typeLabel('etf')).toBe('ETF')
    expect(typeLabel('managed_portfolio')).toBe('Managed portfolio')
    expect(typeLabel('deposit')).toBe('Fixed-term deposit')
    expect(toneOf('0.01')).toBe('positive')
    expect(toneOf('-0.01')).toBe('negative')
    expect(toneOf('0.00')).toBe('neutral')
    expect(toneOf(null)).toBe('neutral')
  })
})
