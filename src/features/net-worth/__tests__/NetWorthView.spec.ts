import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { formatDate } from '@/shared/money'

import type { NetWorth } from '../types'
import NetWorthView from '../views/NetWorthView.vue'
import { coherentNetWorth, emptyNetWorth, inconsistentNetWorth } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const euros = (figure: string) => `${figure}${NBSP}€`

// Class names are composed at runtime: a literal in a spec would end up in the
// production CSS, because Tailwind scans src/ as text (docs/stack.md).
const cls = (...parts: string[]) => parts.join('-')

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

/** Mocks only the HTTP boundary: store, service and http client run for real. */
function mockApi(respond: () => Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(respond)
}

async function mountLoaded(netWorth: NetWorth) {
  const fetchSpy = mockApi(() => Promise.resolve(jsonResponse(netWorth)))
  const wrapper = mount(NetWorthView, { global: { plugins: [createPinia()] } })
  await flushPromises()
  return { wrapper, fetchSpy }
}

type Wrapper = Awaited<ReturnType<typeof mountLoaded>>['wrapper']

const rowByLabel = (wrapper: Wrapper, test: string, label: string) => {
  const row = wrapper.findAll(`[data-test="${test}"]`).find((item) => item.text().includes(label))
  if (!row) throw new Error(`no ${test} for ${label}`)
  return row
}

const holdingRow = (wrapper: Wrapper, name: string) => rowByLabel(wrapper, 'holding-row', name)

