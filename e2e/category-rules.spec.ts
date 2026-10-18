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
const EDUCATION = { id: 8, name: 'Educación', kind: 'expense', parentId: null }

const CATEGORIES = [
  { ...GROCERIES, createdAt: '2026-08-06T18:30:00.000Z', children: [] },
  { ...UTILITIES, createdAt: '2026-08-06T18:31:00.000Z', children: [] },
  { ...EDUCATION, createdAt: '2026-08-06T18:32:00.000Z', children: [] },
]

const CATEGORY_BY_ID = new Map<number, typeof GROCERIES>(
  [GROCERIES, UTILITIES, EDUCATION].map((category) => [category.id, category]),
)

type Movement = Record<string, unknown>

const movement = (id: number, description: string, extra: Movement = {}): Movement => ({
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
  // Since the backend's feature 49 every movement carries it, born false (feature 22).
  excludedFromTotals: false,
  deposit: null,
  transferId: null,
  daySequence: 1,
  createdAt: '2026-08-06T18:30:00.000Z',
  updatedAt: '2026-08-06T18:30:00.000Z',
  ...extra,
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

/** One element of `categorizedMovements`, shaped like the contract's example. */
const categorizedMovement = (
  movementId: number,
  description: string,
  overrides: Record<string, unknown> = {},
) => ({
  movementId,
  description,
  bookingDate: '2026-08-11',
  amount: '41.37',
  type: 'expense',
  categoryId: 4,
  categoryName: 'Supermercado',
  rules: [{ ruleId: 3, matchText: 'sintetico colmado' }],
  ...overrides,
})

type ApplyAnswer = Record<string, unknown> & {
  categorizedMovements: ReturnType<typeof categorizedMovement>[]
}

const APPLY_RESULT: ApplyAnswer = {
  categorized: 12,
  // As many as `categorized` says: an answer whose list does not add up is unreadable
  // for the app (feature 30).
  categorizedMovements: Array.from({ length: 12 }, (_item, index) =>
    categorizedMovement(198 + index, `COMPRA SINTETICO COLMADO NORTE ${index + 1}`, {
      bookingDate: `2026-08-${String(11 + index).padStart(2, '0')}`,
      amount: `${41 + index * 3}.${String(37 + index * 5).padStart(2, '0')}`,
    }),
  ),
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

/** One element of `GET /api/category-rules/suggestions`, as the contract shapes it. */
interface Suggestion {
  matchText: string
  kind: 'expense' | 'income'
  movementCount: number
  movements: { movementId: number; description: string; bookingDate: string; amount: string }[]
  manualMatches: number
}

/** A suggestion that takes exactly these pending movements of the fake. */
const suggestionOf = (matchText: string, movements: Movement[], manualMatches = 0): Suggestion => ({
  matchText,
  kind: 'expense',
  movementCount: movements.length,
  movements: movements.map((row) => ({
    movementId: row.id as number,
    description: String(row.description),
    bookingDate: String(row.bookingDate),
    amount: String(row.amount),
  })),
  manualMatches,
})

interface Options {
  /** Answers the POST that creates a rule with an error instead of creating it. */
  createFailsWith?: { status: number; body: unknown }
  /** What `GET /api/category-rules/suggestions` answers; none by default. */
  suggestions?: Suggestion[]
  /** Answers `GET /api/category-rules/suggestions` with this status instead of the list. */
  suggestionsFailWith?: number
  /** The rules /rules starts with. */
  rules?: ReturnType<typeof rule>[]
  /** The pending movements of the queue, instead of the two of every other test. */
  movements?: Movement[]
  /** What each POST that applies answers, in order; the last one answers the rest. */
  applyAnswers?: ApplyAnswer[]
}

async function prepare(page: Page, options: Options = {}) {
  const rows = new Map<number, Movement>(
    (
      options.movements ?? [
        movement(10, 'RECIB /IBERDROLA CLIENTES, S.A'),
        movement(11, 'COMPRA MERCADONA'),
      ]
    ).map((row) => [row.id as number, row]),
  )
  const applyAnswers = options.applyAnswers ?? [APPLY_RESULT]
  let applied = 0
  const rules = new Map<number, ReturnType<typeof rule>>(
    (options.rules ?? []).map((one) => [one.id, one]),
  )
  let suggestions = [...(options.suggestions ?? [])]

  /**
   * The pass a POST or a PATCH runs since feature 60 of the backend, cut down to what
   * these tests need: every pending movement without a category whose description
   * contains the text of the saved rule gets its category, and the answer lists them as
   * `categorization` (the same shape as applying). The real pass runs every rule and also
   * moves what the closing of an import categorized; no test here depends on that.
   */
  const runPass = (saved: ReturnType<typeof rule>) => {
    const pending = [...rows.values()].filter(
      (row) => row.status === 'pending_review' && row.categoryId === null,
    )
    const category = CATEGORY_BY_ID.get(saved.categoryId) ?? GROCERIES
    const categorizedMovements = pending.flatMap((row) => {
      if (!String(row.description).toLowerCase().includes(saved.matchText.toLowerCase())) return []
      row.categoryId = category.id
      row.category = category
      return [
        categorizedMovement(row.id as number, String(row.description), {
          bookingDate: row.bookingDate,
          amount: row.amount,
          type: row.type,
          categoryId: category.id,
          categoryName: category.name,
          rules: [{ ruleId: saved.id, matchText: saved.matchText }],
        }),
      ]
    })
    return {
      categorized: categorizedMovements.length,
      categorizedMovements,
      conflictCount: 0,
      conflicts: [],
      unmatched: pending.length - categorizedMovements.length,
    }
  }

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

  // Answers like the backend does for what this file exercises: `q` is «contains»,
  // case-insensitive, and `pagination.total` counts the whole match, not the page.
  const answerMovements = (route: Route, query: URLSearchParams) => {
    const q = (query.get('q') ?? '').toLowerCase()
    const onlyUncategorized = query.get('uncategorized') === 'true'
    const visible = [...rows.values()].filter(
      (row) =>
        String(row.description).toLowerCase().includes(q) &&
        (!onlyUncategorized || row.categoryId === null),
    )
    const size = Number(query.get('pageSize') ?? '100')
    return route.fulfill({
      json: {
        movements: visible.slice(0, size),
        pagination: {
          page: 1,
          pageSize: size,
          total: visible.length,
          totalPages: Math.max(1, Math.ceil(visible.length / size)),
        },
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
      CATEGORY_BY_ID.get(body.categoryId) ?? GROCERIES,
    )
    rules.set(created.id, created)
    // The text a rule now recognises is no longer suggested.
    suggestions = suggestions.filter((one) => one.matchText !== body.matchText)
    return route.fulfill({ status: 201, json: { ...created, categorization: runPass(created) } })
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
      const answer = applyAnswers[Math.min(applied, applyAnswers.length - 1)] ?? APPLY_RESULT
      applied += 1
      // And the movements the answer says it categorized, when they are in the queue.
      for (const one of answer.categorizedMovements) {
        const row = rows.get(one.movementId)
        if (!row) continue
        row.categoryId = one.categoryId
        row.category = {
          id: one.categoryId,
          name: one.categoryName,
          kind: one.type,
          parentId: null,
        }
      }
      return route.fulfill({ json: answer })
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
    return route.fulfill({ json: { ...updated, categorization: runPass(updated) } })
  })

  // The suggested rules (feature 33). Playwright tries the last route first, so this one,
  // added after `**/api/category-rules/*`, answers `/suggestions` before that one can
  // read it as the id of a rule and answer 404.
  await page.route('**/api/category-rules/suggestions', (route) => {
    if (route.request().method() !== 'GET') return route.abort()
    if (options.suggestionsFailWith !== undefined) {
      return route.fulfill({
        status: options.suggestionsFailWith,
        json: { statusCode: options.suggestionsFailWith, code: 'INTERNAL_ERROR' },
      })
    }
    return route.fulfill({ json: suggestions })
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

test('a rule is born from a row and its line says how many movements it moved', async ({
  page,
}) => {
  const watch = await prepare(page)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(2)

  await page.getByTestId('movement-create-rule').first().click()

  await expect(page.getByTestId('rule-text').getByRole('textbox')).toHaveValue('iberdrola')
  await page.getByTestId('rule-category').getByRole('combobox').selectOption('6')
  await page.getByTestId('rule-save').click()

  // Since feature 33 the POST runs the pass: its line says how many it moved, and there
  // is nothing left to apply from it.
  await expect(page.getByTestId('rule-created-notice')).toHaveText(
    'Rule “iberdrola” → Suministros created: 1 movement categorized.',
  )
  await expect(page.getByTestId('apply-rules-now')).toHaveCount(0)
  // The queue was asked for again: the movement the rule matched has its category.
  await expect(page.getByTestId('movement-category').first()).toHaveText('Suministros')
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
  // Since feature 33 the only way to apply is the button of Rules, and creating a rule
  // already moves what it matches: the rule exists from the start, so what moves the
  // movement below is the pass.
  const watch = await prepare(page, { rules: [rule(7, 'iberdrola', UTILITIES)] })
  await page.goto('/review')
  await expect(page.getByTestId('review-uncategorized-count')).toHaveText(
    '2 pending movements have no category.',
  )
  await goByMenu(page, 'Rules')
  await expect(page.getByTestId('rule-row')).toHaveCount(1)

  await page.getByTestId('apply-rules').click()

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
  await goByMenu(page, 'Review')
  await expect(page.getByTestId('movement-category').first()).toHaveText('Suministros')
  await expect(page.getByTestId('review-uncategorized-count')).toHaveText(
    '1 pending movement has no category.',
  )
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

test('the dialog says how many movements a text would match, and writes nothing', async ({
  page,
}) => {
  const watch = await prepare(page)
  const reads: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/api/movements') reads.push(url.search)
  })

  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(2)

  // Opening the dialog is enough: the count arrives without a keystroke (R11).
  await page.getByTestId('movement-create-rule').first().click()

  await expect(page.getByTestId('rule-text').getByRole('textbox')).toHaveValue('iberdrola')
  await expect(page.getByTestId('rule-preview-count')).toHaveText(
    '1 pending movement without a category contains this text.',
  )
  await expect(page.getByTestId('rule-preview-sample')).toHaveCount(1)
  await expect(page.getByTestId('rule-preview-sample')).toContainText(
    'RECIB /IBERDROLA CLIENTES, S.A',
  )
  await expect(page.getByTestId('rule-preview-sample')).toContainText('-96,29')
  await expect(page.getByTestId('rule-preview')).toContainText(
    'Saving also moves the matching movements whose category was set when the import was closed. They are not in this count.',
  )
  expect(reads.at(-1)).toContain('uncategorized=true')
  expect(reads.at(-1)).toContain('status=pending_review')
  expect(reads.at(-1)).toContain('type=expense')
  expect(reads.at(-1)).toContain('pageSize=5')

  // Changing the text recounts on its own, and saving stays possible with no matches.
  await page.getByTestId('rule-text').getByRole('textbox').fill('zzzznothing')
  await expect(page.getByTestId('rule-preview-warning')).toHaveText(
    'Nothing pending without a category contains this text right now.',
  )
  await expect(page.getByTestId('rule-preview-sample')).toHaveCount(0)
  await page.getByTestId('rule-category').getByRole('combobox').selectOption('6')
  await expect(page.getByTestId('rule-save')).toBeEnabled()

  // Another text, another count, still with no keystroke of ours on any button.
  await page.getByTestId('rule-text').getByRole('textbox').fill('compra')
  await expect(page.getByTestId('rule-preview-count')).toHaveText(
    '1 pending movement without a category contains this text.',
  )
  await expect(page.getByTestId('rule-save')).toBeEnabled()

  // The whole feature is read only: not one request left with another method (C1).
  expect(writes(watch)).toEqual([])
  expect(reads.filter((search) => search.includes('q=')).length).toBeGreaterThanOrEqual(3)
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})

// ─── Feature 30: what applying did stays in view ───────────────────────────

/** Three pending movements: the pass below categorizes two and leaves one in conflict. */
const THREE_PENDING = [
  movement(10, 'RECIB /IBERDROLA CLIENTES, S.A'),
  movement(11, 'COMPRA MERCADONA', {
    bookingDate: '2026-07-29',
    valueDate: '2026-07-29',
    amount: '58.14',
  }),
  movement(12, 'PAGO SINTETICO EJEMPLO', {
    bookingDate: '2026-07-27',
    valueDate: '2026-07-27',
    amount: '23.80',
  }),
]

const FOUR_RULES = [
  rule(3, 'sintetico', GROCERIES),
  rule(7, 'iberdrola', UTILITIES),
  rule(8, 'mercadona', GROCERIES),
  rule(9, 'ejemplo', UTILITIES),
]

const ONE_CONFLICT = [
  {
    movementId: 12,
    description: 'PAGO SINTETICO EJEMPLO',
    bookingDate: '2026-07-27',
    matches: [
      { ruleId: 3, matchText: 'sintetico', categoryId: 4, categoryName: 'Supermercado' },
      { ruleId: 9, matchText: 'ejemplo', categoryId: 6, categoryName: 'Suministros' },
    ],
  },
]

/** A pass that categorizes two movements and finds one conflict. */
const TWO_CATEGORIZED: ApplyAnswer = {
  categorized: 2,
  categorizedMovements: [
    categorizedMovement(10, 'RECIB /IBERDROLA CLIENTES, S.A', {
      bookingDate: '2026-07-31',
      amount: '96.29',
      categoryId: 6,
      categoryName: 'Suministros',
      rules: [{ ruleId: 7, matchText: 'iberdrola' }],
    }),
    categorizedMovement(11, 'COMPRA MERCADONA', {
      bookingDate: '2026-07-29',
      amount: '58.14',
      rules: [{ ruleId: 8, matchText: 'mercadona' }],
    }),
  ],
  conflictCount: 1,
  conflicts: ONE_CONFLICT,
  unmatched: 0,
}

/** The pass after that one: nothing left to categorize, the conflict is still there. */
const NONE_CATEGORIZED: ApplyAnswer = {
  categorized: 0,
  categorizedMovements: [],
  conflictCount: 1,
  conflicts: ONE_CONFLICT,
  unmatched: 0,
}

const TWO_HEADLINE = /^Rules applied at \d{2}:\d{2}: 2 movements categorized\.$/

/** Applies from /rules and closes the dialog, as the user does. */
async function applyFromRules(page: Page): Promise<void> {
  await page.getByTestId('apply-rules').click()
  await page.getByTestId('apply-confirmed').click()
  await expect(page.getByTestId('apply-figure')).toHaveCount(3)
  await page.getByTestId('apply-close').click()
  await expect(page.getByTestId('apply-figure')).toHaveCount(0)
}

const goByMenu = async (page: Page, label: 'Review' | 'Rules'): Promise<void> => {
  await page.locator('nav a', { hasText: label }).click()
  await expect(page).toHaveURL(label === 'Review' ? /\/review$/ : /\/rules$/)
}

test('the result of applying stays in view from Rules to Review', async ({ page }) => {
  const watch = await prepare(page, {
    rules: FOUR_RULES,
    movements: THREE_PENDING,
    applyAnswers: [TWO_CATEGORIZED],
  })
  await page.goto('/rules')
  await expect(page.getByTestId('rule-row')).toHaveCount(4)
  await expect(page.getByTestId('last-apply')).toHaveCount(0)

  await page.getByTestId('apply-rules').click()
  await page.getByTestId('apply-confirmed').click()
  await expect(page.getByTestId('apply-figure').first()).toHaveText('2 movements categorized')
  await page.getByTestId('apply-close').click()
  await expect(page.getByTestId('apply-figure')).toHaveCount(0)

  // The dialog is gone and the number is still on the screen.
  const headline = page.getByTestId('last-apply-headline')
  await expect(headline).toHaveText(TWO_HEADLINE)
  const said = await headline.innerText()
  await expect(page.getByTestId('last-apply-figures')).toHaveText(
    '0 still without a matching rule · 1 conflict',
  )

  // The list is folded until it is asked for; then, one row per movement, in the order
  // of the answer, each with the category it was given.
  const listed = page.getByTestId('last-apply-movement')
  await expect(listed).toHaveCount(0)
  await expect(page.getByTestId('last-apply-show-movements')).toHaveText('Show the 2 movements')
  await page.getByTestId('last-apply-show-movements').click()
  await expect(listed).toHaveCount(2)
  await expect(listed.nth(0).getByTestId('last-apply-movement-description')).toHaveText(
    'RECIB /IBERDROLA CLIENTES, S.A',
  )
  await expect(listed.nth(0).getByTestId('last-apply-movement-date')).toHaveText('31 Jul 2026')
  await expect(listed.nth(0).getByTestId('last-apply-movement-category')).toHaveText('Suministros')
  await expect(listed.nth(0).getByTestId('last-apply-movement-amount')).toContainText('-96,29')
  await expect(listed.nth(0).getByTestId('last-apply-movement-rule')).toHaveText('“iberdrola”')
  await expect(listed.nth(1).getByTestId('last-apply-movement-description')).toHaveText(
    'COMPRA MERCADONA',
  )
  await expect(listed.nth(1).getByTestId('last-apply-movement-category')).toHaveText('Supermercado')
  await expect(listed.nth(1).getByTestId('last-apply-movement-amount')).toContainText('-58,14')

  // Over to Review through the menu, without loading the page again.
  await goByMenu(page, 'Review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  await expect(headline).toHaveText(said)
  await expect(page.getByTestId('last-apply-figures')).toHaveText(
    '0 still without a matching rule · 1 conflict',
  )
  // And the queue agrees: only the movement in conflict is still without a category.
  await expect(page.getByTestId('review-uncategorized-count')).toHaveText(
    '1 pending movement has no category.',
  )

  await page.getByTestId('last-apply-dismiss').click()
  await expect(page.getByTestId('last-apply')).toHaveCount(0)
  await expect(page.getByTestId('movement-row')).toHaveCount(3)

  await page.reload()
  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  await expect(page.getByTestId('last-apply')).toHaveCount(0)

  // Nothing was confirmed and no movement was written by the app: one POST, no body.
  expect(writes(watch)).toEqual([{ method: 'POST', path: '/api/category-rules/apply', body: null }])
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})

/** What the block looks like: its words, its box and the paint of its main parts. */
const lookOfLastApply = (page: Page) =>
  page.getByTestId('last-apply').evaluate((block) => {
    const paint = (element: Element | null) => {
      if (!element) return null
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return {
        width: box.width,
        height: box.height,
        color: style.color,
        background: style.backgroundColor,
        border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
        radius: style.borderTopLeftRadius,
        padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
        font: `${style.fontFamily} ${style.fontSize} ${style.fontWeight} ${style.lineHeight}`,
      }
    }
    const part = (name: string) => paint(block.querySelector(`[data-test="${name}"]`))
    return {
      words: (block as HTMLElement).innerText,
      block: paint(block),
      headline: part('last-apply-headline'),
      figures: part('last-apply-figures'),
      dismiss: part('last-apply-dismiss'),
      showMovements: part('last-apply-show-movements'),
      showConflicts: part('last-apply-show-conflicts'),
      firstMovement: part('last-apply-movement'),
      firstConflict: part('rule-conflict'),
    }
  })

/**
 * The same, once it has stopped changing: the pointer is taken off the block (a button
 * under it is painted as hovered) and two readings in a row have to agree (the buttons
 * change colour over a few milliseconds).
 */
async function settledLookOfLastApply(page: Page) {
  await page.mouse.move(0, 0)
  let last = await lookOfLastApply(page)
  await expect
    .poll(async () => {
      const now = await lookOfLastApply(page)
      const same = JSON.stringify(now) === JSON.stringify(last)
      last = now
      return same
    })
    .toBe(true)
  return last
}

const storedInBrowser = (page: Page) =>
  page.evaluate(() => ({
    local: window.localStorage.length,
    session: window.sessionStorage.length,
    search: window.location.search,
    hash: window.location.hash,
  }))

// tasks.md does not ask for this test; the leader did when handing over the batch. The
// test above dismisses before it reloads, so it cannot tell whether a reload alone
// forgets the result, and nothing else compares the block of one screen with the other's.
test('the result of applying looks the same on Rules and on Review and the next pass replaces it', async ({
  page,
}) => {
  const watch = await prepare(page, {
    rules: FOUR_RULES,
    movements: THREE_PENDING,
    applyAnswers: [TWO_CATEGORIZED, NONE_CATEGORIZED],
  })
  await page.goto('/rules')
  await expect(page.getByTestId('rule-row')).toHaveCount(4)
  await applyFromRules(page)
  await expect(page.getByTestId('last-apply-headline')).toHaveText(TWO_HEADLINE)

  // Folded, and then with its two lists open: the same on both screens.
  const foldedOnRules = await settledLookOfLastApply(page)
  await page.getByTestId('last-apply-show-movements').click()
  await page.getByTestId('last-apply-show-conflicts').click()
  await expect(page.getByTestId('last-apply-movement')).toHaveCount(2)
  await expect(page.getByTestId('last-apply').getByTestId('rule-conflict')).toHaveCount(1)
  const openOnRules = await settledLookOfLastApply(page)
  expect(foldedOnRules.words).toContain('2 movements categorized.')
  expect(openOnRules.words).toContain('PAGO SINTETICO EJEMPLO')
  expect(openOnRules.block?.height ?? 0).toBeGreaterThan(foldedOnRules.block?.height ?? 0)

  await goByMenu(page, 'Review')
  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  // Each screen mounts its own copy, so the lists come folded again.
  await expect(page.getByTestId('last-apply-movement')).toHaveCount(0)
  expect(await settledLookOfLastApply(page)).toEqual(foldedOnRules)
  await page.getByTestId('last-apply-show-movements').click()
  await page.getByTestId('last-apply-show-conflicts').click()
  await expect(page.getByTestId('last-apply-movement')).toHaveCount(2)
  await expect(page.getByTestId('last-apply').getByTestId('rule-conflict')).toHaveCount(1)
  expect(await settledLookOfLastApply(page)).toEqual(openOnRules)

  // Another pass takes the place of the result that was showing, on both screens.
  await goByMenu(page, 'Rules')
  await expect(page.getByTestId('last-apply-headline')).toHaveText(TWO_HEADLINE)
  await applyFromRules(page)
  const none = /^Rules applied at \d{2}:\d{2}: no movements were categorized\.$/
  await expect(page.getByTestId('last-apply')).toHaveCount(1)
  await expect(page.getByTestId('last-apply-headline')).toHaveText(none)
  await expect(page.getByTestId('last-apply-show-movements')).toHaveCount(0)
  await expect(page.getByTestId('last-apply-show-conflicts')).toHaveText('Show the 1 conflict')
  await goByMenu(page, 'Review')
  await expect(page.getByTestId('last-apply')).toHaveCount(1)
  await expect(page.getByTestId('last-apply-headline')).toHaveText(none)

  // Nothing of it was put where a reload could find it, so a reload forgets it.
  expect(await storedInBrowser(page)).toEqual({ local: 0, session: 0, search: '', hash: '' })
  await page.reload()
  await expect(page.getByTestId('movement-row')).toHaveCount(3)
  await expect(page.getByTestId('review-uncategorized-count')).toHaveText(
    '1 pending movement has no category.',
  )
  await expect(page.getByTestId('last-apply')).toHaveCount(0)
  await goByMenu(page, 'Rules')
  await expect(page.getByTestId('rule-row')).toHaveCount(4)
  await expect(page.getByTestId('last-apply')).toHaveCount(0)

  expect(writes(watch)).toEqual([
    { method: 'POST', path: '/api/category-rules/apply', body: null },
    { method: 'POST', path: '/api/category-rules/apply', body: null },
  ])
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})

// ─── Feature 33: suggested rules, and what creating a rule moved ───────────

/** Four receipts of a made-up academy and two tickets of a made-up supermarket. */
const ACADEMY_ROWS = [
  movement(31, 'RECIBO ACADEMIA FICTICIA NORTE MARZO', {
    bookingDate: '2026-03-02',
    amount: '47.85',
  }),
  movement(32, 'RECIBO ACADEMIA FICTICIA NORTE ABRIL', {
    bookingDate: '2026-04-01',
    amount: '47.85',
  }),
  movement(33, 'RECIBO ACADEMIA FICTICIA NORTE MAYO', {
    bookingDate: '2026-05-04',
    amount: '52.10',
  }),
  movement(34, 'RECIBO ACADEMIA FICTICIA NORTE JUNIO', {
    bookingDate: '2026-06-01',
    amount: '52.10',
  }),
]
const MARKET_ROWS = [
  movement(41, 'COMPRA SUPERMERCADO INVENTADO 0412', {
    bookingDate: '2026-06-13',
    amount: '23.64',
  }),
  movement(42, 'COMPRA SUPERMERCADO INVENTADO 0412', {
    bookingDate: '2026-06-27',
    amount: '61.08',
  }),
]
const ACADEMY = suggestionOf('academia ficticia norte', ACADEMY_ROWS, 2)
const MARKET = suggestionOf('supermercado inventado', MARKET_ROWS)

const suggestionTexts = (page: Page) => page.getByTestId('suggested-rule-text').allInnerTexts()

test('a suggested rule becomes a rule and the box lists the movements it moved', async ({
  page,
}) => {
  const watch = await prepare(page, {
    movements: [...ACADEMY_ROWS, ...MARKET_ROWS],
    suggestions: [ACADEMY, MARKET],
  })
  await page.goto('/rules')
  await expect(page.getByTestId('suggested-rule')).toHaveCount(2)
  expect(await suggestionTexts(page)).toEqual([
    '“academia ficticia norte”',
    '“supermercado inventado”',
  ])
  const academy = page.getByTestId('suggested-rule').first()
  await expect(academy.getByTestId('suggested-rule-count')).toHaveText('4 movements')
  await expect(page.getByTestId('rules-empty')).toBeVisible()
  await expect(page.getByTestId('last-apply')).toHaveCount(0)

  await academy.getByTestId('suggested-rule-category').getByRole('combobox').selectOption('8')
  await academy.getByTestId('suggested-rule-create').click()

  // One POST, with the text of the suggestion and the category chosen in its row (R4).
  await expect(page.getByTestId('last-apply')).toHaveCount(1)
  expect(writes(watch)).toEqual([
    {
      method: 'POST',
      path: '/api/category-rules',
      body: { matchText: 'academia ficticia norte', categoryId: 8 },
    },
  ])

  // The box says which rule, its category, that it was created and how many moved (R5).
  await expect(page.getByTestId('last-apply-headline')).toHaveText(
    /^Rule “academia ficticia norte” → Educación created at \d{2}:\d{2}: 4 movements categorized\.$/,
  )
  await expect(page.getByTestId('last-apply-show-movements')).toHaveText('Show the 4 movements')
  await page.getByTestId('last-apply-show-movements').click()
  const listed = page.getByTestId('last-apply-movement')
  await expect(listed).toHaveCount(4)
  await expect(listed.getByTestId('last-apply-movement-description')).toHaveText(
    ACADEMY_ROWS.map((row) => String(row.description)),
  )
  await expect(listed.getByTestId('last-apply-movement-category')).toHaveText(
    Array.from({ length: 4 }, () => 'Educación'),
  )
  await expect(listed.first().getByTestId('last-apply-movement-amount')).toContainText('-47,85')

  // The line of the created rule says the same, and offers nothing to apply (R6, R13).
  await expect(page.getByTestId('rule-created-notice')).toHaveText(
    'Rule “academia ficticia norte” → Educación created: 4 movements categorized.',
  )
  await expect(page.getByTestId('apply-rules-now')).toHaveCount(0)

  // The suggestion used is gone; the other one stays, and the rule is in the list (R7, R8).
  await expect(page.getByTestId('suggested-rule')).toHaveCount(1)
  expect(await suggestionTexts(page)).toEqual(['“supermercado inventado”'])
  await expect(page.getByTestId('rule-row')).toHaveCount(1)
  await expect(page.getByTestId('rule-row')).toContainText('academia ficticia norte')

  expect(writes(watch)).toHaveLength(1)
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})

/** Twenty-four made-up suppliers, two receipts each: enough for /rules to scroll. */
const MANY_ROWS = Array.from({ length: 24 }, (_item, index) => {
  const name = `PROVEEDOR FICTICIO ${String(index + 1).padStart(2, '0')}`
  return [
    movement(100 + index * 2, `RECIBO ${name} JULIO`, {
      bookingDate: '2026-07-03',
      amount: (18.37 + index * 2.41).toFixed(2),
    }),
    movement(101 + index * 2, `RECIBO ${name} AGOSTO`, {
      bookingDate: '2026-08-04',
      amount: (19.12 + index * 2.41).toFixed(2),
    }),
  ]
})
const MANY_SUGGESTIONS = MANY_ROWS.map((pair, index) =>
  suggestionOf(`proveedor ficticio ${String(index + 1).padStart(2, '0')}`, pair),
)

test('the line of a rule created from a suggestion low in the list is in view', async ({
  page,
}) => {
  const watch = await prepare(page, {
    movements: MANY_ROWS.flat(),
    suggestions: MANY_SUGGESTIONS,
  })
  await page.goto('/rules')
  await expect(page.getByTestId('suggested-rule')).toHaveCount(24)

  const last = page.getByTestId('suggested-rule').last()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await last.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await last.getByTestId('suggested-rule-category').getByRole('combobox').selectOption('6')
  await last.getByTestId('suggested-rule-create').click()

  const notice = page.getByTestId('rule-created-notice')
  await expect(notice).toHaveText(
    'Rule “proveedor ficticio 24” → Suministros created: 2 movements categorized.',
  )
  await expect(page.getByTestId('suggested-rule')).toHaveCount(23)
  // The page is still scrolled, and the whole line is between the top bar and the bottom
  // of the window, inside the block that sticks under the top bar.
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect(
    page.locator('[data-test="sticky-below-top-bar"] [data-test="rule-created-notice"]'),
  ).toHaveCount(1)
  await expect
    .poll(() =>
      notice.evaluate((element) => {
        const bar = document
          .querySelector('[data-test="topbar-title"]')
          ?.closest('header')
          ?.getBoundingClientRect()
        if (!bar) return 'no top bar'
        const box = element.getBoundingClientRect()
        return box.height > 0 && box.top >= bar.bottom - 0.5 && box.bottom <= window.innerHeight
      }),
    )
    .toBe(true)

  expect(writes(watch)).toEqual([
    {
      method: 'POST',
      path: '/api/category-rules',
      body: { matchText: 'proveedor ficticio 24', categoryId: 6 },
    },
  ])
  expect(watch.consoleErrors).toEqual([])
  expect(watch.pageErrors).toEqual([])
})

test('a create from a suggestion that fails leaves the list as it was and says why', async ({
  page,
}) => {
  const watch = await prepare(page, {
    movements: [...ACADEMY_ROWS, ...MARKET_ROWS],
    suggestions: [ACADEMY, MARKET],
    createFailsWith: {
      status: 409,
      body: {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Ya existe una regla con el texto «academia ficticia norte»',
      },
    },
  })
  await page.goto('/rules')
  await expect(page.getByTestId('suggested-rule')).toHaveCount(2)
  await expect(page.getByTestId('rules-empty')).toBeVisible()

  // From here on, every request the page sends.
  const sent: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/')) sent.push(`${request.method()} ${url.pathname}`)
  })

  const academy = page.getByTestId('suggested-rule').first()
  await academy.getByTestId('suggested-rule-category').getByRole('combobox').selectOption('8')
  await academy.getByTestId('suggested-rule-create').click()

  // The English sentence, in the row of the suggestion, and nowhere else (R10).
  await expect(academy.getByTestId('suggested-rule-error')).toHaveText(
    'Nothing was saved: another rule already uses that text.',
  )
  await expect(page.getByTestId('suggested-rule-error')).toHaveCount(1)
  // Everything as it was: both suggestions, no rule, no box and no line.
  expect(await suggestionTexts(page)).toEqual([
    '“academia ficticia norte”',
    '“supermercado inventado”',
  ])
  await expect(page.getByTestId('rules-empty')).toBeVisible()
  await expect(page.getByTestId('last-apply')).toHaveCount(0)
  await expect(page.getByTestId('rule-created-notice')).toHaveCount(0)
  // No other request than that POST.
  expect(sent).toEqual(['POST /api/category-rules'])

  // The only console error is Chromium's own note about the 409 this test asked for.
  expect(watch.consoleErrors.filter((text) => !text.includes('Failed to load resource'))).toEqual(
    [],
  )
  expect(watch.pageErrors).toEqual([])
})
