import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import StickyBelowTopBar from '@/shared/components/StickyBelowTopBar.vue'
import { formatMoney } from '@/shared/money'

import StatementView from '../views/StatementView.vue'
import { currentMonth, formatMonthLabel, monthRange, shiftMonth } from '../months'
import {
  BIG_MONTH_PAGE_ONE,
  BIG_MONTH_PAGE_TWO,
  COUNT_PAGE,
  CREATED_RULE,
  DEPOSIT_MONTH_PAGE,
  DEPOSIT_OPENING,
  DEPOSIT_TOTALS,
  EMPTY_MONTH_PAGE,
  HIDDEN_MONTH_PAGE,
  ambiguousGroups,
  EXPENSE,
  GROCERIES,
  MONTH_PAGE,
  NEUTRAL,
  OTHER_MONTH_PAGE,
  TOTALS,
  VALIDATION_ERROR_BODY,
  changed,
  deferred,
  excluded,
  fakeMonth,
  json,
  jsonResponse,
  mockApi,
  movement as rawMovement,
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

/** What a Teleport put in the body (the rule dialog of the F17). */
const at = (selector: string) => document.querySelector<HTMLElement>(selector)

describe('StatementView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
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
    // Feature 20 added the two lists that fill the selects and feature 23 the doubtful
    // groups of the note; all four paths are reads (C1).
    expect([...new Set(api.calls.map((call) => call.path))].sort()).toEqual([
      '/api/accounts',
      '/api/categories',
      '/api/movements',
      '/api/transfers/ambiguous',
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
        '5 movements match these filters in March 2026 · Account Bankinter ···0236 · "luz"',
      )
      expect(wrapper.find('[data-test="statement-totals-note"]').exists()).toBe(true)
      // Feature 23: the note no longer names a month nor carries a single digit (R14).
      // Feature 29: its first sentence is the one always in sight.
      expect(wrapper.get('[data-test="statement-totals-line"]').text()).toBe(
        'These figures leave out the movements labelled "Transfer" or "Not counted", and count a deposit only by its interest.',
      )
      expect(wrapper.get('[data-test="statement-totals-note"]').text()).not.toMatch(/\d/)
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
  // --- Correcting a category from the screen (feature 21) ---

  describe('correcting a category from the screen (feature 21)', () => {
    const GROCERIES_EXPENSE = changed(EXPENSE, { categoryId: 2, category: GROCERIES })

    const openEditor = async (wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) => {
      await wrapper.findAll('[data-test="statement-row-category-button"]')[0]?.trigger('click')
      await flushPromises()
    }

    it('shows no selector until the badge is pressed, and then only one (R2, R3)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
      })

      expect(wrapper.findAll('[data-test="row-category-editor"]')).toHaveLength(0)
      // Four of the five rows are categorizable; the neutral one keeps a plain badge (R5).
      expect(wrapper.findAll('[data-test="statement-row-category-button"]')).toHaveLength(4)

      await openEditor(wrapper)

      expect(wrapper.findAll('[data-test="row-category-editor"]')).toHaveLength(1)
      expect(wrapper.findAll('select')).toHaveLength(3) // the two filters plus this one
      expect(NEUTRAL.type).toBe('neutral')
    })

    it('writes the chosen category and paints the answer, with no month reload (R1, R7, R9)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        patch: json(GROCERIES_EXPENSE),
      })
      const readsBefore = api.queries().length

      await openEditor(wrapper)
      await wrapper.get('[data-test="row-category-editor"] select').setValue('2')
      await flushPromises()

      expect(api.patches()).toHaveLength(1)
      expect(api.patches()[0]?.rawBody).toBe('{"categoryId":2}')
      expect(api.queries()).toHaveLength(readsBefore)
      expect(wrapper.findAll('[data-test="statement-row-category"]')[0]?.text()).toBe('Groceries')
      // The editor closed itself and the line is a badge again.
      expect(wrapper.findAll('[data-test="row-category-editor"]')).toHaveLength(0)
      expect(wrapper.get('[data-test="statement-action-summary"]').text()).toContain(
        'Categorized as Groceries',
      )
      expect(wrapper.find('[data-test="statement-totals-note"]').exists()).toBe(true)
      expect(wrapper.get('[data-test="statement-totals-in"]').text()).toBe(
        formatMoney(TOTALS.income),
      )
    })

    it('mounts the notice between the figures and the list (R11)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        patch: json(GROCERIES_EXPENSE),
      })

      await openEditor(wrapper)
      await wrapper.get('[data-test="row-category-editor"] select').setValue('2')
      await flushPromises()

      const html = wrapper.html()
      expect(html.indexOf('statement-totals')).toBeLessThan(
        html.indexOf('statement-action-summary'),
      )
      expect(html.indexOf('statement-action-summary')).toBeLessThan(html.indexOf('statement-row'))
    })

    it('undoes the last change from the notice (R12)', async () => {
      let patches = 0
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        patch: () => {
          patches += 1
          return json(patches === 1 ? GROCERIES_EXPENSE : EXPENSE)()
        },
      })

      await openEditor(wrapper)
      await wrapper.get('[data-test="row-category-editor"] select').setValue('2')
      await flushPromises()
      await wrapper.get('[data-test="statement-action-undo"]').trigger('click')
      await flushPromises()

      expect(api.patches().map((call) => call.rawBody)).toEqual([
        '{"categoryId":2}',
        '{"categoryId":1}',
      ])
      expect(wrapper.findAll('[data-test="statement-row-category"]')[0]?.text()).toBe('Food')
      expect(wrapper.get('[data-test="statement-action-summary"]').text()).toContain(
        'Change undone',
      )
      expect(wrapper.find('[data-test="statement-action-undo"]').exists()).toBe(false)
    })

    it('a rejected change says it in English and leaves the line alone (R14)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        patch: json(VALIDATION_ERROR_BODY, 400),
      })

      await openEditor(wrapper)
      await wrapper.get('[data-test="row-category-editor"] select').setValue('2')
      await flushPromises()

      expect(wrapper.get('[data-test="statement-action-error"]').text()).toBe(
        "Nothing changed. That movement doesn't accept that category.",
      )
      expect(wrapper.text()).not.toContain('parámetro')
      // The line kept its own category: the editor is still open on the old value.
      expect(
        (wrapper.get('[data-test="row-category-editor"] select').element as HTMLSelectElement)
          .value,
      ).toBe('1')
      expect(api.queries()).toHaveLength(1)
      expect(wrapper.find('[data-test="statement-action-summary"]').exists()).toBe(false)
    })

    it('opens the rule dialog of the F17 from the editor, with its preview (R16)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
      })

      await openEditor(wrapper)
      await wrapper.get('[data-test="row-create-rule"]').trigger('click')
      await flushPromises()

      // The dialog is a Teleport to the body: it is read from the document (F17).
      const dialog = at('[data-test="rule-dialog"]')
      expect(dialog).not.toBeNull()
      expect(dialog?.textContent).toContain('CAFETERÍA CENTRAL')
      expect((at('[data-test="rule-text"] input') as HTMLInputElement).value).toBe('cafeteria')
      // The count of matching movements is asked for right away, and only reads (F18).
      expect(api.queries().at(-1)).toContain('q=cafeteria')
      expect(api.patches()).toHaveLength(0)
      // Only expense categories: the movement is an expense (R16).
      const options = [
        ...(at('[data-test="rule-category"]')?.querySelectorAll('option') ?? []),
      ].map((option) => option.textContent)
      expect(options).not.toContain('Salary')
      expect(options).toContain('Groceries')
    })

    it('creating the rule writes nothing on the movement it was born from (R17)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        createRule: json(CREATED_RULE, 201),
      })

      await openEditor(wrapper)
      await wrapper.get('[data-test="row-create-rule"]').trigger('click')
      await flushPromises()
      const select = at('[data-test="rule-category"] select') as HTMLSelectElement
      select.value = '2'
      select.dispatchEvent(new Event('change'))
      await flushPromises()
      at('[data-test="rule-save"]')?.click()
      await flushPromises()

      const writes = api.calls.filter((call) => call.method !== 'GET')
      expect(writes.map((call) => `${call.method} ${call.path}`)).toEqual([
        'POST /api/category-rules',
      ])
      expect(api.patches()).toHaveLength(0)
      // And nothing applies the rule by itself: that is the F17's own gesture.
      expect(api.calls.some((call) => call.path.endsWith('/apply'))).toBe(false)
      expect(at('[data-test="rule-dialog"]')).toBeNull()
      // The line is untouched: its editor still shows the category it already had.
      expect(
        (wrapper.get('[data-test="row-category-editor"] select').element as HTMLSelectElement)
          .value,
      ).toBe('1')
    })

    it('the only write of the whole screen is that PATCH (C1)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        patch: json(GROCERIES_EXPENSE),
      })

      await openEditor(wrapper)
      await wrapper.get('[data-test="row-category-editor"] select').setValue('2')
      await flushPromises()
      await wrapper.get('[data-test="statement-prev"]').trigger('click')
      await flushPromises()

      expect([...new Set(api.calls.map((call) => call.method))].sort()).toEqual(['GET', 'PATCH'])
      expect(api.patches().map((call) => call.path)).toEqual(['/api/movements/10'])
      expect(api.patches().every((call) => call.rawBody === '{"categoryId":2}')).toBe(true)
    })

    it('changing the month forgets the editor and the undo (R13)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        patch: json(GROCERIES_EXPENSE),
      })

      await openEditor(wrapper)
      await wrapper.get('[data-test="row-category-editor"] select').setValue('2')
      await flushPromises()
      expect(wrapper.find('[data-test="statement-action-summary"]').exists()).toBe(true)

      await wrapper.get('[data-test="statement-prev"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="statement-action-summary"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="row-category-editor"]')).toHaveLength(0)
    })
  })

  // --- Marking movements as not counted (feature 22) ---

  describe('the selection mode from the screen (R5, R6, R13, R14)', () => {
    /** A month of 24 rows, so the confirmation threshold of 20 can be crossed. */
    const BIG_SELECTION = {
      movements: Array.from({ length: 24 }, (_item, index) =>
        rawMovement({
          id: 300 + index,
          type: 'expense',
          bookingDate: '2026-09-03',
          valueDate: '2026-09-03',
          amount: '1.00',
          description: `RECIBO ${index}`,
        }),
      ),
      pagination: { page: 1, pageSize: 200, total: 24, totalPages: 1 },
      totals: TOTALS,
    }

    const tick = async (
      wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'],
      index: number,
    ) => {
      await wrapper.findAll('[data-test="statement-row-select"] input')[index]?.setValue(true)
    }

    it('shows one button and no checkbox until it is turned on (R4)', async () => {
      const { wrapper } = await mountView('/movements', { movements: json(MONTH_PAGE) })

      expect(wrapper.get('[data-test="statement-start-selecting"]').text()).toBe('Select movements')
      expect(wrapper.find('[data-test="statement-selection-bar"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="statement-row-select"]')).toHaveLength(0)
      expect(wrapper.findAll('[data-test="statement-row-category-button"]')).toHaveLength(4)
    })

    it('swaps the button for the bar, and the category badges stop being buttons (R5, R6)', async () => {
      const { wrapper } = await mountView('/movements', { movements: json(MONTH_PAGE) })

      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')

      expect(wrapper.find('[data-test="statement-start-selecting"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="statement-selected-count"]').text()).toBe('0 selected')
      expect(wrapper.findAll('[data-test="statement-row-select"]')).toHaveLength(5)
      expect(wrapper.findAll('[data-test="statement-row-category-button"]')).toHaveLength(0)

      await wrapper.get('[data-test="statement-selection-done"]').trigger('click')

      expect(wrapper.find('[data-test="statement-selection-bar"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="statement-row-select"]')).toHaveLength(0)
      expect(wrapper.findAll('[data-test="statement-row-category-button"]')).toHaveLength(4)
    })

    it('writes the ticked rows with one request and shows what it did (R1, R11, R14)', async () => {
      const month = fakeMonth()
      const { api, wrapper } = await mountView('/movements', {
        movements: month.movements,
        bulkPatch: month.bulkPatch,
      })
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await tick(wrapper, 0)
      await tick(wrapper, 1)

      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()

      expect(api.patches()).toHaveLength(1)
      expect(api.patches()[0]?.rawBody).toBe('{"ids":[10,11],"excludedFromTotals":true}')
      expect(wrapper.get('[data-test="statement-action-summary"]').text()).toContain(
        '2 movements excluded from totals',
      )
      expect(wrapper.findAll('[data-test="statement-row-excluded"]')).toHaveLength(2)
      expect(wrapper.get('[data-test="statement-selected-count"]').text()).toBe('0 selected')
      // The figures are the ones the refreshed month brought (C3).
      expect(wrapper.get('[data-test="statement-totals-out"]').text()).toBe(formatMoney('0.00'))
    })

    it('puts the batch back from the Undo of the notice (R14)', async () => {
      const month = fakeMonth()
      const { api, wrapper } = await mountView('/movements', {
        movements: month.movements,
        bulkPatch: month.bulkPatch,
      })
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await tick(wrapper, 0)
      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()

      await wrapper.get('[data-test="statement-action-undo"]').trigger('click')
      await flushPromises()

      expect(api.patches()).toHaveLength(2)
      expect(api.patches()[1]?.rawBody).toBe('{"ids":[10],"excludedFromTotals":false}')
      expect(wrapper.findAll('[data-test="statement-row-excluded"]')).toHaveLength(0)
      expect(wrapper.find('[data-test="statement-action-undo"]').exists()).toBe(false)
    })

    it('says there is nothing to change instead of writing (R3)', async () => {
      const month = fakeMonth([excluded(EXPENSE)])
      const { api, wrapper } = await mountView('/movements', {
        movements: month.movements,
        bulkPatch: month.bulkPatch,
      })
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await tick(wrapper, 0)

      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()

      expect(api.patches()).toHaveLength(0)
      expect(wrapper.get('[data-test="statement-action-summary"]').text()).toContain(
        'Nothing to change: those movements are already like that.',
      )
    })

    it('asks first from 20 movements up, naming the exact number (R13)', async () => {
      const { api, wrapper } = await mountView('/movements', {
        movements: json(BIG_SELECTION),
        bulkPatch: json({ updated: 0, movements: [] }),
      })
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await wrapper.get('[data-test="statement-select-all"]').trigger('click')

      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()

      expect(document.body.textContent).toContain('Exclude 24 movements from totals?')
      expect(api.patches()).toHaveLength(0)
    })

    it('sends nothing when the question is cancelled (R13)', async () => {
      const { api, wrapper } = await mountView('/movements', {
        movements: json(BIG_SELECTION),
        bulkPatch: json({ updated: 0, movements: [] }),
      })
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await wrapper.get('[data-test="statement-select-all"]').trigger('click')
      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()

      at('[data-test="statement-exclude-cancel"]')?.click()
      await flushPromises()

      expect(api.patches()).toHaveLength(0)
      expect(document.querySelector('[role="dialog"]')).toBeNull()
      // The selection is untouched: the question was cancelled, not the batch.
      expect(wrapper.get('[data-test="statement-selected-count"]').text()).toBe('24 selected')
    })

    it('writes the whole batch once the question is answered (R13)', async () => {
      const { api, wrapper } = await mountView('/movements', {
        movements: json(BIG_SELECTION),
        bulkPatch: json({
          updated: 24,
          movements: BIG_SELECTION.movements.map((row) => excluded(row)),
        }),
      })
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await wrapper.get('[data-test="statement-select-all"]').trigger('click')
      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()

      at('[data-test="statement-exclude-continue"]')?.click()
      await flushPromises()

      expect(api.patches()).toHaveLength(1)
      expect(JSON.parse(api.patches()[0]?.rawBody ?? '{}')).toEqual({
        ids: BIG_SELECTION.movements.map((row) => row.id),
        excludedFromTotals: true,
      })
    })

    it('does not ask for a batch under the threshold (R13)', async () => {
      const month = fakeMonth()
      const { api, wrapper } = await mountView('/movements', {
        movements: month.movements,
        bulkPatch: month.bulkPatch,
      })
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await wrapper.get('[data-test="statement-select-all"]').trigger('click')

      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()

      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(api.patches()).toHaveLength(1)
    })

    it('paints the English sentence of a failure and never the backend one (R15)', async () => {
      const { wrapper } = await mountView('/movements', {
        movements: json(MONTH_PAGE),
        bulkPatch: json(VALIDATION_ERROR_BODY, 400),
      })
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await tick(wrapper, 0)

      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()

      const line = wrapper.get('[data-test="statement-action-error"]').text()
      expect(line).toBe('Nothing changed. The server rejected that change.')
      expect(wrapper.text()).not.toContain('«from»')
    })

    it('leaves the permanent note of the F19 exactly where it was (C4)', async () => {
      const { wrapper } = await mountView('/movements', { movements: json(MONTH_PAGE) })
      const before = wrapper.get('[data-test="statement-totals-note"]').text()

      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')

      expect(wrapper.get('[data-test="statement-totals-note"]').text()).toBe(before)
    })
  })
  // ─── The noise switch (feature 23) ────────────────────────────────────────
  describe('the noise switch', () => {
    /** The month with the switch on, plus the count read it triggers (R2, R7). */
    const hidden: Answers = {
      movements: (query) => {
        if (query.get('pageSize') === '1') return json(COUNT_PAGE)()
        return json(query.get('excluded') === 'none' ? HIDDEN_MONTH_PAGE : MONTH_PAGE)()
      },
    }

    const box = (wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) =>
      wrapper.get('[data-test="statement-noise-switch"]').get('input')

    it('is off when the address does not mention it, and the whole month is shown (R1)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09', hidden)

      expect(box(wrapper).element.checked).toBe(false)
      expect(api.queries()).toEqual(['from=2026-09-01&to=2026-09-30&page=1&pageSize=200'])
      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(5)
      expect(wrapper.find('[data-test="statement-hidden-count"]').exists()).toBe(false)
    })

    it('turning it on writes hide=true and keeps every other key of the URL (R4)', async () => {
      const { api, router, wrapper } = await mountView(
        '/movements?month=2026-09&account=1&uncategorized=true&q=luz',
        hidden,
      )

      await box(wrapper).setValue(true)
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({
        month: '2026-09',
        hide: 'true',
        account: '1',
        uncategorized: 'true',
        q: 'luz',
      })
      expect(api.queries().at(-2)).toBe(
        'accountId=1&from=2026-09-01&to=2026-09-30&uncategorized=true&q=luz&excluded=none&transfer=none&page=1&pageSize=200',
      )
      expect(api.methods()).toEqual(['GET'])
    })

    it('keeps the category key as it was, not only the uncategorized one (R4)', async () => {
      const { router, wrapper } = await mountView('/movements?month=2026-09&category=2', hidden)

      await box(wrapper).setValue(true)
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({
        month: '2026-09',
        hide: 'true',
        category: '2',
      })
    })

    it('comes up on from the address, and hides the marked ones and the transfers (R5)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09&hide=true', hidden)

      expect(box(wrapper).element.checked).toBe(true)
      expect(api.queries()[0]).toBe(
        'from=2026-09-01&to=2026-09-30&excluded=none&transfer=none&page=1&pageSize=200',
      )
      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(4)
    })

    it.each(['1', 'yes'])('comes up OFF when the address says hide=%s (R5)', async (raw) => {
      const { api, wrapper } = await mountView(`/movements?month=2026-09&hide=${raw}`, hidden)

      expect(box(wrapper).element.checked).toBe(false)
      expect(api.queries()[0]).not.toContain('excluded')
    })

    it('says how many are held back only while it is on, and never an amount (R7, R8)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09&hide=true', hidden)

      const line = wrapper.get('[data-test="statement-hidden-count"]')
      expect(line.text()).toBe('Hiding 1 movement')
      expect(line.text()).not.toContain('€')

      await box(wrapper).setValue(false)
      await flushPromises()

      expect(wrapper.find('[data-test="statement-hidden-count"]').exists()).toBe(false)
    })

    it('a failed count changes nothing on the screen (R9)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09&hide=true', {
        movements: (query) =>
          query.get('pageSize') === '1' ? networkDown() : json(HIDDEN_MONTH_PAGE)(),
      })

      expect(wrapper.find('[data-test="statement-hidden-count"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="statement-error"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(4)
      expect(wrapper.get('[data-test="statement-totals-in"]').text()).toBe(
        formatMoney(TOTALS.income),
      )
    })

    it('the three figures do not move when it is turned on (R6, design §1)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', hidden)
      const before = wrapper.get('[data-test="statement-totals-in"]').text()

      await box(wrapper).setValue(true)
      await flushPromises()

      expect(wrapper.get('[data-test="statement-totals-in"]').text()).toBe(before)
      expect(wrapper.get('[data-test="statement-totals-out"]').text()).toBe(
        formatMoney(TOTALS.expense),
      )
    })

    it('nothing left to show names both causes and offers the switch back (R12)', async () => {
      const { router, wrapper } = await mountView(
        '/movements?month=2026-09&hide=true&q=transferencia',
        {
          movements: (query) =>
            query.get('pageSize') === '1' ? json(COUNT_PAGE)() : json(EMPTY_MONTH_PAGE)(),
        },
      )

      const empty = wrapper.get('[data-test="statement-nothing-left"]')
      expect(empty.text()).toContain('Nothing left to show in September 2026')
      expect(empty.text()).toContain('what these filters match is hidden')
      expect(wrapper.find('[data-test="statement-no-matches"]').exists()).toBe(false)

      await wrapper.get('[data-test="statement-show-everything"]').trigger('click')
      await flushPromises()

      // The switch goes off and the filters stay exactly where they were (C5).
      expect(router.currentRoute.value.query).toEqual({ month: '2026-09', q: 'transferencia' })
    })

    // ─── An empty list with the checkbox on (feature 29) ───────────────────
    describe('a month where the list comes out empty with the checkbox on', () => {
      /** The read without hiding: one row asked for, `total` movements counted. */
      const countOf = (total: number) =>
        json({
          ...EMPTY_MONTH_PAGE,
          pagination: { page: 1, pageSize: 1, total, totalPages: total },
        })

      /** The month answers `total: 0`; the read without hiding answers what it is told. */
      const emptyWith = (count: () => Promise<Response>): Answers => ({
        movements: (query) => (query.get('pageSize') === '1' ? count() : json(EMPTY_MONTH_PAGE)()),
      })

      const exists = (wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], name: string) =>
        wrapper.find(`[data-test="${name}"]`).exists()

      it('an empty month opened with the checkbox on says it has no movements', async () => {
        const { api, wrapper } = await mountView(
          '/movements?month=2026-10&hide=true',
          emptyWith(countOf(0)),
        )

        expect(api.queries()).toEqual([
          'from=2026-10-01&to=2026-10-31&excluded=none&transfer=none&page=1&pageSize=200',
          'from=2026-10-01&to=2026-10-31&page=1&pageSize=1',
        ])
        expect(wrapper.get('[data-test="statement-empty"]').text()).toBe(
          'No movements in October 2026.',
        )
        expect(exists(wrapper, 'statement-nothing-left')).toBe(false)
        expect(exists(wrapper, 'statement-nothing-shown')).toBe(false)
        expect(exists(wrapper, 'statement-show-everything')).toBe(false)
        expect(exists(wrapper, 'statement-empty-clear')).toBe(false)
        expect(exists(wrapper, 'statement-hidden-count')).toBe(false)
        expect(wrapper.text()).not.toContain('Hiding')
        expect(wrapper.text()).not.toContain('hidden')
        // The checkbox itself is still there, and still ticked.
        expect(box(wrapper).element.checked).toBe(true)
      })

      it('a month whose movements are all hidden says so and offers Show everything', async () => {
        const { router, wrapper } = await mountView(
          '/movements?month=2026-10&hide=true',
          emptyWith(countOf(3)),
        )

        const block = wrapper.get('[data-test="statement-nothing-left"]')
        expect(block.text()).toContain('Nothing left to show in October 2026')
        expect(block.text()).toContain('everything in this month is hidden')
        expect(exists(wrapper, 'statement-empty')).toBe(false)
        expect(exists(wrapper, 'statement-nothing-shown')).toBe(false)
        expect(wrapper.get('[data-test="statement-hidden-count"]').text()).toBe(
          'Hiding 3 movements',
        )
        expect(wrapper.get('[data-test="statement-show-everything"]').text()).toBe(
          'Show everything',
        )

        await wrapper.get('[data-test="statement-show-everything"]').trigger('click')
        await flushPromises()

        expect(router.currentRoute.value.query).toEqual({ month: '2026-10' })
        expect(router.currentRoute.value.query.hide).toBeUndefined()
        expect(box(wrapper).element.checked).toBe(false)
      })

      it('with filters and the checkbox on a month where nothing matches blames the filters', async () => {
        const { router, wrapper } = await mountView(
          '/movements?month=2026-10&hide=true&q=alquiler',
          emptyWith(countOf(0)),
        )

        const block = wrapper.get('[data-test="statement-no-matches"]')
        expect(block.get('[data-test="statement-empty-line"]').text()).toBe(
          'No movements match these filters in October 2026.',
        )
        expect(block.get('[data-test="statement-empty-clear"]').text()).toBe('Clear filters')
        expect(exists(wrapper, 'statement-show-everything')).toBe(false)
        expect(exists(wrapper, 'statement-nothing-left')).toBe(false)
        expect(exists(wrapper, 'statement-nothing-shown')).toBe(false)
        expect(exists(wrapper, 'statement-hidden-count')).toBe(false)

        await block.get('[data-test="statement-empty-clear"]').trigger('click')
        await flushPromises()

        // The filters go and the checkbox stays, as `Clear filters` always did (C5).
        expect(router.currentRoute.value.query).toEqual({ month: '2026-10', hide: 'true' })
      })

      it('says nothing is shown without blaming the checkbox when the second read fails', async () => {
        const { router, wrapper } = await mountView(
          '/movements?month=2026-10&hide=true',
          emptyWith(networkDown),
        )

        const block = wrapper.get('[data-test="statement-nothing-shown"]')
        expect(block.get('[data-test="statement-empty-line"]').text()).toBe(
          'Nothing to show in October 2026 while "Hide what does not count" is ticked.',
        )
        expect(block.get('[data-test="statement-show-everything"]').text()).toBe('Show everything')
        expect(exists(wrapper, 'statement-empty')).toBe(false)
        expect(exists(wrapper, 'statement-nothing-left')).toBe(false)
        expect(exists(wrapper, 'statement-hidden-count')).toBe(false)
        // The failure of that read paints no error, as in the F23.
        expect(exists(wrapper, 'statement-error')).toBe(false)

        await block.get('[data-test="statement-show-everything"]').trigger('click')
        await flushPromises()

        expect(router.currentRoute.value.query).toEqual({ month: '2026-10' })
      })

      it('says the same while the second read has not answered yet, then what it learns', async () => {
        const late = deferred()
        const { wrapper } = await mountView(
          '/movements?month=2026-10&hide=true',
          emptyWith(late.answer),
        )

        expect(
          wrapper
            .get('[data-test="statement-nothing-shown"]')
            .get('[data-test="statement-empty-line"]')
            .text(),
        ).toBe('Nothing to show in October 2026 while "Hide what does not count" is ticked.')
        expect(exists(wrapper, 'statement-show-everything')).toBe(true)
        expect(exists(wrapper, 'statement-hidden-count')).toBe(false)

        late.resolve(jsonResponse(EMPTY_MONTH_PAGE))
        await flushPromises()

        expect(exists(wrapper, 'statement-nothing-shown')).toBe(false)
        expect(wrapper.get('[data-test="statement-empty"]').text()).toBe(
          'No movements in October 2026.',
        )
        expect(exists(wrapper, 'statement-show-everything')).toBe(false)
      })

      it('keeps Hiding 0 movements in a month that does have movements', async () => {
        const { wrapper } = await mountView('/movements?month=2026-09&hide=true', {
          movements: (query) =>
            query.get('pageSize') === '1' ? countOf(4)() : json(HIDDEN_MONTH_PAGE)(),
        })

        expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(4)
        expect(wrapper.get('[data-test="statement-hidden-count"]').text()).toBe(
          'Hiding 0 movements',
        )
      })

      it('asks the backend for nothing new to tell an empty month from a hidden one', async () => {
        const on = await mountView('/movements?month=2026-10&hide=true', emptyWith(countOf(0)))

        expect(on.api.queries()).toEqual([
          'from=2026-10-01&to=2026-10-31&excluded=none&transfer=none&page=1&pageSize=200',
          'from=2026-10-01&to=2026-10-31&page=1&pageSize=1',
        ])
        expect(on.api.calls.filter((call) => call.path === '/api/movements')).toHaveLength(2)
        expect(on.api.methods()).toEqual(['GET'])
        on.wrapper.unmount()
        vi.restoreAllMocks()

        const off = await mountView('/movements?month=2026-10', emptyWith(countOf(0)))

        expect(off.api.queries()).toEqual(['from=2026-10-01&to=2026-10-31&page=1&pageSize=200'])
        expect(off.api.calls.filter((call) => call.path === '/api/movements')).toHaveLength(1)
        expect(off.api.methods()).toEqual(['GET'])
        expect(off.wrapper.get('[data-test="statement-empty"]').text()).toBe(
          'No movements in October 2026.',
        )
      })
    })

    it('`Clear filters` empties the bar and leaves the switch ON (C5)', async () => {
      const { router, wrapper } = await mountView(
        '/movements?month=2026-09&hide=true&account=1&q=luz',
        hidden,
      )

      await wrapper.get('[data-test="clear-filters"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ month: '2026-09', hide: 'true' })
      expect(box(wrapper).element.checked).toBe(true)
    })

    it('the switch survives a month change, filters included (R4)', async () => {
      const { router, wrapper } = await mountView('/movements?month=2026-09&hide=true', hidden)

      await wrapper.get('[data-test="statement-prev"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ month: '2026-08', hide: 'true' })
      expect(box(wrapper).element.checked).toBe(true)
    })

    it('reads the doubtful groups once per session and puts them in the note (R15)', async () => {
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        ...hidden,
        ambiguous: json(ambiguousGroups(2)),
      })

      // Feature 29: folded with the rest of the note, inside its <details>.
      expect(
        wrapper
          .get('[data-test="statement-totals-note"]')
          .get('[data-test="statement-totals-more"]')
          .get('[data-test="statement-ambiguous-note"]')
          .text(),
      ).toBe('2 groups look like transfers but could not be paired automatically.')

      await box(wrapper).setValue(true)
      await flushPromises()
      await wrapper.get('[data-test="statement-prev"]').trigger('click')
      await flushPromises()

      expect(api.calls.filter((call) => call.path === '/api/transfers/ambiguous')).toHaveLength(1)
    })

    it('with no doubtful group the note keeps only its fixed text, and no error (R15)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', {
        ...hidden,
        ambiguous: networkDown,
      })

      expect(wrapper.find('[data-test="statement-ambiguous-note"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="statement-totals-note"]').text()).not.toMatch(/\d/)
      expect(wrapper.find('[data-test="statement-error"]').exists()).toBe(false)
    })
  })

  // --- The notice under the top bar (feature 27) ---
  // jsdom lays nothing out, so «in view» is the browser tests' job. Here: the block
  // exists only with something to say, wraps the notice, and is told which line to
  // keep clear.

  describe('the block that keeps the notice under the top bar (feature 27)', () => {
    const BLOCK = '[data-test="sticky-below-top-bar"]'
    const GROCERIES_EXPENSE = changed(EXPENSE, { categoryId: 2, category: GROCERIES })

    type View = Awaited<ReturnType<typeof mountView>>['wrapper']

    const categorizeFirst = async (wrapper: View) => {
      await wrapper.findAll('[data-test="statement-row-category-button"]')[0]?.trigger('click')
      await flushPromises()
      await wrapper.get('[data-test="row-category-editor"] select').setValue('2')
      await flushPromises()
    }

    const excludeFirst = async (wrapper: View) => {
      await wrapper.get('[data-test="statement-start-selecting"]').trigger('click')
      await wrapper.findAll('[data-test="statement-row-select"] input')[0]?.setValue(true)
      await wrapper.get('[data-test="statement-exclude"]').trigger('click')
      await flushPromises()
    }

    it('paints no notice block while there is nothing to say', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
      })

      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(5)
      expect(wrapper.find(BLOCK).exists()).toBe(false)
      expect(wrapper.find('[data-test="statement-action-summary"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="statement-action-error"]').exists()).toBe(false)
    })

    it('puts the summary and its Undo inside the block after a category change (R2)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        patch: json(GROCERIES_EXPENSE),
      })

      await categorizeFirst(wrapper)

      const block = wrapper.get(BLOCK)
      expect(block.get('[data-test="statement-action-summary"]').text()).toContain(
        'Categorized as Groceries',
      )
      expect(block.find('[data-test="statement-action-undo"]').exists()).toBe(true)
      expect(wrapper.findAll(BLOCK)).toHaveLength(1)
      expect(wrapper.findAll('[data-test="statement-action-summary"]')).toHaveLength(1)
    })

    it('tells the block which line to keep clear, and none after a batch (R11)', async () => {
      const month = fakeMonth()
      const { api, wrapper } = await mountView('/movements?month=2026-09', {
        movements: month.movements,
        patch: json(GROCERIES_EXPENSE),
        bulkPatch: month.bulkPatch,
      })

      await categorizeFirst(wrapper)

      expect(api.patches().at(-1)?.path).toBe('/api/movements/10')
      const block = wrapper.getComponent(StickyBelowTopBar)
      expect(block.props('keepClearOf')).toBe('[data-movement-id="10"]')
      // The selector really names the line that is still on the page.
      expect(wrapper.findAll(block.props('keepClearOf') as string)).toHaveLength(1)

      await excludeFirst(wrapper)

      expect(wrapper.get('[data-test="statement-action-summary"]').text()).toContain(
        '1 movement excluded from totals',
      )
      expect(wrapper.getComponent(StickyBelowTopBar).props('keepClearOf')).toBeNull()
    })

    it('puts the sentence of a failed write inside the block (R5)', async () => {
      const { wrapper } = await mountView('/movements?month=2026-09', {
        movements: json(MONTH_PAGE),
        patch: json(VALIDATION_ERROR_BODY, 400),
      })

      await categorizeFirst(wrapper)

      expect(wrapper.get(BLOCK).find('[data-test="statement-action-error"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="statement-action-error"]')).toHaveLength(1)
    })

    it('sits right before the selection button or bar, which stay where they were (C6)', async () => {
      const month = fakeMonth()
      const { wrapper } = await mountView('/movements?month=2026-09', {
        movements: month.movements,
        patch: json(GROCERIES_EXPENSE),
        bulkPatch: month.bulkPatch,
      })
      const afterBlock = () => wrapper.get(BLOCK).element.nextElementSibling
      const beforeBlock = () => wrapper.get(BLOCK).element.previousElementSibling

      await categorizeFirst(wrapper)

      expect(beforeBlock()?.querySelector('[data-test="statement-totals-in"]')).not.toBeNull()
      expect(afterBlock()?.querySelector('[data-test="statement-start-selecting"]')).not.toBeNull()
      expect(wrapper.get('[data-test="statement-start-selecting"]').text()).toBe('Select movements')

      await excludeFirst(wrapper)

      expect(afterBlock()?.matches('[data-test="statement-selection-bar"]')).toBe(true)
      expect(afterBlock()?.querySelector('[data-test="statement-exclude"]')).not.toBeNull()
      expect(afterBlock()?.querySelector('[data-test="statement-include"]')).not.toBeNull()
    })
  })

  // ─── Deposit movements (feature 31) ───────────────────────────────────────
  // The backend has no filter for them: with the checkbox on, the resolved openings and
  // cancellations still come in the answer and are taken off the list here (R11 … R14).
  describe('deposit movements (feature 31)', () => {
    /** The month with the checkbox on; the read without hiding answers `total`. */
    const october = (page: Record<string, unknown>, total: number): Answers => ({
      movements: (query) =>
        query.get('pageSize') === '1'
          ? json({
              ...EMPTY_MONTH_PAGE,
              pagination: { page: 1, pageSize: 1, total, totalPages: total },
            })()
          : json(page)(),
    })

    const rowIds = (wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) =>
      wrapper
        .findAll('[data-test="statement-row"]')
        .map((row) => row.attributes('data-movement-id'))

    it('the checkbox hides deposit openings and cancellations and keeps a maturity that counts its interest', async () => {
      const off = await mountView('/movements?month=2026-10', october(DEPOSIT_MONTH_PAGE, 4))
      expect(rowIds(off.wrapper)).toEqual(['53', '52', '51', '50'])
      off.wrapper.unmount()

      const on = await mountView(
        '/movements?month=2026-10&hide=true',
        october(DEPOSIT_MONTH_PAGE, 4),
      )

      // The maturity that counts its interest and the doubtful one stay.
      expect(rowIds(on.wrapper)).toEqual(['53', '52'])
      expect(on.wrapper.text()).toContain('Deposit maturity · only the interest counts')
      expect(on.wrapper.text()).toContain('Doubtful deposit maturity')
      expect(on.wrapper.text()).not.toContain('Deposit opening')
      expect(on.wrapper.text()).not.toContain('Deposit cancellation')
      // Nothing new is asked: the same two reads as before the feature.
      expect(on.api.queries()).toEqual([
        'from=2026-10-01&to=2026-10-31&excluded=none&transfer=none&page=1&pageSize=200',
        'from=2026-10-01&to=2026-10-31&page=1&pageSize=1',
      ])
    })

    it('counts the hidden deposit openings and cancellations in Hiding', async () => {
      // 250 movements in October for the backend, 4 of them loaded; without hiding there
      // is one more, marked as not counted, that the backend left out itself.
      const page = {
        ...DEPOSIT_MONTH_PAGE,
        pagination: { page: 1, pageSize: 200, total: 250, totalPages: 2 },
      }
      const { wrapper } = await mountView('/movements?month=2026-10&hide=true', october(page, 251))

      // 1 left out by the backend + the opening and the cancellation taken off here.
      expect(wrapper.get('[data-test="statement-hidden-count"]').text()).toBe('Hiding 3 movements')
      // The count of the month, the list and `Showing` leave the two out too (R13).
      expect(wrapper.get('[data-test="statement-totals-count"]').text()).toBe('248 movements')
      expect(wrapper.get('[data-test="statement-showing"]').text()).toBe('Showing 2 of 248')
    })

    it('a month whose movements are all deposit openings says everything is hidden', async () => {
      const second = rawMovement({
        ...DEPOSIT_OPENING,
        id: 54,
        bookingDate: '2026-10-20',
        valueDate: '2026-10-20',
        amount: '8000.00',
        description: 'APERTURA DEP. 000005',
        deposit: { ...(DEPOSIT_OPENING.deposit as Record<string, unknown>), principal: '8000.00' },
      })
      const page = {
        movements: [second, DEPOSIT_OPENING],
        pagination: { page: 1, pageSize: 200, total: 2, totalPages: 1 },
        totals: { income: '0.00', expense: '0.00', net: '0.00' },
      }
      const { wrapper } = await mountView('/movements?month=2026-10&hide=true', october(page, 2))

      expect(wrapper.get('[data-test="statement-empty-line"]').text()).toBe(
        'Nothing left to show in October 2026: everything in this month is hidden.',
      )
      expect(wrapper.find('[data-test="statement-nothing-left"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="statement-empty"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="statement-row"]')).toHaveLength(0)
      // The count of the card is the rows that are left: none.
      expect(wrapper.get('[data-test="statement-totals-count"]').text()).toBe('0 movements')
      expect(wrapper.get('[data-test="statement-hidden-count"]').text()).toBe('Hiding 2 movements')
      expect(wrapper.get('[data-test="statement-show-everything"]').text()).toBe('Show everything')
    })

    it('paints the backend totals untouched in a month with deposit movements', async () => {
      const { wrapper } = await mountView(
        '/movements?month=2026-10',
        october(DEPOSIT_MONTH_PAGE, 4),
      )

      expect(wrapper.get('[data-test="statement-totals-in"]').text()).toBe(
        formatMoney(DEPOSIT_TOTALS.income),
      )
      expect(wrapper.get('[data-test="statement-totals-in"]').text()).toBe(
        `203,92${String.fromCharCode(0xa0)}€`,
      )
      expect(wrapper.get('[data-test="statement-totals-out"]').text()).toBe(formatMoney('0.00'))
      expect(wrapper.get('[data-test="statement-totals-net"]').text()).toBe(formatMoney('203.92'))
      // Nothing added up in the browser: neither the bank amounts nor what each counts.
      const card = wrapper.get('[data-test="statement-totals"]').text()
      for (const made of ['37.07', '50058.37', '25037.07', '35037.07']) {
        expect(card).not.toContain(formatMoney(made))
      }
      expect(wrapper.get('[data-test="statement-totals-count"]').text()).toBe('4 movements')
    })
  })
})
