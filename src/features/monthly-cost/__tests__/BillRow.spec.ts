import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import BillRow from '../components/BillRow.vue'
import { parseRecurringExpenses } from '../service'
import type { Bill } from '../types'
import { rawRecurringExpenses } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

const billOf = (key: string): Bill => {
  const bill = parseRecurringExpenses(rawRecurringExpenses()).bills.find((b) => b.key === key)
  if (!bill) throw new Error(`no bill ${key} in the fixture`)
  return bill
}

const mountRow = (bill: Bill) => mount(BillRow, { props: { bill } })

type Row = ReturnType<typeof mountRow>

const text = (row: Row, name: string): string => row.get(`[data-test="${name}"]`).text()
const has = (row: Row, name: string): boolean => row.find(`[data-test="${name}"]`).exists()

describe('BillRow', () => {
  it('shows a bill with its name, monthly cost, periodicity, last charge and increase', () => {
    const row = mountRow(billOf('comunidad vecinos'))

    expect(text(row, 'bill-title')).toBe('Comunidad vecinos')
    expect(text(row, 'bill-name')).toBe('RECIBO /COMUNIDAD VECINOS INVENTADA')
    expect(text(row, 'bill-monthly-cost')).toBe(eur('147,00'))
    expect(text(row, 'bill-periodicity')).toBe('Monthly')
    expect(text(row, 'bill-usual')).toBe(`${eur('143,59')} each time`)
    expect(text(row, 'bill-last-date')).toBe(formatDate('2026-09-02'))
    expect(text(row, 'bill-increase')).toBe(`Up ${eur('3,41')}`)
    expect(text(row, 'bill-was')).toBe(`was ${eur('143,59')}`)
    // Nothing of the charges until they are asked for.
    expect(has(row, 'charge-list')).toBe(false)
  })

  it('marks a bill that went up apart from one that went down or stayed the same', () => {
    const up = mountRow(billOf('seguro hogar'))
    const down = mountRow(billOf('gimnasio inventado'))
    const same = mountRow(billOf('telefonia ficticia'))
    const none = mountRow(billOf('academia idiomas'))

    const badge = up.get('[data-test="bill-increase"]')
    expect(badge.text()).toBe(`Up ${eur('9,92')}`)
    expect(badge.classes()).toEqual(expect.arrayContaining(['bg-negative-subtle', 'text-negative']))
    expect(has(up, 'bill-change-text')).toBe(false)

    for (const [row, expected] of [
      [down, `Down ${eur('2,00')}`],
      [same, 'Same'],
      [none, 'No earlier charge'],
    ] as const) {
      expect(has(row, 'bill-increase')).toBe(false)
      expect(has(row, 'bill-was')).toBe(false)
      const muted = row.get('[data-test="bill-change-text"]')
      expect(muted.text()).toBe(expected)
      expect(muted.classes()).toContain('text-ink-muted')
      expect(row.html()).not.toContain('text-negative')
    }
  })

  it('shows an annual bill as yearly with its usual amount each time', () => {
    const row = mountRow(billOf('seguro hogar'))

    expect(text(row, 'bill-periodicity')).toBe('Yearly')
    expect(text(row, 'bill-usual')).toBe(`${eur('187,37')} each time`)
    // A month carries a twelfth of it: the backend's figure, not the yearly charge.
    expect(text(row, 'bill-monthly-cost')).toBe(eur('16,44'))

    // Twice a month: its usual amount is what a month charges.
    const twice = mountRow(billOf('gimnasio inventado'))
    expect(text(twice, 'bill-periodicity')).toBe('Twice a month')
    expect(text(twice, 'bill-usual')).toBe(`${eur('26,90')} a month`)

    // A periodicity the screen does not know is shown as it comes.
    const unknown = mountRow({ ...billOf('seguro hogar'), periodicity: 'every_four_weeks' })
    expect(text(unknown, 'bill-periodicity')).toBe('every_four_weeks')
  })

  it('opens a bill and lists its charges with date and amount', async () => {
    const bill = billOf('seguro hogar')
    const row = mountRow(bill)
    const toggle = row.get('[data-test="bill-toggle"]')

    expect(toggle.text()).toBe('Show charges')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')

    expect(toggle.text()).toBe('Hide charges')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(text(row, 'charge-list-heading')).toBe('All 2 charges, newest first')
    const charges = row.findAll('[data-test="charge"]')
    expect(charges).toHaveLength(2)
    expect(
      charges.map((charge) => [
        charge.get('[data-test="charge-date"]').text(),
        charge.get('[data-test="charge-amount"]').text(),
        charge.get('[data-test="charge-description"]').text(),
      ]),
    ).toEqual(
      bill.charges.map((charge) => [
        formatDate(charge.bookingDate),
        formatMoney(charge.amount),
        charge.description,
      ]),
    )
    expect(charges[0]?.get('[data-test="charge-amount"]').text()).toBe(eur('197,29'))

    await toggle.trigger('click')

    expect(has(row, 'charge-list')).toBe(false)
    expect(toggle.text()).toBe('Show charges')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    // A bill with one charge says so.
    const once = mountRow(billOf('academia idiomas'))
    await once.get('[data-test="bill-toggle"]').trigger('click')
    expect(text(once, 'charge-list-heading')).toBe('The only charge')
  })
})
