import { test, expect } from '@playwright/test'
import type { Page, Request, Route } from '@playwright/test'

// The review actions (feature 16) in a real browser, against a small fake backend
// made of page.route handlers: the GET answers what is still pending and the PATCH
// applies the change the way the contract does. THE SAFETY NET BELOW ABORTS ANY /api
// CALL THAT IS NOT ROUTED HERE, so a PATCH can never reach a real backend.

const ACCOUNT = {
  id: 1,
  iban: 'ES9820385778983000760236',
  bank: 'bankinter',
  alias: 'bankinter ···0236',
  type: 'checking',
}

const FOOD = { id: 1, name: 'Food', kind: 'expense', parentId: null }
const GROCERIES = { id: 2, name: 'Groceries', kind: 'expense', parentId: 1 }

const CATEGORIES = [
  {
    ...FOOD,
    createdAt: '2026-08-06T18:30:00.000Z',
    children: [{ ...GROCERIES, createdAt: '2026-08-06T18:31:00.000Z', children: [] }],
  },
]

type Movement = Record<string, unknown>

const movement = (id: number, description: string, extra: Movement = {}): Movement => ({
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

/** 132 pending in the queue, of which these three are on the page being looked at. */
const BASE_TOTAL = 132

interface Options {
  /** Answers the PATCH with an error instead of applying it. */
  failWith?: { status: number; body: unknown }
}

async function prepare(page: Page, options: Options = {}) {
  const rows = new Map<number, Movement>(
    [
      movement(10, 'CAFETERÍA CENTRAL'),
      movement(11, 'NOMINA JULIO', { type: 'income', amount: '1200.00' }),
      movement(12, 'COMPRA SUPERMERCADO'),
    ].map((row) => [row.id as number, row]),
  )

  const watch = {
    patches: [] as Request[],
    consoleErrors: [] as string[],
    pageErrors: [] as Error[],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    if (request.method() === 'PATCH') watch.patches.push(request)
  })

  const pending = () => [...rows.values()].filter((row) => row.status === 'pending_review')

  const answerGet = (route: Route, query: URLSearchParams) => {
    const visible = pending()
    const size = query.get('pageSize') === '1' ? 1 : 100
    const total = BASE_TOTAL - (rows.size - visible.length)
    return route.fulfill({
      json: {
        movements: size === 1 ? visible.slice(0, 1) : visible,
        pagination: { page: 1, pageSize: size, total, totalPages: 2 },
        totals: TOTALS,
      },
    })
  }

  const answerPatch = (route: Route) => {
    if (options.failWith) {
      return route.fulfill({ status: options.failWith.status, json: options.failWith.body })
    }
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      ids?: number[]
      categoryId?: number | null
      status?: string
    }
    const url = new URL(route.request().url())
    const single = /\/api\/movements\/(\d+)$/.exec(url.pathname)
    const ids = body.ids ?? [Number(single?.[1])]
    const changed = ids.flatMap((id) => {
      const row = rows.get(id)
      if (!row) return []
      if ('categoryId' in body) {
        row.categoryId = body.categoryId ?? null
        row.category = body.categoryId === 2 ? GROCERIES : body.categoryId === 1 ? FOOD : null
      }
      if (body.status !== undefined) row.status = body.status
      return [{ ...row }]
    })
    return route.fulfill({
      json: body.ids ? { updated: changed.length, movements: changed } : changed[0],
    })
  }

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  await page.route('**/api/**', (route) => route.abort())
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: CATEGORIES }))
  await page.route('**/api/movements*', (route) => {
    const request = route.request()
    if (request.method() === 'PATCH') return answerPatch(route)
    return answerGet(route, new URL(request.url()).searchParams)
  })
  await page.route('**/api/movements/*', (route) =>
    route.request().method() === 'PATCH' ? answerPatch(route) : route.abort(),
  )

  return watch
}

const bodies = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.patches.map((request) => JSON.parse(request.postData() ?? '{}') as unknown)

test.use({ testIdAttribute: 'data-test' })

test('confirming a row empties it from the queue and lowers the sidebar count', async ({
  page,
}) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  await expect(page.getByTestId('review-count')).toHaveText('132')

  await page.getByTestId('movement-select').first().getByRole('checkbox').check()
  await expect(page.getByTestId('confirm-selected')).toHaveText('Confirm 1 movement')
  await page.getByTestId('confirm-selected').click()

  await expect(page.getByTestId('movement-row')).toHaveCount(2)
  await expect(page.getByTestId('action-summary')).toContainText('1 movement confirmed')
  await expect(page.getByTestId('review-count')).toHaveText('131')
  expect(bodies(watch)).toEqual([{ ids: [10], status: 'confirmed' }])
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})

test('Undo sends the opposite change and the row comes back', async ({ page }) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)

  await page.getByTestId('movement-confirm').first().click()
  await expect(page.getByTestId('movement-row')).toHaveCount(2)

  await page.getByTestId('action-undo').click()

  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  await expect(page.getByTestId('review-count')).toHaveText('132')
  expect(bodies(watch)).toEqual([{ status: 'confirmed' }, { ids: [10], status: 'pending_review' }])
  expect(watch.consoleErrors).toEqual([])
})

test('a category only travels to the movements that accept it', async ({ page }) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)

  await page.getByTestId('select-all').getByRole('checkbox').check()
  await page.getByTestId('bulk-category').getByRole('combobox').selectOption('2')

  await expect(page.getByTestId('applies-to')).toHaveText('Applies to 2 of 3 selected')

  await page.getByTestId('apply-category').click()

  await expect(page.getByTestId('action-summary')).toContainText(
    '2 movements categorized as Groceries',
  )
  expect(bodies(watch)).toEqual([{ ids: [10, 12], categoryId: 2 }])
  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  expect(watch.consoleErrors).toEqual([])
})

test('a rejected change leaves the list exactly as it was, and says nothing changed', async ({
  page,
}) => {
  const watch = await prepare(page, {
    failWith: {
      status: 400,
      body: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'El movimiento 11 es neutral y no admite categoría',
      },
    },
  })
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)

  await page.getByTestId('select-all').getByRole('checkbox').check()
  await page.getByTestId('confirm-selected').click()

  await expect(page.getByTestId('action-error')).toHaveText(
    "Nothing changed. Some of those movements don't accept that category.",
  )
  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  await expect(page.getByTestId('selected-count')).toHaveText('3 selected')
  await expect(page.getByTestId('review-count')).toHaveText('132')
  expect(watch.patches).toHaveLength(1)
  // The only console error is Chromium's own note about the 400 this test asked for.
  expect(watch.consoleErrors.filter((text) => !text.includes('Failed to load resource'))).toEqual(
    [],
  )
  expect(watch.pageErrors).toEqual([])
})
