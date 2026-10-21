import { describe, it, expect } from 'vitest'

import { ApiError, API_HTTP, API_NETWORK, ValidationError } from '@/shared/errors'

import { parseOwnAccount } from '../service'
import {
  FIELD_MESSAGES,
  changesOf,
  cleanList,
  draftOf,
  draftProblems,
  emptyDraft,
  hasProblems,
  isOwnTextTooShort,
  loadErrorMessage,
  namesLoadErrorMessage,
  namesSaveErrorMessage,
  newAccountBody,
  normalizeOwnText,
  saveErrorMessage,
} from '../texts'
import type { OwnAccountDraft } from '../types'
import { BACKEND_MESSAGES, httpError, networkError, rawRow, rowOf } from './fixtures'

const row = (id: number) => parseOwnAccount(rawRow(rowOf(id)), 'row')

const filled = (changes: Partial<OwnAccountDraft> = {}): OwnAccountDraft => ({
  ...emptyDraft(),
  name: 'Monedero inventado dos',
  bank: 'Criptan',
  type: 'crypto',
  ...changes,
})

describe('own-accounts texts', () => {
  it('normalizes a text the way the contract compares it', () => {
    expect(normalizeOwnText('  TRANSF /Titular_Inventado-Ñandú  ')).toBe(
      'transf titular inventado nandu',
    )
    expect(normalizeOwnText('Cartera Indexada Inventada')).toBe('cartera indexada inventada')
    expect(normalizeOwnText('Depósito «12M»')).toBe('deposito 12m')
    expect(normalizeOwnText('***')).toBe('')
  })

  it('a text shorter than three characters once compared is too short', () => {
    expect(isOwnTextTooShort('N2')).toBe(true)
    expect(isOwnTextTooShort('  á!  ')).toBe(true)
    expect(isOwnTextTooShort('-*-*-')).toBe(true)
    // Inner spaces count: `a b` measures 3, as the backend measures it.
    expect(isOwnTextTooShort('a-b')).toBe(false)
    expect(isOwnTextTooShort('ING')).toBe(false)
    expect(isOwnTextTooShort('N26')).toBe(false)
  })

  it('the body of a new account carries only the filled fields', () => {
    expect(
      newAccountBody(filled({ name: '  Monedero inventado dos ', texts: ['', '  '] })),
    ).toEqual({ name: 'Monedero inventado dos', bank: 'Criptan', type: 'crypto' })
    expect(
      newAccountBody(
        filled({
          accountNumber: ' ES00 0000 0000 0000 0000 0011 ',
          openedAt: '2026-10-21',
          closedAt: '2026-12-31',
          texts: ['Monedero Inventado Dos', '', 'Criptan'],
        }),
      ),
    ).toEqual({
      name: 'Monedero inventado dos',
      bank: 'Criptan',
      type: 'crypto',
      accountNumber: 'ES00 0000 0000 0000 0000 0011',
      openedAt: '2026-10-21',
      closedAt: '2026-12-31',
      texts: ['Monedero Inventado Dos', 'Criptan'],
    })
  })

  it('the changes of a row carry only what differs and null for an emptied field', () => {
    const account = row(5)
    const draft = draftOf(account)

    expect(changesOf(account, { ...draft, name: ' Cuenta inventada dos ' })).toEqual({})
    expect(changesOf(account, { ...draft, accountNumber: '', openedAt: '', closedAt: '' })).toEqual(
      { accountNumber: null, openedAt: null, closedAt: null },
    )
    expect(changesOf(account, { ...draft, bank: 'Openbank', type: 'savings' })).toEqual({
      bank: 'Openbank',
      type: 'savings',
    })
    // A row with no number stays without one when the field is left empty.
    const noNumber = row(7)
    expect(changesOf(noNumber, { ...draftOf(noNumber), accountNumber: '   ' })).toEqual({})
  })

  it('changing one text sends the whole list of texts', () => {
    const account = row(2)
    const draft = draftOf(account)

    expect(
      changesOf(account, { ...draft, texts: ['Cartera Indexada Inventada', 'MyInvestor SA'] }),
    ).toEqual({ texts: ['Cartera Indexada Inventada', 'MyInvestor SA'] })
    // Reordering is a change too: the contract keeps the order they were saved in.
    expect(
      changesOf(account, { ...draft, texts: ['MyInvestor', 'Cartera Indexada Inventada'] }),
    ).toEqual({ texts: ['MyInvestor', 'Cartera Indexada Inventada'] })
    // Leaving every field empty sends an empty list.
    expect(changesOf(account, { ...draft, texts: ['', ' '] })).toEqual({ texts: [] })
    // Blank fields added and left are not a change.
    expect(changesOf(account, { ...draft, texts: [...draft.texts, ''] })).toEqual({})
    expect(cleanList(['  Hucha inventada ', '', '   '])).toEqual(['  Hucha inventada '])
  })

  it('no change gives an empty body', () => {
    for (const raw of [1, 5, 7, 9, 12]) {
      const account = row(raw)
      expect(changesOf(account, draftOf(account))).toEqual({})
    }
  })

  it('a closing date before the opening date is a problem', () => {
    const before = draftProblems(filled({ openedAt: '2024-03-11', closedAt: '2024-03-10' }))
    expect(before.closedAt).toBe(FIELD_MESSAGES.closedBeforeOpened)
    expect(hasProblems(before)).toBe(true)

    expect(
      draftProblems(filled({ openedAt: '2024-03-11', closedAt: '2024-03-11' })).closedAt,
    ).toBeUndefined()
    expect(draftProblems(filled({ openedAt: '', closedAt: '2024-03-10' })).closedAt).toBeUndefined()
    expect(hasProblems(draftProblems(filled({ closedAt: '2024-03-10' })))).toBe(false)
  })

  it('blank name bank or type are problems and a blank text is not', () => {
    const problems = draftProblems({ ...emptyDraft(), name: '   ', texts: ['', 'N2', 'ING'] })
    expect(problems).toEqual({
      name: FIELD_MESSAGES.blank,
      bank: FIELD_MESSAGES.blank,
      type: FIELD_MESSAGES.type,
      texts: [null, FIELD_MESSAGES.short, null],
    })
    expect(hasProblems(problems)).toBe(true)

    const onlyBlankText = draftProblems(filled({ texts: ['  '] }))
    expect(onlyBlankText).toEqual({ texts: [null] })
    expect(hasProblems(onlyBlankText)).toBe(false)
  })

  it('never shows the message of the backend and says what each failure means', () => {
    const validation = httpError(400, { code: 'VALIDATION_ERROR', message: BACKEND_MESSAGES[0]! })
    const notFound = httpError(404, { code: 'NOT_FOUND', message: BACKEND_MESSAGES[1]! })
    const server = httpError(500, { code: 'INTERNAL_SERVER_ERROR', message: BACKEND_MESSAGES[2]! })
    const network = networkError()
    const bad = new ValidationError('GET /api/own-accounts: ownAccounts is not an array')

    expect(loadErrorMessage(network)).toBe("Couldn't reach the server.")
    expect(loadErrorMessage(bad)).toBe("The server answered, but your accounts couldn't be read.")
    expect(loadErrorMessage(server)).toBe('Something went wrong loading your accounts.')
    expect(namesLoadErrorMessage(bad)).toBe(
      "The server answered, but the forms of your name couldn't be read.",
    )
    expect(namesLoadErrorMessage(server)).toBe(
      'Something went wrong loading the forms of your name.',
    )

    expect(saveErrorMessage(validation)).toBe(
      "Nothing was saved: the server didn't accept one of the fields.",
    )
    expect(saveErrorMessage(notFound)).toBe('Nothing was saved: that account no longer exists.')
    expect(saveErrorMessage(network)).toBe(
      'Something went wrong saving. The table now shows what the server has.',
    )
    expect(namesSaveErrorMessage(validation)).toBe(
      "Nothing was saved: the server didn't accept one of the forms.",
    )
    expect(namesSaveErrorMessage(new ApiError('x', API_HTTP, { status: 500 }))).toBe(
      'Something went wrong saving. The list now shows what the server has.',
    )
    expect(namesSaveErrorMessage(new ApiError('x', API_NETWORK))).toBe(
      'Something went wrong saving. The list now shows what the server has.',
    )
    // When the second read failed too, they don't say the table or the list shows anything.
    expect(saveErrorMessage(network, false)).toBe(
      "Something went wrong saving, and the table couldn't be read again. Reload the page to see what the server has.",
    )
    expect(namesSaveErrorMessage(network, false)).toBe(
      "Something went wrong saving, and the list couldn't be read again. Reload the page to see what the server has.",
    )
    expect(saveErrorMessage(validation, false)).toBe(
      "Nothing was saved: the server didn't accept one of the fields.",
    )

    const sentences = [validation, notFound, server, network, bad].flatMap((error) => [
      loadErrorMessage(error),
      namesLoadErrorMessage(error),
      saveErrorMessage(error),
      namesSaveErrorMessage(error),
    ])
    for (const message of BACKEND_MESSAGES) {
      expect(sentences.some((sentence) => sentence.includes(message))).toBe(false)
    }
  })
})
