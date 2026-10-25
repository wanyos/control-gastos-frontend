import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { formatDate, formatMoney } from '@/shared/money'

import ExpensesByCategoryView from '../views/ExpensesByCategoryView.vue'
import {
  SERVER_ERROR_BODY,
  json,
  mockBackend,
  networkDown,
  rawAllCategorized,
  rawEmpty,
  rawFixedNotAddingUp,
  rawMonth,
  rawYear,
} from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

/** «Today» for every test: the 20th of September 2026, local time. */
const TODAY = new Date(2026, 8, 20, 12)

async function mountView(
  url = '/expenses-by-category',
  answers: Parameters<typeof mockBackend>[0] = [json(rawMonth())],
) {
  const api = mockBackend(answers)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/expenses-by-category',
        name: 'expenses-by-category',
        component: ExpensesByCategoryView,
      },
    ],
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(ExpensesByCategoryView, {
    global: { plugins: [router, createPinia()] },
    attachTo: document.body,
  })
  await flushPromises()
  return { api, router, wrapper }
}

type View = Awaited<ReturnType<typeof mountView>>['wrapper']

const text = (wrapper: View, name: string): string => wrapper.get(`[data-test="${name}"]`).text()
const has = (wrapper: View, name: string): boolean => wrapper.find(`[data-test="${name}"]`).exists()
const lineNames = (wrapper: View, group: string): string[] =>
  wrapper.findAll(`[data-test="group-${group}"] [data-test="line-name"]`).map((name) => name.text())

