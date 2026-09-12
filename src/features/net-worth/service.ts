// Net worth data access (feature 7). Uses the shared HTTP client
// (`@/services/http`); there is no second fetch anywhere in this file.
// Per ADR-002 the service maps the raw API response to the frontend types:
// here that mapping is a boundary check, so a contract drift surfaces as a
// ValidationError instead of leaking `undefined` into the UI.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { ValidationError } from '@/shared/errors'

import type {
  AccountType,
  DateOnly,
  DecimalString,
  InvestmentProduct,
  NetWorth,
  NetWorthAccount,
  NetWorthAccounts,
  NetWorthInvestments,
  NetWorthIssue,
  NetWorthIssueReason,
  InvestmentProductType,
  MarketProductType,
} from './types'

/** Path is absolute so it always resolves against the API origin (see docs/stack.md). */
export const NET_WORTH_PATH = '/api/net-worth'

const ACCOUNT_TYPES: readonly AccountType[] = ['checking', 'savings']
const MARKET_TYPES: readonly MarketProductType[] = ['fund', 'etf', 'managed_portfolio']
const PRODUCT_TYPES: readonly InvestmentProductType[] = [
  ...MARKET_TYPES,
  'deposit',
  'savings_account',
]
const ISSUE_REASONS: readonly NetWorthIssueReason[] = [
  'no_valuation',
  'stale_valuation',
  'matured_not_closed',
]

const DECIMAL = /^-?\d+\.\d{2}$/
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

type RawObject = Record<string, unknown>

function reject(path: string, expected: string): never {
  throw new ValidationError(`GET ${NET_WORTH_PATH}: ${path} is not ${expected}`)
}

function asObject(value: unknown, path: string): RawObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    reject(path, 'an object')
  }
  return value as RawObject
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    reject(path, 'an array')
  }
  return value
}

function asText(value: unknown, path: string): string {
  if (typeof value !== 'string' || value === '') {
    reject(path, 'a non-empty string')
  }
  return value
}

function asInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    reject(path, 'an integer')
  }
  return value
}

function asFlag(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    reject(path, 'a boolean')
  }
  return value
}

/** Amounts stay strings end to end: parsing them as numbers would lose cents. */
function asDecimal(value: unknown, path: string): DecimalString {
  if (typeof value !== 'string' || !DECIMAL.test(value)) {
    reject(path, 'a decimal string with two decimals')
  }
  return value
}

function asNullableDecimal(value: unknown, path: string): DecimalString | null {
  return value === null ? null : asDecimal(value, path)
}

function asDateOnly(value: unknown, path: string): DateOnly {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) {
    reject(path, 'a YYYY-MM-DD date')
  }
  return value
}

function asNullableDateOnly(value: unknown, path: string): DateOnly | null {
  return value === null ? null : asDateOnly(value, path)
}

function asMember<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    reject(path, `one of ${allowed.join(' | ')}`)
  }
  return value as T
}

function parseAccount(raw: unknown, path: string): NetWorthAccount {
  const account = asObject(raw, path)
  return {
    id: asInteger(account.id, `${path}.id`),
    iban: asText(account.iban, `${path}.iban`),
    bank: asText(account.bank, `${path}.bank`),
    alias: asText(account.alias, `${path}.alias`),
    type: asMember(account.type, ACCOUNT_TYPES, `${path}.type`),
    balance: asDecimal(account.balance, `${path}.balance`),
  }
}

function parseAccounts(raw: unknown, path: string): NetWorthAccounts {
  const accounts = asObject(raw, path)
  return {
    total: asDecimal(accounts.total, `${path}.total`),
    accounts: asArray(accounts.accounts, `${path}.accounts`).map((item, index) =>
      parseAccount(item, `${path}.accounts[${index}]`),
    ),
  }
}

function parseProduct(raw: unknown, path: string): InvestmentProduct {
  const product = asObject(raw, path)
  const base = {
    id: asInteger(product.id, `${path}.id`),
    bank: asText(product.bank, `${path}.bank`),
    name: asText(product.name, `${path}.name`),
  }
  const type = asMember(product.type, PRODUCT_TYPES, `${path}.type`)

  if (type === 'deposit') {
    return {
      ...base,
      type,
      value: asDecimal(product.value, `${path}.value`),
      principal: asDecimal(product.principal, `${path}.principal`),
      expectedGain: asDecimal(product.expectedGain, `${path}.expectedGain`),
      maturityDate: asDateOnly(product.maturityDate, `${path}.maturityDate`),
      matured: asFlag(product.matured, `${path}.matured`),
    }
  }

  if (type === 'savings_account') {
    return {
      ...base,
      type,
      value: asNullableDecimal(product.value, `${path}.value`),
      valuedAt: asNullableDateOnly(product.valuedAt, `${path}.valuedAt`),
      stale: asFlag(product.stale, `${path}.stale`),
    }
  }

  return {
    ...base,
    type,
    value: asNullableDecimal(product.value, `${path}.value`),
    marketValue: asNullableDecimal(product.marketValue, `${path}.marketValue`),
    uninvestedCash: asNullableDecimal(product.uninvestedCash, `${path}.uninvestedCash`),
    valuedAt: asNullableDateOnly(product.valuedAt, `${path}.valuedAt`),
    stale: asFlag(product.stale, `${path}.stale`),
  }
}

function parseIssue(raw: unknown, path: string): NetWorthIssue {
  const issue = asObject(raw, path)
  return {
    productId: asInteger(issue.productId, `${path}.productId`),
    name: asText(issue.name, `${path}.name`),
    reason: asMember(issue.reason, ISSUE_REASONS, `${path}.reason`),
    valuedAt: asNullableDateOnly(issue.valuedAt, `${path}.valuedAt`),
  }
}

function parseInvestments(raw: unknown, path: string): NetWorthInvestments {
  const investments = asObject(raw, path)
  return {
    total: asDecimal(investments.total, `${path}.total`),
    products: asArray(investments.products, `${path}.products`).map((item, index) =>
      parseProduct(item, `${path}.products[${index}]`),
    ),
    issues: asArray(investments.issues, `${path}.issues`).map((item, index) =>
      parseIssue(item, `${path}.issues[${index}]`),
    ),
  }
}

/** Maps the raw API payload to the frontend types, or throws ValidationError. */
export function parseNetWorth(raw: unknown): NetWorth {
  const body = asObject(raw, 'response')
  return {
    asOf: asDateOnly(body.asOf, 'asOf'),
    total: asDecimal(body.total, 'total'),
    accounts: parseAccounts(body.accounts, 'accounts'),
    investments: parseInvestments(body.investments, 'investments'),
  }
}

/**
 * Fetches the current net worth. The client is injectable for tests and for a
 * future store; by default it is the shared client bound to appConfig.
 */
export async function getNetWorth(client: HttpClient = http): Promise<NetWorth> {
  return parseNetWorth(await client<unknown>(NET_WORTH_PATH))
}
