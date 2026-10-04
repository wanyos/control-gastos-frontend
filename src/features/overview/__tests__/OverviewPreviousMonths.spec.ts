import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { formatDate, formatMoney } from '@/shared/money'

import OverviewView from '../views/OverviewView.vue'
import { shownMonths } from '../previousMonths'
import { LATEST, figuresOf, json, mockBackend, networkDown, rawPage } from './fixtures'
import type { Read } from './fixtures'

// The months below the month (feature 26) inside the screen: `OverviewView` mounted with
// a real router and a real store, and only the HTTP boundary mocked. `mockBackend`
// rejects anything that is not a GET to /api/movements, so nothing leaves for real.

type Override = Parameters<typeof mockBackend>[0]

// es-ES puts a no-break space (U+00A0) before `€` and `%`: generated, never typed.
const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

/** The 24 months of the fixture, newest first: September 2026 down to October 2024. */
const MONTHS = shownMonths(LATEST)

const PERIOD_SENTENCE = `From October 2024 to August 2026, ${eur('60.136')} came in and ${eur('80.935')} went out: you spent ${eur('20.799')} more than came in.`
const AUGUST_SENTENCE = `In August 2026, ${eur('2.590')} came in and ${eur('4.004')} went out: you spent ${eur('1.414')} more than came in.`
const JANUARY_SENTENCE = `In January 2026, ${eur('3.114')} came in and ${eur('1.893')} went out: you saved ${eur('1.222')}, 39,2${NBSP}% of what came in.`

/** The latest date, the months and their sum, then what hangs off the month above. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await flushPromises()
}

async function mountView(url: string, override?: Override, latest: string | null = LATEST) {
  const api = mockBackend(override, latest)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/overview', name: 'overview', component: OverviewView },
      { path: '/movements', name: 'movements', component: { render: () => null } },
    ],
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(OverviewView, { global: { plugins: [router, createPinia()] } })
  await settle()

  return { api, router, wrapper }
}

type View = Awaited<ReturnType<typeof mountView>>['wrapper']

const text = (wrapper: View, name: string): string => wrapper.get(`[data-test="${name}"]`).text()
const has = (wrapper: View, name: string): boolean => wrapper.find(`[data-test="${name}"]`).exists()
const card = (wrapper: View, name: string): string =>
  wrapper.get(`[data-test="${name}"] [data-test="money"]`).text()

const rowSelector = (month: string): string =>
  `[data-test="previous-months-row"][data-month="${month}"]`
const rowMonths = (wrapper: View): (string | undefined)[] =>
  wrapper.findAll('[data-test="previous-months-row"]').map((row) => row.attributes('data-month'))
const markedMonths = (wrapper: View): (string | undefined)[] =>
  wrapper
    .findAll('[data-test="previous-months-row"][aria-current="true"]')
    .map((row) => row.attributes('data-month'))
/** What came in, what went out and the savings of a row, as painted. */
const rowAmounts = (wrapper: View, month: string): string[] =>
  ['in', 'out', 'net'].map((name) =>
    wrapper.get(`${rowSelector(month)} [data-test="previous-months-${name}"]`).text(),
  )
/** The same three figures in the cards of the month above. */
const cardAmounts = (wrapper: View): string[] =>
  ['overview-in', 'overview-out', 'overview-net'].map((name) => card(wrapper, name))

const isMonth = (read: Read, month: string): boolean =>
  read.kind === 'month' && read.month === month

async function pressMonth(wrapper: View, month: string): Promise<void> {
  await wrapper.get(`${rowSelector(month)} [data-test="previous-months-link"]`).trigger('click')
  await settle()
}

