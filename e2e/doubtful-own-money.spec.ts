import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

// Feature 35 in a real browser: the doubtful movements of own money in `Transfers`, the
// two answers and their Undo, and the number next to `Transfers` in the sidebar.
//
// There is no backend: every /api call is answered with page.route. The first route
// aborts ANY /api call (later routes win) and writes it down in a list that each test
// checks to be empty at the end. The dev server proxies /api to a real backend on :3000,
// so without that first route the PATCH of this file would really be sent.
//
// Invented data: no real names, shops nor account numbers.

type Raw = Record<string, unknown>

const CHECKING = {
  id: 3,
  iban: 'ES0000000000000000004417',
  bank: 'bankinter',
  alias: 'bankinter ···4417',
  type: 'checking',
}
const SECOND = {
  id: 4,
  iban: 'ES0000000000000000008830',
  bank: 'openbank',
  alias: 'openbank ···8830',
  type: 'checking',
}

const ZERO = { income: '0.00', expense: '0.00', net: '0.00' }

/** A doubtful movement of own money as `GET /api/movements` sends it. */
const doubtful = (
  id: number,
  type: 'expense' | 'income',
  account: typeof CHECKING,
  day: string,
  amount: string,
  description: string,
): Raw => ({
  id,
  type,
  bookingDate: `2026-10-${day}`,
  valueDate: `2026-10-${day}`,
  amount,
  description,
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: account.id,
  account,
  categoryId: null,
  categorySource: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'confirmed',
  excludedFromTotals: false,
  ownershipDecision: null,
  transferId: null,
  daySequence: 1,
  createdAt: '2026-10-16T08:00:00.000Z',
  updatedAt: '2026-10-16T08:00:00.000Z',
  deposit: null,
  ownership: {
    status: 'doubtful',
    ownAccountId: 4,
    ownAccountName: 'Cartera inventada',
    matchedText: 'Banco Ficticio Norte',
  },
})

const OUT_ID = 9101
const IN_ID = 9102

interface Watch {
  /** Every /api call no route of this file foresaw: it was aborted, and it fails the test. */
  aborted: string[]
  /** Every request that was not a GET, as `<METHOD> <path> <body>`. */
  writes: string[]
  consoleErrors: string[]
  pageErrors: Error[]
}

/**
 * A fake with state: the answer of a PATCH really takes the movement out of the doubtful
 * ones, and `null` puts it back, so what the screen shows after a write can only come
 * from asking again.
 */
async function prepare(page: Page): Promise<Watch> {
  const watch: Watch = { aborted: [], writes: [], consoleErrors: [], pageErrors: [] }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (!path.startsWith('/api/') || request.method() === 'GET') return
    watch.writes.push(`${request.method()} ${path} ${request.postData() ?? ''}`)
  })
  const stop = (route: Route): Promise<void> => {
    const request = route.request()
    watch.aborted.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort()
  }

  const all = [
    doubtful(OUT_ID, 'expense', CHECKING, '13', '350.00', 'TRANSF /BANCO FICTICIO NORTE'),
    doubtful(IN_ID, 'income', SECOND, '08', '120.50', 'ABONO BANCO FICTICIO NORTE'),
  ]
  const answered = new Set<number>()
  const stillDoubtful = () => all.filter((row) => !answered.has(Number(row.id)))

  // First route: any /api call not answered below is aborted, never proxied to :3000.
  await page.route('**/api/**', stop)
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/transfers', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: { pairs: [] } }) : stop(route),
  )
  await page.route('**/api/transfers/ambiguous', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { ambiguousCount: 0, ambiguous: [] } })
      : stop(route),
  )
  await page.route('**/api/movements*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() !== 'GET' || url.pathname !== '/api/movements') return stop(route)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 50)
    // The sidebar number of Review: nothing pending here.
    if (url.searchParams.get('ownership') !== 'doubtful') {
      return route.fulfill({
        json: {
          movements: [],
          pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
          totals: ZERO,
        },
      })
    }
    const rows = stillDoubtful()
    return route.fulfill({
      json: {
        movements: rows.slice(0, pageSize),
        pagination: {
          page: 1,
          pageSize,
          total: rows.length,
          totalPages: rows.length === 0 ? 0 : Math.ceil(rows.length / pageSize),
        },
        totals: ZERO,
      },
    })
  })
  await page.route('**/api/movements/*', (route) => {
    const request = route.request()
    if (request.method() !== 'PATCH') return stop(route)
    const id = Number(new URL(request.url()).pathname.split('/').at(-1))
    const body = JSON.parse(request.postData() ?? '{}') as Raw
    const row = all.find((one) => Number(one.id) === id)
    if (!row || Object.keys(body).join() !== 'ownershipDecision') return stop(route)
    if (body.ownershipDecision === null) answered.delete(id)
    else answered.add(id)
    // The PATCH answer carries neither `deposit` nor `ownership` (contract).
    const answer: Raw = { ...row, ownershipDecision: body.ownershipDecision }
    delete answer.deposit
    delete answer.ownership
    return route.fulfill({ json: answer })
  })

  return watch
}

