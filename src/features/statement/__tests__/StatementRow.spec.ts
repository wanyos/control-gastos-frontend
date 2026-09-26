import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseMovement } from '@/shared/movements'
import type { Movement } from '@/shared/movements'
import { createValidators } from '@/shared/validation'
import { formatMoney } from '@/shared/money'

import StatementRow from '../components/StatementRow.vue'
import { EXPENSE, INCOME, NEUTRAL, TRANSFER, movement } from './fixtures'

const checks = createValidators('test')
const parse = (raw: Record<string, unknown>): Movement => parseMovement(checks, raw, 'movement')

const mountRow = (raw: Record<string, unknown>) =>
  mount(StatementRow, { props: { movement: parse(raw) } })

const text = (raw: Record<string, unknown>) => mountRow(raw).text()

describe('StatementRow (R9, R10)', () => {
  it('shows the description, the account, the category and the amount', () => {
    const row = mountRow(EXPENSE)

    expect(row.get('[data-test="statement-row-description"]').text()).toBe('CAFETERÍA CENTRAL')
    expect(row.get('[data-test="statement-row-account"]').text()).toBe(
      'Bankinter · bankinter ···0236',
    )
    expect(row.get('[data-test="statement-row-category"]').text()).toBe('Food')
    expect(row.get('[data-test="statement-row-amount"]').text()).toBe(formatMoney('-45.37'))
  })

  it('takes the sign from `type`, not from the amount', () => {
    expect(text(EXPENSE)).toContain(formatMoney('-45.37'))
    expect(text(INCOME)).toContain(formatMoney('1200.00'))
    expect(text(NEUTRAL)).toContain(formatMoney('0.00'))
  })

  it('says Uncategorized when the movement has no category', () => {
    expect(mountRow(NEUTRAL).get('[data-test="statement-row-category"]').text()).toBe(
      'Uncategorized',
    )
  })

  it('never paints the balance after the movement, even when the file brings it', () => {
    const row = mountRow(EXPENSE)

    expect(parse(EXPENSE).balanceAfter).toBe('9954.63')
    expect(row.text()).not.toContain('9954')
    expect(row.text()).not.toContain('9.954')
    expect(row.html()).not.toContain('balance')
  })

  it('does not repeat the date: the day header above the row carries it (R8)', () => {
    expect(text(EXPENSE)).not.toContain('11 Sept 2026')
    expect(text(EXPENSE)).not.toContain('2026-09-11')
  })

  it('marks a paired transfer, and only a paired transfer', () => {
    const marked = mountRow(TRANSFER).find('[data-test="statement-row-transfer"]')

    expect(marked.exists()).toBe(true)
    expect(marked.text()).toBe('Transfer')
    expect(marked.attributes('aria-label')).toBe(
      "Paired transfer: not counted in this month's figures",
    )
    expect(mountRow(EXPENSE).find('[data-test="statement-row-transfer"]').exists()).toBe(false)
  })

  it('carries no control: this row writes nothing (C1)', () => {
    const row = mountRow(EXPENSE)

    expect(row.findAll('button')).toHaveLength(0)
    expect(row.findAll('input')).toHaveLength(0)
    expect(row.findAll('select')).toHaveLength(0)
  })

  it('shows an unknown bank slug as it comes', () => {
    const raw = movement({
      ...EXPENSE,
      account: {
        id: 9,
        iban: 'ES00',
        bank: 'sabadell',
        alias: 'sabadell ···1111',
        type: 'checking',
      },
    })

    expect(mountRow(raw).get('[data-test="statement-row-account"]').text()).toBe(
      'sabadell · sabadell ···1111',
    )
  })
})
