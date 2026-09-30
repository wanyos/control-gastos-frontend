import { test, expect } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

// Marking movements as not counted from the statement (feature 22) in a real browser,
// without a backend: every /api call is answered with page.route. This suite writes in
// BULK, so the safety net matters more than in any previous one — it aborts anything
// not foreseen, so no PATCH ever reaches the real backend on :3000 and no real movement
// is taken out of anybody's figures by this suite.

/** Feature 23: the note was rewritten whole and no longer carries a single digit. */
const NOTE_START = 'These figures already leave out what does not count'

const BANKINTER = {
  id: 1,
  iban: 'ES9820385778983000760236',
  bank: 'bankinter',
  alias: 'bankinter ···0236',
  type: 'checking',
}

const FOOD = { id: 1, name: 'Food', kind: 'expense', parentId: null }

interface Row extends Record<string, unknown> {
  id: number
  type: string
  amount: string
  excludedFromTotals: boolean
}

const movement = (id: number, day: string, extra: Record<string, unknown> = {}): Row =>
  ({
    id,
    type: 'expense',
    bookingDate: day,
    valueDate: day,
    amount: '10.00',
    description: `COMPRA ${id}`,
    balanceAfter: null,
    currency: 'EUR',
    note: null,
    accountId: 1,
    account: BANKINTER,
    categoryId: 1,
    category: FOOD,
    paymentMethod: null,
    origin: 'imported',
    status: 'confirmed',
    excludedFromTotals: false,
    transferId: null,
    daySequence: 1,
    createdAt: '2026-09-12T18:30:00.000Z',
    updatedAt: '2026-09-12T18:30:00.000Z',
    ...extra,
  }) as Row

const ZERO = { income: '0.00', expense: '0.00', net: '0.00' }

/** The month the screen opens on, whatever day the suite runs. */
const currentMonth = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const COUNT_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 1, total: 7, totalPages: 7 },
  totals: ZERO,
}

const NET_WORTH_SAMPLE = {
  asOf: '2026-09-12',
  total: '1500.00',
  accounts: {
    total: '1500.00',
    accounts: [
      { id: 1, iban: 'ES00', bank: 'n26', alias: 'Main', type: 'checking', balance: '1500.00' },
    ],
  },
  investments: { total: '0.00', products: [], issues: [] },
}

const ACCOUNTS = [{ ...BANKINTER, balance: '9954.63' }]

const CATEGORIES = [
  {
    id: 1,
    name: 'Food',
    kind: 'expense',
    parentId: null,
    createdAt: '2026-08-06T18:30:00.000Z',
    children: [],
  },
]

interface Options {
  /** The status the bulk PATCH answers with instead of the changed movements. */
  rejectWith?: 400 | 404
}

/**
 * A small stateful fake of one month: the bulk PATCH really writes the mark on its rows
 * and the GET recomputes the three figures FROM THE SERVER SIDE, so a client that did
 * its own arithmetic would show something different (C3).
 */
async function prepare(page: Page, options: Options = {}) {
  const month = currentMonth()
  const rows: Row[] = Array.from({ length: 24 }, (_item, index) =>
    movement(100 + index, `${month}-1${index % 2}`),
  )

  const watch = {
    requests: [] as Request[],
    consoleErrors: [] as string[],
    pageErrors: [] as Error[],
    /** Every PATCH body, exactly as it travelled. */
    writes: [] as string[],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) watch.requests.push(request)
  })

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  // Without it a PATCH would reach the real backend and change real data.
  await page.route('**/api/**', (route) => route.abort())
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/net-worth', (route) => route.fulfill({ json: NET_WORTH_SAMPLE }))
  await page.route('**/api/accounts', (route) => route.fulfill({ json: ACCOUNTS }))
  // Feature 23: the permanent note asks for this once per session; without the route
  // the safety net would abort it and Chromium would log the failure as an error.
  await page.route('**/api/transfers/ambiguous', (route) =>
    route.fulfill({ json: { ambiguousCount: 0, ambiguous: [] } }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: CATEGORIES }))

  await page.route('**/api/movements*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname !== '/api/movements') return route.abort()

    if (request.method() === 'PATCH') {
      watch.writes.push(request.postData() ?? '')
      if (options.rejectWith === 400) {
        return route.fulfill({
          status: 400,
          json: {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: 'La propiedad «excludedFromTotals» debe ser un booleano',
          },
        })
      }
      if (options.rejectWith === 404) {
        return route.fulfill({
          status: 404,
          json: { statusCode: 404, code: 'NOT_FOUND', message: 'No existe el movimiento 104' },
        })
      }
      const body = JSON.parse(request.postData() ?? '{}') as {
        ids: number[]
        excludedFromTotals: boolean
      }
      const changed = body.ids.flatMap((id) => {
        const row = rows.find((one) => one.id === id)
        if (!row) return []
        row.excludedFromTotals = body.excludedFromTotals
        return [{ ...row }]
      })
      return route.fulfill({ json: { updated: changed.length, movements: changed } })
    }

    const query = url.searchParams
    if (query.get('pageSize') === '1') return route.fulfill({ json: COUNT_PAGE })
    // Any month but the current one is empty, so the arrows are visibly a new context.
    if ((query.get('from') ?? '').slice(0, 7) !== month) {
      return route.fulfill({
        json: {
          movements: [],
          pagination: { page: 1, pageSize: 200, total: 0, totalPages: 0 },
          totals: ZERO,
        },
      })
    }
    const expense = rows
      .filter((row) => !row.excludedFromTotals)
      .reduce((sum, row) => sum + Number(row.amount), 0)
    return route.fulfill({
      json: {
        movements: rows.map((row) => ({ ...row })),
        pagination: { page: 1, pageSize: 200, total: rows.length, totalPages: 1 },
        totals: { income: '0.00', expense: expense.toFixed(2), net: (-expense).toFixed(2) },
      },
    })
  })

  return watch
}

