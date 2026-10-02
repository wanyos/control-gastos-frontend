// Frontend types of the month at a glance (feature 25). The screen only reads
// `GET /api/movements`, so the amounts and the totals come from `@/shared/movements`.

import type { MonthKey } from '@/features/statement/months'
import type { DecimalString, Totals } from '@/shared/movements'

export type { MonthKey } from '@/features/statement/months'
export type { DateOnly, DecimalString, Totals } from '@/shared/movements'

/** What the backend says about one month: its three figures and how many movements. */
export interface MonthFigures {
  month: MonthKey
  totals: Totals
  /** `pagination.total`: tells an empty month from one whose figures add up to zero. */
  movementCount: number
}

/** The month's spending with no category: the backend's amount and its count. */
export interface Uncategorized {
  amount: DecimalString
  count: number
}

export type MonthState = 'empty' | 'incomplete' | 'complete'

export type Verdict = 'usual' | 'more' | 'less'

export interface UsualComparison {
  usual: DecimalString
  /** (value − usual) / usual, in tenths of a percent; null when usual <= 0. */
  differencePermille: number | null
  verdict: Verdict | null
}

export interface Comparison {
  /** How many of the twelve previous months have data (0–12). */
  months: number
  income: UsualComparison
  expense: UsualComparison
}

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'
