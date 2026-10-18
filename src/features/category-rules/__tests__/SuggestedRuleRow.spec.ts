import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseCategories } from '@/shared/categories'
import { formatDate, formatMoney } from '@/shared/money'

import SuggestedRuleRow from '../components/SuggestedRuleRow.vue'
import { parseSuggestions } from '../service'
import {
  ACADEMY_SUGGESTION,
  CATEGORY_TREE,
  COOPERATIVE_SUGGESTION,
  SUPERMARKET_SUGGESTION,
} from './fixtures'

const [SUPERMARKET, ACADEMY, COOPERATIVE] = parseSuggestions([
  SUPERMARKET_SUGGESTION,
  ACADEMY_SUGGESTION,
  COOPERATIVE_SUGGESTION,
])
if (!SUPERMARKET || !ACADEMY || !COOPERATIVE) throw new Error('the fixtures did not parse')

const CATEGORIES = parseCategories(CATEGORY_TREE)

const mountRow = (props: Partial<InstanceType<typeof SuggestedRuleRow>['$props']> = {}) =>
  mount(SuggestedRuleRow, {
    props: { suggestion: ACADEMY, categories: CATEGORIES, ...props },
  })

const choose = async (wrapper: ReturnType<typeof mountRow>, value: string) => {
  await wrapper.get('[data-test="suggested-rule-category"] select').setValue(value)
}

describe('SuggestedRuleRow (feature 33)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the text the kind and how many movements a suggestion would take', () => {
    const wrapper = mountRow({ suggestion: SUPERMARKET })

    expect(wrapper.get('[data-test="suggested-rule-text"]').text()).toBe('“supermercado inventado”')
    expect(wrapper.get('[data-test="suggested-rule-kind"]').text()).toBe('Expenses')
    expect(wrapper.get('[data-test="suggested-rule-count"]').text()).toBe('4 movements')

    const income = mountRow({ suggestion: COOPERATIVE })
    expect(income.get('[data-test="suggested-rule-kind"]').text()).toBe('Income')
    expect(income.get('[data-test="suggested-rule-count"]').text()).toBe('3 movements')
  })

  it('shows the movements of a suggestion before any rule is created', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const wrapper = mountRow({ suggestion: SUPERMARKET })
    const button = wrapper.get('[data-test="suggested-rule-show-movements"]')

    // Folded when it is mounted.
    expect(wrapper.findAll('[data-test="suggested-rule-movement"]')).toHaveLength(0)
    expect(button.text()).toBe('Show the 4 movements')
    expect(button.attributes('aria-expanded')).toBe('false')

    await button.trigger('click')

    const rows = wrapper.findAll('[data-test="suggested-rule-movement"]')
    expect(rows).toHaveLength(4)
    expect(rows[0]?.text()).toContain(formatDate('2026-07-03'))
    expect(rows[0]?.text()).toContain('SUPERMERCADO INVENTADO 4521')
    expect(rows[0]?.text()).toContain(formatMoney('-23.87'))
    expect(button.text()).toBe('Hide the movements')

    await button.trigger('click')
    expect(wrapper.findAll('[data-test="suggested-rule-movement"]')).toHaveLength(0)

    // An income keeps its amount without a sign.
    const income = mountRow({ suggestion: COOPERATIVE })
    await income.get('[data-test="suggested-rule-show-movements"]').trigger('click')
    expect(income.findAll('[data-test="suggested-rule-movement"]')[0]?.text()).toContain(
      formatMoney('126.35'),
    )

    // Unfolding asked nothing, and nothing asked to create a rule.
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(wrapper.emitted('create')).toBeUndefined()
  })

  it('offers only categories of its kind and no category chosen', () => {
    const wrapper = mountRow()
    const select = wrapper.get('[data-test="suggested-rule-category"] select')
    const options = select.findAll('option').map((option) => option.text())

    expect((select.element as HTMLSelectElement).value).toBe('')
    expect(options[0]).toBe('Choose a category…')
    expect(options).toEqual(['Choose a category…', 'Supermercado', 'Fruteria', 'Suministros'])
    expect(options).not.toContain('Nomina')

    const income = mountRow({ suggestion: COOPERATIVE })
    const incomeOptions = income
      .get('[data-test="suggested-rule-category"] select')
      .findAll('option')
      .map((option) => option.text())
    expect(incomeOptions).toEqual(['Choose a category…', 'Nomina'])
  })

  it('keeps Create rule off until a category is chosen', async () => {
    const wrapper = mountRow()
    const create = wrapper.get('[data-test="suggested-rule-create"]')

    expect(create.attributes('disabled')).toBeDefined()
    await create.trigger('click')
    expect(wrapper.emitted('create')).toBeUndefined()

    await choose(wrapper, '6')
    expect(create.attributes('disabled')).toBeUndefined()
    await create.trigger('click')
    expect(wrapper.emitted('create')).toEqual([[6]])

    // While a create is travelling, no Create rule does anything.
    const busy = mountRow({ busy: true })
    await choose(busy, '6')
    expect(busy.get('[data-test="suggested-rule-create"]').attributes('disabled')).toBeDefined()
    await busy.get('[data-test="suggested-rule-create"]').trigger('click')
    expect(busy.emitted('create')).toBeUndefined()
  })

  it('says how many movements categorized by hand also contain the text and that they will not move', () => {
    const wrapper = mountRow({ suggestion: SUPERMARKET })

    expect(wrapper.get('[data-test="suggested-rule-manual"]').text()).toBe(
      '2 movements you categorized by hand also contain this text. They will not move.',
    )
    // None by hand: no sentence at all.
    expect(mountRow().find('[data-test="suggested-rule-manual"]').exists()).toBe(false)
  })

  it('offers no way to dismiss a suggestion', () => {
    const wrapper = mountRow({ suggestion: SUPERMARKET })

    const buttons = wrapper.findAll('button').map((button) => button.text())
    expect(buttons).toEqual(['Show the 4 movements', 'Create rule'])
    expect(wrapper.text()).not.toMatch(/dismiss|hide this|ignore|remove|delete/i)
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('paints the failure of a create in the row of its suggestion', async () => {
    const wrapper = mountRow()
    expect(wrapper.find('[data-test="suggested-rule-error"]').exists()).toBe(false)

    await wrapper.setProps({ failure: 'Nothing was saved: another rule already uses that text.' })

    expect(wrapper.get('[data-test="suggested-rule-error"]').text()).toBe(
      'Nothing was saved: another rule already uses that text.',
    )
    // The category chosen survives the failure.
    await choose(wrapper, '4')
    await wrapper.setProps({ failure: "Couldn't reach the server. Nothing was saved." })
    expect(
      (wrapper.get('[data-test="suggested-rule-category"] select').element as HTMLSelectElement)
        .value,
    ).toBe('4')
  })
})
