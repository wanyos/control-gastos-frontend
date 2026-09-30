import { test, expect } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

// Correcting a category from the statement (feature 21) in a real browser, without a
// backend: every /api call is answered with page.route. This is the FIRST screen of the
// statement that writes, so the safety net matters more than ever — it aborts anything
// not foreseen, so no PATCH ever reaches the real backend on :3000 and no category of a
// real movement is touched by this suite.

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
const GROCERIES = { id: 3, name: 'Groceries', kind: 'expense', parentId: 1 }

const movement = (id: number, day: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: 'expense',
  bookingDate: day,
  valueDate: day,
  amount: '45.37',
  description: `COMPRA ${id}`,
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: 1,
  account: BANKINTER,
  categoryId: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'confirmed',
  // Since the backend's feature 49 every movement carries it, born false (feature 22).
  excludedFromTotals: false,
  transferId: null,
  daySequence: 1,
  createdAt: '2026-09-12T18:30:00.000Z',
  updatedAt: '2026-09-12T18:30:00.000Z',
  ...extra,
})

const ZERO = { income: '0.00', expense: '0.00', net: '0.00' }

/** The month the screen opens on, whatever day the suite runs. */
const currentMonth = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Two rows: one already categorized and confirmed, one still pending and without one. */
const monthPage = (month: string) => ({
  movements: [
    movement(10, `${month}-11`, { categoryId: 1, category: FOOD }),
    movement(11, `${month}-11`, { status: 'pending_review', description: 'COMPRA PENDIENTE' }),
  ],
  pagination: { page: 1, pageSize: 200, total: 93, totalPages: 1 },
  totals: { income: '57949.11', expense: '59096.42', net: '-1147.31' },
})

/** The same month seen through `uncategorized=true`: only the row without a category. */
const UNCATEGORIZED_PAGE = (month: string) => ({
  movements: [
    movement(11, `${month}-11`, { status: 'pending_review', description: 'COMPRA PENDIENTE' }),
    movement(12, `${month}-04`, { description: 'COMPRA 12' }),
  ],
  pagination: { page: 1, pageSize: 200, total: 2, totalPages: 1 },
  totals: { income: '0.00', expense: '90.74', net: '-90.74' },
})

/** The refreshed answer after one of those two got a category: one row fewer. */
const UNCATEGORIZED_AFTER = (month: string) => ({
  movements: [movement(12, `${month}-04`, { description: 'COMPRA 12' })],
  pagination: { page: 1, pageSize: 200, total: 1, totalPages: 1 },
  totals: { income: '0.00', expense: '45.37', net: '-45.37' },
})

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
    children: [{ ...GROCERIES, createdAt: '2026-08-06T18:31:00.000Z', children: [] }],
  },
  {
    id: 4,
    name: 'Salary',
    kind: 'income',
    parentId: null,
    createdAt: '2026-08-06T18:32:00.000Z',
    children: [],
  },
]

interface Options {
  /** A 400 of the contract instead of the updated movement. */
  rejectWrite?: boolean
}

async function prepare(page: Page, options: Options = {}) {
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

  let written = 0

  await page.route('**/api/movements/*', (route) => {
    const request = route.request()
    if (request.method() !== 'PATCH') return route.abort()
    watch.writes.push(request.postData() ?? '')
    written += 1
    if (options.rejectWrite) {
      return route.fulfill({
        status: 400,
        json: {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'El movimiento 11 es neutral y no admite categoría',
        },
      })
    }
    const id = Number(new URL(request.url()).pathname.split('/').at(-1))
    const body = JSON.parse(request.postData() ?? '{}') as { categoryId: number | null }
    const category =
      body.categoryId === null ? null : body.categoryId === 1 ? FOOD : { ...GROCERIES }
    const base =
      id === 10
        ? { categoryId: 1, category: FOOD, status: 'confirmed' }
        : { status: 'pending_review', description: 'COMPRA PENDIENTE' }
    return route.fulfill({
      json: movement(id, `${currentMonth()}-11`, {
        ...base,
        categoryId: body.categoryId,
        category,
      }),
    })
  })

  await page.route('**/api/movements*', (route) => {
    const query = new URL(route.request().url()).searchParams
    if (query.get('pageSize') === '1') return route.fulfill({ json: COUNT_PAGE })
    const month = (query.get('from') ?? '').slice(0, 7)
    if (query.get('uncategorized') === 'true') {
      return route.fulfill({
        json: written === 0 ? UNCATEGORIZED_PAGE(month) : UNCATEGORIZED_AFTER(month),
      })
    }
    return route.fulfill({ json: monthPage(month) })
  })

  return watch
}

/** The reads of the month itself, so a test can count them (R9). */
const monthReads = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.requests
    .map((request) => new URL(request.url()))
    .filter(
      (url) => url.pathname === '/api/movements' && url.searchParams.get('pageSize') === '200',
    ).length

test.use({ testIdAttribute: 'data-test' })

const rowCategory = (page: Page, index: number) =>
  page.getByTestId('statement-row').nth(index).getByTestId('statement-row-category')

