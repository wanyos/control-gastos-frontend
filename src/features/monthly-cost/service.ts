// What a month costs (feature 32): one read, `GET /api/recurring-expenses`. No function
// here takes a method or a body, so there is no way to write from this feature (R2).

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { ValidationError } from '@/shared/errors'
import { sumAmounts, toCents } from '@/shared/money'
import { createValidators } from '@/shared/validation'

import type { Bill, Charge, ChargeGroup, MonthlyCost, Period, VariableEntry } from './types'

/** Path is absolute so it always resolves against the API origin (see docs/stack.md). */
export const RECURRING_EXPENSES_PATH = '/api/recurring-expenses'

const CONTEXT = `GET ${RECURRING_EXPENSES_PATH}`
const PERIOD_LENGTH = 12
const MONTH_KEY = /^\d{4}-\d{2}$/

const {
  reject,
  asObject,
  asArray,
  asText,
  asString,
  asInteger,
  asFlag,
  asDecimal,
  asNullableDecimal,
  asDateOnly,
} = createValidators(CONTEXT)

function parsePeriod(raw: unknown, path: string): Period {
  const period = asObject(raw, path)
  const months = asArray(period.months, `${path}.months`).map((month, index): string =>
    typeof month === 'string' && MONTH_KEY.test(month)
      ? month
      : reject(`${path}.months[${index}]`, 'a YYYY-MM month'),
  )
  if (months.length !== PERIOD_LENGTH) {
    reject(`${path}.months`, `a list of ${PERIOD_LENGTH} months`)
  }
  return {
    from: asDateOnly(period.from, `${path}.from`),
    to: asDateOnly(period.to, `${path}.to`),
    months,
  }
}

function parseCharges(raw: unknown, path: string): Charge[] {
  return asArray(raw, path).map((item, index) => {
    const at = `${path}[${index}]`
    const charge = asObject(item, at)
    return {
      id: asInteger(charge.id, `${at}.id`),
      accountId: asInteger(charge.accountId, `${at}.accountId`),
      bookingDate: asDateOnly(charge.bookingDate, `${at}.bookingDate`),
      amount: asDecimal(charge.amount, `${at}.amount`),
      description: asString(charge.description, `${at}.description`),
    }
  })
}

function parseBill(raw: unknown, path: string): Bill {
  const bill = asObject(raw, path)
  return {
    key: asText(bill.key, `${path}.key`),
    name: asText(bill.name, `${path}.name`),
    // Open text, not a member of a list: a new value must not take the screen down (R7).
    periodicity: asText(bill.periodicity, `${path}.periodicity`),
    usualAmount: asDecimal(bill.usualAmount, `${path}.usualAmount`),
    count: asInteger(bill.count, `${path}.count`),
    lastDate: asDateOnly(bill.lastDate, `${path}.lastDate`),
    previousMonthAmount: asNullableDecimal(bill.previousMonthAmount, `${path}.previousMonthAmount`),
    change: asNullableDecimal(bill.change, `${path}.change`),
    hasIncreased: asFlag(bill.hasIncreased, `${path}.hasIncreased`),
    monthlyCost: asDecimal(bill.monthlyCost, `${path}.monthlyCost`),
    charges: parseCharges(bill.movements, `${path}.movements`),
  }
}

function parseGroup(raw: unknown, path: string): ChargeGroup {
  const group = asObject(raw, path)
  return {
    monthlyCost: asDecimal(group.monthlyCost, `${path}.monthlyCost`),
    charges: parseCharges(group.movements, `${path}.movements`),
  }
}

function parseVariable(raw: unknown, path: string): VariableEntry {
  const entry = asObject(raw, path)
  const category = entry.category === null ? null : asObject(entry.category, `${path}.category`)
  return {
    ...parseGroup(entry, path),
    categoryName: category === null ? null : asText(category.name, `${path}.category.name`),
  }
}

/**
 * Maps the raw API payload to the frontend types, or throws ValidationError. That
 * includes a response whose monthly costs do not add up to its total: the screen
 * must not show as adding up what does not (R15).
 */
export function parseRecurringExpenses(raw: unknown): MonthlyCost {
  const body = asObject(raw, 'response')
  const read: MonthlyCost = {
    period: parsePeriod(body.period, 'period'),
    monthlyTotal: asDecimal(body.monthlyTotal, 'monthlyTotal'),
    bills: asArray(body.bills, 'bills').map((item, index) => parseBill(item, `bills[${index}]`)),
    people: parseGroup(body.transfersToPeople, 'transfersToPeople'),
    variable: asArray(body.variable, 'variable').map((item, index) =>
      parseVariable(item, `variable[${index}]`),
    ),
  }

  const added = sumAmounts([
    ...read.bills.map((bill) => bill.monthlyCost),
    read.people.monthlyCost,
    ...read.variable.map((entry) => entry.monthlyCost),
  ])
  if (toCents(added) !== toCents(read.monthlyTotal)) {
    throw new ValidationError(`${CONTEXT}: monthly costs do not add up to monthlyTotal`)
  }
  return read
}

/** The client is injectable for tests; by default it is the shared client. */
export async function getRecurringExpenses(client: HttpClient = http): Promise<MonthlyCost> {
  return parseRecurringExpenses(await client<unknown>(RECURRING_EXPENSES_PATH))
}
