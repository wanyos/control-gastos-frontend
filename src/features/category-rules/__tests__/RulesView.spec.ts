import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import RulesView from '../views/RulesView.vue'
import { APPLY_PATH, RULES_PATH } from '../service'
import { APPLY_OK, CATEGORY_TREE, NOT_FOUND_BODY, THREE_RULES, jsonOf, mockFetch } from './fixtures'

const CATEGORIES_PATH = '/api/categories'

async function mountView(answers: Parameters<typeof mockFetch>[0]) {
  const api = mockFetch({ categories: () => jsonOf(CATEGORY_TREE), ...answers })
  const wrapper = mount(RulesView, { global: { plugins: [createPinia()] } })
  await flushPromises()
  return { api, wrapper }
}

const at = (selector: string) => document.querySelector<HTMLElement>(selector)

describe('RulesView (R7, R8, R9, R10)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('lists the rules in the API order, with their text and their category (R7)', async () => {
    const { api, wrapper } = await mountView({ rules: () => jsonOf(THREE_RULES) })

    const rows = wrapper.findAll('[data-test="rule-row"]')
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.get('[data-test="rule-text-shown"]').text())).toEqual([
      '“mercadona”',
      '“iberdrola”',
      '“nomina”',
    ])
    expect(rows.map((row) => row.get('[data-test="rule-category-name"]').text())).toEqual([
      'Supermercado',
      'Suministros',
      'Nomina',
    ])
    expect(rows[2]?.text()).toContain('Income')
    expect(api.count(CATEGORIES_PATH)).toBe(1)
  })

  it('says there are none, and offers no way to make one from here (R7)', async () => {
    const { wrapper } = await mountView({ rules: () => jsonOf([]) })

    expect(wrapper.get('[data-test="rules-empty"]').text()).toBe(
      'No rules yet. Create one from a movement in Review.',
    )
    expect(wrapper.get('[data-test="apply-rules"]').attributes('disabled')).toBeDefined()
  })

  it('explains a failed load in English and tries again on demand (R7)', async () => {
    let call = 0
    const { api, wrapper } = await mountView({
      rules: () => {
        call += 1
        return call === 1
          ? Promise.resolve(jsonOf({ message: 'Error interno' }, 500))
          : jsonOf(THREE_RULES)
      },
    })

    expect(wrapper.get('[data-test="rules-error-message"]').text()).toBe(
      'Something went wrong loading your rules.',
    )
    expect(wrapper.text()).not.toContain('Error interno')

    await wrapper.get('[data-test="rules-retry"]').trigger('click')
    await flushPromises()

    expect(api.count(RULES_PATH)).toBe(2)
    expect(wrapper.findAll('[data-test="rule-row"]')).toHaveLength(3)
  })

  it('changes a rule with a PATCH of only what changed, and no movement (R8)', async () => {
    const { api, wrapper } = await mountView({
      rules: () => jsonOf(THREE_RULES),
      rule: () => jsonOf({ ...THREE_RULES[1], categoryId: 4 }),
    })

    await wrapper.findAll('[data-test="rule-edit"]')[1]?.trigger('click')
    expect(at('[data-test="rule-dialog"]')).not.toBeNull()

    const select = at('[data-test="rule-category"] select') as HTMLSelectElement
    select.value = '4'
    select.dispatchEvent(new Event('change'))
    await flushPromises()
    at('[data-test="rule-save"]')?.click()
    await flushPromises()

    const patched = api.calls.filter((call) => call.method === 'PATCH')
    expect(patched).toHaveLength(1)
    expect(patched[0]?.path).toBe(`${RULES_PATH}/8`)
    expect(patched[0]?.body).toEqual({ categoryId: 4 })
    expect(api.touchedMovements()).toBe(false)
    expect(at('[data-test="rule-dialog"]')).toBeNull()
  })

  it('asks before deleting, says what it will not do, and cancelling sends nothing (R9)', async () => {
    const { api, wrapper } = await mountView({ rules: () => jsonOf(THREE_RULES) })
    const before = api.calls.length

    await wrapper.findAll('[data-test="rule-delete"]')[0]?.trigger('click')

    expect(at('[data-test="delete-rule-body"]')?.textContent).toContain(
      'Movements it already categorized keep their category.',
    )
    expect(document.body.textContent).toContain('Delete the rule “mercadona”?')

    at('[data-test="delete-cancel"]')?.click()
    await flushPromises()

    expect(api.calls).toHaveLength(before)
    expect(wrapper.findAll('[data-test="rule-row"]')).toHaveLength(3)
  })

  it('deletes on confirmation, and touches no movement (R9)', async () => {
    const { api, wrapper } = await mountView({
      rules: () => jsonOf(THREE_RULES),
      rule: () => Promise.resolve(new Response(null, { status: 204 })),
    })

    await wrapper.findAll('[data-test="rule-delete"]')[0]?.trigger('click')
    at('[data-test="delete-confirm"]')?.click()
    await flushPromises()

    const deleted = api.calls.filter((call) => call.method === 'DELETE')
    expect(deleted.map((call) => call.path)).toEqual([`${RULES_PATH}/7`])
    expect(wrapper.findAll('[data-test="rule-row"]')).toHaveLength(2)
    expect(api.touchedMovements()).toBe(false)
  })

  it('says in English that a rule was already gone (R9)', async () => {
    const { wrapper } = await mountView({
      rules: () => jsonOf(THREE_RULES),
      rule: () => jsonOf(NOT_FOUND_BODY, 404),
    })

    await wrapper.findAll('[data-test="rule-delete"]')[0]?.trigger('click')
    at('[data-test="delete-confirm"]')?.click()
    await flushPromises()

    expect(wrapper.get('[data-test="rules-delete-message"]').text()).toBe(
      'That rule no longer exists.',
    )
    expect(wrapper.text()).not.toContain(NOT_FOUND_BODY.message)
    expect(wrapper.findAll('[data-test="rule-row"]')).toHaveLength(2)
  })

  it('always asks before applying, and cancelling sends nothing (R10)', async () => {
    const { api, wrapper } = await mountView({
      rules: () => jsonOf(THREE_RULES),
      apply: () => jsonOf(APPLY_OK),
    })

    await wrapper.get('[data-test="apply-rules"]').trigger('click')

    expect(document.body.textContent).toContain('Apply your rules?')
    expect(api.count(APPLY_PATH)).toBe(0)

    at('[data-test="apply-cancel"]')?.click()
    await flushPromises()

    expect(api.count(APPLY_PATH)).toBe(0)

    await wrapper.get('[data-test="apply-rules"]').trigger('click')
    at('[data-test="apply-confirmed"]')?.click()
    await flushPromises()

    expect(api.count(APPLY_PATH)).toBe(1)
    expect(document.body.textContent).toContain('12 movements categorized')
    expect(api.touchedMovements()).toBe(false)
  })
})
