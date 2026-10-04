import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { shownMonths } from '../previousMonths'
import { useOverviewStore } from '../store'
import {
  LATEST,
  PERIOD,
  SERVER_ERROR_BODY,
  deferred,
  figuresOf,
  json,
  jsonResponse,
  mockBackend,
  networkDown,
  rawPage,
  rawPeriodPage,
} from './fixtures'
import type { ApiCall, Read } from './fixtures'

// What the store adds for the months below the month (feature 26): the 24 months, the
// sum of the complete ones, and one request per month in a visit, whoever asks.

const MONTHS = shownMonths(LATEST)

const isMonth = (read: Read, month: string): boolean =>
  read.kind === 'month' && read.month === month

/** `month 2025-01`, `period 2024-10`, `latest `…: what each call asked for. */
const asked = (calls: readonly ApiCall[], from = 0): string[] =>
  calls.slice(from).map((call) => `${call.read.kind} ${call.read.month}`.trim())

/** Figures made up for a month the fixture has as empty, as the backend would send them. */
const LATE_JANUARY = { income: '1843.27', expense: '2391.60', net: '-548.33' }
const lateJanuaryPage = (): Record<string, unknown> => rawPage(LATE_JANUARY, 37, '2025-01-14')

describe('useOverviewStore: the months below the month', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with nothing read and no rows', () => {
    const store = useOverviewStore()

    expect(store.previousLoad).toBe('idle')
    expect(store.periodLoad).toBe('idle')
    expect(store.period).toBeNull()
    expect(store.previousMonths).toEqual([])
    expect(store.monthRows).toBeNull()
  })

  describe('one request per month in a visit (R15)', () => {
    it('asks for each month once in a visit, whoever asks', async () => {
      const api = mockBackend()
      const store = useOverviewStore()

      await Promise.all([store.show('2026-08'), store.loadPreviousMonths()])

      expect(api.calls).toHaveLength(27)
      expect(api.count('latest')).toBe(1)
      expect(api.count('uncategorized')).toBe(1)
      expect(api.count('period')).toBe(1)
      // 24 month reads and 24 different months: none was asked for twice.
      expect(api.months()).toHaveLength(24)
      expect([...new Set(api.months())].sort()).toEqual([...MONTHS].sort())
      expect(store.previousLoad).toBe('ready')
      expect(store.monthRows).toHaveLength(24)
      expect(store.monthRows?.map((row) => row.month)).toEqual(MONTHS)
      expect(store.comparison?.months).toBe(12)

      const before = api.calls.length
      await store.show('2026-07')

      expect(asked(api.calls, before)).toEqual(['uncategorized 2026-07'])
      expect(store.comparison?.months).toBe(12)
      expect(store.monthRows).toHaveLength(24)
    })

    it('is the same when the months below are asked for first', async () => {
      const api = mockBackend()
      const store = useOverviewStore()

      await Promise.all([store.loadPreviousMonths(), store.show('2026-08')])

      expect(api.calls).toHaveLength(27)
      expect(api.count('latest')).toBe(1)
      expect(api.months()).toHaveLength(24)
      expect(new Set(api.months()).size).toBe(24)
      expect(store.core).toBe('ready')
      expect(store.comparisonLoad).toBe('ready')
    })

    it.each([
      ['an incomplete month', '2026-09'],
      ['an empty month', '2026-10'],
    ])('with %s above it is 27 requests too', async (_name, above) => {
      const api = mockBackend()
      const store = useOverviewStore()

      await Promise.all([store.show(above), store.loadPreviousMonths()])

      expect(api.calls).toHaveLength(27)
      expect(api.count('latest')).toBe(1)
      expect(api.count('period')).toBe(1)
      expect(new Set(api.months()).size).toBe(api.months().length)
      expect(store.monthRows).toHaveLength(24)
    })

    it('on its own it reads the last date, the 24 months and the period', async () => {
      const api = mockBackend()
      const store = useOverviewStore()

      await store.loadPreviousMonths()

      expect(api.calls).toHaveLength(26)
      expect(asked(api.calls).filter((call) => !call.startsWith('month'))).toEqual([
        'latest',
        'period 2024-10',
      ])
      expect(api.count('uncategorized')).toBe(0)
      expect(store.core).toBe('idle')
    })

    it('a second call while the first is on its way asks for nothing', async () => {
      const api = mockBackend()
      const store = useOverviewStore()

      await Promise.all([store.loadPreviousMonths(), store.loadPreviousMonths()])

      expect(api.calls).toHaveLength(26)
    })

    it('called again with everything read asks for nothing', async () => {
      const api = mockBackend()
      const store = useOverviewStore()
      await store.loadPreviousMonths()

      await store.loadPreviousMonths()

      expect(api.calls).toHaveLength(26)
      expect(store.previousLoad).toBe('ready')
      expect(store.periodLoad).toBe('ready')
    })
  })

  describe('what it leaves read (R1, R11)', () => {
    it('the 24 months, the rows and the sums of the backend', async () => {
      mockBackend()
      const store = useOverviewStore()

      await Promise.all([store.show('2026-08'), store.loadPreviousMonths()])

      expect(store.previousMonths).toEqual(MONTHS)
      expect(store.previousMonths[0]).toBe('2026-09')
      expect(store.previousMonths.at(-1)).toBe('2024-10')
      expect(store.period).toEqual(PERIOD)
      expect(store.periodLoad).toBe('ready')
      expect(store.monthRows?.filter((row) => row.isShown).map((row) => row.month)).toEqual([
        '2026-08',
      ])
      expect(store.monthRows?.[0]?.state).toBe('incomplete')
      expect(store.monthRows?.at(-1)?.state).toBe('empty')
    })

    it('a row carries the very figures the month has when it is above', async () => {
      mockBackend()
      const store = useOverviewStore()

      await Promise.all([store.show('2026-08'), store.loadPreviousMonths()])

      const row = store.monthRows?.find((candidate) => candidate.month === '2026-08')
      expect(row?.totals).toEqual(figuresOf('2026-08').totals)
      expect(row?.totals).toBe(store.figures?.totals)
    })

    it('changing the month above moves the mark, not the rows', async () => {
      mockBackend()
      const store = useOverviewStore()
      await Promise.all([store.show('2026-08'), store.loadPreviousMonths()])

      await store.show('2026-01')

      expect(store.monthRows?.map((row) => row.month)).toEqual(MONTHS)
      expect(store.monthRows?.filter((row) => row.isShown).map((row) => row.month)).toEqual([
        '2026-01',
      ])

      await store.show('2024-03')

      expect(store.monthRows?.some((row) => row.isShown)).toBe(false)
      expect(store.monthRows).toHaveLength(24)
    })
  })

  describe('failures (R13, R14)', () => {
    it('one failed month is an error with no rows, and the second call asks only for it', async () => {
      let isDown = true
      const api = mockBackend((read) =>
        isDown && isMonth(read, '2025-11') ? networkDown() : undefined,
      )
      const store = useOverviewStore()

      await store.loadPreviousMonths()

      expect(store.previousLoad).toBe('error')
      expect(store.monthRows).toBeNull()
      // The 23 that did arrive stay, and so does the sum.
      expect(Object.keys(store.figuresByMonth)).toHaveLength(23)
      expect(store.periodLoad).toBe('ready')

      isDown = false
      const before = api.calls.length
      await store.loadPreviousMonths()

      expect(asked(api.calls, before)).toEqual(['month 2025-11'])
      expect(store.previousLoad).toBe('ready')
      expect(store.monthRows).toHaveLength(24)
    })

    it('a failed read of the last date is an error, and nothing else is asked for', async () => {
      let isDown = true
      const api = mockBackend((read) =>
        isDown && read.kind === 'latest' ? json(SERVER_ERROR_BODY, 500)() : undefined,
      )
      const store = useOverviewStore()

      await store.loadPreviousMonths()

      expect(store.previousLoad).toBe('error')
      expect(store.monthRows).toBeNull()
      expect(store.periodLoad).toBe('idle')
      expect(asked(api.calls)).toEqual(['latest'])

      isDown = false
      await store.loadPreviousMonths()

      expect(api.calls).toHaveLength(27)
      expect(store.previousLoad).toBe('ready')
      expect(store.monthRows).toHaveLength(24)
      expect(store.period).toEqual(PERIOD)
    })

    it('a failed period leaves the rows, and the second call asks only for it', async () => {
      let isDown = true
      const retried = deferred()
      const api = mockBackend((read) => {
        if (read.kind !== 'period') return undefined
        return isDown ? json(SERVER_ERROR_BODY, 500)() : retried.answer()
      })
      const store = useOverviewStore()

      await store.loadPreviousMonths()

      expect(store.previousLoad).toBe('ready')
      expect(store.monthRows).toHaveLength(24)
      expect(store.periodLoad).toBe('error')
      expect(store.period).toBeNull()

      isDown = false
      const before = api.calls.length
      const retrying = store.loadPreviousMonths()
      await vi.waitFor(() => expect(api.calls).toHaveLength(before + 1))

      // While the sum is on its way again the rows are still there.
      expect(store.periodLoad).toBe('loading')
      expect(store.previousLoad).toBe('ready')
      expect(store.monthRows).toHaveLength(24)

      retried.resolve(jsonResponse(rawPeriodPage()))
      await retrying

      expect(asked(api.calls, before)).toEqual(['period 2024-10'])
      expect(store.periodLoad).toBe('ready')
      expect(store.period).toEqual(PERIOD)
    })

    it('a failure below does not touch the month above', async () => {
      mockBackend((read) =>
        isMonth(read, '2025-01') || read.kind === 'period' ? networkDown() : undefined,
      )
      const store = useOverviewStore()

      await Promise.all([store.show('2026-08'), store.loadPreviousMonths()])

      expect(store.previousLoad).toBe('error')
      expect(store.periodLoad).toBe('error')
      expect(store.core).toBe('ready')
      expect(store.comparison?.months).toBe(12)
      expect(store.uncategorizedLoad).toBe('ready')
    })
  })

  it('a base with no movements is ready, with no rows and no month or period asked for', async () => {
    const api = mockBackend(() => undefined, null)
    const store = useOverviewStore()

    await store.loadPreviousMonths()

    expect(asked(api.calls)).toEqual(['latest'])
    expect(store.previousLoad).toBe('ready')
    expect(store.previousMonths).toEqual([])
    expect(store.monthRows).toEqual([])
    expect(store.period).toBeNull()
    expect(store.periodLoad).toBe('idle')
  })

  describe('one visit (C4)', () => {
    it('reset empties it', async () => {
      mockBackend()
      const store = useOverviewStore()
      await store.loadPreviousMonths()

      store.reset()

      expect(store.previousLoad).toBe('idle')
      expect(store.periodLoad).toBe('idle')
      expect(store.period).toBeNull()
      expect(store.previousMonths).toEqual([])
      expect(store.monthRows).toBeNull()
      expect(store.figuresByMonth).toEqual({})
    })

    it('answers that started before the reset are not kept', async () => {
      const january = deferred()
      const sum = deferred()
      const api = mockBackend((read) => {
        if (isMonth(read, '2025-01')) return january.answer()
        return read.kind === 'period' ? sum.answer() : undefined
      })
      const store = useOverviewStore()

      const loading = store.loadPreviousMonths()
      await vi.waitFor(() => expect(api.count('period')).toBe(1))
      store.reset()
      january.resolve(jsonResponse(lateJanuaryPage()))
      sum.resolve(jsonResponse(rawPeriodPage()))
      await loading

      expect(store.figuresByMonth).toEqual({})
      expect(store.period).toBeNull()
      expect(store.previousLoad).toBe('idle')
      expect(store.periodLoad).toBe('idle')
    })

    it('a last date that arrives after the reset is not kept, and asks for nothing else', async () => {
      const newest = deferred()
      const api = mockBackend((read) => (read.kind === 'latest' ? newest.answer() : undefined))
      const store = useOverviewStore()

      const loading = store.loadPreviousMonths()
      store.reset()
      newest.resolve(jsonResponse(rawPage({ income: '0.00', expense: '0.00', net: '0.00' }, 0)))
      await loading

      expect(asked(api.calls)).toEqual(['latest'])
      expect(store.latest).toBeNull()
      expect(store.previousLoad).toBe('idle')
    })

    it('a read still on its way from the visit before is not shared with the new one', async () => {
      let isHeld = true
      const january = deferred()
      const api = mockBackend((read) =>
        isHeld && isMonth(read, '2025-01') ? january.answer() : undefined,
      )
      const store = useOverviewStore()

      const first = store.loadPreviousMonths()
      await vi.waitFor(() => expect(api.count('period')).toBe(1))
      store.reset()
      isHeld = false
      await store.loadPreviousMonths()

      expect(api.months().filter((month) => month === '2025-01')).toHaveLength(2)
      expect(store.monthRows).toHaveLength(24)

      january.resolve(jsonResponse(lateJanuaryPage()))
      await first

      expect(store.figuresByMonth['2025-01']).toEqual(figuresOf('2025-01'))
      expect(store.previousLoad).toBe('ready')
    })

    it('refreshIfLoaded reads the months below again when they had been read', async () => {
      let isImported = false
      const api = mockBackend((read) =>
        isImported && isMonth(read, '2025-01') ? json(lateJanuaryPage())() : undefined,
      )
      const store = useOverviewStore()
      await Promise.all([store.show('2026-08'), store.loadPreviousMonths()])
      expect(api.calls).toHaveLength(27)
      expect(store.monthRows?.find((row) => row.month === '2025-01')?.state).toBe('empty')

      isImported = true
      await store.refreshIfLoaded()

      expect(api.calls).toHaveLength(54)
      expect(api.count('period')).toBe(2)
      expect(store.month).toBe('2026-08')
      expect(store.core).toBe('ready')
      expect(store.previousLoad).toBe('ready')
      expect(store.periodLoad).toBe('ready')
      const january = store.monthRows?.find((row) => row.month === '2025-01')
      expect(january?.state).toBe('complete')
      expect(january?.totals).toEqual(LATE_JANUARY)
    })

    it('refreshIfLoaded does not read the months below when they had not been read', async () => {
      const api = mockBackend()
      const store = useOverviewStore()
      await store.show('2026-08')

      await store.refreshIfLoaded()

      expect(api.calls).toHaveLength(30)
      expect(api.count('period')).toBe(0)
      expect(store.previousLoad).toBe('idle')
      expect(store.monthRows).toBeNull()
    })

    it('refreshIfLoaded reads only the months below when only they had been read', async () => {
      const api = mockBackend()
      const store = useOverviewStore()
      await store.loadPreviousMonths()

      await store.refreshIfLoaded()

      expect(api.calls).toHaveLength(52)
      expect(api.count('uncategorized')).toBe(0)
      expect(store.core).toBe('idle')
      expect(store.previousLoad).toBe('ready')
    })

    it('refreshIfLoaded reads the months below again after they had failed', async () => {
      let isDown = true
      const api = mockBackend((read) =>
        isDown && isMonth(read, '2025-11') ? networkDown() : undefined,
      )
      const store = useOverviewStore()
      await store.loadPreviousMonths()
      expect(store.previousLoad).toBe('error')

      isDown = false
      const before = api.calls.length
      await store.refreshIfLoaded()

      expect(api.calls).toHaveLength(before + 26)
      expect(store.previousLoad).toBe('ready')
    })
  })

  it('only ever sends GET to /api/movements, with no body (C1)', async () => {
    let isDown = true
    const api = mockBackend((read) =>
      isDown && (isMonth(read, '2025-11') || read.kind === 'period') ? networkDown() : undefined,
    )
    const store = useOverviewStore()

    await Promise.all([store.show('2026-08'), store.loadPreviousMonths()])
    isDown = false
    await store.loadPreviousMonths()
    await store.show('2026-01')
    await store.refreshIfLoaded()
    store.reset()
    await store.loadPreviousMonths()

    expect(api.calls.length).toBeGreaterThan(54)
    expect(api.methods()).toEqual(['GET'])
    expect(api.paths()).toEqual(['/api/movements'])
    for (const [, init] of api.spy.mock.calls) {
      expect(init?.body).toBeUndefined()
    }
  })
})
