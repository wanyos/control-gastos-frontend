import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseAccounts } from '@/shared/accounts'
import { parseCategories } from '@/shared/categories'
import { SEARCH_TOO_LONG } from '@/shared/movement-filters'
import { SEARCH_DEBOUNCE_MS } from '@/shared/movements'

import StatementFilterBar from '../components/StatementFilterBar.vue'
import { EMPTY_FILTERS } from '../filters'
import type { StatementFilters } from '../filters'
import { ACCOUNTS, CATEGORIES } from './fixtures'

const accounts = parseAccounts(ACCOUNTS)
const categories = parseCategories(CATEGORIES)

const barOf = (filters: Partial<StatementFilters> = {}, overrides: Record<string, unknown> = {}) =>
  mount(StatementFilterBar, {
    props: {
      filters: { ...EMPTY_FILTERS, ...filters },
      accounts,
      accountsFailed: false,
      categories,
      categoriesFailed: false,
      ...overrides,
    },
  })

const lastChange = (wrapper: ReturnType<typeof barOf>): StatementFilters => {
  const last = (wrapper.emitted('change') ?? []).at(-1)
  if (!last) throw new Error('no change was emitted')
  return last[0] as StatementFilters
}

describe('StatementFilterBar (R2, R7, R9, R11, R15)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows exactly four controls: search, account, category and uncategorized (R2)', () => {
    const wrapper = barOf()

    expect(wrapper.find('[data-test="statement-search"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="filter-account"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="filter-category"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="filter-uncategorized"]').exists()).toBe(true)
    expect(wrapper.findAll('select')).toHaveLength(2)
    expect(wrapper.findAll('input')).toHaveLength(2)
  })

  it('has no type, no status and no date range control (R2)', () => {
    const wrapper = barOf()

    expect(wrapper.find('[data-test="filter-type"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="filter-from"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="filter-to"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="filter-status"]').exists()).toBe(false)
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('All types')
    expect(wrapper.text()).not.toContain('Pending')
  })

  it('lists every account there is, not only the ones of the month (R14)', () => {
    const options = barOf().get('[data-test="filter-account"] select').findAll('option')

    expect(options.map((option) => option.text())).toEqual([
      'All accounts',
      'Bankinter · bankinter ···0236',
      'MyInvestor · myinvestor ···6789',
    ])
  })

  it('keeps the account the URL chose even when the list no longer holds it', () => {
    const options = barOf({ accountId: 99 })
      .get('[data-test="filter-account"] select')
      .findAll('option')

    expect(options.map((option) => option.text())).toContain('Account #99')
  })

  it('lists the categories as a tree, roots pickable too (R14)', () => {
    const select = barOf().get('[data-test="filter-category"] select')

    expect(select.findAll('optgroup').map((group) => group.attributes('label'))).toEqual([
      'Food',
      'Salary',
    ])
    expect(select.findAll('option').map((option) => option.text())).toEqual([
      'All categories',
      'Food',
      'Groceries',
      'Salary',
    ])
  })

  it.each([
    ['filter-account', '2', { accountId: 2 }],
    ['filter-category', '2', { categoryId: 2 }],
  ] as const)('announces the whole filter set when %s changes', async (test, value, patch) => {
    const wrapper = barOf()

    await wrapper.get(`[data-test="${test}"] select`).setValue(value)

    expect(lastChange(wrapper)).toEqual({ ...EMPTY_FILTERS, ...patch })
  })

  it('waits 350 ms for the typing to stop: three keystrokes make one change (R7)', async () => {
    vi.useFakeTimers()
    const wrapper = barOf()
    const field = wrapper.get('[data-test="statement-search"] input')

    await field.setValue('lu')
    await field.setValue('luz')
    await field.setValue('luz ')
    expect(wrapper.emitted('change')).toBeUndefined()

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)

    expect(wrapper.emitted('change')).toHaveLength(1)
    expect(lastChange(wrapper).q).toBe('luz ')
    expect(SEARCH_DEBOUNCE_MS).toBe(350)
  })

  it('explains what the search looks at', () => {
    expect(barOf().text()).toContain('Searches the description, ignoring case and accents')
  })

  it('warns over a hundred characters and sends nothing (R7)', async () => {
    vi.useFakeTimers()
    const wrapper = barOf()

    await wrapper.get('[data-test="statement-search"] input').setValue('x'.repeat(101))
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 10)

    expect(wrapper.text()).toContain(SEARCH_TOO_LONG)
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('picking a category clears Uncategorized, and marking it clears the category (R9)', async () => {
    const chosen = barOf({ uncategorized: true })
    await chosen.get('[data-test="filter-category"] select').setValue('2')

    expect(lastChange(chosen)).toMatchObject({ categoryId: 2, uncategorized: false })

    const marked = barOf({ categoryId: 2 })
    await marked.get('[data-test="filter-uncategorized"] input').setValue(true)

    expect(lastChange(marked)).toMatchObject({ categoryId: null, uncategorized: true })
  })

  it('starts with Uncategorized off (🔴 5)', () => {
    const box = barOf().get('[data-test="filter-uncategorized"] input')

    expect((box.element as HTMLInputElement).checked).toBe(false)
  })

  it('offers Clear filters only when something is filtering, and clears the four (R11)', async () => {
    expect(barOf().find('[data-test="clear-filters"]').exists()).toBe(false)

    const wrapper = barOf({ uncategorized: true, q: 'luz' })
    await wrapper.get('[data-test="clear-filters"]').trigger('click')

    expect(lastChange(wrapper)).toEqual(EMPTY_FILTERS)
  })

  it('follows the search the URL brings back', async () => {
    const wrapper = barOf({ q: 'luz' })
    const value = () =>
      (wrapper.get('[data-test="statement-search"] input').element as HTMLInputElement).value

    expect(value()).toBe('luz')

    await wrapper.setProps({ filters: { ...EMPTY_FILTERS, q: 'gas' } })

    expect(value()).toBe('gas')
  })

  describe('a list that did not load (R15)', () => {
    it('switches off only the account select, with its own notice', () => {
      const wrapper = barOf({}, { accounts: null, accountsFailed: true })

      expect(
        wrapper.get('[data-test="filter-account"] select').attributes('disabled'),
      ).toBeDefined()
      expect(wrapper.text()).toContain('Accounts unavailable')
      expect(
        wrapper.get('[data-test="filter-category"] select').attributes('disabled'),
      ).toBeUndefined()
      expect(wrapper.find('[data-test="filter-uncategorized"]').exists()).toBe(true)
    })

    it('switches off only the category select, with its own notice', () => {
      const wrapper = barOf({}, { categories: null, categoriesFailed: true })

      expect(
        wrapper.get('[data-test="filter-category"] select').attributes('disabled'),
      ).toBeDefined()
      expect(wrapper.text()).toContain('Categories unavailable')
      expect(
        wrapper.get('[data-test="filter-account"] select').attributes('disabled'),
      ).toBeUndefined()
    })
  })
})
