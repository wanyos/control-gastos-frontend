// The account list, for the screens that need to name every account the user has
// (feature 20: the statement's account filter). Read only.
//
// Only the five fields a select needs are validated; the balances the contract also
// sends (`balance`, `initialBalance`, `balanceAnchor`, `balanceAnchorDate`) and the
// timestamps are ignored on purpose: less surface to break, and `net-worth` keeps its
// own parser for its own response.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { bankLabel } from '@/shared/banks'
import { createValidators } from '@/shared/validation'

export const ACCOUNTS_PATH = '/api/accounts'

/** An account as a pickable option: who it is, not how much it holds. */
export interface AccountSummary {
  id: number
  iban: string
  bank: string
  alias: string
  /** Open text: a new account type must not blank the list. */
  type: string
}

/**
 * How the screens name an account: the readable bank and the last four digits
 * of its IBAN (feature 28). The backend `alias` already carries the bank slug, so it is
 * not used: painting both repeated the bank.
 *
 * An IBAN that does not end in four digits (too short, or cut) gives the bank alone:
 * `···` followed by something that is not the end of an account number would mislead.
 */
export function accountLabel(account: { bank: string; iban: string }): string {
  const bank = bankLabel(account.bank)
  const lastFour = account.iban.replace(/\s/g, '').slice(-4)
  return /^\d{4}$/.test(lastFour) ? `${bank} ···${lastFour}` : bank
}

const accountChecks = createValidators(`GET ${ACCOUNTS_PATH}`)

/** Maps `GET /api/accounts`, or throws ValidationError naming the failing field. */
export function parseAccounts(raw: unknown): AccountSummary[] {
  const v = accountChecks
  return v.asArray(raw, 'response').map((item, i) => {
    const path = `[${i}]`
    const account = v.asObject(item, path)
    return {
      id: v.asInteger(account.id, `${path}.id`),
      iban: v.asText(account.iban, `${path}.iban`),
      bank: v.asText(account.bank, `${path}.bank`),
      alias: v.asString(account.alias, `${path}.alias`),
      type: v.asText(account.type, `${path}.type`),
    }
  })
}

/** Lists every account. Read only: no side effects on the backend. */
export async function getAccounts(client: HttpClient = http): Promise<AccountSummary[]> {
  return parseAccounts(await client<unknown>(ACCOUNTS_PATH))
}
