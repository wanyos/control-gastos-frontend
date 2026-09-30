import { test, expect } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

// The noise switch (feature 23) in a real browser, without a backend: every /api call
// is answered with page.route. This feature is READ ONLY — the switch changes the
// question, never the data — and the safety net below aborts anything it did not
// foresee, so nothing ever reaches the real backend on :3000 and no write can leak out.
// Every test ends asserting that the only method of the whole session was GET.

/** The fixed note, whose first words never change and which carries no digit (R14). */
const NOTE_START = 'These figures already leave out what does not count'

const BANKINTER = {
  id: 1,
  iban: 'ES9820385778983000760236',
  bank: 'bankinter',
  alias: 'bankinter ···0236',
  type: 'checking',
}

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

const previousMonth = (month: string): string => {
  const [year = '2026', index = '01'] = month.split('-')
  return Number(index) === 1
    ? `${Number(year) - 1}-12`
    : `${year}-${String(Number(index) - 1).padStart(2, '0')}`
}

/**
 * The same three figures whatever the switch does: the backend leaves the transfer
 * legs and the marked movements out of the totals ALWAYS (design §1). What changes is
 * which rows come back, and that is the whole point of the feature.
 */
const FIGURES = { income: '1200.00', expense: '45.37', net: '1154.63' }

/** Five rows: one paired transfer leg, one marked as not counted, three plain ones. */
const rows = (month: string) => [
  movement(10, `${month}-11`, { transferId: 'tr_1', description: 'TRASPASO A MYINVESTOR' }),
  movement(11, `${month}-11`, { excludedFromTotals: true, description: 'DEPOSITO' }),
  movement(12, `${month}-11`),
  movement(13, `${month}-04`, { type: 'income', amount: '1200.00', description: 'NOMINA' }),
  movement(14, `${month}-04`),
]

const visible = (month: string, hidden: boolean) =>
  rows(month).filter(
    (row) => !hidden || (row.excludedFromTotals !== true && row.transferId === null),
  )

const monthPage = (month: string, hidden: boolean) => {
  const movements = visible(month, hidden)
  return {
    movements,
    pagination: { page: 1, pageSize: 200, total: movements.length, totalPages: 1 },
    totals: FIGURES,
  }
}

const EMPTY_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 200, total: 0, totalPages: 0 },
  totals: ZERO,
}

/** The sidebar's pending count: the same endpoint, `pageSize=1` and a status. */
const SIDEBAR_COUNT = {
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

const ACCOUNTS = [
  { ...BANKINTER, initialBalance: '0.00', balance: '9954.63' },
  {
    id: 2,
    iban: 'ES6301289999990123456789',
    bank: 'myinvestor',
    alias: 'myinvestor ···6789',
    type: 'checking',
    balance: '3206.28',
  },
]

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

async function prepare(page: Page, ambiguousCount = 2) {
  const watch = {
    requests: [] as Request[],
    consoleErrors: [] as string[],
    pageErrors: [] as Error[],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) watch.requests.push(request)
  })

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  await page.route('**/api/**', (route) => route.abort())
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/net-worth', (route) => route.fulfill({ json: NET_WORTH_SAMPLE }))
  await page.route('**/api/accounts', (route) => route.fulfill({ json: ACCOUNTS }))
  await page.route('**/api/categories', (route) => route.fulfill({ json: CATEGORIES }))
  await page.route('**/api/transfers/ambiguous', (route) =>
    route.fulfill({
      json: {
        ambiguousCount,
        ambiguous: Array.from({ length: ambiguousCount }, () => ({
          amount: '500.00',
          movements: [],
        })),
      },
    }),
  )
  await page.route('**/api/movements*', (route) => {
    const query = new URL(route.request().url()).searchParams
    const month = (query.get('from') ?? '').slice(0, 7)
    const hidden = query.get('excluded') === 'none' && query.get('transfer') === 'none'
    // The sidebar's own count asks with a status; the switch's count asks without one.
    if (query.get('pageSize') === '1' && query.get('status') !== null) {
      return route.fulfill({ json: SIDEBAR_COUNT })
    }
    if (query.get('q') !== null) {
      // The search only matches the transfer leg, so with the switch on nothing is left.
      return route.fulfill({
        json: hidden
          ? EMPTY_PAGE
          : {
              movements: [rows(month)[0]],
              pagination: { page: 1, pageSize: 200, total: 1, totalPages: 1 },
              totals: ZERO,
            },
      })
    }
    const monthAnswer = monthPage(month, hidden)
    if (query.get('pageSize') === '1') {
      // The count read: the whole month, one row asked for (R7).
      return route.fulfill({
        json: {
          ...monthAnswer,
          movements: monthAnswer.movements.slice(0, 1),
          pagination: { ...monthAnswer.pagination, pageSize: 1 },
        },
      })
    }
    return route.fulfill({ json: monthAnswer })
  })

  return watch
}

