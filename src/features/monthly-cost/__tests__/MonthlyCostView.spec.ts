import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { formatDate, formatMoney, sumAmounts } from '@/shared/money'

import MonthlyCostView from '../views/MonthlyCostView.vue'
import {
  SERVER_ERROR_BODY,
  deferred,
  json,
  jsonResponse,
  mockBackend,
  rawEmptyRecurringExpenses,
  rawRecurringExpenses,
} from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

async function mountView(
  answers: Parameters<typeof mockBackend>[0] = [json(rawRecurringExpenses())],
) {
  const api = mockBackend(answers)
  const wrapper = mount(MonthlyCostView, {
    global: { plugins: [createPinia()] },
    attachTo: document.body,
  })
  await flushPromises()
  return { api, wrapper }
}

type View = Awaited<ReturnType<typeof mountView>>['wrapper']

const text = (wrapper: View, name: string): string => wrapper.get(`[data-test="${name}"]`).text()
const has = (wrapper: View, name: string): boolean => wrapper.find(`[data-test="${name}"]`).exists()
const titles = (rows: ReturnType<View['findAll']>): string[] =>
  rows.map((row) => row.get('[data-test="bill-title"]').text())

describe('MonthlyCostView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('shows the monthly total and the period it comes from at the top', async () => {
    const { api, wrapper } = await mountView()

    const total = wrapper.get('[data-test="monthly-cost-total"]')
    expect(total.text()).toContain('What a month costs')
    expect(total.get('[data-test="money"]').text()).toBe(eur('356,05'))
    expect(text(wrapper, 'monthly-cost-period')).toBe(
      'Monthly average of the 12 complete months before this one: October 2025 to September 2026.',
    )
    // The figure comes before any block.
    const order = [
      ...wrapper.element.querySelectorAll(
        '[data-test="monthly-cost-total"], [data-test="bills-block"], [data-test="people-block"], [data-test="variable-block"]',
      ),
    ].map((element) => element.getAttribute('data-test'))
    expect(order).toEqual(['monthly-cost-total', 'bills-block', 'people-block', 'variable-block'])
    // One read, a GET with no body.
    expect(api.calls).toEqual([
      { method: 'GET', path: '/api/recurring-expenses', search: '', body: undefined },
    ])
  })

  it('says how many bills went up under the total', async () => {
    const { wrapper } = await mountView()

    expect(text(wrapper, 'monthly-cost-increased')).toBe(
      '2 of 6 bills went up since their previous charge.',
    )
    expect(
      wrapper
        .find('[data-test="monthly-cost-total"] [data-test="monthly-cost-increased"]')
        .exists(),
    ).toBe(true)
  })

  it('keeps the bills from most to least expensive a month', async () => {
    const { wrapper } = await mountView()

    const charged = wrapper
      .findAll('[data-test="bills-block"] [data-test="bill-row"]')
      .filter((row) => row.element.closest('details') === null)
    expect(titles(charged)).toEqual([
      'Comunidad vecinos',
      'Telefonia ficticia',
      'Gimnasio inventado',
      'Seguro hogar',
    ])
    expect(charged.map((row) => row.get('[data-test="bill-monthly-cost"]').text())).toEqual([
      eur('147,00'),
      eur('37,68'),
      eur('26,90'),
      eur('16,44'),
    ])
    // As the contract sends them: the screen does not sort them again.
    const raw = rawRecurringExpenses()
    raw.bills = [raw.bills[3]!, raw.bills[0]!, raw.bills[1]!, raw.bills[2]!]
    vi.restoreAllMocks()
    const swapped = await mountView([json(raw)])
    expect(titles(swapped.wrapper.findAll('[data-test="bill-row"]'))).toEqual([
      'Seguro hogar',
      'Comunidad vecinos',
      'Telefonia ficticia',
      'Gimnasio inventado',
    ])
  })

  it('puts the bills with no charges in the period at the end and folded', async () => {
    const { wrapper } = await mountView()

    const folded = wrapper.get('[data-test="bills-without-charges"]')
    expect(folded.element.tagName).toBe('DETAILS')
    expect(folded.attributes('open')).toBeUndefined()
    expect((folded.element as HTMLDetailsElement).open).toBe(false)
    expect(folded.get('summary').text()).toBe(
      '2 bills with no charges between October 2025 and September 2026',
    )
    expect(titles(folded.findAll('[data-test="bill-row"]'))).toEqual([
      'Academia idiomas',
      'Revista ficticia',
    ])

    const rows = wrapper.findAll('[data-test="bill-row"]')
    expect(rows).toHaveLength(6)
    const lastCharged = rows[3]!.element
    expect(titles([rows[3]!])).toEqual(['Seguro hogar'])
    expect(lastCharged.compareDocumentPosition(folded.element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )

    // Without bills at zero, there is nothing folded.
    const raw = rawRecurringExpenses()
    raw.bills = raw.bills.slice(0, 4)
    vi.restoreAllMocks()
    const none = await mountView([json(raw)])
    expect(has(none.wrapper, 'bills-without-charges')).toBe(false)
  })

  it('shows what is sent to people as a group apart with its monthly cost', async () => {
    const { wrapper } = await mountView()

    const block = wrapper.get('[data-test="people-block"]')
    expect(block.get('[data-test="block-title"]').text()).toBe('Sent to people')
    const row = block.get('[data-test="people-row"]')
    expect(row.get('[data-test="group-title"]').text()).toBe('Transfers to people')
    expect(row.get('[data-test="group-monthly-cost"]').text()).toBe(eur('118,50'))
    // Apart: neither among the bills nor in the variable spending.
    expect(wrapper.get('[data-test="bills-block"]').text()).not.toContain('Transfers to people')
    expect(wrapper.get('[data-test="variable-block"]').text()).not.toContain('Transfers to people')
  })

  it('shows the variable spending by category with the monthly cost of each', async () => {
    const { wrapper } = await mountView()

    const block = wrapper.get('[data-test="variable-block"]')
    expect(block.get('[data-test="block-title"]').text()).toBe('Variable spending')
    const rows = block.findAll('[data-test="variable-row"]')
    expect(
      rows.map((row) => [
        row.get('[data-test="group-title"]').text(),
        row.get('[data-test="group-monthly-cost"]').text(),
      ]),
    ).toEqual([
      ['Combustible', eur('8,33')],
      ['No category', eur('1,20')],
    ])
  })

  it('opens the group sent to people and a category to list their charges', async () => {
    const { wrapper } = await mountView()

    const people = wrapper.get('[data-test="people-row"]')
    const peopleToggle = people.get('[data-test="group-toggle"]')
    expect(peopleToggle.text()).toBe('Show charges')
    await peopleToggle.trigger('click')

    expect(peopleToggle.text()).toBe('Hide charges')
    expect(peopleToggle.attributes('aria-expanded')).toBe('true')
    expect(people.get('[data-test="charge-list-heading"]').text()).toBe(
      '2 charges in these 12 months, newest first',
    )
    expect(
      people
        .findAll('[data-test="charge"]')
        .map((charge) => [
          charge.get('[data-test="charge-date"]').text(),
          charge.get('[data-test="charge-amount"]').text(),
        ]),
    ).toEqual([
      [formatDate('2026-08-14'), formatMoney('114.40')],
      [formatDate('2025-12-19'), formatMoney('1307.60')],
    ])

    // Several open at once: a category and a bill too.
    const noCategory = wrapper.findAll('[data-test="variable-row"]')[1]!
    await noCategory.get('[data-test="group-toggle"]').trigger('click')
    expect(noCategory.get('[data-test="charge-list-heading"]').text()).toBe(
      '1 charge in these 12 months',
    )
    expect(noCategory.get('[data-test="charge-description"]').text()).toBe(
      'COMPRA SIN CATEGORIA INVENTADA',
    )
    await wrapper.get('[data-test="bill-toggle"]').trigger('click')
    expect(wrapper.findAll('[data-test="charge-list"]')).toHaveLength(3)

    // Closing one leaves the others open.
    await peopleToggle.trigger('click')
    expect(people.find('[data-test="charge-list"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="charge-list"]')).toHaveLength(2)
  })

  it('shows block subtotals that add up to the figure at the top', async () => {
    const { wrapper } = await mountView()

    const subtotals = wrapper.findAll('[data-test="block-subtotal"]').map((node) => node.text())
    expect(subtotals).toEqual([eur('228,02'), eur('118,50'), eur('9,53')])
    expect(sumAmounts(['228.02', '118.50', '9.53'])).toBe(rawRecurringExpenses().monthlyTotal)
    expect(wrapper.get('[data-test="monthly-cost-total"] [data-test="money"]').text()).toBe(
      formatMoney(rawRecurringExpenses().monthlyTotal),
    )
    // Every entry of the response has its row, the folded ones too.
    const raw = rawRecurringExpenses()
    expect(wrapper.findAll('[data-test="bill-row"]')).toHaveLength(raw.bills.length)
    expect(wrapper.findAll('[data-test="people-row"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-test="variable-row"]')).toHaveLength(raw.variable.length)
    const shown = [
      ...wrapper.findAll('[data-test="bill-monthly-cost"]'),
      ...wrapper.findAll('[data-test="group-monthly-cost"]'),
    ].map((node) => node.text())
    expect(shown).toEqual(
      [
        ...raw.bills.map((bill) => bill.monthlyCost),
        raw.transfersToPeople.monthlyCost,
        ...raw.variable.map((entry) => entry.monthlyCost),
      ].map(formatMoney),
    )
  })

  it('shows a loading line and no figures until the answer arrives', async () => {
    const answer = deferred()
    const { wrapper } = await mountView([() => answer.promise])

    expect(text(wrapper, 'monthly-cost-loading')).toBe('Reading what a month costs…')
    expect(has(wrapper, 'money')).toBe(false)
    expect(has(wrapper, 'monthly-cost-total')).toBe(false)
    expect(has(wrapper, 'block-subtotal')).toBe(false)
    expect(wrapper.text()).not.toContain('€')

    answer.resolve(jsonResponse(rawRecurringExpenses()))
    await flushPromises()

    expect(has(wrapper, 'monthly-cost-loading')).toBe(false)
    expect(wrapper.get('[data-test="money"]').text()).toBe(eur('356,05'))
  })

  it('says the backend failed and asks again on Try again', async () => {
    const { api, wrapper } = await mountView([
      json(SERVER_ERROR_BODY, 500),
      json(rawRecurringExpenses()),
    ])

    expect(text(wrapper, 'monthly-cost-error')).toBe(
      'Something went wrong loading the monthly cost.',
    )
    expect(text(wrapper, 'monthly-cost-retry')).toBe('Try again')
    expect(has(wrapper, 'money')).toBe(false)
    expect(has(wrapper, 'block-subtotal')).toBe(false)
    expect(api.calls).toHaveLength(1)

    await wrapper.get('[data-test="monthly-cost-retry"]').trigger('click')
    await flushPromises()

    expect(api.calls).toHaveLength(2)
    expect(api.calls.every((call) => call.method === 'GET')).toBe(true)
    expect(has(wrapper, 'monthly-cost-error')).toBe(false)
    expect(wrapper.get('[data-test="money"]').text()).toBe(eur('356,05'))
    expect(wrapper.findAll('[data-test="block-subtotal"]')).toHaveLength(3)
  })

  it('says it could not read a response that does not add up', async () => {
    const raw = rawRecurringExpenses()
    raw.variable[1]!.monthlyCost = '1.21'
    const { wrapper } = await mountView([json(raw)])

    expect(text(wrapper, 'monthly-cost-error')).toBe(
      "The server answered, but the monthly cost couldn't be read.",
    )
    expect(has(wrapper, 'money')).toBe(false)
  })

  it('shows the figure and one sentence when nothing counts', async () => {
    const { wrapper } = await mountView([json(rawEmptyRecurringExpenses())])

    expect(wrapper.get('[data-test="money"]').text()).toBe(eur('0,00'))
    expect(text(wrapper, 'monthly-cost-period')).toBe(
      'Monthly average of the 12 complete months before this one: October 2025 to September 2026.',
    )
    expect(text(wrapper, 'monthly-cost-empty')).toBe(
      'Nothing counts as spending in these 12 months.',
    )
    expect(has(wrapper, 'monthly-cost-increased')).toBe(false)
    expect(has(wrapper, 'bills-block')).toBe(false)
    expect(has(wrapper, 'people-block')).toBe(false)
    expect(has(wrapper, 'variable-block')).toBe(false)
  })
})
