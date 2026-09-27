import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ApiError, ValidationError } from '@/shared/errors'

import { EMPTY_FILTERS } from '../filters'
import type { StatementFilters } from '../filters'
import { useStatementStore } from '../store'
import {
  ACCOUNTS,
  CATEGORIES,
  EXPENSE,
  GROCERIES,
  NOT_FOUND_BODY,
  PENDING_EXPENSE,
  changed,
  BIG_MONTH_PAGE_ONE,
  BIG_MONTH_PAGE_TWO,
  EMPTY_MONTH_PAGE,
  MONTH_PAGE,
  OTHER_MONTH_PAGE,
  TOTALS,
  VALIDATION_ERROR_BODY,
  deferred,
  json,
  jsonResponse,
  mockApi,
  networkDown,
} from './fixtures'

describe('useStatementStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks for the whole month, with no status filter (R1)', async () => {
    const api = mockApi({ movements: json(MONTH_PAGE) })
    const store = useStatementStore()

    await store.show('2026-09')

    expect(api.queries()).toEqual(['from=2026-09-01&to=2026-09-30&page=1&pageSize=200'])
    expect(api.methods()).toEqual(['GET'])
    expect(store.result?.totals).toEqual(TOTALS)
    expect(store.days.map((day) => day.date)).toEqual(['2026-09-11', '2026-09-04', '2026-09-02'])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('replaces the month on screen when another one is shown (R2)', async () => {
    const api = mockApi({
      movements: (query) =>
        json(query.get('from') === '2026-08-01' ? OTHER_MONTH_PAGE : MONTH_PAGE)(),
    })
    const store = useStatementStore()
    await store.show('2026-09')

    await store.shift(-1)

    expect(store.month).toBe('2026-08')
    expect(api.queries().at(-1)).toBe('from=2026-08-01&to=2026-08-31&page=1&pageSize=200')
    expect(store.result?.totals.expense).toBe('99.99')
    expect(store.days.map((day) => day.date)).toEqual(['2026-08-14'])
  })

  it('discards a late answer of a month that is no longer the one asked for (R15)', async () => {
    const slow = deferred()
    mockApi({
      movements: (query) =>
        query.get('from') === '2026-07-01' ? slow.answer() : json(MONTH_PAGE)(),
    })
    const store = useStatementStore()

    const stale = store.show('2026-07')
    await store.show('2026-09')
    slow.resolve(jsonResponse(OTHER_MONTH_PAGE))
    await stale

    expect(store.month).toBe('2026-09')
    expect(store.result?.totals).toEqual(TOTALS)
    expect(store.days.map((day) => day.date)).toEqual(['2026-09-11', '2026-09-04', '2026-09-02'])
    expect(store.isLoading).toBe(false)
  })

  it('shows the loading flag while the month is in flight (R14)', async () => {
    const slow = deferred()
    mockApi({ movements: slow.answer })
    const store = useStatementStore()

    const loading = store.show('2026-09')

    expect(store.isLoading).toBe(true)
    expect(store.result).toBeNull()
    slow.resolve(jsonResponse(MONTH_PAGE))
    await loading
    expect(store.isLoading).toBe(false)
  })

  it('keeps an empty month as a plain answer, not as a failure (R11)', async () => {
    mockApi({ movements: json(EMPTY_MONTH_PAGE) })
    const store = useStatementStore()

    await store.show('2024-01')

    expect(store.error).toBeNull()
    expect(store.result?.pagination.total).toBe(0)
    expect(store.days).toEqual([])
    expect(store.hasMore).toBe(false)
  })

  describe('a failure never throws (R12)', () => {
    it('keeps a network failure in `error`', async () => {
      mockApi({ movements: networkDown })
      const store = useStatementStore()

      await expect(store.show('2026-09')).resolves.toBeUndefined()

      expect(store.error).toBeInstanceOf(ApiError)
      expect(store.result).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('keeps a rejected month in `error`', async () => {
      mockApi({ movements: json(VALIDATION_ERROR_BODY, 400) })
      const store = useStatementStore()

      await store.show('2026-09')

      expect((store.error as ApiError).status).toBe(400)
    })

    it('keeps a response that breaks the contract in `error`', async () => {
      mockApi({ movements: json({ ...MONTH_PAGE, totals: { income: '1.00' } }) })
      const store = useStatementStore()

      await store.show('2026-09')

      expect(store.error).toBeInstanceOf(ValidationError)
      expect(store.result).toBeNull()
    })

    it('forgets a past failure when a month loads (R12)', async () => {
      let down = true
      mockApi({ movements: () => (down ? networkDown() : json(MONTH_PAGE)()) })
      const store = useStatementStore()
      await store.show('2026-09')
      down = false

      await store.show('2026-09')

      expect(store.error).toBeNull()
      expect(store.result).not.toBeNull()
    })
  })

  describe('Load more inside the month (R13)', () => {
    const bigMonth = () =>
      mockApi({
        movements: (query) =>
          json(query.get('page') === '2' ? BIG_MONTH_PAGE_TWO : BIG_MONTH_PAGE_ONE)(),
      })

    it('appends the next page of the same month without moving the figures', async () => {
      const api = bigMonth()
      const store = useStatementStore()
      await store.show('2026-09')
      expect(store.hasMore).toBe(true)
      expect(store.shown).toBe(2)

      await store.loadMore()

      expect(api.queries().at(-1)).toBe('from=2026-09-01&to=2026-09-30&page=2&pageSize=200')
      expect(store.shown).toBe(3)
      expect(store.days.map((day) => day.date)).toEqual(['2026-09-11', '2026-09-04', '2026-09-01'])
      expect(store.result?.pagination.total).toBe(412)
      expect(store.result?.totals).toEqual(TOTALS)
      expect(store.hasMore).toBe(false)
    })

    it('does nothing once the whole month is on screen', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()
      await store.show('2026-09')

      await store.loadMore()

      expect(api.queries()).toHaveLength(1)
    })

    it('drops what Load more brought when another month is shown', async () => {
      const api = mockApi({
        movements: (query) => {
          if (query.get('from') === '2026-08-01') return json(OTHER_MONTH_PAGE)()
          return json(query.get('page') === '2' ? BIG_MONTH_PAGE_TWO : BIG_MONTH_PAGE_ONE)()
        },
      })
      const store = useStatementStore()
      await store.show('2026-09')
      await store.loadMore()
      expect(store.shown).toBe(3)

      await store.shift(-1)

      expect(store.extra).toEqual([])
      expect(store.shown).toBe(1)
      expect(store.hasMore).toBe(false)
      expect(api.methods()).toEqual(['GET'])
    })

    it('a failed Load more keeps the month on screen', async () => {
      mockApi({
        movements: (query) =>
          query.get('page') === '2' ? networkDown() : json(BIG_MONTH_PAGE_ONE)(),
      })
      const store = useStatementStore()
      await store.show('2026-09')

      await store.loadMore()

      expect(store.error).toBeInstanceOf(ApiError)
      expect(store.shown).toBe(2)
      expect(store.result?.totals).toEqual(TOTALS)
      expect(store.isLoadingMore).toBe(false)
    })
  })

  describe('the filters of the month (feature 20)', () => {
    const filters = (patch: Partial<StatementFilters>): StatementFilters => ({
      ...EMPTY_FILTERS,
      ...patch,
    })

    it('carries the month and the filters in one request (R1, R4)', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()

      await store.show('2026-03', filters({ accountId: 2, q: ' luz ' }))

      expect(api.queries()).toEqual([
        'accountId=2&from=2026-03-01&to=2026-03-31&q=luz&page=1&pageSize=200',
      ])
      expect(api.methods()).toEqual(['GET'])
      // The figures are the filtered ones the backend sent, never a sum of the rows.
      expect(store.result?.totals).toEqual(TOTALS)
    })

    it('asks for uncategorized alone, never with a category (R9)', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()

      await store.show('2026-03', filters({ categoryId: 3, uncategorized: true }))

      expect(api.queries()[0]).toContain('uncategorized=true')
      expect(api.queries()[0]).not.toContain('categoryId')
    })

    it('applyFilters stays on the month and throws away what Load more brought (R3)', async () => {
      const api = mockApi({
        movements: (query) =>
          json(query.get('page') === '2' ? BIG_MONTH_PAGE_TWO : BIG_MONTH_PAGE_ONE)(),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      await store.loadMore()
      expect(store.shown).toBe(3)

      await store.applyFilters(filters({ uncategorized: true }))

      expect(store.month).toBe('2026-09')
      expect(store.extra).toEqual([])
      expect(store.page).toBe(1)
      expect(api.queries().at(-1)).toBe(
        'from=2026-09-01&to=2026-09-30&uncategorized=true&page=1&pageSize=200',
      )
    })

    it('keeps the filters when the month changes (R12)', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()
      await store.show('2026-09', filters({ uncategorized: true }))

      await store.shift(-1)

      expect(store.month).toBe('2026-08')
      expect(store.filters.uncategorized).toBe(true)
      expect(api.queries().at(-1)).toBe(
        'from=2026-08-01&to=2026-08-31&uncategorized=true&page=1&pageSize=200',
      )
    })

    it('Load more asks the next page with the filters put (R3)', async () => {
      const api = mockApi({
        movements: (query) =>
          json(query.get('page') === '2' ? BIG_MONTH_PAGE_TWO : BIG_MONTH_PAGE_ONE)(),
      })
      const store = useStatementStore()
      await store.show('2026-09', filters({ accountId: 2 }))

      await store.loadMore()

      expect(api.queries().at(-1)).toBe(
        'accountId=2&from=2026-09-01&to=2026-09-30&page=2&pageSize=200',
      )
      expect(store.shown).toBe(3)
    })

    it('discards a late answer of filters that are no longer the ones asked for (R15)', async () => {
      const slow = deferred()
      mockApi({
        movements: (query) =>
          query.get('uncategorized') === 'true' ? slow.answer() : json(MONTH_PAGE)(),
      })
      const store = useStatementStore()

      const stale = store.show('2026-09', filters({ uncategorized: true }))
      await store.applyFilters({ ...EMPTY_FILTERS })
      slow.resolve(jsonResponse(OTHER_MONTH_PAGE))
      await stale

      expect(store.filters).toEqual(EMPTY_FILTERS)
      expect(store.result?.totals).toEqual(TOTALS)
    })

    it('a filter with no matches is a plain answer, not a failure (R13)', async () => {
      mockApi({ movements: json(EMPTY_MONTH_PAGE) })
      const store = useStatementStore()

      await store.show('2026-03', filters({ q: 'zzzz' }))

      expect(store.error).toBeNull()
      expect(store.result?.pagination.total).toBe(0)
      expect(store.days).toEqual([])
    })
  })

  describe('the lists that fill the selects (R14, R15)', () => {
    it('asks each list once per session and keeps every account and category', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()

      await store.loadAccounts()
      await store.loadCategories()
      await store.loadAccounts()
      await store.loadCategories()

      expect(store.accounts?.map((account) => account.bank)).toEqual(['bankinter', 'myinvestor'])
      expect(store.categories?.map((category) => category.name)).toEqual(['Food', 'Salary'])
      expect(store.accountsFailed).toBe(false)
      expect(store.categoriesFailed).toBe(false)
      expect(api.calls.filter((call) => call.path === '/api/accounts')).toHaveLength(1)
      expect(api.calls.filter((call) => call.path === '/api/categories')).toHaveLength(1)
      expect(api.methods()).toEqual(['GET'])
      expect(ACCOUNTS).toHaveLength(2)
      expect(CATEGORIES).toHaveLength(2)
    })

    it('a failed account list only switches its own select off (R15)', async () => {
      mockApi({ movements: json(MONTH_PAGE), accounts: networkDown })
      const store = useStatementStore()

      await expect(store.loadAccounts()).resolves.toBeUndefined()
      await store.loadCategories()
      await store.show('2026-09')

      expect(store.accountsFailed).toBe(true)
      expect(store.accounts).toBeNull()
      expect(store.categoriesFailed).toBe(false)
      expect(store.categories).not.toBeNull()
      // The month itself is untouched: the screen keeps working.
      expect(store.error).toBeNull()
      expect(store.result?.totals).toEqual(TOTALS)
    })

    it('a failed category list only switches its own select off (R15)', async () => {
      mockApi({ movements: json(MONTH_PAGE), categories: json({ nope: true }) })
      const store = useStatementStore()

      await store.loadAccounts()
      await expect(store.loadCategories()).resolves.toBeUndefined()

      expect(store.categoriesFailed).toBe(true)
      expect(store.categories).toBeNull()
      expect(store.accountsFailed).toBe(false)
      expect(store.accounts).not.toBeNull()
    })
  })
  // --- Correcting a category (feature 21) ---

  describe('correcting a category from the statement (feature 21)', () => {
    const filters = (patch: Partial<StatementFilters>): StatementFilters => ({
      ...EMPTY_FILTERS,
      ...patch,
    })

    /** The month with one pending row added, so both statuses are on screen (R6). */
    const MIXED_PAGE = {
      ...MONTH_PAGE,
      movements: [EXPENSE, PENDING_EXPENSE, ...MONTH_PAGE.movements.slice(1)],
      pagination: { page: 1, pageSize: 200, total: 6, totalPages: 1 },
    }

    const GROCERIES_EXPENSE = changed(EXPENSE, { categoryId: 2, category: GROCERIES })

    it('sends one PATCH with only the category and adopts the answer (R1, R7)', async () => {
      const api = mockApi({ movements: json(MIXED_PAGE), patch: json(GROCERIES_EXPENSE) })
      const store = useStatementStore()
      await store.show('2026-09')

      await store.categorize(10, 2)

      expect(api.patches()).toHaveLength(1)
      expect(api.patches()[0]?.path).toBe('/api/movements/10')
      expect(api.patches()[0]?.rawBody).toBe('{"categoryId":2}')
      const row = store.result?.movements.find((movement) => movement.id === 10)
      expect(row?.category?.name).toBe('Groceries')
      expect(store.lastAction).toEqual({
        summary: 'Categorized as Groceries',
        movementId: 10,
        previousCategoryId: 1,
      })
      expect(store.actionNotice).toBe('Categorized as Groceries')
      expect(store.actionMessage).toBeNull()
      expect(store.editingId).toBeNull()
    })

    it('works the same on a confirmed movement, and no status moves (R6)', async () => {
      const api = mockApi({
        movements: json(MIXED_PAGE),
        patch: json(changed(PENDING_EXPENSE, { categoryId: 2, category: GROCERIES })),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      // The very same call on a confirmed row: nothing about it is special.
      await store.categorize(10, 2)
      const confirmedBody = api.patches()[0]?.rawBody

      await store.categorize(15, 2)

      expect(confirmedBody).toBe('{"categoryId":2}')
      expect(api.patches()[1]?.rawBody).toBe('{"categoryId":2}')
      expect(api.patches().every((call) => !(call.rawBody ?? '').includes('status'))).toBe(true)
      expect(store.result?.movements.find((movement) => movement.id === 15)?.status).toBe(
        'pending_review',
      )
      expect(store.result?.movements.find((movement) => movement.id === 12)?.status).toBe(
        'confirmed',
      )
    })

    it('removes the category when `No category` is chosen', async () => {
      const api = mockApi({
        movements: json(MONTH_PAGE),
        patch: json(changed(EXPENSE, { categoryId: null, category: null })),
      })
      const store = useStatementStore()
      await store.show('2026-09')

      await store.categorize(10, null)

      expect(api.patches()[0]?.rawBody).toBe('{"categoryId":null}')
      expect(store.actionNotice).toBe('Category removed')
      expect(store.result?.movements.find((movement) => movement.id === 10)?.category).toBeNull()
    })

    it('asks for nothing else when no category filter is on (R9)', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE), patch: json(GROCERIES_EXPENSE) })
      const store = useStatementStore()
      await store.show('2026-09', filters({ accountId: 1, q: 'cafe' }))
      const readsBefore = api.queries().length

      await store.categorize(10, 2)

      expect(api.queries()).toHaveLength(readsBefore)
      expect(store.result?.totals).toEqual(TOTALS)
    })

    it('with `uncategorized` on, the row goes at once and the figures come again (R8, R9)', async () => {
      const after = {
        movements: [PENDING_EXPENSE],
        pagination: { page: 1, pageSize: 200, total: 1, totalPages: 1 },
        totals: { income: '0.00', expense: '20.00', net: '-20.00' },
      }
      let reads = 0
      const api = mockApi({
        movements: () => {
          reads += 1
          return json(
            reads === 1 ? { ...MIXED_PAGE, movements: [EXPENSE, PENDING_EXPENSE] } : after,
          )()
        },
        patch: json(GROCERIES_EXPENSE),
      })
      const store = useStatementStore()
      await store.show('2026-09', filters({ uncategorized: true }))

      await store.categorize(10, 2)

      expect(store.result?.movements.map((movement) => movement.id)).toEqual([15])
      expect(store.result?.totals.expense).toBe('20.00')
      expect(store.result?.pagination.total).toBe(1)
      expect(api.queries()).toHaveLength(2)
      expect(api.queries().at(-1)).toContain('uncategorized=true')
    })

    it('filtering by one category, a row given another one also goes (R8)', async () => {
      // The refresh of the figures is made to fail on purpose: the row must be gone
      // because the answer of the PATCH said so, not because a later GET said so.
      let reads = 0
      mockApi({
        movements: () => {
          reads += 1
          return reads === 1 ? json(MONTH_PAGE)() : networkDown()
        },
        patch: json(GROCERIES_EXPENSE),
      })
      const store = useStatementStore()
      await store.show('2026-09', filters({ categoryId: 1 }))
      expect(store.result?.movements.map((movement) => movement.id)).toContain(10)

      await store.categorize(10, 2)

      const onScreen = store.days.flatMap((day) => day.movements).map((movement) => movement.id)
      expect(onScreen).not.toContain(10)
      expect(store.lastAction?.previousCategoryId).toBe(1)
      // A failed refresh says nothing: the write did go through.
      expect(store.actionMessage).toBeNull()
      expect(store.result?.totals).toEqual(TOTALS)
    })

    it('a row brought by `Load more` is replaced where it is (R7)', async () => {
      const brought = BIG_MONTH_PAGE_TWO.movements[0] as Record<string, unknown>
      const api = mockApi({
        movements: (query) =>
          json(query.get('page') === '2' ? BIG_MONTH_PAGE_TWO : BIG_MONTH_PAGE_ONE)(),
        patch: json(changed(brought, { categoryId: 2, category: GROCERIES })),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      await store.loadMore()

      await store.categorize(30, 2)

      expect(api.patches()[0]?.path).toBe('/api/movements/30')
      expect(store.extra.find((movement) => movement.id === 30)?.category?.name).toBe('Groceries')
      expect(store.shown).toBe(3)
    })

    it('never recomputes the figures of the month in the client (R10)', async () => {
      mockApi({ movements: json(MONTH_PAGE), patch: json(GROCERIES_EXPENSE) })
      const store = useStatementStore()
      await store.show('2026-09')

      await store.categorize(10, 2)

      expect(store.result?.totals).toEqual(TOTALS)
      expect(store.result?.pagination.total).toBe(5)
    })

    it('the undo sends the previous category and leaves nothing to put back (R12)', async () => {
      let patches = 0
      const api = mockApi({
        movements: json(MONTH_PAGE),
        patch: () => {
          patches += 1
          return json(patches === 1 ? GROCERIES_EXPENSE : EXPENSE)()
        },
      })
      const store = useStatementStore()
      await store.show('2026-09')
      await store.categorize(10, 2)

      await store.undoLast()

      expect(api.patches().map((call) => call.rawBody)).toEqual([
        '{"categoryId":2}',
        '{"categoryId":1}',
      ])
      expect(store.result?.movements.find((movement) => movement.id === 10)?.category?.name).toBe(
        'Food',
      )
      expect(store.lastAction).toBeNull()
      expect(store.actionNotice).toBe('Change undone')

      // Nothing is redone: a second Undo sends no request at all.
      await store.undoLast()
      expect(api.patches()).toHaveLength(2)
    })

    it('forgets the editor and the undo when the month or a filter changes (R13)', async () => {
      mockApi({ movements: json(MONTH_PAGE), patch: json(GROCERIES_EXPENSE) })
      const store = useStatementStore()
      await store.show('2026-09')
      store.openEditor(10)
      await store.categorize(10, 2)
      expect(store.lastAction).not.toBeNull()

      await store.shift(-1)

      expect(store.lastAction).toBeNull()
      expect(store.actionNotice).toBeNull()
      expect(store.editingId).toBeNull()

      store.openEditor(10)
      await store.applyFilters(filters({ uncategorized: true }))

      expect(store.editingId).toBeNull()
    })

    it('opens one editor at a time and closes it on demand (R3, C2)', async () => {
      mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()
      await store.show('2026-09')

      store.openEditor(10)
      expect(store.editingId).toBe(10)
      store.openEditor(12)
      expect(store.editingId).toBe(12)
      store.closeEditor()
      expect(store.editingId).toBeNull()
    })

    it('a 400 says it in English and does NOT reload the month (R14, R15)', async () => {
      const api = mockApi({
        movements: json(MONTH_PAGE),
        patch: json(VALIDATION_ERROR_BODY, 400),
      })
      const store = useStatementStore()
      await store.show('2026-09')

      await expect(store.categorize(14, 2)).resolves.toBeUndefined()

      expect(store.actionMessage).toBe(
        "Nothing changed. That movement doesn't accept that category.",
      )
      expect(store.actionMessage).not.toContain('par')
      expect(store.actionError).toBeInstanceOf(ApiError)
      expect(api.queries()).toHaveLength(1)
      expect(store.result?.movements.find((movement) => movement.id === 14)?.category).toBeNull()
      expect(store.lastAction).toBeNull()
    })

    it('a network failure says nothing changed and does NOT reload (R14, R15)', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE), patch: networkDown })
      const store = useStatementStore()
      await store.show('2026-09')

      await store.categorize(10, 2)

      expect(store.actionMessage).toBe("Couldn't reach the server. Nothing changed.")
      expect(api.queries()).toHaveLength(1)
    })

    it('a 404 reloads the month before believing what is on screen (R15)', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE), patch: json(NOT_FOUND_BODY, 404) })
      const store = useStatementStore()
      await store.show('2026-09')

      await store.categorize(10, 2)

      expect(store.actionMessage).toBe(
        'Nothing changed: the movement or the category no longer exists. Reloading the month.',
      )
      expect(store.actionMessage).not.toContain('No existe')
      expect(api.queries()).toHaveLength(2)
      expect(store.result?.pagination.total).toBe(5)
    })

    it('a second click while one write is in flight starts nothing (C2)', async () => {
      const slow = deferred()
      const api = mockApi({ movements: json(MONTH_PAGE), patch: slow.answer })
      const store = useStatementStore()
      await store.show('2026-09')

      const first = store.categorize(10, 2)
      expect(store.isActing).toBe(true)
      await store.categorize(12, 4)
      expect(api.patches()).toHaveLength(1)

      slow.resolve(jsonResponse(GROCERIES_EXPENSE))
      await first

      expect(api.patches()).toHaveLength(1)
      expect(store.isActing).toBe(false)
    })

    it('a row that is not on screen is not written at all', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE), patch: json(GROCERIES_EXPENSE) })
      const store = useStatementStore()
      await store.show('2026-09')

      await store.categorize(9999, 2)

      expect(api.patches()).toHaveLength(0)
      expect(store.lastAction).toBeNull()
    })
  })
})
