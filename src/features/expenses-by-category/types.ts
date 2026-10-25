// Frontend types of what was spent by category (feature 37). The screen only reads
// `GET /api/expenses-by-category`; the service maps its body to these types. Written
// from the contract: nothing is imported from the backend.

import type { DateOnly, DecimalString } from '@/features/net-worth/types'
import type { MonthKey } from '@/features/statement/months'

export type { DateOnly, DecimalString } from '@/features/net-worth/types'
export type { MonthKey } from '@/features/statement/months'

export type CompareMonth = 'previous-month' | 'same-month-last-year'

/** What is asked: one month with its comparison, or one natural year. */
export type PeriodQuery =
  { mode: 'month'; month: MonthKey; compare: CompareMonth } | { mode: 'year'; year: string } // 'YYYY'

export type PeriodMode = PeriodQuery['mode']

export interface DateRange {
  from: DateOnly
  to: DateOnly
  months: number
}

export interface LineCategory {
  id: number
  name: string
  parentId: number | null
  isFixed: boolean
}

export interface LineMovement {
  id: number
  bookingDate: DateOnly
  description: string
  amount: DecimalString
  accountId: number
}

export type LineChange = 'new' | 'gone' | null

/** One line of a group: a category, or the spending with no category (null). */
export interface ExpenseLine {
  category: LineCategory | null
  amount: DecimalString
  comparedAmount: DecimalString
  difference: DecimalString
  change: LineChange
  /** Only in a year; null in a month. */
  monthlyAmount: DecimalString | null
  /** The movements of the period asked, as the backend orders them. */
  movements: LineMovement[]
}

export interface ExpenseGroup {
  amount: DecimalString
  comparedAmount: DecimalString
  difference: DecimalString
  lines: ExpenseLine[]
}

export interface ExpensesByCategory {
  period: DateRange & { month: MonthKey | null; year: string | null }
  compared: DateRange
  compare: CompareMonth | 'previous-year'
  amount: DecimalString
  comparedAmount: DecimalString
  difference: DecimalString
  fixed: ExpenseGroup
  variable: ExpenseGroup
}

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'