const monthQueries = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.requests
    .map((request) => new URL(request.url()))
    .filter(
      (url) => url.pathname === '/api/movements' && url.searchParams.get('pageSize') === '200',
    )
    .map((url) => url.search)

const onlyGet = (watch: Awaited<ReturnType<typeof prepare>>) => [
  ...new Set(watch.requests.map((request) => request.method())),
]

test.use({ testIdAttribute: 'data-test' })

test('turning it on hides the noise, says how many, and moves no figure', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/movements')

  // Off at the door: the five rows and no scope in the request (R1).
  await expect(page.getByTestId('statement-row')).toHaveCount(5)
  await expect(page.getByTestId('statement-hidden-count')).toHaveCount(0)
  expect(monthQueries(watch)[0]).not.toContain('excluded')
  const before = await page.getByTestId('statement-totals-in').textContent()

  await page.getByTestId('statement-noise-switch').locator('input').check()

  await expect(page).toHaveURL(/hide=true/)
  await expect(page.getByTestId('statement-row')).toHaveCount(3)
  await expect(page.getByTestId('statement-row-transfer')).toHaveCount(0)
  // A count, never an amount (R7, R8).
  await expect(page.getByTestId('statement-hidden-count')).toHaveText('Hiding 2 movements')
  await expect(page.getByTestId('statement-hidden-count')).not.toContainText('€')
  // The three figures did not move: they never included what was hidden (R6, design §1).
  await expect(page.getByTestId('statement-totals-in')).toHaveText(before ?? '')
  expect(monthQueries(watch).at(-1)).toContain('excluded=none&transfer=none')

  await page.getByTestId('statement-noise-switch').locator('input').uncheck()

  await expect(page.getByTestId('statement-row')).toHaveCount(5)
  await expect(page).not.toHaveURL(/hide=/)
  await expect(page.getByTestId('statement-hidden-count')).toHaveCount(0)

  expect(onlyGet(watch)).toEqual(['GET'])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('it lives in the URL: a reload and a month change keep it on', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto(`/movements?month=${currentMonth()}&hide=true`)

  await expect(page.getByTestId('statement-noise-switch').locator('input')).toBeChecked()
  await expect(page.getByTestId('statement-row')).toHaveCount(3)

  await page.getByTestId('statement-prev').click()

  const previous = previousMonth(currentMonth())
  await expect(page).toHaveURL(new RegExp(`month=${previous}`))
  await expect(page).toHaveURL(/hide=true/)
  await expect(page.getByTestId('statement-noise-switch').locator('input')).toBeChecked()

  await page.reload()

  await expect(page.getByTestId('statement-noise-switch').locator('input')).toBeChecked()
  await expect(page.getByTestId('statement-row')).toHaveCount(3)
  expect(onlyGet(watch)).toEqual(['GET'])
  expect(watch.consoleErrors).toEqual([])
})

test('a search that only matches hidden rows names both causes and gives the way back', async ({
  page,
}) => {
  const watch = await prepare(page)
  await page.goto(`/movements?month=${currentMonth()}&hide=true`)
  await expect(page.getByTestId('statement-row')).toHaveCount(3)

  await page.getByTestId('statement-search').locator('input').fill('TRASPASO')

  await expect(page.getByTestId('statement-nothing-left')).toBeVisible()
  await expect(page.getByTestId('statement-nothing-left')).toContainText('Nothing left to show')

  await page.getByTestId('statement-show-everything').click()

  // The switch goes off and the search stays exactly where it was (R12, C5).
  await expect(page).not.toHaveURL(/hide=/)
  await expect(page).toHaveURL(/q=TRASPASO/)
  await expect(page.getByTestId('statement-row')).toHaveCount(1)
  expect(onlyGet(watch)).toEqual(['GET'])
  expect(watch.consoleErrors).toEqual([])
})

test('the note is permanent, carries the live sentence and nothing else numeric', async ({
  page,
}) => {
  const watch = await prepare(page)
  await page.goto('/movements')

  const note = page.getByTestId('statement-totals-note')
  await expect(note).toContainText(NOTE_START)
  await expect(note).toContainText('2 groups look like transfers but could not be paired')
  await expect(note.locator('button')).toHaveCount(0)
  // The doubtful groups are read ONCE per session, whatever the month does (R15).
  await page.getByTestId('statement-prev').click()
  await expect(note).toBeVisible()
  expect(
    watch.requests.filter(
      (request) => new URL(request.url()).pathname === '/api/transfers/ambiguous',
    ),
  ).toHaveLength(1)
  expect(onlyGet(watch)).toEqual(['GET'])
  expect(watch.consoleErrors).toEqual([])
})

test('with no doubtful group the note keeps only its fixed text', async ({ page }) => {
  const watch = await prepare(page, 0)
  await page.goto('/movements')

  const note = page.getByTestId('statement-totals-note')
  await expect(note).toContainText(NOTE_START)
  await expect(page.getByTestId('statement-ambiguous-note')).toHaveCount(0)
  expect(await note.textContent()).not.toMatch(/\d/)
  expect(watch.consoleErrors).toEqual([])
})
