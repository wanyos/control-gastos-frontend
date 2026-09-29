import { describe, it, expect, vi, afterEach } from 'vitest'

import { ValidationError } from '@/shared/errors'

import {
  CATEGORIES_PATH,
  MAX_IDS,
  MOVEMENTS_PATH,
  buildMovementsQuery,
  getCategories,
  getMovements,
  parseBulkResult,
  parseCategories,
  parseMovementPage,
  updateMovement,
  updateMovements,
} from '../service'
import {
  CATEGORY_TREE,
  EXPENSE,
  GROCERIES,
  INCOME,
  PAGE_OF_THREE,
  bulkResult,
  changed,
  mockApi,
  json,
} from './fixtures'

describe('buildMovementsQuery (R3, R5, R6)', () => {
  it('sends the queue query: pending status and 100 per page', () => {
    const query = buildMovementsQuery({ status: 'pending_review', page: 1, pageSize: 100 })

    expect(query).toContain('status=pending_review')
    expect(query).toContain('pageSize=100')
    expect(query).toBe('status=pending_review&page=1&pageSize=100')
  })

  it('omits every empty value instead of sending it blank (R5)', () => {
    expect(buildMovementsQuery({ status: 'pending_review', from: '', q: '', page: 1 })).toBe(
      'status=pending_review&page=1',
    )
    expect(buildMovementsQuery({})).toBe('')
  })

  it('adds every filter that has a value', () => {
    const query = buildMovementsQuery({
      status: 'pending_review',
      accountId: 3,
      from: '2026-08-01',
      to: '2026-08-31',
      type: 'expense',
      categoryId: 7,
      q: 'luz',
      page: 2,
      pageSize: 100,
    })

    expect(query).toBe(
      'status=pending_review&accountId=3&from=2026-08-01&to=2026-08-31&type=expense&categoryId=7&q=luz&page=2&pageSize=100',
    )
  })

  it('never sends categoryId and uncategorized together: uncategorized wins (R6)', () => {
    const query = buildMovementsQuery({ categoryId: 7, uncategorized: true })

    expect(query).toBe('uncategorized=true')
    expect(query).not.toContain('categoryId')
  })

  it('never sends uncategorized=false: the contract says it filters nothing (R6)', () => {
    expect(buildMovementsQuery({ categoryId: 7 })).toBe('categoryId=7')
  })

  it('trims q and escapes what would break the querystring (R8)', () => {
    expect(buildMovementsQuery({ q: '  ca  ' })).toBe('q=ca')
    expect(buildMovementsQuery({ q: '100% & co' })).toBe('q=100%25+%26+co')
  })
})

describe('parseMovementPage (R3, R4, R9)', () => {
  it('maps the whole page, movements, pagination and totals', () => {
    const page = parseMovementPage(PAGE_OF_THREE)

    expect(page.movements.map((movement) => movement.id)).toEqual([10, 11, 12])
    expect(page.pagination).toEqual({ page: 1, pageSize: 100, total: 132, totalPages: 2 })
    expect(page.totals).toEqual({ income: '1200.00', expense: '845.37', net: '354.63' })
  })

  it('keeps the whole movement, not only the painted fields', () => {
    const [movement] = parseMovementPage(PAGE_OF_THREE).movements

    expect(movement).toEqual({
      id: 10,
      type: 'expense',
      bookingDate: '2026-07-31',
      valueDate: '2026-07-31',
      amount: '45.37',
      description: 'CAFETERÍA CENTRAL',
      balanceAfter: '9954.63',
      currency: 'EUR',
      note: null,
      accountId: 1,
      account: {
        id: 1,
        iban: 'ES9820385778983000760236',
        bank: 'bankinter',
        alias: 'bankinter ···0236',
        type: 'checking',
      },
      categoryId: 1,
      category: { id: 1, name: 'Food', kind: 'expense', parentId: null },
      paymentMethod: null,
      origin: 'imported',
      status: 'pending_review',
      excludedFromTotals: false,
      transferId: null,
      daySequence: 2,
      createdAt: '2026-08-06T18:30:00.000Z',
      updatedAt: '2026-08-06T18:30:00.000Z',
    })
  })

  it('accepts a null category, a null balance and a null daySequence', () => {
    const movement = parseMovementPage(PAGE_OF_THREE).movements[1]

    expect(movement?.category).toBeNull()
    expect(movement?.categoryId).toBeNull()
    expect(movement?.balanceAfter).toBeNull()
    expect(movement?.daySequence).toBeNull()
  })

  it.each([
    ['type', { ...EXPENSE, type: 'transfer' }],
    ['status', { ...EXPENSE, status: 'archived' }],
    ['category.kind', { ...EXPENSE, category: { ...EXPENSE.category, kind: 'mixed' } }],
    ['amount', { ...EXPENSE, amount: '45.3' }],
  ])('rejects an unknown %s with a ValidationError', (_field, movement) => {
    const body = { ...PAGE_OF_THREE, movements: [movement] }

    expect(() => parseMovementPage(body)).toThrow(ValidationError)
  })

  it('accepts open text the contract may grow: origin, paymentMethod and account.type', () => {
    const body = {
      ...PAGE_OF_THREE,
      movements: [
        {
          ...EXPENSE,
          origin: 'rule',
          paymentMethod: 'crypto',
          account: { ...EXPENSE.account, type: 'brokerage' },
        },
      ],
    }

    const [movement] = parseMovementPage(body).movements
    expect(movement?.origin).toBe('rule')
    expect(movement?.paymentMethod).toBe('crypto')
    expect(movement?.account.type).toBe('brokerage')
  })

  it('names the endpoint and the field when movements is not an array', () => {
    expect(() => parseMovementPage({ ...PAGE_OF_THREE, movements: null })).toThrow(
      `GET ${MOVEMENTS_PATH}: movements is not an array`,
    )
  })

  it('rejects a body that is not an object', () => {
    expect(() => parseMovementPage([])).toThrow(ValidationError)
  })
})

