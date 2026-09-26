import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { formatMoney } from '@/shared/money'

import StatementView from '../views/StatementView.vue'
import { currentMonth, formatMonthLabel, monthRange, shiftMonth } from '../months'
import {
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
    expect(api.calls.every((call) => call.path === '/api/movements')).toBe(true)
  })

  it('shows no figure and no balance column of its own (R9)', async () => {
    const { wrapper } = await mountView('/movements?month=2026-09', {
      movements: json(MONTH_PAGE),
    })

    expect(wrapper.text()).not.toContain('9.954,63')
    expect(wrapper.text()).not.toContain('Balance')
  })
})