describe('NetWorthView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests the net worth exactly once on mount (R1)', async () => {
    const { fetchSpy } = await mountLoaded(coherentNetWorth())

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(new URL(String(fetchSpy.mock.calls[0]?.[0])).pathname).toBe('/api/net-worth')
  })

  it('shows a loading state and no blocks while the request is pending (R2)', async () => {
    mockApi(() => new Promise<Response>(() => {}))
    const wrapper = mount(NetWorthView, { global: { plugins: [createPinia()] } })
    await flushPromises()

    expect(wrapper.find('[data-test="net-worth-loading"]').exists()).toBe(true)
    for (const block of ['a', 'b', 'e']) {
      expect(wrapper.find(`[data-test="net-worth-block-${block}"]`).exists()).toBe(false)
    }
  })

  it('shows the store error message and no blocks when the request fails (R3)', async () => {
    mockApi(() => Promise.resolve(jsonResponse({ message: 'database down' }, { status: 500 })))
    const wrapper = mount(NetWorthView, { global: { plugins: [createPinia()] } })
    await flushPromises()

    const error = wrapper.get('[data-test="net-worth-error"]')
    expect(error.text()).toContain("Couldn't load your net worth")
    expect(error.text()).toContain('HTTP 500: database down')
    expect(wrapper.find('[data-test="net-worth-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="net-worth-block-a"]').exists()).toBe(false)
  })

  it('shows a contract drift (ValidationError) as an error too (R3)', async () => {
    mockApi(() => Promise.resolve(jsonResponse({ ...coherentNetWorth(), total: 12 })))
    const wrapper = mount(NetWorthView, { global: { plugins: [createPinia()] } })
    await flushPromises()

    expect(wrapper.get('[data-test="net-worth-error"]').text()).toContain('total is not')
  })

  it('shows the API total as is, never a client-side sum (R4)', async () => {
    const { wrapper } = await mountLoaded(inconsistentNetWorth())

    const blockA = wrapper.get('[data-test="net-worth-block-a"]')
    expect(blockA.get('[data-test="money"]').text()).toBe(euros('999,99'))
  })

  it('warns about a breakdown that does not add up, with both figures (R9)', async () => {
    const { wrapper } = await mountLoaded(inconsistentNetWorth())

    const mismatches = wrapper
      .get('[data-test="net-worth-block-b"]')
      .findAll('[data-test="breakdown-mismatch"]')
    expect(mismatches).toHaveLength(2)
    for (const mismatch of mismatches) {
      expect(mismatch.text()).toContain(euros('39.924,05'))
      expect(mismatch.text()).toContain(euros('999,99'))
    }
    // Nothing is corrected: the groups keep their own amounts.
    expect(rowByLabel(wrapper, 'nature-row', 'Savings').text()).toContain(euros('11.208,40'))
  })

  it('shows no mismatch warning for a coherent response (R9)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    expect(wrapper.find('[data-test="breakdown-mismatch"]').exists()).toBe(false)
  })

  it('shows the interpreted sentence inside block A (R5)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    expect(wrapper.get('[data-test="net-worth-block-a"]').text()).toContain(
      `As of ${formatDate('2026-09-12')}, you have ${euros('39.924,05')} across 5 banks.`,
    )
  })

  it('paints every figure in mono tabular numbers (R6)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    const figures = wrapper.findAll('[data-test="money"], [data-test="share"]')
    expect(figures.length).toBeGreaterThan(20)
    for (const figure of figures) {
      expect(figure.classes()).toEqual(
        expect.arrayContaining([cls('font', 'mono'), cls('tabular', 'nums')]),
      )
    }
  })

  it('shows one nature row per group with its amount, share and bar width (R7)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    const rows = wrapper.findAll('[data-test="nature-row"]')
    expect(rows.map((row) => row.get('[data-test="group-label"]').text())).toEqual([
      'Checking accounts',
      'Savings',
      'Market investments',
      'Fixed-term deposits',
    ])
    const market = rowByLabel(wrapper, 'nature-row', 'Market investments')
    // 15310.75 / 39924.05 = 38,349 % → 383 tenths
    expect(market.get('[data-test="money"]').text()).toBe(euros('15.310,75'))
    expect(market.get('[data-test="share"]').text()).toBe(`38,3${NBSP}%`)
    const fill = market.get('[data-test="share-bar-fill"]').element as HTMLElement
    expect(fill.style.width).toBe('38.3%')
  })

  it('draws no shares nor bars when the total is not positive (R7)', async () => {
    const netWorth = emptyNetWorth()
    netWorth.accounts.accounts = [
      { id: 2, iban: 'ES02', bank: 'n26', alias: 'Card', type: 'checking', balance: '-45.30' },
    ]
    netWorth.accounts.total = '-45.30'
    netWorth.total = '-45.30'
    const { wrapper } = await mountLoaded(netWorth)

    const row = rowByLabel(wrapper, 'nature-row', 'Checking accounts')
    expect(row.get('[data-test="money"]').text()).toBe(euros('-45,30'))
    expect(row.find('[data-test="share-bar-fill"]').exists()).toBe(false)
    expect(row.find('[data-test="share"]').exists()).toBe(false)
  })

  it('marks idle money on the checking accounts row only (R10)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    const badges = wrapper.findAll('[data-test="idle-money"]')
    expect(badges).toHaveLength(1)
    expect(badges[0]?.text()).toBe('Idle money')
    const checking = rowByLabel(wrapper, 'nature-row', 'Checking accounts')
    expect(checking.find('[data-test="idle-money"]').exists()).toBe(true)
  })

  it('does not mark idle money without checking accounts (R10)', async () => {
    const netWorth = emptyNetWorth()
    netWorth.accounts.accounts = [
      { id: 3, iban: 'ES03', bank: 'openbank', alias: 'Pot', type: 'savings', balance: '6000.00' },
    ]
    netWorth.accounts.total = '6000.00'
    netWorth.total = '6000.00'
    const { wrapper } = await mountLoaded(netWorth)

    expect(wrapper.find('[data-test="idle-money"]').exists()).toBe(false)
  })

  it('shows the bank breakdown with readable names by amount (R11)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    const rows = wrapper.findAll('[data-test="bank-row"]')
    expect(rows.map((row) => row.get('[data-test="group-label"]').text())).toEqual([
      'MyInvestor',
      'Openbank',
      'Trade Republic',
      'Bankinter',
      'N26',
    ])
    expect(rows[0]?.get('[data-test="money"]').text()).toBe(euros('25.310,75'))
    // A negative bank keeps its amount and draws an empty bar.
    const n26 = rowByLabel(wrapper, 'bank-row', 'N26')
    expect(n26.get('[data-test="money"]').text()).toBe(euros('-45,30'))
    expect((n26.get('[data-test="share-bar-fill"]').element as HTMLElement).style.width).toBe('0%')
  })

  it('shows a card per bank and a row per account and product, with its data date (R12)', async () => {
    const netWorth = coherentNetWorth()
    const { wrapper } = await mountLoaded(netWorth)

    expect(wrapper.findAll('[data-test="bank-card"]')).toHaveLength(5)
    expect(wrapper.findAll('[data-test="holding-row"]')).toHaveLength(
      netWorth.accounts.accounts.length + netWorth.investments.products.length,
    )
    const fund = holdingRow(wrapper, 'Global Fund')
    expect(fund.text()).toContain('Fund')
    expect(fund.get('[data-test="holding-date"]').text()).toBe(`Valued ${formatDate('2026-08-29')}`)
    const deposit = holdingRow(wrapper, 'Deposit 12m')
    expect(deposit.text()).toContain('Fixed-term deposit')
    expect(deposit.get('[data-test="holding-date"]').text()).toBe(
      `Matured ${formatDate('2026-08-15')}`,
    )
    const account = holdingRow(wrapper, 'Main account')
    expect(account.text()).toContain('Checking account')
    expect(account.text()).toContain('1332')
    expect(account.get('[data-test="holding-date"]').text()).toBe(
      `As of ${formatDate('2026-09-12')}`,
    )
    const myInvestor = rowByLabel(wrapper, 'bank-card', 'MyInvestor')
    expect(myInvestor.findAll('[data-test="holding-row"]')).toHaveLength(4)
  })

  it('shows a gap for a product without valuation, never a zero (R13)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    const etf = holdingRow(wrapper, 'World ETF')
    expect(etf.get('[data-test="value-gap"]').text()).toBe('No valuation')
    expect(etf.find('[data-test="money"]').exists()).toBe(false)
    expect(etf.text()).not.toContain(euros('0,00'))
    expect(etf.find('[data-test="holding-date"]').exists()).toBe(false)
  })

  it('keeps a card for a bank that only holds a gap, outside the breakdown (R13)', async () => {
    const netWorth = coherentNetWorth()
    const etf = netWorth.investments.products.find((product) => product.id === 12)
    if (etf) etf.bank = 'new-bank'
    const { wrapper } = await mountLoaded(netWorth)

    const card = rowByLabel(wrapper, 'bank-card', 'new-bank')
    expect(card.find('[data-test="value-gap"]').exists()).toBe(true)
    expect(card.find('[data-test="money"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="bank-row"]')).toHaveLength(5)
  })

  it('shows one readable warning per issue (R14)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    const warnings = wrapper.findAll('[data-test="data-warning"]')
    expect(warnings).toHaveLength(3)
    expect(warnings[0]?.text()).toContain(
      'World ETF has no valuation yet, so it is not counted in your net worth.',
    )
    expect(warnings[1]?.text()).toContain(`Deposit 12m matured on ${formatDate('2026-08-15')}`)
    expect(warnings[2]?.text()).toContain(
      `Interest Pot was last valued on ${formatDate('2026-06-30')}`,
    )
  })

  it('renders no warnings panel without issues (R14)', async () => {
    const netWorth = coherentNetWorth()
    netWorth.investments.issues = []
    const { wrapper } = await mountLoaded(netWorth)

    expect(wrapper.findAll('[data-test="data-warning"]')).toHaveLength(0)
    expect(wrapper.find('[data-test="data-warnings"]').exists()).toBe(false)
  })

  it('shows its own texts in English only (R15)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    const text = wrapper.text()
    for (const spanish of [
      'Patrimonio',
      'Cuenta',
      'Saldo',
      'Depósito',
      'Fondo',
      'Aviso',
      'Vencido',
    ]) {
      expect(text).not.toContain(spanish)
    }
    for (const title of ['Net worth', 'By type', 'By bank', 'Details', 'Data warnings']) {
      expect(text).toContain(title)
    }
  })

  it('renders only blocks A, B and E: no waterfall nor evolution (C1)', async () => {
    const { wrapper } = await mountLoaded(coherentNetWorth())

    const blocks = wrapper
      .findAll('[data-test^="net-worth-block-"]')
      .map((block) => block.attributes('data-test'))
    expect(blocks).toEqual(['net-worth-block-a', 'net-worth-block-b', 'net-worth-block-e'])
  })
})
