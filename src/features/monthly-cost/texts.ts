// Everything pure of what a month costs (feature 32): the screen's texts and the few
// things worked out here. No figure is computed but the block subtotals, added up in
// exact cents from figures the backend already rounded (R14).

import { formatMonthLabel } from '@/features/statement/months'
import { API_NETWORK, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { formatMoney, fromCents, sumAmounts, toCents } from '@/shared/money'

import type { Bill, DecimalString, MonthlyCost, Period } from './types'

export const TITLE = 'Monthly cost'
export const SUBTITLE =
  'What a month of life costs: bills, what you send to people and variable spending.'
export const TOTAL_LABEL = 'What a month costs'
export const LOADING_LINE = 'Reading what a month costs…'
export const EMPTY_LINE = 'Nothing counts as spending in these 12 months.'
export const BILLS_TITLE = 'Bills'
export const PEOPLE_TITLE = 'Sent to people'
export const PEOPLE_ROW = 'Transfers to people'
export const VARIABLE_TITLE = 'Variable spending'
export const NO_CATEGORY = 'No category'
export const SHOW_CHARGES = 'Show charges'
export const HIDE_CHARGES = 'Hide charges'
export const RETRY = 'Try again'

/** The bill columns, in order; the header shows from `md` up. */
export const BILL_COLUMNS = [
  'Bill',
  'How often',
  'Usual amount',
  'Last charge',
  'Change',
  'Per month',
] as const

const PERIODICITIES: ReadonlyMap<string, string> = new Map([
  ['monthly', 'Monthly'],
  ['twice_monthly', 'Twice a month'],
  ['every_two_months', 'Every 2 months'],
  ['every_three_months', 'Every 3 months'],
  ['every_six_months', 'Every 6 months'],
  ['annual', 'Yearly'],
  ['once', 'Once'],
])

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many)

/** `"seguro hogar"` → `"Seguro hogar"`: the first letter up, the rest as it comes. */
export function billTitle(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/** An unknown value comes back as it came: it must not leave the screen blank (R7). */
export function periodicityLabel(periodicity: string): string {
  return PERIODICITIES.get(periodicity) ?? periodicity
}

/** A twice-monthly bill's usual amount is what a month charges, two charges together. */
export function usualSuffix(periodicity: string): string {
  return periodicity === 'twice_monthly' ? ' a month' : ' each time'
}

export type ChangeKind = 'up' | 'down' | 'same' | 'none'

export interface ChangeView {
  kind: ChangeKind
  text: string
  /** Only when it went up: what the previous charge was. */
  was: string | null
}

/**
 * How a bill changed, in words. `change` and `hasIncreased` are the backend's: nothing
 * is worked out here but the absolute value of a drop (R8).
 */
export function changeView(bill: Bill): ChangeView {
  if (bill.hasIncreased && bill.change !== null) {
    return {
      kind: 'up',
      text: `Up ${formatMoney(bill.change)}`,
      was:
        bill.previousMonthAmount === null ? null : `was ${formatMoney(bill.previousMonthAmount)}`,
    }
  }
  if (bill.change === null) return { kind: 'none', text: 'No earlier charge', was: null }
  const cents = toCents(bill.change)
  if (cents < 0n) return { kind: 'down', text: `Down ${formatMoney(fromCents(-cents))}`, was: null }
  return { kind: 'same', text: 'Same', was: null }
}

/** Bills with charges in the period first, then those without; each list keeps its order (R9). */
export function splitBills(bills: readonly Bill[]): { charged: Bill[]; uncharged: Bill[] } {
  const charged: Bill[] = []
  const uncharged: Bill[] = []
  for (const bill of bills) {
    ;(toCents(bill.monthlyCost) === 0n ? uncharged : charged).push(bill)
  }
  return { charged, uncharged }
}

export interface BlockSubtotals {
  bills: DecimalString
  people: DecimalString
  variable: DecimalString
}

/** Each block's monthly cost, added up in exact cents (R14). */
export function blockSubtotals(data: MonthlyCost): BlockSubtotals {
  return {
    bills: sumAmounts(data.bills.map((bill) => bill.monthlyCost)),
    people: data.people.monthlyCost,
    variable: sumAmounts(data.variable.map((entry) => entry.monthlyCost)),
  }
}

/** True when nothing counts as spending: no bills, nothing sent and no variable spending (R17). */
export function isEmpty(data: MonthlyCost): boolean {
  return (
    data.bills.length === 0 && data.variable.length === 0 && toCents(data.people.monthlyCost) === 0n
  )
}

function firstAndLast(period: Period): [string, string] {
  const first = period.months[0]
  const last = period.months.at(-1)
  return [
    first === undefined ? period.from : formatMonthLabel(first),
    last === undefined ? period.to : formatMonthLabel(last),
  ]
}

/** Where the figure comes from (R4). */
export function periodLine(period: Period): string {
  const [first, last] = firstAndLast(period)
  return `Monthly average of the 12 complete months before this one: ${first} to ${last}.`
}

/** How many bills went up (R5). */
export function increasedLine(up: number, total: number): string {
  if (up === 0) return 'No bill went up since its previous charge.'
  return `${up} of ${total} ${plural(total, 'bill', 'bills')} went up since ${plural(up, 'its', 'their')} previous charge.`
}

/** The summary of the folded bills (R9). */
export function noChargesSummary(count: number, period: Period): string {
  const [first, last] = firstAndLast(period)
  return `${count} ${plural(count, 'bill', 'bills')} with no charges between ${first} and ${last}`
}

/**
 * The heading of a list of charges. A bill's are those of its whole history; the
 * group's and each category's, those of the period (R10, R12).
 */
export function chargesHeading(kind: 'bill' | 'period', count: number): string {
  if (kind === 'bill') {
    return count === 1 ? 'The only charge' : `All ${count} charges, newest first`
  }
  if (count === 0) return 'No charges in these 12 months'
  if (count === 1) return '1 charge in these 12 months'
  return `${count} charges in these 12 months, newest first`
}

export function monthlyCostErrorMessage(error: AppError): string {
  if (error.code === API_NETWORK) return "Couldn't reach the server."
  if (error instanceof ValidationError) {
    return "The server answered, but the monthly cost couldn't be read."
  }
  return 'Something went wrong loading the monthly cost.'
}
