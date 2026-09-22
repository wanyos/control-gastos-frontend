import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import ReviewFilterBar from '../components/ReviewFilterBar.vue'
import { EMPTY_FILTERS, SEARCH_DEBOUNCE_MS, SEARCH_TOO_LONG } from '../filters'
import { parseCategories, parseMovementPage } from '../service'
import type { ReviewFilters } from '../types'
import { CATEGORY_TREE, PAGE_OF_THREE } from './fixtures'

const categories = parseCategories(CATEGORY_TREE)
const accounts = parseMovementPage(PAGE_OF_THREE).movements.map((movement) => movement.account)

const barOf = (filters: Partial<ReviewFilters> = {}) =>
  mount(ReviewFilterBar, {
    props: {
      filters: { ...EMPTY_FILTERS, ...filters },
      accounts,
      categories,
      categoriesFailed: false,
    },
  })

const lastChange = (wrapper: ReturnType<typeof barOf>): ReviewFilters => {
  const changes = wrapper.emitted('change') ?? []
  const last = changes.at(-1)
  if (!last) throw new Error('no change was emitted')
  return last[0] as ReviewFilters
}

describe('ReviewFilterBar (R5, R6, R8, R12)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists the accounts present in the page, without asking for the account list', () => {
    const wrapper = barOf()

    const options = wrapper.get('[data-test="filter-account"] select').findAll('option')
    expect(options.map((option) => option.text())).toEqual([
      'All accounts',
      'Bankinter · bankinter ···0236',
      'N26 · n26 ···3000',
    ])
  })

  it('keeps the account chosen in the URL even when the page no longer holds it', () => {
    const wrapper = barOf({ accountId: 99 })

    const options = wrapper.get('[data-test="filter-account"] select').findAll('option')
    expect(options.map((option) => option.text())).toContain('Account #99')
  })

  it.each([
    ['filter-account', 'select', '2', { accountId: 2 }],
    ['filter-type', 'select', 'income', { type: 'income' }],
    ['filter-from', 'input', '2026-08-01', { from: '2026-08-01' }],
    ['filter-to', 'input', '2026-08-31', { to: '2026-08-31' }],
  ] as const)('announces the whole filter set when %s changes', async (test, tag, value, patch) => {
    const wrapper = barOf()

    await wrapper.get(`[data-test="${test}"] ${tag}`).setValue(value)

    expect(lastChange(wrapper)).toEqual({ ...EMPTY_FILTERS, ...patch })
  })

  it('waits for the typing to stop: three keystrokes make one change (R8)', async () => {
    vi.useFakeTimers()
    const wrapper = barOf()
    const field = wrapper.get('[data-test="review-search"] input')

    await field.setValue('ca')
    await field.setValue('caf')
    await field.setValue('cafe')
    expect(wrapper.emitted('change')).toBeUndefined()

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)

    expect(wrapper.emitted('change')).toHaveLength(1)
    expect(lastChange(wrapper).q).toBe('cafe')
  })

  it('explains what the search looks at', () => {
    expect(barOf().text()).toContain('Searches the description, ignoring case and accents')
  })

  it('warns over 100 characters and sends nothing (R8)', async () => {
    vi.useFakeTimers()
    const wrapper = barOf()

    await wrapper.get('[data-test="review-search"] input').setValue('x'.repeat(101))
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 10)

    expect(wrapper.text()).toContain(SEARCH_TOO_LONG)
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('picking a category clears Uncategorized, and marking it clears the category (R6)', async () => {
    const chosen = barOf({ uncategorized: true })
    await chosen.get('[data-test="filter-category"] select').setValue('2')

    expect(lastChange(chosen)).toMatchObject({ categoryId: 2, uncategorized: false })

    const marked = barOf({ categoryId: 2 })
    await marked.get('[data-test="filter-uncategorized"] input').setValue(true)

    expect(lastChange(marked)).toMatchObject({ categoryId: null, uncategorized: true })
  })

  it('offers Clear filters only when something is filtering, and clears everything', async () => {
    expect(barOf().find('[data-test="clear-filters"]').exists()).toBe(false)

    const wrapper = barOf({ type: 'expense', q: 'luz' })
    await wrapper.get('[data-test="clear-filters"]').trigger('click')

    expect(lastChange(wrapper)).toEqual(EMPTY_FILTERS)
  })

  it('follows the search the URL brings back', async () => {
    const wrapper = barOf({ q: 'luz' })
    expect(
      (wrapper.get('[data-test="review-search"] input').element as HTMLInputElement).value,
    ).toBe('luz')

    await wrapper.setProps({ filters: { ...EMPTY_FILTERS, q: 'gas' } })

    expect(
      (wrapper.get('[data-test="review-search"] input').element as HTMLInputElement).value,
    ).toBe('gas')
  })

  it('offers no selection, no confirm and no categorize action (F16 is not built here)', () => {
    const wrapper = barOf()

    expect(wrapper.text()).not.toContain('Confirm')
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(1)
  })
})
