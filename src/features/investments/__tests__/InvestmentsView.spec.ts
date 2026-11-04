import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import { routes } from '@/router'
import { formatDate } from '@/shared/money'

import { GAINS_PATH } from '../service'
import InvestmentsView from '../views/InvestmentsView.vue'
import { emptyInvestmentGains, investmentGains, onlyClosedGains } from './fixtures'

const NBSP = String.fromCharCode(0xa0)

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

const pathOf = (input: unknown) => new URL(String(input)).pathname

/**
 * Mocks only the HTTP boundary: store, service and http client run for real. The
 * screen asks only the gains; any other path is rejected.
 */
function mockApi(respond: () => Promise<Response>) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input) =>
      pathOf(input) === GAINS_PATH
        ? respond()
        : Promise.reject(new TypeError(`unexpected ${pathOf(input)}`)),
    )
}

/** Opens /investments with the app routes, so what is checked is the routed screen. */
async function openInvestments(respond: () => Promise<Response>) {
  const fetchSpy = mockApi(respond)
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/investments')
  await router.isReady()
  const wrapper = mount(
    { render: () => h(RouterView) },
    {
      global: { plugins: [createPinia(), router] },
    },
  )
  await flushPromises()
  return { wrapper, fetchSpy }
}

const answer = (body: unknown, init?: ResponseInit) => () =>
  Promise.resolve(jsonResponse(body, init))

