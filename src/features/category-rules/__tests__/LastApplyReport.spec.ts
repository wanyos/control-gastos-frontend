import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import LastApplyReport from '../components/LastApplyReport.vue'
import { parseApplyResult, parseSavedRule } from '../service'
import type { ResultCause } from '../types'
import {
  ACADEMY_CREATED,
  ACADEMY_UNFINISHED,
  APPLY_OK,
  INCOME_MOVEMENT,
  TWELVE_CATEGORIZED,
  TWO_RULES_MOVEMENT,
  conflict,
} from './fixtures'

/** 10:42 in the local time of whoever runs the test: the block paints local time. */
const AT = new Date(2026, 9, 12, 10, 42)

const mountReport = (raw: object = {}, at: Date = AT) =>
  mount(LastApplyReport, {
    props: {
      report: {
        at,
        result: parseApplyResult({ ...APPLY_OK, ...raw }),
        cause: 'apply' as const,
        rule: null,
      },
    },
  })

/** The answer of the contract: two movements, the first one with two rules. */
const TWO_CATEGORIZED = {
  categorized: 2,
  categorizedMovements: [TWO_RULES_MOVEMENT, INCOME_MOVEMENT],
}

const NONE_CATEGORIZED = { categorized: 0, categorizedMovements: [] }

const threeConflicts = {
  conflictCount: 3,
  conflicts: [
    conflict(210, 'PAGO SINTETICO EJEMPLO'),
    conflict(214, 'PAGO SINTETICO EJEMPLO DOS'),
    conflict(219, 'PAGO SINTETICO EJEMPLO TRES'),
  ],
}