describe('parseCategories (R7)', () => {
  it('maps the roots with their children', () => {
    const categories = parseCategories(CATEGORY_TREE)

    expect(categories.map((category) => category.name)).toEqual(['Food', 'Salary'])
    expect(categories[0]?.children.map((child) => child.name)).toEqual(['Groceries', 'Restaurants'])
    expect(categories[0]?.children[0]?.parentId).toBe(1)
    expect(categories[1]?.children).toEqual([])
  })

  it('accepts an empty list', () => {
    expect(parseCategories([])).toEqual([])
  })

  it('rejects a response that is not an array', () => {
    expect(() => parseCategories({ categories: [] })).toThrow(
      `GET ${CATEGORIES_PATH}: response is not an array`,
    )
  })

  it('rejects an unknown kind', () => {
    expect(() => parseCategories([{ ...CATEGORY_TREE[0], kind: 'both' }])).toThrow(ValidationError)
  })
})

describe('the two read requests (R13)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getMovements does one GET to /api/movements with the built querystring', async () => {
    const api = mockApi({ movements: json(PAGE_OF_THREE) })

    const page = await getMovements({ status: 'pending_review', page: 1, pageSize: 100 })

    expect(api.calls).toHaveLength(1)
    expect(api.calls[0]?.method).toBe('GET')
    expect(api.calls[0]?.path).toBe(MOVEMENTS_PATH)
    expect(api.movementQueries()).toEqual(['status=pending_review&page=1&pageSize=100'])
    expect(page.pagination.total).toBe(132)
  })

  it('getMovements asks for the bare path when there is nothing to filter', async () => {
    const api = mockApi({ movements: json(PAGE_OF_THREE) })

    await getMovements({})

    expect(api.movementQueries()).toEqual([''])
  })

  it('getCategories does one GET to /api/categories', async () => {
    const api = mockApi({ categories: json(CATEGORY_TREE) })

    const categories = await getCategories()

    expect(api.calls).toEqual([
      { method: 'GET', path: CATEGORIES_PATH, query: new URLSearchParams() },
    ])
    expect(categories).toHaveLength(2)
  })
})

