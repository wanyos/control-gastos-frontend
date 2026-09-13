// The interpreted sentence under the block A figure (feature 9). Without
// history it only states the total and its split: never growth or returns.

import { formatDate, formatMoney, formatPercent, sharePermille, toCents } from '@/shared/money'

import type { BreakdownGroup, NatureGroupId } from './breakdown'
import type { NetWorth } from './types'

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
  const asOf = formatDate(netWorth.asOf)
  const total = formatMoney(netWorth.total)

  if (netWorth.accounts.accounts.length === 0 && netWorth.investments.products.length === 0) {
    return `As of ${asOf}, there are no accounts or products yet.`
  }
  if (toCents(netWorth.total) <= 0n) {
    return `As of ${asOf}, your net worth is ${total}.`
  }

  const banks = countBanks(netWorth)
  const first = `As of ${asOf}, you have ${total} across ${banks} ${banks === 1 ? 'bank' : 'banks'}.`

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
