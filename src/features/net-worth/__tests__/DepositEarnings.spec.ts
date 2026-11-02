import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import { API_HTTP, ApiError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { formatDate } from '@/shared/money'

import DepositEarnings from '../components/DepositEarnings.vue'
import type { DepositEarnings as Earnings, DepositStatus } from '../types'
import { depositEarnings, emptyDepositEarnings } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const euros = (figure: string) => `${figure}${NBSP}€`

// Class names are composed at runtime: a literal in a spec would end up in the
// production CSS, because Tailwind scans src/ as text (docs/stack.md).
const cls = (...parts: string[]) => parts.join('-')

const Blank = { render: () => null }

/** Text colours a label must not carry when it goes without colour (decisions §2). */
const LABEL_COLOURS = ['positive', 'info', 'warning', 'negative', 'brand'].map((tone) =>
  cls('text', tone),
)

/** The label has the neutral look and none of the coloured ones. */
function expectUncoloured(badge: { classes: () => string[] }) {
  expect(badge.classes()).toContain(cls('text', 'ink', 'body'))
  for (const colour of LABEL_COLOURS) expect(badge.classes()).not.toContain(colour)
}

async function mountPart(props: {
  earnings: Earnings | null
  loading?: boolean
  error?: AppError | null
}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/net-worth', name: 'net-worth', component: Blank },
      { path: '/movements', name: 'movements', component: Blank },
    ],
  })
  await router.push('/net-worth')
  await router.isReady()
  const wrapper = mount(DepositEarnings, {
    props: { loading: false, error: null, ...props },
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

type Wrapper = Awaited<ReturnType<typeof mountPart>>['wrapper']

const rows = (wrapper: Wrapper) => wrapper.findAll('[data-test="deposit-row"]')

/** The row of the fixture deposit with that status (each status appears once but matured). */
function rowOf(wrapper: Wrapper, status: DepositStatus, index = 0) {
  const ids = depositEarnings()
    .deposits.filter((deposit) => deposit.status === status)
    .map((deposit) => deposit.id)
  const order = depositEarnings().deposits.map((deposit) => deposit.id)
  const row = rows(wrapper)[order.indexOf(ids[index] ?? -1)]
  if (!row) throw new Error(`no row for ${status}`)
  return row
}

describe('DepositEarnings', () => {
  it('paints one row per deposit of every status in the order the backend sends', async () => {
    const earnings = depositEarnings()
    const { wrapper } = await mountPart({ earnings })

    const names = rows(wrapper).map((row) => row.get('[data-test="deposit-name"]').text())
    expect(names).toEqual(earnings.deposits.map((deposit) => deposit.name))
    expect(names).toEqual([
      'Deposito 3m',
      'Deposito 2m',
      'Deposito 1m',
      'Deposito 4m',
      'Deposito 6m',
      'Deposito 5m',
      'Deposito 9m',
    ])
    // Every row carries its bank, readable.
    for (const row of rows(wrapper)) {
      expect(row.get('[data-test="deposit-bank"]').text()).toBe('MyInvestor')
    }
  })

  it('shows what a matured deposit earned, in green', async () => {
    const { wrapper } = await mountPart({ earnings: depositEarnings() })

    const matured = rowOf(wrapper, 'matured')
    expect(matured.get('[data-test="deposit-status"]').text()).toBe('Matured')
    // Only the figure is green: the label goes without colour.
    expectUncoloured(matured.get('[data-test="deposit-status"]'))
    const earned = matured.get('[data-test="deposit-earned"]')
    expect(earned.text()).toBe(euros('7,25'))
    expect(earned.classes()).toEqual(
      expect.arrayContaining([
        cls('text', 'positive'),
        cls('font', 'mono'),
        cls('tabular', 'nums'),
      ]),
    )
    expect(rowOf(wrapper, 'matured', 1).get('[data-test="deposit-earned"]').text()).toBe(
      euros('18,40'),
    )
    // Only matured figures are green.
    const green = wrapper
      .findAll('[data-test="deposit-earned"]')
      .filter((cell) => cell.classes().includes(cls('text', 'positive')))
    expect(green).toHaveLength(2)
  })

  it('shows the total exactly as the backend sent it', async () => {
    // A total that is not what a client-side sum would give: it is shown, not recomputed.
    const earnings = { ...depositEarnings(), total: '1234.56' }
    const { wrapper } = await mountPart({ earnings })

    const total = wrapper.get('[data-test="deposits-total"]')
    expect(total.text()).toBe(euros('1.234,56'))
    expect(total.classes()).toEqual(
      expect.arrayContaining([cls('font', 'mono'), cls('tabular', 'nums')]),
    )
    expect(wrapper.text()).toContain('Earned by your deposits')
    expect(wrapper.get('[data-test="deposits-sentence"]').text()).toBe(
      'Only deposits that matured with their payment in your statement add up here. This figure is not part of your net worth: that interest already counts as income in Overview and Movements.',
    )
  })

  it('shows an active deposit with its expected gain, its maturity date and not earned yet', async () => {
    const { wrapper } = await mountPart({ earnings: depositEarnings() })

    const active = rowOf(wrapper, 'active')
    expect(active.get('[data-test="deposit-status"]').text()).toBe('Active')
    expectUncoloured(active.get('[data-test="deposit-status"]'))
    expect(active.findAll('[data-test="deposit-fact"]').map((fact) => fact.text())).toEqual([
      `Put in ${euros('5.000,00')}`,
      `Opened ${formatDate('2026-06-01')}`,
      `Matures ${formatDate('2026-09-01')}`,
      `Expected ${euros('31,20')}`,
    ])
    const earned = active.get('[data-test="deposit-earned"]')
    expect(earned.text()).toBe('Not earned yet')
    expect(earned.classes()).toContain(cls('text', 'ink', 'muted'))
    expect(earned.text()).not.toContain('€')
    expect(active.find('[data-test="deposit-link"]').exists()).toBe(false)
  })

  it('shows a cancelled deposit in grey, with its cancel date and not in the total', async () => {
    const { wrapper } = await mountPart({ earnings: depositEarnings() })

    const cancelled = rowOf(wrapper, 'cancelled')
    expect(cancelled.get('[data-test="deposit-status"]').text()).toBe('Cancelled')
    expect(cancelled.get('[data-test="deposit-extra"]').text()).toBe(
      `Cancelled on ${formatDate('2026-03-10')}, before it matured`,
    )
    const muted = cls('text', 'ink', 'muted')
    for (const part of ['deposit-name', 'deposit-facts', 'deposit-extra', 'deposit-earned']) {
      expect(cancelled.get(`[data-test="${part}"]`).classes()).toContain(muted)
    }
    expect(cancelled.get('[data-test="deposit-name"]').classes()).not.toContain(
      cls('text', 'ink', 'strong'),
    )
    expect(cancelled.text()).toContain(`Was due ${formatDate('2026-05-04')}`)
    expect(cancelled.get('[data-test="deposit-earned"]').text()).toBe('Not in the total')
    expect(cancelled.find('[data-test="deposit-link"]').exists()).toBe(false)
  })

  it('shows each doubtful deposit in amber with its reason and not in the total', async () => {
    const { wrapper } = await mountPart({ earnings: depositEarnings() })
    const amber = cls('text', 'warning')

    const reasons: [DepositStatus, string][] = [
      ['maturity_not_found', 'Doubtful · its payment is not in your statement'],
      ['ambiguous', 'Doubtful · 2 possible payments in your statement, none chosen'],
      ['below_principal', `Doubtful · it paid back ${euros('3.990,00')}, less than you put in`],
    ]
    for (const [status, reason] of reasons) {
      const row = rowOf(wrapper, status)
      const badge = row.get('[data-test="deposit-status"]')
      expect(badge.text()).toBe('Doubtful')
      expect(badge.classes()).toContain(amber)
      const extra = row.get('[data-test="deposit-extra"]')
      expect(extra.text()).toBe(reason)
      expect(extra.classes()).toContain(amber)
      const earned = row.get('[data-test="deposit-earned"]')
      expect(earned.text()).toBe('Not in the total')
      expect(earned.classes()).toContain(amber)
    }
  })

  it('says there are no deposits instead of an empty part', async () => {
    const { wrapper } = await mountPart({ earnings: emptyDepositEarnings() })

    expect(wrapper.get('[data-test="deposits-empty"]').text()).toBe('You have no deposits yet.')
    expect(wrapper.text()).toContain('Deposits')
    expect(wrapper.find('[data-test="deposits-total"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(euros('0,00'))
    expect(rows(wrapper)).toHaveLength(0)
  })

  it('offers See in Movements on a deposit with its maturity movement', async () => {
    const { wrapper, router } = await mountPart({ earnings: depositEarnings() })

    const links = wrapper.findAll('[data-test="deposit-link"]')
    // The two matured and the one that paid back less: the ones with a maturity movement.
    expect(links).toHaveLength(3)
    expect(links.every((link) => link.text() === 'See in Movements')).toBe(true)
    const matured = rowOf(wrapper, 'matured').get('[data-test="deposit-link"]')
    expect(matured.attributes('href')).toBe('/movements?month=2026-06')
    expect(rowOf(wrapper, 'below_principal').get('a').attributes('href')).toBe(
      '/movements?month=2026-05',
    )
    expect(rowOf(wrapper, 'ambiguous').find('[data-test="deposit-link"]').exists()).toBe(false)

    await matured.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('movements')
    expect(router.currentRoute.value.query).toEqual({ month: '2026-06' })
  })

  it('says the deposits could not be loaded with the error message', async () => {
    const { wrapper } = await mountPart({
      earnings: null,
      error: new ApiError('HTTP 500: database down', API_HTTP, { status: 500 }),
    })

    const error = wrapper.get('[data-test="deposits-error"]')
    expect(error.text()).toContain("Couldn't load your deposits")
    expect(error.text()).toContain('HTTP 500: database down')
    expect(rows(wrapper)).toHaveLength(0)
    expect(wrapper.find('[data-test="deposits-total"]').exists()).toBe(false)
  })

  it('says it is loading the deposits', async () => {
    const { wrapper } = await mountPart({ earnings: null, loading: true })

    expect(wrapper.get('[data-test="deposits-loading"]').text()).toBe('Loading your deposits…')
    expect(wrapper.find('[data-test="deposits-error"]').exists()).toBe(false)
    expect(rows(wrapper)).toHaveLength(0)
  })
})