test('changes the category of a line and does not ask for the figures again', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals')).toBeVisible()
  await expect(rowCategory(page, 0)).toHaveText('Food')
  expect(monthReads(watch)).toBe(1)

  // The badge is the control: no selector until it is pressed (R2, R3).
  await expect(page.getByTestId('row-category-editor')).toHaveCount(0)
  await page
    .getByTestId('statement-row')
    .nth(0)
    .getByTestId('statement-row-category-button')
    .click()
  await expect(page.getByTestId('row-category-editor')).toHaveCount(1)

  await page.getByTestId('row-category-select').locator('select').selectOption('3')

  await expect(rowCategory(page, 0)).toHaveText('Groceries')
  await expect(page.getByTestId('statement-action-summary')).toContainText(
    'Categorized as Groceries',
  )
  await expect(page.getByTestId('row-category-editor')).toHaveCount(0)
  // Exactly one write, and the figures were NOT asked for again (R9).
  expect(watch.writes).toEqual(['{"categoryId":3}'])
  expect(monthReads(watch)).toBe(1)
  await expect(page.getByTestId('statement-totals-out')).toContainText('59.096,42')
  await expect(page.getByTestId('statement-totals-note')).toContainText(NOTE_START)
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('the body of a write never carries a status, on a confirmed movement either', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals')).toBeVisible()

  // Row 0 is confirmed, row 1 is pending: the very same gesture on both (R6).
  await page
    .getByTestId('statement-row')
    .nth(0)
    .getByTestId('statement-row-category-button')
    .click()
  await page.getByTestId('row-category-select').locator('select').selectOption('3')
  await expect(rowCategory(page, 0)).toHaveText('Groceries')

  await page
    .getByTestId('statement-row')
    .nth(1)
    .getByTestId('statement-row-category-button')
    .click()
  await page.getByTestId('row-category-select').locator('select').selectOption('1')
  await expect(rowCategory(page, 1)).toHaveText('Food')

  expect(watch.writes).toEqual(['{"categoryId":3}', '{"categoryId":1}'])
  for (const body of watch.writes) {
    expect(body).not.toContain('status')
    expect(Object.keys(JSON.parse(body) as object)).toEqual(['categoryId'])
  }
  const methods = [...new Set(watch.requests.map((request) => request.method()))].sort()
  expect(methods).toEqual(['GET', 'PATCH'])
  expect(watch.consoleErrors).toEqual([])
})

test('with the uncategorized filter on, the line goes and the figures come again', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/movements?uncategorized=true')
  await expect(page.getByTestId('statement-row')).toHaveCount(2)
  await expect(page.getByTestId('statement-totals-count')).toHaveText('2 movements')
  expect(monthReads(watch)).toBe(1)

  await page
    .getByTestId('statement-row')
    .nth(0)
    .getByTestId('statement-row-category-button')
    .click()
  await page.getByTestId('row-category-select').locator('select').selectOption('3')

  await expect(page.getByTestId('statement-row')).toHaveCount(1)
  await expect(page.getByTestId('statement-row-description').first()).toHaveText('COMPRA 12')
  // The figures and the count are the backend's new ones (R9, R10).
  await expect(page.getByTestId('statement-totals-count')).toHaveText('1 movement')
  await expect(page.getByTestId('statement-totals-out')).toContainText('45,37')
  expect(monthReads(watch)).toBe(2)
  expect(watch.writes).toEqual(['{"categoryId":3}'])
  expect(watch.consoleErrors).toEqual([])
})

test('undoes the last change with one write of the previous category', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await expect(rowCategory(page, 0)).toHaveText('Food')

  await page
    .getByTestId('statement-row')
    .nth(0)
    .getByTestId('statement-row-category-button')
    .click()
  await page.getByTestId('row-category-select').locator('select').selectOption('3')
  await expect(rowCategory(page, 0)).toHaveText('Groceries')

  await page.getByTestId('statement-action-undo').click()

  await expect(rowCategory(page, 0)).toHaveText('Food')
  await expect(page.getByTestId('statement-action-summary')).toContainText('Change undone')
  await expect(page.getByTestId('statement-action-undo')).toHaveCount(0)
  expect(watch.writes).toEqual(['{"categoryId":3}', '{"categoryId":1}'])
  expect(watch.consoleErrors).toEqual([])
})

test('a rejected write says it in English and leaves the month alone', async ({ page }) => {
  const watch = await prepare(page, { rejectWrite: true })

  await page.goto('/movements')
  await expect(rowCategory(page, 0)).toHaveText('Food')
  expect(monthReads(watch)).toBe(1)

  await page
    .getByTestId('statement-row')
    .nth(0)
    .getByTestId('statement-row-category-button')
    .click()
  await page.getByTestId('row-category-select').locator('select').selectOption('3')

  await expect(page.getByTestId('statement-action-error')).toHaveText(
    "Nothing changed. That movement doesn't accept that category.",
  )
  // The backend's own sentence comes in Spanish and is never painted (R14).
  await expect(page.getByTestId('statement-view')).not.toContainText('neutral y no admite')
  await expect(page.getByTestId('row-category-select').locator('select')).toHaveValue('1')
  await expect(page.getByTestId('statement-action-summary')).toHaveCount(0)
  // A 400 is sure nothing was written: the month is NOT reloaded (R15).
  expect(monthReads(watch)).toBe(1)
  expect(watch.writes).toEqual(['{"categoryId":3}'])
  expect(watch.pageErrors).toEqual([])
})
