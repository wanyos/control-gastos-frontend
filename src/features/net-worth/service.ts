// Net worth data access (feature 7). Uses the shared HTTP client
// (`@/services/http`); there is no second fetch anywhere in this file.
// Per ADR-002 the service maps the raw API response to the frontend types:
// here that mapping is a boundary check, so a contract drift surfaces as a
// ValidationError instead of leaking `undefined` into the UI.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { toCents } from '@/shared/money'
import { createValidators } from '@/shared/validation'

import type {
  AccountType,
  DepositEarning,
  DepositEarnings,
  DepositMaturity,
  DepositStatus,
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

const {
  asObject,
  asArray,
  asText,
  asInteger,
  asFlag,
  asDecimal,
  asNullableDecimal,
  asDateOnly,
  asNullableDateOnly,
  asMember,
} = createValidators(`GET ${NET_WORTH_PATH}`)

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
    lastDataDate: asNullableDateOnly(body.lastDataDate, 'lastDataDate'),
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

// GET /api/investments/deposits (feature 38): read only, no parameters.

export const DEPOSITS_PATH = '/api/investments/deposits'

const DEPOSIT_STATUSES: readonly DepositStatus[] = [
  'active',
  'matured',
  'cancelled',
  'maturity_not_found',
  'ambiguous',
  'below_principal',
]

/** Statuses whose entry carries the maturity movement (contract table). */
const WITH_MATURITY: readonly DepositStatus[] = ['matured', 'below_principal']

// Own validators, so a drift names this path and not the net worth one.
const deposit = createValidators(`GET ${DEPOSITS_PATH}`)

function parseMaturity(raw: unknown, path: string): DepositMaturity {
  const maturity = deposit.asObject(raw, path)
  return {
    movementId: deposit.asInteger(maturity.movementId, `${path}.movementId`),
    date: deposit.asDateOnly(maturity.date, `${path}.date`),
    amount: deposit.asDecimal(maturity.amount, `${path}.amount`),
  }
}

function parseDeposit(raw: unknown, path: string): DepositEarning {
  const entry = deposit.asObject(raw, path)
  const status = deposit.asMember(entry.status, DEPOSIT_STATUSES, `${path}.status`)

  // Only `matured` carries a figure; any other status sends null (design §3).
  let earned: string | null = null
  if (status === 'matured') {
    earned = deposit.asDecimal(entry.earned, `${path}.earned`)
  } else if (entry.earned !== null) {
    deposit.reject(`${path}.earned`, `null on a deposit that is not matured`)
  }

  let maturity: DepositMaturity | null = null
  if (WITH_MATURITY.includes(status)) {
    maturity = parseMaturity(entry.maturity, `${path}.maturity`)
  } else if (entry.maturity !== null) {
    deposit.reject(`${path}.maturity`, `null on a ${status} deposit`)
  }

  return {
    id: deposit.asInteger(entry.id, `${path}.id`),
    bank: deposit.asText(entry.bank, `${path}.bank`),
    name: deposit.asText(entry.name, `${path}.name`),
    openedAt: deposit.asNullableDateOnly(entry.openedAt, `${path}.openedAt`),
    closedAt: deposit.asNullableDateOnly(entry.closedAt, `${path}.closedAt`),
    principal: deposit.asNullableDecimal(entry.principal, `${path}.principal`),
    expectedGain: deposit.asNullableDecimal(entry.expectedGain, `${path}.expectedGain`),
    maturityDate: deposit.asNullableDateOnly(entry.maturityDate, `${path}.maturityDate`),
    status,
    earned,
    maturity,
    candidateMovementIds: deposit
      .asArray(entry.candidateMovementIds, `${path}.candidateMovementIds`)
      .map((id, index) => deposit.asInteger(id, `${path}.candidateMovementIds[${index}]`)),
  }
}

/**
 * Maps the raw API payload to the frontend types, or throws ValidationError. That
 * includes a total that is not the sum of the matured deposits: it is checked,
 * never corrected nor shown (design §3).
 */
export function parseDepositEarnings(raw: unknown): DepositEarnings {
  const body = deposit.asObject(raw, 'response')
  const read: DepositEarnings = {
    asOf: deposit.asDateOnly(body.asOf, 'asOf'),
    deposits: deposit
      .asArray(body.deposits, 'deposits')
      .map((item, index) => parseDeposit(item, `deposits[${index}]`)),
    total: deposit.asDecimal(body.total, 'total'),
  }
  const sum = read.deposits.reduce(
    (cents, entry) => cents + (entry.earned === null ? 0n : toCents(entry.earned)),
    0n,
  )
  if (sum !== toCents(read.total)) {
    deposit.reject('total', 'the sum of the earned of the matured deposits')
  }
  return read
}

/** Only a GET of the path: no method, body nor querystring (the contract has none). */
export async function getDepositEarnings(client: HttpClient = http): Promise<DepositEarnings> {
  return parseDepositEarnings(await client<unknown>(DEPOSITS_PATH))
}
