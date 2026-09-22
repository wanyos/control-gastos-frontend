// Review queue data access (features 15 and 16). Two GETs to read the queue and the
// two PATCHes that write the only editable fields of a movement — `categoryId` and
// `status`; every body is built field by field, so nothing else can ever travel.
// Per ADR-002 the raw responses are mapped to the frontend types with
// the shared boundary checks, so a contract drift surfaces as a ValidationError
// naming the failing field. Closed enumerations of the contract (`type`, `status`,
// `kind`) are strict; open text (`origin`, `paymentMethod`, `account.type`,
// `currency`) is accepted as it comes: a new backend value must not blank the list.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { createValidators } from '@/shared/validation'
import type { Validators } from '@/shared/validation'

import { MAX_IDS } from './actions'

import type {
  BulkResult,
  BulkUpdate,
  Category,
  CategoryKind,
  Movement,
  MovementChanges,
  MovementAccount,
  MovementCategory,
  MovementPage,
  MovementQuery,
  MovementStatus,
  MovementType,
  Pagination,
  Totals,
} from './types'

export { MAX_IDS }

/** Paths are absolute so they resolve against the API origin (see docs/stack.md). */
export const MOVEMENTS_PATH = '/api/movements'
export const CATEGORIES_PATH = '/api/categories'

const MOVEMENT_TYPES: readonly MovementType[] = ['expense', 'income', 'neutral']
const MOVEMENT_STATUSES: readonly MovementStatus[] = ['confirmed', 'pending_review']
const CATEGORY_KINDS: readonly CategoryKind[] = ['expense', 'income']

const movementChecks = createValidators(`GET ${MOVEMENTS_PATH}`)
const categoryChecks = createValidators(`GET ${CATEGORIES_PATH}`)
const updateChecks = createValidators(`PATCH ${MOVEMENTS_PATH}/:id`)
const bulkChecks = createValidators(`PATCH ${MOVEMENTS_PATH}`)

/**
 * Querystring of `GET /api/movements`: empty values are omitted, so a cleared
 * filter never travels. `uncategorized` is only added when true (the contract says
 * `uncategorized=false` filters nothing) and it wins over `categoryId`: sending both
 * is a 400, and this is the last barrier before it (filters.ts already resolves it).
 */
export function buildMovementsQuery(query: MovementQuery): string {
  const params = new URLSearchParams()
  const add = (key: string, value: string | number | undefined): void => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }

  add('status', query.status)
  add('accountId', query.accountId)
  add('from', query.from)
  add('to', query.to)
  add('type', query.type)
  if (query.uncategorized === true) {
    params.set('uncategorized', 'true')
  } else {
    add('categoryId', query.categoryId)
  }
  add('q', query.q?.trim())
  add('page', query.page)
  add('pageSize', query.pageSize)

  return params.toString()
}

function parseAccount(v: Validators, raw: unknown, path: string): MovementAccount {
  const account = v.asObject(raw, path)
  return {
    id: v.asInteger(account.id, `${path}.id`),
    iban: v.asText(account.iban, `${path}.iban`),
    bank: v.asText(account.bank, `${path}.bank`),
    alias: v.asString(account.alias, `${path}.alias`),
    type: v.asText(account.type, `${path}.type`),
  }
}

function parseCategory(v: Validators, raw: unknown, path: string): MovementCategory | null {
  if (raw === null) {
    return null
  }
  const category = v.asObject(raw, path)
  return {
    id: v.asInteger(category.id, `${path}.id`),
    name: v.asString(category.name, `${path}.name`),
    kind: v.asMember(category.kind, CATEGORY_KINDS, `${path}.kind`),
    parentId:
      category.parentId === null ? null : v.asInteger(category.parentId, `${path}.parentId`),
  }
}

/** The whole movement is parsed, not only the five painted fields: the F16 needs the rest. */
export function parseMovement(v: Validators, raw: unknown, path: string): Movement {
  const movement = v.asObject(raw, path)
  return {
    id: v.asInteger(movement.id, `${path}.id`),
    type: v.asMember(movement.type, MOVEMENT_TYPES, `${path}.type`),
    bookingDate: v.asDateOnly(movement.bookingDate, `${path}.bookingDate`),
    valueDate: v.asDateOnly(movement.valueDate, `${path}.valueDate`),
    amount: v.asDecimal(movement.amount, `${path}.amount`),
    description: v.asString(movement.description, `${path}.description`),
    balanceAfter: v.asNullableDecimal(movement.balanceAfter, `${path}.balanceAfter`),
    currency: v.asString(movement.currency, `${path}.currency`),
    note: movement.note === null ? null : v.asString(movement.note, `${path}.note`),
    accountId: v.asInteger(movement.accountId, `${path}.accountId`),
    account: parseAccount(v, movement.account, `${path}.account`),
    categoryId:
      movement.categoryId === null ? null : v.asInteger(movement.categoryId, `${path}.categoryId`),
    category: parseCategory(v, movement.category, `${path}.category`),
    paymentMethod:
      movement.paymentMethod === null
        ? null
        : v.asString(movement.paymentMethod, `${path}.paymentMethod`),
    origin: v.asText(movement.origin, `${path}.origin`),
    status: v.asMember(movement.status, MOVEMENT_STATUSES, `${path}.status`),
    transferId:
      movement.transferId === null ? null : v.asText(movement.transferId, `${path}.transferId`),
    daySequence:
      movement.daySequence === null
        ? null
        : v.asInteger(movement.daySequence, `${path}.daySequence`),
    createdAt: v.asText(movement.createdAt, `${path}.createdAt`),
    updatedAt: v.asText(movement.updatedAt, `${path}.updatedAt`),
  }
}