function expectNothingUnforeseen(watch: Watch): void {
  expect(watch.aborted).toEqual([])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
}

test.use({ testIdAttribute: 'data-test' })

const rowIds = (page: Page) =>
  page
    .getByTestId('ownership-row')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-movement-id')))

test('answering it is mine sends one PATCH with mine and the movement leaves the list', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/transfers')
  const section = page.getByTestId('ownership-section')
  await expect(section.getByTestId('ownership-row')).toHaveCount(2)
  await expect(section.getByRole('heading')).toHaveText('Doubtful: between your accounts?')
  const first = section.locator(`[data-movement-id="${OUT_ID}"]`)
  await expect(first.getByTestId('ownership-description')).toHaveText(
    'TRANSF /BANCO FICTICIO NORTE',
  )
  await expect(first.getByTestId('ownership-reason')).toHaveText(
    'Names "Banco Ficticio Norte", the bank of your account "Cartera inventada"',
  )

  await first.getByTestId('ownership-mine').click()

  await expect(page.getByTestId('transfers-action-summary')).toContainText(
    'Marked as yours. It no longer counts in your totals.',
  )
  await expect(section.getByTestId('ownership-row')).toHaveCount(1)
  expect(await rowIds(page)).toEqual([String(IN_ID)])
  // The only write of the session: that PATCH, with that body and nothing else.
  expect(watch.writes).toEqual([`PATCH /api/movements/${OUT_ID} {"ownershipDecision":"mine"}`])
  expectNothingUnforeseen(watch)
})

test('answering not mine and then undo puts the movement back in the list', async ({ page }) => {
  const watch = await prepare(page)

  await page.goto('/transfers')
  const section = page.getByTestId('ownership-section')
  await expect(section.getByTestId('ownership-row')).toHaveCount(2)

  await section.locator(`[data-movement-id="${IN_ID}"]`).getByTestId('ownership-not-mine').click()

  await expect(page.getByTestId('transfers-action-summary')).toContainText(
    'Marked as not yours. It counts in your totals.',
  )
  await expect(section.getByTestId('ownership-row')).toHaveCount(1)
  expect(await rowIds(page)).toEqual([String(OUT_ID)])

  await page.getByTestId('transfers-action-undo').click()

  await expect(page.getByTestId('transfers-action-summary')).toHaveText('Answer undone.')
  await expect(page.getByTestId('transfers-action-undo')).toHaveCount(0)
  await expect(section.getByTestId('ownership-row')).toHaveCount(2)
  expect(await rowIds(page)).toEqual([String(OUT_ID), String(IN_ID)])
  expect(watch.writes).toEqual([
    `PATCH /api/movements/${IN_ID} {"ownershipDecision":"not_mine"}`,
    `PATCH /api/movements/${IN_ID} {"ownershipDecision":null}`,
  ])
  expectNothingUnforeseen(watch)
})

test('the number next to Transfers says how many doubtful movements there are', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/transfers')
  const transfers = page.locator('nav a[href="/transfers"]')
  await expect(transfers.getByTestId('transfers-doubtful-count')).toHaveText('2')
  // Only next to Transfers.
  await expect(page.getByTestId('transfers-doubtful-count')).toHaveCount(1)

  await page
    .getByTestId('ownership-section')
    .locator(`[data-movement-id="${OUT_ID}"]`)
    .getByTestId('ownership-mine')
    .click()

  await expect(page.getByTestId('ownership-row')).toHaveCount(1)
  await expect(transfers.getByTestId('transfers-doubtful-count')).toHaveText('1')
  expect(watch.writes).toEqual([`PATCH /api/movements/${OUT_ID} {"ownershipDecision":"mine"}`])
  expectNothingUnforeseen(watch)
})
