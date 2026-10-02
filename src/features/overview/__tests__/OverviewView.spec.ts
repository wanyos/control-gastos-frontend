import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { currentMonth, formatMonthLabel } from '@/features/statement/months'
import { formatDate, formatMoney, formatPercent } from '@/shared/money'

import OverviewView from '../views/OverviewView.vue'
import {
  LATEST,
  SERVER_ERROR_BODY,
  figuresOf,
  json,
  mockBackend,
  networkDown,
  rawPage,
} from './fixtures'
import type { Read } from './fixtures'

type Override = Parameters<typeof mockBackend>[0]

const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

/** Two stages of reads, one after the other: the core, then what hangs off it. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await flushPromises()
}

async function mountView(url: string, override?: Override, pinia: Pinia = createPinia()) {
  const api = mockBackend(override)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/overview', name: 'overview', component: OverviewView },
      { path: '/movements', name: 'movements', component: { render: () => null } },
    ],
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(OverviewView, { global: { plugins: [router, pinia] } })
  await settle()

  return { api, router, wrapper }
}

type View = Awaited<ReturnType<typeof mountView>>['wrapper']

const text = (wrapper: View, name: string): string => wrapper.get(`[data-test="${name}"]`).text()
const has = (wrapper: View, name: string): boolean => wrapper.find(`[data-test="${name}"]`).exists()
const figure = (wrapper: View, card: string): string =>
  wrapper.get(`[data-test="${card}"] [data-test="money"]`).text()

const isMonth = (read: Read, month: string): boolean =>
  read.kind === 'month' && read.month === month

describe('OverviewView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('a complete month: August 2026', () => {
    it('reads the sentence first, right under the month nav and before any figure (R4)', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08')

      const order = [
        ...wrapper.element.querySelectorAll(
          '[data-test="statement-nav"], [data-test="overview-sentence"], [data-test="money"]',
        ),
      ].map((element) => element.getAttribute('data-test'))

      expect(order).toEqual([
        'statement-nav',
        'overview-sentence',
        'money',
        'money',
        'money',
        'money',
      ])
      expect(text(wrapper, 'overview-sentence')).toBe(
        `In August 2026, ${eur('2.590')} came in and ${eur('4.004')} went out: you spent ${eur('1.414')} more than came in.`,
      )
    })

    it('paints the three figures of the backend to the cent, and the rate (R5, R6)', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08')

      expect(figure(wrapper, 'overview-in')).toBe(eur('2.590,26'))
      expect(figure(wrapper, 'overview-out')).toBe(eur('4.003,89'))
      expect(figure(wrapper, 'overview-net')).toBe(eur('-1.413,63'))
      expect(figure(wrapper, 'overview-in')).toBe(formatMoney('2590.26'))
      expect(figure(wrapper, 'overview-rate')).toBe(formatPercent(-546))
      expect(has(wrapper, 'overview-rate-note')).toBe(false)
      expect(text(wrapper, 'overview-in')).toContain('Money in')
      expect(text(wrapper, 'overview-out')).toContain('Money out')
      expect(text(wrapper, 'overview-net')).toContain('Savings')
      expect(text(wrapper, 'overview-rate')).toContain('Savings rate')
    })

    it('says whether each figure was a usual one, against the median (R10, R11)', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08')

      const moneyIn = wrapper.get('[data-test="overview-in"]')
      const moneyOut = wrapper.get('[data-test="overview-out"]')

      expect(moneyIn.get('[data-test="overview-verdict"]').text()).toBe('About usual')
      expect(moneyIn.get('[data-test="overview-usual-text"]').text()).toBe(
        `12,2${NBSP}% below your usual month (${eur('2.950,00')})`,
      )
      expect(moneyOut.get('[data-test="overview-verdict"]').text()).toBe('More than usual')
      expect(moneyOut.get('[data-test="overview-usual-text"]').text()).toBe(
        `34,9${NBSP}% above your usual month (${eur('2.967,58')})`,
      )
      // The savings carry no label: they are the consequence.
      expect(wrapper.findAll('[data-test="overview-verdict"]')).toHaveLength(2)
      expect(text(wrapper, 'overview-caption')).toBe(
        "Your usual month is the middle value of the previous 12 months, worked out here from each month's totals.",
      )
      expect(has(wrapper, 'overview-retry-comparison')).toBe(false)
    })

    it('says how much of the spending has no category, with its bar (R12)', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08')

      expect(text(wrapper, 'overview-uncategorized-line')).toBe(
        `${eur('3.036,33')} of this month's ${eur('4.003,89')} spending has no category yet (75,8${NBSP}%, 48 movements).`,
      )
      const bar = wrapper.get('[data-test="overview-uncategorized"] [data-test="share-bar-fill"]')
      expect(bar.attributes('style')).toContain('width: 75.8%')
    })

    it('links to the statement of the same month, with no other filter (R15)', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08')

      const link = wrapper.get('[data-test="overview-statement-link"]')

      expect(link.text()).toBe('See the movements of August 2026')
      expect(link.attributes('href')).toBe('/movements?month=2026-08')
    })

    it('paints nothing below the block of the month (C6)', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08')

      const blocks = [...wrapper.get('[data-test="overview-view"]').element.children]

      expect(blocks.at(-1)?.getAttribute('data-test')).toBe('overview-statement-link')
      expect(wrapper.text()).not.toMatch(/coming soon|year/i)
    })
  })

  it('a month less than usual, compared with the only earlier month with data (R10, R11)', async () => {
    const { wrapper } = await mountView('/overview?month=2024-02')

    expect(wrapper.get('[data-test="overview-out"] [data-test="overview-verdict"]').text()).toBe(
      'Less than usual',
    )
    expect(text(wrapper, 'overview-caption')).toBe(
      'Your usual month is the only previous month with data.',
    )
  })

  it('with five earlier months with data, says it compared with five (R11)', async () => {
    const { wrapper } = await mountView('/overview?month=2026-08', (read) =>
      read.kind === 'month' && read.month >= '2026-01' && read.month <= '2026-07'
        ? json(rawPage({ income: '0.00', expense: '0.00', net: '0.00' }, 0))()
        : undefined,
    )

    expect(text(wrapper, 'overview-caption')).toBe(
      "Your usual month is the middle value of the 5 previous months with data, worked out here from each month's totals.",
    )
    expect(wrapper.findAll('[data-test="overview-usual"]')).toHaveLength(2)
  })

  it('with no earlier month, says so and puts no label on the figures (R10, R11)', async () => {
    const { wrapper } = await mountView('/overview?month=2024-01')

    expect(text(wrapper, 'overview-caption')).toBe('No earlier months to compare with.')
    expect(has(wrapper, 'overview-usual')).toBe(false)
    expect(figure(wrapper, 'overview-in')).toBe(eur('3.337,42'))
  })

  it('an incomplete month shows its figures, a dash for the rate and no comparison (R8)', async () => {
    const { api, wrapper } = await mountView('/overview?month=2026-09')

    expect(text(wrapper, 'overview-sentence')).toBe(
      `September 2026 is incomplete: your data ends on ${formatDate(LATEST)}. So far, ${eur('162')} came in and ${eur('967')} went out.`,
    )
    expect(figure(wrapper, 'overview-in')).toBe(eur('161,82'))
    expect(figure(wrapper, 'overview-out')).toBe(eur('966,84'))
    expect(figure(wrapper, 'overview-net')).toBe(eur('-805,02'))
    expect(figure(wrapper, 'overview-rate')).toBe('—')
    expect(text(wrapper, 'overview-rate-note')).toBe('Not shown: the month is incomplete.')
    expect(text(wrapper, 'overview-caption')).toBe('No comparison for an incomplete month.')
    expect(has(wrapper, 'overview-usual')).toBe(false)
    expect(has(wrapper, 'overview-uncategorized-line')).toBe(true)
    expect(api.months()).toEqual(['2026-09'])
  })

  it('a complete month with no income has a dash for the rate, and says why (R7)', async () => {
    const { wrapper } = await mountView('/overview?month=2026-08', (read) =>
      isMonth(read, '2026-08')
        ? json(rawPage({ income: '0.00', expense: '966.84', net: '-966.84' }, 5))()
        : undefined,
    )

    expect(figure(wrapper, 'overview-rate')).toBe('—')
    expect(text(wrapper, 'overview-rate-note')).toBe(
      'No income this month, so there is no savings rate.',
    )
    expect(text(wrapper, 'overview-sentence')).toBe(
      `In August 2026, nothing came in and ${eur('967')} went out.`,
    )
  })

  it('an empty month is only its sentence (R9)', async () => {
    const { api, wrapper } = await mountView('/overview?month=2026-10')

    expect(text(wrapper, 'overview-sentence')).toBe(
      `No movements in October 2026. Your data ends on ${formatDate(LATEST)}.`,
    )
    for (const name of [
      'overview-figures',
      'money',
      'overview-caption',
      'overview-uncategorized',
      'overview-statement-link',
      'overview-error',
    ]) {
      expect({ name, shown: has(wrapper, name) }).toEqual({ name, shown: false })
    }
    expect(api.calls).toHaveLength(2)
  })

  it('a month whose spending is zero has no uncategorized line (R12)', async () => {
    const { wrapper } = await mountView('/overview?month=2026-08', (read) =>
      isMonth(read, '2026-08')
        ? json(rawPage({ income: '100.00', expense: '0.00', net: '100.00' }, 3))()
        : undefined,
    )

    expect(has(wrapper, 'overview-figures')).toBe(true)
    expect(has(wrapper, 'overview-uncategorized')).toBe(false)
  })

  describe('failures (R13, R14)', () => {
    it('a failed month shows our own sentence and Try again, which repeats the read', async () => {
      let isDown = true
      const { wrapper } = await mountView('/overview?month=2026-08', (read) =>
        isDown && isMonth(read, '2026-08') ? networkDown() : undefined,
      )

      expect(text(wrapper, 'overview-error-message')).toBe("Couldn't reach the server.")
      expect(has(wrapper, 'overview-sentence')).toBe(false)
      expect(has(wrapper, 'overview-figures')).toBe(false)

      isDown = false
      await wrapper.get('[data-test="overview-retry"]').trigger('click')
      await settle()

      expect(has(wrapper, 'overview-error')).toBe(false)
      expect(figure(wrapper, 'overview-out')).toBe(eur('4.003,89'))
    })

    it('never paints the message of the backend', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08', (read) =>
        read.kind === 'latest' ? json(SERVER_ERROR_BODY, 500)() : undefined,
      )

      expect(text(wrapper, 'overview-error-message')).toBe(
        'Something went wrong loading this month.',
      )
      expect(wrapper.text()).not.toContain(SERVER_ERROR_BODY.message)
      expect(wrapper.get('[data-test="overview-retry"]').text()).toBe('Try again')
    })

    it('a failed previous month keeps the month and says there is no comparison', async () => {
      let isDown = true
      const { api, wrapper } = await mountView('/overview?month=2026-08', (read) =>
        isDown && isMonth(read, '2025-11') ? networkDown() : undefined,
      )

      expect(text(wrapper, 'overview-sentence')).toContain('In August 2026')
      expect(figure(wrapper, 'overview-in')).toBe(eur('2.590,26'))
      expect(text(wrapper, 'overview-caption')).toBe(
        "Couldn't load the previous months, so there is no comparison.",
      )
      expect(has(wrapper, 'overview-usual')).toBe(false)
      expect(has(wrapper, 'overview-uncategorized-line')).toBe(true)
      expect(has(wrapper, 'overview-error')).toBe(false)

      isDown = false
      const before = api.calls.length
      await wrapper.get('[data-test="overview-retry-comparison"]').trigger('click')
      await settle()

      expect(api.calls.slice(before).map((call) => call.read.month)).toEqual(['2025-11'])
      expect(wrapper.findAll('[data-test="overview-usual"]')).toHaveLength(2)
    })

    it('a failed uncategorized read says so in its place, and the rest stays', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08', (read) =>
        read.kind === 'uncategorized' ? networkDown() : undefined,
      )

      expect(text(wrapper, 'overview-uncategorized-error')).toBe(
        "Couldn't check how much of this spending has a category.",
      )
      expect(has(wrapper, 'overview-uncategorized-line')).toBe(false)
      expect(wrapper.findAll('[data-test="overview-usual"]')).toHaveLength(2)
    })
  })

  describe('the month lives in the URL (R2, R3)', () => {
    it.each(['/overview', '/overview?month=2026-13', '/overview?month=nope'])(
      'opens %s on the current month with no error',
      async (url) => {
        const { api, wrapper } = await mountView(url)

        expect(text(wrapper, 'statement-month-label')).toBe(formatMonthLabel(currentMonth()))
        expect(api.months()[0]).toBe(currentMonth())
        expect(has(wrapper, 'overview-error')).toBe(false)
      },
    )

    it('an arrow pushes the new month, and back returns to the one before', async () => {
      const { router, wrapper } = await mountView('/overview?month=2026-09')
      const push = vi.spyOn(router, 'push')
      const replace = vi.spyOn(router, 'replace')

      await wrapper.get('[data-test="statement-prev"]').trigger('click')
      await settle()

      expect(push).toHaveBeenCalledExactlyOnceWith({ query: { month: '2026-08' } })
      expect(replace).not.toHaveBeenCalled()
      expect(router.currentRoute.value.fullPath).toBe('/overview?month=2026-08')
      expect(figure(wrapper, 'overview-out')).toBe(eur('4.003,89'))

      router.back()
      await settle()

      expect(router.currentRoute.value.query.month).toBe('2026-09')
      expect(text(wrapper, 'statement-month-label')).toBe('September 2026')
      expect(figure(wrapper, 'overview-out')).toBe(eur('966,84'))
    })

    it('the month picker jumps to any month through the URL too', async () => {
      const { router, wrapper } = await mountView('/overview?month=2026-08')

      await wrapper.get('[data-test="statement-month-input"] input').setValue('2026-01')
      await settle()

      expect(router.currentRoute.value.query.month).toBe('2026-01')
      expect(text(wrapper, 'overview-sentence')).toContain('In January 2026')
      expect(text(wrapper, 'overview-sentence')).toContain(`you saved ${eur('1.222')}`)
    })

    it('leaving for another screen asks for nothing more', async () => {
      const { api, router } = await mountView('/overview?month=2026-08')
      const before = api.calls.length

      await router.push('/movements?month=2026-07')
      await settle()

      expect(api.calls).toHaveLength(before)
    })
  })

  it('entering the screen again reads again: what was read is worth one visit (C3)', async () => {
    const pinia = createPinia()
    const first = await mountView('/overview?month=2026-08', undefined, pinia)
    expect(first.api.calls).toHaveLength(15)
    first.wrapper.unmount()
    vi.restoreAllMocks()

    const second = await mountView('/overview?month=2026-08', undefined, pinia)

    expect(second.api.calls).toHaveLength(15)
  })

  it('a whole visit only ever sends GET to /api/movements (C1)', async () => {
    const { api, wrapper } = await mountView('/overview?month=2026-08')

    await wrapper.get('[data-test="statement-prev"]').trigger('click')
    await settle()
    await wrapper.get('[data-test="statement-next"]').trigger('click')
    await settle()

    expect(api.methods()).toEqual(['GET'])
    expect(api.paths()).toEqual(['/api/movements'])
    expect(wrapper.text()).toContain(formatMoney(figuresOf('2026-08').totals.income))
  })
})
