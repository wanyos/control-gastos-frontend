import { test, expect } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

// The statement (feature 19) in a real browser, without a backend: every /api call
// is answered with page.route. This screen only reads, and the safety net below
// aborts anything it did not foresee, so nothing ever reaches the real backend on
// :3000 and no write can leak out.

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

const previousMonth = (month: string): string => {
  const [year = '2026', index = '01'] = month.split('-')
  return Number(index) === 1
    ? `${Number(year) - 1}-12`
    : `${year}-${String(Number(index) - 1).padStart(2, '0')}`
}

/** A month with two days and figures that are clearly the backend's, not a sum. */
const monthPage = (month: string, total: string) => ({
  movements: [
    movement(10, `${month}-11`, { transferId: 'tr_1', description: 'TRASPASO A MYINVESTOR' }),
    movement(11, `${month}-11`),
    movement(12, `${month}-04`, { type: 'income', amount: '1200.00', description: 'NOMINA' }),
  ],
  pagination: { page: 1, pageSize: 200, total: 93, totalPages: 1 },
  totals: { income: '57949.11', expense: total, net: '-1147.31' },
})

/** What the sidebar count asks for: the same endpoint, `pageSize=1`. */
const COUNT_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 1, total: 7, totalPages: 7 },
  totals: ZERO,
}

/** The home the menu is reached from asks for this on mount (feature 9). */
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

const EMPTY_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 200, total: 0, totalPages: 0 },
  totals: ZERO,
}

/** The same month narrowed by a filter (feature 20): fewer rows and its own figures. */
const FILTERED_PAGE = (month: string) => ({
  movements: [
    movement(12, `${month}-04`, { type: 'income', amount: '1200.00', description: 'NOMINA' }),
  ],
  pagination: { page: 1, pageSize: 200, total: 12, totalPages: 1 },
  totals: { income: '1200.00', expense: '45.37', net: '1154.63' },
})

/** What fills the two selects of the bar: every account and the whole category tree. */
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
    children: [
      {
        id: 3,
        name: 'Groceries',
        kind: 'expense',
        parentId: 1,
        createdAt: '2026-08-06T18:31:00.000Z',
        children: [],
      },
    ],
  },
]

async function prepare(page: Page) {
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
  await page.route('**/api/movements*', (route) => {
    const query = new URL(route.request().url()).searchParams
    if (query.get('pageSize') === '1') return route.fulfill({ json: COUNT_PAGE })
    const from = query.get('from') ?? ''
    const month = from.slice(0, 7)
    // Feature 20: a filtered month is a different answer, computed by the backend.
    if (query.get('q') !== null) return route.fulfill({ json: EMPTY_PAGE })
    if (query.get('uncategorized') === 'true' || query.get('accountId') !== null) {
      return route.fulfill({ json: FILTERED_PAGE(month) })
    }
    if (month === currentMonth()) return route.fulfill({ json: monthPage(month, '59096.42') })
    if (month === previousMonth(currentMonth())) {
      return route.fulfill({ json: monthPage(month, '1234.56') })
    }
    return route.fulfill({ json: EMPTY_PAGE })
  })

  return watch
}

const statementQueries = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.requests
    .map((request) => new URL(request.url()))
    .filter(
      (url) => url.pathname === '/api/movements' && url.searchParams.get('pageSize') === '200',
    )
    .map((url) => url.search)

test.use({ testIdAttribute: 'data-test' })

