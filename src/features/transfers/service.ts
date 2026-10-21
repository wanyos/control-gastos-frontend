// The calls of the transfers screen (feature 24), and no other: two reads and the only
// two writes — link and unlink. Each write exposes ONE function whose request is written
// literally here, so nothing but two movement ids (or a transferId in the path) can ever
// travel: no amount, no category, no status, no exclusion mark (C1).
//
// Feature 35 adds the doubtful movements of own money: two reads of `GET /api/movements`
// with `ownership=doubtful` (the list and its count) and ONE more write, the answer about
// one movement, whose body is `{ ownershipDecision }` and nothing else.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import {
  MOVEMENTS_PATH,
  getMovements,
  parseMovement,
  parseUpdatedMovement,
  patch,
} from '@/shared/movements'
import type { Movement } from '@/shared/movements'
import { AMBIGUOUS_TRANSFERS_PATH, TRANSFERS_PATH } from '@/shared/transfers'
import { createValidators } from '@/shared/validation'

import { groupKey } from './pairs'
import type { AmbiguousGroup, AmbiguousMovement, OwnershipDecision, TransferPair } from './types'

const pairChecks = createValidators(`GET ${TRANSFERS_PATH}`)
const ambiguousChecks = createValidators(`GET ${AMBIGUOUS_TRANSFERS_PATH}`)
const linkChecks = createValidators(`POST ${TRANSFERS_PATH}`)

const LEG_TYPES = ['expense', 'income'] as const

/**
 * Maps `GET /api/transfers`, or throws ValidationError. The order of the legs is the
 * contract's (expense, income); if it does not come that way the screen does not
 * guess which is which.
 */
export function parseTransferPairs(raw: unknown): TransferPair[] {
  const v = pairChecks
  const body = v.asObject(raw, 'response')
  return v.asArray(body.pairs, 'pairs').map((item, i) => {
    const path = `pairs[${i}]`
    const pair = v.asObject(item, path)
    const legs = v.asArray(pair.movements, `${path}.movements`)
    if (legs.length !== 2) v.reject(`${path}.movements`, 'exactly two legs')
    const expense = parseMovement(v, legs[0], `${path}.movements[0]`)
    const income = parseMovement(v, legs[1], `${path}.movements[1]`)
    if (expense.type !== 'expense') v.reject(`${path}.movements[0].type`, 'expense')
    if (income.type !== 'income') v.reject(`${path}.movements[1].type`, 'income')
    return { transferId: v.asText(pair.transferId, `${path}.transferId`), expense, income }
  })
}

/**
 * Maps `GET /api/transfers/ambiguous`, or throws ValidationError. Each group is split
 * in `out` (expenses) and `in` (incomes), keeping the received order inside each.
 */
export function parseAmbiguousGroups(raw: unknown): AmbiguousGroup[] {
  const v = ambiguousChecks
  const body = v.asObject(raw, 'response')
  return v.asArray(body.ambiguous, 'ambiguous').map((item, i) => {
    const path = `ambiguous[${i}]`
    const group = v.asObject(item, path)
    const movements = v.asArray(group.movements, `${path}.movements`).map((one, j) => {
      const at = `${path}.movements[${j}]`
      const movement = v.asObject(one, at)
      const parsed: AmbiguousMovement = {
        id: v.asInteger(movement.id, `${at}.id`),
        accountId: v.asInteger(movement.accountId, `${at}.accountId`),
        accountAlias: v.asString(movement.accountAlias, `${at}.accountAlias`),
        accountBank: v.asText(movement.accountBank, `${at}.accountBank`),
        accountIban: v.asText(movement.accountIban, `${at}.accountIban`),
        type: v.asMember(movement.type, LEG_TYPES, `${at}.type`),
        bookingDate: v.asDateOnly(movement.bookingDate, `${at}.bookingDate`),
        description: v.asString(movement.description, `${at}.description`),
      }
      return parsed
    })
    return {
      key: groupKey(movements.map((one) => one.id)),
      amount: v.asDecimal(group.amount, `${path}.amount`),
      out: movements.filter((one) => one.type === 'expense'),
      in: movements.filter((one) => one.type === 'income'),
    }
  })
}

/** Every linked pair, in the backend's order. Read only. */
export async function getTransferPairs(client: HttpClient = http): Promise<TransferPair[]> {
  return parseTransferPairs(await client<unknown>(TRANSFERS_PATH))
}

/** The doubtful groups, computed by the backend on each request. Read only. */
export async function getAmbiguousGroups(client: HttpClient = http): Promise<AmbiguousGroup[]> {
  return parseAmbiguousGroups(await client<unknown>(AMBIGUOUS_TRANSFERS_PATH))
}

/**
 * Links two movements as a transfer. The body is this literal and nothing else: the
 * contract answers 400 to any other property. Returns the `transferId` of the 201.
 */
export async function linkMovements(
  expenseId: number,
  incomeId: number,
  client: HttpClient = http,
): Promise<string> {
  const raw = await client<unknown>(TRANSFERS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movementIds: [expenseId, incomeId] }),
  })
  return linkChecks.asText(linkChecks.asObject(raw, 'response').transferId, 'transferId')
}

/** Unlinks a pair. No body, and the 204 comes back as `undefined`. */
export async function unlinkPair(transferId: string, client: HttpClient = http): Promise<void> {
  await client<unknown>(`${TRANSFERS_PATH}/${encodeURIComponent(transferId)}`, {
    method: 'DELETE',
  })
}

// ─── Doubtful movements of own money (feature 35) ─────────────────────────

/** How many doubtful movements the list shows at most; the sidebar number says the total. */
export const DOUBTFUL_PAGE_SIZE = 200

/** `GET /api/movements?ownership=doubtful&page=1&pageSize=200`. Read only. */
export async function getDoubtfulOwnership(
  client: HttpClient = http,
): Promise<{ movements: Movement[]; total: number }> {
  const page = await getMovements(
    { ownership: 'doubtful', page: 1, pageSize: DOUBTFUL_PAGE_SIZE },
    client,
  )
  return { movements: page.movements, total: page.pagination.total }
}

/** `GET /api/movements?ownership=doubtful&page=1&pageSize=1` → `pagination.total`. Read only. */
export async function countDoubtfulOwnership(client: HttpClient = http): Promise<number> {
  const page = await getMovements({ ownership: 'doubtful', page: 1, pageSize: 1 }, client)
  return page.pagination.total
}

/**
 * Writes the answer about ONE movement: `PATCH /api/movements/:id` with the literal body
 * `{ ownershipDecision }`. The answer is read, so a broken one is a ValidationError, and
 * then dropped: it does not carry `ownership`, and the list is always asked for again.
 */
export async function setOwnershipDecision(
  id: number,
  decision: OwnershipDecision,
  client: HttpClient = http,
): Promise<void> {
  parseUpdatedMovement(
    await client<unknown>(`${MOVEMENTS_PATH}/${id}`, patch({ ownershipDecision: decision })),
  )
}
