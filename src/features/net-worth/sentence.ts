// The interpreted sentence under the block A figure (feature 9). Without
// history it only states the total and its split: never growth or returns.

import { formatDate, formatMoney, formatPercent, sharePermille, toCents } from '@/shared/money'

import type { BreakdownGroup, NatureGroupId } from './breakdown'
import type { DateOnly, NetWorth } from './types'

/**
 * How far the data goes (cabo 13): `Data up to 29 Aug 2026`. The backend's `asOf` is
 * always today, so it says nothing; the date of the last movement, valuation or
 * snapshot does. With no data at all there is no date to name: `As of today`.
 */
export function dataUpTo(lastDataDate: DateOnly | null): string {
  return lastDataDate === null ? 'As of today' : `Data up to ${formatDate(lastDataDate)}`
}

/** Banks with a card in block E: accounts plus every product, gaps included. */
function countBanks(netWorth: NetWorth): number {
  const banks = new Set<string>()
  for (const account of netWorth.accounts.accounts) banks.add(account.bank)
  for (const product of netWorth.investments.products) banks.add(product.bank)
  return banks.size
}

export function buildSummarySentence(
  netWorth: NetWorth,
  nature: BreakdownGroup<NatureGroupId>[],
): string {
  const upTo = dataUpTo(netWorth.lastDataDate)
  const total = formatMoney(netWorth.total)

  if (netWorth.accounts.accounts.length === 0 && netWorth.investments.products.length === 0) {
    return `${upTo}, there are no accounts or products yet.`
  }
  if (toCents(netWorth.total) <= 0n) {
    return `${upTo}, your net worth is ${total}.`
  }

  const banks = countBanks(netWorth)
  const first = `${upTo}, you have ${total} across ${banks} ${banks === 1 ? 'bank' : 'banks'}.`

  const checking = nature.find((group) => group.id === 'checking')
  const idle =
    checking && toCents(checking.amount) > 0n
      ? sharePermille(checking.amount, netWorth.total)
      : null
  if (idle === null) {
    return first
  }
  return `${first} ${formatPercent(idle)} of it is idle in checking accounts.`
}
