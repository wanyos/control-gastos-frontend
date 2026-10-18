import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import MovementRow from '../components/MovementRow.vue'
import { parseCategories, parseMovementPage } from '../service'
import type { Movement } from '../types'
import {
  CATEGORY_TREE,
  CLOSING_EXPENSE,
  DEPOSIT_CANCELLATION,
  DEPOSIT_DOUBTFUL,
  DEPOSIT_MATURITY,
  DEPOSIT_OPENING,
  EXPENSE,
  INCOME,
  NEUTRAL,
  PAGE_OF_THREE,
} from './fixtures'

const categories = parseCategories(CATEGORY_TREE)

// Class names are composed at runtime: a literal in a spec would end up in the
// production CSS, because Tailwind scans src/ as text (docs/stack.md).
const cls = (...parts: string[]) => parts.join('-')

const movementOf = (raw: unknown): Movement => {
  const [movement] = parseMovementPage({ ...PAGE_OF_THREE, movements: [raw] }).movements
  if (!movement) throw new Error('fixture has no movement')
  return movement
}

const rowOf = (raw: unknown) =>
  mount(MovementRow, { props: { movement: movementOf(raw), categories } })

describe('MovementRow (R4)', () => {
  it('shows an expense with a minus sign and the strong ink', () => {
    const wrapper = rowOf(EXPENSE)

    const amount = wrapper.get('[data-test="movement-amount"]')
    expect(amount.text()).toBe(formatMoney('-45.37'))
    expect(amount.classes()).toEqual(
      expect.arrayContaining([
        cls('font', 'mono'),
        cls('tabular', 'nums'),
        cls('text', 'ink', 'strong'),
      ]),
    )
  })

  it('shows an income in the positive tone, without a sign', () => {
    const wrapper = rowOf(INCOME)

    const amount = wrapper.get('[data-test="movement-amount"]')
    expect(amount.text()).toBe(formatMoney('1200.00'))
    expect(amount.classes()).toContain(cls('text', 'positive'))
  })

  it('shows a neutral movement as zero, in a muted tone', () => {
    const wrapper = rowOf(NEUTRAL)

    const amount = wrapper.get('[data-test="movement-amount"]')
    expect(amount.text()).toBe(formatMoney('0.00'))
    expect(amount.classes()).toContain(cls('text', 'ink', 'muted'))
  })

  it('shows the description, the account and the booking date', () => {
    const wrapper = rowOf(EXPENSE)

    expect(wrapper.get('[data-test="movement-description"]').text()).toBe('CAFETERÍA CENTRAL')
    expect(wrapper.get('[data-test="movement-account"]').text()).toBe('Bankinter ···0236')
    // Generated, never typed: ICU may change the month abbreviation.
    expect(wrapper.get('[data-test="movement-date"]').text()).toBe(formatDate('2026-07-31'))
  })

  it('names the account as the bank and its last four digits, without repeating the bank', () => {
    const account = rowOf(EXPENSE).get('[data-test="movement-account"]').text()

    expect(account).toBe('Bankinter ···0236')
    expect(account).not.toContain('bankinter')
  })

  it('names the category, and marks the movements that have none', () => {
    expect(rowOf(EXPENSE).get('[data-test="movement-category"]').text()).toBe('Food')
    expect(rowOf(INCOME).get('[data-test="movement-category"]').text()).toBe('Uncategorized')
  })

  // Replaces the F16 test that fixed the row at one selector and one Confirm
  // (specs/17-category-rules/design.md §10).
  it('offers one tick box, one category selector, Confirm and Create rule, and nothing else', () => {
    const wrapper = rowOf(EXPENSE)

    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(1)
    expect(boxes[0]?.attributes('aria-label')).toBe('Select CAFETERÍA CENTRAL')
    expect(wrapper.findAll('select')).toHaveLength(1)
    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.text())).toEqual(['Confirm', 'Create rule'])
  })

  describe('Create rule (feature 17, R1)', () => {
    it('names the movement it would come from, and asks for the dialog', async () => {
      const wrapper = rowOf(EXPENSE)

      const button = wrapper.get('[data-test="movement-create-rule"]')
      expect(button.attributes('aria-label')).toBe('Create a rule from CAFETERÍA CENTRAL')
      expect(button.attributes('disabled')).toBeUndefined()

      await button.trigger('click')

      expect(wrapper.emitted('create-rule')).toHaveLength(1)
      // Asking for the dialog changes nothing about the movement.
      expect(wrapper.emitted('categorize')).toBeUndefined()
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })

    it('is disabled on a neutral movement, which no rule can ever categorize', () => {
      const wrapper = rowOf(NEUTRAL)

      expect(wrapper.get('[data-test="movement-create-rule"]').attributes('disabled')).toBeDefined()
    })

    it('is disabled while the categories are unknown', () => {
      const wrapper = mount(MovementRow, {
        props: { movement: movementOf(EXPENSE), categories: null },
      })

      expect(wrapper.get('[data-test="movement-create-rule"]').attributes('disabled')).toBeDefined()
    })
  })

  it('never lets the banking fact be edited: no amount, date or description control (C4)', () => {
    const wrapper = rowOf(EXPENSE)

    expect(wrapper.findAll('input:not([type="checkbox"])')).toHaveLength(0)
    expect(wrapper.findAll('textarea')).toHaveLength(0)
    expect(wrapper.get('[data-test="movement-amount"]').element.tagName).toBe('SPAN')
    expect(wrapper.get('[data-test="movement-description"]').element.tagName).toBe('P')
  })

  it('tells its parent what was ticked, chosen and confirmed, without deciding anything', async () => {
    const wrapper = rowOf(EXPENSE)

    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('select').setValue('2')
    await wrapper.get('[data-test="movement-confirm"]').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
    expect(wrapper.emitted('categorize')).toEqual([[2]])
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('marks the selected row with the brand edge, and leaves the rest alone', () => {
    const plain = rowOf(EXPENSE)
    const picked = mount(MovementRow, {
      props: { movement: movementOf(EXPENSE), selected: true, categories },
    })

    expect(picked.get('[data-test="movement-row"]').classes()).toEqual(
      expect.arrayContaining([cls('border', 'brand'), cls('bg', 'surface', 'sunken')]),
    )
    expect(plain.get('[data-test="movement-row"]').classes()).toContain(
      cls('border', 'transparent'),
    )
    expect((picked.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('waits for the action in flight instead of firing a second one (R11)', () => {
    const wrapper = mount(MovementRow, {
      props: { movement: movementOf(EXPENSE), busy: true, categories },
    })

    expect(wrapper.get('[data-test="movement-confirm"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="movement-create-rule"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
  })

  it('carries the id of its movement so the notice can find it', () => {
    const row = rowOf(EXPENSE).get('[data-test="movement-row"]')

    expect(row.element.tagName).toBe('LI')
    expect(row.attributes('data-movement-id')).toBe(String(movementOf(EXPENSE).id))
    expect(
      rowOf(INCOME)
        .find(`[data-movement-id="${movementOf(INCOME).id}"]`)
        .exists(),
    ).toBe(true)
  })

  // Feature 31: a deposit movement looks the same as in Movements (R9): the same words
  // under the description, the same crossed-out grey, the same `Counts …` under the
  // amount. Every other line of Review keeps its look.
  describe('a deposit movement (feature 31, R9)', () => {
    const AMOUNT = '[data-test="movement-amount"]'
    const DESCRIPTION = '[data-test="movement-description"]'
    const DEPOSIT = '[data-test="movement-deposit"]'
    const COUNTED = '[data-test="movement-counted"]'
    const NBSP = String.fromCharCode(0xa0)

    it('paints a deposit line in Review the same way as in Movements', () => {
      // Opening and cancellation: crossed out, grey, the kind under the description.
      for (const [raw, kind, bank] of [
        [DEPOSIT_OPENING, 'Deposit opening', formatMoney('-25000.00')],
        [DEPOSIT_CANCELLATION, 'Deposit cancellation', formatMoney('10000.00')],
      ] as const) {
        const row = rowOf(raw)
        expect(row.get(AMOUNT).text()).toBe(bank)
        expect(row.get(AMOUNT).classes()).toEqual(
          expect.arrayContaining([cls('line', 'through'), cls('text', 'ink', 'faint')]),
        )
        expect(row.get(DESCRIPTION).classes()).toContain(cls('text', 'ink', 'muted'))
        expect(row.get(DEPOSIT).text()).toBe(kind)
        expect(row.get(DEPOSIT).classes()).toContain(cls('text', 'ink', 'muted'))
        expect(row.find(COUNTED).exists()).toBe(false)
      }

      // Maturity: the bank amount in grey and not crossed out, what counts under it.
      const maturity = rowOf(DEPOSIT_MATURITY)
      expect(maturity.get(AMOUNT).text()).toBe(`25.037,07${NBSP}€`)
      expect(maturity.get(AMOUNT).classes()).toContain(cls('text', 'ink', 'muted'))
      expect(maturity.get(AMOUNT).classes()).not.toContain(cls('line', 'through'))
      expect(maturity.get(AMOUNT).classes()).not.toContain(cls('text', 'positive'))
      expect(maturity.get(COUNTED).text()).toBe(`Counts 37,07${NBSP}€`)
      expect(maturity.get(COUNTED).classes()).toContain(cls('text', 'positive'))
      expect(maturity.get(DEPOSIT).text()).toBe('Deposit maturity · only the interest counts')
      expect(maturity.get(DESCRIPTION).classes()).toContain(cls('text', 'ink', 'strong'))

      // Doubtful: crossed out, and its reason in amber.
      const doubtful = rowOf(DEPOSIT_DOUBTFUL)
      expect(doubtful.get(AMOUNT).text()).toBe(formatMoney('15021.30'))
      expect(doubtful.get(AMOUNT).classes()).toEqual(
        expect.arrayContaining([cls('line', 'through'), cls('text', 'ink', 'faint')]),
      )
      expect(doubtful.get(DEPOSIT).text()).toBe(
        'Doubtful deposit maturity · no deposit amount found for it · not counted for now',
      )
      expect(doubtful.get(DEPOSIT).classes()).toContain(cls('text', 'warning'))
      expect(doubtful.find(COUNTED).exists()).toBe(false)

      // Never the words of the mark or of a pairing.
      for (const raw of [
        DEPOSIT_OPENING,
        DEPOSIT_CANCELLATION,
        DEPOSIT_MATURITY,
        DEPOSIT_DOUBTFUL,
      ]) {
        const text = rowOf({
          ...raw,
          transferId: 'tr_2026_10_09_1',
          excludedFromTotals: true,
        }).text()
        expect(text).not.toContain('Transfer')
        expect(text).not.toContain('Not counted')
      }
    })

    it('leaves the lines of Review that are not deposits as they were', () => {
      for (const raw of [EXPENSE, INCOME, NEUTRAL]) {
        const row = rowOf(raw)
        expect(row.find(DEPOSIT).exists()).toBe(false)
        expect(row.find(COUNTED).exists()).toBe(false)
        expect(row.get(DESCRIPTION).classes()).toContain(cls('text', 'ink', 'strong'))
        expect(row.get(AMOUNT).classes()).not.toContain(cls('line', 'through'))
      }
      expect(rowOf(EXPENSE).get(AMOUNT).classes()).toContain(cls('text', 'ink', 'strong'))
      expect(rowOf(INCOME).get(AMOUNT).classes()).toContain(cls('text', 'positive'))
      expect(rowOf(NEUTRAL).get(AMOUNT).classes()).toContain(cls('text', 'ink', 'muted'))
      // A marked or paired line that is not a deposit is not crossed out in Review either.
      const marked = rowOf({ ...EXPENSE, transferId: 'tr_2026_07_31_1', excludedFromTotals: true })
      expect(marked.get(AMOUNT).classes()).not.toContain(cls('line', 'through'))
      expect(marked.get(DESCRIPTION).classes()).toContain(cls('text', 'ink', 'strong'))
    })
  })
})

// Feature 34: where the category came from, only when the closing of the import set it.
describe('MovementRow: the source of the category (feature 34, R15)', () => {
  it('says the category was set when the import was closed only for that source', () => {
    const closing = rowOf(CLOSING_EXPENSE)
    const line = closing.get('[data-test="movement-closing"]')
    expect(line.text()).toBe('Set when the import was closed')
    // In the small grey line under the description, with nothing to stand out.
    expect(line.element.parentElement?.textContent).toContain(
      closing.get('[data-test="movement-account"]').text(),
    )
    expect(line.classes()).not.toContain(cls('font', 'semibold'))
    expect(closing.get('[data-test="movement-category"]').text()).toBe('Otros gastos')

    for (const source of ['manual', 'rule', null]) {
      const row = rowOf({ ...CLOSING_EXPENSE, categorySource: source })
      expect(row.find('[data-test="movement-closing"]').exists()).toBe(false)
      expect(row.text()).not.toContain('Set when the import was closed')
    }
    // An answer without the field says nothing either.
    expect(rowOf(EXPENSE).find('[data-test="movement-closing"]').exists()).toBe(false)
  })
})
