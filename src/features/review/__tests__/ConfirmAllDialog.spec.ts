import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { parseCategories } from '@/shared/categories'

import ConfirmAllDialog from '../components/ConfirmAllDialog.vue'
import { CATEGORY_TREE } from './fixtures'

/** The seeded tree plus the two generic categories the backend seeds. */
const WITH_GENERIC = parseCategories([
  ...CATEGORY_TREE,
  {
    id: 40,
    name: 'Otros gastos',
    kind: 'expense',
    parentId: null,
    createdAt: '2026-10-16T00:00:00.000Z',
    children: [],
  },
  {
    id: 41,
    name: 'Otros ingresos',
    kind: 'income',
    parentId: null,
    createdAt: '2026-10-16T00:00:00.000Z',
    children: [],
  },
])

const dialogOf = (props: Record<string, unknown> = {}) =>
  mount(ConfirmAllDialog, {
    props: { open: true, categories: WITH_GENERIC, busy: false, ...props },
    attachTo: document.body,
  })

const select = (test: string) =>
  document.querySelector<HTMLSelectElement>(`[data-test="${test}"] select`)
const continueButton = () =>
  document.querySelector<HTMLButtonElement>('[data-test="confirm-all-continue"]')

describe('ConfirmAllDialog (2026-10-16)', () => {
  it('proposes the two generic categories when the tree has them, and says it cannot be undone', async () => {
    const wrapper = dialogOf()
    await flushPromises()

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(select('confirm-all-expense')?.value).toBe('40')
    expect(select('confirm-all-income')?.value).toBe('41')
    expect(document.body.textContent).toContain('This cannot be undone')
    expect(continueButton()?.disabled).toBe(false)

    wrapper.unmount()
  })

  it('offers only the categories of each kind, children included, and waits for both choices', async () => {
    const wrapper = dialogOf({ categories: parseCategories(CATEGORY_TREE) })
    await flushPromises()

    const expenseOptions = [...(select('confirm-all-expense')?.options ?? [])].map((o) => o.text)
    expect(expenseOptions).toEqual(['Choose a category…', 'Food', 'Groceries', 'Restaurants'])
    expect(select('confirm-all-expense')?.value).toBe('')
    expect(continueButton()?.disabled).toBe(true)

    wrapper.unmount()
  })

  it('emits the two ids on Yes, and cancel on Cancel', async () => {
    const wrapper = dialogOf()
    await flushPromises()

    continueButton()?.click()
    document.querySelector<HTMLElement>('[data-test="confirm-all-cancel"]')?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('confirm')).toEqual([[{ expenseCategoryId: 40, incomeCategoryId: 41 }]])
    expect(wrapper.emitted('cancel')).toHaveLength(1)

    wrapper.unmount()
  })

  it('paints nothing while it is closed', () => {
    const wrapper = dialogOf({ open: false })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })
})
