import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import { formatDate, formatMoney } from '@/shared/money'

import PreviousMonthRow from '../components/PreviousMonthRow.vue'
import PreviousMonths from '../components/PreviousMonths.vue'
import {
  buildMonthRows,
  dataEndsLine,
  leftOutLine,
  notShownLine,
  periodSentence,
  shownMonths,
} from '../previousMonths'
import type { LoadState, MonthFigures, MonthRow } from '../types'
import { LATEST, PERIOD, fabricated, figuresOf } from './fixtures'

// es-ES puts a no-break space (U+00A0) before `€`: generated, never typed.
const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

const MONTHS = shownMonths(LATEST)

/** The 24 rows as the store builds them, with `changed` replacing the fixture's months. */
function rowsOf(shown: string, ...changed: MonthFigures[]): MonthRow[] {
  const figuresByMonth = {
    ...Object.fromEntries(MONTHS.map((month) => [month, figuresOf(month)])),
    ...Object.fromEntries(changed.map((figures) => [figures.month, figures])),
  }
  const rows = buildMonthRows(MONTHS, figuresByMonth, LATEST, shown)
  if (rows === null) throw new Error('the fixture has every one of the 24 months')
  return rows
}

interface Props {
  rows: MonthRow[] | null
  load: LoadState
  sentence: string | null
  periodLoad: LoadState
  leftOut: string | null
  notShown: string | null
  dataEnds: string | null
}

/** What the screen hands over with August 2026 above and everything read. */
const READY: Props = {
  rows: rowsOf('2026-08'),
  load: 'ready',
  sentence: periodSentence(PERIOD, '2024-10'),
  periodLoad: 'ready',
  leftOut: leftOutLine(LATEST),
  notShown: notShownLine('2026-08', MONTHS),
  dataEnds: dataEndsLine(LATEST),
}

async function mountBlock(props: Partial<Props> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/overview', name: 'overview', component: { render: () => null } }],
  })
  await router.push('/overview?month=2026-08')
  await router.isReady()

  const wrapper = mount(PreviousMonths, {
    props: { ...READY, ...props },
    global: { plugins: [router] },
  })
  return { router, wrapper }
}

type Block = Awaited<ReturnType<typeof mountBlock>>['wrapper']
/** What `get` hands over: an element that is known to be there. */
type Found = Omit<DOMWrapper<Element>, 'exists'>

const has = (wrapper: Block, name: string): boolean =>
  wrapper.find(`[data-test="${name}"]`).exists()
const text = (wrapper: Block, name: string): string => wrapper.get(`[data-test="${name}"]`).text()
const rowOf = (wrapper: Block, month: string): Found =>
  wrapper.get(`[data-test="previous-months-row"][data-month="${month}"]`)
const cell = (row: Found, name: string): Found => row.get(`[data-test="previous-months-${name}"]`)
const amounts = (row: Found): string[] => ['in', 'out', 'net'].map((name) => cell(row, name).text())
const barWidth = (row: Found, name: string): string =>
  cell(row, name).get<HTMLElement>('[data-test="share-bar-fill"]').element.style.width
const monthsWhere = (wrapper: Block, selector: string): (string | undefined)[] =>
  wrapper
    .findAll(`[data-test="previous-months-row"]`)
    .filter((row) => row.find(selector).exists())
    .map((row) => row.attributes('data-month'))

/** The nine complete months of the fixture whose `net` is under zero, newest first. */
const SPENT_MORE = [
  '2026-08',
  '2026-07',
  '2026-04',
  '2025-10',
  '2025-08',
  '2025-07',
  '2025-05',
  '2025-04',
  '2025-03',
]

