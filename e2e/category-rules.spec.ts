import { test, expect } from '@playwright/test'
import type { Page, Request, Route } from '@playwright/test'

// The categorization rules (feature 17) in a real browser, against a small fake
// backend made of page.route handlers. THE SAFETY NET BELOW ABORTS ANY /api CALL
// THAT IS NOT ROUTED HERE, so a POST to /api/category-rules/apply — which writes on
// every pending movement at once and cannot be undone — can never reach a real
// backend. Nothing in this file talks to :3000.

const ACCOUNT = {
  id: 1,
  iban: 'ES9820385778983000760236',
  bank: 'bankinter',
  alias: 'bankinter ···0236',
  type: 'checking',
}

const UTILITIES = { id: 6, name: 'Suministros', kind: 'expense', parentId: null }
const GROCERIES = { id: 4, name: 'Supermercado', kind: 'expense', parentId: null }

const CATEGORIES = [
  { ...GROCERIES, createdAt: '2026-08-06T18:30:00.000Z', children: [] },
  { ...UTILITIES, createdAt: '2026-08-06T18:31:00.000Z', children: [] },
]

type Movement = Record<string, unknown>

const movement = (id: number, description: string): Movement => ({
  id,
  type: 'expense',
  bookingDate: '2026-07-31',
  valueDate: '2026-07-31',
  amount: '96.29',
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
})

const rule = (id: number, matchText: string, category: object) => ({
  id,
  matchText,
  categoryId: (category as { id: number }).id,
  category,
  createdAt: '2026-09-06T10:00:00.000Z',
  updatedAt: '2026-09-06T10:00:00.000Z',
})

const TOTALS = { income: '0.00', expense: '192.58', net: '-192.58' }

const APPLY_RESULT = {
  categorized: 12,
  conflictCount: 1,
  conflicts: [
    {
      movementId: 210,
      description: 'PAGO SINTETICO EJEMPLO',
      bookingDate: '2026-08-14',
      matches: [
        { ruleId: 3, matchText: 'sintetico', categoryId: 4, categoryName: 'Supermercado' },
        { ruleId: 9, matchText: 'ejemplo', categoryId: 6, categoryName: 'Suministros' },
      ],
    },
  ],
  unmatched: 5,
}

interface Options {
  /** Answers the POST that creates a rule with an error instead of creating it. */
  createFailsWith?: { status: number; body: unknown }
  /** The rules /rules starts with. */
  rules?: ReturnType<typeof rule>[]
}

async function prepare(page: Page, options: Options = {}) {
  const rows = new Map<number, Movement>(
    [movement(10, 'RECIB /IBERDROLA CLIENTES, S.A'), movement(11, 'COMPRA MERCADONA')].map(
      (row) => [row.id as number, row],
    ),
  )
  const rules = new Map<number, ReturnType<typeof rule>>(
    (options.rules ?? []).map((one) => [one.id, one]),
  )

  const watch = {
    writes: [] as Request[],
    consoleErrors: [] as string[],
    pageErrors: [] as Error[],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    if (request.method() !== 'GET') watch.writes.push(request)
  })

  const answerMovements = (route: Route, query: URLSearchParams) => {
    const visible = [...rows.values()]
    const size = query.get('pageSize') === '1' ? 1 : 100
    return route.fulfill({
      json: {
        movements: size === 1 ? visible.slice(0, 1) : visible,
        pagination: { page: 1, pageSize: size, total: visible.length, totalPages: 1 },
        totals: TOTALS,
      },
    })
  }

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  await page.route('**/api/**', (route) => route.abort())
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: CATEGORIES }))
  await page.route('**/api/movements*', (route) =>
    route.request().method() === 'GET'
      ? answerMovements(route, new URL(route.request().url()).searchParams)
      : route.abort(),
  )

  await page.route('**/api/category-rules', (route) => {
    const request = route.request()
    if (request.method() === 'GET') return route.fulfill({ json: [...rules.values()] })
    if (options.createFailsWith) {
      return route.fulfill({
        status: options.createFailsWith.status,
        json: options.createFailsWith.body,
      })
    }
    const body = JSON.parse(request.postData() ?? '{}') as {
      matchText: string
      categoryId: number
    }
    const created = rule(
      20 + rules.size,
      body.matchText,
      body.categoryId === 6 ? UTILITIES : GROCERIES,
    )
    rules.set(created.id, created)
    return route.fulfill({ status: 201, json: created })
  })

  await page.route('**/api/category-rules/*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/apply')) {
      // The pass only writes `categoryId`, and only on pending movements without one.
      for (const row of rows.values()) {
        if (String(row.description).toLowerCase().includes('iberdrola')) {
          row.categoryId = UTILITIES.id
          row.category = UTILITIES
        }
      }
      return route.fulfill({ json: APPLY_RESULT })
    }
    const id = Number(url.pathname.split('/').pop())
    if (request.method() === 'DELETE') {
      rules.delete(id)
      return route.fulfill({ status: 204, body: '' })
    }
    const body = JSON.parse(request.postData() ?? '{}') as { categoryId?: number }
    const current = rules.get(id)
    if (!current) return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
    const updated = {
      ...current,
      categoryId: body.categoryId ?? current.categoryId,
      category: body.categoryId === 4 ? GROCERIES : current.category,
    }
    rules.set(id, updated)
    return route.fulfill({ json: updated })
  })

  return watch
}

