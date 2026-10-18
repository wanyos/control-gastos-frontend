import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

import { parseApplyResult } from '@/features/category-rules/service'
import { useCategoryRulesStore } from '@/features/category-rules/store'
import StickyBelowTopBar from '@/shared/components/StickyBelowTopBar.vue'

import ReviewView from '../views/ReviewView.vue'
import {
  APPLY_RESULT,
  APPLY_RULES,
  CATEGORIES,
  CONFLICT_BODY,
  CREATED_RULE,
  RULES,
  CATEGORY_TREE,
  CONFIRM_ALL,
  CONFIRM_ALL_RESULT,
  COUNT_PAGE,
  EMPTY_PAGE,
  EXPENSE,
  INCOME,
  MOVEMENTS,
  NOT_FOUND_BODY,
  PAGE_OF_THREE,
  PAGE_TWO,
  PREVIEW_CAFETERIA,
  VALIDATION_ERROR_BODY,
  categorizedMovement,
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

const PAGE_QUERY = 'status=pending_review&page=1&pageSize=100'
/** What the screen asks on mount to know how many pending movements have no category (feature 30). */
const UNCATEGORIZED_QUERY = 'status=pending_review&uncategorized=true&page=1&pageSize=1'

/** `prepare` runs before the screen is mounted, to put state in the stores it will read. */
async function mountView(url: string, answers: Answer, prepare?: (pinia: Pinia) => void) {
  const api = mockApi({ categories: json(CATEGORY_TREE), ...answers })
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/review', name: 'review', component: ReviewView }],
  })
  await router.push(url)
  await router.isReady()

  const pinia = createPinia()
  prepare?.(pinia)
  const wrapper = mount(ReviewView, { global: { plugins: [router, pinia] } })
  await flushPromises()

  return { api, router, wrapper, pinia }
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

      // The page, and since feature 30 how many pending movements have no category.
      expect(api.movementQueries()).toEqual([
        'status=pending_review&page=1&pageSize=100',
        UNCATEGORIZED_QUERY,
      ])
      expect(api.count(CATEGORIES)).toBe(1)
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
      expect(wrapper.get('[data-test="totals-matches"]').text()).toBe('132 movements')
    })

    it('shows the loading indicator with the filters still usable (R11)', async () => {
      const page = deferred()
      // The count of feature 30 gets its own answer: one Response can be read only once.
      const { wrapper } = await mountView('/review', {
        movements: (query) =>
          query.get('pageSize') === '1' ? Promise.resolve(jsonResponse(COUNT_PAGE)) : page.answer(),
      })

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
      // [0] is the page of the mount and [1] its count of movements without a category.
      expect(api.movementQueries()[1]).toBe(UNCATEGORIZED_QUERY)
      expect(api.movementQueries()[2]).toBe('status=pending_review&accountId=2&page=1&pageSize=100')
      expect(api.movementQueries()).toHaveLength(3)
    })

    it('writes the page into the query and asks for it', async () => {
      const { api, router, wrapper } = await mountView('/review', {
        movements: (query) =>
          Promise.resolve(jsonResponse(query.get('page') === '2' ? PAGE_TWO : PAGE_OF_THREE)),
      })

      await wrapper.get('[data-test="pager-next"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ page: '2' })
      expect(api.movementQueries()[1]).toBe(UNCATEGORIZED_QUERY)
      expect(api.movementQueries()[2]).toBe('status=pending_review&page=2&pageSize=100')
      expect(api.movementQueries()).toHaveLength(3)
      expect(wrapper.get('[data-test="pager-position"]').text()).toBe('Page 2 of 2')
    })

    it('restores the controls and the request from a URL that already carries them', async () => {
      const { api, wrapper } = await mountView('/review?account=1&page=2&q=luz', {
        movements: json(PAGE_TWO),
      })

      // The count of movements without a category never carries the filters of the URL.
      expect(api.movementQueries()).toEqual([
        'status=pending_review&accountId=1&q=luz&page=2&pageSize=100',
        UNCATEGORIZED_QUERY,
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

      expect(api.movementQueries()).toEqual([
        'status=pending_review&page=1&pageSize=100',
        UNCATEGORIZED_QUERY,
      ])
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

      // The page that failed, the count of the mount (feature 30) and the page again.
      expect(api.movementQueries()).toEqual([PAGE_QUERY, UNCATEGORIZED_QUERY, PAGE_QUERY])
      expect(api.count(MOVEMENTS)).toBe(3)
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

  describe('closing everything still pending (2026-10-16)', () => {
    it('opens the dialog from the header, sends the two categories and says what was closed', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        confirmAll: json(CONFIRM_ALL_RESULT),
      })

      await wrapper.get('[data-test="confirm-all-open"]').trigger('click')
      await flushPromises()
      expect(document.querySelector('[data-test="confirm-all"]')).not.toBeNull()

      const pick = (test: string, value: string) => {
        const select = document.querySelector<HTMLSelectElement>(`[data-test="${test}"] select`)
        if (!select) throw new Error(`no select ${test}`)
        select.value = value
        select.dispatchEvent(new Event('change'))
      }
      pick('confirm-all-expense', '2')
      pick('confirm-all-income', '4')
      await flushPromises()
      document.querySelector<HTMLElement>('[data-test="confirm-all-continue"]')?.click()
      await flushPromises()

      const posts = api.calls.filter((call) => call.method === 'POST')
      expect(posts.map((call) => call.path)).toEqual([CONFIRM_ALL])
      expect(posts[0]?.body).toEqual({ expenseCategoryId: 2, incomeCategoryId: 4 })
      expect(document.querySelector('[data-test="confirm-all"]')).toBeNull()
      expect(wrapper.get('[data-test="confirm-all-result"]').text()).toContain(
        'Closed: 1667 movements confirmed, 1051 given a category.',
      )
    })

    it('offers nothing to close when the queue is empty', async () => {
      const { wrapper } = await mountView('/review', { movements: json(EMPTY_PAGE) })

      expect(wrapper.find('[data-test="confirm-all-open"]').exists()).toBe(false)
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

    it('creates it with one POST of two fields, and asks for no separate pass (R5)', async () => {
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
      // Since feature 33 creating already runs the pass: nothing to apply from the line.
      expect(notice.text()).not.toContain('Apply rules now')
      expect(wrapper.find('[data-test="apply-rules-now"]').exists()).toBe(false)
    })

    it('the rule notice in Review says how many it moved and has no Apply rules now', async () => {
      const queue = fakeQueue()
      const moved = {
        ...CREATED_RULE,
        categorization: {
          categorized: 2,
          categorizedMovements: [
            categorizedMovement(310, 'CAFETERIA SINTETICA PLAZA', {
              rules: [{ ruleId: 7, matchText: 'cafeteria' }],
            }),
            categorizedMovement(316, 'CAFETERIA SINTETICA ESTACION', {
              bookingDate: '2026-08-19',
              amount: '6.85',
              rules: [{ ruleId: 7, matchText: 'cafeteria' }],
            }),
          ],
          conflictCount: 0,
          conflicts: [],
          unmatched: 58,
        },
      }
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi({ post: () => Promise.resolve(jsonResponse(moved, { status: 201 })) }),
      })
      const queriesBefore = api.movementQueries().length
      await openDialog(wrapper)

      document.querySelector<HTMLElement>('[data-test="rule-save"]')?.click()
      await flushPromises()

      const block = wrapper.get('[data-test="sticky-below-top-bar"]')
      expect(block.get('[data-test="rule-created-notice"]').text()).toBe(
        'Rule “cafeteria” → Food created: 2 movements categorized.',
      )
      expect(wrapper.find('[data-test="apply-rules-now"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Apply rules now')
      // The box says the same with the time, and lists what moved.
      expect(wrapper.get('[data-test="last-apply-headline"]').text()).toMatch(
        /^Rule “cafeteria” → Food created at \d{2}:\d{2}: 2 movements categorized\.$/,
      )
      await wrapper.get('[data-test="last-apply-show-movements"]').trigger('click')
      expect(wrapper.findAll('[data-test="last-apply-movement"]')).toHaveLength(2)
      // The queue and its count were asked for again; no pass was asked for apart.
      expect(api.movementQueries().length).toBeGreaterThan(queriesBefore)
      expect(api.count(APPLY_RULES)).toBe(0)
      expect(api.patches()).toEqual([])
    })

    it('asks before applying, and one confirmation sends one pass (R10, R11)', async () => {
      const queue = fakeQueue()
      const { api, pinia, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi(),
      })
      await openDialog(wrapper)
      document.querySelector<HTMLElement>('[data-test="rule-save"]')?.click()
      await flushPromises()

      // Since feature 33 the line offers no Apply rules now: a pass started in Rules is
      // what can still be running here, and its dialog is still the one of this screen.
      expect(wrapper.find('[data-test="apply-rules-now"]').exists()).toBe(false)
      useCategoryRulesStore(pinia).openApply()
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

  // ─── What is left without a category, and what the last pass did (feature 30) ──

  describe('pending movements without a category and the last rules pass (feature 30)', () => {
    const SENTENCE = '[data-test="review-uncategorized-count"]'
    const REPORT = '[data-test="last-apply"]'
    const HEADLINE = '[data-test="last-apply-headline"]'
    const STICKY = '[data-test="sticky-below-top-bar"]'

    const isCountQuery = (query: URLSearchParams): boolean =>
      query.get('uncategorized') === 'true' && query.get('pageSize') === '1'

    /** The page of the queue, and `total` movements without a category behind the count. */
    const withUncategorized =
      (total: number) =>
      (query: URLSearchParams): Promise<Response> =>
        Promise.resolve(
          jsonResponse(
            isCountQuery(query)
              ? { ...COUNT_PAGE, pagination: { ...COUNT_PAGE.pagination, total } }
              : PAGE_OF_THREE,
          ),
        )

    /** A finished pass kept by the rules store, as if it had been applied at 10:42. */
    const withLastApply = (pinia: Pinia): void => {
      useCategoryRulesStore(pinia).lastApply = {
        at: new Date(2026, 9, 12, 10, 42),
        result: parseApplyResult(APPLY_RESULT),
        cause: 'apply',
        rule: null,
      }
    }

    const follows = (first: Element, second: Element): boolean =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

    it('shows how many pending movements have no category without applying anything', async () => {
      const { api, wrapper } = await mountView('/review', { movements: withUncategorized(58) })

      expect(wrapper.get(SENTENCE).text()).toBe('58 pending movements have no category.')
      // In the header, next to the totals, and not the total of the page on screen (132).
      expect(wrapper.get('header').find(SENTENCE).exists()).toBe(true)
      expect(wrapper.get('[data-test="totals-matches"]').text()).toBe('132 movements')
      expect(api.movementQueries()).toEqual([PAGE_QUERY, UNCATEGORIZED_QUERY])
      // Nothing was applied and nothing was written to get it.
      expect(api.calls.every((call) => call.method === 'GET')).toBe(true)
      expect(api.count(APPLY_RULES)).toBe(0)
      expect(api.patches()).toEqual([])
      expect(wrapper.find(REPORT).exists()).toBe(false)
    })

    it('says it in the singular, and with other words when none is left', async () => {
      const one = await mountView('/review', { movements: withUncategorized(1) })
      expect(one.wrapper.get(SENTENCE).text()).toBe('1 pending movement has no category.')

      const none = await mountView('/review', { movements: withUncategorized(0) })
      expect(none.wrapper.get(SENTENCE).text()).toBe('Every pending movement has a category.')
    })

    it('keeps the number of the whole queue when the screen is filtered', async () => {
      const { api, wrapper } = await mountView('/review?q=luz&account=1', {
        movements: withUncategorized(58),
      })

      expect(api.movementQueries()).toEqual([
        'status=pending_review&accountId=1&q=luz&page=1&pageSize=100',
        UNCATEGORIZED_QUERY,
      ])
      expect(wrapper.get(SENTENCE).text()).toBe('58 pending movements have no category.')
    })

    it('shows nothing about uncategorized movements when that request fails', async () => {
      const { wrapper } = await mountView('/review', {
        movements: (query) =>
          Promise.resolve(
            isCountQuery(query)
              ? jsonResponse({ message: 'Error interno' }, { status: 500 })
              : jsonResponse(PAGE_OF_THREE),
          ),
      })

      expect(wrapper.find(SENTENCE).exists()).toBe(false)
      expect(wrapper.text()).not.toContain('no category')
      expect(wrapper.text()).not.toContain('Error interno')
      // The rest of the screen is not its business.
      expect(wrapper.find('[data-test="review-error"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
    })

    it('asks for the number again after confirming a row', async () => {
      const queue = fakeQueue()
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })
      expect(wrapper.get(SENTENCE).text()).toBe('132 pending movements have no category.')

      await wrapper.findAll('[data-test="movement-confirm"]')[0]?.trigger('click')
      await flushPromises()

      expect(api.movementQueries().at(-1)).toBe(UNCATEGORIZED_QUERY)
      expect(wrapper.get(SENTENCE).text()).toBe('131 pending movements have no category.')
    })

    it('shows the result of the last rules pass under the title', async () => {
      const { api, pinia, wrapper } = await mountView(
        '/review',
        { movements: json(PAGE_OF_THREE) },
        withLastApply,
      )

      expect(wrapper.get(HEADLINE).text()).toBe('Rules applied at 10:42: 12 movements categorized.')
      expect(wrapper.get('[data-test="last-apply-figures"]').text()).toBe(
        '5 still without a matching rule · 1 conflict',
      )
      // Between the header and the filters.
      const report = wrapper.get(REPORT).element
      expect(follows(wrapper.get('header').element, report)).toBe(true)
      expect(follows(report, wrapper.get('[data-test="review-filters"]').element)).toBe(true)

      const before = api.calls.length
      await wrapper.get('[data-test="last-apply-dismiss"]').trigger('click')

      expect(wrapper.find(HEADLINE).exists()).toBe(false)
      expect(wrapper.find(REPORT).exists()).toBe(false)
      expect(useCategoryRulesStore(pinia).lastApply).toBeNull()
      expect(api.calls).toHaveLength(before)
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
    })

    it('leaves the result in view after applying here and closing the dialog', async () => {
      const queue = fakeQueue()
      const { api, pinia, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: () => Promise.resolve(jsonResponse(APPLY_RESULT)),
      })
      expect(wrapper.find(REPORT).exists()).toBe(false)

      useCategoryRulesStore(pinia).openApply()
      await flushPromises()
      document.querySelector<HTMLElement>('[data-test="apply-confirmed"]')?.click()
      await flushPromises()
      document.querySelector<HTMLElement>('[data-test="apply-close"]')?.click()
      await flushPromises()

      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(wrapper.get(HEADLINE).text()).toMatch(
        /^Rules applied at \d{2}:\d{2}: 12 movements categorized\.$/,
      )
      await wrapper.get('[data-test="last-apply-show-movements"]').trigger('click')
      expect(wrapper.findAll('[data-test="last-apply-movement"]')).toHaveLength(12)
      // One POST without a body, and no movement was written.
      const posted = api.calls.filter((call) => call.method !== 'GET')
      expect(posted.map((call) => `${call.method} ${call.path}`)).toEqual([`POST ${APPLY_RULES}`])
      expect(posted[0]?.body).toBeUndefined()
      expect(api.patches()).toEqual([])
    })

    it('draws the result of the rules pass outside the block that sticks under the top bar', async () => {
      const queue = fakeQueue()
      const { wrapper } = await mountView(
        '/review',
        { movements: queue.movements, patch: queue.patch },
        withLastApply,
      )

      // The result alone is not a notice: the block is not painted for it.
      expect(wrapper.find(REPORT).exists()).toBe(true)
      expect(wrapper.find(STICKY).exists()).toBe(false)

      await wrapper.findAll('[data-test="movement-confirm"]')[0]?.trigger('click')
      await flushPromises()

      const sticky = wrapper.get(STICKY)
      expect(sticky.find('[data-test="action-summary"]').exists()).toBe(true)
      expect(sticky.find(REPORT).exists()).toBe(false)
      expect(sticky.find(HEADLINE).exists()).toBe(false)
      // Still on the page, and not a descendant of the block.
      const report = wrapper.get(REPORT).element
      expect(sticky.element.contains(report)).toBe(false)
      expect(report.closest(STICKY)).toBeNull()
    })
  })

  // ─── The notice under the top bar (feature 27) ───────────────────────────
  // jsdom lays nothing out, so «in view» is the browser tests' job. Here: the block
  // exists only with something to say, wraps the notices, and is told which row to
  // keep clear.

  describe('the block that keeps the notice under the top bar (feature 27)', () => {
    const BLOCK = '[data-test="sticky-below-top-bar"]'

    const rulesApi = (): Promise<Response> =>
      Promise.resolve(jsonResponse(CREATED_RULE, { status: 201 }))

    it('paints no notice block while there is nothing to say', async () => {
      const { wrapper } = await mountView('/review', { movements: json(PAGE_OF_THREE) })

      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
      expect(wrapper.find(BLOCK).exists()).toBe(false)
      expect(wrapper.find('[data-test="action-summary"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="action-error"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="rule-created-notice"]').exists()).toBe(false)
    })

    it('puts the summary and its Undo inside the block after confirming a row (R1)', async () => {
      const queue = fakeQueue()
      const { wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      await wrapper.findAll('[data-test="movement-confirm"]')[0]?.trigger('click')
      await flushPromises()

      const block = wrapper.get(BLOCK)
      expect(block.get('[data-test="action-summary"]').text()).toContain('1 movement confirmed')
      expect(block.find('[data-test="action-undo"]').exists()).toBe(true)
      expect(wrapper.findAll(BLOCK)).toHaveLength(1)
      expect(wrapper.findAll('[data-test="action-summary"]')).toHaveLength(1)
    })

    it('holds the rule notice or the action notice, never both (R4, C5)', async () => {
      const queue = fakeQueue()
      const { wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi,
      })

      await wrapper.findAll('[data-test="movement-create-rule"]')[0]?.trigger('click')
      await flushPromises()
      document.querySelector<HTMLElement>('[data-test="rule-save"]')?.click()
      await flushPromises()

      expect(wrapper.get(BLOCK).find('[data-test="rule-created-notice"]').exists()).toBe(true)
      expect(wrapper.get(BLOCK).find('[data-test="apply-rules-now"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="action-summary"]').exists()).toBe(false)

      await wrapper.findAll('[data-test="movement-confirm"]')[1]?.trigger('click')
      await flushPromises()

      expect(wrapper.get(BLOCK).find('[data-test="action-summary"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="rule-created-notice"]').exists()).toBe(false)
    })

    it('tells the block which row to keep clear, and none after a bulk action (R11)', async () => {
      // Row 12 as an expense: the neutral row of the default queue takes no category.
      const queue = fakeQueue([changed(EXPENSE, { id: 12 }), INCOME])
      const { api, wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
      })

      await wrapper.get('[data-movement-id="12"] select').setValue('2')
      await flushPromises()

      expect(api.patches().at(-1)?.body).toEqual({ categoryId: 2 })
      const block = wrapper.getComponent(StickyBelowTopBar)
      expect(block.props('keepClearOf')).toBe('[data-movement-id="12"]')
      // The selector really names the row that is still on the page.
      expect(wrapper.findAll(block.props('keepClearOf') as string)).toHaveLength(1)

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      await wrapper.get('[data-test="confirm-selected"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-test="action-summary"]').text()).toContain('2 movements confirmed')
      expect(wrapper.getComponent(StickyBelowTopBar).props('keepClearOf')).toBeNull()
    })

    it('puts the sentence of a failed action inside the block (R5)', async () => {
      const queue = fakeQueue()
      const { wrapper } = await mountView('/review', {
        movements: queue.movements,
        patch: json(VALIDATION_ERROR_BODY, 400),
      })

      await wrapper.findAll('[data-test="movement-confirm"]')[0]?.trigger('click')
      await flushPromises()

      expect(wrapper.get(BLOCK).find('[data-test="action-error"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="action-error"]')).toHaveLength(1)
      expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(3)
    })
  })

  describe('the question about the other movements (feature 34)', () => {
    const BLOCK = '[data-test="sticky-below-top-bar"]'
    const QUESTION = '[data-test="other-movements-question"]'
    const PREVIEW = '/api/category-rules/preview'

    /** The two movements the rule would move, and the 201 of creating it. */
    const CAFETERIA_CREATED = {
      ...CREATED_RULE,
      id: 21,
      matchText: 'cafeteria central',
      categoryId: 2,
      category: { id: 2, name: 'Groceries', kind: 'expense', parentId: 1 },
      categorization: {
        ...PREVIEW_CAFETERIA.categorization,
        categorizedMovements: [
          categorizedMovement(31, 'CAFETERIA CENTRAL 0412', {
            categoryId: 2,
            categoryName: 'Groceries',
            rules: [{ ruleId: 21, matchText: 'cafeteria central' }],
          }),
          categorizedMovement(37, 'CAFETERIA CENTRAL 0419', {
            categoryId: 2,
            categoryName: 'Groceries',
            rules: [{ ruleId: 21, matchText: 'cafeteria central' }],
          }),
        ],
      },
    }

    /** Everything under /api/category-rules: the preview, and the POST when asked. */
    const rulesApi =
      (post: () => Promise<Response> = () => Promise.reject(new TypeError('no POST'))) =>
      (call: ApiCall): Promise<Response> => {
        if (call.path === PREVIEW) return Promise.resolve(jsonResponse(PREVIEW_CAFETERIA))
        if (call.method === 'POST' && call.path === RULES) return post()
        return Promise.reject(new TypeError(`unexpected ${call.method} ${call.path}`))
      }

    async function changeFirstRow(post?: () => Promise<Response>) {
      const queue = fakeQueue()
      const mounted = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi(post),
      })
      await mounted.wrapper.get('[data-movement-id="10"] select').setValue('2')
      await flushPromises()
      return mounted
    }

    const questionOf = (pinia: Pinia) => useCategoryRulesStore(pinia).question

    const previews = (calls: ApiCall[]): ApiCall[] => calls.filter((call) => call.path === PREVIEW)
    const writes = (calls: ApiCall[]): string[] =>
      calls.filter((call) => call.method !== 'GET').map((call) => `${call.method} ${call.path}`)

    it('changing the category of one row in Review opens the question under the notice', async () => {
      const { api, wrapper } = await changeFirstRow()

      // One preview, with the suggested text of `CAFETERÍA CENTRAL` and the chosen category.
      expect(previews(api.calls)).toHaveLength(1)
      expect(previews(api.calls)[0]?.query.get('matchText')).toBe('cafeteria central')
      expect(previews(api.calls)[0]?.query.get('categoryId')).toBe('2')
      expect(writes(api.calls)).toEqual(['PATCH /api/movements/10'])

      // In the block under the top bar, after the line of the change and its Undo.
      const block = wrapper.get(BLOCK)
      const summary = block.get('[data-test="action-summary"]')
      const undo = block.get('[data-test="action-undo"]')
      const question = block.get(QUESTION)
      expect(summary.text()).toContain('1 movement categorized as Groceries')
      const follows = (first: Element, second: Element): boolean =>
        Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
      expect(follows(summary.element, question.element)).toBe(true)
      expect(follows(undo.element, question.element)).toBe(true)
      expect(question.text()).toContain(
        'Use Groceries for the other movements that contain this text too?',
      )
      expect(question.text()).toContain('2 other movements would move to Groceries.')
      expect(
        question.get<HTMLInputElement>('[data-test="other-movements-text"] input').element.value,
      ).toBe('cafeteria central')
    })

    it('saying yes in Review creates the rule and the line says how many it moved', async () => {
      const { api, wrapper } = await changeFirstRow(() =>
        Promise.resolve(jsonResponse(CAFETERIA_CREATED, { status: 201 })),
      )

      await wrapper.get('[data-test="other-movements-create"]').trigger('click')
      await flushPromises()

      const posts = api.calls.filter((call) => call.method === 'POST')
      expect(posts).toHaveLength(1)
      expect(posts[0]?.body).toEqual({ matchText: 'cafeteria central', categoryId: 2 })
      // The PATCH of the change and the POST of the yes: no other write.
      expect(writes(api.calls)).toEqual(['PATCH /api/movements/10', 'POST /api/category-rules'])
      expect(wrapper.find(QUESTION).exists()).toBe(false)
      expect(wrapper.get(BLOCK).get('[data-test="rule-created-line"]').text()).toBe(
        'Rule “cafeteria central” → Groceries created: 2 movements categorized.',
      )
    })

    it('giving a category to several rows at once asks nothing', async () => {
      const queue = fakeQueue([
        EXPENSE,
        changed(EXPENSE, { id: 14, description: 'CAFETERIA NORTE' }),
      ])
      const { api, wrapper, pinia } = await mountView('/review', {
        movements: queue.movements,
        patch: queue.patch,
        rules: rulesApi(),
      })

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      await wrapper.get('[data-test="bulk-category"] select').setValue('2')
      await wrapper.get('[data-test="apply-category"]').trigger('click')
      await flushPromises()

      expect(api.patches()).toHaveLength(1)
      expect(api.patches()[0]?.body).toEqual({ ids: [10, 14], categoryId: 2 })
      expect(previews(api.calls)).toEqual([])
      expect(api.calls.some((call) => call.path.startsWith('/api/category-rules'))).toBe(false)
      expect(wrapper.find(QUESTION).exists()).toBe(false)
      expect(questionOf(pinia)).toBeNull()
    })

    it('Undo or another action in Review closes the question', async () => {
      const { api, wrapper, pinia } = await changeFirstRow()
      expect(wrapper.find(QUESTION).exists()).toBe(true)

      // Undo closes it, and asks nothing about rules.
      await wrapper.get('[data-test="action-undo"]').trigger('click')
      await flushPromises()
      expect(wrapper.find(QUESTION).exists()).toBe(false)

      // Another change opens it again; confirming a row closes it.
      await wrapper.get('[data-movement-id="10"] select').setValue('2')
      await flushPromises()
      expect(wrapper.find(QUESTION).exists()).toBe(true)
      await wrapper.get('[data-movement-id="11"] [data-test="movement-confirm"]').trigger('click')
      await flushPromises()
      expect(wrapper.find(QUESTION).exists()).toBe(false)

      // No, only this one closes it and sends nothing.
      await wrapper.get('[data-movement-id="10"] select').setValue('3')
      await flushPromises()
      expect(wrapper.find(QUESTION).exists()).toBe(true)
      const before = api.calls.length
      await wrapper.get('[data-test="other-movements-dismiss"]').trigger('click')
      await flushPromises()
      expect(wrapper.find(QUESTION).exists()).toBe(false)
      expect(api.calls.length).toBe(before)

      // Leaving the screen closes it too.
      await wrapper.get('[data-movement-id="10"] select').setValue('2')
      await flushPromises()
      expect(questionOf(pinia)).not.toBeNull()
      wrapper.unmount()
      expect(questionOf(pinia)).toBeNull()

      // Nothing about rules was ever written.
      expect(api.calls.some((call) => call.method === 'POST')).toBe(false)
    })
  })
})
