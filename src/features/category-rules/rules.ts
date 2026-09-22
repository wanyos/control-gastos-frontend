// Pure logic of the categorization rules (feature 17): how a text is normalized and
// proposed, when it is too short, and what the screen says when something fails. No
// state, no HTTP: the store and the components use it, the tests exercise it directly.

import { API_NETWORK, ApiError, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import type { ApplyResult } from './types'

/** The contract's floor: at least 3 characters once normalized. */
export const MIN_MATCH_TEXT = 3

/**
 * Bank paperwork that says nothing about who charged you: a rule made of one of
 * these words would swallow half the statement. Written without looking at any real
 * statement, like the backend's own seed; the human corrects it when it misses (R2).
 */
export const BANK_BOILERPLATE: ReadonlySet<string> = new Set([
  'recib',
  'recibo',
  'recibos',
  'compra',
  'compras',
  'tarj',
  'tarjeta',
  'pago',
  'pagos',
  'transf',
  'transferencia',
  'trf',
  'traspaso',
  'bizum',
  'adeudo',
  'cargo',
  'abono',
  'cajero',
  'reintegro',
  'comision',
  'domiciliacion',
  'cuota',
  'favor',
  'clientes',
  'cliente',
])

/**
 * Exactly what the backend does before storing and before comparing
 * (`normalizeForMatch`): decompose, drop the accent marks, lowercase and trim. Inner
 * spaces are NOT collapsed — neither there nor here.
 */
export function normalizeMatchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .trim()
}

/** The same check the contract makes, run before the network so nothing is sent (R4). */
export function isMatchTextTooShort(text: string): boolean {
  return normalizeMatchText(text).length < MIN_MATCH_TEXT
}

/**
 * How long a proposal has to be before it is left alone. The contract's floor of 3 is
 * enough to be stored, not to be safe: the backend matches with «contains», so `mega`
 * (from «MEGA DEPORTES») also catches «ACADEMIA OMEGA SL». Six characters is short
 * enough for real brand names (`amazon`, `repsol`) and long enough that a fragment of
 * another word is unlikely. Seen in the first run against the real backend (T22).
 */
export const MIN_PROPOSAL_LENGTH = 6

const WORD = /[\p{L}\p{N}]+/gu
const LETTERS_ONLY = /^\p{L}+$/u

/** Long enough, all letters, and not bank paperwork. */
function isMeaningful(word: string): boolean {
  return word.length >= MIN_MATCH_TEXT && LETTERS_ONLY.test(word) && !BANK_BOILERPLATE.has(word)
}

/**
 * What the dialog proposes from a description: the first word that means something and,
 * while that word falls short of `MIN_PROPOSAL_LENGTH`, the ones that follow it, taken
 * verbatim from the description so the proposal is still contained in it. Words with
 * digits stop the growth: they are movement-specific (card numbers, dates). When no word
 * qualifies, the whole normalized description, which is never too broad (R2). Always
 * editable.
 */
export function proposeMatchText(description: string): string {
  const normalized = normalizeMatchText(description)
  const words = [...normalized.matchAll(WORD)]
  const firstIndex = words.findIndex((word) => isMeaningful(word[0]))
  const first = words[firstIndex]
  if (!first) return normalized

  const start = first.index
  let end = start + first[0].length
  for (const word of words.slice(firstIndex + 1)) {
    if (end - start >= MIN_PROPOSAL_LENGTH || !LETTERS_ONLY.test(word[0])) break
    end = word.index + word[0].length
  }
  return normalized.slice(start, end)
}

const RELOADING_RULES = 'Reloading the rules to show what really happened.'

/**
 * The English sentence for a failed save, creating or changing. The backend's own
 * `message` is never painted: it comes in Spanish and names database ids. A 409, a
 * 400 and a network failure are the cases where nothing was written for sure; the
 * rest may have gone through, so the list is reloaded instead of claiming otherwise.
 */
export function ruleErrorMessage(error: AppError): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'Nothing was saved: another rule already uses that text.'
  }
  if (error instanceof ApiError && error.status === 400) {
    return 'Nothing was saved: the text needs at least 3 letters or digits.'
  }
  if (error instanceof ApiError && error.status === 404) {
    return 'Nothing was saved: that category or rule no longer exists.'
  }
  if (error.code === API_NETWORK) {
    return "Couldn't reach the server. Nothing was saved."
  }
  if (error instanceof ValidationError) {
    return `The server answered, but the reply couldn't be read. ${RELOADING_RULES}`
  }
  return `Something went wrong. ${RELOADING_RULES}`
}

/** The English sentence for a list that could not be loaded (R7). */
export function loadErrorMessage(error: AppError): string {
  if (error.code === API_NETWORK) return "Couldn't reach the server."
  if (error instanceof ValidationError) {
    return "The server answered, but the rules couldn't be read."
  }
  return 'Something went wrong loading your rules.'
}

/** The English sentence for a failed delete (R9). A 404 means it was already gone. */
export function deleteErrorMessage(error: AppError): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'That rule no longer exists.'
  }
  if (error.code === API_NETWORK || (error instanceof ApiError && error.status === 400)) {
    return "Couldn't delete the rule. Nothing changed."
  }
  return `Something went wrong. ${RELOADING_RULES}`
}

/** True when the failure leaves the list possibly lying: it must be asked for again (R6). */
export function needsRulesReload(error: AppError): boolean {
  if (error instanceof ApiError && (error.status === 409 || error.status === 400)) return false
  return error.code !== API_NETWORK
}

const MAY_BE_CATEGORIZED = 'The review queue has been reloaded.'

/**
 * The English sentence for a pass that did not finish, whether the backend said so in
 * its own 200 or the request failed. It always admits some movements may already be
 * categorized: the contract does not promise the pass is all or nothing, and a network
 * failure on a POST is no proof it never arrived (R13).
 */
export function applyErrorMessage(failure: AppError | { code: string }): string {
  if (failure instanceof ApiError && failure.code === API_NETWORK) {
    return `Couldn't reach the server. If the request got through, some movements may be categorized. ${MAY_BE_CATEGORIZED}`
  }
  if (failure instanceof Error) {
    return `Something went wrong applying the rules. Some movements may already be categorized. ${MAY_BE_CATEGORIZED}`
  }
  return `The rules pass didn't finish. Some movements may already be categorized. ${MAY_BE_CATEGORIZED}`
}

/** `1 movement` / `3 movements`: every sentence about a count goes through here. */
const countOf = (count: number): string => `${count} ${count === 1 ? 'movement' : 'movements'}`

/** What a finished pass did, in three lines (R12). */
export function applySummaryLines(result: ApplyResult): string[] {
  return [
    `${countOf(result.categorized)} categorized`,
    `${result.unmatched} still without a matching rule`,
    `${result.conflictCount} ${result.conflictCount === 1 ? 'conflict' : 'conflicts'}`,
  ]
}
