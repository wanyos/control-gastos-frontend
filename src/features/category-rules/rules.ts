// Pure logic of the categorization rules (feature 17): how a text is normalized and
// proposed, when it is too short, and what the screen says when something fails. No
// state, no HTTP: the store and the components use it, the tests exercise it directly.

import type { CategoryKind } from '@/shared/categories'
import { API_NETWORK, ApiError, ValidationError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import type { MovementQuery } from '@/shared/movements'

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
  // Channel and card terminal, added in feature 18 (R13): they say how you paid, not
  // who charged you, and they were swallowing the proposal of every card movement
  // («TPV VIRTUAL 1234 AMAZON» proposed `tpv virtual`).
  'tpv',
  'virtual',
  'online',
  'internet',
  'web',
  'terminal',
  'comercio',
  'efectivo',
  'ingreso',
  'ingresos',
  'nomina',
  'liquidacion',
  'orden',
  'envio',
])

/**
 * Words that are part of the name but do not identify it: a proposal that ends in
 * one of these is still too generic, so it keeps growing (R14). Two families,
 * business words and Spanish first names, written by hand without looking at any
 * real statement — like `BANK_BOILERPLATE` — and corrected when they miss.
 * Unlike the boilerplate, these words DO travel in the proposal: «AB Servicios
 * Selecta E» proposes `servicios selecta`, not `selecta`.
 */
export const GENERIC_WORDS: ReadonlySet<string> = new Set([
  // business
  'servicios',
  'servicio',
  'grupo',
  'centro',
  'comercial',
  'comerciales',
  'distribuciones',
  'distribucion',
  'sociedad',
  'hermanos',
  'hijos',
  'nuevo',
  'nueva',
  'gran',
  'general',
  'iberica',
  'espana',
  'europa',
  'global',
  'sistemas',
  'soluciones',
  'asociados',
  'gestion',
  'promociones',
  'inversiones',
  // first names
  'juan',
  'jose',
  'maria',
  'antonio',
  'manuel',
  'francisco',
  'luis',
  'carlos',
  'miguel',
  'angel',
  'david',
  'javier',
  'jesus',
  'pedro',
  'rafael',
  'fernando',
  'sergio',
  'pablo',
  'jorge',
  'alberto',
  'alejandro',
  'daniel',
  'raul',
  'ruben',
  'victor',
  'ivan',
  'andres',
  'adrian',
  'alvaro',
  'diego',
  'mario',
  'oscar',
  'roberto',
  'ramon',
  'santiago',
  'tomas',
  'vicente',
  'ana',
  'carmen',
  'laura',
  'marta',
  'lucia',
  'elena',
  'isabel',
  'rosa',
  'cristina',
  'pilar',
  'sara',
  'paula',
  'julia',
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
 * A proposal never grows past this many words: without a ceiling, a description made
 * of generic words alone («GRUPO NUEVO SERVICIOS GENERAL…») would take half the line
 * (R14).
 */
export const MAX_PROPOSAL_WORDS = 4

/** True while the proposal still needs another word to say who charged you (R14). */
function keepsGrowing(length: number, lastWord: string, words: number): boolean {
  if (words >= MAX_PROPOSAL_WORDS) return false
  return length < MIN_PROPOSAL_LENGTH || GENERIC_WORDS.has(lastWord)
}

/**
 * What the dialog proposes from a description: the first word that means something and,
 * while the proposal is still too short OR still ends in a generic word, the ones that
 * follow it, taken verbatim from the description so the proposal is still contained in
 * it. Words with digits stop the growth: they are movement-specific (card numbers,
 * dates). When no word qualifies, the whole normalized description, which is never too
 * broad (R2). Always editable.
 */
export function proposeMatchText(description: string): string {
  const normalized = normalizeMatchText(description)
  const words = [...normalized.matchAll(WORD)]
  const firstIndex = words.findIndex((word) => isMeaningful(word[0]))
  const first = words[firstIndex]
  if (!first) return normalized

  const start = first.index
  let end = start + first[0].length
  let last = first[0]
  let taken = 1
  for (const word of words.slice(firstIndex + 1)) {
    if (!keepsGrowing(end - start, last, taken) || !LETTERS_ONLY.test(word[0])) break
    end = word.index + word[0].length
    last = word[0]
    taken += 1
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

// ─── The match preview (feature 18) ─────────────────────────────────────────
// How many pending movements without a category a text would look at, and a few of
// them. Everything here is pure: the thresholds, the filter that travels and the
// English sentences the dialog paints.

/** How many examples are shown: they fit the dialog without a scrollbar of their own. */
export const PREVIEW_SAMPLE_SIZE = 5

/**
 * Above this many matches the text is called too broad. With ~1.373 pending
 * movements without a category, 50 is 3,6%: below it a very frequent shop still fits
 * without crying wolf (R5). It only warns: saving stays enabled (R7).
 */
export const BROAD_MATCH_LIMIT = 50

/** The ceiling of `q` in the contract, measured over the text as typed. */
export const MAX_PREVIEW_TEXT = 100

/**
 * True when the text can be asked about: at least 3 characters once normalized (the
 * floor of the contract) and at most 100 as typed (its ceiling). Outside that range
 * nothing is asked and nothing is shown, but the rule can still be saved (R2).
 */
export function canPreview(text: string): boolean {
  return !isMatchTextTooShort(text) && text.length <= MAX_PREVIEW_TEXT
}

/**
 * The filter the preview asks for: only what a rules pass would really look at —
 * pending, without a category and of the kind of the chosen category, because a pass
 * never crosses expense and income and never touches a `neutral`. It never carries
 * `categoryId`: together with `uncategorized` that is a 400.
 */
export function previewQuery(text: string, kind: CategoryKind): MovementQuery {
  return {
    status: 'pending_review',
    uncategorized: true,
    type: kind,
    q: text.trim(),
    page: 1,
    pageSize: PREVIEW_SAMPLE_SIZE,
  }
}

/**
 * What the count says. Present tense and about what is being looked at today: the
 * search and a rules pass are not the same query, so this is an honest estimate and
 * never a promise of what will be categorized (design.md §5).
 */
export function matchCountLine(total: number): string {
  return total === 1
    ? '1 pending movement without a category contains this text.'
    : `${total} pending movements without a category contain this text.`
}

/** The warning of R5 / R6, or null when the number asks for none. */
export function matchWarning(total: number): string | null {
  if (total > BROAD_MATCH_LIMIT) return 'That is a lot — check the examples below before you save.'
  if (total === 0) return 'Nothing pending without a category contains this text right now.'
  return null
}

/**
 * The English sentence of a preview that failed (R10). The `message` of the backend
 * is never painted: it comes in Spanish. A failed count never blocks the save.
 */
export function previewErrorMessage(error: AppError): string {
  if (error.code === API_NETWORK) return "Couldn't reach the server, so the count is unknown."
  if (error instanceof ValidationError) {
    return "The server answered, but the count couldn't be read."
  }
  if (error instanceof ApiError && error.status === 400) return 'The backend rejected that search.'
  return "Couldn't check how many match."
}
