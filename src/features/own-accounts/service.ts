// The table of own accounts and the forms of the holder's name (feature 36): five
// requests and how their answers are read. Writes are only POST and PATCH of a row and
// PUT of the forms of the name; there is no function that deletes (R15).

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { createValidators } from '@/shared/validation'
import type { Validators } from '@/shared/validation'

import type { NewOwnAccount, OwnAccount, OwnAccountChanges, OwnAccountType } from './types'

/** Paths are absolute so they always resolve against the API origin (see docs/stack.md). */
export const OWN_ACCOUNTS_PATH = '/api/own-accounts'
export const HOLDER_NAMES_PATH = '/api/own-accounts/holder-names'

const TYPES: readonly OwnAccountType[] = [
  'checking',
  'savings',
  'investment',
  'deposit',
  'crypto',
  'other',
]

const readChecks = createValidators(`GET ${OWN_ACCOUNTS_PATH}`)
const createChecks = createValidators(`POST ${OWN_ACCOUNTS_PATH}`)
const updateChecks = createValidators(`PATCH ${OWN_ACCOUNTS_PATH}/:id`)
const namesReadChecks = createValidators(`GET ${HOLDER_NAMES_PATH}`)
const namesWriteChecks = createValidators(`PUT ${HOLDER_NAMES_PATH}`)

const withBody = (method: 'POST' | 'PATCH' | 'PUT', body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const asNullableString = (checks: Validators, value: unknown, path: string): string | null =>
  value === null ? null : checks.asString(value, path)

const asTexts = (checks: Validators, value: unknown, path: string): string[] =>
  checks.asArray(value, path).map((text, index) => checks.asText(text, `${path}[${index}]`))

/** One row of the table, or ValidationError naming the field that breaks the contract. */
export function parseOwnAccount(
  raw: unknown,
  path: string,
  checks: Validators = readChecks,
): OwnAccount {
  const row = checks.asObject(raw, path)
  return {
    id: checks.asInteger(row.id, `${path}.id`),
    name: checks.asText(row.name, `${path}.name`),
    bank: checks.asText(row.bank, `${path}.bank`),
    accountNumber: asNullableString(checks, row.accountNumber, `${path}.accountNumber`),
    type: checks.asMember(row.type, TYPES, `${path}.type`),
    openedAt: checks.asNullableDateOnly(row.openedAt, `${path}.openedAt`),
    closedAt: checks.asNullableDateOnly(row.closedAt, `${path}.closedAt`),
    texts: asTexts(checks, row.texts, `${path}.texts`),
  }
}

/** The body of `GET /api/own-accounts`, in the order it came. */
export function parseOwnAccounts(raw: unknown): OwnAccount[] {
  const body = readChecks.asObject(raw, 'response')
  return readChecks
    .asArray(body.ownAccounts, 'ownAccounts')
    .map((item, index) => parseOwnAccount(item, `ownAccounts[${index}]`))
}

/** The body of the GET and of the PUT of the forms of the name: `{ names }`. */
export function parseHolderNames(raw: unknown, checks: Validators = namesReadChecks): string[] {
  const body = checks.asObject(raw, 'response')
  return asTexts(checks, body.names, 'names')
}

/** The whole table. Read only. The client is injectable for tests. */
export async function getOwnAccounts(client: HttpClient = http): Promise<OwnAccount[]> {
  return parseOwnAccounts(await client<unknown>(OWN_ACCOUNTS_PATH))
}

/** Adds a row; the 201 answers with it (R5). */
export async function createOwnAccount(
  account: NewOwnAccount,
  client: HttpClient = http,
): Promise<OwnAccount> {
  const raw = await client<unknown>(OWN_ACCOUNTS_PATH, withBody('POST', account))
  return parseOwnAccount(raw, 'response', createChecks)
}

/** Changes a row: only what travels changes, and an empty body never leaves (R6, R7). */
export async function updateOwnAccount(
  id: number,
  changes: OwnAccountChanges,
  client: HttpClient = http,
): Promise<OwnAccount> {
  if (Object.keys(changes).length === 0) {
    updateChecks.reject('body', 'a change of at least one field')
  }
  const raw = await client<unknown>(`${OWN_ACCOUNTS_PATH}/${id}`, withBody('PATCH', changes))
  return parseOwnAccount(raw, 'response', updateChecks)
}

/** The forms of the holder's name. Read only. */
export async function getHolderNames(client: HttpClient = http): Promise<string[]> {
  return parseHolderNames(await client<unknown>(HOLDER_NAMES_PATH))
}

/** Replaces the forms of the name by exactly `names`; an empty list deletes them all (R13). */
export async function putHolderNames(
  names: string[],
  client: HttpClient = http,
): Promise<string[]> {
  const raw = await client<unknown>(HOLDER_NAMES_PATH, withBody('PUT', { names }))
  return parseHolderNames(raw, namesWriteChecks)
}
