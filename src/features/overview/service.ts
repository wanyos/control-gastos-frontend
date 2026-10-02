// The three reads of the month at a glance (feature 25). All of them are
// `GET /api/movements` through the shared reader: no function here takes a method or
// a body, so there is no way to write from this feature (C1).

import { monthRange } from '@/features/statement/months'
import type { HttpClient } from '@/services/http'
import { getMovements } from '@/shared/movements'

import type { DateOnly, MonthFigures, MonthKey, Uncategorized } from './types'

/** The statement's own question, with no filters: that is why the figures match it (R5). */
export async function getMonthFigures(month: MonthKey, client?: HttpClient): Promise<MonthFigures> {
  const page = await getMovements({ ...monthRange(month), pageSize: 1 }, client)
  return { month, totals: page.totals, movementCount: page.pagination.total }
}

/**
 * The month's spending with no category (R12). `transfer` and `excluded` do not change
 * the amount — what is left out never adds up — they make the count talk about the
 * same movements as the amount.
 */
export async function getUncategorizedSpending(
  month: MonthKey,
  client?: HttpClient,
): Promise<Uncategorized> {
  const page = await getMovements(
    {
      ...monthRange(month),
      type: 'expense',
      uncategorized: true,
      transfer: 'none',
      excluded: 'none',
      pageSize: 1,
    },
    client,
  )
  return { amount: page.totals.expense, count: page.pagination.total }
}

/** The list comes `bookingDate DESC`: its first movement is the newest of the base (R8). */
export async function getLatestBookingDate(client?: HttpClient): Promise<DateOnly | null> {
  const page = await getMovements({ pageSize: 1 }, client)
  return page.movements[0]?.bookingDate ?? null
}
