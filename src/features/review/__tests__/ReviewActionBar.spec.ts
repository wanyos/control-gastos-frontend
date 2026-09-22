import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ReviewActionBar from '../components/ReviewActionBar.vue'
import { parseCategories } from '../service'
import { CATEGORY_TREE } from './fixtures'

const categories = parseCategories(CATEGORY_TREE)

const barOf = (props: Record<string, unknown> = {}) =>
  mount(ReviewActionBar, {
    props: { selectedCount: 3, eligibleCount: 3, choice: '', categories, ...props },
  })

describe('ReviewActionBar (R6, R7, R11)', () => {
  it('counts what is selected and carries the number inside the button', () => {
    const wrapper = barOf()

    expect(wrapper.get('[data-test="selected-count"]').text()).toBe('3 selected')
    expect(wrapper.get('[data-test="confirm-selected"]').text()).toBe('Confirm 3 movements')
  })

  it('says one movement in singular', () => {
    expect(barOf({ selectedCount: 1 }).get('[data-test="confirm-selected"]').text()).toBe(
      'Confirm 1 movement',
    )
  })

  it('offers both kinds of category plus removing it, and nothing is chosen at first', () => {
    const wrapper = barOf()

    const options = wrapper.findAll('option').map((option) => option.text())
    expect(options).toEqual([
      'Choose a category…',
      'Remove category',
      'Food',
      'Groceries',
      'Restaurants',
      'Salary',
    ])
    expect(wrapper.find('[data-test="applies-to"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="apply-category"]').attributes('disabled')).toBeDefined()
  })

  it('says how many of the selection the chosen category reaches (R7)', () => {
    const wrapper = barOf({ choice: '2', eligibleCount: 2, selectedCount: 4 })

    expect(wrapper.get('[data-test="applies-to"]').text()).toBe('Applies to 2 of 4 selected')
    expect(wrapper.get('[data-test="apply-category"]').attributes('disabled')).toBeUndefined()
  })

  it('refuses to send an action that would reach nobody (R7)', () => {
    const wrapper = barOf({ choice: '4', eligibleCount: 0, selectedCount: 4 })

    expect(wrapper.get('[data-test="applies-to"]').text()).toBe('Applies to 0 of 4 selected')
    expect(wrapper.get('[data-test="apply-category"]').attributes('disabled')).toBeDefined()
  })

  it('reports the chosen category, the two actions and the clearing, deciding nothing', async () => {
    const wrapper = barOf({ choice: '2', eligibleCount: 3 })

    await wrapper.get('[data-test="bulk-category"] select').setValue('none')
    await wrapper.get('[data-test="apply-category"]').trigger('click')
    await wrapper.get('[data-test="confirm-selected"]').trigger('click')
    await wrapper.get('[data-test="clear-selection"]').trigger('click')

    expect(wrapper.emitted('update:choice')).toEqual([['none']])
    expect(wrapper.emitted('applyCategory')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('shows the action running and refuses a second click (R11)', () => {
    const wrapper = barOf({ choice: '2', busy: true })

    const confirm = wrapper.get('[data-test="confirm-selected"]')
    expect(confirm.attributes('aria-busy')).toBe('true')
    expect(confirm.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="apply-category"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="bulk-category"] select').attributes('disabled')).toBeDefined()
  })

  it('has nothing to choose from when the category tree failed to load', () => {
    const wrapper = barOf({ categories: null })

    expect(wrapper.get('[data-test="bulk-category"] select').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Categories unavailable')
  })
})
