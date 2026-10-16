import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseCategories } from '@/shared/categories'
import BaseBadge from '@/shared/components/BaseBadge.vue'
import { parseMovement } from '@/shared/movements'
import type { Movement } from '@/shared/movements'
import { createValidators } from '@/shared/validation'
import { formatMoney } from '@/shared/money'

import StatementRow from '../components/StatementRow.vue'
import {
  CATEGORIES,
  DEPOSIT_CANCELLATION,
  DEPOSIT_DOUBTFUL,
  DEPOSIT_MATURITY,
  DEPOSIT_OPENING,
  EXPENSE,
  EXPENSE_SAME_DAY,
  INCOME,
  NEUTRAL,
  TRANSFER,
  excluded,
  movement,
} from './fixtures'

const checks = createValidators('test')
const parse = (raw: Record<string, unknown>): Movement => parseMovement(checks, raw, 'movement')
const tree = parseCategories(CATEGORIES)

const mountRow = (raw: Record<string, unknown>, props: Record<string, unknown> = {}) =>
  mount(StatementRow, { props: { movement: parse(raw), ...props } })

const text = (raw: Record<string, unknown>) => mountRow(raw).text()

describe('StatementRow (R9, R10)', () => {
  it('shows the description, the account, the category and the amount', () => {
    const row = mountRow(EXPENSE)

    expect(row.get('[data-test="statement-row-description"]').text()).toBe('CAFETERÍA CENTRAL')
    expect(row.get('[data-test="statement-row-account"]').text()).toBe('Bankinter ···0236')
    expect(row.get('[data-test="statement-row-category"]').text()).toBe('Food')
    expect(row.get('[data-test="statement-row-amount"]').text()).toBe(formatMoney('-45.37'))
  })

  it('takes the sign from `type`, not from the amount', () => {
    expect(text(EXPENSE)).toContain(formatMoney('-45.37'))
    expect(text(INCOME)).toContain(formatMoney('1200.00'))
    expect(text(NEUTRAL)).toContain(formatMoney('0.00'))
  })

  it('says Uncategorized when the movement has no category', () => {
    expect(mountRow(NEUTRAL).get('[data-test="statement-row-category"]').text()).toBe(
      'Uncategorized',
    )
  })

  it('never paints the balance after the movement, even when the file brings it', () => {
    const row = mountRow(EXPENSE)

    expect(parse(EXPENSE).balanceAfter).toBe('9954.63')
    expect(row.text()).not.toContain('9954')
    expect(row.text()).not.toContain('9.954')
    expect(row.html()).not.toContain('balance')
  })

  it('does not repeat the date: the day header above the row carries it (R8)', () => {
    expect(text(EXPENSE)).not.toContain('11 Sept 2026')
    expect(text(EXPENSE)).not.toContain('2026-09-11')
  })

  it('marks a paired transfer, and only a paired transfer', () => {
    const marked = mountRow(TRANSFER).find('[data-test="statement-row-transfer"]')

    expect(marked.exists()).toBe(true)
    expect(marked.text()).toBe('Transfer')
    expect(marked.attributes('aria-label')).toBe(
      "Paired transfer: not counted in this month's figures",
    )
    expect(mountRow(EXPENSE).find('[data-test="statement-row-transfer"]').exists()).toBe(false)
  })

  // Feature 21: the row gained ONE control, its category badge. Everything else about
  // the movement is still untouchable from here (C1).
  it('carries no control but the category: nothing else can be written (C1)', () => {
    const row = mountRow(EXPENSE)

    expect(row.findAll('input')).toHaveLength(0)
    expect(row.findAll('select')).toHaveLength(0)
    expect(row.findAll('button').map((button) => button.attributes('data-test'))).toEqual([
      'statement-row-category-button',
    ])
    expect(row.text()).not.toContain('Confirm')
  })

  describe('the category badge is the control (feature 21: R2, R3, R5)', () => {
    it('shows the category as a pressable badge, with no selector in the line (R2)', () => {
      const row = mountRow(EXPENSE)
      const badge = row.get('[data-test="statement-row-category-button"]')

      expect(badge.attributes('aria-label')).toBe('Change category of CAFETERÍA CENTRAL')
      expect(badge.attributes('title')).toBe('Change category')
      expect(badge.text()).toBe('Food')
      expect(row.findAll('select')).toHaveLength(0)
      expect(row.find('[data-test="row-category-editor"]').exists()).toBe(false)
    })

    it('asks to be edited when the badge is pressed, and writes nothing by itself (R3)', async () => {
      const row = mountRow(EXPENSE)

      await row.get('[data-test="statement-row-category-button"]').trigger('click')

      expect(row.emitted('edit')).toHaveLength(1)
      expect(row.emitted('categorize')).toBeUndefined()
    })

    it('replaces the badge by the editor in its own place when this row is edited (R3)', () => {
      const row = mountRow(EXPENSE, { editing: true, categories: tree })

      expect(row.find('[data-test="row-category-editor"]').exists()).toBe(true)
      expect(row.find('[data-test="statement-row-category-button"]').exists()).toBe(false)
      expect(row.findAll('select')).toHaveLength(1)
    })

    it('passes the choice, the rule and the close up (R3, R16)', async () => {
      const row = mountRow(EXPENSE, { editing: true, categories: tree })

      await row.get('select').setValue('2')
      await row.get('[data-test="row-create-rule"]').trigger('click')
      await row.get('[data-test="row-category-close"]').trigger('click')

      expect(row.emitted('categorize')).toEqual([[2]])
      expect(row.emitted('create-rule')).toHaveLength(1)
      expect(row.emitted('close-editor')).toHaveLength(1)
    })

    it('a neutral movement keeps a plain badge, not a button (R5)', () => {
      const row = mountRow(NEUTRAL)

      expect(row.find('[data-test="statement-row-category-button"]').exists()).toBe(false)
      expect(row.findAll('button')).toHaveLength(0)
      expect(row.get('[data-test="statement-row-category"]').attributes('title')).toBe(
        "Neutral movements can't be categorized",
      )
    })

    it('is the same control on a confirmed movement as on a pending one (R6)', () => {
      const pending = mountRow(movement({ ...EXPENSE, status: 'pending_review' }))
      const confirmed = mountRow(EXPENSE)

      expect(
        pending.get('[data-test="statement-row-category-button"]').attributes('aria-label'),
      ).toBe(confirmed.get('[data-test="statement-row-category-button"]').attributes('aria-label'))
    })
  })

  it('shows an unknown bank slug as it comes', () => {
    const raw = movement({
      ...EXPENSE,
      account: {
        id: 9,
        iban: 'ES7300815204618837401111',
        bank: 'sabadell',
        alias: 'sabadell ···1111',
        type: 'checking',
      },
    })

    expect(mountRow(raw).get('[data-test="statement-row-account"]').text()).toBe('sabadell ···1111')
  })

  it('names the account as the bank and its last four digits, without repeating the bank', () => {
    const account = mountRow(EXPENSE).get('[data-test="statement-row-account"]').text()

    expect(account).toBe('Bankinter ···0236')
    expect(account).not.toContain('bankinter')
  })

  // --- The selection mode and the mark (feature 22) ---

  describe('the checkbox of the selection mode (R4, R5, R6)', () => {
    it('paints NO checkbox while the mode is off (R4)', () => {
      const row = mountRow(EXPENSE)

      expect(row.find('[data-test="statement-row-select"]').exists()).toBe(false)
      expect(row.find('input[type="checkbox"]').exists()).toBe(false)
    })

    it('paints one checkbox per row while the mode is on, named after the movement (R5)', () => {
      const row = mountRow(EXPENSE, { selectable: true })

      const box = row.get('[data-test="statement-row-select"] input')
      expect(box.attributes('aria-label')).toBe('Select CAFETERÍA CENTRAL')
      expect((box.element as HTMLInputElement).checked).toBe(false)
    })

    it('shows the row as ticked and asks the parent to toggle it', async () => {
      const row = mountRow(EXPENSE, { selectable: true, selected: true })
      const box = row.get('[data-test="statement-row-select"] input')
      expect((box.element as HTMLInputElement).checked).toBe(true)

      await box.setValue(false)

      expect(row.emitted('toggle')).toHaveLength(1)
    })

    it('stops the category badge from being pressable in that mode (R6)', () => {
      const off = mountRow(EXPENSE)
      expect(off.find('[data-test="statement-row-category-button"]').exists()).toBe(true)

      const on = mountRow(EXPENSE, { selectable: true })

      expect(on.find('[data-test="statement-row-category-button"]').exists()).toBe(false)
      expect(on.find('button').exists()).toBe(false)
      // The badge is still there: it is not pressable, it has not gone.
      expect(on.get('[data-test="statement-row-category"]').text()).toBe('Food')
    })

    it('gives the badge back as a button when the mode is turned off again (R6)', async () => {
      const row = mountRow(EXPENSE, { selectable: true })

      await row.setProps({ selectable: false })

      expect(row.find('[data-test="statement-row-category-button"]').exists()).toBe(true)
      expect(row.find('[data-test="statement-row-select"]').exists()).toBe(false)
    })

    it('disables the checkbox while a write is in flight (C5)', () => {
      const row = mountRow(EXPENSE, { selectable: true, busy: true })

      expect(
        (row.get('[data-test="statement-row-select"] input').element as HTMLInputElement).disabled,
      ).toBe(true)
    })
  })

  describe('a movement that does not count in the figures (R8, R9)', () => {
    it('carries the `Not counted` label, with its reason', () => {
      const row = mountRow(excluded(EXPENSE))

      const label = row.get('[data-test="statement-row-excluded"]')
      expect(label.text()).toBe('Not counted')
      expect(label.attributes('title')).toBe("Not counted in this month's figures")
    })

    it('has no such label at all when it is not marked', () => {
      expect(mountRow(EXPENSE).find('[data-test="statement-row-excluded"]').exists()).toBe(false)
    })

    it('lives next to the Transfer label, both at once', () => {
      const row = mountRow(excluded(TRANSFER))

      expect(row.find('[data-test="statement-row-transfer"]').exists()).toBe(true)
      expect(row.find('[data-test="statement-row-excluded"]').exists()).toBe(true)
    })

    // Feature 29 replaced the decision of the F22 («only the ink goes quiet, no
    // strikethrough»): the amount is crossed out and faint. The figure, the sign and
    // the row itself are still the same.
    it('crosses the amount out without changing it, and paints no coloured row', () => {
      const plain = mountRow(EXPENSE).get('[data-test="statement-row-amount"]')
      const marked = mountRow(excluded(EXPENSE)).get('[data-test="statement-row-amount"]')

      expect(marked.text()).toBe(plain.text())
      expect(marked.classes()).toContain('text-ink-faint')
      expect(marked.classes()).toContain('line-through')
      expect(plain.classes()).toContain('text-ink-strong')
      expect(plain.classes()).not.toContain('line-through')
      // No coloured row and no side stripe: the row is the same as an unmarked one.
      const row = mountRow(excluded(EXPENSE))
      expect(row.get('[data-test="statement-row"]').classes().join(' ')).toBe(
        mountRow(EXPENSE).get('[data-test="statement-row"]').classes().join(' '),
      )
    })

    it('crosses an income out too, sign and figure untouched', () => {
      const marked = mountRow(excluded(INCOME)).get('[data-test="statement-row-amount"]')

      expect(marked.text()).toBe(formatMoney('1200.00'))
      expect(marked.classes()).toContain('text-ink-faint')
      expect(marked.classes()).toContain('line-through')
      expect(marked.classes()).not.toContain('text-positive')
    })
  })

  // --- What counts and what does not, at a glance (feature 29) ---

  describe('telling apart what counts, what does not and what has no category', () => {
    const AMOUNT = '[data-test="statement-row-amount"]'
    const DESCRIPTION = '[data-test="statement-row-description"]'
    const CATEGORY = '[data-test="statement-row-category"]'
    const ACCOUNT = '[data-test="statement-row-account"]'
    const TRANSFER_LABEL = '[data-test="statement-row-transfer"]'
    const EXCLUDED_LABEL = '[data-test="statement-row-excluded"]'

    /** An income that is one of the two movements of a paired transfer. */
    const INCOME_TRANSFER = movement({ ...INCOME, id: 16, transferId: 'tr_2026_09_04_2' })
    /** A paired transfer that still has its category. */
    const TRANSFER_WITH_CATEGORY = movement({ ...EXPENSE, id: 17, transferId: 'tr_2026_09_11_3' })

    it('crosses out the amount and greys the description of a marked movement and of a paired transfer', () => {
      for (const raw of [excluded(EXPENSE), excluded(INCOME), TRANSFER, INCOME_TRANSFER]) {
        const row = mountRow(raw)

        expect(row.get(AMOUNT).classes()).toContain('text-ink-faint')
        expect(row.get(AMOUNT).classes()).toContain('line-through')
        expect(row.get(DESCRIPTION).classes()).toContain('text-ink-muted')
        expect(row.get(DESCRIPTION).classes()).not.toContain('text-ink-strong')
      }

      // What counts keeps the look it had: no strikethrough, its own colour (R3).
      const expense = mountRow(EXPENSE)
      expect(expense.get(AMOUNT).classes()).not.toContain('line-through')
      expect(expense.get(AMOUNT).classes()).toContain('text-ink-strong')
      expect(expense.get(DESCRIPTION).classes()).toContain('text-ink-strong')
      expect(expense.get(DESCRIPTION).classes()).not.toContain('text-ink-muted')

      const income = mountRow(INCOME)
      expect(income.get(AMOUNT).classes()).not.toContain('line-through')
      expect(income.get(AMOUNT).classes()).toContain('text-positive')
      expect(income.get(DESCRIPTION).classes()).toContain('text-ink-strong')

      const neutral = mountRow(NEUTRAL)
      expect(neutral.get(AMOUNT).classes()).not.toContain('line-through')
      expect(neutral.get(AMOUNT).classes()).toContain('text-ink-muted')
    })

    it('never paints the amount of a movement that does not count in green or in white', () => {
      for (const raw of [excluded(INCOME), INCOME_TRANSFER]) {
        expect(mountRow(raw).get(AMOUNT).classes()).not.toContain('text-positive')
      }
      for (const raw of [excluded(EXPENSE), TRANSFER]) {
        expect(mountRow(raw).get(AMOUNT).classes()).not.toContain('text-ink-strong')
      }
      // And the figure is still the one the bank reported, sign included.
      expect(mountRow(excluded(INCOME)).get(AMOUNT).text()).toBe(formatMoney('1200.00'))
      expect(mountRow(TRANSFER).get(AMOUNT).text()).toBe(formatMoney('-500.00'))
    })

    it('gives every category the same label look for income and for expense', () => {
      for (const props of [{}, { selectable: true }]) {
        const income = mountRow(INCOME, props).get(CATEGORY)
        const expense = mountRow(EXPENSE, props).get(CATEGORY)

        expect(income.text()).toBe('Salary')
        expect(expense.text()).toBe('Food')
        expect(income.classes().join(' ')).toBe(expense.classes().join(' '))
        for (const label of [income, expense]) {
          expect(label.classes()).not.toContain('text-brand')
          expect(label.classes()).not.toContain('bg-brand-subtle')
          expect(label.classes()).toContain('bg-surface-sunken')
        }
      }
      // Pressable or not, it is the same label.
      expect(mountRow(EXPENSE).get(CATEGORY).classes().join(' ')).toBe(
        mountRow(EXPENSE, { selectable: true }).get(CATEGORY).classes().join(' '),
      )
    })

    it('draws the Uncategorized label with a dashed outline and no fill', () => {
      const withCategory = mountRow(EXPENSE).get(CATEGORY).classes().join(' ')

      // A button (an expense), not a button (selection mode) and a neutral movement.
      const rows = [
        mountRow(EXPENSE_SAME_DAY),
        mountRow(EXPENSE_SAME_DAY, { selectable: true }),
        mountRow(NEUTRAL),
      ]
      expect(rows[0]?.find('[data-test="statement-row-category-button"]').exists()).toBe(true)
      expect(rows[1]?.find('[data-test="statement-row-category-button"]').exists()).toBe(false)

      for (const row of rows) {
        const label = row.get(CATEGORY)

        expect(label.text()).toBe('Uncategorized')
        expect(label.classes()).toContain('border-dashed')
        expect(label.classes()).toContain('border-line-default')
        expect(label.classes()).toContain('text-ink-muted')
        expect(label.classes().filter((name) => name.startsWith('bg-'))).toEqual([])
        expect(label.classes().join(' ')).not.toBe(withCategory)
      }
    })

    it('keeps the category on a movement that does not count', () => {
      const marked = mountRow(excluded(EXPENSE))

      expect(marked.get(CATEGORY).text()).toBe('Food')
      expect(marked.get(EXCLUDED_LABEL).text()).toBe('Not counted')

      const paired = mountRow(TRANSFER_WITH_CATEGORY)
      expect(paired.get(CATEGORY).text()).toBe('Food')
      expect(paired.get(TRANSFER_LABEL).text()).toBe('Transfer')

      // Without a category it still says so, next to the label of why it is left out.
      const bare = mountRow(excluded(EXPENSE_SAME_DAY))
      expect(bare.get(CATEGORY).text()).toBe('Uncategorized')
      expect(bare.get(EXCLUDED_LABEL).text()).toBe('Not counted')
    })

    it('writes Transfer and Not counted under the description next to the account', () => {
      const row = mountRow(excluded(TRANSFER))
      const line = row.get(ACCOUNT).element.parentElement

      expect(line?.tagName).toBe('P')
      // Under the description: the paragraph right after it, in the same block.
      expect(row.get(DESCRIPTION).element.nextElementSibling).toBe(line)

      const transfer = row.get(TRANSFER_LABEL)
      const notCounted = row.get(EXCLUDED_LABEL)
      expect(transfer.element.parentElement).toBe(line)
      expect(notCounted.element.parentElement).toBe(line)
      // After the account, in this order.
      expect([...(line?.children ?? [])].map((child) => child.getAttribute('data-test'))).toEqual([
        'statement-row-account',
        'statement-row-transfer',
        'statement-row-excluded',
      ])
      expect(transfer.text()).toBe('Transfer')
      expect(notCounted.text()).toBe('Not counted')

      // Plain words, not badges: the only badge of the line is its category.
      const badges = row.findAllComponents(BaseBadge).map((badge) => badge.element)
      expect(badges).not.toContain(transfer.element)
      expect(badges).not.toContain(notCounted.element)
      for (const label of [transfer, notCounted]) {
        expect(label.element.tagName).toBe('SPAN')
        expect(label.classes()).not.toContain('rounded-pill')
        expect(label.classes().filter((name) => name.startsWith('bg-'))).toEqual([])
      }

      expect(transfer.attributes('title')).toBe(
        "Paired transfer: not counted in this month's figures",
      )
      expect(transfer.attributes('aria-label')).toBe(
        "Paired transfer: not counted in this month's figures",
      )
      expect(notCounted.attributes('title')).toBe("Not counted in this month's figures")
      expect(notCounted.attributes('aria-label')).toBe("Not counted in this month's figures")

      // Each one only when its own condition holds, as before.
      const plain = mountRow(EXPENSE)
      expect(plain.find(TRANSFER_LABEL).exists()).toBe(false)
      expect(plain.find(EXCLUDED_LABEL).exists()).toBe(false)
      expect(mountRow(TRANSFER).find(EXCLUDED_LABEL).exists()).toBe(false)
      expect(mountRow(excluded(EXPENSE)).find(TRANSFER_LABEL).exists()).toBe(false)
    })
  })

  it('carries the id of its movement so the notice can find it', () => {
    const row = mountRow(EXPENSE).get('[data-test="statement-row"]')

    expect(row.element.tagName).toBe('LI')
    expect(row.attributes('data-movement-id')).toBe(String(parse(EXPENSE).id))
    expect(
      mountRow(INCOME)
        .find(`[data-movement-id="${parse(INCOME).id}"]`)
        .exists(),
    ).toBe(true)
  })

  // Feature 31: a deposit movement says what it counts, from its `deposit` (R3 … R8).
  describe('a deposit movement (feature 31)', () => {
    const deposits = createValidators('GET /api/movements')
    const mountDeposit = (raw: Record<string, unknown>) =>
      mount(StatementRow, {
        props: { movement: parseMovement(deposits, raw, 'movement', 'required') },
      })
    const AMOUNT = '[data-test="statement-row-amount"]'
    const DESCRIPTION = '[data-test="statement-row-description"]'
    const DEPOSIT = '[data-test="statement-row-deposit"]'
    const COUNTED = '[data-test="statement-row-counted"]'

    it('crosses out a deposit opening and a deposit cancellation and greys their description', () => {
      for (const raw of [DEPOSIT_OPENING, DEPOSIT_CANCELLATION]) {
        const row = mountDeposit(raw)
        const amount = row.get(AMOUNT)

        expect(amount.classes()).toContain('line-through')
        expect(amount.classes()).toContain('text-ink-faint')
        expect(amount.classes()).not.toContain('text-positive')
        expect(amount.classes()).not.toContain('text-ink-strong')
        expect(row.get(DESCRIPTION).classes()).toContain('text-ink-muted')
        expect(row.get(DESCRIPTION).classes()).not.toContain('text-ink-strong')
        expect(row.find(COUNTED).exists()).toBe(false)
      }
    })

    it('writes the kind of deposit movement under the description next to the account', () => {
      const lines = [DEPOSIT_OPENING, DEPOSIT_CANCELLATION, DEPOSIT_MATURITY].map((raw) => {
        const row = mountDeposit(raw)
        const kind = row.get(DEPOSIT)
        // Same line as the account, as a plain word and not a badge.
        expect(kind.element.parentElement).toBe(
          row.get('[data-test="statement-row-account"]').element.parentElement,
        )
        expect(kind.element.tagName).toBe('SPAN')
        expect(kind.classes()).toContain('text-ink-muted')
        return kind.text()
      })

      expect(lines).toEqual([
        'Deposit opening',
        'Deposit cancellation',
        'Deposit maturity · only the interest counts',
      ])
      expect(mountRow(EXPENSE).find(DEPOSIT).exists()).toBe(false)
    })

    it('shows on a deposit maturity the bank amount and under it only the interest that counts', () => {
      const row = mountDeposit(DEPOSIT_MATURITY)
      const amount = row.get(AMOUNT)
      const counted = row.get(COUNTED)

      expect(amount.text()).toBe(formatMoney('25037.07'))
      expect(amount.text()).toBe(`25.037,07${String.fromCharCode(0xa0)}€`)
      expect(amount.classes()).not.toContain('line-through')
      expect(amount.classes()).toContain('text-ink-muted')
      expect(amount.classes()).not.toContain('text-positive')
      expect(counted.text()).toBe(`Counts 37,07${String.fromCharCode(0xa0)}€`)
      expect(counted.classes()).toContain('text-positive')
      expect(counted.classes()).toContain('text-xs')
      // Under the amount, in the same column.
      expect(counted.element.parentElement).toBe(amount.element.parentElement)
      expect(row.get(DESCRIPTION).classes()).toContain('text-ink-strong')
    })

    it('keeps the bank amount and its sign on every deposit movement', () => {
      expect(mountDeposit(DEPOSIT_OPENING).get(AMOUNT).text()).toBe(formatMoney('-25000.00'))
      expect(mountDeposit(DEPOSIT_CANCELLATION).get(AMOUNT).text()).toBe(formatMoney('10000.00'))
      expect(mountDeposit(DEPOSIT_MATURITY).get(AMOUNT).text()).toBe(formatMoney('25037.07'))
      expect(mountDeposit(DEPOSIT_DOUBTFUL).get(AMOUNT).text()).toBe(formatMoney('15021.30'))
    })

    it('shows a doubtful deposit with its reason and its amount crossed out', () => {
      const row = mountDeposit(DEPOSIT_DOUBTFUL)
      const amount = row.get(AMOUNT)
      const kind = row.get(DEPOSIT)

      expect(amount.classes()).toContain('line-through')
      expect(amount.classes()).toContain('text-ink-faint')
      expect(row.get(DESCRIPTION).classes()).toContain('text-ink-muted')
      expect(kind.text()).toBe(
        'Doubtful deposit maturity · no deposit amount found for it · not counted for now',
      )
      expect(kind.classes()).toContain('text-warning')
      expect(row.find(COUNTED).exists()).toBe(false)
    })

    it('never writes Transfer or Not counted on a deposit movement', () => {
      const marked = (raw: Record<string, unknown>) => ({
        ...raw,
        transferId: 'tr_2026_10_09_1',
        excludedFromTotals: true,
      })
      for (const raw of [
        DEPOSIT_OPENING,
        DEPOSIT_CANCELLATION,
        DEPOSIT_MATURITY,
        DEPOSIT_DOUBTFUL,
      ]) {
        const row = mountDeposit(marked(raw))

        expect(row.find('[data-test="statement-row-transfer"]').exists()).toBe(false)
        expect(row.find('[data-test="statement-row-excluded"]').exists()).toBe(false)
        expect(row.text()).not.toContain('Transfer')
        expect(row.text()).not.toContain('Not counted')
      }
      // The maturity still counts its interest, mark or not.
      const maturity = mountDeposit(marked(DEPOSIT_MATURITY))
      expect(maturity.get(AMOUNT).classes()).not.toContain('line-through')
      expect(maturity.find(COUNTED).exists()).toBe(true)
    })
  })
})
