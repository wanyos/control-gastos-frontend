import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import AmbiguousTransferList from '../components/AmbiguousTransferList.vue'
import { parseImportReport } from '../service'
import { AMBIGUOUS_12, CLEAN_REPORT, FULL_REPORT } from './fixtures'

const mountList = (raw: unknown) =>
  mount(AmbiguousTransferList, { props: { transfers: parseImportReport(raw).transfers } })

/** The contract's example group: three movements of 500.00. */
const CONTRACT_GROUP = {
  amount: '500.00',
  movements: [
    {
      id: 12,
      accountId: 1,
      accountAlias: 'bankinter 0236',
      type: 'expense',
      bookingDate: '2026-08-01',
      description: 'TRANSFERENCIA',
    },
    {
      id: 40,
      accountId: 2,
      accountAlias: 'openbank 1111',
      type: 'income',
      bookingDate: '2026-08-01',
      description: 'TRANSFERENCIA RECIBIDA',
    },
    {
      id: 41,
      accountId: 4,
      accountAlias: 'n26 9999',
      type: 'income',
      bookingDate: '2026-08-02',
      description: 'BIZUM RECIBIDO',
    },
  ],
}

describe('AmbiguousTransferList (R7, R12)', () => {
  it('explains the section and shows a group with its amount and movements', () => {
    const wrapper = mountList({
      ...FULL_REPORT,
      transfers: { pairsCreated: 0, ambiguousCount: 1, ambiguous: [CONTRACT_GROUP] },
    })

    expect(wrapper.text()).toContain(
      "These movements could be transfers between your accounts, but they couldn't be paired automatically.",
    )
    const group = wrapper.get('[data-test="ambiguous-group"]')
    expect(group.get('[data-test="ambiguous-amount"]').text()).toBe(formatMoney('500.00'))
    const movements = group.findAll('[data-test="ambiguous-movement"]')
    expect(movements).toHaveLength(3)
    expect(movements[0]?.findAll('span').map((part) => part.text())).toEqual([
      formatDate('2026-08-01'),
      '·',
      'bankinter 0236',
      'Out',
      'TRANSFERENCIA',
    ])
    expect(movements.map((m) => m.get('[data-test="ambiguous-direction"]').text())).toEqual([
      'Out',
      'In',
      'In',
    ])
    expect(wrapper.find('[data-test="ambiguous-more"]').exists()).toBe(false)
  })

  it('marks each description as Spanish', () => {
    const wrapper = mountList(FULL_REPORT)

    const descriptions = wrapper.findAll('[data-test="ambiguous-description"]')
    expect(descriptions.map((d) => [d.attributes('lang'), d.text()])).toEqual([
      ['es', 'TRANSFERENCIA'],
      ['es', 'TRANSFERENCIA RECIBIDA'],
    ])
  })

  it('shows 10 of 12 groups and tells the rest, with no buttons or links', () => {
    const wrapper = mountList({ ...CLEAN_REPORT, transfers: AMBIGUOUS_12 })

    expect(wrapper.findAll('[data-test="ambiguous-group"]')).toHaveLength(10)
    expect(wrapper.get('[data-test="ambiguous-more"]').text()).toBe('and 2 more groups')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.findAll('a')).toHaveLength(0)
  })
})