describe('LastApplyReport (feature 30)', () => {
  it('says how many movements were categorized and at what time', () => {
    const wrapper = mountReport({ unmatched: 847, ...threeConflicts })

    expect(wrapper.get('[data-test="last-apply-headline"]').text()).toBe(
      'Rules applied at 10:42: 12 movements categorized.',
    )
    expect(wrapper.get('[data-test="last-apply-figures"]').text()).toBe(
      '847 still without a matching rule · 3 conflicts',
    )

    const single = mountReport(
      { categorized: 1, categorizedMovements: [TWO_RULES_MOVEMENT] },
      new Date(2026, 9, 12, 9, 5),
    )

    expect(single.get('[data-test="last-apply-headline"]').text()).toBe(
      'Rules applied at 09:05: 1 movement categorized.',
    )
    expect(single.get('[data-test="last-apply-figures"]').text()).toBe(
      '5 still without a matching rule · 1 conflict',
    )
  })

  it('says no movements were categorized when the pass categorized none', () => {
    const wrapper = mountReport(NONE_CATEGORIZED)

    expect(wrapper.get('[data-test="last-apply-headline"]').text()).toBe(
      'Rules applied at 10:42: no movements were categorized.',
    )
    expect(wrapper.find('[data-test="last-apply-show-movements"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="last-apply-movement"]').exists()).toBe(false)
  })

  it('lists each categorized movement with the category it was given', async () => {
    const wrapper = mountReport()
    const button = wrapper.get('[data-test="last-apply-show-movements"]')

    // Folded when it is mounted.
    expect(wrapper.findAll('[data-test="last-apply-movement"]')).toHaveLength(0)
    expect(button.text()).toBe('Show the 12 movements')

    await button.trigger('click')

    const rows = wrapper.findAll('[data-test="last-apply-movement"]')
    expect(rows).toHaveLength(12)
    expect(
      rows.map((row) => row.get('[data-test="last-apply-movement-description"]').text()),
    ).toEqual(TWELVE_CATEGORIZED.map((one) => one.description))
    expect(rows.map((row) => row.get('[data-test="last-apply-movement-category"]').text())).toEqual(
      TWELVE_CATEGORIZED.map((one) => one.categoryName),
    )

    const expense = rows[0]
    expect(expense?.get('[data-test="last-apply-movement-date"]').text()).toBe(
      formatDate('2026-08-11'),
    )
    expect(expense?.get('[data-test="last-apply-movement-description"]').text()).toBe(
      'COMPRA SINTETICO COLMADO NORTE',
    )
    expect(expense?.get('[data-test="last-apply-movement-category"]').text()).toBe('Supermercado')
    // The expense carries the minus sign, the income does not.
    expect(expense?.get('[data-test="last-apply-movement-amount"]').text()).toBe(
      formatMoney('-41.37'),
    )

    const income = rows[1]
    expect(income?.get('[data-test="last-apply-movement-date"]').text()).toBe(
      formatDate('2026-08-12'),
    )
    expect(income?.get('[data-test="last-apply-movement-category"]').text()).toBe('Nomina')
    expect(income?.get('[data-test="last-apply-movement-amount"]').text()).toBe(
      formatMoney('1318.64'),
    )
    expect(income?.get('[data-test="last-apply-movement-amount"]').text()).not.toContain('-')

    expect(button.text()).toBe('Hide the movements')

    await button.trigger('click')

    expect(wrapper.findAll('[data-test="last-apply-movement"]')).toHaveLength(0)
    expect(button.text()).toBe('Show the 12 movements')
  })

  it('offers the conflicts behind their own button', async () => {
    const wrapper = mountReport(threeConflicts)
    const button = wrapper.get('[data-test="last-apply-show-conflicts"]')

    expect(button.text()).toBe('Show the 3 conflicts')
    expect(wrapper.find('[data-test="rule-conflicts"]').exists()).toBe(false)

    await button.trigger('click')

    expect(wrapper.findAll('[data-test="rule-conflict"]')).toHaveLength(3)
    expect(wrapper.get('[data-test="rule-conflicts"]').text()).toContain('PAGO SINTETICO EJEMPLO')
    expect(button.text()).toBe('Hide the conflicts')
    // Its own button: the list of categorized movements stays folded.
    expect(wrapper.findAll('[data-test="last-apply-movement"]')).toHaveLength(0)

    const without = mountReport({ conflictCount: 0, conflicts: [] })

    expect(without.find('[data-test="last-apply-show-conflicts"]').exists()).toBe(false)
    expect(without.find('[data-test="rule-conflicts"]').exists()).toBe(false)
  })

  it('emits dismiss when Dismiss is pressed', async () => {
    const wrapper = mountReport()
    const dismiss = wrapper.get('[data-test="last-apply-dismiss"]')

    expect(dismiss.text()).toBe('Dismiss')
    expect(wrapper.emitted('dismiss')).toBeUndefined()

    await dismiss.trigger('click')

    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('offers no way to change a movement', async () => {
    const wrapper = mountReport(threeConflicts)
    await wrapper.get('[data-test="last-apply-show-movements"]').trigger('click')
    await wrapper.get('[data-test="last-apply-show-conflicts"]').trigger('click')

    const block = wrapper.get('[data-test="last-apply"]')
    expect(block.findAll('[data-test="last-apply-movement"]')).toHaveLength(12)
    expect(block.findAll('[data-test="rule-conflict"]')).toHaveLength(3)
    expect(block.findAll('select')).toHaveLength(0)
    expect(block.findAll('input')).toHaveLength(0)
    expect(block.findAll('a')).toHaveLength(0)
    expect(
      block
        .findAll('button')
        .map((one) => one.attributes('data-test'))
        .sort(),
    ).toEqual(['last-apply-dismiss', 'last-apply-show-conflicts', 'last-apply-show-movements'])
  })

  it('names the rules that matched each categorized movement', async () => {
    const wrapper = mountReport(TWO_CATEGORIZED)
    await wrapper.get('[data-test="last-apply-show-movements"]').trigger('click')

    const rows = wrapper.findAll('[data-test="last-apply-movement"]')
    expect(rows).toHaveLength(2)
    expect(
      rows[0]?.findAll('[data-test="last-apply-movement-rule"]').map((one) => one.text()),
    ).toEqual(['“sintetico colmado”', '“colmado norte”'])
    expect(
      rows[1]?.findAll('[data-test="last-apply-movement-rule"]').map((one) => one.text()),
    ).toEqual(['“taller ejemplo”'])
  })

  // ─── The pass that ran when a rule was created or changed (feature 33) ──

  const mountSaved = (raw: Record<string, unknown>, cause: Exclude<ResultCause, 'apply'>) => {
    const saved = parseSavedRule(raw)
    return mount(LastApplyReport, {
      props: { report: { at: AT, result: saved.result, cause, rule: saved.rule } },
    })
  }

  it('heads the box with the rule and its category when a rule was created or changed', async () => {
    const created = mountSaved(ACADEMY_CREATED, 'create')

    expect(created.get('[data-test="last-apply-headline"]').text()).toBe(
      'Rule “academia ficticia norte” → Educación created at 10:42: 3 movements categorized.',
    )
    expect(created.find('[data-test="last-apply-unfinished"]').exists()).toBe(false)
    // The list of what it moved, as after applying.
    await created.get('[data-test="last-apply-show-movements"]').trigger('click')
    const rows = created.findAll('[data-test="last-apply-movement"]')
    expect(rows).toHaveLength(3)
    expect(rows[0]?.get('[data-test="last-apply-movement-category"]').text()).toBe('Educación')

    const changed = mountSaved(ACADEMY_CREATED, 'update')
    expect(changed.get('[data-test="last-apply-headline"]').text()).toBe(
      'Rule “academia ficticia norte” → Educación saved at 10:42: 3 movements categorized.',
    )
  })

  it('adds the unfinished sentence to the box of a rule whose pass did not finish', () => {
    const wrapper = mountSaved(ACADEMY_UNFINISHED, 'create')

    expect(wrapper.get('[data-test="last-apply-headline"]').text()).toBe(
      'Rule “academia ficticia norte” → Educación created at 10:42: 1 movement categorized.',
    )
    expect(wrapper.get('[data-test="last-apply-unfinished"]').text()).toBe(
      'Not all of its movements could be moved; the rest will move the next time you create or change a rule.',
    )
    expect(wrapper.text()).not.toContain('La pasada se cortó')
  })
})
