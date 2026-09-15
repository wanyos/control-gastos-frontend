// Pure breakdowns of the net worth by nature and by bank (feature 9).
// Every account and every product with a value lands in exactly one group of
// each breakdown, so the groups add up to `total` for a coherent response.
// Products with `value: null` are left out of every group (they are gaps).

import { bankLabel } from '@/shared/banks'
import { sharePermille, sumAmounts, toCents } from '@/shared/money'

import type { DecimalString, NetWorth } from './types'

// Existing imports of bankLabel from this module keep working.
export { bankLabel } from '@/shared/banks'

export type NatureGroupId = 'checking' | 'savings' | 'market' | 'deposits'

export interface Holding {
  kind: 'account' | 'product'
  id: number
  bank: string
  amount: DecimalString
}

export interface BreakdownGroup<Id extends string = string> {
  id: Id
  label: string
  amount: DecimalString
  /** Tenths of a percentage point over `total`; `null` when `total <= 0`. */
  sharePermille: number | null
  members: Holding[]
}

const NATURE_ORDER: readonly NatureGroupId[] = ['checking', 'savings', 'market', 'deposits']

const NATURE_LABELS: Record<NatureGroupId, string> = {
  checking: 'Checking accounts',
  savings: 'Savings',
  market: 'Market investments',
  deposits: 'Fixed-term deposits',
}

interface ClassifiedHolding extends Holding {
  nature: NatureGroupId
}

function classify(netWorth: NetWorth): ClassifiedHolding[] {
  const accounts = netWorth.accounts.accounts.map((account): ClassifiedHolding => ({
    kind: 'account',
    id: account.id,
    bank: account.bank,
    amount: account.balance,
    nature: account.type === 'checking' ? 'checking' : 'savings',
  }))

  const products: ClassifiedHolding[] = []
  for (const product of netWorth.investments.products) {
    if (product.value === null) {
      continue
    }
    const nature: NatureGroupId =
      product.type === 'deposit'
        ? 'deposits'
        : product.type === 'savings_account'
          ? 'savings'
          : 'market'
    products.push({
      kind: 'product',
      id: product.id,
      bank: product.bank,
      amount: product.value,
      nature,
    })
  }

  return [...accounts, ...products]
}

function toHolding({ kind, id, bank, amount }: ClassifiedHolding): Holding {
  return { kind, id, bank, amount }
}

function buildGroup<Id extends string>(
  id: Id,
  label: string,
  members: Holding[],
  total: DecimalString,
): BreakdownGroup<Id> {
  const amount = sumAmounts(members.map((member) => member.amount))
  return { id, label, amount, sharePermille: sharePermille(amount, total), members }
}

/** Four groups in a fixed order; a group without members is not returned. */
export function groupByNature(netWorth: NetWorth): BreakdownGroup<NatureGroupId>[] {
  const holdings = classify(netWorth)
  return NATURE_ORDER.flatMap((nature) => {
    const members = holdings.filter((holding) => holding.nature === nature).map(toHolding)
    return members.length === 0
      ? []
      : [buildGroup(nature, NATURE_LABELS[nature], members, netWorth.total)]
  })
}

/** One group per bank with valued holdings, largest amount first, ties by label. */
export function groupByBank(netWorth: NetWorth): BreakdownGroup[] {
  const byBank = new Map<string, Holding[]>()
  for (const holding of classify(netWorth)) {
    const members = byBank.get(holding.bank) ?? []
    members.push(toHolding(holding))
    byBank.set(holding.bank, members)
  }

  const groups = [...byBank].map(([bank, members]) =>
    buildGroup(bank, bankLabel(bank), members, netWorth.total),
  )
  return groups.sort((a, b) => {
    const difference = toCents(b.amount) - toCents(a.amount)
    if (difference !== 0n) {
      return difference > 0n ? 1 : -1
    }
    return a.label.localeCompare(b.label)
  })
}

export function sumOfGroups(groups: readonly BreakdownGroup[]): DecimalString {
  return sumAmounts(groups.map((group) => group.amount))
}
