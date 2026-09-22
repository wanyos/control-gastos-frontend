import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import MovementRow from '../components/MovementRow.vue'
import { parseCategories, parseMovementPage } from '../service'
import type { Movement } from '../types'
import { CATEGORY_TREE, EXPENSE, INCOME, NEUTRAL, PAGE_OF_THREE } from './fixtures'

const categories = parseCategories(CATEGORY_TREE)

// Class names are composed at runtime: a literal in a spec would end up in the
// production CSS, because Tailwind scans src/ as text (docs/stack.md).
const cls = (...parts: string[]) => parts.join('-')

const movementOf = (raw: unknown): Movement => {
  const [movement] = parseMovementPage({ ...PAGE_OF_THREE, movements: [raw] }).movements
  if (!movement) throw new Error('fixture has no movement')
  return movement
}

const rowOf = (raw: unknown) =>
  mount(MovementRow, { props: { movement: movementOf(raw), categories } })

describe('MovementRow (R4)', () => {
  it('shows an expense with a minus sign and the strong ink', () => {
    const wrapper = rowOf(EXPENSE)

    const amount = wrapper.get('[data-test="movement-amount"]')
    expect(amount.text()).toBe(formatMoney('-45.37'))
    expect(amount.classes()).toEqual(
      expect.arrayContaining([
        cls('font', 'mono'),
        cls('tabular', 'nums'),
        cls('text', 'ink', 'strong'),
      ]),
    )
  })

  it('shows an income in the positive tone, without a sign', () => {
    const wrapper = rowOf(INCOME)

    const amount = wrapper.get('[data-test="movement-amount"]')
    expect(amount.text()).toBe(formatMoney('1200.00'))
    expect(amount.classes()).toContain(cls('text', 'positive'))
  })

  it('shows a neutral movement as zero, in a muted tone', () => {
    const wrapper = rowOf(NEUTRAL)

    const amount = wrapper.get('[data-test="movement-amount"]')
    expect(amount.text()).toBe(formatMoney('0.00'))
    expect(amount.classes()).toContain(cls('text', 'ink', 'muted'))
  })

  it('shows the description, the account and the booking date', () => {
    const wrapper = rowOf(EXPENSE)

    expect(wrapper.get('[data-test="movement-description"]').text()).toBe('CAFETERÍA CENTRAL')
    expect(wrapper.get('[data-test="movement-account"]').text()).toBe(
      'Bankinter · bankinter ···0236',
    )
    // Generated, never typed: ICU may change the month abbreviation.
    expect(wrapper.get('[data-test="movement-date"]').text()).toBe(formatDate('2026-07-31'))
  })

  it('names the category, and marks the movements that have none', () => {
    expect(rowOf(EXPENSE).get('[data-test="movement-category"]').text()).toBe('Food')
    expect(rowOf(INCOME).get('[data-test="movement-category"]').text()).toBe('Uncategorized')
  })

  // Replaces the F15 test that asserted the row had no controls at all (design.md §9).
  it('offers exactly one tick box, one category selector and one Confirm, and nothing else', () => {
    const wrapper = rowOf(EXPENSE)

    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(1)
    expect(boxes[0]?.attributes('aria-label')).toBe('Select CAFETERÍA CENTRAL')
    expect(wrapper.findAll('select')).toHaveLength(1)
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.text()).toBe('Confirm')
  })

  it('never lets the banking fact be edited: no amount, date or description control (C4)', () => {
    const wrapper = rowOf(EXPENSE)

    expect(wrapper.findAll('input:not([type="checkbox"])')).toHaveLength(0)
    expect(wrapper.findAll('textarea')).toHaveLength(0)
    expect(wrapper.get('[data-test="movement-amount"]').element.tagName).toBe('SPAN')
    expect(wrapper.get('[data-test="movement-description"]').element.tagName).toBe('P')
  })

  it('tells its parent what was ticked, chosen and confirmed, without deciding anything', async () => {
    const wrapper = rowOf(EXPENSE)

    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('select').setValue('2')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
    expect(wrapper.emitted('categorize')).toEqual([[2]])
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('marks the selected row with the brand edge, and leaves the rest alone', () => {
    const plain = rowOf(EXPENSE)
    const picked = mount(MovementRow, {
      props: { movement: movementOf(EXPENSE), selected: true, categories },
    })

    expect(picked.get('[data-test="movement-row"]').classes()).toEqual(
      expect.arrayContaining([cls('border', 'brand'), cls('bg', 'surface', 'sunken')]),
    )
    expect(plain.get('[data-test="movement-row"]').classes()).toContain(
      cls('border', 'transparent'),
    )
    expect((picked.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('waits for the action in flight instead of firing a second one (R11)', () => {
    const wrapper = mount(MovementRow, {
      props: { movement: movementOf(EXPENSE), busy: true, categories },
    })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
  })
})
