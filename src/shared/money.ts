// Exact money arithmetic and es-ES / en-GB formatting (feature 9).
// Amounts arrive as decimal strings with two decimals. They are summed as
// integer cents in bigint and formatted from the exact string, so no float ever
// touches a cent (see specs/09-net-worth-view/design.md §3).

import { ValidationError } from '@/shared/errors'

import type { DateOnly, DecimalString } from '@/features/net-worth/types'

const DECIMAL = /^(-?)(\d+)\.(\d{2})$/
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const NUMERIC = /^-?\d+(\.\d+)?$/

// Immutable formatters, not state. `useGrouping: 'always'` is mandatory: es-ES
// does not group 4-digit numbers by default (CLDR minimum grouping digits).
const MONEY_FORMAT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always',
})
const PERCENT_FORMAT = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: 'always',
})
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Narrows a checked string so Intl formats it as an exact decimal, not a float. */
function isNumericLiteral(value: string): value is `${number}` {
  return NUMERIC.test(value)
}

/** `"12480.55"` → `1248055n`; `"-0.50"` → `-50n`. */
export function toCents(amount: DecimalString): bigint {
  const match = DECIMAL.exec(amount)
  if (!match) {
    throw new ValidationError(`${JSON.stringify(amount)} is not a decimal string with two decimals`)
  }
  const [, sign, units = '0', cents = '00'] = match
  const absolute = BigInt(units) * 100n + BigInt(cents)
  return sign === '-' ? -absolute : absolute
}

/** `1248055n` → `"12480.55"`. */
export function fromCents(cents: bigint): DecimalString {
  const absolute = cents < 0n ? -cents : cents
  const units = absolute / 100n
  const rest = String(absolute % 100n).padStart(2, '0')
  return `${cents < 0n ? '-' : ''}${units}.${rest}`
}

export function sumAmounts(amounts: readonly DecimalString[]): DecimalString {
  return fromCents(amounts.reduce((sum, amount) => sum + toCents(amount), 0n))
}

/**
 * Share of `part` over `total` in tenths of a percentage point (383 = 38,3 %),
 * rounded half away from zero in a single pass. `null` when `total <= 0`.
 */
export function sharePermille(part: DecimalString, total: DecimalString): number | null {
  const whole = toCents(total)
  if (whole <= 0n) {
    return null
  }
  const scaled = toCents(part) * 1000n
  const quotient = scaled / whole
  const remainder = scaled % whole
  const absRemainder = remainder < 0n ? -remainder : remainder
  const rounded = absRemainder * 2n >= whole ? quotient + (scaled < 0n ? -1n : 1n) : quotient
  // A permille is a small integer ratio, not an amount: safe as a number.
  return Number(rounded)
}

/** `"1234.56"` → `1.234,56 €` (the space before `€` is U+00A0). */
export function formatMoney(amount: DecimalString): string {
  toCents(amount)
  if (!isNumericLiteral(amount)) {
    throw new ValidationError(`${JSON.stringify(amount)} is not a decimal string`)
  }
  return MONEY_FORMAT.format(amount)
}

/** `383` → `38,3 %` (the space before `%` is U+00A0). */
export function formatPercent(permille: number): string {
  if (!Number.isSafeInteger(permille)) {
    throw new ValidationError(`${permille} is not an integer permille`)
  }
  const absolute = Math.abs(permille)
  const sign = permille < 0 ? '-' : ''
  const fraction = String(absolute % 1000).padStart(3, '0')
  const ratio = `${sign}${Math.trunc(absolute / 1000)}.${fraction}`
  if (!isNumericLiteral(ratio)) {
    throw new ValidationError(`${ratio} is not a decimal string`)
  }
  return PERCENT_FORMAT.format(ratio)
}

/** `"2026-09-12"` → `12 Sept 2026`, built and read in UTC so no timezone shifts the day. */
export function formatDate(date: DateOnly): string {
  const match = DATE_ONLY.exec(date)
  if (!match) {
    throw new ValidationError(`${JSON.stringify(date)} is not a YYYY-MM-DD date`)
  }
  const [, year = '', month = '', day = ''] = match
  return DATE_FORMAT.format(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}