describe('ExpensesByCategoryView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('opens on the current month with fixed and variable, the total and the difference with the previous month', async () => {
    const { api, wrapper } = await mountView()

    // One read of the current month against the previous one: a GET with no body.
    expect(api.calls).toEqual([
      {
        method: 'GET',
        path: '/api/expenses-by-category',
        search: '?month=2026-09&compare=previous-month',
        body: undefined,
      },
    ])

    const total = wrapper.get('[data-test="expenses-total"]')
    expect(total.text()).toContain('Total spent')
    expect(total.get('[data-test="money"]').text()).toBe(eur('714,20'))
    expect(text(wrapper, 'expenses-compared')).toBe(
      `August 2026: ${eur('688,34')} · +${eur('25,86')}`,
    )

    // Fixed, then Variable, each with the backend's figures and its lines in order.
    const groups = wrapper.findAll('[data-test="group-fixed"], [data-test="group-variable"]')
    expect(groups.map((group) => group.get('[data-test="group-title"]').text())).toEqual([
      'Fixed',
      'Variable',
    ])
    expect(text(wrapper, 'group-fixed')).toContain(eur('612,37'))
    const variable = wrapper.get('[data-test="group-variable"]')
    expect(variable.get('[data-test="group-amount"]').text()).toBe(eur('101,83'))
    expect(variable.get('[data-test="group-compared"]').text()).toBe(`August 2026: ${eur('75,97')}`)
    expect(variable.get('[data-test="group-difference"]').text()).toBe(`+${eur('25,86')}`)
    expect(lineNames(wrapper, 'fixed')).toEqual(['Vivienda'])
    expect(lineNames(wrapper, 'variable')).toEqual(['Combustible', 'No category', 'Restaurantes'])
    // The columns name the two periods.
    expect(variable.get('[data-test="group-columns"]').text()).toContain('September 2026')
    expect(variable.get('[data-test="group-columns"]').text()).toContain('August 2026')
    expect(variable.get('[data-test="group-columns"]').text()).not.toContain('A month')
  })

  it('shows the sentence before any figure', async () => {
    const { wrapper } = await mountView()

    const order = [
      ...wrapper.element.querySelectorAll(
        '[data-test="expenses-sentence"], [data-test="money"], [data-test="group-amount"], [data-test="line-amount"]',
      ),
    ].map((element) => element.getAttribute('data-test'))
    expect(order[0]).toBe('expenses-sentence')
    expect(order.slice(1)).not.toContain('expenses-sentence')
    // The month is today's: it is still running.
    expect(text(wrapper, 'expenses-sentence')).toBe(
      `So far in September 2026 you spent ${eur('714,20')}, ${eur('25,86')} more than in the whole of August 2026.`,
    )
  })

  it('switching to a year shows the year and the monthly average of each category', async () => {
    const { api, router, wrapper } = await mountView(
      '/expenses-by-category?month=2025-03&compare=same-month-last-year',
      [json(rawMonth()), json(rawYear())],
    )

    await wrapper.get('[data-test="period-mode-year"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ year: '2025' })
    expect(api.calls.map((call) => call.search)).toEqual([
      '?month=2025-03&compare=same-month-last-year',
      '?year=2025',
    ])
    expect(text(wrapper, 'period-year-label')).toBe('2025')
    expect(has(wrapper, 'period-compare')).toBe(false)
    expect(text(wrapper, 'expenses-sentence')).toBe(
      `In 2025 you spent ${eur('8.864,14')}, ${eur('76,02')} more than in 2024.`,
    )
    expect(wrapper.get('[data-test="expenses-total"] [data-test="money"]').text()).toBe(
      eur('8.864,14'),
    )
    expect(text(wrapper, 'group-columns')).toContain('A month')
    expect(wrapper.findAll('[data-test="line-monthly"]').map((monthly) => monthly.text())).toEqual([
      eur('612,37'),
      eur('122,60'),
      eur('3,71'),
      eur('0,00'),
    ])

    // And back to a month: December of that year, against the previous month.
    await wrapper.get('[data-test="period-mode-month"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ month: '2025-12', compare: 'previous-month' })
  })

  it('asks the same month last year when that comparison is chosen', async () => {
    const { api, router, wrapper } = await mountView(
      '/expenses-by-category?month=2026-08&compare=previous-month',
    )

    await wrapper.get('[data-test="period-compare"] select').setValue('same-month-last-year')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({
      month: '2026-08',
      compare: 'same-month-last-year',
    })
    expect(api.calls.map((call) => call.search)).toEqual([
      '?month=2026-08&compare=previous-month',
      '?month=2026-08&compare=same-month-last-year',
    ])
    expect(
      (wrapper.get('[data-test="period-compare"] select').element as HTMLSelectElement).value,
    ).toBe('same-month-last-year')

    // The month arrows keep the comparison.
    await wrapper.get('[data-test="statement-prev"]').trigger('click')
    await flushPromises()
    expect(api.calls.at(-1)?.search).toBe('?month=2026-07&compare=same-month-last-year')
  })

  it('expanding a category lists its movements of the period', async () => {
    const { api, wrapper } = await mountView()

    const fuel = wrapper.findAll('[data-test="group-variable"] [data-test="category-line"]')[0]!
    await fuel.get('[data-test="line-toggle"]').trigger('click')

    expect(
      fuel
        .findAll('[data-test="line-movement"]')
        .map((row) => [
          row.get('[data-test="line-movement-date"]').text(),
          row.get('[data-test="line-movement-description"]').text(),
          row.get('[data-test="line-movement-amount"]').text(),
        ]),
    ).toEqual([
      [formatDate('2026-09-24'), 'ESTACION SERVICIO INVENTADA', formatMoney('39.63')],
      [formatDate('2026-09-12'), 'ESTACION SERVICIO INVENTADA', formatMoney('47.83')],
    ])
    // Only that line opened, and nothing was asked again.
    expect(wrapper.findAll('[data-test="line-movements"]')).toHaveLength(1)
    expect(api.calls).toHaveLength(1)

    // Several can be open at once.
    await wrapper.get('[data-test="group-fixed"] [data-test="line-toggle"]').trigger('click')
    expect(wrapper.findAll('[data-test="line-movements"]')).toHaveLength(2)
  })

  it('says how many movements have no category and how much of the spending they are', async () => {
    const { wrapper } = await mountView()

    expect(text(wrapper, 'expenses-uncategorized-line')).toBe(
      `1 movement with no category — 2,0${NBSP}% of the spending`,
    )
    // Above the groups, and the line with no category is its own line in Variable.
    const order = [
      ...wrapper.element.querySelectorAll(
        '[data-test="expenses-uncategorized"], [data-test="group-fixed"]',
      ),
    ].map((element) => element.getAttribute('data-test'))
    expect(order).toEqual(['expenses-uncategorized', 'group-fixed'])
    const line = wrapper.findAll('[data-test="group-variable"] [data-test="category-line"]')[1]!
    expect(line.get('[data-test="line-name"]').text()).toBe('No category')
    expect(line.get('[data-test="share-bar-fill"]').classes()).toContain('bg-chart-4')

    vi.restoreAllMocks()
    const all = await mountView('/expenses-by-category', [json(rawAllCategorized())])
    expect(text(all.wrapper, 'expenses-uncategorized-line')).toBe(
      'All of the spending in this period has a category.',
    )
  })

  it('shows the total exactly as the backend sent it', async () => {
    // The compared figures are not checked: they are painted as they come.
    const raw = rawMonth()
    raw.comparedAmount = '700.01'
    const { wrapper } = await mountView('/expenses-by-category', [json(raw)])

    expect(wrapper.get('[data-test="expenses-total"] [data-test="money"]').text()).toBe(
      formatMoney('714.20'),
    )
    expect(text(wrapper, 'expenses-compared')).toBe(
      `August 2026: ${eur('700,01')} · +${eur('25,86')}`,
    )

    // A response whose groups or lines do not add up shows none of its figures.
    for (const broken of [rawFixedNotAddingUp(), { ...rawMonth(), amount: '714.21' }]) {
      vi.restoreAllMocks()
      const failed = await mountView('/expenses-by-category', [json(broken)])
      expect(text(failed.wrapper, 'expenses-error-message')).toBe(
        "The server answered, but the spending couldn't be read.",
      )
      expect(has(failed.wrapper, 'money')).toBe(false)
      expect(has(failed.wrapper, 'expenses-sentence')).toBe(false)
      expect(has(failed.wrapper, 'group-fixed')).toBe(false)
    }
  })

  it('says the backend failed and asks again on Try again', async () => {
    const { api, wrapper } = await mountView('/expenses-by-category?year=2025', [
      json(SERVER_ERROR_BODY, 500),
      json(rawYear()),
    ])

    expect(text(wrapper, 'expenses-error-message')).toBe(
      'Something went wrong loading your spending.',
    )
    // The backend's own words are never painted.
    expect(wrapper.text()).not.toContain('Error interno')
    expect(has(wrapper, 'money')).toBe(false)

    await wrapper.get('[data-test="expenses-retry"]').trigger('click')
    await flushPromises()

    expect(api.calls.map((call) => call.search)).toEqual(['?year=2025', '?year=2025'])
    expect(has(wrapper, 'expenses-error')).toBe(false)
    expect(wrapper.get('[data-test="expenses-total"] [data-test="money"]').text()).toBe(
      eur('8.864,14'),
    )

    vi.restoreAllMocks()
    const down = await mountView('/expenses-by-category', [networkDown])
    expect(text(down.wrapper, 'expenses-error-message')).toBe("Couldn't reach the server.")
  })

  it('says there was no spending in an empty period', async () => {
    const { wrapper } = await mountView('/expenses-by-category', [json(rawEmpty())])

    expect(text(wrapper, 'expenses-sentence')).toBe(
      'No spending counted in September 2026 or in August 2026.',
    )
    expect(wrapper.findAll('[data-test="group-empty"]').map((empty) => empty.text())).toEqual([
      'Nothing spent here in either period.',
      'Nothing spent here in either period.',
    ])
    expect(has(wrapper, 'category-line')).toBe(false)
    expect(text(wrapper, 'expenses-uncategorized-line')).toBe(
      'All of the spending in this period has a category.',
    )
  })
})
