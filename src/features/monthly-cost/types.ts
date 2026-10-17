// Frontend types of what a month costs (feature 32). The screen only reads
// `GET /api/recurring-expenses`; the service maps its body to these types.

import type { DateOnly, DecimalString } from '@/features/net-worth/types'
import type { MonthKey } from '@/features/statement/months'

export type { DateOnly, DecimalString } from '@/features/net-worth/types'
export type { MonthKey } from '@/features/statement/months'

/** One charge of an entry: one movement of the contract's `movements`. */
export interface Charge {
  id: number
  accountId: number
  bookingDate: DateOnly
  amount: DecimalString
  description: string
}

/** One element of `bills`. */
export interface Bill {
  key: string
  name: string
  /** Open text: a new value from the backend must not leave the screen blank (R7). */
  periodicity: string
  usualAmount: DecimalString
  count: number
  lastDate: DateOnly
  previousMonthAmount: DecimalString | null
  change: DecimalString | null
  hasIncreased: boolean
  monthlyCost: DecimalString
  /** Every charge of its whole history, newest first. */
  charges: Charge[]
}

/** The group of transfers to people, and the shape every variable entry shares. */
export interface ChargeGroup {
  monthlyCost: DecimalString
  /** The charges of the period, newest first. */
  charges: Charge[]
}

/** One element of `variable`: a category, or the spending with no category (null). */
export interface VariableEntry extends ChargeGroup {
  categoryName: string | null
}

export interface Period {
  from: DateOnly
  to: DateOnly
  /** The 12 months of the period, oldest first. */
  months: MonthKey[]
}

export interface MonthlyCost {
  period: Period
  monthlyTotal: DecimalString
  bills: Bill[]
  people: ChargeGroup
  variable: VariableEntry[]
}

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'