function parsePagination(v: Validators, raw: unknown, path: string): Pagination {
  const pagination = v.asObject(raw, path)
  return {
    page: v.asInteger(pagination.page, `${path}.page`),
    pageSize: v.asInteger(pagination.pageSize, `${path}.pageSize`),
    total: v.asInteger(pagination.total, `${path}.total`),
    totalPages: v.asInteger(pagination.totalPages, `${path}.totalPages`),
  }
}

function parseTotals(v: Validators, raw: unknown, path: string): Totals {
  const totals = v.asObject(raw, path)
  return {
    income: v.asDecimal(totals.income, `${path}.income`),
    expense: v.asDecimal(totals.expense, `${path}.expense`),
    net: v.asDecimal(totals.net, `${path}.net`),
  }
}

/** Maps `GET /api/movements`, or throws ValidationError. */
export function parseMovementPage(raw: unknown): MovementPage {
  const v = movementChecks
  const body = v.asObject(raw, 'response')
  return {
    movements: v
      .asArray(body.movements, 'movements')
      .map((item, i) => parseMovement(v, item, `movements[${i}]`)),
    pagination: parsePagination(v, body.pagination, 'pagination'),
    totals: parseTotals(v, body.totals, 'totals'),
  }
}

/** Maps `GET /api/categories`, or throws ValidationError. Recursive: one extra level would not break it. */
export function parseCategories(raw: unknown): Category[] {
  const v = categoryChecks

  const parseNode = (value: unknown, path: string): Category => {
    const category = v.asObject(value, path)
    return {
      id: v.asInteger(category.id, `${path}.id`),
      name: v.asString(category.name, `${path}.name`),
      kind: v.asMember(category.kind, CATEGORY_KINDS, `${path}.kind`),
      parentId:
        category.parentId === null ? null : v.asInteger(category.parentId, `${path}.parentId`),
      createdAt: v.asText(category.createdAt, `${path}.createdAt`),
      children: v
        .asArray(category.children, `${path}.children`)
        .map((child, i) => parseNode(child, `${path}.children[${i}]`)),
    }
  }

  return v.asArray(raw, 'response').map((item, i) => parseNode(item, `[${i}]`))
}

/** Lists movements. Read only: no side effects on the backend. */
export async function getMovements(
  query: MovementQuery,
  client: HttpClient = http,
): Promise<MovementPage> {
  const search = buildMovementsQuery(query)
  const path = search === '' ? MOVEMENTS_PATH : `${MOVEMENTS_PATH}?${search}`
  return parseMovementPage(await client<unknown>(path))
}

/** Lists the root categories with their children. Read only. */
export async function getCategories(client: HttpClient = http): Promise<Category[]> {
  return parseCategories(await client<unknown>(CATEGORIES_PATH))
}

/** Maps the movement `PATCH /api/movements/:id` answers with, or throws ValidationError. */
export function parseUpdatedMovement(raw: unknown): Movement {
  return parseMovement(updateChecks, raw, 'response')
}

/** Maps `PATCH /api/movements`, or throws ValidationError. */
export function parseBulkResult(raw: unknown): BulkResult {
  const v = bulkChecks
  const body = v.asObject(raw, 'response')
  return {
    updated: v.asInteger(body.updated, 'updated'),
    movements: v
      .asArray(body.movements, 'movements')
      .map((item, i) => parseMovement(v, item, `movements[${i}]`)),
  }
}

/**
 * The body of both PATCHes, built field by field: a spread of an object coming from
 * the view could carry a property the contract answers 400 to (R9). `categoryId`
 * travels when the key is present, so `null` — remove the category — does travel.
 */
function changesBody(changes: MovementChanges): MovementChanges {
  const body: MovementChanges = {}
  if ('categoryId' in changes) body.categoryId = changes.categoryId ?? null
  if (changes.status !== undefined) body.status = changes.status
  return body
}

/** The PATCH wire format: JSON in, JSON out. */
const patch = (body: unknown): RequestInit => ({
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Writes the two editable fields of one movement. */
export async function updateMovement(
  id: number,
  changes: MovementChanges,
  client: HttpClient = http,
): Promise<Movement> {
  const body = changesBody(changes)
  if (Object.keys(body).length === 0) {
    updateChecks.reject('body', 'a change of categoryId or status')
  }
  return parseUpdatedMovement(await client<unknown>(`${MOVEMENTS_PATH}/${id}`, patch(body)))
}

/**
 * Writes the same change on many movements in one request. The ids are deduplicated
 * and the contract's limits are checked here, before the network: the backend answers
 * 400 to an empty `ids`, to repeated ids and to more than MAX_IDS.
 */
export async function updateMovements(
  update: BulkUpdate,
  client: HttpClient = http,
): Promise<BulkResult> {
  const ids = [...new Set(update.ids)]
  if (ids.length === 0 || ids.length > MAX_IDS) {
    bulkChecks.reject('ids', `between 1 and ${MAX_IDS} movements`)
  }
  const changes = changesBody(update)
  if (Object.keys(changes).length === 0) {
    bulkChecks.reject('body', 'a change of categoryId or status')
  }
  return parseBulkResult(await client<unknown>(MOVEMENTS_PATH, patch({ ids, ...changes })))
}
