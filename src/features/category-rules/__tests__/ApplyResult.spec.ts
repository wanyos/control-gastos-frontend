import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate } from '@/shared/money'

import ApplyResult from '../components/ApplyResult.vue'
import { parseApplyResult } from '../service'
import { APPLY_OK, conflict } from './fixtures'

const resultOf = (raw: object) => parseApplyResult({ ...APPLY_OK, ...raw })

const mountResult = (raw: object = {}) => mount(ApplyResult, { props: { result: resultOf(raw) } })

const many = (count: number) =>
  Array.from({ length: count }, (_item, index) => conflict(300 + index, `CONFLICTO ${index + 1}`))

describe('ApplyResult (R12)', () => {
  it('reads the three figures of the pass', () => {
    const wrapper = mountResult()

    expect(wrapper.findAll('[data-test="apply-figure"]').map((one) => one.text())).toEqual([
      '12 movements categorized',
      '5 still without a matching rule',
      '1 conflict',
    ])
  })

  it('lists every conflict it was given, not the first ten (decisions.md 🔴 6)', () => {
    const wrapper = mountResult({ conflicts: many(14), conflictCount: 14 })

    expect(wrapper.findAll('[data-test="rule-conflict"]')).toHaveLength(14)
    expect(wrapper.find('[data-test="conflicts-more"]').exists()).toBe(false)
  })

  it('names the movement and every rule that claimed it', () => {
    const wrapper = mountResult()

    const first = wrapper.get('[data-test="rule-conflict"]')
    expect(first.text()).toContain(formatDate('2026-08-14'))
    expect(first.get('[data-test="conflict-description"]').text()).toBe('PAGO SINTETICO EJEMPLO')
    const rules = first.findAll('[data-test="conflict-rule"]').map((one) => one.text())
    expect(rules).toHaveLength(2)
    expect(rules[0]).toContain('sintetico')
    expect(rules[0]).toContain('Supermercado')
    expect(rules[1]).toContain('Suministros')
  })

  it('says how many were counted but not sent', () => {
    const wrapper = mountResult({ conflicts: many(3), conflictCount: 7 })

    expect(wrapper.get('[data-test="conflicts-more"]').text()).toBe('and 4 more not listed')
  })

  it('offers no way to resolve a conflict: it is read only (C1)', () => {
    const wrapper = mountResult({ conflicts: many(3), conflictCount: 3 })

    const list = wrapper.get('[data-test="rule-conflicts"]')
    expect(list.findAll('button')).toHaveLength(0)
    expect(list.findAll('select')).toHaveLength(0)
    expect(list.findAll('input')).toHaveLength(0)
    expect(list.findAll('a')).toHaveLength(0)
  })

  it('says nothing about conflicts when there are none', () => {
    const wrapper = mountResult({ conflicts: [], conflictCount: 0 })

    expect(wrapper.find('[data-test="rule-conflicts"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="apply-figure"]')[2]?.text()).toBe('0 conflicts')
  })
})
