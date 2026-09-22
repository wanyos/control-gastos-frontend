import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import MovementCategorySelect from '../components/MovementCategorySelect.vue'
import { parseCategories, parseMovementPage } from '../service'
import type { Movement } from '../types'
import { CATEGORY_TREE, EXPENSE, INCOME, NEUTRAL, PAGE_OF_THREE } from './fixtures'

const categories = parseCategories(CATEGORY_TREE)

const movementOf = (raw: unknown): Movement => {
  const [movement] = parseMovementPage({ ...PAGE_OF_THREE, movements: [raw] }).movements
  if (!movement) throw new Error('fixture has no movement')
  return movement
}

const selectOf = (raw: unknown, props: Record<string, unknown> = {}) =>
  mount(MovementCategorySelect, { props: { movement: movementOf(raw), categories, ...props } })

const options = (wrapper: ReturnType<typeof selectOf>) =>
  wrapper.findAll('option').map((option) => option.text())

describe('MovementCategorySelect (R4)', () => {
  it('offers only the expense categories to an expense, plus No category', () => {
    const wrapper = selectOf(EXPENSE)

    expect(options(wrapper)).toEqual(['No category', 'Food', 'Groceries', 'Restaurants'])
    expect(wrapper.text()).not.toContain('Salary')
  })

  it('offers only the income categories to an income', () => {
    const wrapper = selectOf(INCOME)

    expect(options(wrapper)).toEqual(['No category', 'Salary'])
  })

  it('shows the category the movement already has', () => {
    const wrapper = selectOf(EXPENSE)

    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('1')
    expect((selectOf(INCOME).get('select').element as HTMLSelectElement).value).toBe('')
  })

  it('emits the chosen category, and null when the choice is No category', async () => {
    const wrapper = selectOf(EXPENSE)

    await wrapper.get('select').setValue('2')
    await wrapper.get('select').setValue('')

    expect(wrapper.emitted('change')).toEqual([[2], [null]])
  })

  it('turns itself off for a neutral movement, and says why', () => {
    const wrapper = selectOf(NEUTRAL)

    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain("Neutral movements can't be categorized")
    expect(options(wrapper)).toEqual(['No category'])
  })

  it('turns itself off while an action is running, and when the tree failed to load', () => {
    expect(selectOf(EXPENSE, { disabled: true }).get('select').attributes('disabled')).toBeDefined()
    expect(
      selectOf(EXPENSE, { categories: null }).get('select').attributes('disabled'),
    ).toBeDefined()
  })

  it('keeps its label for assistive technology without painting it on every row', () => {
    const wrapper = selectOf(EXPENSE)

    const label = wrapper.get('label')
    expect(label.text()).toBe('Category')
    expect(label.classes()).toContain(['sr', 'only'].join('-'))
  })
})
