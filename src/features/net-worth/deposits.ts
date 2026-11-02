// Texts of the Deposits part of Net Worth (feature 38, design §4). Pure: nothing
// here sums an amount; figures are only formatted from the exact strings.

import type { BadgeTone } from '@/shared/components/BaseBadge.vue'
import { formatDate, formatMoney } from '@/shared/money'

import type { DateOnly, DecimalString, DepositEarning, DepositStatus } from './types'

/** Route name of the Movements screen; nothing is imported from the statement feature. */
const MOVEMENTS_ROUTE_NAME = 'movements'

/** What a missing field shows: a gap, never a zero. */
export const MISSING = '—'

const DOUBTFUL: readonly DepositStatus[] = ['maturity_not_found', 'ambiguous', 'below_principal']

export function isDoubtful(status: DepositStatus): boolean {
  return DOUBTFUL.includes(status)
}

/** Only `Doubtful` carries a colour (amber); the other labels stay neutral (decisions §2). */
export function statusBadge(status: DepositStatus): { label: string; tone: BadgeTone } {
  if (status === 'active') return { label: 'Active', tone: 'neutral' }
  if (status === 'matured') return { label: 'Matured', tone: 'neutral' }
  if (status === 'cancelled') return { label: 'Cancelled', tone: 'neutral' }
  return { label: 'Doubtful', tone: 'warning' }
}

export function moneyOrDash(amount: DecimalString | null): string {
  return amount === null ? MISSING : formatMoney(amount)
}

export function dateOrDash(date: DateOnly | null): string {
  return date === null ? MISSING : formatDate(date)
}

/** `Matures …` while it lives, `Was due …` if cancelled, `Matured …` otherwise. */
export function maturityLabel(deposit: DepositEarning): string {
  const verb =
    deposit.status === 'active' ? 'Matures' : deposit.status === 'cancelled' ? 'Was due' : 'Matured'
  return `${verb} ${dateOrDash(deposit.maturityDate)}`
}

/** The data of a row, in order: put in, opened, maturity, expected. */
export function depositFacts(deposit: DepositEarning): string[] {
  return [
    `Put in ${moneyOrDash(deposit.principal)}`,
    `Opened ${dateOrDash(deposit.openedAt)}`,
    maturityLabel(deposit),
    `Expected ${moneyOrDash(deposit.expectedGain)}`,
  ]
}

/** The column of what it earned: a figure only on a matured deposit. */
export function earnedCell(deposit: DepositEarning): {
  text: string
  tone: 'positive' | 'muted' | 'warning'
} {
  if (deposit.status === 'matured' && deposit.earned !== null) {
    return { text: formatMoney(deposit.earned), tone: 'positive' }
  }
  if (deposit.status === 'active') return { text: 'Not earned yet', tone: 'muted' }
  if (deposit.status === 'cancelled') return { text: 'Not in the total', tone: 'muted' }
  return { text: 'Not in the total', tone: 'warning' }
}

/** The line under the data: why a cancelled or doubtful deposit is out of the total. */
export function extraLine(deposit: DepositEarning): string | null {
  switch (deposit.status) {
    case 'cancelled':
      return deposit.closedAt === null
        ? 'Cancelled before it matured'
        : `Cancelled on ${formatDate(deposit.closedAt)}, before it matured`
    case 'maturity_not_found':
      return 'Doubtful · its payment is not in your statement'
    case 'ambiguous':
      return `Doubtful · ${deposit.candidateMovementIds.length} possible payments in your statement, none chosen`
    case 'below_principal':
      return `Doubtful · it paid back ${moneyOrDash(deposit.maturity?.amount ?? null)}, less than you put in`
    default:
      return null
  }
}

/** Movements at the month of the maturity movement; `null` when there is no single one. */
export function movementsLink(
  deposit: DepositEarning,
): { name: 'movements'; query: { month: string } } | null {
  if (deposit.maturity === null) return null
  return { name: MOVEMENTS_ROUTE_NAME, query: { month: deposit.maturity.date.slice(0, 7) } }
}
