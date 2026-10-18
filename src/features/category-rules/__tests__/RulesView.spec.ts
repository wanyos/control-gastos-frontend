import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import RulesView from '../views/RulesView.vue'
import { APPLY_PATH, RULES_PATH, SUGGESTIONS_PATH } from '../service'
import {
  ACADEMY_MOVED,
  APPLY_OK,
  CATEGORY_TREE,
  NOT_FOUND_BODY,
  SUGGESTIONS,
  THREE_RULES,
  UTILITIES,
  deferred,
  jsonOf,
  mockFetch,
  movement,
  movementPage,
  rule,
  saved,
} from './fixtures'

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

  it('says there are no rules yet', async () => {
    const { wrapper } = await mountView({ rules: () => jsonOf([]) })

    expect(wrapper.get('[data-test="rules-empty"]').text()).toContain('No rules yet.')
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
      rule: () => jsonOf(saved({ ...THREE_RULES[1], categoryId: 4 })),
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
    // Since feature 18 the dialog does read GET /api/movements to count matches; what
    // changing a rule must never do is WRITE on a movement.
    expect(api.wroteMovements()).toBe(false)
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

  // ─── The result of the last pass, left in view (feature 30) ──────────────

  describe('the result of applying, after its dialog is closed (feature 30)', () => {
    const applyAndClose = async () => {
      const mounted = await mountView({
        rules: () => jsonOf(THREE_RULES),
        apply: () => jsonOf(APPLY_OK),
      })
      await mounted.wrapper.get('[data-test="apply-rules"]').trigger('click')
      at('[data-test="apply-confirmed"]')?.click()
      await flushPromises()
      at('[data-test="apply-close"]')?.click()
      await flushPromises()
      return mounted
    }

    it('paints nothing about a pass before any rules are applied', async () => {
      const { wrapper } = await mountView({ rules: () => jsonOf(THREE_RULES) })

      expect(wrapper.find('[data-test="last-apply"]').exists()).toBe(false)
    })

    it('after closing the apply dialog Rules still shows how many movements were categorized', async () => {
      const { api, wrapper } = await applyAndClose()

      expect(at('[role="dialog"]')).toBeNull()
      expect(wrapper.get('[data-test="last-apply-headline"]').text()).toMatch(
        /^Rules applied at \d{2}:\d{2}: 12 movements categorized\.$/,
      )
      expect(wrapper.get('[data-test="last-apply-figures"]').text()).toBe(
        '5 still without a matching rule · 1 conflict',
      )
      // Under the header, before the list of rules.
      const block = wrapper.get('[data-test="last-apply"]').element
      const header = wrapper.get('header').element
      const list = wrapper.get('[data-test="rule-row"]').element
      expect(header.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(block.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      // Showing it asked for nothing: one POST, and no movement was read or written.
      expect(api.count(APPLY_PATH)).toBe(1)
      expect(api.touchedMovements()).toBe(false)
    })

    it('Dismiss takes the result off Rules', async () => {
      const { api, wrapper } = await applyAndClose()
      const before = api.calls.length

      await wrapper.get('[data-test="last-apply-dismiss"]').trigger('click')

      expect(wrapper.find('[data-test="last-apply"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="last-apply-headline"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="rule-row"]')).toHaveLength(3)
      expect(api.calls).toHaveLength(before)
    })
  })

  // ─── The match preview (feature 18) ──────────────────────────────────────

  describe('the count of what a rule matches (R11, R12, C1)', () => {
    const page = () => jsonOf(movementPage([movement(10, 'RECIB /IBERDROLA CLIENTES, S.A')], 34))

    it('asks for the count as soon as an existing rule is opened (R11)', async () => {
      const { api, wrapper } = await mountView({
        rules: () => jsonOf(THREE_RULES),
        movements: page,
      })

      await wrapper.findAll('[data-test="rule-edit"]')[1]?.trigger('click')
      await flushPromises()

      const asked = api.movements()
      expect(asked).toHaveLength(1)
      expect(asked[0]?.method).toBe('GET')
      expect(at('[data-test="rule-preview-count"]')?.textContent).toBe(
        '34 pending movements without a category contain this text.',
      )
      expect(at('[data-test="rule-preview-sample"]')?.textContent).toContain('IBERDROLA')
    })

    it('counts with the kind of the category of the rule (R11)', async () => {
      const seen: string[] = []
      const { wrapper } = await mountView({
        rules: () => jsonOf(THREE_RULES),
        movements: (url) => {
          seen.push(url.search)
          return page()
        },
      })

      // The third rule (`nomina`) belongs to an income category.
      await wrapper.findAll('[data-test="rule-edit"]')[2]?.trigger('click')
      await flushPromises()

      expect(seen[0]).toContain('type=income')
      expect(seen[0]).toContain('uncategorized=true')
      expect(seen[0]).toContain('status=pending_review')
      expect(seen[0]).not.toContain('categoryId')
    })

    it('writes nothing while the dialog is open, and forgets the count on close (R12, C1)', async () => {
      const { api, wrapper } = await mountView({
        rules: () => jsonOf(THREE_RULES),
        movements: page,
      })

      await wrapper.findAll('[data-test="rule-edit"]')[1]?.trigger('click')
      await flushPromises()
      expect(at('[data-test="rule-preview"]')).not.toBeNull()

      at('[data-test="rule-cancel"]')?.click()
      await flushPromises()

      expect(at('[data-test="rule-preview"]')).toBeNull()
      expect(api.wroteMovements()).toBe(false)
      expect(api.calls.every((call) => call.method === 'GET')).toBe(true)
    })
  })

  // ─── The suggested rules (feature 33) ────────────────────────────────────

  describe('the suggested rules (feature 33)', () => {
    /** `academia ficticia norte` → Suministros, with the three movements it moved. */
    const CREATED = saved(rule(31, 'academia ficticia norte', UTILITIES), {
      categorized: 3,
      categorizedMovements: ACADEMY_MOVED.map((one) => ({
        ...one,
        categoryId: 6,
        categoryName: 'Suministros',
      })),
      conflictCount: 0,
      conflicts: [],
      unmatched: 214,
    })

    it('lists the suggested rules in the order of the answer', async () => {
      const { api, wrapper } = await mountView({
        rules: () => jsonOf(THREE_RULES),
        suggestions: () => jsonOf(SUGGESTIONS),
      })

      const block = wrapper.get('[data-test="suggested-rules"]')
      expect(block.text()).toContain('Suggested rules')
      const rows = block.findAll('[data-test="suggested-rule"]')
      expect(rows.map((row) => row.get('[data-test="suggested-rule-text"]').text())).toEqual([
        '“supermercado inventado”',
        '“academia ficticia norte”',
        '“cooperativa sintetica”',
      ])
      expect(rows.map((row) => row.get('[data-test="suggested-rule-count"]').text())).toEqual([
        '4 movements',
        '3 movements',
        '3 movements',
      ])
      expect(rows.map((row) => row.get('[data-test="suggested-rule-kind"]').text())).toEqual([
        'Expenses',
        'Expenses',
        'Income',
      ])
      // Above your rules, which keep their own title.
      const yours = wrapper.get('[data-test="rule-row"]').element
      expect(
        block.element.compareDocumentPosition(yours) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(wrapper.text()).toContain('Your rules')
      // Asked once, read only.
      expect(api.count(SUGGESTIONS_PATH)).toBe(1)
      expect(api.calls.every((call) => call.method === 'GET')).toBe(true)
    })

    it('shows the loading the failure with Try again and the empty list of suggestions', async () => {
      const slow = deferred<Response>()
      const loading = await mountView({
        rules: () => jsonOf(THREE_RULES),
        suggestions: () =>
          slow.answer({ path: SUGGESTIONS_PATH, method: 'GET' }) as Promise<Response>,
      })
      expect(loading.wrapper.get('[data-test="suggested-rules-loading"]').text()).toBe(
        'Loading suggested rules…',
      )
      slow.resolve(new Response(JSON.stringify([]), { status: 200 }))
      await flushPromises()
      expect(loading.wrapper.find('[data-test="suggested-rules-loading"]').exists()).toBe(false)
      expect(loading.wrapper.get('[data-test="suggested-rules-empty"]').text()).toBe(
        'No suggested rules right now.',
      )
      loading.wrapper.unmount()
      vi.restoreAllMocks()

      let asked = 0
      const { api, wrapper } = await mountView({
        rules: () => jsonOf(THREE_RULES),
        suggestions: () => {
          asked += 1
          return asked === 1 ? jsonOf({ message: 'Error interno' }, 500) : jsonOf(SUGGESTIONS)
        },
      })
      expect(wrapper.get('[data-test="suggested-rules-error"]').text()).toContain(
        'Something went wrong loading the suggested rules.',
      )
      expect(wrapper.text()).not.toContain('Error interno')
      // The rules themselves are not its business.
      expect(wrapper.findAll('[data-test="rule-row"]')).toHaveLength(3)

      await wrapper.get('[data-test="suggested-rules-retry"]').trigger('click')
      await flushPromises()

      expect(api.count(SUGGESTIONS_PATH)).toBe(2)
      expect(wrapper.find('[data-test="suggested-rules-error"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="suggested-rule"]')).toHaveLength(3)
    })

    it('draws the line of the created rule inside the block that sticks under the top bar', async () => {
      let rulesAsked = 0
      let suggestionsAsked = 0
      const { api, wrapper } = await mountView({
        rules: () => {
          rulesAsked += 1
          return rulesAsked === 1 ? jsonOf(THREE_RULES) : jsonOf(CREATED, 201)
        },
        suggestions: () => {
          suggestionsAsked += 1
          return jsonOf(suggestionsAsked === 1 ? SUGGESTIONS : [SUGGESTIONS[0], SUGGESTIONS[2]])
        },
      })
      expect(wrapper.find('[data-test="sticky-below-top-bar"]').exists()).toBe(false)

      const academy = wrapper.findAll('[data-test="suggested-rule"]')[1]
      await academy?.get('[data-test="suggested-rule-category"] select').setValue('6')
      await academy?.get('[data-test="suggested-rule-create"]').trigger('click')
      await flushPromises()

      const posted = api.calls.filter((call) => call.method === 'POST')
      expect(posted.map((call) => call.path)).toEqual([RULES_PATH])
      expect(posted[0]?.body).toEqual({ matchText: 'academia ficticia norte', categoryId: 6 })

      const sticky = wrapper.get('[data-test="sticky-below-top-bar"]')
      expect(sticky.get('[data-test="rule-created-notice"]').text()).toBe(
        'Rule “academia ficticia norte” → Suministros created: 3 movements categorized.',
      )
      expect(sticky.find('[data-test="apply-rules-now"]').exists()).toBe(false)
      // The box is outside the block, and says the same with the time.
      expect(sticky.find('[data-test="last-apply"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="last-apply-headline"]').text()).toMatch(
        /^Rule “academia ficticia norte” → Suministros created at \d{2}:\d{2}: 3 movements categorized\.$/,
      )
      // The suggestion used is gone, and the new rule is in your rules.
      expect(wrapper.findAll('[data-test="suggested-rule-text"]').map((one) => one.text())).toEqual(
        ['“supermercado inventado”', '“cooperativa sintetica”'],
      )
      expect(wrapper.findAll('[data-test="rule-row"]')).toHaveLength(4)
    })

    it('the intro says that creating or changing a rule also moves movements', async () => {
      const { wrapper } = await mountView({ rules: () => jsonOf(THREE_RULES) })

      expect(wrapper.get('[data-test="rules-intro"]').text()).toBe(
        'Rules categorize pending movements without a category when you import, or when you apply them here. Creating or changing a rule also moves the movements whose category was set when the import was closed.',
      )
      expect(wrapper.get('header').find('[data-test="rules-intro"]').exists()).toBe(true)
    })
  })
})
