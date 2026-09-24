// Reading the movements list, shared by every feature that needs it (feature 18).
// It started in `features/review` (feature 15) and moved here untouched when a
// second feature — the rule match preview — needed the same call: architecture.md
// says a piece two features need lives in `shared/`, and `category-rules` may not
// import from `review` (that dependency only goes one way). `review/types.ts`,
// `review/service.ts` and `review/filters.ts` re-export it, so nothing that was
// already importing it had to change.
//
// Only the READ half lives here: the two PATCHes that write a movement stayed in
// `features/review`, the only screen that writes them.
// Per ADR-002 the raw response is mapped to the frontend types with the shared
// boundary checks, so a contract drift surfaces as a ValidationError naming the
// failing field. Closed enumerations of the contract (`type`, `status`, `kind`) are
// strict; open text (`origin`, `paymentMethod`, `account.type`, `currency`) is
// accepted as it comes: a new backend value must not blank the list.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { CATEGORY_KINDS } from '@/shared/categories'
import type { CategoryKind } from '@/shared/categories'
import { createValidators } from '@/shared/validation'
import type { Validators } from '@/shared/validation'

export type DecimalString = string
export type DateOnly = string

export type MovementType = 'expense' | 'income' | 'neutral'
export type MovementStatus = 'confirmed' | 'pending_review'

/** The account as it travels embedded in a movement (no `balance`). */
export interface MovementAccount {
  id: number
  iban: string
  bank: string
  alias: string
  /** Open text: a new account type must not break the list. */
  type: string
}

export interface MovementCategory {
  id: number
  name: string
  kind: CategoryKind
  parentId: number | null
}

export interface Movement {
  id: number
  type: MovementType
  bookingDate: DateOnly
  valueDate: DateOnly
  /** Always positive; the sign comes from `type`. */
  amount: DecimalString
  description: string
  balanceAfter: DecimalString | null
  currency: string
  note: string | null
  accountId: number
  account: MovementAccount
  categoryId: number | null
  category: MovementCategory | null
  /** Open text, always null today. */
  paymentMethod: string | null
  /** Open text. */
  origin: string
  status: MovementStatus
  transferId: string | null
  daySequence: number | null
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Totals {
  income: DecimalString
  expense: DecimalString
  net: DecimalString
}

export interface MovementPage {
  movements: Movement[]
  pagination: Pagination
  totals: Totals
}

/**
 * What a request to `GET /api/movements` asks for. `categoryId` and
 * `uncategorized` are mutually exclusive (the backend answers 400 to both).
 */
export interface MovementQuery {
  status?: MovementStatus
  accountId?: number
  from?: string
  to?: string
  type?: MovementType
  categoryId?: number
  uncategorized?: true
  q?: string
  page?: number
  pageSize?: number
}

/** Paths are absolute so they resolve against the API origin (see docs/stack.md). */
export const MOVEMENTS_PATH = '/api/movements'

/**
 * Long enough to swallow a burst of keystrokes, short enough to feel live. Shared
 * by the search box of the queue (feature 15) and by the rule preview (feature 18):
 * two different waits in the same app would be noise.
 */
export const SEARCH_DEBOUNCE_MS = 350

const MOVEMENT_TYPES: readonly MovementType[] = ['expense', 'income', 'neutral']
const MOVEMENT_STATUSES: readonly MovementStatus[] = ['confirmed', 'pending_review']

const movementChecks = createValidators(`GET ${MOVEMENTS_PATH}`)

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

/** Lists movements. Read only: no side effects on the backend. */
export async function getMovements(
  query: MovementQuery,
  client: HttpClient = http,
): Promise<MovementPage> {
  const search = buildMovementsQuery(query)
  const path = search === '' ? MOVEMENTS_PATH : `${MOVEMENTS_PATH}?${search}`
  return parseMovementPage(await client<unknown>(path))
}