test('opens on the current month with its figures, its note and its days', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/')
  await page.getByRole('link', { name: 'Movements' }).click()

  await expect(page).toHaveURL(/\/movements$/)
  await expect(page.getByTestId('statement-totals-count')).toHaveText('93 movements')
  await expect(page.getByTestId('statement-totals-in')).toContainText('57.949,11')
  await expect(page.getByTestId('statement-totals-out')).toContainText('59.096,42')
  await expect(page.getByTestId('statement-totals-net')).toContainText('-1.147,31')
  await expect(page.getByTestId('statement-totals-note')).toContainText('raw bank movements')
  await expect(page.getByTestId('statement-day')).toHaveCount(2)
  await expect(page.getByTestId('statement-row')).toHaveCount(3)
  await expect(page.getByTestId('statement-row-transfer')).toHaveCount(1)
  expect(statementQueries(watch)).toHaveLength(1)
  expect(statementQueries(watch)[0]).toContain('from=')

  expect(watch.requests.every((request) => request.method() === 'GET')).toBe(true)
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('the month picker reads legibly with the design system tokens', async ({ page }) => {
  await prepare(page)
  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals')).toBeVisible()

  const field = page.getByTestId('statement-month-input').locator('input')
  const styles = await field.evaluate((el) => {
    const root = getComputedStyle(document.documentElement)
    const readVar = (name: string): string => {
      const raw = root.getPropertyValue(name).trim()
      const ref = /^var\((--[\w-]+)\)$/.exec(raw)
      return ref ? root.getPropertyValue(ref[1]!).trim() : raw
    }
    const computed = getComputedStyle(el)
    return {
      type: (el as HTMLInputElement).type,
      value: (el as HTMLInputElement).value,
      color: computed.color,
      background: computed.backgroundColor,
      scheme: getComputedStyle(document.documentElement).colorScheme,
      inkStrong: readVar('--ink-strong'),
      surfaceCard: readVar('--surface-card'),
    }
  })

  expect(styles.type).toBe('month')
  expect(styles.value).toMatch(/^\d{4}-\d{2}$/)
  // The native field takes the tokens, and `color-scheme: dark` keeps its own
  // widgets (the picker glyph and the spinners) readable on a dark background.
  expect(styles.color).not.toBe(styles.background)
  expect(styles.scheme).toContain('dark')
  expect(styles.inkStrong).not.toBe('')
  expect(styles.surfaceCard).not.toBe('')
})

test('the back arrow changes the month, the URL and the figures, and a reload stays', async ({
  page,
}) => {
  const watch = await prepare(page)
  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals-out')).toContainText('59.096,42')
  const previous = previousMonth(currentMonth())

  await page.getByTestId('statement-prev').click()

  await expect(page).toHaveURL(new RegExp(`month=${previous}$`))
  await expect(page.getByTestId('statement-totals-out')).toContainText('1.234,56')
  expect(statementQueries(watch).at(-1)).toContain(`from=${previous}-01`)

  await page.reload()

  await expect(page.getByTestId('statement-totals-out')).toContainText('1.234,56')
  await expect(page).toHaveURL(new RegExp(`month=${previous}$`))

  await page.goBack()

  await expect(page.getByTestId('statement-totals-out')).toContainText('59.096,42')
  expect(watch.requests.every((request) => request.method() === 'GET')).toBe(true)
  expect(watch.consoleErrors).toEqual([])
})

test('a month with nothing in it says so, and the arrow forward stops at today', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/movements?month=2023-05')

  await expect(page.getByTestId('statement-empty')).toHaveText('No movements in May 2023.')
  await expect(page.getByTestId('statement-row')).toHaveCount(0)
  await expect(page.getByTestId('statement-day')).toHaveCount(0)
  await expect(page.getByTestId('statement-error')).toHaveCount(0)

  await page.goto(`/movements?month=${currentMonth()}`)

  await expect(page.getByTestId('statement-next')).toBeDisabled()
  expect(watch.requests.every((request) => request.method() === 'GET')).toBe(true)
  expect(watch.consoleErrors).toEqual([])
})

test('filtering inside the month changes the figures and the count (feature 20)', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/movements')
  await expect(page.getByTestId('statement-totals-count')).toHaveText('93 movements')
  await expect(page.getByTestId('statement-scope')).toHaveCount(0)

  await page.getByTestId('filter-uncategorized').locator('input').check()

  await expect(page).toHaveURL(/uncategorized=true/)
  await expect(page.getByTestId('statement-totals-count')).toHaveText('12 movements')
  await expect(page.getByTestId('statement-totals-in')).toContainText('1.200,00')
  await expect(page.getByTestId('statement-totals-out')).toContainText('45,37')
  await expect(page.getByTestId('statement-scope')).toContainText(
    '12 movements match these filters',
  )
  await expect(page.getByTestId('statement-scope')).toContainText('Uncategorized')
  await expect(page.getByTestId('statement-row')).toHaveCount(1)
  // The permanent note of the F19 is still there, word for word and undismissable.
  await expect(page.getByTestId('statement-totals-note')).toContainText('raw bank movements')
  expect(statementQueries(watch).at(-1)).toContain('uncategorized=true')

  // Clearing leaves the month where it was.
  await page.getByTestId('clear-filters').click()

  await expect(page).toHaveURL(new RegExp(`month=${currentMonth()}$`))
  await expect(page.getByTestId('statement-totals-count')).toHaveText('93 movements')

  // A filter that matches nothing says so, apart from an empty month.
  await page.goto(`/movements?month=${currentMonth()}&q=zzzz`)

  await expect(page.getByTestId('statement-no-matches')).toContainText(
    'No movements match these filters in',
  )
  await expect(page.getByTestId('statement-empty')).toHaveCount(0)

  expect(watch.requests.every((request) => request.method() === 'GET')).toBe(true)
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('a URL with a category and uncategorized together never asks for both (feature 20)', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto(`/movements?month=${currentMonth()}&category=3&uncategorized=true`)

  await expect(page.getByTestId('statement-totals-count')).toHaveText('12 movements')
  const asked = statementQueries(watch)
  expect(asked).toHaveLength(1)
  expect(asked[0]).toContain('uncategorized=true')
  expect(asked[0]).not.toContain('categoryId')
  // No 400 can be painted, because the forbidden request never left.
  await expect(page.getByTestId('statement-error')).toHaveCount(0)

  expect(watch.requests.every((request) => request.method() === 'GET')).toBe(true)
  expect(watch.consoleErrors).toEqual([])
})
