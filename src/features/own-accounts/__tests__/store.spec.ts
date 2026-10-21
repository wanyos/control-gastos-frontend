import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { HOLDER_NAMES_PATH, OWN_ACCOUNTS_PATH, parseOwnAccount } from '../service'
import { useOwnAccountsStore } from '../store'
import { draftOf, emptyDraft } from '../texts'
import type { OwnAccountDraft } from '../types'
import {
  HOLDER_NAMES,
  NEW_ROW,
  NOT_FOUND_BODY,
  SERVER_ERROR_BODY,
  VALIDATION_BODY,
  answer,
  fakeClient,
  httpError,
  networkError,
  rawOwnAccounts,
  rawRow,
  rejectWith,
  rowOf,
  rows,
  rowsWith,
  rowsWithNew,
  unreadable,
} from './fixtures'

const TABLE = `GET ${OWN_ACCOUNTS_PATH}`
const NAMES = `GET ${HOLDER_NAMES_PATH}`

const account = (id: number) => parseOwnAccount(rawRow(rowOf(id)), 'row')

const newDraft = (): OwnAccountDraft => ({
  ...emptyDraft(),
  name: 'Monedero inventado dos',
  bank: 'Criptan',
  type: 'crypto',
  openedAt: '2026-10-21',
  texts: ['Monedero Inventado Dos', ''],
})

/** A store with the table and the forms already read, and the window of row `id` open. */
async function editing(id: number, api: ReturnType<typeof fakeClient>) {
  const store = useOwnAccountsStore()
  await store.load(api.client)
  await store.loadNames(api.client)
  const row = store.accounts?.find((one) => one.id === id)
  if (!row) throw new Error(`no row ${id}`)
  store.openEdit(row)
  return { store, row }
}

