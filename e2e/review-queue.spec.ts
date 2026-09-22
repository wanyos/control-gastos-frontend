import { test, expect } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

// The review queue (feature 15) in a real browser, without a backend: every /api
// call is answered with page.route. This screen only reads, and the safety net below
// aborts anything that is not one of its two GETs, so no write can ever leak out.

const ACCOUNT = {
  id: 1,
  iban: 'ES9820385778983000760236',
  bank: 'bankinter',
  alias: 'bankinter ···0236',
  type: 'checking',
}

const movement = (id: number, description: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: 'expense',
  bookingDate: '2026-07-31',
  valueDate: '2026-07-31',
  amount: '45.37',
  description,
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: 1,
  account: ACCOUNT,
  categoryId: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'pending_review',
  transferId: null,
  daySequence: 1,
  createdAt: '2026-08-06T18:30:00.000Z',
  updatedAt: '2026-08-06T18:30:00.000Z',
  ...extra,
})

const TOTALS = { income: '1200.00', expense: '845.37', net: '354.63' }
const ZERO = { income: '0.00', expense: '0.00', net: '0.00' }

const PAGE_ONE = {
  movements: [
    movement(10, 'CAFETERÍA CENTRAL'),
    movement(11, 'RECIBO /Recibo luz'),
    movement(12, 'COMPRA SUPERMERCADO'),
  ],
  pagination: { page: 1, pageSize: 100, total: 132, totalPages: 2 },
  totals: TOTALS,
}

const PAGE_TWO = {
  movements: [movement(20, 'PAGO TARJETA')],
  pagination: { page: 2, pageSize: 100, total: 132, totalPages: 2 },
  totals: TOTALS,
}

const SEARCH_HIT = {
  movements: [movement(10, 'CAFETERÍA CENTRAL')],
  pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  totals: { income: '0.00', expense: '45.37', net: '-45.37' },
}

const UNCATEGORIZED_PAGE = {
  movements: [movement(11, 'RECIBO /Recibo luz')],
  pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  totals: { income: '0.00', expense: '45.37', net: '-45.37' },
}

/** What the sidebar count asks for: the same queue, so both figures agree. */
const COUNT_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 1, total: 132, totalPages: 132 },
  totals: ZERO,
}

const CATEGORIES = [
  {
    id: 1,
    name: 'Food',
    kind: 'expense',
    parentId: null,
    createdAt: '2026-08-06T18:30:00.000Z',
    children: [
      {
        id: 2,
        name: 'Groceries',
        kind: 'expense',
        parentId: 1,
        createdAt: '2026-08-06T18:31:00.000Z',
        children: [],
      },
    ],
  },
]

/** Answers every movements query out of its querystring, and records what was asked. */
async function prepare(page: Page) {
  const watch = {
    movementRequests: [] as Request[],
    consoleErrors: [] as string[],
    pageErrors: [] as Error[],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/movements') watch.movementRequests.push(request)
  })

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  await page.route('**/api/**', (route) => route.abort())
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: CATEGORIES }))
  await page.route('**/api/movements*', (route) => {
    const query = new URL(route.request().url()).searchParams
    if (query.get('pageSize') === '1') return route.fulfill({ json: COUNT_PAGE })
    if (query.has('q')) return route.fulfill({ json: SEARCH_HIT })
    if (query.get('uncategorized') === 'true') return route.fulfill({ json: UNCATEGORIZED_PAGE })
    return route.fulfill({ json: query.get('page') === '2' ? PAGE_TWO : PAGE_ONE })
  })

  return watch
}

const queries = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.movementRequests.map((request) => new URL(request.url()).search)

test.use({ testIdAttribute: 'data-test' })

test('lists the queue with its totals and the sidebar count', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/review')

  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  await expect(page.getByTestId('totals-matches')).toHaveText('132 movements')
  await expect(page.getByTestId('totals-net')).toContainText('354,63')
  await expect(page.getByTestId('review-count')).toHaveText('132')
  expect(queries(watch).filter((search) => search.endsWith('pageSize=1'))).not.toHaveLength(0)

  expect(watch.movementRequests.every((request) => request.method() === 'GET')).toBe(true)
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('walks to the next page, and a reload keeps you there', async ({ page }) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)

  await page.getByTestId('pager-next').click()

  await expect(page).toHaveURL(/\?page=2$/)
  await expect(page.getByTestId('pager-position')).toHaveText('Page 2 of 2')
  await expect(page.getByTestId('movement-row')).toHaveCount(1)

  await page.reload()

  await expect(page.getByTestId('pager-position')).toHaveText('Page 2 of 2')
  expect(queries(watch).filter((search) => search.includes('page=2'))).not.toHaveLength(0)
  expect(watch.consoleErrors).toEqual([])
})

test('searching without accents finds the accented description, with one request', async ({
  page,
}) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  const before = watch.movementRequests.length

  await page.getByTestId('review-search').getByRole('textbox').fill('cafeteria')

  await expect(page.getByTestId('movement-row')).toHaveCount(1)
  await expect(page.getByTestId('movement-description')).toHaveText('CAFETERÍA CENTRAL')
  await expect(page).toHaveURL(/q=cafeteria/)
  expect(watch.movementRequests.length - before).toBe(1)

  await page.getByTestId('review-search').getByRole('textbox').fill('')

  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  expect(watch.consoleErrors).toEqual([])
})

test('Uncategorized travels alone: never together with a category', async ({ page }) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)

  await page.getByTestId('filter-category').getByRole('combobox').selectOption('2')
  await expect(page).toHaveURL(/category=2/)

  await page.getByTestId('filter-uncategorized').getByRole('checkbox').check()

  await expect(page).toHaveURL(/uncategorized=true/)
  await expect(page.getByTestId('movement-row')).toHaveCount(1)
  const asked = queries(watch)
  expect(asked.filter((search) => search.includes('uncategorized=true'))).not.toHaveLength(0)
  expect(
    asked.filter((search) => search.includes('categoryId') && search.includes('uncategorized')),
  ).toHaveLength(0)
  expect(watch.consoleErrors).toEqual([])
})
