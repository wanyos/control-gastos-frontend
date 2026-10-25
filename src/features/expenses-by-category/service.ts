// The spending by category (feature 37): one read, `GET /api/expenses-by-category`. No
// function here takes a method or a body, so there is no way to write from this feature.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { ValidationError } from '@/shared/errors'
import { sumAmounts, toCents } from '@/shared/money'
import { createValidators } from '@/shared/validation'

import type {
  DateRange,
  ExpenseGroup,
  ExpenseLine,
  ExpensesByCategory,
  LineCategory,
  LineMovement,
  PeriodQuery,
} from './types'

/** Path is absolute so it always resolves against the API origin (see docs/stack.md). */
export const EXPENSES_BY_CATEGORY_PATH = '/api/expenses-by-category'

const CONTEXT = `GET ${EXPENSES_BY_CATEGORY_PATH}`
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR = /^\d{4}$/
const COMPARES = ['previous-month', 'same-month-last-year', 'previous-year'] as const
const CHANGES = ['new', 'gone'] as const

const {
  reject,
  asObject,
  asArray,
  asText,
  asString,
  asInteger,
  asFlag,
  asDecimal,
  asNullableDecimal,
  asDateOnly,
  asMember,
} = createValidators(CONTEXT)

/**
 * `month=2026-09&compare=previous-month` or `year=2026`. The comparison always travels
 * with a month and never with a year: the contract answers 400 to that (R3–R5).
 */
export function expensesQueryString(query: PeriodQuery): string {
  const params =
    query.mode === 'month'
      ? new URLSearchParams({ month: query.month, compare: query.compare })
      : new URLSearchParams({ year: query.year })
  return params.toString()
}

function parseRange(raw: unknown, path: string): DateRange {
  const range = asObject(raw, path)
  return {
    from: asDateOnly(range.from, `${path}.from`),
    to: asDateOnly(range.to, `${path}.to`),
    months: asInteger(range.months, `${path}.months`),
  }
}

function asNullableMatch(
  value: unknown,
  pattern: RegExp,
  path: string,
  expected: string,
): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || !pattern.test(value)) return reject(path, expected)
  return value
}

function parseCategory(raw: unknown, path: string): LineCategory | null {
  if (raw === null) return null
  const category = asObject(raw, path)
  return {
    id: asInteger(category.id, `${path}.id`),
    name: asText(category.name, `${path}.name`),
    parentId: category.parentId === null ? null : asInteger(category.parentId, `${path}.parentId`),
    isFixed: asFlag(category.isFixed, `${path}.isFixed`),
  }
}

function parseMovement(raw: unknown, path: string): LineMovement {
  const movement = asObject(raw, path)
  return {
    id: asInteger(movement.id, `${path}.id`),
    bookingDate: asDateOnly(movement.bookingDate, `${path}.bookingDate`),
    description: asString(movement.description, `${path}.description`),
    amount: asDecimal(movement.amount, `${path}.amount`),
    accountId: asInteger(movement.accountId, `${path}.accountId`),
  }
}

function parseLine(raw: unknown, path: string): ExpenseLine {
  const line = asObject(raw, path)
  return {
    category: parseCategory(line.category, `${path}.category`),
    amount: asDecimal(line.amount, `${path}.amount`),
    comparedAmount: asDecimal(line.comparedAmount, `${path}.comparedAmount`),
    difference: asDecimal(line.difference, `${path}.difference`),
    change: line.change === null ? null : asMember(line.change, CHANGES, `${path}.change`),
    monthlyAmount: asNullableDecimal(line.monthlyAmount, `${path}.monthlyAmount`),
    movements: asArray(line.movements, `${path}.movements`).map((item, index) =>
      parseMovement(item, `${path}.movements[${index}]`),
    ),
  }
}

function parseGroup(raw: unknown, path: string): ExpenseGroup {
  const group = asObject(raw, path)
  const read: ExpenseGroup = {
    amount: asDecimal(group.amount, `${path}.amount`),
    comparedAmount: asDecimal(group.comparedAmount, `${path}.comparedAmount`),
    difference: asDecimal(group.difference, `${path}.difference`),
    lines: asArray(group.lines, `${path}.lines`).map((item, index) =>
      parseLine(item, `${path}.lines[${index}]`),
    ),
  }
  // Only `amount` is checked: the rest is shown as it comes (design §3).
  if (toCents(sumAmounts(read.lines.map((line) => line.amount))) !== toCents(read.amount)) {
    throw new ValidationError(`${CONTEXT}: ${path}.lines do not add up to ${path}.amount`)
  }
  return read
}

/**
 * Maps the raw API payload to the frontend types, or throws ValidationError. That
 * includes a response whose groups or lines do not add up: a total that contradicts
 * what is below it must not be shown (R15).
 */
export function parseExpensesByCategory(raw: unknown): ExpensesByCategory {
  const body = asObject(raw, 'response')
  const period = asObject(body.period, 'period')
  const read: ExpensesByCategory = {
    period: {
      ...parseRange(period, 'period'),
      month: asNullableMatch(period.month, MONTH_KEY, 'period.month', 'a YYYY-MM month or null'),
      year: asNullableMatch(period.year, YEAR, 'period.year', 'a YYYY year or null'),
    },
    compared: parseRange(body.compared, 'compared'),
    compare: asMember(body.compare, COMPARES, 'compare'),
    amount: asDecimal(body.amount, 'amount'),
    comparedAmount: asDecimal(body.comparedAmount, 'comparedAmount'),
    difference: asDecimal(body.difference, 'difference'),
    fixed: parseGroup(body.fixed, 'fixed'),
    variable: parseGroup(body.variable, 'variable'),
  }
  if (toCents(sumAmounts([read.fixed.amount, read.variable.amount])) !== toCents(read.amount)) {
    throw new ValidationError(`${CONTEXT}: fixed and variable do not add up to amount`)
  }
  return read
}

/** The client is injectable for tests; by default it is the shared client. */
export async function getExpensesByCategory(
  query: PeriodQuery,
  client: HttpClient = http,
): Promise<ExpensesByCategory> {
  return parseExpensesByCategory(
    await client<unknown>(`${EXPENSES_BY_CATEGORY_PATH}?${expensesQueryString(query)}`),
  )
}
