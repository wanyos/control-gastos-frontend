import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ApiError, ValidationError } from '@/shared/errors'

import { useStatementStore } from '../store'
import {
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
})
