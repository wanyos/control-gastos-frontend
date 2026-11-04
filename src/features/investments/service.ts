// HTTP access for the Investments screen (feature 40). Maps the raw API payload to the
// frontend types; any drift from the contract throws ValidationError naming the field.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { toCents } from '@/shared/money'
import { createValidators } from '@/shared/validation'

import type {
  ClosedGainsProduct,
  DepositConditions,
  ExcludedFromTotal,
  GainsProduct,
  GainsReason,
  GainsTotal,
  InvestmentGains,
  InvestmentType,
  PercentText,
} from './types'

// GET /api/investments/gains: read only, no parameters.

export const GAINS_PATH = '/api/investments/gains'

/** No account type here: a `savings_account` is a contract drift (R11). */
const INVESTMENT_TYPES: readonly InvestmentType[] = ['fund', 'etf', 'managed_portfolio', 'deposit']

const GAINS_REASONS: readonly GainsReason[] = [
  'no_photo',
  'gain_not_reported',
  'gain_percent_not_reported',
  'maturity_not_found',
  'ambiguous',
  'below_principal',
  'missing_conditions',
]

/** A percent as it comes: a photo's is not padded ("0.9"), a computed one has two decimals. */
const PERCENT = /^-?\d+(\.\d+)?$/

const gains = createValidators(`GET ${GAINS_PATH}`)

function asNullablePercent(value: unknown, path: string): PercentText | null {
  if (value === null) return null
  if (typeof value === 'string' && PERCENT.test(value)) return value
  return gains.reject(path, 'a percent string or null')
}

function asNullableReason(value: unknown, path: string): GainsReason | null {
  return value === null ? null : gains.asMember(value, GAINS_REASONS, path)
}

function parseConditions(raw: unknown, path: string): DepositConditions {
  const conditions = gains.asObject(raw, path)
  return {
    principal: gains.asNullableDecimal(conditions.principal, `${path}.principal`),
    interestRate: asNullablePercent(conditions.interestRate, `${path}.interestRate`),
    expectedGain: gains.asNullableDecimal(conditions.expectedGain, `${path}.expectedGain`),
    maturityDate: gains.asNullableDateOnly(conditions.maturityDate, `${path}.maturityDate`),
  }
}

function parseProduct(raw: unknown, path: string): GainsProduct {
  const entry = gains.asObject(raw, path)
  const type = gains.asMember(entry.type, INVESTMENT_TYPES, `${path}.type`)
  const product: GainsProduct = {
    id: gains.asInteger(entry.id, `${path}.id`),
    bank: gains.asText(entry.bank, `${path}.bank`),
    name: gains.asText(entry.name, `${path}.name`),
    type,
    openedAt: gains.asNullableDateOnly(entry.openedAt, `${path}.openedAt`),
    closedAt: gains.asNullableDateOnly(entry.closedAt, `${path}.closedAt`),
    invested: gains.asNullableDecimal(entry.invested, `${path}.invested`),
    currentValue: gains.asNullableDecimal(entry.currentValue, `${path}.currentValue`),
    gain: gains.asNullableDecimal(entry.gain, `${path}.gain`),
    gainPercent: asNullablePercent(entry.gainPercent, `${path}.gainPercent`),
    valuedAt: gains.asNullableDateOnly(entry.valuedAt, `${path}.valuedAt`),
    reason: asNullableReason(entry.reason, `${path}.reason`),
  }
  if (type === 'deposit') {
    product.conditions = parseConditions(entry.conditions, `${path}.conditions`)
  } else {
    product.uninvestedCash = gains.asNullableDecimal(entry.uninvestedCash, `${path}.uninvestedCash`)
  }
  return product
}

function parseClosedProduct(raw: unknown, path: string): ClosedGainsProduct {
  const entry = gains.asObject(raw, path)
  return {
    ...parseProduct(entry, path),
    closedOn: gains.asDateOnly(entry.closedOn, `${path}.closedOn`),
  }
}

function parseExcluded(raw: unknown, path: string): ExcludedFromTotal {
  const entry = gains.asObject(raw, path)
  return {
    productId: gains.asInteger(entry.productId, `${path}.productId`),
    name: gains.asText(entry.name, `${path}.name`),
    reason: gains.asMember(entry.reason, GAINS_REASONS, `${path}.reason`),
  }
}

function parseTotal(raw: unknown): GainsTotal {
  const total = gains.asObject(raw, 'total')
  return {
    gain: gains.asDecimal(total.gain, 'total.gain'),
    invested: gains.asDecimal(total.invested, 'total.invested'),
    gainPercent: asNullablePercent(total.gainPercent, 'total.gainPercent'),
    excluded: gains
      .asArray(total.excluded, 'total.excluded')
      .map((item, index) => parseExcluded(item, `total.excluded[${index}]`)),
  }
}

/**
 * Maps the raw API payload to the frontend types, or throws ValidationError. That
 * includes a total gain that is not the sum of the live gains: it is checked, never
 * corrected nor recalculated (spec 40, design §6).
 */
export function parseInvestmentGains(raw: unknown): InvestmentGains {
  const body = gains.asObject(raw, 'response')
  const read: InvestmentGains = {
    asOf: gains.asDateOnly(body.asOf, 'asOf'),
    total: parseTotal(body.total),
    live: gains
      .asArray(body.live, 'live')
      .map((item, index) => parseProduct(item, `live[${index}]`)),
    closed: gains
      .asArray(body.closed, 'closed')
      .map((item, index) => parseClosedProduct(item, `closed[${index}]`)),
  }
  const sum = read.live.reduce(
    (cents, product) => cents + (product.gain === null ? 0n : toCents(product.gain)),
    0n,
  )
  if (sum !== toCents(read.total.gain)) {
    gains.reject('total.gain', 'the sum of the gains of the live products')
  }
  return read
}

/** Only a GET of the path: no method, body nor querystring (the contract has none). */
export async function getInvestmentGains(client: HttpClient = http): Promise<InvestmentGains> {
  return parseInvestmentGains(await client<unknown>(GAINS_PATH))
}
