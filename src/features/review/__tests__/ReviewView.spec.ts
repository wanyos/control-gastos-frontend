import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

import ReviewView from '../views/ReviewView.vue'
import {
  APPLY_RESULT,
  APPLY_RULES,
  CATEGORIES,
  CONFLICT_BODY,
  CREATED_RULE,
  RULES,
  CATEGORY_TREE,
  EMPTY_PAGE,
  EXPENSE,
  MOVEMENTS,
  NOT_FOUND_BODY,
  PAGE_OF_THREE,
  PAGE_TWO,
  VALIDATION_ERROR_BODY,
  changed,
  deferred,
  fakeQueue,
  json,
  jsonResponse,
  mockApi,
  networkDown,
} from './fixtures'
import type { ApiCall } from './fixtures'

type Answer = Parameters<typeof mockApi>[0]

async function mountView(url: string, answers: Answer) {
  const api = mockApi({ categories: json(CATEGORY_TREE), ...answers })
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/review', name: 'review', component: ReviewView }],
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(ReviewView, { global: { plugins: [router, createPinia()] } })
  await flushPromises()

  return { api, router, wrapper }
}

describe('ReviewView', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Teleported dialogs outlive their wrapper: without this, one test's open
    // dialog is the one the next test would click on.
    document.body.innerHTML = ''
  })

  describe('loading the queue (R3, R11)', () => {
    it('asks for the pending queue on mount and paints the rows and the totals', async () => {
      const { api, wrapper } = await mountView('/review', { movements: json(PAGE_OF_THREE) })

      expect(api.movementQueries()).toEqual(['status=pending_review&page=1&pageSize=100'])
      expect(api.count(CATEGORIES)).toBe(1)
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
      expect(wrapper.get('[data-test="totals-matches"]').text()).toBe('132 movements')
    })

    it('shows the loading indicator with the filters still usable (R11)', async () => {
      const page = deferred()
      const { wrapper } = await mountView('/review', { movements: page.answer })

      expect(wrapper.find('[data-test="review-loading"]').exists()).toBe(true)
      const selects = wrapper.findAll('[data-test="review-filters"] select')
      expect(selects.length).toBeGreaterThan(0)
      expect(selects.every((select) => select.attributes('disabled') === undefined)).toBe(true)

      page.resolve(jsonResponse(PAGE_OF_THREE))
      await flushPromises()
      expect(wrapper.find('[data-test="review-loading"]').exists()).toBe(false)
    })

    it('keeps the list alive when the categories fail (R7)', async () => {
      const { wrapper } = await mountView('/review', {
        movements: json(PAGE_OF_THREE),
        categories: json({ message: 'boom' }, 500),
      })

      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
      expect(
        wrapper.get('[data-test="filter-category"] select').attributes('disabled'),
      ).toBeDefined()
      expect(wrapper.text()).toContain('Categories unavailable')
    })
  })

  describe('filters and the URL (R5, R10)', () => {
    it('writes a filter change into the query and asks again from page 1', async () => {
      const { api, router, wrapper } = await mountView('/review', {
        movements: json(PAGE_OF_THREE),
      })

      await wrapper.get('[data-test="filter-account"] select').setValue('2')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ account: '2' })
      expect(api.movementQueries()[1]).toBe('status=pending_review&accountId=2&page=1&pageSize=100')
    })

    it('writes the page into the query and asks for it', async () => {
      const { api, router, wrapper } = await mountView('/review', {
        movements: (query) =>
          Promise.resolve(jsonResponse(query.get('page') === '2' ? PAGE_TWO : PAGE_OF_THREE)),
      })

      await wrapper.get('[data-test="pager-next"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ page: '2' })
      expect(api.movementQueries()[1]).toBe('status=pending_review&page=2&pageSize=100')
      expect(wrapper.get('[data-test="pager-position"]').text()).toBe('Page 2 of 2')
    })

    it('restores the controls and the request from a URL that already carries them', async () => {
      const { api, wrapper } = await mountView('/review?account=1&page=2&q=luz', {
        movements: json(PAGE_TWO),
      })

      expect(api.movementQueries()).toEqual([
        'status=pending_review&accountId=1&q=luz&page=2&pageSize=100',
      ])
      const search = wrapper.get('[data-test="review-search"] input')
      expect((search.element as HTMLInputElement).value).toBe('luz')
      expect(
        (wrapper.get('[data-test="filter-account"] select').element as HTMLSelectElement).value,
      ).toBe('1')
    })

    it('falls back to the defaults on a URL full of rubbish, without breaking', async () => {
      const { api, wrapper } = await mountView('/review?page=abc&type=foo&account=-1', {
        movements: json(PAGE_OF_THREE),
      })

      expect(api.movementQueries()).toEqual(['status=pending_review&page=1&pageSize=100'])
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
    })

    it('follows the browser going back to the previous filters', async () => {
      const { api, router, wrapper } = await mountView('/review', {
        movements: (query) =>
          Promise.resolve(jsonResponse(query.get('page') === '2' ? PAGE_TWO : PAGE_OF_THREE)),
      })

      await wrapper.get('[data-test="pager-next"]').trigger('click')
      await flushPromises()
      router.back()
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({})
      expect(api.movementQueries().at(-1)).toBe('status=pending_review&page=1&pageSize=100')
    })
  })

  describe('nothing to show (R12)', () => {
    it('says the queue is empty when no filter is active', async () => {
      const { wrapper } = await mountView('/review', { movements: json(EMPTY_PAGE) })

      expect(wrapper.get('[data-test="review-empty"]').text()).toBe(
        "You're all caught up. Nothing is waiting for review.",
      )
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(0)
    })

    it('says it is the filters when there are some, and clears them on demand', async () => {
      const { api, router, wrapper } = await mountView('/review?q=zzzz', {
        movements: (query) =>
          Promise.resolve(jsonResponse(query.has('q') ? EMPTY_PAGE : PAGE_OF_THREE)),
      })

      expect(wrapper.get('[data-test="review-empty"]').text()).toContain(
        'No movements match these filters.',
      )
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(0)

      await wrapper.get('[data-test="review-empty"] button').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({})
      expect(api.movementQueries().at(-1)).toBe('status=pending_review&page=1&pageSize=100')
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
    })
  })

  describe('failures (R14)', () => {
    const filtersUsable = (wrapper: {
      findAll: (selector: string) => { attributes: (name: string) => string | undefined }[]
    }) =>
      wrapper
        .findAll('[data-test="filter-account"] select, [data-test="filter-type"] select')
        .every((control) => control.attributes('disabled') === undefined)

    it('explains a 404 and offers Clear filters, with the filters still usable', async () => {
      const { wrapper } = await mountView('/review?account=99', {
        movements: json(NOT_FOUND_BODY, 404),
      })

      expect(wrapper.get('[data-test="review-error-message"]').text()).toBe(
        'That account or category no longer exists.',
      )
      expect(wrapper.find('[data-test="review-error-clear"]').exists()).toBe(true)
      expect(filtersUsable(wrapper)).toBe(true)
    })

    it('explains a rejected filter and offers Clear filters', async () => {
      const { wrapper } = await mountView('/review?from=2026-12-01&to=2026-01-01', {
        movements: json(VALIDATION_ERROR_BODY, 400),
      })

      expect(wrapper.get('[data-test="review-error-message"]').text()).toBe(
        'The backend rejected these filters.',
      )
      expect(wrapper.find('[data-test="review-error-clear"]').exists()).toBe(true)
    })

    it('explains an unreachable server and offers Try again', async () => {
      const { wrapper } = await mountView('/review', { movements: networkDown })

      expect(wrapper.get('[data-test="review-error-message"]').text()).toBe(
        "Couldn't reach the server.",
      )
      expect(wrapper.find('[data-test="review-error-retry"]').exists()).toBe(true)
      expect(filtersUsable(wrapper)).toBe(true)
    })

    it('explains an answer it could not read and offers Try again', async () => {
      const { wrapper } = await mountView('/review', { movements: json({ movements: 'nope' }) })

      expect(wrapper.get('[data-test="review-error-message"]').text()).toBe(
        "The server answered, but the list couldn't be read.",
      )
      expect(wrapper.find('[data-test="review-error-retry"]').exists()).toBe(true)
    })

    it('goes back to the first page by itself and says so', async () => {
      const { wrapper } = await mountView('/review?page=9', {
        movements: (query) =>
          query.get('page') === '1'
            ? Promise.resolve(jsonResponse(PAGE_OF_THREE))
            : Promise.resolve(jsonResponse(VALIDATION_ERROR_BODY, { status: 400 })),
      })

      expect(wrapper.get('[data-test="review-notice"]').text()).toBe(
        'That page no longer exists. Showing the first page.',
      )
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
      expect(wrapper.find('[data-test="review-error"]').exists()).toBe(false)
    })

    it('retries the same request when asked to', async () => {
      let call = 0
      const { api, wrapper } = await mountView('/review', {
        movements: () => {
          call += 1
          return call === 1
            ? Promise.reject(new TypeError('Failed to fetch'))
            : Promise.resolve(jsonResponse(PAGE_OF_THREE))
        },
      })

      await wrapper.get('[data-test="review-error-retry"]').trigger('click')
      await flushPromises()

      expect(api.count(MOVEMENTS)).toBe(2)
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
    })
  })

  describe('scope and language (C2, C5, R13)', () => {
    it('writes every word in English', async () => {
      const { wrapper } = await mountView('/review', { movements: json(PAGE_OF_THREE) })

      const text = wrapper.text()
      for (const spanish of ['Cuenta', 'Categoría', 'Buscar', 'Pendiente', 'Página']) {
        expect(text).not.toContain(spanish)
      }
    })

    it('only ever GETs the two read endpoints (R13)', async () => {
      const { api, wrapper } = await mountView('/review', {
        movements: (query) =>
          Promise.resolve(jsonResponse(query.get('page') === '2' ? PAGE_TWO : PAGE_OF_THREE)),
      })

      await wrapper.get('[data-test="pager-next"]').trigger('click')
      await wrapper.get('[data-test="filter-type"] select').setValue('income')
      await flushPromises()

      expect(api.calls.every((call) => call.method === 'GET')).toBe(true)
      expect([...new Set(api.calls.map((call) => call.path))].sort()).toEqual([
        CATEGORIES,
        MOVEMENTS,
      ])
    })

    // Replaces the F15 test that asserted the screen had no selection at all (design.md §9).
    it('shows the action bar only while something is selected', async () => {
      const { wrapper } = await mountView('/review', { movements: json(PAGE_OF_THREE) })

      expect(wrapper.find('[data-test="review-actions"]').exists()).toBe(false)

      await wrapper.findAll('[data-test="movement-select"] input')[0]?.setValue(true)

      expect(wrapper.get('[data-test="selected-count"]').text()).toBe('1 selected')

      await wrapper.get('[data-test="clear-selection"]').trigger('click')

      expect(wrapper.find('[data-test="review-actions"]').exists()).toBe(false)
    })
  })

  describe('selecting and acting (R1, R3, R6, R10, R13)', () => {
    it('counts the rows you tick, and clears them when you change page', async () => {
      const queue = fakeQueue()
      const { wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      const boxes = wrapper.findAll('[data-test="movement-select"] input')
      await boxes[0]?.setValue(true)
      await boxes[1]?.setValue(true)
      expect(wrapper.get('[data-test="selected-count"]').text()).toBe('2 selected')

      await wrapper.get('[data-test="pager-next"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="review-actions"]').exists()).toBe(false)
      expect(
        wrapper
          .findAll('[data-test="movement-select"] input')
          .every((box) => !(box.element as HTMLInputElement).checked),
      ).toBe(true)
    })

    it('confirms the whole page in one request and empties the queue (R6, R10)', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      expect(wrapper.get('[data-test="confirm-selected"]').text()).toBe('Confirm 3 movements')

      await wrapper.get('[data-test="confirm-selected"]').trigger('click')
      await flushPromises()

      expect(api.patches()).toHaveLength(1)
      expect(api.patches()[0]?.body).toEqual({ ids: [10, 11, 12], status: 'confirmed' })
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(0)
      expect(wrapper.get('[data-test="action-summary"]').text()).toContain('3 movements confirmed')
    })

    it('undoes the last action and brings the rows back (R13)', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      await wrapper.findAll('[data-test="movement-confirm"]')[0]?.trigger('click')
      await flushPromises()
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(2)

      await wrapper.get('[data-test="action-undo"]').trigger('click')
      await flushPromises()

      expect(api.patches().at(-1)?.body).toEqual({ ids: [10], status: 'pending_review' })
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
      expect(wrapper.find('[data-test="action-summary"]').exists()).toBe(false)
    })

    it('says in English that nothing changed when the backend rejects the action (R12)', async () => {
      const queue = fakeQueue()
      const { wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: json(VALIDATION_ERROR_BODY, 400),
      })

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      await wrapper.get('[data-test="confirm-selected"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="action-error"]').text()).toBe(
        "Nothing changed. Some of those movements don't accept that category.",
      )
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
      expect(wrapper.get('[data-test="selected-count"]').text()).toBe('3 selected')
    })
  })

  describe('asking before a big bulk action (R8)', () => {
    const pageOf = (size: number) =>
      fakeQueue(
        Array.from({ length: size }, (_item, index) => changed(EXPENSE, { id: 100 + index })),
        size,
      )

    it('sends 19 movements straight away, without a dialog', async () => {
      const queue = pageOf(19)
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      await wrapper.get('[data-test="confirm-selected"]').trigger('click')
      await flushPromises()

      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(api.patches()).toHaveLength(1)
    })

    it('asks first from 20 up, and cancelling sends nothing and keeps the selection', async () => {
      const queue = pageOf(20)
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      await wrapper.get('[data-test="confirm-selected"]').trigger('click')
      await flushPromises()

      const dialog = document.querySelector('[role="dialog"]')
      expect(dialog?.textContent).toContain('Confirm 20 movements?')
      expect(api.patches()).toEqual([])

      document.querySelector<HTMLElement>('[data-test="bulk-cancel"]')?.click()
      await flushPromises()

      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(api.patches()).toEqual([])
      expect(wrapper.get('[data-test="selected-count"]').text()).toBe('20 selected')
    })

    it('goes ahead when the dialog is accepted', async () => {
      const queue = pageOf(20)
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      await wrapper.get('[data-test="confirm-selected"]').trigger('click')
      await flushPromises()

      document.querySelector<HTMLElement>('[data-test="bulk-continue"]')?.click()
      await flushPromises()

      expect(api.patches()).toHaveLength(1)
      const sent = api.patches()[0]?.body as { ids: number[] } | undefined
      expect(sent?.ids).toHaveLength(20)
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(0)
    })
  })

  describe('creating a rule from a row (feature 17, R1, R5, R10)', () => {
    const rulesApi =
      (answers: { post?: () => Promise<Response>; apply?: () => Promise<Response> } = {}) =>
      (call: ApiCall): Promise<Response> => {
        if (call.path === APPLY_RULES) {
          return (answers.apply ?? (() => Promise.resolve(jsonResponse(APPLY_RESULT))))()
        }
        return (
          answers.post ?? (() => Promise.resolve(jsonResponse(CREATED_RULE, { status: 201 })))
        )()
      }

    const openDialog = async (wrapper: {
      findAll: (s: string) => { trigger: (e: string) => Promise<void> }[]
    }) => {
      await wrapper.findAll('[data-test="movement-create-rule"]')[0]?.trigger('click')
      await flushPromises()
    }

    it('opens the dialog with the movement and the proposed text (R1, R2)', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi(),
      })

      await openDialog(wrapper)

      const dialog = document.querySelector('[role="dialog"]')
      expect(dialog?.textContent).toContain('Create a rule')
      expect(dialog?.textContent).toContain('CAFETERÍA CENTRAL')
      expect(document.querySelector<HTMLInputElement>('[data-test="rule-text"] input')?.value).toBe(
        'cafeteria',
      )
      // Opening a dialog asks for nothing.
      expect(api.count(RULES)).toBe(0)
    })

    it('creates it with one POST of two fields, and applies nothing by itself (R5)', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi(),
      })
      await openDialog(wrapper)

      document.querySelector<HTMLElement>('[data-test="rule-save"]')?.click()
      await flushPromises()

      const posted = api.calls.filter((call) => call.path === RULES)
      expect(posted).toHaveLength(1)
      expect(posted[0]?.method).toBe('POST')
      expect(posted[0]?.body).toEqual({ matchText: 'cafeteria', categoryId: 1 })
      expect(api.count(APPLY_RULES)).toBe(0)
      expect(api.patches()).toEqual([])
      expect(document.querySelector('[role="dialog"]')).toBeNull()

      const notice = wrapper.get('[data-test="rule-created-notice"]')
      expect(notice.text()).toContain('cafeteria')
      expect(notice.text()).toContain('Food')
      expect(notice.text()).toContain('Apply rules now')
    })

    it('asks before applying, and one confirmation sends one pass (R10, R11)', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi(),
      })
      await openDialog(wrapper)
      document.querySelector<HTMLElement>('[data-test="rule-save"]')?.click()
      await flushPromises()

      await wrapper.get('[data-test="apply-rules-now"]').trigger('click')
      await flushPromises()

      const dialog = document.querySelector('[role="dialog"]')
      expect(dialog?.textContent).toContain('Only pending movements without a category')
      expect(dialog?.textContent).toContain("can't be undone")
      expect(api.count(APPLY_RULES)).toBe(0)

      document.querySelector<HTMLElement>('[data-test="apply-confirmed"]')?.click()
      await flushPromises()

      expect(api.count(APPLY_RULES)).toBe(1)
      expect(document.body.textContent).toContain('12 movements categorized')
      // The queue and the count are asked for again, and nothing was PATCHed.
      expect(api.movementQueries().at(-1)).toBe('status=pending_review&page=1&pageSize=1')
      expect(api.patches()).toEqual([])
    })

    it('keeps the dialog open with an English message when the text is taken (R6)', async () => {
      const queue = fakeQueue()
      const { wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi({
          post: () => Promise.resolve(jsonResponse(CONFLICT_BODY, { status: 409 })),
        }),
      })
      await openDialog(wrapper)

      document.querySelector<HTMLElement>('[data-test="rule-save"]')?.click()
      await flushPromises()

      expect(document.querySelector('[data-test="rule-error"]')?.textContent).toContain(
        'Nothing was saved: another rule already uses that text.',
      )
      expect(document.body.textContent).not.toContain(CONFLICT_BODY.message)
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
      expect(wrapper.find('[data-test="rule-created-notice"]').exists()).toBe(false)
    })
  })

  describe('applying a category to the selection (R7)', () => {
    it('sends only the movements that accept it, and says so beforehand', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      await wrapper.get('[data-test="bulk-category"] select').setValue('2')

      expect(wrapper.get('[data-test="applies-to"]').text()).toBe('Applies to 1 of 3 selected')

      await wrapper.get('[data-test="apply-category"]').trigger('click')
      await flushPromises()

      expect(api.patches()).toHaveLength(1)
      expect(api.patches()[0]?.body).toEqual({ ids: [10], categoryId: 2 })
      expect(wrapper.get('[data-test="action-summary"]').text()).toContain(
        '1 movement categorized as Groceries',
      )
    })

    it('does not let an action that would reach nobody be sent', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      // Only the neutral row: no category of any kind fits it.
      await wrapper.findAll('[data-test="movement-select"] input')[2]?.setValue(true)
      await wrapper.get('[data-test="bulk-category"] select').setValue('2')

      expect(wrapper.get('[data-test="applies-to"]').text()).toBe('Applies to 0 of 1 selected')
      expect(wrapper.get('[data-test="apply-category"]').attributes('disabled')).toBeDefined()
      expect(api.patches()).toEqual([])
    })
  })

  // ─── The match preview (feature 18) ──────────────────────────────────────
  // The dialog is the same one the rules screen opens, so this only checks the
  // wiring of this screen: the query that travels, and that NOTHING else does.

  describe('the count of what a rule would match (feature 18, R1, R11, R12, C1)', () => {
    const rulesApi = (): Promise<Response> =>
      Promise.resolve(jsonResponse(CREATED_RULE, { status: 201 }))

    const openDialogOf = async (
      wrapper: { findAll: (s: string) => { trigger: (e: string) => Promise<void> }[] },
      row: number,
    ) => {
      await wrapper.findAll('[data-test="movement-create-rule"]')[row]?.trigger('click')
      await flushPromises()
    }

    it('asks for the count as soon as the dialog opens, without a keystroke (R11)', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        rules: rulesApi,
      })

      await openDialogOf(wrapper, 0)

      expect(api.movementQueries().at(-1)).toBe(
        'status=pending_review&type=expense&uncategorized=true&q=cafeteria&page=1&pageSize=5',
      )
      expect(document.querySelector('[data-test="rule-preview-count"]')?.textContent).toContain(
        'pending movements without a category contain this text.',
      )
    })

    it('counts against the kind of the movement, never crossing expense and income', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        rules: rulesApi,
      })

      await openDialogOf(wrapper, 1)

      expect(api.movementQueries().at(-1)).toContain('type=income')
      expect(api.movementQueries().at(-1)).not.toContain('categoryId')
    })

    it('never sends anything but a GET of the movements while it counts (R12, C1)', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        rules: rulesApi,
      })
      await openDialogOf(wrapper, 0)
      const before = api.calls.length

      const field = document.querySelector<HTMLInputElement>('[data-test="rule-text"] input')
      if (!field) throw new Error('no text field')
      field.value = 'mercadona'
      field.dispatchEvent(new Event('input'))
      // The real wait after the last keystroke, plus room for the answer.
      await new Promise((done) => setTimeout(done, 450))
      await flushPromises()

      const after = api.calls.slice(before)
      expect(after.length).toBeGreaterThan(0)
      expect(after.every((call) => call.method === 'GET')).toBe(true)
      expect(after.every((call) => call.path === '/api/movements')).toBe(true)
      expect(api.calls.every((call) => call.method === 'GET')).toBe(true)
      expect(api.patches()).toEqual([])
    })

    it('forgets the count when the dialog is closed (R12)', async () => {
      const queue = fakeQueue()
      const { wrapper } = await mountView('/review', {
        movements: queue.movements,
        rules: rulesApi,
      })
      await openDialogOf(wrapper, 0)
      expect(document.querySelector('[data-test="rule-preview"]')).not.toBeNull()

      document.querySelector<HTMLElement>('[data-test="rule-cancel"]')?.click()
      await flushPromises()

      expect(document.querySelector('[data-test="rule-preview"]')).toBeNull()
    })
  })
})
