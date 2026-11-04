import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate } from '@/shared/money'

import GainRow from '../components/GainRow.vue'
import { barOf } from '../gains'
import type { ClosedGainsProduct, GainsProduct } from '../types'
import { investmentGains } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const { asOf } = investmentGains()

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

function mountLive(product: GainsProduct) {
  return mount(GainRow, {
    props: { product, variant: 'live', bar: barOf(product, investmentGains().live), asOf },
  })
}

describe('GainRow', () => {
  it('draws a green bar to the right for a gain and a red one to the left for a loss', () => {
    const gain = mountLive(live('Fondo Global')).get('[data-test="gain-bar-fill"]')
    expect(gain.attributes('data-side')).toBe('gain')
    expect(gain.classes()).toEqual(expect.arrayContaining(['left-1/2', 'bg-positive']))
    expect(gain.classes()).not.toContain('bg-negative')
    // The biggest gain fills the whole right half.
    expect(gain.attributes('style')).toContain('width: 50%')

    const loss = mountLive(live('Cartera Indexada')).get('[data-test="gain-bar-fill"]')
    expect(loss.attributes('data-side')).toBe('loss')
    expect(loss.classes()).toEqual(expect.arrayContaining(['right-1/2', 'bg-negative']))
    expect(loss.classes()).not.toContain('bg-positive')
    // 120.40 of 500.50: 241 ‰ of one half.
    expect(loss.attributes('style')).toContain('width: 12.05%')
  })

  it('paints the figures of a live row green when it gains and red when it loses', () => {
    const gain = mountLive(live('Fondo Global'))
    expect(gain.get('[data-test="gain-amount"]').text()).toBe(`+500,50${NBSP}€`)
    expect(gain.get('[data-test="gain-percent"]').text()).toBe(`+4,07${NBSP}%`)
    expect(gain.get('[data-test="gain-amount"]').classes()).toContain('text-positive')
    expect(gain.get('[data-test="gain-percent"]').classes()).toContain('text-positive')

    const loss = mountLive(live('Cartera Indexada'))
    expect(loss.get('[data-test="gain-amount"]').text()).toBe(`-120,40${NBSP}€`)
    expect(loss.get('[data-test="gain-percent"]').text()).toBe(`-2,1${NBSP}%`)
    expect(loss.get('[data-test="gain-amount"]').classes()).toContain('text-negative')
    expect(loss.get('[data-test="gain-type"]').text()).toBe('Managed portfolio')
    expect(loss.get('[data-test="gain-bank"]').text()).toBe('MyInvestor')

    const zero = mountLive({ ...live('Fondo Global'), gain: '0.00', gainPercent: '0.00' })
    expect(zero.get('[data-test="gain-amount"]').text()).toBe(`0,00${NBSP}€`)
    expect(zero.get('[data-test="gain-amount"]').classes()).toContain('text-ink-strong')
    expect(zero.find('[data-test="gain-bar-fill"]').exists()).toBe(false)
  })

  it('shows a live deposit counting its expected gain day by day', () => {
    const row = mountLive(live('Deposito 12m'))

    expect(row.get('[data-test="gain-type"]').text()).toBe('Fixed-term deposit')
    expect(row.get('[data-test="gain-deposit-line"]').text()).toBe(
      `Counted day by day: 275,00${NBSP}€ when it matures on ${formatDate('2027-03-01')}`,
    )
    // What it has earned up to today is the figure of the row, like any other.
    expect(row.get('[data-test="gain-amount"]').text()).toBe(`+185,85${NBSP}€`)
    expect(row.get('[data-test="gain-percent"]').text()).toBe(`+1,86${NBSP}%`)
    expect(row.findAll('[data-test="gain-fact"]').map((fact) => fact.text())).toContain(
      `Worth 10.185,85${NBSP}€ today`,
    )
    expect(mountLive(live('Fondo Global')).find('[data-test="gain-deposit-line"]').exists()).toBe(
      false,
    )
  })

  it('shows a gap and its reason for a figure that cannot be obtained, never a zero', () => {
    const row = mountLive(live('ETF Mundo'))

    expect(row.get('[data-test="gain-amount"]').text()).toBe('—')
    expect(row.get('[data-test="gain-percent"]').text()).toBe('—')
    expect(row.get('[data-test="gain-amount"]').classes()).toContain('text-ink-muted')
    expect(row.findAll('[data-test="gain-fact"]').map((fact) => fact.text())).toEqual([
      'Started —',
      'Put in —',
      'Worth —',
    ])
    expect(row.get('[data-test="gain-reason"]').text()).toBe(
      'No valuation on file · Not in the total',
    )
    expect(row.text()).not.toContain('0,00')
    // No figure, no bar.
    expect(row.find('[data-test="gain-bar-centre"]').exists()).toBe(false)

    // Only the percent missing: the gain is shown and the product is in the total.
    const noPercent = mountLive({
      ...live('Fondo Global'),
      gainPercent: null,
      reason: 'gain_percent_not_reported',
    })
    expect(noPercent.get('[data-test="gain-amount"]').text()).toBe(`+500,50${NBSP}€`)
    expect(noPercent.get('[data-test="gain-percent"]').text()).toBe('—')
    expect(noPercent.get('[data-test="gain-reason"]').text()).toBe(
      'The valuation has no gain percent',
    )
  })

  it('says when the value of a product is not from today', () => {
    const facts = mountLive(live('Fondo Global'))
      .findAll('[data-test="gain-fact"]')
      .map((fact) => fact.text())

    expect(facts).toEqual([
      `Started ${formatDate('2025-11-03')}`,
      `Put in 12.300,00${NBSP}€`,
      `Worth 12.800,50${NBSP}€ on ${formatDate('2026-09-30')}`,
    ])
  })

  it('shows a closed row all in grey, without a bar, and a cancelled deposit as such', () => {
    const row = mount(GainRow, {
      props: { product: closed('Deposito 6m'), variant: 'closed', asOf },
    })

    expect(row.findAll('[data-test="gain-fact"]').map((fact) => fact.text())).toEqual([
      `Started ${formatDate('2026-01-12')}`,
      `Closed ${formatDate('2026-04-20')}`,
    ])
    expect(row.get('[data-test="gain-cancelled"]').text()).toBe('Cancelled before it matured')
    expect(row.get('[data-test="gain-amount"]').text()).toBe(`0,00${NBSP}€`)
    expect(row.get('[data-test="gain-name"]').classes()).toContain('text-ink-muted')
    expect(row.get('[data-test="gain-amount"]').classes()).toContain('text-ink-muted')
    expect(row.find('[data-test="gain-bar-centre"]').exists()).toBe(false)
    expect(row.find('[data-test="gain-deposit-line"]').exists()).toBe(false)

    const matured = mount(GainRow, {
      props: { product: closed('Deposito 3m'), variant: 'closed', asOf },
    })
    expect(matured.get('[data-test="gain-amount"]').text()).toBe(`+31,20${NBSP}€`)
    expect(matured.get('[data-test="gain-percent"]').text()).toBe(`+0,62${NBSP}%`)
    expect(matured.get('[data-test="gain-amount"]').classes()).not.toContain('text-positive')
    expect(matured.find('[data-test="gain-cancelled"]').exists()).toBe(false)
  })
})
