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
  EXPENSE_SAME_DAY,
  INCOME,
  bulkResult,
  excluded,
  fakeMonth,
  movement as rawMovement,
  GROCERIES,
  NOT_FOUND_BODY,
  PENDING_EXPENSE,
  changed,
  BIG_MONTH_PAGE_ONE,
  BIG_MONTH_PAGE_TWO,
  COUNT_PAGE,
  EMPTY_MONTH_PAGE,
  HIDDEN_MONTH_PAGE,
  TRANSFER,
  ambiguousGroups,
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

  // --- Marking movements as not counted (feature 22) ---

  describe('the selection mode (R4, R5, R6, R7)', () => {
    it('starts off, with nothing selected', async () => {
      mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()
      await store.show('2026-09')

      expect(store.isSelecting).toBe(false)
      expect(store.selectedIds).toEqual([])
      expect(store.selectedCount).toBe(0)
    })

    it('closes the open category editor when it is turned on (R6)', async () => {
      mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()
      await store.show('2026-09')
      store.openEditor(10)

      store.startSelecting()

      expect(store.isSelecting).toBe(true)
      expect(store.editingId).toBeNull()
    })

    it('ticks and unticks a row, and empties the selection when turned off (R7)', async () => {
      mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()
      await store.show('2026-09')
      store.startSelecting()

      store.toggleSelected(10)
      store.toggleSelected(11)
      store.toggleSelected(10)
      expect(store.selectedIds).toEqual([11])

      store.stopSelecting()

      expect(store.isSelecting).toBe(false)
      expect(store.selectedIds).toEqual([])
    })

    it('selects every row on screen, and clears them again', async () => {
      mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()
      await store.show('2026-09')
      store.startSelecting()

      store.selectAllShown()
      expect(store.selectedIds).toEqual([10, 11, 12, 13, 14])

      store.clearSelection()
      expect(store.selectedIds).toEqual([])
    })

    it('never ticks more than the 200 ids the contract accepts (R2)', async () => {
      const many = Array.from({ length: 220 }, (_item, index) =>
        rawMovement({
          id: 1000 + index,
          type: 'expense',
          bookingDate: '2026-09-03',
          valueDate: '2026-09-03',
          amount: '1.00',
          description: `RECIBO ${index}`,
        }),
      )
      mockApi({
        movements: json({
          movements: many,
          pagination: { page: 1, pageSize: 200, total: 220, totalPages: 1 },
          totals: TOTALS,
        }),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      store.startSelecting()

      store.selectAllShown()
      expect(store.selectedIds).toHaveLength(200)

      // One more click on a row that is not ticked yet changes nothing.
      store.toggleSelected(1215)
      expect(store.selectedIds).toHaveLength(200)
      expect(store.selectedIds).not.toContain(1215)
    })

    it('empties the selection when the month changes, and keeps the mode on (R7)', async () => {
      mockApi({
        movements: (query) =>
          json(query.get('from') === '2026-08-01' ? OTHER_MONTH_PAGE : MONTH_PAGE)(),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      store.startSelecting()
      store.selectAllShown()

      await store.shift(-1)

      expect(store.selectedIds).toEqual([])
      expect(store.isSelecting).toBe(true)
    })

    it('empties the selection when a filter changes (R7)', async () => {
      mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()
      await store.show('2026-09')
      store.startSelecting()
      store.toggleSelected(10)

      await store.applyFilters({ ...EMPTY_FILTERS, accountId: 2 })

      expect(store.selectedIds).toEqual([])
    })
  })

  describe('marking a selection as not counted (R1, R2, R3, R9 ... R16)', () => {
    /** Ticks the given rows with the checkboxes, exactly as the bar does. */
    const select = (store: ReturnType<typeof useStatementStore>, ids: number[]): void => {
      store.startSelecting()
      for (const id of ids) store.toggleSelected(id)
    }

    const MONTH_FIGURES = { income: '1200.00', expense: '57.37', net: '1142.63' }

    it('sends ONE request with the two ids and asks the month once more (R1, R11, R12)', async () => {
      const month = fakeMonth()
      const api = mockApi({ movements: month.movements, bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      expect(store.result?.totals).toEqual(MONTH_FIGURES)
      select(store, [10, 11])

      await store.setExcluded(true)

      expect(api.patches()).toHaveLength(1)
      expect(api.patches()[0]?.path).toBe('/api/movements')
      expect(api.patches()[0]?.rawBody).toBe('{"ids":[10,11],"excludedFromTotals":true}')
      // One GET of the month before the write, ONE after it: the quiet refresh (R12).
      expect(api.queries()).toHaveLength(2)
      expect(api.queries()[1]).toBe('from=2026-09-01&to=2026-09-30&page=1&pageSize=200')
      expect(store.isLoading).toBe(false)
      // The rows say it, and the figures are the backend's new ones (C3).
      expect(
        store.result?.movements.filter((row) => row.excludedFromTotals).map((row) => row.id),
      ).toEqual([10, 11])
      expect(store.result?.totals).toEqual({ income: '1200.00', expense: '0.00', net: '1200.00' })
      expect(store.actionNotice).toBe('2 movements excluded from totals')
      expect(store.actionMessage).toBeNull()
      expect(store.selectedIds).toEqual([])
      expect(store.lastExclusion).toEqual({ ids: [10, 11], excluded: true })
    })

    it('sends only the ids that really change (R2)', async () => {
      const month = fakeMonth([excluded(EXPENSE), excluded(EXPENSE_SAME_DAY), INCOME])
      const api = mockApi({ movements: month.movements, bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 11, 12])

      await store.setExcluded(true)

      expect(api.patches()).toHaveLength(1)
      expect(api.patches()[0]?.rawBody).toBe('{"ids":[12],"excludedFromTotals":true}')
      expect(store.actionNotice).toBe('1 movement excluded from totals')
      expect(store.lastExclusion).toEqual({ ids: [12], excluded: true })
    })

    it('sends NOTHING when everything ticked is already like that (R3)', async () => {
      const month = fakeMonth([excluded(EXPENSE), excluded(EXPENSE_SAME_DAY)])
      const api = mockApi({ movements: month.movements, bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 11])

      await store.setExcluded(true)

      expect(api.patches()).toHaveLength(0)
      expect(api.queries()).toHaveLength(1)
      expect(store.actionNotice).toBe('Nothing to change: those movements are already like that.')
      expect(store.lastExclusion).toBeNull()
      expect(store.canUndo).toBe(false)
      // The selection is still there: nothing happened to it.
      expect(store.selectedIds).toEqual([10, 11])
    })

    it('puts a selection back in the totals with `false` (R1)', async () => {
      const month = fakeMonth([excluded(EXPENSE), EXPENSE_SAME_DAY, INCOME])
      const api = mockApi({ movements: month.movements, bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10])

      await store.setExcluded(false)

      expect(api.patches()[0]?.rawBody).toBe('{"ids":[10],"excludedFromTotals":false}')
      expect(store.result?.movements.find((row) => row.id === 10)?.excludedFromTotals).toBe(false)
      expect(store.actionNotice).toBe('1 movement back in totals')
    })

    it('marks a neutral movement and a transfer leg like any other (R10)', async () => {
      const month = fakeMonth()
      const api = mockApi({ movements: month.movements, bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [13, 14])

      await store.setExcluded(true)

      expect(api.patches()[0]?.rawBody).toBe('{"ids":[13,14],"excludedFromTotals":true}')
      expect(store.result?.movements.find((row) => row.id === 13)?.excludedFromTotals).toBe(true)
      expect(store.result?.movements.find((row) => row.id === 14)?.excludedFromTotals).toBe(true)
    })

    it('hides, filters and reorders nothing: the marked rows stay put (R9)', async () => {
      const month = fakeMonth()
      mockApi({ movements: month.movements, bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 12])

      await store.setExcluded(true)

      expect(store.result?.movements.map((row) => row.id)).toEqual([10, 11, 12, 13, 14])
      expect(store.days.map((day) => day.date)).toEqual(['2026-09-11', '2026-09-04', '2026-09-02'])
    })

    it('puts back exactly the ids of the last batch, with the opposite value (R14)', async () => {
      const month = fakeMonth()
      const api = mockApi({ movements: month.movements, bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 11])
      await store.setExcluded(true)
      expect(store.canUndo).toBe(true)

      await store.undo()

      expect(api.patches()).toHaveLength(2)
      expect(api.patches()[1]?.rawBody).toBe('{"ids":[10,11],"excludedFromTotals":false}')
      expect(store.result?.movements.every((row) => !row.excludedFromTotals)).toBe(true)
      expect(store.result?.totals).toEqual(MONTH_FIGURES)
      expect(store.actionNotice).toBe('2 movements back in totals')
      expect(store.lastExclusion).toBeNull()
      expect(store.canUndo).toBe(false)
    })

    it('undoes only the ids that changed, not the whole selection (R2, R14)', async () => {
      const month = fakeMonth([excluded(EXPENSE), EXPENSE_SAME_DAY, INCOME])
      const api = mockApi({ movements: month.movements, bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 11, 12])
      await store.setExcluded(true)

      await store.undo()

      expect(api.patches()[1]?.rawBody).toBe('{"ids":[11,12],"excludedFromTotals":false}')
      // The one that was already marked before the batch is left alone.
      expect(store.result?.movements.find((row) => row.id === 10)?.excludedFromTotals).toBe(true)
    })

    it('ignores a second click while one write is in flight (C5)', async () => {
      const slow = deferred()
      const api = mockApi({ movements: json(MONTH_PAGE), bulkPatch: slow.answer })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 11])

      const first = store.setExcluded(true)
      expect(store.isActing).toBe(true)
      await store.setExcluded(true)
      slow.resolve(jsonResponse(bulkResult([excluded(EXPENSE), excluded(EXPENSE_SAME_DAY)])))
      await first

      expect(api.patches()).toHaveLength(1)
      expect(store.isActing).toBe(false)
    })

    it('a 400 says so in English and does NOT reload the month (R15, R16)', async () => {
      const api = mockApi({
        movements: json(MONTH_PAGE),
        bulkPatch: json(VALIDATION_ERROR_BODY, 400),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 11])

      await store.setExcluded(true)

      expect(api.queries()).toHaveLength(1)
      expect(store.actionMessage).toBe('Nothing changed. The server rejected that change.')
      expect(store.actionMessage).not.toContain('parametro')
      expect(store.actionNotice).toBeNull()
      expect(store.lastExclusion).toBeNull()
      // Nothing was written, so the selection stays and the gesture can be retried.
      expect(store.selectedIds).toEqual([10, 11])
    })

    it('a 404 reloads the month before painting the failure (R16)', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE), bulkPatch: json(NOT_FOUND_BODY, 404) })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 11])

      await store.setExcluded(true)

      expect(api.queries()).toHaveLength(2)
      expect(store.actionMessage).toBe(
        'Nothing changed: one of those movements no longer exists. Reloading the month.',
      )
      expect(store.actionMessage).not.toContain('existe')
      expect(store.lastExclusion).toBeNull()
    })

    it('a network failure says nothing changed and reloads nothing', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE), bulkPatch: networkDown })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10])

      await expect(store.setExcluded(true)).resolves.toBeUndefined()

      expect(api.queries()).toHaveLength(1)
      expect(store.actionMessage).toBe("Couldn't reach the server. Nothing changed.")
    })

    it('never computes a figure itself: they are the ones of the last answer (C3)', async () => {
      // The answer carries figures that do NOT match the movements on screen, so a
      // client that subtracted the marked amounts would show something else entirely.
      const api = mockApi({
        movements: json(MONTH_PAGE),
        bulkPatch: json(bulkResult([excluded(EXPENSE), excluded(INCOME)])),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 12])

      await store.setExcluded(true)

      expect(api.patches()).toHaveLength(1)
      expect(store.result?.totals).toEqual(TOTALS)
      expect(store.result?.pagination.total).toBe(5)
    })

    it('a quiet refresh that fails leaves the rows already changed (design §6)', async () => {
      let first = true
      const api = mockApi({
        movements: () => {
          if (first) {
            first = false
            return json(MONTH_PAGE)()
          }
          return networkDown()
        },
        bulkPatch: json(bulkResult([excluded(EXPENSE)])),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10])

      await store.setExcluded(true)

      expect(api.queries()).toHaveLength(2)
      expect(store.result?.movements.find((row) => row.id === 10)?.excludedFromTotals).toBe(true)
      expect(store.actionNotice).toBe('1 movement excluded from totals')
      expect(store.error).toBeNull()
    })

    it('forgets the Undo when the month changes (R7)', async () => {
      const month = fakeMonth()
      mockApi({
        movements: (query) =>
          query.get('from') === '2026-08-01' ? json(OTHER_MONTH_PAGE)() : month.movements(),
        bulkPatch: month.bulkPatch,
      })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10])
      await store.setExcluded(true)

      await store.shift(-1)

      expect(store.lastExclusion).toBeNull()
      expect(store.canUndo).toBe(false)
      expect(store.actionNotice).toBeNull()
    })

    it('only one Undo is offered at a time: a category write replaces the batch', async () => {
      const month = fakeMonth()
      mockApi({
        movements: month.movements,
        bulkPatch: month.bulkPatch,
        patch: json(changed(EXPENSE_SAME_DAY, { categoryId: 2, category: GROCERIES })),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10])
      await store.setExcluded(true)
      expect(store.lastExclusion).not.toBeNull()

      await store.categorize(11, 2)

      expect(store.lastExclusion).toBeNull()
      expect(store.lastAction?.movementId).toBe(11)
      expect(store.canUndo).toBe(true)
    })
  })
  // ─── The noise switch (feature 23: R1 … R15) ──────────────────────────────
  describe('the noise switch', () => {
    const filters = (patch: Partial<StatementFilters>): StatementFilters => ({
      ...EMPTY_FILTERS,
      ...patch,
    })

    const select = (store: ReturnType<typeof useStatementStore>, ids: number[]): void => {
      store.startSelecting()
      for (const id of ids) store.toggleSelected(id)
    }

    it('starts off: no scope travels and no count is asked for (R1)', async () => {
      const api = mockApi({ movements: json(MONTH_PAGE) })
      const store = useStatementStore()

      await store.show('2026-09')

      expect(store.hideNoise).toBe(false)
      expect(api.queries()).toEqual(['from=2026-09-01&to=2026-09-30&page=1&pageSize=200'])
      expect(store.hiddenCount).toBeNull()
    })

    it('on, it asks the month with both scopes and then counts, in that order (R2, R7)', async () => {
      const api = mockApi({
        movements: (query) =>
          (query.get('pageSize') === '1' ? json(COUNT_PAGE) : json(HIDDEN_MONTH_PAGE))(),
      })
      const store = useStatementStore()

      await store.show('2026-09', EMPTY_FILTERS, true)

      expect(api.queries()).toEqual([
        'from=2026-09-01&to=2026-09-30&excluded=none&transfer=none&page=1&pageSize=200',
        'from=2026-09-01&to=2026-09-30&page=1&pageSize=1',
      ])
      expect(api.methods()).toEqual(['GET'])
      // 5 in the whole month, 4 on screen: one movement is being held back (R7).
      expect(store.hiddenCount).toBe(1)
      expect(store.result?.pagination.total).toBe(4)
    })

    it('carries the switch with the filters in ONE request, and neither wins (R10)', async () => {
      const api = mockApi({
        movements: (query) =>
          (query.get('pageSize') === '1' ? json(COUNT_PAGE) : json(HIDDEN_MONTH_PAGE))(),
      })
      const store = useStatementStore()

      await store.show('2026-09', filters({ accountId: 2, uncategorized: true }), true)

      expect(api.queries()[0]).toBe(
        'accountId=2&from=2026-09-01&to=2026-09-30&uncategorized=true&excluded=none&transfer=none&page=1&pageSize=200',
      )
      // The count is measured against the same filters, without the scopes (R7).
      expect(api.queries()[1]).toBe(
        'accountId=2&from=2026-09-01&to=2026-09-30&uncategorized=true&page=1&pageSize=1',
      )
    })

    it('turning it off asks the same month and the same filters with no scope (R3)', async () => {
      const api = mockApi({
        movements: (query) =>
          (query.get('pageSize') === '1' ? json(COUNT_PAGE) : json(MONTH_PAGE))(),
      })
      const store = useStatementStore()
      await store.show('2026-09', filters({ accountId: 2 }), true)

      await store.show('2026-09', filters({ accountId: 2 }), false)

      expect(api.queries().at(-1)).toBe(
        'accountId=2&from=2026-09-01&to=2026-09-30&page=1&pageSize=200',
      )
      expect(store.hiddenCount).toBeNull()
      expect(store.hideNoise).toBe(false)
    })

    it('the switch rides along to the next page of the month (R2)', async () => {
      const api = mockApi({
        movements: (query) =>
          query.get('pageSize') === '1'
            ? json(COUNT_PAGE)()
            : json(query.get('page') === '2' ? BIG_MONTH_PAGE_TWO : BIG_MONTH_PAGE_ONE)(),
      })
      const store = useStatementStore()
      await store.show('2026-09', EMPTY_FILTERS, true)

      await store.loadMore()

      expect(api.queries().at(-1)).toBe(
        'from=2026-09-01&to=2026-09-30&excluded=none&transfer=none&page=2&pageSize=200',
      )
    })

    it('the figures are the ones of the answer, untouched (R6, C3)', async () => {
      mockApi({
        movements: (query) =>
          (query.get('pageSize') === '1' ? json(COUNT_PAGE) : json(HIDDEN_MONTH_PAGE))(),
      })
      const store = useStatementStore()

      await store.show('2026-09', EMPTY_FILTERS, true)

      // The very same three figures the whole month answers with (design §1).
      expect(store.result?.totals).toEqual(TOTALS)
      expect(store.result?.totals).toEqual(MONTH_PAGE.totals)
    })

    it('a failed count leaves the month, the figures and the list intact (R9)', async () => {
      mockApi({
        movements: (query) =>
          query.get('pageSize') === '1' ? networkDown() : json(HIDDEN_MONTH_PAGE)(),
      })
      const store = useStatementStore()

      await store.show('2026-09', EMPTY_FILTERS, true)

      expect(store.hiddenCount).toBeNull()
      expect(store.error).toBeNull()
      expect(store.result?.totals).toEqual(TOTALS)
      expect(store.days).toHaveLength(3)
      expect(store.isLoading).toBe(false)
    })

    it('a month that failed asks for no count at all', async () => {
      const api = mockApi({ movements: networkDown })
      const store = useStatementStore()

      await store.show('2026-09', EMPTY_FILTERS, true)

      expect(api.queries()).toHaveLength(1)
      expect(store.hiddenCount).toBeNull()
      expect(store.error).not.toBeNull()
    })

    it('drops the count of a month nobody is looking at any more (R15 of the F19)', async () => {
      const late = deferred()
      mockApi({
        movements: (query) => {
          if (query.get('pageSize') === '1') return late.answer()
          return json(query.get('from') === '2026-07-01' ? HIDDEN_MONTH_PAGE : MONTH_PAGE)()
        },
      })
      const store = useStatementStore()

      const stale = store.show('2026-07', EMPTY_FILTERS, true)
      await store.show('2026-09', EMPTY_FILTERS, false)
      late.resolve(jsonResponse(COUNT_PAGE))
      await stale

      expect(store.month).toBe('2026-09')
      expect(store.hiddenCount).toBeNull()
    })

    it('empties the selection and keeps the mode when the switch moves (R11)', async () => {
      mockApi({
        movements: (query) =>
          (query.get('pageSize') === '1' ? json(COUNT_PAGE) : json(MONTH_PAGE))(),
      })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10, 11])

      await store.show('2026-09', EMPTY_FILTERS, true)

      expect(store.selectedIds).toEqual([])
      expect(store.isSelecting).toBe(true)
      expect(store.canUndo).toBe(false)
      expect(store.actionNotice).toBeNull()
    })

    it('marking a row with the switch on takes it off the list, Undo included (R13)', async () => {
      const month = fakeMonth()
      mockApi({ movements: (query) => month.movements(query), bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09', EMPTY_FILTERS, true)
      // The paired transfer is already out: four rows, and one held back.
      expect(store.shownMovements.map((row) => row.id)).toEqual([10, 11, 12, 14])
      expect(store.hiddenCount).toBe(1)
      select(store, [10])

      await store.setExcluded(true)

      expect(store.shownMovements.map((row) => row.id)).toEqual([11, 12, 14])
      expect(store.actionNotice).toBe('1 movement excluded from totals')
      expect(store.canUndo).toBe(true)
      expect(store.hiddenCount).toBe(2)

      await store.undo()

      expect(store.shownMovements.map((row) => row.id)).toEqual([10, 11, 12, 14])
      expect(store.hiddenCount).toBe(1)
    })

    it('with the switch off a marked row stays exactly where it was (F22, R9)', async () => {
      const month = fakeMonth()
      mockApi({ movements: (query) => month.movements(query), bulkPatch: month.bulkPatch })
      const store = useStatementStore()
      await store.show('2026-09')
      select(store, [10])

      await store.setExcluded(true)

      expect(store.shownMovements.map((row) => row.id)).toEqual([10, 11, 12, 13, 14])
    })

    it('never writes anything: every request of the switch is a GET (C1)', async () => {
      const api = mockApi({
        movements: (query) =>
          (query.get('pageSize') === '1' ? json(COUNT_PAGE) : json(HIDDEN_MONTH_PAGE))(),
      })
      const store = useStatementStore()

      await store.show('2026-09', EMPTY_FILTERS, true)
      await store.loadAmbiguous()
      await store.show('2026-09', EMPTY_FILTERS, false)

      expect(api.methods()).toEqual(['GET'])
      expect(api.patches()).toHaveLength(0)
      expect(TRANSFER.transferId).not.toBeNull()
    })

    describe('the live figure of the note (R15)', () => {
      it('reads the groups once per session, whatever the month and the filters do', async () => {
        const api = mockApi({ movements: json(MONTH_PAGE), ambiguous: json(ambiguousGroups(3)) })
        const store = useStatementStore()

        await store.loadAmbiguous()
        await store.loadAmbiguous()
        await store.show('2026-08')
        await store.applyFilters(filters({ accountId: 2 }))
        await store.loadAmbiguous()

        expect(store.ambiguousGroups).toBe(3)
        expect(api.calls.filter((call) => call.path === '/api/transfers/ambiguous')).toHaveLength(1)
      })

      it('zero groups is a plain answer, not a failure', async () => {
        mockApi({ movements: json(MONTH_PAGE), ambiguous: json(ambiguousGroups(0)) })
        const store = useStatementStore()

        await store.loadAmbiguous()

        expect(store.ambiguousGroups).toBe(0)
      })

      it('a failure leaves it unknown and paints no error anywhere', async () => {
        mockApi({ movements: json(MONTH_PAGE), ambiguous: networkDown })
        const store = useStatementStore()
        await store.show('2026-09')

        await store.loadAmbiguous()

        expect(store.ambiguousGroups).toBeNull()
        expect(store.error).toBeNull()
        expect(store.actionMessage).toBeNull()
        expect(store.result).not.toBeNull()
      })

      it('an answer that breaks the contract is a failure like any other', async () => {
        mockApi({ movements: json(MONTH_PAGE), ambiguous: json({ ambiguousCount: '3' }) })
        const store = useStatementStore()

        await store.loadAmbiguous()

        expect(store.ambiguousGroups).toBeNull()
      })
    })
  })
})
