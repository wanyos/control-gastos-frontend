import { test, expect } from '@playwright/test'
import type { Page, Request, Route } from '@playwright/test'

// The month at a glance (feature 25) in a real browser, without a backend: every /api
// call is answered with page.route. The screen only reads. The dev server proxies /api
// to a real backend on :3000, so the safety net below aborts anything not foreseen and
// writes it down: the list must end empty, and every method of the session must be GET.

type Figures = readonly [income: string, expense: string, net: string, count: number]

/** The real monthly figures read on 2026-10-02: totals and counts, nothing else. */
const MONTHS: Record<string, Figures> = {
  '2025-08': ['2346.16', '10941.80', '-8595.64', 34],
  '2025-09': ['3910.73', '2352.42', '1558.31', 36],
  '2025-10': ['2151.95', '2819.35', '-667.40', 38],
  '2025-11': ['2150.66', '2062.95', '87.71', 31],
  '2025-12': ['5044.85', '3115.81', '1929.04', 49],
  '2026-01': ['3114.10', '1892.53', '1221.57', 35],
  '2026-02': ['2050.19', '1874.57', '175.62', 28],
  '2026-03': ['4392.47', '2532.16', '1860.31', 34],
  '2026-04': ['2536.07', '4396.54', '-1860.47', 42],
  '2026-05': ['7204.68', '4827.26', '2377.42', 49],
  '2026-06': ['5144.33', '5085.22', '59.11', 83],
  '2026-07': ['2785.90', '4096.05', '-1310.15', 93],
  '2026-08': ['2590.26', '4003.89', '-1413.63', 70],
  '2026-09': ['161.82', '966.84', '-805.02', 28],
}

/** Spending with no category, by month: amount and count. */
const UNCATEGORIZED: Record<string, readonly [amount: string, count: number]> = {
  '2026-08': ['3036.33', 48],
  '2026-09': ['625.71', 14],
}

/** The newest movement of the whole base. */
const LATEST = '2026-09-11'

const ZERO = { income: '0.00', expense: '0.00', net: '0.00' }

const ACCOUNT = { id: 1, iban: 'ES00', bank: 'bank', alias: 'bank ···0000', type: 'checking' }

/** A movement with every field of the contract and nothing real in it. */
const movement = (id: number, day: string) => ({
  id,
  type: 'expense',
  bookingDate: day,
  valueDate: day,
  amount: '1.00',
  description: `MOVEMENT ${id}`,
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: 1,
  account: ACCOUNT,
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
})

const page1 = (pageSize: number, total: number) => ({
  page: 1,
  pageSize,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
})

/** `GET /api/movements`, answered the way the backend would for each question. */
function answerMovements(query: URLSearchParams): unknown {
  const pageSize = Number(query.get('pageSize') ?? 50)
  const from = query.get('from')

  // The sidebar's pending count (feature 15).
  if (query.get('status') !== null) {
    return { movements: [], pagination: page1(pageSize, 0), totals: ZERO }
  }
  // No range: the newest movement of the base.
  if (from === null) {
    return { movements: [movement(1, LATEST)], pagination: page1(pageSize, 1607), totals: ZERO }
  }

  const month = from.slice(0, 7)
  if (query.get('uncategorized') === 'true') {
    const [amount, count] = UNCATEGORIZED[month] ?? ['0.00', 0]
    const net = amount === '0.00' ? '0.00' : `-${amount}`
    return {
      movements: [],
      pagination: page1(pageSize, count),
      totals: { income: '0.00', expense: amount, net },
    }
  }

  // The month with no filters: the overview asks one row, the statement a whole page.
  const [income, expense, net, count] = MONTHS[month] ?? ['0.00', '0.00', '0.00', 0]
  return {
    movements: count > 0 ? [movement(2, `${month}-01`)] : [],
    pagination: page1(pageSize, count),
    totals: { income, expense, net },
  }
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

async function prepare(page: Page) {
  const watch = {
    requests: [] as Request[],
    consoleErrors: [] as string[],
    pageErrors: [] as Error[],
    /** Every /api call this suite did not foresee: the ones the safety net had to stop. */
    aborted: [] as string[],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) watch.requests.push(request)
  })

  /** Stops a call nobody foresaw, and writes it down so the test fails because of it. */
  const stop = (route: Route) => {
    const request = route.request()
    watch.aborted.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort()
  }

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  await page.route('**/api/**', stop)
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/net-worth', (route) => route.fulfill({ json: NET_WORTH_SAMPLE }))
  // What the statement asks for on mount, reached through the link of this screen.
  await page.route('**/api/accounts', (route) =>
    route.fulfill({ json: [{ ...ACCOUNT, balance: '0.00' }] }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/transfers/ambiguous', (route) =>
    route.fulfill({ json: { ambiguousCount: 0, ambiguous: [] } }),
  )
  await page.route('**/api/movements*', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: answerMovements(new URL(route.request().url()).searchParams) })
      : stop(route),
  )

  return watch
}

/** The reads this screen makes: one row of `GET /api/movements`, without a status. */
const overviewReads = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.requests
    .map((request) => new URL(request.url()))
    .filter(
      (url) =>
        url.pathname === '/api/movements' &&
        url.searchParams.get('pageSize') === '1' &&
        url.searchParams.get('status') === null,
    )

test.use({ testIdAttribute: 'data-test' })

