// Readable English texts for the data honesty warnings and holding types (feature 9).

import { formatDate } from '@/shared/money'

import type { AccountType, InvestmentProductType, NetWorthIssue } from './types'

const TYPE_LABELS: Record<AccountType | InvestmentProductType, string> = {
  checking: 'Checking account',
  savings: 'Savings account',
  fund: 'Fund',
  etf: 'ETF',
  managed_portfolio: 'Managed portfolio',
  savings_account: 'Interest account',
  deposit: 'Fixed-term deposit',
}

export function holdingTypeLabel(type: AccountType | InvestmentProductType): string {
  return TYPE_LABELS[type]
}

export function issueMessage(issue: NetWorthIssue): string {
  const { name, valuedAt } = issue
  // The contract always sends a date for these two reasons; without one, the
  // date clause is dropped rather than inventing a value.
  const on = valuedAt === null ? '' : ` on ${formatDate(valuedAt)}`

  switch (issue.reason) {
    case 'no_valuation':
      return `${name} has no valuation yet, so it is not counted in your net worth.`
    case 'stale_valuation':
      return `${name} was last valued${on}; its value may be out of date.`
    case 'matured_not_closed':
      return `${name} matured${on} but is not closed yet; its money may be counted twice.`
  }
}
