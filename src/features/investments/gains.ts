// Order, bar and texts of the Investments screen (feature 40, spec 40 design §4 and §5).
// Pure: nothing here sums an amount that is shown nor counts a day; figures are only
// compared in bigint cents and formatted from the exact strings.

import {
  formatDate,
  formatMoney,
  formatPercentText,
  formatSignedMoney,
  fromCents,
  sharePermille,
  toCents,
} from '@/shared/money'

import type {
  ClosedGainsProduct,
  DateOnly,
  DecimalString,
  ExcludedFromTotal,
  GainsProduct,
  GainsReason,
  InvestmentType,
  PercentText,
} from './types'

/** What a missing figure or date shows: a gap, never a zero. */
export const MISSING = '—'

const TYPE_LABELS: Record<InvestmentType, string> = {
  fund: 'Fund',
  etf: 'ETF',
  managed_portfolio: 'Managed portfolio',
  deposit: 'Fixed-term deposit',
}

const REASON_TEXTS: Record<GainsReason, string> = {
  no_photo: 'no valuation on file',
  gain_not_reported: 'the valuation has no gain',
  gain_percent_not_reported: 'the valuation has no gain percent',
  maturity_not_found: 'its payment is not in your statement',
  ambiguous: 'several possible payments in your statement',
  below_principal: 'it paid back less than you put in',
  missing_conditions: 'its conditions are incomplete',
}

export type Tone = 'positive' | 'negative' | 'neutral'

export interface Bar {
  side: 'gain' | 'loss' | 'none'
  /** Tenths of a percentage point of the biggest gain or loss: only a width, never shown. */
  permille: number
}

export function typeLabel(type: InvestmentType): string {
  return TYPE_LABELS[type]
}

/** Lower case, to go inside brackets; `capitalize` it at the start of a line. */
export function reasonText(reason: GainsReason): string {
  return REASON_TEXTS[reason]
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function moneyOrDash(amount: DecimalString | null): string {
  return amount === null ? MISSING : formatMoney(amount)
}

export function dateOrDash(date: DateOnly | null): string {
  return date === null ? MISSING : formatDate(date)
}

/** Above zero by its sign and its digits, never by `Number()`. */
function isAboveZero(text: string): boolean {
  return !text.startsWith('-') && /[1-9]/.test(text)
}

/** `"4.07"` → `+4,07 %`; `"-2.1"` → `-2,1 %`; `"0.00"` → `0,00 %`. */
export function signedPercent(text: PercentText): string {
  const formatted = formatPercentText(text)
  return isAboveZero(text) ? `+${formatted}` : formatted
}

export function signedMoneyOrDash(amount: DecimalString | null): string {
  return amount === null ? MISSING : formatSignedMoney(amount)
}

export function signedPercentOrDash(text: PercentText | null): string {
  return text === null ? MISSING : signedPercent(text)
}

export function toneOf(amount: DecimalString | null): Tone {
  if (amount === null) return 'neutral'
  const cents = toCents(amount)
  return cents > 0n ? 'positive' : cents < 0n ? 'negative' : 'neutral'
}

/** From the one that gains most to the one that loses most, in euros; no figure at the end. */
export function sortLive(live: readonly GainsProduct[]): GainsProduct[] {
  // Array.prototype.sort is stable: at equal gain, the order in which they came.
  return [...live].sort((a, b) => {
    if (a.gain === null || b.gain === null) {
      return a.gain === null ? (b.gain === null ? 0 : 1) : -1
    }
    const difference = toCents(b.gain) - toCents(a.gain)
    return difference > 0n ? 1 : difference < 0n ? -1 : 0
  })
}

function absoluteCents(amount: DecimalString): bigint {
  const cents = toCents(amount)
  return cents < 0n ? -cents : cents
}

/** Side and length of the bar of a live product, scaled to the biggest |gain| of `live`. */
export function barOf(product: GainsProduct, live: readonly GainsProduct[]): Bar {
  const none: Bar = { side: 'none', permille: 0 }
  if (product.gain === null) return none
  const cents = toCents(product.gain)
  const biggest = live.reduce(
    (max, other) =>
      other.gain === null ? max : absoluteCents(other.gain) > max ? absoluteCents(other.gain) : max,
    0n,
  )
  if (cents === 0n || biggest === 0n) return none
  const permille = sharePermille(fromCents(absoluteCents(product.gain)), fromCents(biggest)) ?? 0
  return { side: cents > 0n ? 'gain' : 'loss', permille }
}

/** `Started …` · `Put in …` · `Worth … today` or `Worth … on <date>`. */
export function liveFacts(product: GainsProduct, asOf: DateOnly): string[] {
  const worth = `Worth ${moneyOrDash(product.currentValue)}`
  const when =
    product.valuedAt === null
      ? worth
      : product.valuedAt === asOf
        ? `${worth} today`
        : `${worth} on ${formatDate(product.valuedAt)}`
  return [
    `Started ${dateOrDash(product.openedAt)}`,
    `Put in ${moneyOrDash(product.invested)}`,
    when,
  ]
}

/** `Started …` · `Closed <closedOn>`. */
export function closedFacts(product: ClosedGainsProduct): string[] {
  return [`Started ${dateOrDash(product.openedAt)}`, `Closed ${formatDate(product.closedOn)}`]
}

/** The line of a live deposit with figures: what it will earn and when. */
export function depositLine(product: GainsProduct): string | null {
  const conditions = product.conditions
  if (product.type !== 'deposit' || product.reason !== null || conditions === undefined) return null
  if (conditions.expectedGain === null || conditions.maturityDate === null) return null
  return `Counted day by day: ${formatMoney(conditions.expectedGain)} when it matures on ${formatDate(conditions.maturityDate)}`
}

/** Only a deposit that closed before its maturity date; two `YYYY-MM-DD` strings compared. */
export function cancelledLine(product: ClosedGainsProduct): string | null {
  const maturityDate = product.conditions?.maturityDate ?? null
  if (product.type !== 'deposit' || maturityDate === null) return null
  return product.closedOn < maturityDate ? 'Cancelled before it matured' : null
}

/** Why a figure is missing; on a live product without gain, also that it is not in the total. */
export function reasonLine(product: GainsProduct, variant: 'live' | 'closed'): string | null {
  if (product.reason === null) return null
  const reason = capitalize(reasonText(product.reason))
  return variant === 'live' && product.gain === null ? `${reason} · Not in the total` : reason
}

/** `Not included: ETF Mundo (no valuation on file), …`, in the order of the backend. */
export function excludedLine(excluded: readonly ExcludedFromTotal[]): string | null {
  if (excluded.length === 0) return null
  const items = excluded.map((item) => `${item.name} (${reasonText(item.reason)})`)
  return `Not included: ${items.join(', ')}`
}
