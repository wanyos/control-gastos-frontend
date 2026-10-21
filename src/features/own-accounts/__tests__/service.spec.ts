import { describe, it, expect } from 'vitest'

import { ValidationError } from '@/shared/errors'

import * as service from '../service'
import {
  HOLDER_NAMES_PATH,
  OWN_ACCOUNTS_PATH,
  createOwnAccount,
  getHolderNames,
  getOwnAccounts,
  parseOwnAccounts,
  putHolderNames,
  updateOwnAccount,
} from '../service'
import {
  HOLDER_NAMES,
  NEW_ROW,
  TWELVE_ROWS,
  answer,
  fakeClient,
  rawEmptyOwnAccounts,
  rawOwnAccounts,
  rawRow,
  rowOf,
} from './fixtures'

const JSON_TYPE = 'application/json'

describe('own-accounts service', () => {
  it('maps every field of an own account', async () => {
    const api = fakeClient({ [`GET ${OWN_ACCOUNTS_PATH}`]: answer(rawOwnAccounts()) })

    const accounts = await getOwnAccounts(api.client)

    expect(api.calls).toEqual([
      { path: OWN_ACCOUNTS_PATH, method: 'GET', body: undefined, contentType: undefined },
    ])
    expect(accounts).toHaveLength(12)
    // In the order of the answer, with every field and without the two stamps.
    expect(accounts.map((account) => account.id)).toEqual(TWELVE_ROWS.map((row) => row.id))
    expect(accounts).toEqual(TWELVE_ROWS)
    expect(accounts[3]).toEqual({
      id: 5,
      name: 'Cuenta inventada dos',
      bank: 'ING',
      accountNumber: 'ES00 0000 0000 0000 0000 0002',
      type: 'checking',
      openedAt: '2015-09-14',
      closedAt: '2024-06-30',
      texts: ['Cuenta Inventada Dos'],
    })
    expect(Object.keys(accounts[0]!)).not.toContain('createdAt')
    expect(await getOwnAccounts(fakeClient({ GET: answer(rawEmptyOwnAccounts()) }).client)).toEqual(
      [],
    )
  })

  it('rejects a type outside the six of the contract', () => {
    const list = TWELVE_ROWS.map((row) => ({ ...row }))
    list[4] = { ...list[4]!, type: 'pension' }

    expect(() => parseOwnAccounts(rawOwnAccounts(list))).toThrow(ValidationError)
    expect(() => parseOwnAccounts(rawOwnAccounts(list))).toThrow(
      'GET /api/own-accounts: ownAccounts[4].type is not one of checking | savings | investment | deposit | crypto | other',
    )
    // Other breaks of the contract name their field too.
    expect(() => parseOwnAccounts({ ownAccounts: [{ ...rawRow(rowOf(3)), texts: 'x' }] })).toThrow(
      'ownAccounts[0].texts is not an array',
    )
    expect(() =>
      parseOwnAccounts({ ownAccounts: [{ ...rawRow(rowOf(3)), openedAt: '02/04/2019' }] }),
    ).toThrow('ownAccounts[0].openedAt is not a YYYY-MM-DD date')
    expect(() => parseOwnAccounts([])).toThrow('response is not an object')
  })

  it('posts a new account with only the given fields', async () => {
    const api = fakeClient({ [`POST ${OWN_ACCOUNTS_PATH}`]: answer(rawRow(NEW_ROW)) })

    const created = await createOwnAccount(
      {
        name: 'Monedero inventado dos',
        bank: 'Criptan',
        type: 'crypto',
        texts: ['Monedero Inventado Dos'],
      },
      api.client,
    )

    expect(api.calls).toEqual([
      {
        path: OWN_ACCOUNTS_PATH,
        method: 'POST',
        body: {
          name: 'Monedero inventado dos',
          bank: 'Criptan',
          type: 'crypto',
          texts: ['Monedero Inventado Dos'],
        },
        contentType: JSON_TYPE,
      },
    ])
    expect(created).toEqual(NEW_ROW)
    // A broken answer names the request it came from.
    const broken = fakeClient({ POST: answer({ ...rawRow(NEW_ROW), bank: '' }) })
    await expect(
      createOwnAccount({ name: 'x', bank: 'y', type: 'other' }, broken.client),
    ).rejects.toThrow('POST /api/own-accounts: response.bank is not a non-empty string')
  })

  it('patches an account with only the given fields', async () => {
    const closed = { ...rowOf(4), closedAt: '2026-10-21' }
    const api = fakeClient({ [`PATCH ${OWN_ACCOUNTS_PATH}/4`]: answer(rawRow(closed)) })

    const updated = await updateOwnAccount(4, { closedAt: '2026-10-21' }, api.client)

    expect(api.calls).toEqual([
      {
        path: `${OWN_ACCOUNTS_PATH}/4`,
        method: 'PATCH',
        body: { closedAt: '2026-10-21' },
        contentType: JSON_TYPE,
      },
    ])
    expect(updated).toEqual(closed)

    // `null` travels as null, and an empty body never leaves.
    const nulls = fakeClient({ PATCH: answer(rawRow({ ...rowOf(5), accountNumber: null })) })
    await updateOwnAccount(5, { accountNumber: null }, nulls.client)
    expect(nulls.calls[0]?.body).toEqual({ accountNumber: null })
    const none = fakeClient({ PATCH: answer(rawRow(rowOf(5))) })
    await expect(updateOwnAccount(5, {}, none.client)).rejects.toThrow(ValidationError)
    expect(none.calls).toEqual([])
  })

  it('puts the whole list of the forms of your name', async () => {
    const api = fakeClient({
      [`GET ${HOLDER_NAMES_PATH}`]: answer(HOLDER_NAMES),
      [`PUT ${HOLDER_NAMES_PATH}`]: answer({ names: ['Inventado T', 'Titular Inventado'] }),
    })

    expect(await getHolderNames(api.client)).toEqual(['Inventado Titular', 'Titular Inventado'])
    const saved = await putHolderNames(['Titular Inventado', 'Inventado T'], api.client)

    expect(api.calls).toEqual([
      { path: HOLDER_NAMES_PATH, method: 'GET', body: undefined, contentType: undefined },
      {
        path: HOLDER_NAMES_PATH,
        method: 'PUT',
        body: { names: ['Titular Inventado', 'Inventado T'] },
        contentType: JSON_TYPE,
      },
    ])
    expect(saved).toEqual(['Inventado T', 'Titular Inventado'])

    // An empty list travels as it is: it deletes them all.
    const empty = fakeClient({ PUT: answer({ names: [] }) })
    expect(await putHolderNames([], empty.client)).toEqual([])
    expect(empty.calls[0]?.body).toEqual({ names: [] })
    await expect(putHolderNames([], fakeClient({ PUT: answer({}) }).client)).rejects.toThrow(
      'PUT /api/own-accounts/holder-names: names is not an array',
    )
  })

  it('sends no DELETE to own accounts', async () => {
    // No export is named after deleting.
    expect(Object.keys(service).filter((name) => /delete|remove/i.test(name))).toEqual([])

    // Every request function of the module, called: none uses DELETE.
    const api = fakeClient({
      [`GET ${OWN_ACCOUNTS_PATH}`]: answer(rawOwnAccounts()),
      [`POST ${OWN_ACCOUNTS_PATH}`]: answer(rawRow(NEW_ROW)),
      [`PATCH ${OWN_ACCOUNTS_PATH}/3`]: answer(rawRow(rowOf(3))),
      [`GET ${HOLDER_NAMES_PATH}`]: answer(HOLDER_NAMES),
      [`PUT ${HOLDER_NAMES_PATH}`]: answer(HOLDER_NAMES),
    })
    await service.getOwnAccounts(api.client)
    await service.createOwnAccount({ name: 'a b c', bank: 'N26', type: 'other' }, api.client)
    await service.updateOwnAccount(3, { texts: [] }, api.client)
    await service.getHolderNames(api.client)
    await service.putHolderNames([], api.client)

    const requestFunctions = Object.entries(service)
      .filter(([, value]) => typeof value === 'function')
      .map(([name]) => name)
      .filter((name) => !name.startsWith('parse'))
    expect(requestFunctions.sort()).toEqual([
      'createOwnAccount',
      'getHolderNames',
      'getOwnAccounts',
      'putHolderNames',
      'updateOwnAccount',
    ])
    expect(api.calls.map((call) => call.method)).toEqual(['GET', 'POST', 'PATCH', 'GET', 'PUT'])
    expect(api.calls.some((call) => call.method === 'DELETE')).toBe(false)
  })
})