const writes = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.writes.map((request) => ({
    method: request.method(),
    path: new URL(request.url()).pathname,
    body: request.postData() === null ? null : (JSON.parse(request.postData() ?? '{}') as unknown),
  }))

test.use({ testIdAttribute: 'data-test' })

test('a rule is born from a row, and creating it applies nothing', async ({ page }) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(2)

  await page.getByTestId('movement-create-rule').first().click()

  await expect(page.getByTestId('rule-text').getByRole('textbox')).toHaveValue('iberdrola')
  await page.getByTestId('rule-category').getByRole('combobox').selectOption('6')
  await page.getByTestId('rule-save').click()

  await expect(page.getByTestId('rule-created-notice')).toContainText('iberdrola')
  await expect(page.getByTestId('rule-created-notice')).toContainText('Suministros')
  await expect(page.getByTestId('apply-rules-now')).toBeVisible()
  expect(writes(watch)).toEqual([
    {
      method: 'POST',
      path: '/api/category-rules',
      body: { matchText: 'iberdrola', categoryId: 6 },
    },
  ])
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})

test('applying asks first, sends one bodyless POST and refreshes the queue', async ({ page }) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await page.getByTestId('movement-create-rule').first().click()
  await page.getByTestId('rule-category').getByRole('combobox').selectOption('6')
  await page.getByTestId('rule-save').click()
  await expect(page.getByTestId('apply-rules-now')).toBeVisible()

  await page.getByTestId('apply-rules-now').click()

  await expect(page.getByTestId('apply-confirm')).toContainText(
    'Only pending movements without a category are touched.',
  )
  await expect(page.getByTestId('apply-confirm')).toContainText(
    "This can't be undone from the app.",
  )
  expect(writes(watch).filter((call) => call.path.endsWith('/apply'))).toEqual([])

  await page.getByTestId('apply-confirmed').click()

  await expect(page.getByTestId('apply-figure').first()).toHaveText('12 movements categorized')
  await expect(page.getByTestId('apply-figure').nth(1)).toHaveText(
    '5 still without a matching rule',
  )
  await expect(page.getByTestId('apply-figure').nth(2)).toHaveText('1 conflict')
  await expect(page.getByTestId('rule-conflict')).toHaveCount(1)
  await expect(page.getByTestId('rule-conflict')).toContainText('PAGO SINTETICO EJEMPLO')

  await page.getByTestId('apply-close').click()

  // The queue was asked for again, without reloading the page.
  await expect(page.getByTestId('movement-category').first()).toHaveText('Suministros')
  const applied = writes(watch).filter((call) => call.path.endsWith('/apply'))
  expect(applied).toEqual([{ method: 'POST', path: '/api/category-rules/apply', body: null }])
  expect(writes(watch).some((call) => call.path.startsWith('/api/movements'))).toBe(false)
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})

test('a text another rule already uses keeps the dialog open, in English', async ({ page }) => {
  const watch = await prepare(page, {
    createFailsWith: {
      status: 409,
      body: {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Ya existe una regla con el texto «iberdrola»',
      },
    },
  })
  await page.goto('/review')

  await page.getByTestId('movement-create-rule').first().click()
  await page.getByTestId('rule-category').getByRole('combobox').selectOption('6')
  await page.getByTestId('rule-save').click()

  await expect(page.getByTestId('rule-error')).toHaveText(
    'Nothing was saved: another rule already uses that text.',
  )
  await expect(page.getByTestId('rule-dialog')).toBeVisible()
  await expect(page.getByTestId('rule-text').getByRole('textbox')).toHaveValue('iberdrola')
  await expect(page.getByTestId('rule-created-notice')).toHaveCount(0)
  expect(page.url()).toContain('/review')
  // The only console error is Chromium's own note about the 409 this test asked for.
  expect(watch.consoleErrors.filter((text) => !text.includes('Failed to load resource'))).toEqual(
    [],
  )
  expect(watch.pageErrors).toEqual([])
})

test('changing and deleting a rule never touches a movement', async ({ page }) => {
  const watch = await prepare(page, {
    rules: [rule(7, 'iberdrola', UTILITIES), rule(8, 'mercadona', GROCERIES)],
  })
  await page.goto('/rules')
  await expect(page.getByTestId('rule-row')).toHaveCount(2)

  await page.getByTestId('rule-edit').first().click()
  await page.getByTestId('rule-category').getByRole('combobox').selectOption('4')
  await page.getByTestId('rule-save').click()

  await expect(page.getByTestId('rule-category-name').first()).toHaveText('Supermercado')

  await page.getByTestId('rule-delete').nth(1).click()
  await expect(page.getByTestId('delete-rule-body')).toHaveText(
    'Movements it already categorized keep their category.',
  )
  await page.getByTestId('delete-confirm').click()

  await expect(page.getByTestId('rule-row')).toHaveCount(1)
  expect(writes(watch)).toEqual([
    { method: 'PATCH', path: '/api/category-rules/7', body: { categoryId: 4 } },
    { method: 'DELETE', path: '/api/category-rules/8', body: null },
  ])
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})