/** The reads of the month itself, so a test can count them (R12). */
const monthReads = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.requests
    .map((request) => ({ url: new URL(request.url()), method: request.method() }))
    .filter(
      (call) =>
        call.method === 'GET' &&
        call.url.pathname === '/api/movements' &&
        call.url.searchParams.get('pageSize') === '200',
    ).length

test.use({ testIdAttribute: 'data-test' })

const tick = async (page: Page, index: number) => {
  await page.getByTestId('statement-row').nth(index).getByTestId('statement-row-select').click()
}

test('the checkboxes only show up when they are asked for', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals')).toBeVisible()
  await expect(page.getByTestId('statement-row')).toHaveCount(24)

  // Off: no checkbox, and the category badge is a button (R4).
  await expect(page.getByTestId('statement-row-select')).toHaveCount(0)
  await expect(page.getByTestId('statement-row-category-button')).toHaveCount(24)
  await expect(page.getByTestId('statement-selection-bar')).toHaveCount(0)

  await page.getByTestId('statement-start-selecting').click()

  // On: one checkbox per row, a bar, and no pressable badge left (R5, R6).
  await expect(page.getByTestId('statement-row-select')).toHaveCount(24)
  await expect(page.getByTestId('statement-selected-count')).toHaveText('0 selected')
  await expect(page.getByTestId('statement-row-category-button')).toHaveCount(0)
  await expect(page.getByTestId('statement-row-category').first()).toHaveText('Food')

  await page.getByTestId('statement-selection-done').click()

  await expect(page.getByTestId('statement-row-select')).toHaveCount(0)
  await expect(page.getByTestId('statement-row-category-button')).toHaveCount(24)
  expect(watch.writes).toEqual([])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('marks three lines with one request and the figures come back changed', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals-out')).toContainText('240,00')
  expect(monthReads(watch)).toBe(1)

  await page.getByTestId('statement-start-selecting').click()
  await tick(page, 0)
  await tick(page, 1)
  await tick(page, 2)
  await expect(page.getByTestId('statement-selected-count')).toHaveText('3 selected')

  await page.getByTestId('statement-exclude').click()

  await expect(page.getByTestId('statement-row-excluded')).toHaveCount(3)
  await expect(page.getByTestId('statement-action-summary')).toContainText(
    '3 movements excluded from totals',
  )
  // Exactly one write, with exactly two properties in the body (R1, C1).
  expect(watch.writes).toEqual(['{"ids":[100,101,102],"excludedFromTotals":true}'])
  expect(Object.keys(JSON.parse(watch.writes[0] ?? '{}') as object)).toEqual([
    'ids',
    'excludedFromTotals',
  ])
  expect(watch.writes[0]).not.toContain('status')
  expect(watch.writes[0]).not.toContain('categoryId')
  // One quiet refresh of the month, and the figures are the backend's (R12, C3).
  await expect(page.getByTestId('statement-totals-out')).toContainText('210,00')
  expect(monthReads(watch)).toBe(2)
  // Nothing was hidden and the count still names every row (R9).
  await expect(page.getByTestId('statement-row')).toHaveCount(24)
  await expect(page.getByTestId('statement-totals-count')).toHaveText('24 movements')
  await expect(page.getByTestId('statement-selected-count')).toHaveText('0 selected')
  await expect(page.getByTestId('statement-totals-note')).toContainText(NOTE_START)
  const methods = [...new Set(watch.requests.map((request) => request.method()))].sort()
  expect(methods).toEqual(['GET', 'PATCH'])
  expect(watch.consoleErrors).toEqual([])
})

