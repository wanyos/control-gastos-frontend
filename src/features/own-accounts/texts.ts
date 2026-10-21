// Everything pure of the table of own accounts (feature 36): how the contract compares a
// text, the checks the window runs before sending, the bodies of the POST and the PATCH,
// and every sentence of the screen. Never the backend's `message`: it is Spanish and
// written for developers.

import { ApiError, API_NETWORK, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import type {
  NewOwnAccount,
  OwnAccount,
  OwnAccountChanges,
  OwnAccountDraft,
  OwnAccountType,
} from './types'

// ─── How the contract compares a text ───────────────────────────────────────

/**
 * Lower case, no accents, every run of characters that are not `a-z` or digits turned
 * into one space, no spaces at the ends. Not `normalizeMatchText` of category-rules:
 * that one keeps symbols, and would measure differently from the backend.
 */
export function normalizeOwnText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** The contract rejects a text or a form of the name under 3 characters once compared. */
export const isOwnTextTooShort = (text: string): boolean => normalizeOwnText(text).length < 3

/** Drops the fields left blank; the rest travels as it was typed. */
export const cleanList = (list: readonly string[]): string[] =>
  list.filter((text) => text.trim() !== '')

// ─── Screen texts ────────────────────────────────────────────────────────────

export const TITLE = 'My accounts'
export const INTRO =
  "Your accounts and products, in any bank, and the texts each one appears with in the descriptions of your movements. A movement that contains one of these texts, or a form of your name, is money moving between your own accounts and doesn't count in the totals. A text that is just the name of a bank only makes it doubtful."
export const ADD_ACCOUNT = 'Add account'
export const COLUMNS = ['Name', 'Bank', 'Number', 'Type', 'Opened', 'Closed', 'Appears as']
export const EDIT = 'Edit'
export const NO_TEXTS = 'No texts'
export const NO_ACCOUNTS = 'No accounts yet.'
export const EMPTY_CELL = '—'
export const CREATE_TITLE = 'Add an account'
export const EDIT_TITLE = 'Edit account'
export const FIELD_LABELS = {
  name: 'Name',
  bank: 'Bank',
  accountNumber: 'Account number',
  type: 'Type',
  openedAt: 'Opened on',
  closedAt: 'Closed on',
  texts: 'Appears as',
} as const
export const CHOOSE_TYPE = 'Choose a type…'
export const ACCOUNT_HINT =
  "A row with no texts recognizes nothing. Rows can't be deleted: leave it with no texts instead."
export const ADD_TEXT = 'Add text'
/** The label of each field of a list, followed by its number: `Text 1`, `Form 2`. */
export const TEXT_ITEM = 'Text'
export const FORM_ITEM = 'Form'
export const ADD_FORM = 'Add a form'
export const REMOVE = 'Remove'
export const SAVE = 'Save'
export const CANCEL = 'Cancel'
export const RETRY = 'Try again'
export const NAMES_TITLE = 'Forms of your name'
export const NAMES_HINT =
  'How your name appears in the descriptions: in full, surnames first, cut short by the bank… Only the whole form counts.'
export const NO_NAMES = 'No forms of your name yet.'
export const NAMES_DIALOG_TITLE = 'Forms of your name'

export const FIELD_MESSAGES = {
  blank: 'Write something here.',
  type: 'Choose a type.',
  short: 'Use at least 3 letters or digits.',
  closedBeforeOpened: "The closing date can't be before the opening date.",
} as const

/** The order of the type list in the window: the contract's. */
export const OWN_ACCOUNT_TYPES: readonly OwnAccountType[] = [
  'checking',
  'savings',
  'investment',
  'deposit',
  'crypto',
  'other',
]

export const TYPE_LABELS: Record<OwnAccountType, string> = {
  checking: 'Checking account',
  savings: 'Savings account',
  investment: 'Investment',
  deposit: 'Deposit',
  crypto: 'Crypto',
  other: 'Other',
}

// ─── The window: what it starts with, and what it would not let through ──────

export const emptyDraft = (): OwnAccountDraft => ({
  name: '',
  bank: '',
  accountNumber: '',
  type: '',
  openedAt: '',
  closedAt: '',
  texts: [],
})

export const draftOf = (row: OwnAccount): OwnAccountDraft => ({
  name: row.name,
  bank: row.bank,
  accountNumber: row.accountNumber ?? '',
  type: row.type,
  openedAt: row.openedAt ?? '',
  closedAt: row.closedAt ?? '',
  texts: [...row.texts],
})

export interface DraftProblems {
  name?: string
  bank?: string
  type?: string
  /** One per field of the list: null when that field is fine (a blank one is). */
  texts: (string | null)[]
  closedAt?: string
}

/** The sentence of each field of a list: a filled one too short once compared. */
export const listProblems = (list: readonly string[]): (string | null)[] =>
  list.map((text) => (text.trim() !== '' && isOwnTextTooShort(text) ? FIELD_MESSAGES.short : null))

/** What the contract would reject with a 400, field by field (R10). */
export function draftProblems(draft: OwnAccountDraft): DraftProblems {
  const problems: DraftProblems = { texts: listProblems(draft.texts) }
  if (draft.name.trim() === '') problems.name = FIELD_MESSAGES.blank
  if (draft.bank.trim() === '') problems.bank = FIELD_MESSAGES.blank
  if (draft.type === '') problems.type = FIELD_MESSAGES.type
  // Both are YYYY-MM-DD, so comparing the strings compares the dates.
  if (draft.openedAt !== '' && draft.closedAt !== '' && draft.closedAt < draft.openedAt) {
    problems.closedAt = FIELD_MESSAGES.closedBeforeOpened
  }
  return problems
}

/** True when nothing in `problems` stops the save. */
export const hasProblems = (problems: DraftProblems): boolean =>
  problems.name !== undefined ||
  problems.bank !== undefined ||
  problems.type !== undefined ||
  problems.closedAt !== undefined ||
  problems.texts.some((problem) => problem !== null)

// ─── The bodies that travel ─────────────────────────────────────────────────

/** The body of the POST (R5): the three required fields, and the rest only if filled. */
export function newAccountBody(draft: OwnAccountDraft): NewOwnAccount {
  if (draft.type === '') throw new Error('newAccountBody: the draft has no type')
  const body: NewOwnAccount = { name: draft.name.trim(), bank: draft.bank.trim(), type: draft.type }
  const accountNumber = draft.accountNumber.trim()
  if (accountNumber !== '') body.accountNumber = accountNumber
  if (draft.openedAt !== '') body.openedAt = draft.openedAt
  if (draft.closedAt !== '') body.closedAt = draft.closedAt
  const texts = cleanList(draft.texts)
  if (texts.length > 0) body.texts = texts
  return body
}

const sameList = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((text, index) => text === right[index])

/**
 * The body of the PATCH (R6, R7, R9): only what differs from the row, `null` for a
 * number or a date emptied, and the whole list of texts if any of them changed. `{}`
 * means nothing changed.
 */
export function changesOf(row: OwnAccount, draft: OwnAccountDraft): OwnAccountChanges {
  const changes: OwnAccountChanges = {}
  const name = draft.name.trim()
  if (name !== row.name) changes.name = name
  const bank = draft.bank.trim()
  if (bank !== row.bank) changes.bank = bank
  const accountNumber = draft.accountNumber.trim() === '' ? null : draft.accountNumber.trim()
  if (accountNumber !== row.accountNumber) changes.accountNumber = accountNumber
  if (draft.type !== '' && draft.type !== row.type) changes.type = draft.type
  const openedAt = draft.openedAt === '' ? null : draft.openedAt
  if (openedAt !== row.openedAt) changes.openedAt = openedAt
  const closedAt = draft.closedAt === '' ? null : draft.closedAt
  if (closedAt !== row.closedAt) changes.closedAt = closedAt
  const texts = cleanList(draft.texts)
  if (!sameList(texts, row.texts)) changes.texts = texts
  return changes
}

// ─── Sentences of a failure ─────────────────────────────────────────────────

const statusOf = (error: AppError): number | undefined =>
  error instanceof ApiError ? error.status : undefined

function loadSentence(error: AppError, what: string): string {
  if (error.code === API_NETWORK) return "Couldn't reach the server."
  if (error instanceof ValidationError) {
    return `The server answered, but ${what} couldn't be read.`
  }
  return `Something went wrong loading ${what}.`
}

/** A failed read of the table (R4). */
export const loadErrorMessage = (error: AppError): string => loadSentence(error, 'your accounts')

/** A failed read of the forms of the name (R12). */
export const namesLoadErrorMessage = (error: AppError): string =>
  loadSentence(error, 'the forms of your name')

/** The sentence of a failure that may have written, after reading `what` again. */
const mayHaveWritten = (what: string, readAgain: boolean): string =>
  readAgain
    ? `Something went wrong saving. The ${what} now shows what the server has.`
    : `Something went wrong saving, and the ${what} couldn't be read again. Reload the page to see what the server has.`

/**
 * A failed POST or PATCH of a row (R11). `readAgain` says whether the second read of the
 * table, after a failure that may have written, worked: only then does the sentence say
 * the table shows what the server has.
 */
export function saveErrorMessage(error: AppError, readAgain = true): string {
  if (statusOf(error) === 400) {
    return "Nothing was saved: the server didn't accept one of the fields."
  }
  if (statusOf(error) === 404) return 'Nothing was saved: that account no longer exists.'
  return mayHaveWritten('table', readAgain)
}

/** A failed PUT of the forms of the name (R14). `readAgain`: as in `saveErrorMessage`. */
export function namesSaveErrorMessage(error: AppError, readAgain = true): string {
  if (statusOf(error) === 400) {
    return "Nothing was saved: the server didn't accept one of the forms."
  }
  return mayHaveWritten('list', readAgain)
}