describe('useOwnAccountsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads the table and the forms of your name', async () => {
    const api = fakeClient({ [TABLE]: answer(rawOwnAccounts()), [NAMES]: answer(HOLDER_NAMES) })
    const store = useOwnAccountsStore()
    expect(store.loadState).toBe('idle')
    expect(store.namesState).toBe('idle')

    const loading = store.load(api.client)
    expect(store.loadState).toBe('loading')
    await loading
    await store.loadNames(api.client)

    expect(store.loadState).toBe('loaded')
    expect(store.accounts?.map((one) => one.id)).toEqual(rows().map((row) => row.id))
    expect(store.namesState).toBe('loaded')
    expect(store.names).toEqual(['Inventado Titular', 'Titular Inventado'])
    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toEqual([TABLE, NAMES])

    // A failed read of each stays in its own place, and never throws.
    const failing = fakeClient({
      [TABLE]: rejectWith(networkError()),
      [NAMES]: rejectWith(unreadable()),
    })
    await store.load(failing.client)
    expect(store.loadState).toBe('failed')
    expect(store.loadError?.code).toBe('API_NETWORK')
    expect(store.namesState).toBe('loaded')
    await store.loadNames(failing.client)
    expect(store.namesState).toBe('failed')
    expect(store.namesError?.code).toBe('VALIDATION')
  })

  it('creating an account sends only the filled fields and reads the table again', async () => {
    const api = fakeClient({
      [TABLE]: [answer(rawOwnAccounts()), answer(rawOwnAccounts(rowsWithNew()))],
      [`POST ${OWN_ACCOUNTS_PATH}`]: answer(rawRow(NEW_ROW)),
    })
    const store = useOwnAccountsStore()
    await store.load(api.client)
    store.openCreate()
    expect(store.dialog).toEqual({ mode: 'create' })

    const done = await store.saveAccount(newDraft(), api.client)

    expect(done).toBe(true)
    expect(api.of('POST', OWN_ACCOUNTS_PATH).map((call) => call.body)).toEqual([
      {
        name: 'Monedero inventado dos',
        bank: 'Criptan',
        type: 'crypto',
        openedAt: '2026-10-21',
        texts: ['Monedero Inventado Dos'],
      },
    ])
    expect(api.calls.map((call) => call.method)).toEqual(['GET', 'POST', 'GET'])
    expect(store.dialog).toBeNull()
    expect(store.accounts).toHaveLength(13)
    expect(store.accounts?.[3]?.name).toBe('Monedero inventado dos')
  })

  it('changing only the texts sends only the texts and reads the table again', async () => {
    const texts = ['Hucha inventada', 'Hucha Inventada Bankinter']
    const api = fakeClient({
      [TABLE]: [answer(rawOwnAccounts()), answer(rawOwnAccounts(rowsWith(7, { texts })))],
      [NAMES]: answer(HOLDER_NAMES),
      [`PATCH ${OWN_ACCOUNTS_PATH}/7`]: answer(rawRow({ ...rowOf(7), texts })),
    })
    const { store, row } = await editing(7, api)

    const done = await store.saveAccount({ ...draftOf(row), texts: [...texts, '  '] }, api.client)

    expect(done).toBe(true)
    expect(api.of('PATCH', `${OWN_ACCOUNTS_PATH}/7`).map((call) => call.body)).toEqual([{ texts }])
    expect(api.calls.map((call) => call.method)).toEqual(['GET', 'GET', 'PATCH', 'GET'])
    expect(store.dialog).toBeNull()
    expect(store.accounts?.find((one) => one.id === 7)?.texts).toEqual(texts)
  })

  it('setting the closing date sends only closedAt', async () => {
    const api = fakeClient({
      [TABLE]: [
        answer(rawOwnAccounts()),
        answer(rawOwnAccounts(rowsWith(4, { closedAt: '2026-10-21' }))),
      ],
      [NAMES]: answer(HOLDER_NAMES),
      [`PATCH ${OWN_ACCOUNTS_PATH}/4`]: answer(rawRow({ ...rowOf(4), closedAt: '2026-10-21' })),
    })
    const { store, row } = await editing(4, api)

    expect(await store.saveAccount({ ...draftOf(row), closedAt: '2026-10-21' }, api.client)).toBe(
      true,
    )

    expect(api.of('PATCH', `${OWN_ACCOUNTS_PATH}/4`).map((call) => call.body)).toEqual([
      { closedAt: '2026-10-21' },
    ])
    expect(store.accounts?.find((one) => one.id === 4)?.closedAt).toBe('2026-10-21')
  })

  it('saving with nothing changed sends nothing and closes', async () => {
    const api = fakeClient({ [TABLE]: answer(rawOwnAccounts()), [NAMES]: answer(HOLDER_NAMES) })
    const { store, row } = await editing(5, api)
    const before = api.calls.length

    expect(
      await store.saveAccount({ ...draftOf(row), texts: [...row.texts, ''] }, api.client),
    ).toBe(true)

    expect(api.calls).toHaveLength(before)
    expect(store.dialog).toBeNull()

    // A window that would be rejected sends nothing either, and stays open.
    store.openCreate()
    expect(await store.saveAccount({ ...newDraft(), texts: ['N2'] }, api.client)).toBe(false)
    expect(await store.saveAccount({ ...newDraft(), type: '' }, api.client)).toBe(false)
    expect(api.calls).toHaveLength(before)
    expect(store.dialog).toEqual({ mode: 'create' })
  })

  it('a rejected save keeps the dialog open with a sentence and the table as it was', async () => {
    const api = fakeClient({
      [TABLE]: answer(rawOwnAccounts()),
      [NAMES]: answer(HOLDER_NAMES),
      [`PATCH ${OWN_ACCOUNTS_PATH}/3`]: rejectWith(httpError(400, VALIDATION_BODY)),
      [`POST ${OWN_ACCOUNTS_PATH}`]: rejectWith(httpError(400, VALIDATION_BODY)),
    })
    const { store, row } = await editing(3, api)
    const table = store.accounts

    expect(await store.saveAccount({ ...draftOf(row), texts: ['Cuenta Uno'] }, api.client)).toBe(
      false,
    )

    expect(store.dialog).toEqual({ mode: 'edit', account: account(3) })
    expect(store.saveMessage).toBe("Nothing was saved: the server didn't accept one of the fields.")
    expect(store.accounts).toBe(table)
    expect(store.isSaving).toBe(false)
    // A 400 promises nothing was written: the table is not read again.
    expect(api.calls.map((call) => call.method)).toEqual(['GET', 'GET', 'PATCH'])

    // The same for a new account.
    store.openCreate()
    expect(store.saveMessage).toBeNull()
    expect(await store.saveAccount(newDraft(), api.client)).toBe(false)
    expect(store.dialog).toEqual({ mode: 'create' })
    expect(store.saveMessage).toBe("Nothing was saved: the server didn't accept one of the fields.")
    expect(api.calls.map((call) => call.method)).toEqual(['GET', 'GET', 'PATCH', 'POST'])
  })

  it('a failure that may have written reads the table again', async () => {
    const written = rowsWith(3, { texts: ['Cuenta Uno'] })
    const api = fakeClient({
      [TABLE]: [answer(rawOwnAccounts()), answer(rawOwnAccounts(written))],
      [NAMES]: answer(HOLDER_NAMES),
      [`PATCH ${OWN_ACCOUNTS_PATH}/3`]: rejectWith(httpError(500, SERVER_ERROR_BODY)),
    })
    const { store, row } = await editing(3, api)

    expect(await store.saveAccount({ ...draftOf(row), texts: ['Cuenta Uno'] }, api.client)).toBe(
      false,
    )

    expect(store.dialog?.mode).toBe('edit')
    expect(store.saveMessage).toBe(
      'Something went wrong saving. The table now shows what the server has.',
    )
    expect(api.calls.map((call) => call.method)).toEqual(['GET', 'GET', 'PATCH', 'GET'])
    expect(store.accounts?.find((one) => one.id === 3)?.texts).toEqual(['Cuenta Uno'])

    // A network failure and a 404 read it again too.
    for (const failure of [networkError(), httpError(404, NOT_FOUND_BODY)]) {
      const again = fakeClient({
        [TABLE]: answer(rawOwnAccounts()),
        [NAMES]: answer(HOLDER_NAMES),
        PATCH: rejectWith(failure),
      })
      setActivePinia(createPinia())
      const second = await editing(3, again)
      await second.store.saveAccount({ ...draftOf(second.row), name: 'Cuenta Uno' }, again.client)
      expect(again.calls.map((call) => call.method)).toEqual(['GET', 'GET', 'PATCH', 'GET'])
    }
  })

  it('a failed save whose second read of the table fails too says the table could not be read', async () => {
    for (const failure of [networkError(), httpError(500, SERVER_ERROR_BODY)]) {
      setActivePinia(createPinia())
      const api = fakeClient({
        [TABLE]: [answer(rawOwnAccounts()), rejectWith(networkError())],
        [NAMES]: answer(HOLDER_NAMES),
        PATCH: rejectWith(failure),
      })
      const { store, row } = await editing(3, api)

      expect(await store.saveAccount({ ...draftOf(row), name: 'Cuenta Uno' }, api.client)).toBe(
        false,
      )

      expect(api.calls.map((call) => call.method)).toEqual(['GET', 'GET', 'PATCH', 'GET'])
      expect(store.loadState).toBe('failed')
      expect(store.accounts).toBeNull()
      expect(store.dialog?.mode).toBe('edit')
      expect(store.saveMessage).toBe(
        "Something went wrong saving, and the table couldn't be read again. Reload the page to see what the server has.",
      )
    }

    // The same for a new account.
    setActivePinia(createPinia())
    const created = fakeClient({
      [TABLE]: [answer(rawOwnAccounts()), rejectWith(networkError())],
      [NAMES]: answer(HOLDER_NAMES),
      POST: rejectWith(networkError()),
    })
    const store = useOwnAccountsStore()
    await store.load(created.client)
    store.openCreate()
    expect(await store.saveAccount(newDraft(), created.client)).toBe(false)
    expect(created.calls.map((call) => call.method)).toEqual(['GET', 'POST', 'GET'])
    expect(store.saveMessage).toBe(
      "Something went wrong saving, and the table couldn't be read again. Reload the page to see what the server has.",
    )
  })

  it('saving the forms of your name sends the whole list and shows what came back', async () => {
    const api = fakeClient({
      [NAMES]: answer(HOLDER_NAMES),
      [`PUT ${HOLDER_NAMES_PATH}`]: answer({ names: ['Inventado T', 'Titular Inventado'] }),
    })
    const store = useOwnAccountsStore()
    await store.loadNames(api.client)
    store.openNames()
    expect(store.namesDialogOpen).toBe(true)

    expect(await store.saveNames(['Titular Inventado', '', 'Inventado T'], api.client)).toBe(true)

    expect(api.of('PUT', HOLDER_NAMES_PATH).map((call) => call.body)).toEqual([
      { names: ['Titular Inventado', 'Inventado T'] },
    ])
    expect(store.names).toEqual(['Inventado T', 'Titular Inventado'])
    expect(store.namesDialogOpen).toBe(false)

    // An empty list deletes them all, without asking more.
    const empty = fakeClient({ PUT: answer({ names: [] }) })
    store.openNames()
    expect(await store.saveNames(['  '], empty.client)).toBe(true)
    expect(empty.calls[0]?.body).toEqual({ names: [] })
    expect(store.names).toEqual([])

    // A form too short sends nothing.
    store.openNames()
    const none = fakeClient({})
    expect(await store.saveNames(['Ti'], none.client)).toBe(false)
    expect(none.calls).toEqual([])
    expect(store.namesDialogOpen).toBe(true)
  })

  it('a rejected save of the forms of your name keeps the list as it was', async () => {
    const api = fakeClient({
      [NAMES]: answer(HOLDER_NAMES),
      [`PUT ${HOLDER_NAMES_PATH}`]: rejectWith(httpError(400, VALIDATION_BODY)),
    })
    const store = useOwnAccountsStore()
    await store.loadNames(api.client)
    store.openNames()

    expect(await store.saveNames(['Titular Inventado', 'Otra Forma'], api.client)).toBe(false)

    expect(store.names).toEqual(['Inventado Titular', 'Titular Inventado'])
    expect(store.namesDialogOpen).toBe(true)
    expect(store.namesSaveMessage).toBe(
      "Nothing was saved: the server didn't accept one of the forms.",
    )
    expect(api.calls.map((call) => call.method)).toEqual(['GET', 'PUT'])
  })

  it('a failed save of the forms of your name that may have written asks them again', async () => {
    const api = fakeClient({
      [NAMES]: [answer(HOLDER_NAMES), answer({ names: ['Otra Forma', 'Titular Inventado'] })],
      [`PUT ${HOLDER_NAMES_PATH}`]: rejectWith(networkError()),
    })
    const store = useOwnAccountsStore()
    await store.loadNames(api.client)
    store.openNames()

    expect(await store.saveNames(['Titular Inventado', 'Otra Forma'], api.client)).toBe(false)

    expect(api.calls.map((call) => call.method)).toEqual(['GET', 'PUT', 'GET'])
    expect(store.names).toEqual(['Otra Forma', 'Titular Inventado'])
    expect(store.namesDialogOpen).toBe(true)
    expect(store.namesSaveMessage).toBe(
      'Something went wrong saving. The list now shows what the server has.',
    )
  })

  it('a failed save of the forms of your name whose second read fails too says the list could not be read', async () => {
    for (const failure of [networkError(), httpError(500, SERVER_ERROR_BODY)]) {
      setActivePinia(createPinia())
      const api = fakeClient({
        [NAMES]: [answer(HOLDER_NAMES), rejectWith(networkError())],
        PUT: rejectWith(failure),
      })
      const store = useOwnAccountsStore()
      await store.loadNames(api.client)
      store.openNames()

      expect(await store.saveNames(['Titular Inventado', 'Otra Forma'], api.client)).toBe(false)

      expect(api.calls.map((call) => call.method)).toEqual(['GET', 'PUT', 'GET'])
      expect(store.namesState).toBe('failed')
      expect(store.namesDialogOpen).toBe(true)
      expect(store.namesSaveMessage).toBe(
        "Something went wrong saving, and the list couldn't be read again. Reload the page to see what the server has.",
      )
    }
  })
})