test('the Undo puts exactly those three back', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await page.getByTestId('statement-start-selecting').click()
  await tick(page, 0)
  await tick(page, 1)
  await tick(page, 2)
  await page.getByTestId('statement-exclude').click()
  await expect(page.getByTestId('statement-row-excluded')).toHaveCount(3)

  await page.getByTestId('statement-action-undo').click()

  await expect(page.getByTestId('statement-row-excluded')).toHaveCount(0)
  await expect(page.getByTestId('statement-action-summary')).toContainText(
    '3 movements back in totals',
  )
  await expect(page.getByTestId('statement-action-undo')).toHaveCount(0)
  expect(watch.writes).toEqual([
    '{"ids":[100,101,102],"excludedFromTotals":true}',
    '{"ids":[100,101,102],"excludedFromTotals":false}',
  ])
  await expect(page.getByTestId('statement-totals-out')).toContainText('240,00')
  expect(watch.consoleErrors).toEqual([])
})

test('a batch of 24 asks first, and Cancel sends nothing', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await page.getByTestId('statement-start-selecting').click()
  await page.getByTestId('statement-select-all').click()
  await expect(page.getByTestId('statement-selected-count')).toHaveText('24 selected')

  await page.getByTestId('statement-exclude').click()

  await expect(page.getByTestId('statement-exclude-confirm')).toContainText(
    'Exclude 24 movements from totals?',
  )
  expect(watch.writes).toEqual([])

  await page.getByTestId('statement-exclude-cancel').click()

  await expect(page.getByTestId('statement-exclude-confirm')).toHaveCount(0)
  expect(watch.writes).toEqual([])
  await expect(page.getByTestId('statement-row-excluded')).toHaveCount(0)
  // The selection is untouched: the question was cancelled, not the batch.
  await expect(page.getByTestId('statement-selected-count')).toHaveText('24 selected')
  expect(watch.consoleErrors).toEqual([])
})

test('a 404 reloads the month and says it in English; a 400 does not reload', async ({ page }) => {
  const notFound = await prepare(page, { rejectWith: 404 })

  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals')).toBeVisible()
  expect(monthReads(notFound)).toBe(1)
  await page.getByTestId('statement-start-selecting').click()
  await tick(page, 0)

  await page.getByTestId('statement-exclude').click()

  await expect(page.getByTestId('statement-action-error')).toHaveText(
    'Nothing changed: one of those movements no longer exists. Reloading the month.',
  )
  // The backend's own sentence comes in Spanish and names ids: never painted (R15).
  await expect(page.getByTestId('statement-view')).not.toContainText('No existe el movimiento')
  expect(monthReads(notFound)).toBe(2)
  await expect(page.getByTestId('statement-row-excluded')).toHaveCount(0)

  const rejected = await prepare(page, { rejectWith: 400 })
  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals')).toBeVisible()
  expect(monthReads(rejected)).toBe(1)
  await page.getByTestId('statement-start-selecting').click()
  await tick(page, 0)

  await page.getByTestId('statement-exclude').click()

  await expect(page.getByTestId('statement-action-error')).toHaveText(
    'Nothing changed. The server rejected that change.',
  )
  await expect(page.getByTestId('statement-view')).not.toContainText('booleano')
  // A 400 is sure nothing was written: the month is NOT reloaded (R16).
  expect(monthReads(rejected)).toBe(1)
  expect(rejected.pageErrors).toEqual([])
})

test('changing month empties the selection and keeps the mode on', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await page.getByTestId('statement-start-selecting').click()
  await page.getByTestId('statement-select-all').click()
  await expect(page.getByTestId('statement-selected-count')).toHaveText('24 selected')

  await page.getByTestId('statement-prev').click()

  await expect(page.getByTestId('statement-selected-count')).toHaveText('0 selected')
  await expect(page.getByTestId('statement-selection-bar')).toHaveCount(1)
  await expect(page.getByTestId('statement-empty')).toBeVisible()

  await page.getByTestId('statement-next').click()

  await expect(page.getByTestId('statement-selected-count')).toHaveText('0 selected')
  expect(watch.writes).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})
