import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { formatMoney } from '@/shared/money'

import StatementView from '../views/StatementView.vue'
import { currentMonth, formatMonthLabel, monthRange, shiftMonth } from '../months'
import {
  BIG_MONTH_PAGE_ONE,
  BIG_MONTH_PAGE_TWO,
  EMPTY_MONTH_PAGE,
  MONTH_PAGE,
  OTHER_MONTH_PAGE,
  TOTALS,
  VALIDATION_ERROR_BODY,
  deferred,
  json,
  mockApi,
  networkDown,
} from './fixtures'

type Answers = Parameters<typeof mockApi>[0]

async function mountView(url: string, answers: Answers) {
  const api = mockApi(answers)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/movements', name: 'movements', component: StatementView }],
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(StatementView, { global: { plugins: [router, createPinia()] } })
  await flushPromises()

  return { api, router, wrapper }
}

describe('StatementView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens on the current month with one request, and shows it (R1)', async () => {
    const month = currentMonth()
    const { api, wrapper } = await mountView('/movements', { movements: json(MONTH_PAGE) })
    const { from, to } = monthRange(month)

    expect(api.queries()).toEqual([`from=${from}&to=${to}&page=1&pageSize=200`])
    expect(wrapper.get('[data-test="statement-month-label"]').text()).toBe(formatMonthLabel(month))
    expect(wrapper.get('[data-test="statement-totals-in"]').text()).toBe(formatMoney(TOTALS.income))
    expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(5)
    expect(wrapper.find('[data-test="statement-totals-note"]').exists()).toBe(true)
  })

  it('opens on the month the URL carries (R3)', async () => {
    const { api, wrapper } = await mountView('/movements?month=2026-03', {
      movements: json(MONTH_PAGE),
    })

    expect(api.queries()).toEqual(['from=2026-03-01&to=2026-03-31&page=1&pageSize=200'])
    expect(wrapper.get('[data-test="statement-month-label"]').text()).toBe('March 2026')
  })

  it.each(['nope', '2026-13', '2026-03-11'])(
    'falls back to the current month with no error when the URL says %s (R4)',
    async (raw) => {
      const { wrapper } = await mountView(`/movements?month=${raw}`, {
        movements: json(MONTH_PAGE),
      })

      expect(wrapper.get('[data-test="statement-month-label"]').text()).toBe(
        formatMonthLabel(currentMonth()),
      )
      expect(wrapper.find('[data-test="statement-error"]').exists()).toBe(false)
    },
  )

  it('writes the month in the URL and loads it from there (R2, R3)', async () => {
    const { api, router, wrapper } = await mountView('/movements', {
      movements: (query) =>
        json(
          query.get('from') === monthRange(currentMonth()).from ? MONTH_PAGE : OTHER_MONTH_PAGE,
        )(),
    })
    const previous = shiftMonth(currentMonth(), -1)

    await wrapper.get('[data-test="statement-prev"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.month).toBe(previous)
    expect(api.queries().at(-1)).toBe(
      `from=${monthRange(previous).from}&to=${monthRange(previous).to}&page=1&pageSize=200`,
    )
    expect(wrapper.get('[data-test="statement-month-label"]').text()).toBe(
      formatMonthLabel(previous),
    )
    expect(wrapper.get('[data-test="statement-totals-out"]').text()).toBe(formatMoney('99.99'))
  })

  it('going back in history goes back to the month before (R3)', async () => {
    const { router, wrapper } = await mountView('/movements?month=2026-09', {
      movements: json(MONTH_PAGE),
    })
    await wrapper.get('[data-test="statement-prev"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="statement-month-label"]').text()).toBe('August 2026')

    router.back()
    await flushPromises()

    expect(wrapper.get('[data-test="statement-month-label"]').text()).toBe('September 2026')
  })

  it('shows the loading line instead of half a list (R14)', async () => {
    const slow = deferred()
    const { wrapper } = await mountView('/movements?month=2026-09', { movements: slow.answer })

    expect(wrapper.get('[data-test="statement-loading"]').text()).toBe('Loading September 2026…')
    expect(wrapper.find('[data-test="statement-row"]').exists()).toBe(false)
  })

  it('says an empty month in its own words, not as a failure (R11)', async () => {
    const { wrapper } = await mountView('/movements?month=2023-12', {
      movements: json(EMPTY_MONTH_PAGE),
    })

    expect(wrapper.get('[data-test="statement-empty"]').text()).toBe(
      'No movements in December 2023.',
    )
    expect(wrapper.find('[data-test="statement-error"]').exists()).toBe(false)
  })

  describe('a failed month (R12)', () => {
    it('tells it in English and offers to try again', async () => {
      let down = true
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: () => (down ? networkDown() : json(MONTH_PAGE)()),
      })

      expect(wrapper.get('[data-test="statement-error-message"]').text()).toBe(
        "Couldn't reach the server.",
      )
      expect(wrapper.find('[data-test="statement-empty"]').exists()).toBe(false)

      down = false
      await wrapper.get('[data-test="statement-retry"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="statement-error"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(5)
      expect(api.queries()).toHaveLength(2)
    })

    it('never paints the backend sentence, which comes in Spanish', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(VALIDATION_ERROR_BODY, 400),
      })

      expect(wrapper.get('[data-test="statement-error-message"]').text()).toBe(
        'The backend rejected that month.',
      )
      expect(wrapper.text()).not.toContain('parámetro')
    })
  })

  it('only ever reads: no request of the whole screen uses another method (C1)', async () => {
    const { api, wrapper } = await mountView('/movements?month=2026-09', {
      movements: json(MONTH_PAGE),
    })

    await wrapper.get('[data-test="statement-prev"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="statement-next"]').trigger('click')
    await flushPromises()

    expect(api.methods()).toEqual(['GET'])
    // Feature 20 added the two lists that fill the selects; all three paths are reads.
    expect([...new Set(api.calls.map((call) => call.path))].sort()).toEqual([
      '/api/accounts',
      '/api/categories',
      '/api/movements',
    ])
  })

  it('shows no figure and no balance column of its own (R9)', async () => {
    const { wrapper } = await mountView('/movements?month=2026-09', {
      movements: json(MONTH_PAGE),
    })

    expect(wrapper.text()).not.toContain('9.954,63')
    expect(wrapper.text()).not.toContain('Balance')
  })

  describe('the filters of the month (feature 20)', () => {
    it('mounts the bar between the month nav and the figures, and asks both lists', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-03', {
        movements: json(MONTH_PAGE),
      })

      expect(wrapper.find('[data-test="statement-filters"]').exists()).toBe(true)
      const html = wrapper.html()
      expect(html.indexOf('statement-nav')).toBeLessThan(html.indexOf('statement-filters'))
      expect(html.indexOf('statement-filters')).toBeLessThan(html.indexOf('statement-totals'))
      expect(api.calls.filter((call) => call.path === '/api/accounts')).toHaveLength(1)
      expect(api.calls.filter((call) => call.path === '/api/categories')).toHaveLength(1)
      // Both selects are filled with everything there is, not with the loaded month.
      expect(wrapper.get('[data-test="filter-account"]').findAll('option')).toHaveLength(3)
    })

    it('reads the filters of the URL and sends them with the month (R1, R8, R10)', async () => {
      const { api, wrapper } = await mountView(
        '/movements?month=2026-03&account=2&uncategorized=true&q=luz',
        { movements: json(MONTH_PAGE) },
      )

      expect(api.queries()).toEqual([
        'accountId=2&from=2026-03-01&to=2026-03-31&uncategorized=true&q=luz&page=1&pageSize=200',
      ])
      expect(
        (wrapper.get('[data-test="filter-uncategorized"] input').element as HTMLInputElement)
          .checked,
      ).toBe(true)
    })

    it('a URL with a category AND uncategorized never emits the forbidden request (R10)', async () => {
      const { api, wrapper } = await mountView(
        '/movements?month=2026-03&category=1&uncategorized=true',
        { movements: json(MONTH_PAGE) },
      )

      expect(api.queries()).toHaveLength(1)
      expect(api.queries()[0]).toContain('uncategorized=true')
      expect(api.queries()[0]).not.toContain('categoryId')
      expect(wrapper.find('[data-test="statement-error"]').exists()).toBe(false)
    })

    it('replaces the URL when a filter changes, without filling the history (R8)', async () => {
      const { api, router, wrapper } = await mountView('/movements?month=2026-03', {
        movements: json(MONTH_PAGE),
      })

      await wrapper.get('[data-test="filter-uncategorized"] input').setValue(true)
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ month: '2026-03', uncategorized: 'true' })
      expect(api.queries().at(-1)).toContain('uncategorized=true')
      // `replace`, not `push`: the filter left no step behind in the history.
      expect(router.options.history.state.back).toBeFalsy()

      router.back()
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ month: '2026-03', uncategorized: 'true' })
    })

    it('keeps the filters when the month changes, and pushes that (R12)', async () => {
      const { api, router, wrapper } = await mountView(
        '/movements?month=2026-03&uncategorized=true',
        { movements: json(MONTH_PAGE) },
      )

      await wrapper.get('[data-test="statement-prev"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ month: '2026-02', uncategorized: 'true' })
      expect(api.queries().at(-1)).toBe(
        'from=2026-02-01&to=2026-02-28&uncategorized=true&page=1&pageSize=200',
      )
    })

    it('shows the scope line with the count of the filter, and keeps the note (R5, R6)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-03&account=1&q=luz', {
        movements: json(MONTH_PAGE),
      })

      expect(wrapper.get('[data-test="statement-scope"]').text()).toBe(
        '5 movements match these filters in March 2026 · Account bankinter ···0236 · "luz"',
      )
      expect(wrapper.find('[data-test="statement-totals-note"]').exists()).toBe(true)
      expect(wrapper.get('[data-test="statement-totals-note"]').text()).toContain('July 2026')
    })

    it('names the chosen category in the scope line (R5)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-03&category=2', {
        movements: json(MONTH_PAGE),
      })

      expect(wrapper.get('[data-test="statement-scope"]').text()).toContain('Category Groceries')
    })

    it('has no scope line when nothing filters', async () => {
      const { wrapper } = await mountView('/movements?month=2026-03', {
        movements: json(MONTH_PAGE),
      })

      expect(wrapper.find('[data-test="statement-scope"]').exists()).toBe(false)
    })

    it('tells a filter with no matches apart from an empty month (R13)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-03&uncategorized=true', {
        movements: json(EMPTY_MONTH_PAGE),
      })

      expect(wrapper.get('[data-test="statement-no-matches"]').text()).toContain(
        'No movements match these filters in March 2026.',
      )
      expect(wrapper.find('[data-test="statement-empty"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="statement-error"]').exists()).toBe(false)
    })

    it('clearing from the empty state drops the filters and keeps the month (R11)', async () => {
      const { router, wrapper } = await mountView('/movements?month=2026-03&uncategorized=true', {
        movements: json(EMPTY_MONTH_PAGE),
      })

      await wrapper.get('[data-test="statement-empty-clear"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ month: '2026-03' })
    })

    it('a 404 of a deleted account offers Clear filters, not Try again (R10)', async () => {
      const notFound = { statusCode: 404, code: 'NOT_FOUND', message: 'No existe la cuenta 77' }
      const { router, wrapper } = await mountView('/movements?month=2026-03&account=77', {
        movements: json(notFound, 404),
      })

      expect(wrapper.get('[data-test="statement-error-message"]').text()).toBe(
        'That account or category no longer exists.',
      )
      expect(wrapper.find('[data-test="statement-retry"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No existe')

      await wrapper.get('[data-test="statement-error-clear"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ month: '2026-03' })
    })

    it('a filter change throws away what Load more had brought (R3)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: (query) =>
          json(query.get('page') === '2' ? BIG_MONTH_PAGE_TWO : BIG_MONTH_PAGE_ONE)(),
      })
      await wrapper.get('[data-test="statement-load-more"]').trigger('click')
      await flushPromises()
      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(3)

      await wrapper.get('[data-test="filter-uncategorized"] input').setValue(true)
      await flushPromises()

      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(2)
      expect(api.queries().at(-1)).toContain('page=1')
    })

    it('a failed account list leaves the month and the rest of the bar working (R15)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-03', {
        movements: json(MONTH_PAGE),
        accounts: networkDown,
      })

      expect(wrapper.text()).toContain('Accounts unavailable')
      expect(
        wrapper.get('[data-test="filter-account"] select').attributes('disabled'),
      ).toBeDefined()
      expect(
        wrapper.get('[data-test="filter-category"] select').attributes('disabled'),
      ).toBeUndefined()
      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(5)
      expect(wrapper.find('[data-test="statement-error"]').exists()).toBe(false)
    })
  })
})