describe('PreviousMonths', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // jsdom's origin is the backend's: nothing these components do may leave for real.
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('the block only paints'))
  })

  afterEach(() => {
    const sent = fetchSpy.mock.calls.length
    vi.restoreAllMocks()
    // Thrown, not asserted: it fails whichever test let a request out.
    if (sent > 0) throw new Error(`${sent} request(s) left a component that only paints`)
  })

  describe('the block and its rows (R1, R2, R3)', () => {
    it('is a card titled Month by month with one row per month, newest first', async () => {
      const { wrapper } = await mountBlock()

      expect(wrapper.get('h2').text()).toBe('Month by month')
      expect(
        wrapper
          .findAll('[data-test="previous-months-row"]')
          .map((row) => row.attributes('data-month')),
      ).toEqual(MONTHS)
      expect(MONTHS).toHaveLength(24)
      expect(MONTHS[0]).toBe('2026-09')
      expect(MONTHS.at(-1)).toBe('2024-10')
    })

    it('heads the columns Month, the bars with no text, Money in, Money out and Savings', async () => {
      const { wrapper } = await mountBlock()

      expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
        'Month',
        '',
        'Money in',
        'Money out',
        'Savings',
      ])
    })

    it('names each month as the rest of the app does', async () => {
      const { wrapper } = await mountBlock()

      expect(cell(rowOf(wrapper, '2026-08'), 'link').text()).toBe('August 2026')
      expect(cell(rowOf(wrapper, '2025-01'), 'link').text()).toBe('January 2025')
    })

    it('formats the backend strings letter by letter, with their cents (R2)', async () => {
      const { wrapper } = await mountBlock()

      expect(amounts(rowOf(wrapper, '2026-08'))).toEqual([
        eur('2.590,26'),
        eur('4.003,89'),
        eur('-1.413,63'),
      ])
      for (const row of READY.rows ?? []) {
        if (row.totals === null) continue
        expect(amounts(rowOf(wrapper, row.month))).toEqual([
          formatMoney(row.totals.income),
          formatMoney(row.totals.expense),
          formatMoney(row.totals.net),
        ])
      }
    })

    it('does not recompute the savings: a net that does not add up is painted as it came', async () => {
      const { wrapper } = await mountBlock({
        rows: rowsOf('2026-08', fabricated('2026-02', '2050.19', '1874.57', '940.02')),
      })

      expect(amounts(rowOf(wrapper, '2026-02'))).toEqual([
        eur('2.050,19'),
        eur('1.874,57'),
        eur('940,02'),
      ])
    })

    it('draws the two bars of a complete month against the highest figure of them all (R3)', async () => {
      const { wrapper } = await mountBlock()

      expect(barWidth(rowOf(wrapper, '2026-08'), 'bar-in')).toBe('22.5%')
      expect(barWidth(rowOf(wrapper, '2026-08'), 'bar-out')).toBe('34.7%')
      expect(barWidth(rowOf(wrapper, '2026-01'), 'bar-in')).toBe('27%')
      expect(barWidth(rowOf(wrapper, '2026-01'), 'bar-out')).toBe('16.4%')
      // July 2025 holds that highest figure: what went out fills the whole bar.
      expect(barWidth(rowOf(wrapper, '2025-07'), 'bar-out')).toBe('100%')
    })

    it('paints every amount in the mono face with tabular figures (C8)', async () => {
      const { wrapper } = await mountBlock()

      for (const name of ['in', 'out', 'net']) {
        const classes = cell(rowOf(wrapper, '2026-08'), name).classes()
        expect(classes).toContain('font-mono')
        expect(classes).toContain('tabular-nums')
      }
    })
  })

  describe('the sign of the savings (R4)', () => {
    it('marks the months that spent more than came in', async () => {
      const { wrapper } = await mountBlock()

      expect(monthsWhere(wrapper, '[data-net="negative"]')).toEqual(SPENT_MORE)
      for (const month of SPENT_MORE) {
        const net = cell(rowOf(wrapper, month), 'net')
        expect(net.attributes('data-net')).toBe('negative')
        expect(net.text().startsWith('-')).toBe(true)
        expect(net.classes()).toContain('text-negative')
      }

      const january = cell(rowOf(wrapper, '2026-01'), 'net')
      expect(january.attributes('data-net')).toBe('positive')
      expect(january.text()).toBe(eur('1.221,57'))
      expect(january.classes()).toContain('text-positive')
      expect(january.classes()).not.toContain('text-negative')
    })

    it('marks the other nine complete months of the fixture as positive, and none as zero', async () => {
      const { wrapper } = await mountBlock()

      expect(monthsWhere(wrapper, '[data-net="positive"]')).toHaveLength(9)
      expect(monthsWhere(wrapper, '[data-net="zero"]')).toEqual([])
    })
  })

  describe('the month shown above (R5, R6)', () => {
    it('marks the row of the month shown above, and only that one', async () => {
      const { wrapper } = await mountBlock()

      expect(monthsWhere(wrapper, '[data-test="previous-months-shown"]')).toEqual(['2026-08'])
      expect(
        wrapper
          .findAll('[data-test="previous-months-row"][aria-current]')
          .map((row) => [row.attributes('data-month'), row.attributes('aria-current')]),
      ).toEqual([['2026-08', 'true']])
      expect(cell(rowOf(wrapper, '2026-08'), 'shown').text()).toBe('Shown above')
      expect(wrapper.findAll('.border-line-brand')).toHaveLength(1)
      expect(rowOf(wrapper, '2026-08').find('.border-line-brand').exists()).toBe(true)
      expect(has(wrapper, 'previous-months-not-shown')).toBe(false)
    })

    it('moves the mark with the month shown above, and the rows stay where they were', async () => {
      const { wrapper } = await mountBlock({ rows: rowsOf('2026-01') })

      expect(monthsWhere(wrapper, '[data-test="previous-months-shown"]')).toEqual(['2026-01'])
      expect(
        wrapper
          .findAll('[data-test="previous-months-row"]')
          .map((row) => row.attributes('data-month')),
      ).toEqual(MONTHS)
    })

    it('marks no row and says so when the month shown above is none of the 24 (R6)', async () => {
      const { wrapper } = await mountBlock({
        rows: rowsOf('2026-10'),
        notShown: notShownLine('2026-10', MONTHS),
      })

      expect(text(wrapper, 'previous-months-not-shown')).toBe(
        'October 2026 is not one of these months.',
      )
      expect(has(wrapper, 'previous-months-shown')).toBe(false)
      expect(wrapper.findAll('[aria-current]')).toHaveLength(0)
      expect(wrapper.findAll('.border-line-brand')).toHaveLength(0)
      // Above the rows, not among them nor after them.
      const note = wrapper.get('[data-test="previous-months-not-shown"]').element
      const table = wrapper.get('table').element
      expect(note.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  describe('months that are not an ordinary month (R9, R10)', () => {
    it('marks an incomplete month as incomplete, with no bars', async () => {
      const { wrapper } = await mountBlock()
      const september = rowOf(wrapper, '2026-09')

      expect(cell(september, 'incomplete').text()).toBe('Incomplete')
      expect(amounts(september)).toEqual([eur('161,82'), eur('966,84'), eur('-805,02')])
      expect(cell(september, 'data-ends').text()).toBe(`Data ends on ${formatDate(LATEST)}`)
      expect(september.find('[data-test="previous-months-bar-in"]').exists()).toBe(false)
      expect(september.find('[data-test="previous-months-bar-out"]').exists()).toBe(false)
      expect(september.find('[data-test="share-bar-fill"]').exists()).toBe(false)
      expect(september.find('[data-net]').exists()).toBe(false)
      expect(cell(september, 'net').classes()).not.toContain('text-negative')
      // Only that month: the other 23 end before the data does.
      expect(monthsWhere(wrapper, '[data-test="previous-months-incomplete"]')).toEqual(['2026-09'])
    })

    it('shows a month with no movements as empty, not as a zero', async () => {
      const { wrapper } = await mountBlock({
        rows: rowsOf('2026-08', fabricated('2025-02', '0.00', '0.00', '0.00', 2)),
      })

      for (const month of ['2025-01', '2024-12', '2024-11', '2024-10']) {
        const empty = rowOf(wrapper, month)
        expect(cell(empty, 'empty').text()).toBe('No movements')
        expect(empty.find('[data-test="previous-months-in"]').exists()).toBe(false)
        expect(empty.find('[data-test="previous-months-out"]').exists()).toBe(false)
        expect(empty.find('[data-test="previous-months-net"]').exists()).toBe(false)
        expect(empty.find('[data-test="share-bar-fill"]').exists()).toBe(false)
        expect(empty.text()).not.toContain('€')
      }
      expect(cell(rowOf(wrapper, '2024-10'), 'link').text()).toBe('October 2024')

      // A month whose movements add up to zero is a month: three amounts and two bars.
      const zero = rowOf(wrapper, '2025-02')
      expect(zero.find('[data-test="previous-months-empty"]').exists()).toBe(false)
      expect(amounts(zero)).toEqual([eur('0,00'), eur('0,00'), eur('0,00')])
      expect(barWidth(zero, 'bar-in')).toBe('0%')
      expect(barWidth(zero, 'bar-out')).toBe('0%')
      expect(cell(zero, 'net').attributes('data-net')).toBe('zero')
      expect(cell(zero, 'net').classes()).toContain('text-ink-strong')
    })
  })

  describe('what was saved (R11, R12, R14)', () => {
    it('says it first, under the title and before the rows, with the note of the month left out', async () => {
      const { wrapper } = await mountBlock()

      expect(text(wrapper, 'previous-months-sentence')).toBe(
        `From October 2024 to August 2026, ${eur('60.136')} came in and ${eur('80.935')} went out: you spent ${eur('20.799')} more than came in.`,
      )
      expect(text(wrapper, 'previous-months-left-out')).toBe(
        'September 2026 is left out: it is incomplete.',
      )

      const order = [
        ...wrapper.element.querySelectorAll(
          'h2, [data-test="previous-months-sentence"], [data-test="previous-months-left-out"], table',
        ),
      ].map((element) => element.getAttribute('data-test') ?? element.tagName)
      expect(order).toEqual(['H2', 'previous-months-sentence', 'previous-months-left-out', 'TABLE'])
    })

    it('has no note of a month left out when the newest month is complete', async () => {
      const { wrapper } = await mountBlock({ leftOut: leftOutLine('2026-09-30') })

      expect(has(wrapper, 'previous-months-left-out')).toBe(false)
    })

    it('keeps the rows and says the sum failed, adding nothing up itself (R14)', async () => {
      const { wrapper } = await mountBlock({ sentence: null, periodLoad: 'error' })

      expect(text(wrapper, 'previous-months-period-error')).toBe("Couldn't add up these months.")
      expect(has(wrapper, 'previous-months-sentence')).toBe(false)
      expect(wrapper.findAll('[data-test="previous-months-row"]')).toHaveLength(24)
      expect(has(wrapper, 'previous-months-error')).toBe(false)
      // None of the three sums of the period is on screen, in any of its two formats.
      for (const figure of ['60.136', '80.935', '20.799', '60.135,60', '80.934,73', '20.799,13']) {
        expect(wrapper.text()).not.toContain(figure)
      }
    })

    it('paints the rows with no sentence while the sum is still on its way', async () => {
      const { wrapper } = await mountBlock({ sentence: null, periodLoad: 'loading' })

      expect(has(wrapper, 'previous-months-sentence')).toBe(false)
      expect(has(wrapper, 'previous-months-period-error')).toBe(false)
      expect(wrapper.findAll('[data-test="previous-months-row"]')).toHaveLength(24)
    })
  })

  describe('loading and failing (R13)', () => {
    it('says it is loading, with no row and no sentence', async () => {
      const { wrapper } = await mountBlock({ rows: null, load: 'loading', sentence: null })

      expect(text(wrapper, 'previous-months-loading')).toBe('Loading month by month…')
      expect(wrapper.get('h2').text()).toBe('Month by month')
      expect(wrapper.find('table').exists()).toBe(false)
      expect(has(wrapper, 'previous-months-row')).toBe(false)
    })

    it('paints no row by halves when a month failed: the message and Try again, which asks again', async () => {
      // Even handed rows and a sentence, a failed read paints neither.
      const { wrapper } = await mountBlock({ load: 'error' })

      expect(text(wrapper, 'previous-months-error')).toBe("Couldn't load these months.")
      expect(text(wrapper, 'previous-months-retry')).toBe('Try again')
      expect(has(wrapper, 'previous-months-row')).toBe(false)
      expect(has(wrapper, 'previous-months-sentence')).toBe(false)
      expect(has(wrapper, 'previous-months-left-out')).toBe(false)
      expect(wrapper.find('table').exists()).toBe(false)

      await wrapper.get('[data-test="previous-months-retry"]').trigger('click')

      expect(wrapper.emitted('retry')).toHaveLength(1)
    })

    it('paints nothing before the first read, nor when the base has no movements (R1)', async () => {
      const idle = await mountBlock({ rows: null, load: 'idle', sentence: null })
      const noData = await mountBlock({
        rows: [],
        load: 'ready',
        sentence: null,
        periodLoad: 'idle',
        leftOut: null,
        notShown: null,
        dataEnds: null,
      })

      expect(has(idle.wrapper, 'previous-months')).toBe(false)
      expect(has(noData.wrapper, 'previous-months')).toBe(false)
    })
  })

  describe('pressing the name of a month (R7)', () => {
    it('links every row to its own month in the URL', async () => {
      const { wrapper } = await mountBlock()

      expect(
        wrapper
          .findAll('[data-test="previous-months-link"]')
          .map((link) => link.attributes('href')),
      ).toEqual(MONTHS.map((month) => `/overview?month=${month}`))
    })

    it('pushes that month to the URL and tells the screen which one was pressed', async () => {
      const { router, wrapper } = await mountBlock()
      const push = vi.spyOn(router, 'push')
      const replace = vi.spyOn(router, 'replace')

      await cell(rowOf(wrapper, '2026-01'), 'link').trigger('click')
      await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({ month: '2026-01' }))

      expect(push).toHaveBeenCalledTimes(1)
      expect(replace).not.toHaveBeenCalled()
      expect(wrapper.emitted('select')).toEqual([['2026-01']])
    })

    it('a press that opens another tab neither moves this page nor tells the screen', async () => {
      const { router, wrapper } = await mountBlock()
      const push = vi.spyOn(router, 'push')
      // jsdom would try to follow the link itself; this runs after the row has decided.
      wrapper.element.addEventListener('click', (event: Event) => event.preventDefault())

      await cell(rowOf(wrapper, '2026-01'), 'link').trigger('click', { ctrlKey: true })

      expect(push).not.toHaveBeenCalled()
      expect(wrapper.emitted('select')).toBeUndefined()
      expect(router.currentRoute.value.query).toEqual({ month: '2026-08' })
    })

    it('marks no link as the current page: the 24 only differ in the query', async () => {
      const { wrapper } = await mountBlock()

      expect(wrapper.findAll('a[aria-current]')).toHaveLength(0)
    })

    it('a single row tells which month was pressed', async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/overview', component: { render: () => null } }],
      })
      await router.push('/overview')
      await router.isReady()
      const row = READY.rows?.find((candidate) => candidate.month === '2025-12')
      if (!row) throw new Error('December 2025 is one of the 24 months')
      // A row is a <tr>: it needs its table around it to be parsed as one.
      const wrapper = mount(
        {
          components: { PreviousMonthRow },
          props: ['row'],
          emits: ['select'],
          template:
            '<table><tbody><PreviousMonthRow :row="row" :data-ends="null" @select="$emit(\'select\', $event)" /></tbody></table>',
        },
        { props: { row }, global: { plugins: [router] } },
      )

      await wrapper.get('[data-test="previous-months-link"]').trigger('click')

      expect(wrapper.emitted('select')).toEqual([['2025-12']])
    })
  })

  describe('its own names (C7)', () => {
    const MONTH_PART = [
      'money',
      'overview-figures',
      'overview-caption',
      'overview-statement-link',
      'overview-sentence',
    ]

    it.each<[string, Partial<Props>]>([
      ['with the rows', {}],
      ['with the month shown above out of the 24', { notShown: notShownLine('2026-10', MONTHS) }],
      ['with the sum failed', { sentence: null, periodLoad: 'error' }],
      ['loading', { rows: null, load: 'loading' }],
      ['failed', { load: 'error' }],
    ])('uses no data-test of the part of the month, %s', async (_case, props) => {
      const { wrapper } = await mountBlock(props)

      const names = [
        ...new Set(wrapper.findAll('[data-test]').map((node) => node.attributes('data-test'))),
      ]

      expect(names.length).toBeGreaterThan(0)
      for (const name of names) {
        expect(MONTH_PART).not.toContain(name)
        expect(name?.startsWith('overview')).toBe(false)
        // The fill of the shared bar is the only name that is not this block's own.
        expect(name === 'share-bar-fill' || name?.startsWith('previous-months')).toBe(true)
      }
    })
  })
})