test('reads a month at a glance, moves between months and matches the statement', async ({
  page,
}) => {
  const watch = await prepare(page)

  // (a) In through the sidebar; the home is still the net worth.
  await page.goto('/')
  await expect(page).toHaveURL(/\/net-worth$/)
  await page.getByRole('link', { name: 'Overview' }).click()
  await expect(page).toHaveURL(/\/overview$/)
  await expect(page.getByTestId('overview-sentence')).toBeVisible()

  await page.getByTestId('statement-month-input').locator('input').fill('2026-08')

  await expect(page).toHaveURL(/\/overview\?month=2026-08$/)
  await expect(page.getByTestId('overview-sentence')).toHaveText(
    /^In August 2026, 2\.590\s€ came in and 4\.004\s€ went out: you spent 1\.414\s€ more than came in\.$/,
  )
  await expect(page.getByTestId('overview-in').getByTestId('money')).toHaveText(/^2\.590,26\s€$/)
  await expect(page.getByTestId('overview-out').getByTestId('money')).toHaveText(/^4\.003,89\s€$/)
  await expect(page.getByTestId('overview-net').getByTestId('money')).toHaveText(/^-1\.413,63\s€$/)
  await expect(page.getByTestId('overview-rate').getByTestId('money')).toHaveText(/^-54,6\s%$/)
  await expect(page.getByTestId('overview-in').getByTestId('overview-verdict')).toHaveText(
    'About usual',
  )
  await expect(page.getByTestId('overview-in').getByTestId('overview-usual-text')).toHaveText(
    /^12,2\s% below your usual month \(2\.950,00\s€\)$/,
  )
  await expect(page.getByTestId('overview-out').getByTestId('overview-verdict')).toHaveText(
    'More than usual',
  )
  await expect(page.getByTestId('overview-out').getByTestId('overview-usual-text')).toHaveText(
    /^34,9\s% above your usual month \(2\.967,58\s€\)$/,
  )
  await expect(page.getByTestId('overview-caption')).toHaveText(
    "Your usual month is the middle value of the previous 12 months, worked out here from each month's totals.",
  )
  await expect(page.getByTestId('overview-uncategorized-line')).toHaveText(
    /^3\.036,33\s€ of this month's 4\.003,89\s€ spending has no category yet \(75,8\s%, 48 movements\)\.$/,
  )
  // The sentence comes before any figure.
  const sentenceTop = (await page.getByTestId('overview-sentence').boundingBox())?.y ?? 0
  const figuresTop = (await page.getByTestId('overview-figures').boundingBox())?.y ?? 0
  expect(sentenceTop).toBeLessThan(figuresTop)

  // (b) September: the data ends on the 11th, so the month is incomplete.
  await page.getByTestId('statement-next').click()

  await expect(page).toHaveURL(/\/overview\?month=2026-09$/)
  await expect(page.getByTestId('overview-sentence')).toHaveText(
    /^September 2026 is incomplete: your data ends on 11 Sept? 2026\. So far, 162\s€ came in and 967\s€ went out\.$/,
  )
  await expect(page.getByTestId('overview-rate').getByTestId('money')).toHaveText('—')
  await expect(page.getByTestId('overview-rate-note')).toHaveText(
    'Not shown: the month is incomplete.',
  )
  await expect(page.getByTestId('overview-caption')).toHaveText(
    'No comparison for an incomplete month.',
  )
  await expect(page.getByTestId('overview-verdict')).toHaveCount(0)

  // (c) A reload keeps the month; back returns to August.
  await page.reload()

  await expect(page).toHaveURL(/\/overview\?month=2026-09$/)
  await expect(page.getByTestId('overview-in').getByTestId('money')).toHaveText(/^161,82\s€$/)

  await page.goBack()

  await expect(page).toHaveURL(/\/overview\?month=2026-08$/)
  await expect(page.getByTestId('overview-out').getByTestId('money')).toHaveText(/^4\.003,89\s€$/)
  await expect(page.getByTestId('overview-out').getByTestId('overview-verdict')).toHaveText(
    'More than usual',
  )

  // (d) The link opens the statement of the same month, and its figures are the same.
  await page.getByRole('link', { name: 'See the movements of August 2026' }).click()

  await expect(page).toHaveURL(/\/movements\?month=2026-08$/)
  await expect(page.getByTestId('statement-totals-in')).toHaveText(/^2\.590,26\s€$/)
  await expect(page.getByTestId('statement-totals-out')).toHaveText(/^4\.003,89\s€$/)
  await expect(page.getByTestId('statement-totals-net')).toHaveText(/^-1\.413,63\s€$/)

  // (e) Nothing unforeseen left the browser, and the whole session only read.
  expect(overviewReads(watch).length).toBeGreaterThanOrEqual(15)
  expect(watch.aborted).toEqual([])
  expect([...new Set(watch.requests.map((request) => request.method()))]).toEqual(['GET'])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('a month after the last data says so, and shows nothing else', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/overview?month=2026-10')

  await expect(page.getByTestId('overview-sentence')).toHaveText(
    /^No movements in October 2026\. Your data ends on 11 Sept? 2026\.$/,
  )
  await expect(page.getByTestId('overview-figures')).toHaveCount(0)
  await expect(page.getByTestId('overview-caption')).toHaveCount(0)
  await expect(page.getByTestId('overview-uncategorized')).toHaveCount(0)
  await expect(page.getByTestId('overview-statement-link')).toHaveCount(0)
  // Only the core: the month and the date of the last data.
  expect(overviewReads(watch)).toHaveLength(2)

  expect(watch.aborted).toEqual([])
  expect(watch.requests.every((request) => request.method() === 'GET')).toBe(true)
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})
