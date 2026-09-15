import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import UnreadLineList from '../components/UnreadLineList.vue'
import { parseImportReport } from '../service'
import { CLEAN_REPORT, STATEMENT_ALL_UNPARSED, STATEMENT_UNREAD_42 } from './fixtures'

const mountList = (...files: unknown[]) =>
  mount(UnreadLineList, { props: { report: parseImportReport({ ...CLEAN_REPORT, files }) } })

describe('UnreadLineList (R6)', () => {
  it('lists the first 5 lines of a file and how many more there are', () => {
    const wrapper = mountList(STATEMENT_UNREAD_42)

    const lines = wrapper.findAll('[data-test="unread-line"]')
    expect(lines).toHaveLength(5)
    expect(lines[0]?.findAll('span').map((part) => part.text())).toEqual([
      'Line 10',
      'fecha no interpretable (1)',
    ])
    expect(wrapper.get('[data-test="unread-more"]').text()).toBe('and 37 more lines')
  })

  it('marks every backend reason as Spanish', () => {
    const wrapper = mountList(STATEMENT_UNREAD_42)

    const reasons = wrapper.findAll('[data-test="unread-reason"]')
    expect(reasons).toHaveLength(5)
    for (const reason of reasons) expect(reason.attributes('lang')).toBe('es')
  })

  it('groups by file, failed files included, without a more line when all fit', () => {
    const three = {
      ...STATEMENT_UNREAD_42,
      unparsedCount: 3,
      unparsedRows: STATEMENT_UNREAD_42.unparsedRows.slice(0, 3),
    }
    const wrapper = mountList(STATEMENT_ALL_UNPARSED, three)

    const groups = wrapper.findAll('[data-test="unread-group"]')
    expect(groups).toHaveLength(2)
    expect(groups[0]?.get('[data-test="file-heading-name"]').text()).toBe('openbank-julio.xls')
    expect(groups[0]?.get('[data-test="file-heading-origin"]').text()).toBe('Openbank · 2026')
    expect(groups[0]?.get('[data-test="unread-more"]').text()).toBe('and 1 more line')
    expect(groups[1]?.findAll('[data-test="unread-line"]')).toHaveLength(3)
    expect(groups[1]?.find('[data-test="unread-more"]').exists()).toBe(false)
  })
})
