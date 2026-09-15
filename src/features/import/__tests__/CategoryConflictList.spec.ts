import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate } from '@/shared/money'

import CategoryConflictList from '../components/CategoryConflictList.vue'
import { parseImportReport } from '../service'
import { CLEAN_REPORT, CONFLICTS_11, FULL_REPORT } from './fixtures'

const mountList = (raw: unknown) =>
  mount(CategoryConflictList, { props: { categorization: parseImportReport(raw).categorization } })

describe('CategoryConflictList (R8, R12)', () => {
  it('explains the section and shows the conflict with its competing rules', () => {
    const wrapper = mountList(FULL_REPORT)

    expect(wrapper.text()).toContain(
      'These movements match rules for different categories, so they were left without one.',
    )
    const conflict = wrapper.get('[data-test="category-conflict"]')
    expect(conflict.text()).toContain(formatDate('2026-08-14'))
    expect(conflict.get('[data-test="conflict-description"]').text()).toBe('PAGO SINTETICO EJEMPLO')
    expect(conflict.findAll('[data-test="conflict-rule"]').map((r) => r.text())).toEqual([
      '“sintetico” → Supermercado',
      '“ejemplo” → Compras',
    ])
    expect(wrapper.find('[data-test="conflicts-more"]').exists()).toBe(false)
  })

  it('marks the description, match texts and category names as Spanish', () => {
    const wrapper = mountList(FULL_REPORT)

    const spanish = wrapper.findAll('[lang="es"]').map((node) => node.text())
    expect(spanish).toEqual([
      'PAGO SINTETICO EJEMPLO',
      '“sintetico”',
      'Supermercado',
      '“ejemplo”',
      'Compras',
    ])
  })

  it('shows 10 of 11 conflicts and tells the rest, with no buttons or links', () => {
    const wrapper = mountList({ ...CLEAN_REPORT, categorization: CONFLICTS_11 })

    expect(wrapper.findAll('[data-test="category-conflict"]')).toHaveLength(10)
    expect(wrapper.get('[data-test="conflicts-more"]').text()).toBe('and 1 more movement')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.findAll('a')).toHaveLength(0)
  })
})
