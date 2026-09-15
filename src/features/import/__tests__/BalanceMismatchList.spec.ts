import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import BalanceMismatchList from '../components/BalanceMismatchList.vue'
import { parseImportReport } from '../service'
import { FULL_REPORT, STATEMENT_IMPORTED } from './fixtures'

// Class names are composed at runtime: a literal in a spec would end up in the production CSS.
const cls = (...parts: string[]) => parts.join('-')

const mountList = (raw: unknown) =>
  mount(BalanceMismatchList, { props: { report: parseImportReport(raw) } })

const [MISMATCH] = STATEMENT_IMPORTED.balanceMismatches

describe('BalanceMismatchList (R4, R5)', () => {
  it('shows account, date, check and the three figures of the contract mismatch', () => {
    const wrapper = mountList(FULL_REPORT)

    const row = wrapper.get('[data-test="balance-mismatch"]')
    expect(row.get('[data-test="mismatch-where"]').text()).toBe(
      `bankinter 0236 · ${formatDate('2026-07-21')}`,
    )
    expect(row.get('[data-test="mismatch-check"]').text()).toBe('Line-by-line check')
    expect(row.get('[data-test="mismatch-explanation"]').text()).toBe(
      "A line's amount doesn't match how the running balance changed.",
    )
    expect(row.findAll('dt').map((dt) => dt.text())).toEqual([
      'Calculated',
      'In file',
      'Difference',
    ])
    expect(row.findAll('[data-test="mismatch-figure"]').map((dd) => dd.text())).toEqual([
      formatMoney('-40.00'),
      formatMoney('-20.00'),
      formatMoney('-20.00'),
    ])
  })

  it('writes the figures in mono with tabular digits', () => {
    const wrapper = mountList(FULL_REPORT)

    for (const figure of wrapper.findAll('[data-test="mismatch-figure"]')) {
      expect(figure.classes()).toContain(cls('font', 'mono'))
      expect(figure.classes()).toContain(cls('tabular', 'nums'))
    }
  })

  it('groups the mismatches by file with its readable bank and year', () => {
    const other = {
      ...STATEMENT_IMPORTED,
      bank: 'n26',
      fileId: 'n1',
      name: 'n26-julio.csv',
      balanceMismatches: [{ ...MISMATCH, check: 'statement-balance' }],
    }
    const wrapper = mountList({
      ...FULL_REPORT,
      balanceMismatchCount: 2,
      files: [STATEMENT_IMPORTED, other],
    })

    const groups = wrapper.findAll('[data-test="mismatch-group"]')
    expect(groups).toHaveLength(2)
    const headings = groups.map((group) => [
      group.get('[data-test="file-heading-name"]').text(),
      group.get('[data-test="file-heading-origin"]').text(),
    ])
    expect(headings).toEqual([
      ['movs-agosto.xlsx', 'Bankinter · 2026'],
      ['n26-julio.csv', 'N26 · 2026'],
    ])
    expect(groups[1]?.get('[data-test="mismatch-check"]').text()).toBe('Statement balance check')
  })

  it('names an unknown check generically, without an explanation', () => {
    const file = { ...STATEMENT_IMPORTED, balanceMismatches: [{ ...MISMATCH, check: 'monthly' }] }
    const wrapper = mountList({ ...FULL_REPORT, files: [file] })

    expect(wrapper.get('[data-test="mismatch-check"]').text()).toBe('Balance check')
    expect(wrapper.find('[data-test="mismatch-explanation"]').exists()).toBe(false)
  })
})
