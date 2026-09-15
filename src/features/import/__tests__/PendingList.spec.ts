import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import PendingList from '../components/PendingList.vue'
import { parsePendingFiles } from '../service'
import { PENDING_MANY, PENDING_TWO, PENDING_UNKNOWN_BANK } from './fixtures'

const mountList = (raw: unknown) =>
  mount(PendingList, { props: { pending: parsePendingFiles(raw) } })

describe('PendingList (R5)', () => {
  it('groups files by bank, with readable names, then by year', () => {
    const wrapper = mountList(PENDING_TWO)

    const banks = wrapper.findAll('[data-test="pending-bank"]')
    expect(banks.map((bank) => bank.get('h3').text())).toEqual(['Bankinter', 'N26'])
    expect(banks[0]?.get('[data-test="pending-year"]').text()).toContain('2026')
    expect(wrapper.findAll('[data-test="pending-file"]').map((file) => file.text())).toEqual([
      'movs-agosto.xlsx',
      'n26-agosto.csv',
    ])
  })

  it('shows up to 8 files unfolded, without <details>', () => {
    const wrapper = mountList(PENDING_TWO)

    expect(wrapper.find('details').exists()).toBe(false)
  })

  it('shows an unknown bank slug as it comes', () => {
    const wrapper = mountList(PENDING_UNKNOWN_BANK)

    expect(wrapper.get('[data-test="pending-bank"] h3').text()).toBe('newbank')
  })

  it('folds every bank into a closed <details> with its count past 8 files', () => {
    const wrapper = mountList(PENDING_MANY)

    const details = wrapper.findAll('details')
    expect(details).toHaveLength(2)
    expect(details.map((d) => (d.element as HTMLDetailsElement).open)).toEqual([false, false])
    expect(details.map((d) => d.get('summary').text())).toEqual([
      'Bankinter · 5 files',
      'Openbank · 4 files',
    ])
    expect(details[0]?.findAll('[data-test="pending-year"]').map((y) => y.text())).toEqual([
      expect.stringContaining('2025'),
      expect.stringContaining('2026'),
    ])
    expect(wrapper.findAll('[data-test="pending-file"]')).toHaveLength(9)
  })
})
