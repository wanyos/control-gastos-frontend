import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseCategories } from '@/shared/categories'
import { parseMovement } from '@/shared/movements'
import type { Movement } from '@/shared/movements'
import { createValidators } from '@/shared/validation'

import RowCategoryEditor from '../components/RowCategoryEditor.vue'
import { CATEGORIES, EXPENSE, INCOME, NEUTRAL, changed } from './fixtures'

const checks = createValidators('test')
const parse = (raw: Record<string, unknown>): Movement => parseMovement(checks, raw, 'movement')
const tree = parseCategories(CATEGORIES)

const mountEditor = (raw: Record<string, unknown>, props: Record<string, unknown> = {}) =>
  mount(RowCategoryEditor, {
    props: { movement: parse(raw), categories: tree, ...props },
  })

describe('RowCategoryEditor (R4, R5, R16)', () => {
  it('offers only the categories whose kind matches an expense, plus No category (R4)', () => {
    const editor = mountEditor(EXPENSE)
    const options = editor.findAll('option').map((option) => option.text())

    expect(options).toEqual(['No category', 'Food', 'Groceries'])
    expect(options).not.toContain('Salary')
    expect(editor.findAll('optgroup').map((group) => group.attributes('label'))).toEqual(['Food'])
  })

  it('offers only income categories for an income (R4)', () => {
    expect(
      mountEditor(INCOME)
        .findAll('option')
        .map((option) => option.text()),
    ).toEqual(['No category', 'Salary'])
  })

  it('shows the category the movement already has as the chosen one', () => {
    const select = mountEditor(EXPENSE).get('select')

    expect((select.element as HTMLSelectElement).value).toBe('1')
  })

  it('shows an empty choice when the movement has no category', () => {
    const editor = mountEditor(changed(EXPENSE, { categoryId: null, category: null }))

    expect((editor.get('select').element as HTMLSelectElement).value).toBe('')
  })

  it('saves as soon as a category is chosen: there is no Save button', async () => {
    const editor = mountEditor(EXPENSE)

    await editor.get('select').setValue('2')

    expect(editor.emitted('change')).toEqual([[2]])
    expect(editor.text()).not.toContain('Save')
  })

  it('emits null when No category is chosen', async () => {
    const editor = mountEditor(EXPENSE)

    await editor.get('select').setValue('')

    expect(editor.emitted('change')).toEqual([[null]])
  })

  it('keeps a neutral movement uncategorizable, with its own sentence (R5)', () => {
    const editor = mountEditor(NEUTRAL)

    expect(editor.get('select').attributes('disabled')).toBeDefined()
    expect(editor.text()).toContain("Neutral movements can't be categorized")
    expect(editor.findAll('optgroup')).toHaveLength(0)
    expect(editor.get('[data-test="row-create-rule"]').attributes('disabled')).toBeDefined()
  })

  it('waits while a write is in flight (C2)', () => {
    const editor = mountEditor(EXPENSE, { busy: true })

    expect(editor.get('select').attributes('disabled')).toBeDefined()
    expect(editor.get('[data-test="row-create-rule"]').attributes('disabled')).toBeDefined()
  })

  it('has nothing to choose from while the category tree is unknown', () => {
    const editor = mountEditor(EXPENSE, { categories: null })

    expect(editor.get('select').attributes('disabled')).toBeDefined()
    expect(editor.get('[data-test="row-create-rule"]').attributes('disabled')).toBeDefined()
  })

  it('asks for the rule dialog without writing anything (R16, R17)', async () => {
    const editor = mountEditor(EXPENSE)

    await editor.get('[data-test="row-create-rule"]').trigger('click')

    expect(editor.emitted('create-rule')).toHaveLength(1)
    expect(editor.emitted('change')).toBeUndefined()
  })

  it('names the movement in the label of Create rule', () => {
    const editor = mountEditor(EXPENSE)

    expect(editor.get('[data-test="row-create-rule"]').attributes('aria-label')).toBe(
      'Create a rule from CAFETERÍA CENTRAL',
    )
  })

  it('closes with the button and with Esc: the line goes back to its badge (R3)', async () => {
    const editor = mountEditor(EXPENSE)

    await editor.get('[data-test="row-category-close"]').trigger('click')
    await editor.get('[data-test="row-category-editor"]').trigger('keydown.esc')

    expect(editor.emitted('close')).toHaveLength(2)
  })

  it('carries no control that could change anything but the category (C1)', () => {
    const editor = mountEditor(EXPENSE)

    expect(editor.findAll('select')).toHaveLength(1)
    expect(editor.findAll('input')).toHaveLength(0)
    expect(editor.text()).not.toContain('Confirm')
    expect(editor.text()).not.toContain('Delete')
  })
})
