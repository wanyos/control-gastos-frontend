import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ApiError } from '@/shared/errors'

import { monthSentence, priorMonths } from '../reading'
import { useOverviewStore } from '../store'
import {
  LATEST,
  SERVER_ERROR_BODY,
  deferred,
  figuresOf,
  json,
  jsonResponse,
  mockBackend,
  networkDown,
  rawMonthPage,
  rawPage,
} from './fixtures'
import type { Read } from './fixtures'

const isMonth = (read: Read, month: string): boolean =>
  read.kind === 'month' && read.month === month

describe('useOverviewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts idle, with nothing read', () => {
    const store = useOverviewStore()

    expect(store.core).toBe('idle')
    expect(store.figures).toBeNull()
    expect(store.state).toBeNull()
    expect(store.comparison).toBeNull()
    expect(store.sentence).toBeNull()
  })

  describe('a complete month (R10, C3)', () => {
    it('reads it with 15 GET and ends with the comparison ready', async () => {
      const api = mockBackend()
      const store = useOverviewStore()

      await store.show('2026-08')

      expect(api.calls).toHaveLength(15)
      expect(api.count('latest')).toBe(1)
      expect(api.count('uncategorized')).toBe(1)
      expect([...api.months()].sort()).toEqual(['2026-08', ...priorMonths('2026-08')].sort())
      expect(store.core).toBe('ready')
      expect(store.state).toBe('complete')
      expect(store.latest).toBe(LATEST)
      expect(store.figures).toEqual(figuresOf('2026-08'))
      expect(store.sentence).toBe(monthSentence(figuresOf('2026-08'), LATEST))
      expect(store.comparisonLoad).toBe('ready')
      expect(store.comparison).toEqual({
        months: 12,
        income: { usual: '2950.00', differencePermille: -122, verdict: 'usual' },
        expense: { usual: '2967.58', differencePermille: 349, verdict: 'more' },
      })
      expect(store.uncategorizedLoad).toBe('ready')
      expect(store.uncategorized).toEqual({ amount: '3036.33', count: 48 })
    })

    it('going back one month asks for only 2 things more', async () => {
      const api = mockBackend()
      const store = useOverviewStore()
      await store.show('2026-08')
      const before = api.calls.length

      await store.show('2026-07')

      const added = api.calls.slice(before).map((call) => `${call.read.kind} ${call.read.month}`)
      expect([...added].sort()).toEqual(['month 2025-07', 'uncategorized 2026-07'])
      expect(store.figures).toEqual(figuresOf('2026-07'))
      expect(store.comparison?.months).toBe(12)
    })

    it('coming back to a month already read asks only for its uncategorized spending', async () => {
      const api = mockBackend()
      const store = useOverviewStore()
      await store.show('2026-08')
      await store.show('2026-07')
      const before = api.calls.length

      await store.show('2026-08')

      expect(api.calls.slice(before).map((call) => call.read.kind)).toEqual(['uncategorized'])
      expect(store.comparison?.expense.usual).toBe('2967.58')
    })

    it('compares with the months that have data, and says how many (R11)', async () => {
      mockBackend()
      const store = useOverviewStore()

      await store.show('2024-02')
      expect(store.comparison?.months).toBe(1)

      await store.show('2024-01')
      expect(store.comparison?.months).toBe(0)
    })
  })

  it('an incomplete month asks for no previous month (R8)', async () => {
    const api = mockBackend()
    const store = useOverviewStore()

    await store.show('2026-09')

    expect(api.months()).toEqual(['2026-09'])
    expect(api.calls).toHaveLength(3)
    expect(store.state).toBe('incomplete')
    expect(store.comparison).toBeNull()
    expect(store.comparisonLoad).toBe('idle')
    expect(store.uncategorized).toEqual({ amount: '625.71', count: 14 })
  })

  it('an empty month reads only the core (R9)', async () => {
    const api = mockBackend()
    const store = useOverviewStore()

    await store.show('2026-10')

    expect(api.calls.map((call) => call.read.kind).sort()).toEqual(['latest', 'month'])
    expect(store.state).toBe('empty')
    expect(store.comparison).toBeNull()
    expect(store.uncategorized).toBeNull()
    expect(store.uncategorizedLoad).toBe('idle')
  })

  describe('failures (R13, R14)', () => {
    it.each([
      ['the month', (read: Read) => isMonth(read, '2026-08')],
      ['the date of the last data', (read: Read) => read.kind === 'latest'],
    ])('a failed read of %s is an error of the core, and retry repeats it', async (_n, fails) => {
      let isDown = true
      const api = mockBackend((read) =>
        isDown && fails(read) ? json(SERVER_ERROR_BODY, 500)() : undefined,
      )
      const store = useOverviewStore()

      await store.show('2026-08')

      expect(store.core).toBe('error')
      expect(store.coreError).toBeInstanceOf(ApiError)
      expect(store.state).toBeNull()
      expect(store.sentence).toBeNull()
      expect(api.count('uncategorized')).toBe(0)

      isDown = false
      await store.retry()

      expect(store.core).toBe('ready')
      expect(store.coreError).toBeNull()
      expect(store.comparison?.months).toBe(12)
    })

    it('one failed previous month leaves the figures and no comparison at all', async () => {
      let isDown = true
      const api = mockBackend((read) =>
        isDown && isMonth(read, '2026-03') ? networkDown() : undefined,
      )
      const store = useOverviewStore()

      await store.show('2026-08')

      expect(store.core).toBe('ready')
      expect(store.figures).toEqual(figuresOf('2026-08'))
      expect(store.sentence).toBe(monthSentence(figuresOf('2026-08'), LATEST))
      expect(store.comparisonLoad).toBe('error')
      // Eleven months did arrive: no median is made out of them.
      expect(Object.keys(store.figuresByMonth)).toHaveLength(12)
      expect(store.comparison).toBeNull()
      expect(store.uncategorizedLoad).toBe('ready')

      isDown = false
      const before = api.calls.length
      await store.retryComparison()

      expect(api.calls.slice(before).map((call) => call.read.month)).toEqual(['2026-03'])
      expect(store.comparisonLoad).toBe('ready')
      expect(store.comparison?.expense.usual).toBe('2967.58')
    })

    it('a failed uncategorized read leaves everything else ready', async () => {
      mockBackend((read) => (read.kind === 'uncategorized' ? networkDown() : undefined))
      const store = useOverviewStore()

      await store.show('2026-08')

      expect(store.uncategorizedLoad).toBe('error')
      expect(store.uncategorized).toBeNull()
      expect(store.core).toBe('ready')
      expect(store.comparison?.months).toBe(12)
    })
  })

  it('when the month changes before the answer, the old answer paints nothing (C4)', async () => {
    const august = deferred()
    mockBackend((read) => (isMonth(read, '2026-08') ? august.answer() : undefined))
    const store = useOverviewStore()

    const first = store.show('2026-08')
    await store.show('2026-01')
    august.resolve(jsonResponse(rawMonthPage('2026-08')))
    await first

    expect(store.month).toBe('2026-01')
    expect(store.figures).toEqual(figuresOf('2026-01'))
    expect(store.sentence).toBe(monthSentence(figuresOf('2026-01'), LATEST))
    expect(store.uncategorized).toEqual({ amount: '1622.70', count: 21 })
    // What arrived late is still August's, so it is kept for when it is asked for.
    expect(store.figuresByMonth['2026-08']).toEqual(figuresOf('2026-08'))
  })

  it('a late failure of the old month does not turn the new one into an error (C4)', async () => {
    const august = deferred()
    mockBackend((read) => (isMonth(read, '2026-08') ? august.answer() : undefined))
    const store = useOverviewStore()

    const first = store.show('2026-08')
    await store.show('2026-01')
    august.resolve(jsonResponse(SERVER_ERROR_BODY, { status: 500 }))
    await first

    expect(store.core).toBe('ready')
    expect(store.coreError).toBeNull()
  })

  describe('one visit (C3)', () => {
    it('reset forgets everything read', async () => {
      mockBackend()
      const store = useOverviewStore()
      await store.show('2026-08')

      store.reset()

      expect(store.core).toBe('idle')
      expect(store.figuresByMonth).toEqual({})
      expect(store.latest).toBeNull()
      expect(store.comparison).toBeNull()
      expect(store.uncategorized).toBeNull()
    })

    it('an answer that started before the reset is not kept', async () => {
      const august = deferred()
      mockBackend((read) => (isMonth(read, '2026-08') ? august.answer() : undefined))
      const store = useOverviewStore()

      const showing = store.show('2026-08')
      store.reset()
      august.resolve(jsonResponse(rawMonthPage('2026-08')))
      await showing

      expect(store.figuresByMonth).toEqual({})
      expect(store.core).toBe('idle')
    })

    it('refreshIfLoaded asks for nothing when the screen was never loaded', async () => {
      const api = mockBackend()
      const store = useOverviewStore()

      await store.refreshIfLoaded()

      expect(api.calls).toEqual([])
      expect(store.core).toBe('idle')
    })

    it('refreshIfLoaded reads the shown month again, with what the backend says now', async () => {
      let isImported = false
      const api = mockBackend((read) =>
        isImported && isMonth(read, '2026-08')
          ? json(rawPage({ income: '2600.26', expense: '4003.89', net: '-1403.63' }, 71))()
          : undefined,
      )
      const store = useOverviewStore()
      await store.show('2026-08')
      expect(api.calls).toHaveLength(15)

      isImported = true
      await store.refreshIfLoaded()

      expect(api.calls).toHaveLength(30)
      expect(store.month).toBe('2026-08')
      expect(store.figures?.totals.income).toBe('2600.26')
      expect(store.figures?.movementCount).toBe(71)
    })
  })

  it('only ever sends GET, and only to /api/movements (C1)', async () => {
    let isDown = true
    const api = mockBackend((read) =>
      isDown && isMonth(read, '2026-03') ? networkDown() : undefined,
    )
    const store = useOverviewStore()

    await store.show('2026-08')
    isDown = false
    await store.retryComparison()
    await store.show('2026-09')
    await store.show('2026-10')
    await store.retry()
    await store.refreshIfLoaded()

    expect(api.calls.length).toBeGreaterThan(15)
    expect(api.methods()).toEqual(['GET'])
    expect(api.paths()).toEqual(['/api/movements'])
    for (const [, init] of api.spy.mock.calls) {
      expect(init?.body).toBeUndefined()
    }
  })
})