describe('OverviewView: the months below the month', () => {
  let scrollIntoView = vi.fn<Element['scrollIntoView']>()

  beforeEach(() => {
    // jsdom does not implement it: the screen calls it only if it is there.
    scrollIntoView = vi.fn<Element['scrollIntoView']>()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    vi.restoreAllMocks()
  })

  it('shows the 24 months below the month, each with what came in and what went out', async () => {
    const { wrapper } = await mountView('/overview?month=2026-08')

    const blocks = [...wrapper.get('[data-test="overview-view"]').element.children]
    expect(blocks.at(-1)?.getAttribute('data-test')).toBe('previous-months')
    expect(wrapper.get('[data-test="previous-months"] h2').text()).toBe('Month by month')

    expect(rowMonths(wrapper)).toHaveLength(24)
    expect(rowMonths(wrapper)).toEqual(MONTHS)
    expect(rowMonths(wrapper).at(0)).toBe('2026-09')
    expect(rowMonths(wrapper).at(-1)).toBe('2024-10')

    expect(rowAmounts(wrapper, '2026-08')).toEqual([
      eur('2.590,26'),
      eur('4.003,89'),
      eur('-1.413,63'),
    ])
    // Every month with movements carries the two figures of the backend, to the cent.
    for (const month of MONTHS.filter((key) => figuresOf(key).movementCount > 0)) {
      const { income, expense } = figuresOf(month).totals
      expect({ month, amounts: rowAmounts(wrapper, month).slice(0, 2) }).toEqual({
        month,
        amounts: [formatMoney(income), formatMoney(expense)],
      })
    }
    expect(wrapper.findAll('[data-test="previous-months-empty"]')).toHaveLength(5)
  })

  describe('the month shown above (R5, R6)', () => {
    it('marks the month shown above, and only that one', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08')

      expect(markedMonths(wrapper)).toEqual(['2026-08'])
      expect(wrapper.findAll('[data-test="previous-months-shown"]')).toHaveLength(1)
      expect(
        wrapper.get(`${rowSelector('2026-08')} [data-test="previous-months-shown"]`).text(),
      ).toBe('Shown above')
      expect(has(wrapper, 'previous-months-not-shown')).toBe(false)
    })

    it.each([
      ['2026-10', 'October 2026 is not one of these months.'],
      ['2024-03', 'March 2024 is not one of these months.'],
    ])('marks no row with %s above, and says so', async (month, line) => {
      const { wrapper } = await mountView(`/overview?month=${month}`)

      expect(rowMonths(wrapper)).toEqual(MONTHS)
      expect(markedMonths(wrapper)).toEqual([])
      expect(has(wrapper, 'previous-months-shown')).toBe(false)
      expect(text(wrapper, 'previous-months-not-shown')).toBe(line)
    })
  })

  describe('pressing the name of a month (R7, R8)', () => {
    it('pressing another month puts it above, through the URL', async () => {
      const { router, wrapper } = await mountView('/overview?month=2026-08')
      const push = vi.spyOn(router, 'push')
      const replace = vi.spyOn(router, 'replace')
      expect(text(wrapper, 'overview-sentence')).toBe(AUGUST_SENTENCE)

      await pressMonth(wrapper, '2026-01')

      expect(push).toHaveBeenCalledExactlyOnceWith({ query: { month: '2026-01' } })
      expect(replace).not.toHaveBeenCalled()
      expect(router.currentRoute.value.fullPath).toBe('/overview?month=2026-01')
      expect(text(wrapper, 'overview-sentence')).toBe(JANUARY_SENTENCE)
      expect(text(wrapper, 'statement-month-label')).toBe('January 2026')
      expect(markedMonths(wrapper)).toEqual(['2026-01'])
      // The rows do not move: only the mark does.
      expect(rowMonths(wrapper)).toEqual(MONTHS)
      // The page goes up to the month nav, so that what changed is in view.
      expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start' })
      expect(scrollIntoView.mock.contexts[0]).toBe(
        wrapper.get('[data-test="statement-nav"]').element,
      )

      router.back()
      await settle()

      expect(router.currentRoute.value.fullPath).toBe('/overview?month=2026-08')
      expect(text(wrapper, 'overview-sentence')).toBe(AUGUST_SENTENCE)
      expect(markedMonths(wrapper)).toEqual(['2026-08'])
    })

    it('still changes the month where the browser cannot scroll', async () => {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
      const { router, wrapper } = await mountView('/overview?month=2026-08')

      await pressMonth(wrapper, '2026-01')

      expect(router.currentRoute.value.fullPath).toBe('/overview?month=2026-01')
      expect(markedMonths(wrapper)).toEqual(['2026-01'])
    })

    it('a month already read costs one request: its spending with no category', async () => {
      const { api, wrapper } = await mountView('/overview?month=2026-08')
      const before = api.calls.length

      await pressMonth(wrapper, '2026-01')

      expect(api.calls.slice(before).map((call) => call.read.kind)).toEqual(['uncategorized'])
    })
  })

  it('a row shows the same figures as the month does when it is above', async () => {
    const { router, wrapper } = await mountView('/overview?month=2026-08')
    const august = rowAmounts(wrapper, '2026-08')
    const january = rowAmounts(wrapper, '2026-01')

    expect(august).toEqual([eur('2.590,26'), eur('4.003,89'), eur('-1.413,63')])
    expect(january).toEqual([eur('3.114,10'), eur('1.892,53'), eur('1.221,57')])
    expect(cardAmounts(wrapper)).toEqual(august)

    await router.push('/overview?month=2026-01')
    await settle()

    expect(cardAmounts(wrapper)).toEqual(january)
    // And the rows say the same with another month above.
    expect(rowAmounts(wrapper, '2026-08')).toEqual(august)
    expect(rowAmounts(wrapper, '2026-01')).toEqual(january)
  })

  describe('what was saved (R11, R12)', () => {
    it('says what was saved over the complete months, with the totals of the backend', async () => {
      const { api, wrapper } = await mountView('/overview?month=2026-08')

      expect(text(wrapper, 'previous-months-sentence')).toBe(PERIOD_SENTENCE)
      expect(text(wrapper, 'previous-months-left-out')).toBe(
        'September 2026 is left out: it is incomplete.',
      )

      // The sentence first: under the title and before any row.
      const order = [
        ...wrapper
          .get('[data-test="previous-months"]')
          .element.querySelectorAll(
            'h2, [data-test="previous-months-sentence"], [data-test="previous-months-left-out"], [data-test="previous-months-row"]',
          ),
      ].map((element) => element.getAttribute('data-test') ?? element.tagName)
      expect(order.slice(0, 4)).toEqual([
        'H2',
        'previous-months-sentence',
        'previous-months-left-out',
        'previous-months-row',
      ])

      // One request for the whole run of complete months: the backend adds it up.
      const periods = api.calls.filter((call) => call.read.kind === 'period')
      expect(periods.map((call) => call.search)).toEqual([
        'from=2024-10-01&to=2026-08-31&pageSize=1',
      ])
      expect(has(wrapper, 'previous-months-period-error')).toBe(false)
    })

    it('a failed sum keeps the rows and says so, adding nothing up here (R14)', async () => {
      const { wrapper } = await mountView('/overview?month=2026-08', (read) =>
        read.kind === 'period' ? networkDown() : undefined,
      )

      expect(text(wrapper, 'previous-months-period-error')).toBe("Couldn't add up these months.")
      expect(has(wrapper, 'previous-months-sentence')).toBe(false)
      expect(rowMonths(wrapper)).toEqual(MONTHS)
      expect(text(wrapper, 'overview-sentence')).toBe(AUGUST_SENTENCE)
    })
  })

  describe('whatever happens to the month above, the months below stay', () => {
    it('with an empty month above', async () => {
      const { wrapper } = await mountView('/overview?month=2026-10')

      expect(text(wrapper, 'overview-sentence')).toBe(
        `No movements in October 2026. Your data ends on ${formatDate(LATEST)}.`,
      )
      expect(has(wrapper, 'overview-figures')).toBe(false)
      expect(rowMonths(wrapper)).toEqual(MONTHS)
      expect(text(wrapper, 'previous-months-sentence')).toBe(PERIOD_SENTENCE)
    })

    it('with the month above failed', async () => {
      const { wrapper } = await mountView('/overview?month=2024-03', (read) =>
        isMonth(read, '2024-03') ? networkDown() : undefined,
      )

      expect(text(wrapper, 'overview-error-message')).toBe("Couldn't reach the server.")
      expect(has(wrapper, 'overview-sentence')).toBe(false)
      expect(rowMonths(wrapper)).toEqual(MONTHS)
      expect(text(wrapper, 'previous-months-sentence')).toBe(PERIOD_SENTENCE)
      expect(has(wrapper, 'previous-months-error')).toBe(false)
    })
  })

  describe('failures of the months below (R13)', () => {
    it('one failed month paints no row, and Try again asks only for it', async () => {
      let isDown = true
      const { api, wrapper } = await mountView('/overview?month=2026-10', (read) =>
        isDown && isMonth(read, '2025-05') ? networkDown() : undefined,
      )

      expect(text(wrapper, 'previous-months-error')).toBe("Couldn't load these months.")
      expect(rowMonths(wrapper)).toEqual([])
      expect(has(wrapper, 'previous-months-sentence')).toBe(false)
      // The month above is not taken down with them.
      expect(has(wrapper, 'overview-error')).toBe(false)
      expect(text(wrapper, 'overview-sentence')).toContain('No movements in October 2026')

      isDown = false
      const before = api.calls.length
      await wrapper.get('[data-test="previous-months-retry"]').trigger('click')
      await settle()

      expect(api.calls.slice(before).map((call) => call.read.month)).toEqual(['2025-05'])
      expect(has(wrapper, 'previous-months-error')).toBe(false)
      expect(rowMonths(wrapper)).toEqual(MONTHS)
      expect(text(wrapper, 'previous-months-sentence')).toBe(PERIOD_SENTENCE)
    })

    it('a month that fails for both parts comes back with the Try again of the month', async () => {
      let isDown = true
      const { api, wrapper } = await mountView('/overview?month=2026-08', (read) =>
        isDown && isMonth(read, '2026-08') ? networkDown() : undefined,
      )

      expect(has(wrapper, 'overview-error')).toBe(true)
      expect(text(wrapper, 'previous-months-error')).toBe("Couldn't load these months.")
      expect(rowMonths(wrapper)).toEqual([])

      isDown = false
      const before = api.calls.length
      await wrapper.get('[data-test="overview-retry"]').trigger('click')
      await settle()

      expect(has(wrapper, 'overview-error')).toBe(false)
      expect(has(wrapper, 'previous-months-error')).toBe(false)
      expect(rowMonths(wrapper)).toEqual(MONTHS)
      expect(markedMonths(wrapper)).toEqual(['2026-08'])
      // August is asked for once more, not once per part.
      const again = api.calls.slice(before).filter((call) => isMonth(call.read, '2026-08'))
      expect(again).toHaveLength(1)
    })

    it('the Try again of the month leaves the months below alone when they were read', async () => {
      let isDown = true
      const { api, wrapper } = await mountView('/overview?month=2024-03', (read) =>
        isDown && isMonth(read, '2024-03') ? networkDown() : undefined,
      )
      expect(rowMonths(wrapper)).toEqual(MONTHS)

      isDown = false
      const before = api.calls.length
      await wrapper.get('[data-test="overview-retry"]').trigger('click')
      await settle()

      const after = api.calls.slice(before)
      expect(after.filter((call) => call.read.kind === 'period')).toEqual([])
      expect(after.filter((call) => MONTHS.includes(call.read.month))).toEqual([])
      expect(card(wrapper, 'overview-in')).toBe(eur('53.622,12'))
    })
  })

  it('a base with no movements shows no months below', async () => {
    const nothing = { income: '0.00', expense: '0.00', net: '0.00' }
    const { api, wrapper } = await mountView(
      '/overview?month=2026-08',
      (read) => (read.kind === 'month' ? json(rawPage(nothing, 0))() : undefined),
      null,
    )

    expect(has(wrapper, 'previous-months')).toBe(false)
    expect(api.count('period')).toBe(0)
    expect(api.months()).toEqual(['2026-08'])
  })

  it('the part of the month is letter by letter what it was (C2)', async () => {
    const { wrapper } = await mountView('/overview?month=2026-08')

    expect(text(wrapper, 'overview-sentence')).toBe(AUGUST_SENTENCE)

    expect(card(wrapper, 'overview-in')).toBe(eur('2.590,26'))
    expect(card(wrapper, 'overview-out')).toBe(eur('4.003,89'))
    expect(card(wrapper, 'overview-net')).toBe(eur('-1.413,63'))
    expect(card(wrapper, 'overview-rate')).toBe(`-54,6${NBSP}%`)
    expect(wrapper.get('[data-test="overview-in"] [data-test="overview-verdict"]').text()).toBe(
      'About usual',
    )
    expect(wrapper.get('[data-test="overview-in"] [data-test="overview-usual-text"]').text()).toBe(
      `12,2${NBSP}% below your usual month (${eur('2.950,00')})`,
    )
    expect(wrapper.get('[data-test="overview-out"] [data-test="overview-verdict"]').text()).toBe(
      'More than usual',
    )
    expect(wrapper.get('[data-test="overview-out"] [data-test="overview-usual-text"]').text()).toBe(
      `34,9${NBSP}% above your usual month (${eur('2.967,58')})`,
    )

    expect(text(wrapper, 'overview-caption')).toBe(
      "Your usual month is the middle value of the previous 12 months, worked out here from each month's totals.",
    )
    expect(text(wrapper, 'overview-uncategorized-line')).toBe(
      `${eur('3.036,33')} of this month's ${eur('4.003,89')} spending has no category yet (75,8${NBSP}%, 48 movements).`,
    )
    const link = wrapper.get('[data-test="overview-statement-link"]')
    expect(link.text()).toBe('See the movements of August 2026')
    expect(link.attributes('href')).toBe('/movements?month=2026-08')

    // In the order it had: the header, the nav, the sentence, the figures, the legend,
    // the line with no category and the link. The months below come after all of it.
    const blocks = [...wrapper.get('[data-test="overview-view"]').element.children].map(
      (element) => element.getAttribute('data-test') ?? element.tagName,
    )
    expect(blocks).toEqual([
      'HEADER',
      'statement-nav',
      'overview-sentence',
      'overview-figures',
      'overview-comparison',
      'overview-uncategorized',
      'overview-statement-link',
      'previous-months',
    ])
    // Its `money` figures are still only the four cards: the rows have names of their own.
    expect(wrapper.findAll('[data-test="money"]')).toHaveLength(4)
  })

  describe('what it costs, and that it only reads (R15, C1)', () => {
    it('entering a complete month is 27 requests, and no month is asked for twice', async () => {
      const { api } = await mountView('/overview?month=2026-08')

      expect(api.calls).toHaveLength(27)
      expect(api.count('latest')).toBe(1)
      expect(api.count('period')).toBe(1)
      expect(api.count('uncategorized')).toBe(1)
      expect(api.months()).toHaveLength(24)
      expect(new Set(api.months()).size).toBe(24)
      // The first request of the screen is still the month above.
      expect(api.calls[0]?.read).toMatchObject({ kind: 'month', month: '2026-08' })
    })

    it('a whole visit only sends GET to /api/movements', async () => {
      const { api, router, wrapper } = await mountView('/overview?month=2026-08')

      await pressMonth(wrapper, '2026-01')
      await pressMonth(wrapper, '2025-03')
      await wrapper.get('[data-test="statement-prev"]').trigger('click')
      await settle()
      router.back()
      await settle()

      expect(markedMonths(wrapper)).toEqual(['2025-03'])
      expect(api.methods()).toEqual(['GET'])
      expect(api.paths()).toEqual(['/api/movements'])
      expect(api.spy.mock.calls.every(([, init]) => init?.body === undefined)).toBe(true)
    })
  })
})
