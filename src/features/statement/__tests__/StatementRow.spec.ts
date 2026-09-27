import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseCategories } from '@/shared/categories'
import { parseMovement } from '@/shared/movements'
import type { Movement } from '@/shared/movements'
import { createValidators } from '@/shared/validation'
import { formatMoney } from '@/shared/money'

import StatementRow from '../components/StatementRow.vue'
import { CATEGORIES, EXPENSE, INCOME, NEUTRAL, TRANSFER, movement } from './fixtures'

const checks = createValidators('test')
const parse = (raw: Record<string, unknown>): Movement => parseMovement(checks, raw, 'movement')
const tree = parseCategories(CATEGORIES)

const mountRow = (raw: Record<string, unknown>, props: Record<string, unknown> = {}) =>
  mount(StatementRow, { props: { movement: parse(raw), ...props } })

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

  // Feature 21: the row gained ONE control, its category badge. Everything else about
  // the movement is still untouchable from here (C1).
  it('carries no control but the category: nothing else can be written (C1)', () => {
    const row = mountRow(EXPENSE)

    expect(row.findAll('input')).toHaveLength(0)
    expect(row.findAll('select')).toHaveLength(0)
    expect(row.findAll('button').map((button) => button.attributes('data-test'))).toEqual([
      'statement-row-category-button',
    ])
    expect(row.text()).not.toContain('Confirm')
  })

  describe('the category badge is the control (feature 21: R2, R3, R5)', () => {
    it('shows the category as a pressable badge, with no selector in the line (R2)', () => {
      const row = mountRow(EXPENSE)
      const badge = row.get('[data-test="statement-row-category-button"]')

      expect(badge.attributes('aria-label')).toBe('Change category of CAFETERÍA CENTRAL')
      expect(badge.attributes('title')).toBe('Change category')
      expect(badge.text()).toBe('Food')
      expect(row.findAll('select')).toHaveLength(0)
      expect(row.find('[data-test="row-category-editor"]').exists()).toBe(false)
    })

    it('asks to be edited when the badge is pressed, and writes nothing by itself (R3)', async () => {
      const row = mountRow(EXPENSE)

      await row.get('[data-test="statement-row-category-button"]').trigger('click')

      expect(row.emitted('edit')).toHaveLength(1)
      expect(row.emitted('categorize')).toBeUndefined()
    })

    it('replaces the badge by the editor in its own place when this row is edited (R3)', () => {
      const row = mountRow(EXPENSE, { editing: true, categories: tree })

      expect(row.find('[data-test="row-category-editor"]').exists()).toBe(true)
      expect(row.find('[data-test="statement-row-category-button"]').exists()).toBe(false)
      expect(row.findAll('select')).toHaveLength(1)
    })

    it('passes the choice, the rule and the close up (R3, R16)', async () => {
      const row = mountRow(EXPENSE, { editing: true, categories: tree })

      await row.get('select').setValue('2')
      await row.get('[data-test="row-create-rule"]').trigger('click')
      await row.get('[data-test="row-category-close"]').trigger('click')

      expect(row.emitted('categorize')).toEqual([[2]])
      expect(row.emitted('create-rule')).toHaveLength(1)
      expect(row.emitted('close-editor')).toHaveLength(1)
    })

    it('a neutral movement keeps a plain badge, not a button (R5)', () => {
      const row = mountRow(NEUTRAL)

      expect(row.find('[data-test="statement-row-category-button"]').exists()).toBe(false)
      expect(row.findAll('button')).toHaveLength(0)
      expect(row.get('[data-test="statement-row-category"]').attributes('title')).toBe(
        "Neutral movements can't be categorized",
      )
    })

    it('is the same control on a confirmed movement as on a pending one (R6)', () => {
      const pending = mountRow(movement({ ...EXPENSE, status: 'pending_review' }))
      const confirmed = mountRow(EXPENSE)

      expect(
        pending.get('[data-test="statement-row-category-button"]').attributes('aria-label'),
      ).toBe(confirmed.get('[data-test="statement-row-category-button"]').attributes('aria-label'))
    })
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
