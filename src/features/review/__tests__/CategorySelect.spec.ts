import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import CategorySelect from '../components/CategorySelect.vue'
import { parseCategories } from '../service'
import { CATEGORY_TREE } from './fixtures'

const categories = parseCategories(CATEGORY_TREE)

const selectOf = (props: Partial<InstanceType<typeof CategorySelect>['$props']> = {}) =>
  mount(CategorySelect, {
    props: { modelValue: null, categories, failed: false, ...props },
  })

describe('CategorySelect (R7)', () => {
  it('groups the children under their root, with the root pickable too', () => {
    const wrapper = selectOf()

    const groups = wrapper.findAll('optgroup')
    expect(groups.map((group) => group.attributes('label'))).toEqual(['Food', 'Salary'])
    expect(groups[0]?.findAll('option').map((option) => option.text())).toEqual([
      'Food',
      'Groceries',
      'Restaurants',
    ])
    expect(wrapper.get('select').findAll('option')[0]?.text()).toBe('All categories')
  })

  it('emits the chosen id, and null when the choice is cleared', async () => {
    const wrapper = selectOf({ modelValue: 2 })

    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('2')

    await wrapper.get('select').setValue('3')
    await wrapper.get('select').setValue('')

    expect(wrapper.emitted('update:modelValue')).toEqual([[3], [null]])
  })

  it('disables itself and says why when the categories could not be loaded', () => {
    const wrapper = selectOf({ categories: null, failed: true })

    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Categories unavailable')
    expect(wrapper.findAll('optgroup')).toHaveLength(0)
  })

  it('stays disabled while the tree is still unknown', () => {
    const wrapper = selectOf({ categories: null, failed: false })

    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('Categories unavailable')
  })
})
