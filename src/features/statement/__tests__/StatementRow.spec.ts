import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseCategories } from '@/shared/categories'
import { parseMovement } from '@/shared/movements'
import type { Movement } from '@/shared/movements'
import { createValidators } from '@/shared/validation'
import { formatMoney } from '@/shared/money'

import StatementRow from '../components/StatementRow.vue'
import { CATEGORIES, EXPENSE, INCOME, NEUTRAL, TRANSFER, excluded, movement } from './fixtures'

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

  // --- The selection mode and the mark (feature 22) ---

  describe('the checkbox of the selection mode (R4, R5, R6)', () => {
    it('paints NO checkbox while the mode is off (R4)', () => {
      const row = mountRow(EXPENSE)

      expect(row.find('[data-test="statement-row-select"]').exists()).toBe(false)
      expect(row.find('input[type="checkbox"]').exists()).toBe(false)
    })

    it('paints one checkbox per row while the mode is on, named after the movement (R5)', () => {
      const row = mountRow(EXPENSE, { selectable: true })

      const box = row.get('[data-test="statement-row-select"] input')
      expect(box.attributes('aria-label')).toBe('Select CAFETERÍA CENTRAL')
      expect((box.element as HTMLInputElement).checked).toBe(false)
    })

    it('shows the row as ticked and asks the parent to toggle it', async () => {
      const row = mountRow(EXPENSE, { selectable: true, selected: true })
      const box = row.get('[data-test="statement-row-select"] input')
      expect((box.element as HTMLInputElement).checked).toBe(true)

      await box.setValue(false)

      expect(row.emitted('toggle')).toHaveLength(1)
    })

    it('stops the category badge from being pressable in that mode (R6)', () => {
      const off = mountRow(EXPENSE)
      expect(off.find('[data-test="statement-row-category-button"]').exists()).toBe(true)

      const on = mountRow(EXPENSE, { selectable: true })

      expect(on.find('[data-test="statement-row-category-button"]').exists()).toBe(false)
      expect(on.find('button').exists()).toBe(false)
      // The badge is still there: it is not pressable, it has not gone.
      expect(on.get('[data-test="statement-row-category"]').text()).toBe('Food')
    })

    it('gives the badge back as a button when the mode is turned off again (R6)', async () => {
      const row = mountRow(EXPENSE, { selectable: true })

      await row.setProps({ selectable: false })

      expect(row.find('[data-test="statement-row-category-button"]').exists()).toBe(true)
      expect(row.find('[data-test="statement-row-select"]').exists()).toBe(false)
    })

    it('disables the checkbox while a write is in flight (C5)', () => {
      const row = mountRow(EXPENSE, { selectable: true, busy: true })

      expect(
        (row.get('[data-test="statement-row-select"] input').element as HTMLInputElement).disabled,
      ).toBe(true)
    })
  })

  describe('a movement that does not count in the figures (R8, R9)', () => {
    it('carries the `Not counted` badge, with its reason', () => {
      const row = mountRow(excluded(EXPENSE))

      const badge = row.get('[data-test="statement-row-excluded"]')
      expect(badge.text()).toBe('Not counted')
      expect(badge.attributes('title')).toBe("Not counted in this month's figures")
    })

    it('has no badge at all when it is not marked', () => {
      expect(mountRow(EXPENSE).find('[data-test="statement-row-excluded"]').exists()).toBe(false)
    })

    it('lives next to the Transfer badge, both at once', () => {
      const row = mountRow(excluded(TRANSFER))

      expect(row.find('[data-test="statement-row-transfer"]').exists()).toBe(true)
      expect(row.find('[data-test="statement-row-excluded"]').exists()).toBe(true)
    })

    it('greys the amount out without changing it, and adds no other marking (🔴 2)', () => {
      const plain = mountRow(EXPENSE).get('[data-test="statement-row-amount"]')
      const marked = mountRow(excluded(EXPENSE)).get('[data-test="statement-row-amount"]')

      expect(marked.text()).toBe(plain.text())
      expect(marked.classes()).toContain('text-ink-muted')
      expect(plain.classes()).toContain('text-ink-strong')
      // No coloured row, no strikethrough, no side stripe.
      const row = mountRow(excluded(EXPENSE))
      expect(row.get('[data-test="statement-row"]').classes().join(' ')).toBe(
        mountRow(EXPENSE).get('[data-test="statement-row"]').classes().join(' '),
      )
      expect(marked.classes().join(' ')).not.toContain('line-through')
    })

    it('greys an income out too, sign and figure untouched', () => {
      const marked = mountRow(excluded(INCOME)).get('[data-test="statement-row-amount"]')

      expect(marked.text()).toBe(formatMoney('1200.00'))
      expect(marked.classes()).toContain('text-ink-muted')
      expect(marked.classes()).not.toContain('text-positive')
    })
  })
})