describe('updateMovement (R4, R5, R9)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const CONFIRMED = changed(EXPENSE, { status: 'confirmed' })

  it('PATCHes the movement path with a JSON body and nothing but categoryId', async () => {
    const api = mockApi({ patch: json(changed(EXPENSE, { categoryId: 2, category: GROCERIES })) })

    const movement = await updateMovement(10, { categoryId: 2 })

    expect(api.calls).toHaveLength(1)
    const [call] = api.patches()
    expect(call?.method).toBe('PATCH')
    expect(call?.path).toBe(`${MOVEMENTS_PATH}/10`)
    expect(call?.contentType).toBe('application/json')
    expect(call?.body).toEqual({ categoryId: 2 })
    expect(Object.keys(call?.body as object)).toEqual(['categoryId'])
    expect(movement.categoryId).toBe(2)
    expect(movement.category?.name).toBe('Groceries')
  })

  it('sends categoryId: null to remove the category, and keeps the key', async () => {
    const api = mockApi({ patch: json(changed(EXPENSE, { categoryId: null, category: null })) })

    await updateMovement(10, { categoryId: null })

    expect(api.patches()[0]?.body).toEqual({ categoryId: null })
  })

  it('sends only the status when only the status changes (R5)', async () => {
    const api = mockApi({ patch: json(CONFIRMED) })

    const movement = await updateMovement(10, { status: 'confirmed' })

    expect(api.patches()[0]?.body).toEqual({ status: 'confirmed' })
    expect(movement.status).toBe('confirmed')
  })

  it('refuses an empty change without calling the client: the contract answers 400', async () => {
    const api = mockApi({ patch: json(CONFIRMED) })

    await expect(updateMovement(10, {})).rejects.toThrow(ValidationError)
    expect(api.calls).toHaveLength(0)
  })

  it('rejects an answer that is not a movement', async () => {
    mockApi({ patch: json({ id: 10 }) })

    await expect(updateMovement(10, { status: 'confirmed' })).rejects.toThrow(
      `PATCH ${MOVEMENTS_PATH}/:id: response.type is not one of expense | income | neutral`,
    )
  })
})

describe('updateMovements (R6, R7, R9)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const three = [10, 11, 12]
  const ANSWER = bulkResult([
    changed(EXPENSE, { status: 'confirmed' }),
    changed(INCOME, { status: 'confirmed' }),
  ])

  it('PATCHes the collection once with ids and status, and nothing else', async () => {
    const api = mockApi({ patch: json(ANSWER) })

    const result = await updateMovements({ ids: three, status: 'confirmed' })

    expect(api.calls).toHaveLength(1)
    const [call] = api.patches()
    expect(call?.path).toBe(MOVEMENTS_PATH)
    expect(call?.contentType).toBe('application/json')
    expect(call?.body).toEqual({ ids: three, status: 'confirmed' })
    expect(Object.keys(call?.body as object).sort()).toEqual(['ids', 'status'])
    expect(result.updated).toBe(2)
    expect(result.movements.map((movement) => movement.id)).toEqual([10, 11])
  })

  it('deduplicates the ids before sending them: the contract rejects repeats', async () => {
    const api = mockApi({ patch: json(ANSWER) })

    await updateMovements({ ids: [10, 11, 10, 12, 11], categoryId: 2 })

    expect(api.patches()[0]?.body).toEqual({ ids: three, categoryId: 2 })
  })

  it('sends the whole page in one request when it is exactly the cap (T0.2)', async () => {
    const api = mockApi({ patch: json(bulkResult([])) })
    const ids = Array.from({ length: MAX_IDS }, (_item, index) => index + 1)

    await updateMovements({ ids, status: 'confirmed' })

    expect(api.calls).toHaveLength(1)
    const sent = api.patches()[0]?.body as { ids: number[] } | undefined
    expect(sent?.ids).toHaveLength(MAX_IDS)
  })

  it('refuses more than the cap, and an empty selection, without touching the network', async () => {
    const api = mockApi({ patch: json(bulkResult([])) })
    const tooMany = Array.from({ length: MAX_IDS + 1 }, (_item, index) => index + 1)

    await expect(updateMovements({ ids: tooMany, status: 'confirmed' })).rejects.toThrow(
      `PATCH ${MOVEMENTS_PATH}: ids is not between 1 and 200 movements`,
    )
    await expect(updateMovements({ ids: [], status: 'confirmed' })).rejects.toThrow(ValidationError)
    expect(api.calls).toHaveLength(0)
  })

  it('refuses a body with neither categoryId nor status', async () => {
    const api = mockApi({ patch: json(bulkResult([])) })

    await expect(updateMovements({ ids: three })).rejects.toThrow(ValidationError)
    expect(api.calls).toHaveLength(0)
  })

  it('rejects an answer that does not carry the movements it changed', async () => {
    mockApi({ patch: json({ updated: 2 }) })

    await expect(updateMovements({ ids: three, status: 'confirmed' })).rejects.toThrow(
      `PATCH ${MOVEMENTS_PATH}: movements is not an array`,
    )
  })
})

describe('parseBulkResult (R10)', () => {
  it('maps the count and the movements already changed', () => {
    const result = parseBulkResult(bulkResult([changed(EXPENSE, { status: 'confirmed' })]))

    expect(result.updated).toBe(1)
    expect(result.movements[0]?.status).toBe('confirmed')
  })

  it('rejects a count that is not a number', () => {
    expect(() => parseBulkResult({ updated: '1', movements: [] })).toThrow(ValidationError)
  })
})