describe('InvestmentsView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks the gains once on mount, only with GET', async () => {
    const { wrapper, fetchSpy } = await openInvestments(answer(investmentGains()))

    expect(wrapper.findComponent(InvestmentsView).exists()).toBe(true)
    const calls = fetchSpy.mock.calls.map(([input, init]) => ({
      path: pathOf(input),
      search: new URL(String(input)).search,
      method: init?.method ?? 'GET',
      body: init?.body,
    }))
    // Nothing but this read: not the deposits, not the net worth, and no write of any kind.
    expect(calls).toEqual([{ path: GAINS_PATH, search: '', method: 'GET', body: undefined }])
  })

  it('shows the total of the live investments at the top', async () => {
    const { wrapper } = await openInvestments(answer(investmentGains()))

    const summary = wrapper.get('[data-test="gains-summary"]')
    expect(summary.get('[data-test="gains-total"]').text()).toBe(`+565,95${NBSP}€`)
    expect(summary.get('[data-test="gains-total-percent"]').text()).toBe(`+2,02${NBSP}%`)
    expect(summary.get('[data-test="gains-excluded"]').text()).toBe(
      'Not included: ETF Mundo (no valuation on file)',
    )
  })

  it('shows one row per live investment with its start date, put in, worth and gain', async () => {
    const { wrapper } = await openInvestments(answer(investmentGains()))

    const card = wrapper.get('[data-test="live-investments"]')
    expect(card.text()).toContain('Your investments')
    const rows = card.findAll('[data-test="gain-row"]')
    expect(rows).toHaveLength(4)
    const fund = rows[0]!
    expect(fund.get('[data-test="gain-name"]').text()).toBe('Fondo Global')
    expect(fund.get('[data-test="gain-type"]').text()).toBe('Fund')
    expect(fund.get('[data-test="gain-bank"]').text()).toBe('MyInvestor')
    expect(fund.findAll('[data-test="gain-fact"]').map((fact) => fact.text())).toEqual([
      `Started ${formatDate('2025-11-03')}`,
      `Put in 12.300,00${NBSP}€`,
      `Worth 12.800,50${NBSP}€ on ${formatDate('2026-09-30')}`,
    ])
    expect(fund.get('[data-test="gain-amount"]').text()).toBe(`+500,50${NBSP}€`)
    expect(fund.get('[data-test="gain-percent"]').text()).toBe(`+4,07${NBSP}%`)
    expect(fund.get('[data-test="gain-amount"]').classes()).toContain('text-positive')

    const portfolio = rows[2]!
    expect(portfolio.get('[data-test="gain-name"]').text()).toBe('Cartera Indexada')
    expect(portfolio.get('[data-test="gain-amount"]').text()).toBe(`-120,40${NBSP}€`)
    expect(portfolio.get('[data-test="gain-percent"]').text()).toBe(`-2,1${NBSP}%`)
    expect(portfolio.get('[data-test="gain-amount"]').classes()).toContain('text-negative')

    const etf = rows[3]!
    expect(etf.get('[data-test="gain-amount"]').text()).toBe('—')
    expect(etf.get('[data-test="gain-reason"]').text()).toBe(
      'No valuation on file · Not in the total',
    )
  })

  it('orders the live investments from the one that gains most to the one that loses most', async () => {
    const { wrapper } = await openInvestments(answer(investmentGains()))

    const rows = wrapper.get('[data-test="live-investments"]').findAll('[data-test="gain-row"]')
    expect(rows.map((row) => row.get('[data-test="gain-name"]').text())).toEqual([
      'Fondo Global',
      'Deposito 12m',
      'Cartera Indexada',
      'ETF Mundo',
    ])
    // The bars: two to the right, one to the left, none for the one without a figure.
    const sides = rows.map((row) => {
      const fill = row.find('[data-test="gain-bar-fill"]')
      return fill.exists() ? fill.attributes('data-side') : 'no bar'
    })
    expect(sides).toEqual(['gain', 'gain', 'loss', 'no bar'])
  })

  it('shows the closed investments apart, in grey, with their gain and close date, outside the total', async () => {
    const { wrapper } = await openInvestments(answer(investmentGains()))

    const card = wrapper.get('[data-test="closed-investments"]')
    expect(card.text()).toContain('Closed')
    expect(card.get('[data-test="closed-sentence"]').text()).toBe(
      'Not part of the total: when they closed, the money went back to your account.',
    )
    const rows = card.findAll('[data-test="gain-row"]')
    // In the order they came.
    expect(rows.map((row) => row.get('[data-test="gain-name"]').text())).toEqual([
      'Deposito 3m',
      'Deposito 6m',
    ])
    const matured = rows[0]!
    expect(matured.findAll('[data-test="gain-fact"]').map((fact) => fact.text())).toEqual([
      `Started ${formatDate('2026-06-01')}`,
      `Closed ${formatDate('2026-09-01')}`,
    ])
    expect(matured.get('[data-test="gain-amount"]').text()).toBe(`+31,20${NBSP}€`)
    expect(matured.get('[data-test="gain-percent"]').text()).toBe(`+0,62${NBSP}%`)
    for (const row of rows) {
      expect(row.get('[data-test="gain-name"]').classes()).toContain('text-ink-muted')
      expect(row.get('[data-test="gain-amount"]').classes()).toContain('text-ink-muted')
      expect(row.get('[data-test="gain-amount"]').classes()).not.toContain('text-positive')
      expect(row.find('[data-test="gain-bar-fill"]').exists()).toBe(false)
    }
    expect(rows[1]!.get('[data-test="gain-cancelled"]').text()).toBe('Cancelled before it matured')
    // The total is the backend's, from the live ones only: 31,20 € is not in it.
    expect(wrapper.get('[data-test="gains-total"]').text()).toBe(`+565,95${NBSP}€`)
    // Below the live ones.
    const cards = wrapper.findAll(
      '[data-test="live-investments"], [data-test="closed-investments"]',
    )
    expect(cards.map((item) => item.attributes('data-test'))).toEqual([
      'live-investments',
      'closed-investments',
    ])
  })

  it('shows the deposits inside the lists and no Deposits card', async () => {
    const { wrapper } = await openInvestments(answer(investmentGains()))

    const liveNames = wrapper
      .get('[data-test="live-investments"]')
      .findAll('[data-test="gain-name"]')
      .map((name) => name.text())
    const closedNames = wrapper
      .get('[data-test="closed-investments"]')
      .findAll('[data-test="gain-name"]')
      .map((name) => name.text())
    expect(liveNames).toContain('Deposito 12m')
    expect(closedNames).toEqual(['Deposito 3m', 'Deposito 6m'])
    expect(wrapper.get('[data-test="gain-deposit-line"]').text()).toBe(
      `Counted day by day: 275,00${NBSP}€ when it matures on ${formatDate('2027-03-01')}`,
    )
    expect(wrapper.find('[data-test="deposit-earnings"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="deposit-row"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Deposits')
  })

  it('says the investments could not be loaded and offers Try again', async () => {
    let attempts = 0
    const { wrapper, fetchSpy } = await openInvestments(() => {
      attempts += 1
      return Promise.resolve(
        attempts === 1
          ? jsonResponse({ message: 'gains down' }, { status: 500 })
          : jsonResponse(investmentGains()),
      )
    })

    const error = wrapper.get('[data-test="gains-error"]')
    expect(error.text()).toContain("Couldn't load your investments")
    expect(error.get('[data-test="gains-error-message"]').text()).toBe('HTTP 500: gains down')
    expect(wrapper.find('[data-test="gains-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="gain-row"]').exists()).toBe(false)

    await wrapper.get('[data-test="gains-retry"]').trigger('click')
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls.map(([input]) => pathOf(input))).toEqual([GAINS_PATH, GAINS_PATH])
    expect(wrapper.find('[data-test="gains-error"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="gains-total"]').text()).toBe(`+565,95${NBSP}€`)
  })

  it('shows an answer that breaks the contract as the error, with no figure of it', async () => {
    const broken = { ...investmentGains(), total: { ...investmentGains().total, gain: '597.15' } }
    const { wrapper } = await openInvestments(answer(broken))

    expect(wrapper.get('[data-test="gains-error-message"]').text()).toContain(
      'total.gain is not the sum of the gains of the live products',
    )
    expect(wrapper.find('[data-test="gains-total"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="gain-row"]').exists()).toBe(false)
  })

  it('says it is loading the investments', async () => {
    const { wrapper } = await openInvestments(() => new Promise<Response>(() => {}))

    expect(wrapper.get('[data-test="gains-loading"]').text()).toBe('Loading your investments…')
    expect(wrapper.find('[data-test="gains-summary"]').exists()).toBe(false)
  })

  it('says there are no investments yet', async () => {
    const { wrapper } = await openInvestments(answer(emptyInvestmentGains()))

    expect(wrapper.get('[data-test="gains-empty"]').text()).toBe('You have no investments yet.')
    expect(wrapper.find('[data-test="gains-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="gains-no-live"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="live-investments"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="closed-investments"]').exists()).toBe(false)
  })

  it('says there are no live investments when only closed ones come', async () => {
    const { wrapper } = await openInvestments(answer(onlyClosedGains()))

    expect(wrapper.get('[data-test="gains-no-live"]').text()).toBe('No live investments right now.')
    // No total of nothing.
    expect(wrapper.find('[data-test="gains-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="live-investments"]').exists()).toBe(false)
    expect(
      wrapper.get('[data-test="closed-investments"]').findAll('[data-test="gain-row"]'),
    ).toHaveLength(2)
    expect(wrapper.find('[data-test="gains-empty"]').exists()).toBe(false)
  })
})
