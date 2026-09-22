import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { API_NETWORK, ApiError, ValidationError } from '@/shared/errors'

import { MAX_IDS } from '../actions'
import { EMPTY_FILTERS } from '../filters'
import { OUT_OF_RANGE_NOTICE, reviewErrorMessage, useReviewStore } from '../store'
import type { ReviewFilters } from '../types'
import {
  CATEGORIES,
  CATEGORY_TREE,
  COUNT_PAGE,
  EMPTY_PAGE,
  EXPENSE,
  MOVEMENTS,
  NEUTRAL,
  NOT_FOUND_BODY,
  PAGE_OF_THREE,
  PAGE_TWO,
  VALIDATION_ERROR_BODY,
  bulkResult,
  changed,
  deferred,
  fakeQueue,
  json,
  jsonResponse,
  mockApi,
  networkDown,
} from './fixtures'

const filters = (overrides: Partial<ReviewFilters> = {}): ReviewFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
})

describe('useReviewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('load (R3, R9, R11, R13)', () => {
    it('asks for the pending queue and keeps the page as the API sent it', async () => {
      const api = mockApi({ movements: json(PAGE_OF_THREE) })
      const store = useReviewStore()

      await store.load()

      expect(api.calls).toHaveLength(1)
      expect(api.calls[0]?.method).toBe('GET')
      expect(api.calls[0]?.path).toBe(MOVEMENTS)
      expect(api.movementQueries()).toEqual(['status=pending_review&page=1&pageSize=100'])
      expect(store.result?.movements.map((movement) => movement.id)).toEqual([10, 11, 12])
      expect(store.result?.pagination.total).toBe(132)
      expect(store.result?.totals.net).toBe('354.63')
      expect(store.error).toBeNull()
    })

    it('is loading while the request is in flight, and not after (R11)', async () => {
      const page = deferred()
      mockApi({ movements: page.answer })
      const store = useReviewStore()

      const loading = store.load()
      expect(store.isLoading).toBe(true)

      page.resolve(jsonResponse(PAGE_OF_THREE))
      await loading
      expect(store.isLoading).toBe(false)
    })

    it('never throws, whatever the failure', async () => {
      mockApi({ movements: networkDown })
      const store = useReviewStore()

      await expect(store.load()).resolves.toBeUndefined()

      expect(store.error?.code).toBe(API_NETWORK)
      expect(store.result).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('ignores the answer of a request that is no longer the last one', async () => {
      const slow = deferred()
      let call = 0
      mockApi({
        movements: () => {
          call += 1
          return call === 1 ? slow.answer() : Promise.resolve(jsonResponse(PAGE_TWO))
        },
      })
      const store = useReviewStore()

      const stale = store.apply(filters({ q: 'ca' }))
      const fresh = store.apply(filters({ q: 'caf' }))
      slow.resolve(jsonResponse(PAGE_OF_THREE))
      await Promise.all([stale, fresh])

      expect(store.result?.movements).toHaveLength(32)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('filters and pages (R5, R6)', () => {
    it('apply() sends the chosen filters and goes back to page 1', async () => {
      const api = mockApi({ movements: json(PAGE_OF_THREE) })
      const store = useReviewStore()

      await store.goToPage(3)
      await store.apply(filters({ accountId: 2, type: 'income' }))

      expect(store.page).toBe(1)
      expect(api.movementQueries()[1]).toBe(
        'status=pending_review&accountId=2&type=income&page=1&pageSize=100',
      )
    })

    it('goToPage() asks for that page and keeps the filters', async () => {
      const api = mockApi({ movements: json(PAGE_TWO) })
      const store = useReviewStore()

      await store.apply(filters({ q: 'luz' }))
      await store.goToPage(2)

      expect(store.page).toBe(2)
      expect(api.movementQueries()[1]).toBe('status=pending_review&q=luz&page=2&pageSize=100')
    })

    it('never sends categoryId and uncategorized in the same request (R6)', async () => {
      const api = mockApi({ movements: json(EMPTY_PAGE) })
      const store = useReviewStore()

      await store.apply(filters({ categoryId: 7, uncategorized: true }))

      const [query = ''] = api.movementQueries()
      expect(query).toContain('uncategorized=true')
      expect(query).not.toContain('categoryId')
    })
  })

  describe('the pending count (R1, R2)', () => {
    it('refreshPendingCount() asks the smallest possible query and keeps the total', async () => {
      const api = mockApi({ movements: json(COUNT_PAGE) })
      const store = useReviewStore()

      await store.refreshPendingCount()

      expect(api.movementQueries()).toEqual(['status=pending_review&page=1&pageSize=1'])
      expect(store.pendingCount).toBe(7)
    })

    it('leaves the count unknown when its query fails, without throwing', async () => {
      mockApi({ movements: json(NOT_FOUND_BODY, 404) })
      const store = useReviewStore()

      await expect(store.refreshPendingCount()).resolves.toBeUndefined()

      expect(store.pendingCount).toBeNull()
    })

    it('a load with no filters updates the count without an extra request (R2)', async () => {
      const api = mockApi({ movements: json(PAGE_OF_THREE) })
      const store = useReviewStore()

      await store.load()

      expect(store.pendingCount).toBe(132)
      expect(api.calls).toHaveLength(1)
    })

    it('a filtered load does not touch the count: it is not the whole queue', async () => {
      mockApi({ movements: json(PAGE_OF_THREE) })
      const store = useReviewStore()
      store.pendingCount = 132

      await store.apply(filters({ q: 'luz' }))

      expect(store.pendingCount).toBe(132)
    })
  })

  describe('categories (R7)', () => {
    it('asks for the tree once, however many times it is called', async () => {
      const api = mockApi({ categories: json(CATEGORY_TREE) })
      const store = useReviewStore()

      await store.loadCategories()
      await store.loadCategories()

      expect(api.count(CATEGORIES)).toBe(1)
      expect(store.categories?.map((category) => category.name)).toEqual(['Food', 'Salary'])
      expect(store.categoriesFailed).toBe(false)
    })

    it('marks the failure and leaves the rest of the screen alive', async () => {
      mockApi({ categories: json({ message: 'boom' }, 500) })
      const store = useReviewStore()

      await expect(store.loadCategories()).resolves.toBeUndefined()

      expect(store.categories).toBeNull()
      expect(store.categoriesFailed).toBe(true)
    })
  })

  describe('failures (R14)', () => {
    it('keeps a 404 without retrying', async () => {
      const api = mockApi({ movements: json(NOT_FOUND_BODY, 404) })
      const store = useReviewStore()

      await store.apply(filters({ accountId: 99 }))

      expect(api.calls).toHaveLength(1)
      expect(store.error).toBeInstanceOf(ApiError)
      expect(reviewErrorMessage(store.error!, store.page)).toEqual({
        message: 'That account or category no longer exists.',
        action: 'clear',
      })
    })

    it('retries once on page 1 when the page no longer exists, and says so', async () => {
      const api = mockApi({
        movements: (query) =>
          query.get('page') === '1'
            ? Promise.resolve(jsonResponse(PAGE_OF_THREE))
            : Promise.resolve(jsonResponse(VALIDATION_ERROR_BODY, { status: 400 })),
      })
      const store = useReviewStore()
      store.page = 3

      await store.load()

      expect(api.movementQueries()).toEqual([
        'status=pending_review&page=3&pageSize=100',
        'status=pending_review&page=1&pageSize=100',
      ])
      expect(store.page).toBe(1)
      expect(store.error).toBeNull()
      expect(store.notice).toBe(OUT_OF_RANGE_NOTICE)
      expect(store.result?.pagination.total).toBe(132)
    })

    it('does not chain a second retry when page 1 is rejected too', async () => {
      const api = mockApi({ movements: json(VALIDATION_ERROR_BODY, 400) })
      const store = useReviewStore()
      store.page = 3

      await store.load()

      expect(api.calls).toHaveLength(2)
      expect(store.notice).toBeNull()
      expect(reviewErrorMessage(store.error!, store.page)).toEqual({
        message: 'The backend rejected these filters.',
        action: 'clear',
      })
    })

    it('keeps a 400 on page 1 without retrying', async () => {
      const api = mockApi({ movements: json(VALIDATION_ERROR_BODY, 400) })
      const store = useReviewStore()

      await store.apply(filters({ from: '2026-12-01', to: '2026-01-01' }))

      expect(api.calls).toHaveLength(1)
      expect(reviewErrorMessage(store.error!, store.page).action).toBe('clear')
    })

    it('reports a network failure as unreachable', async () => {
      mockApi({ movements: networkDown })
      const store = useReviewStore()

      await store.load()

      expect(reviewErrorMessage(store.error!, store.page)).toEqual({
        message: "Couldn't reach the server.",
        action: 'retry',
      })
    })

    it('reports an unreadable answer as a contract problem', async () => {
      mockApi({ movements: json({ movements: 'nope' }) })
      const store = useReviewStore()

      await store.load()

      expect(store.error).toBeInstanceOf(ValidationError)
      expect(reviewErrorMessage(store.error!, store.page)).toEqual({
        message: "The server answered, but the list couldn't be read.",
        action: 'retry',
      })
    })

    it('falls back to a generic sentence for anything else', async () => {
      mockApi({ movements: json({ message: 'boom' }, 500) })
      const store = useReviewStore()

      await store.load()

      expect(reviewErrorMessage(store.error!, store.page)).toEqual({
        message: 'Something went wrong loading the list.',
        action: 'retry',
      })
    })

    it('never paints the backend message: it comes in Spanish and names ids', async () => {
      mockApi({ movements: json(NOT_FOUND_BODY, 404) })
      const store = useReviewStore()

      await store.load()

      expect(store.error?.message).toContain('La cuenta 99 no existe')
      expect(reviewErrorMessage(store.error!, store.page).message).not.toContain('cuenta')
    })

    it('clears the failure when a later load succeeds', async () => {
      let call = 0
      mockApi({
        movements: () => {
          call += 1
          return call === 1
            ? Promise.resolve(jsonResponse(NOT_FOUND_BODY, { status: 404 }))
            : Promise.resolve(jsonResponse(PAGE_OF_THREE))
        },
      })
      const store = useReviewStore()

      await store.apply(filters({ accountId: 99 }))
      expect(store.error).not.toBeNull()

      await store.apply(EMPTY_FILTERS)

      expect(store.error).toBeNull()
      expect(store.result).not.toBeNull()
    })
  })

  describe('selection (R1, R2, R3)', () => {
    it('ticks a row and unticks it again', async () => {
      mockApi({ movements: json(PAGE_OF_THREE) })
      const store = useReviewStore()
      await store.load()

      store.toggleSelection(10)
      store.toggleSelection(11)
      expect(store.selectedIds).toEqual([10, 11])
      expect(store.selection.map((movement) => movement.id)).toEqual([10, 11])

      store.toggleSelection(10)
      expect(store.selectedIds).toEqual([11])
    })

    it('selectPage() takes exactly the loaded page, and nothing that is not in it', async () => {
      mockApi({ movements: json(PAGE_OF_THREE) })
      const store = useReviewStore()
      await store.load()

      store.selectPage(true)
      expect(store.selectedIds).toEqual([10, 11, 12])

      store.selectPage(false)
      expect(store.selectedIds).toEqual([])
    })

    it('a full page still fits in one request: 200 ids is the cap (T0.2)', async () => {
      const movements = Array.from({ length: MAX_IDS }, (_item, index) =>
        changed(EXPENSE, { id: 1000 + index }),
      )
      mockApi({
        movements: json({
          ...PAGE_OF_THREE,
          movements,
          pagination: { page: 1, pageSize: 200, total: 200, totalPages: 1 },
        }),
      })
      const store = useReviewStore()
      await store.load()

      store.selectPage(true)

      expect(store.selectedIds).toHaveLength(MAX_IDS)
      expect(new Set(store.selectedIds).size).toBe(MAX_IDS)
    })

    it('lets go of the selection and of the last action when the page or the filters change', async () => {
      const queue = fakeQueue()
      mockApi({ movements: queue.movements, patch: queue.patch })
      const store = useReviewStore()
      await store.load()

      store.selectPage(true)
      await store.confirmOne(10)
      expect(store.lastAction).not.toBeNull()

      await store.goToPage(2)
      expect(store.selectedIds).toEqual([])
      expect(store.lastAction).toBeNull()

      store.toggleSelection(11)
      await store.apply(filters({ q: 'luz' }))
      expect(store.selectedIds).toEqual([])
      expect(store.lastAction).toBeNull()
    })
  })

  describe('acting on one movement (R4, R5, R10)', () => {
    it('confirmOne() sends one PATCH with only the status, and the row leaves the queue', async () => {
      const queue = fakeQueue()
      const api = mockApi({ movements: queue.movements, patch: queue.patch })
      const store = useReviewStore()
      await store.load()
      expect(store.pendingCount).toBe(132)

      await store.confirmOne(10)

      const writes = api.patches()
      expect(writes).toHaveLength(1)
      expect(writes[0]?.path).toBe(`${MOVEMENTS}/10`)
      expect(writes[0]?.body).toEqual({ status: 'confirmed' })
      expect(store.result?.movements.map((movement) => movement.id)).toEqual([11, 12])
      expect(store.pendingCount).toBe(131)
      expect(store.lastAction?.summary).toBe('1 movement confirmed')
    })

    it('categorizeOne() sends only the category and keeps the row, with its new category', async () => {
      const queue = fakeQueue()
      const api = mockApi({
        movements: queue.movements,
        patch: queue.patch,
        categories: json(CATEGORY_TREE),
      })
      const store = useReviewStore()
      await store.load()
      await store.loadCategories()

      await store.categorizeOne(10, 2)

      expect(api.patches()[0]?.body).toEqual({ categoryId: 2 })
      expect(store.result?.movements.map((movement) => movement.id)).toEqual([10, 11, 12])
      expect(store.result?.movements[0]?.category?.name).toBe('Groceries')
      expect(store.pendingCount).toBe(132)
      expect(store.lastAction?.summary).toBe('1 movement categorized as Groceries')
    })

    it('asks for the page again after the change, so the API keeps owning the totals', async () => {
      const queue = fakeQueue()
      const api = mockApi({ movements: queue.movements, patch: queue.patch })
      const store = useReviewStore()
      await store.load()
      const reads = api.movementQueries().length

      await store.confirmOne(10)

      expect(api.movementQueries().length - reads).toBe(1)
      expect(store.result?.pagination.total).toBe(131)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('acting on the selection (R6, R7, R11)', () => {
    it('confirmSelected() sends one PATCH with the ids and nothing else', async () => {
      const queue = fakeQueue()
      const api = mockApi({ movements: queue.movements, patch: queue.patch })
      const store = useReviewStore()
      await store.load()

      store.selectPage(true)
      await store.confirmSelected()

      const writes = api.patches()
      expect(writes).toHaveLength(1)
      expect(writes[0]?.path).toBe(MOVEMENTS)
      expect(writes[0]?.body).toEqual({ ids: [10, 11, 12], status: 'confirmed' })
      expect(Object.keys(writes[0]?.body as object).sort()).toEqual(['ids', 'status'])
      expect(store.result?.movements).toEqual([])
      expect(store.pendingCount).toBe(129)
      expect(store.selectedIds).toEqual([])
      expect(store.lastAction?.summary).toBe('3 movements confirmed')
    })

    it('categorizeSelected() sends only the movements that accept that category (R7)', async () => {
      const queue = fakeQueue()
      const api = mockApi({
        movements: queue.movements,
        patch: queue.patch,
        categories: json(CATEGORY_TREE),
      })
      const store = useReviewStore()
      await store.load()
      await store.loadCategories()

      store.selectPage(true)
      await store.categorizeSelected(2)

      const writes = api.patches()
      expect(writes).toHaveLength(1)
      expect(writes[0]?.body).toEqual({ ids: [10], categoryId: 2 })
      expect(store.selectedIds).toEqual([10, 11, 12])
    })

    it('sends nothing at all when no selected movement accepts the category', async () => {
      const queue = fakeQueue([NEUTRAL], 4)
      const api = mockApi({
        movements: queue.movements,
        patch: queue.patch,
        categories: json(CATEGORY_TREE),
      })
      const store = useReviewStore()
      await store.load()
      await store.loadCategories()

      store.selectPage(true)
      await store.categorizeSelected(2)

      expect(api.patches()).toEqual([])
      expect(store.lastAction).toBeNull()
    })

    it('a second click while the first is in flight does not send a second request (R11)', async () => {
      const queue = fakeQueue()
      const write = deferred()
      const api = mockApi({ movements: queue.movements, patch: write.answer })
      const store = useReviewStore()
      await store.load()
      store.selectPage(true)

      const first = store.confirmSelected()
      expect(store.isActing).toBe(true)
      const second = store.confirmSelected()

      write.resolve(jsonResponse(bulkResult([changed(EXPENSE, { status: 'confirmed' })])))
      await Promise.all([first, second])

      expect(api.patches()).toHaveLength(1)
      expect(store.isActing).toBe(false)
    })
  })

  describe('when an action fails (R12)', () => {
    const selectedAll = async (patch: Parameters<typeof mockApi>[0]['patch']) => {
      const queue = fakeQueue()
      const api = mockApi({ movements: queue.movements, patch })
      const store = useReviewStore()
      await store.load()
      store.selectPage(true)
      return { api, store, reads: api.movementQueries().length }
    }

    it('keeps the list and the selection after a 400, and does not reload', async () => {
      const { api, store, reads } = await selectedAll(json(VALIDATION_ERROR_BODY, 400))

      await store.confirmSelected()

      expect(store.result?.movements.map((movement) => movement.id)).toEqual([10, 11, 12])
      expect(store.selectedIds).toEqual([10, 11, 12])
      expect(api.movementQueries().length - reads).toBe(0)
      expect(store.actionMessage).toBe(
        "Nothing changed. Some of those movements don't accept that category.",
      )
      expect(store.lastAction).toBeNull()
    })

    it('reloads the list after a 404: the change may have gone through', async () => {
      const { api, store, reads } = await selectedAll(json(NOT_FOUND_BODY, 404))

      await store.confirmSelected()

      expect(api.movementQueries().length - reads).toBe(1)
      expect(store.actionMessage).toContain('Reloading the list')
      expect(store.actionMessage).not.toContain('cuenta')
    })

    it('reloads the list when the answer cannot be read', async () => {
      const { api, store, reads } = await selectedAll(json({ updated: 'two' }))

      await store.confirmSelected()

      expect(api.movementQueries().length - reads).toBe(1)
      expect(store.actionMessage).toContain("the reply couldn't be read")
    })

    it('says nothing changed when the server is unreachable, without reloading', async () => {
      const { api, store, reads } = await selectedAll(networkDown)

      await store.confirmSelected()

      expect(api.movementQueries().length - reads).toBe(0)
      expect(store.actionMessage).toBe("Couldn't reach the server. Nothing changed.")
      expect(store.selectedIds).toEqual([10, 11, 12])
    })
  })

  describe('undo (R13, R14)', () => {
    it('puts a confirmation back with one PATCH, and the rows come back', async () => {
      const queue = fakeQueue()
      const api = mockApi({ movements: queue.movements, patch: queue.patch })
      const store = useReviewStore()
      await store.load()
      store.selectPage(true)
      await store.confirmSelected()
      expect(store.pendingCount).toBe(129)

      await store.undoLast()

      const writes = api.patches()
      expect(writes).toHaveLength(2)
      expect(writes[1]?.body).toEqual({ ids: [10, 11, 12], status: 'pending_review' })
      expect(store.result?.movements.map((movement) => movement.id)).toEqual([10, 11, 12])
      expect(store.pendingCount).toBe(132)
      expect(store.lastAction).toBeNull()
    })

    it('puts a categorization back with one PATCH per previous category', async () => {
      const queue = fakeQueue([
        EXPENSE,
        changed(EXPENSE, { id: 13, categoryId: null, category: null }),
      ])
      const api = mockApi({
        movements: queue.movements,
        patch: queue.patch,
        categories: json(CATEGORY_TREE),
      })
      const store = useReviewStore()
      await store.load()
      await store.loadCategories()
      store.selectPage(true)
      await store.categorizeSelected(2)

      await store.undoLast()

      const bodies = api.patches().map((call) => call.body)
      expect(bodies).toEqual([
        { ids: [10, 13], categoryId: 2 },
        { ids: [10], categoryId: 1 },
        { ids: [13], categoryId: null },
      ])
      expect(store.result?.movements.map((movement) => movement.categoryId)).toEqual([1, null])
    })

    it('stops at the group that failed, says so and reloads (R14)', async () => {
      const queue = fakeQueue([
        EXPENSE,
        changed(EXPENSE, { id: 13, categoryId: null, category: null }),
      ])
      let write = 0
      const api = mockApi({
        movements: queue.movements,
        categories: json(CATEGORY_TREE),
        patch: (call) => {
          write += 1
          // The categorization and its first undo group work; the second one fails.
          return write === 3
            ? Promise.resolve(jsonResponse(NOT_FOUND_BODY, { status: 404 }))
            : queue.patch(call)
        },
      })
      const store = useReviewStore()
      await store.load()
      await store.loadCategories()
      store.selectPage(true)
      await store.categorizeSelected(2)
      const reads = api.movementQueries().length

      await store.undoLast()

      expect(api.patches()).toHaveLength(3)
      expect(api.movementQueries().length - reads).toBe(1)
      expect(store.actionMessage).toContain('Reloading the list')
      expect(store.lastAction).not.toBeNull()
    })
  })

  it('confirming the last page of the queue falls back to page 1 (T0.1, R10)', async () => {
    const LAST_ROW = changed(EXPENSE, { id: 20 })
    let confirmed = false
    const api = mockApi({
      movements: (query) => {
        if (query.get('page') === '2') {
          return confirmed
            ? Promise.resolve(jsonResponse(VALIDATION_ERROR_BODY, { status: 400 }))
            : Promise.resolve(
                jsonResponse({
                  ...PAGE_OF_THREE,
                  movements: [LAST_ROW],
                  pagination: { page: 2, pageSize: 100, total: 101, totalPages: 2 },
                }),
              )
        }
        return Promise.resolve(jsonResponse(PAGE_OF_THREE))
      },
      patch: () => {
        confirmed = true
        return Promise.resolve(
          jsonResponse(bulkResult([changed(LAST_ROW, { status: 'confirmed' })])),
        )
      },
    })
    const store = useReviewStore()
    await store.goToPage(2)
    store.selectPage(true)

    await store.confirmSelected()

    expect(store.page).toBe(1)
    expect(store.notice).toBe(OUT_OF_RANGE_NOTICE)
    expect(store.result?.movements.map((movement) => movement.id)).toEqual([10, 11, 12])
    expect(api.patches()).toHaveLength(1)
  })

  it('only ever talks to the two read endpoints (R13)', async () => {
    const api = mockApi({ movements: json(PAGE_OF_THREE), categories: json(CATEGORY_TREE) })
    const store = useReviewStore()

    await store.load()
    await store.loadCategories()
    await store.goToPage(2)
    await store.refreshPendingCount()

    expect(api.calls.every((call) => call.method === 'GET')).toBe(true)
    expect([...new Set(api.calls.map((call) => call.path))].sort()).toEqual([CATEGORIES, MOVEMENTS])
  })
})
