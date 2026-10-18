// Categorization rules data access (feature 17): the four writes the contract
// allows on a rule, plus the on-demand pass. Every body is built field by field, so
// nothing but `matchText` and `categoryId` can ever travel, and the apply goes with
// no body at all. Since feature 33 it also reads the suggested rules, and the POST and
// the PATCH answer with what the pass that ran with them moved. Per ADR-002 the raw responses are mapped to the frontend types
// with the shared boundary checks, so a contract drift surfaces as a
// ValidationError naming the failing field.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { CATEGORY_KINDS } from '@/shared/categories'
import { createValidators } from '@/shared/validation'
import type { Validators } from '@/shared/validation'

import type {
  AppliedRule,
  ApplyResult,
  CategorizedMovement,
  CategoryRule,
  NewRule,
  PreviewMovement,
  RuleCategory,
  RuleChanges,
  RuleConflict,
  RuleMatch,
  RulePreview,
  SavedRule,
  SuggestedMovement,
  SuggestedRule,
} from './types'

/** Paths are absolute so they resolve against the API origin (see docs/stack.md). */
export const RULES_PATH = '/api/category-rules'
export const APPLY_PATH = '/api/category-rules/apply'
export const SUGGESTIONS_PATH = '/api/category-rules/suggestions'
export const PREVIEW_PATH = '/api/category-rules/preview'

const listChecks = createValidators(`GET ${RULES_PATH}`)
const createChecks = createValidators(`POST ${RULES_PATH}`)
const updateChecks = createValidators(`PATCH ${RULES_PATH}/:id`)
const applyChecks = createValidators(`POST ${APPLY_PATH}`)
const suggestionsChecks = createValidators(`GET ${SUGGESTIONS_PATH}`)
const previewChecks = createValidators(`GET ${PREVIEW_PATH}`)

/** A pass never categorizes a `neutral` movement, so the answer never lists one. */
const CATEGORIZED_TYPES = ['income', 'expense'] as const

function parseCategory(v: Validators, raw: unknown, path: string): RuleCategory {
  const category = v.asObject(raw, path)
  return {
    id: v.asInteger(category.id, `${path}.id`),
    name: v.asString(category.name, `${path}.name`),
    kind: v.asMember(category.kind, CATEGORY_KINDS, `${path}.kind`),
    parentId:
      category.parentId === null ? null : v.asInteger(category.parentId, `${path}.parentId`),
  }
}

function parseOne(v: Validators, raw: unknown, path: string): CategoryRule {
  const rule = v.asObject(raw, path)
  return {
    id: v.asInteger(rule.id, `${path}.id`),
    matchText: v.asText(rule.matchText, `${path}.matchText`),
    categoryId: v.asInteger(rule.categoryId, `${path}.categoryId`),
    category: parseCategory(v, rule.category, `${path}.category`),
    createdAt: v.asText(rule.createdAt, `${path}.createdAt`),
    updatedAt: v.asText(rule.updatedAt, `${path}.updatedAt`),
  }
}

/** Maps the rule a POST or a PATCH answers with, or throws ValidationError. */
export function parseRule(raw: unknown, v: Validators = createChecks): CategoryRule {
  return parseOne(v, raw, 'response')
}

/** Maps `GET /api/category-rules`, or throws ValidationError. */
export function parseRules(raw: unknown): CategoryRule[] {
  const v = listChecks
  return v.asArray(raw, 'response').map((item, i) => parseOne(v, item, `[${i}]`))
}

function parseMatch(v: Validators, raw: unknown, path: string): RuleMatch {
  const match = v.asObject(raw, path)
  return {
    ruleId: v.asInteger(match.ruleId, `${path}.ruleId`),
    matchText: v.asString(match.matchText, `${path}.matchText`),
    categoryId: v.asInteger(match.categoryId, `${path}.categoryId`),
    categoryName: v.asString(match.categoryName, `${path}.categoryName`),
  }
}

function parseConflict(v: Validators, raw: unknown, path: string): RuleConflict {
  const conflict = v.asObject(raw, path)
  return {
    movementId: v.asInteger(conflict.movementId, `${path}.movementId`),
    description: v.asString(conflict.description, `${path}.description`),
    bookingDate: v.asDateOnly(conflict.bookingDate, `${path}.bookingDate`),
    matches: v
      .asArray(conflict.matches, `${path}.matches`)
      .map((item, i) => parseMatch(v, item, `${path}.matches[${i}]`)),
  }
}

function parseAppliedRule(v: Validators, raw: unknown, path: string): AppliedRule {
  const rule = v.asObject(raw, path)
  return {
    ruleId: v.asInteger(rule.ruleId, `${path}.ruleId`),
    matchText: v.asString(rule.matchText, `${path}.matchText`),
  }
}

function parseCategorized(v: Validators, raw: unknown, path: string): CategorizedMovement {
  const movement = v.asObject(raw, path)
  return {
    movementId: v.asInteger(movement.movementId, `${path}.movementId`),
    description: v.asString(movement.description, `${path}.description`),
    bookingDate: v.asDateOnly(movement.bookingDate, `${path}.bookingDate`),
    amount: v.asDecimal(movement.amount, `${path}.amount`),
    type: v.asMember(movement.type, CATEGORIZED_TYPES, `${path}.type`),
    categoryId: v.asInteger(movement.categoryId, `${path}.categoryId`),
    categoryName: v.asString(movement.categoryName, `${path}.categoryName`),
    rules: v
      .asArray(movement.rules, `${path}.rules`)
      .map((item, i) => parseAppliedRule(v, item, `${path}.rules[${i}]`)),
  }
}

/** `categorized` when the object is the answer itself, `categorization.categorized` inside one. */
const fieldOf = (path: string, field: string): string => (path === '' ? field : `${path}.${field}`)

/**
 * Reads what a categorization pass did: the answer of the apply, and the
 * `categorization` of a POST or a PATCH of a rule (feature 33). Only the `code` of a
 * failed pass is kept: its `message` comes in Spanish and nothing paints it (R13). The
 * list of what was categorized must have exactly `categorized` movements: a list that
 * does not add up is an answer nobody can read (feature 30). `path` is '' for the
 * apply, whose fields sit at the root.
 */
export function parseCategorization(v: Validators, raw: unknown, path: string): ApplyResult {
  const body = v.asObject(raw, path === '' ? 'response' : path)
  const failure = body.error
  const categorized = v.asInteger(body.categorized, fieldOf(path, 'categorized'))
  const listPath = fieldOf(path, 'categorizedMovements')
  const categorizedMovements = v
    .asArray(body.categorizedMovements, listPath)
    .map((item, i) => parseCategorized(v, item, `${listPath}[${i}]`))
  if (categorizedMovements.length !== categorized) {
    v.reject(listPath, `a list of ${categorized} movements`)
  }
  const conflictsPath = fieldOf(path, 'conflicts')
  return {
    categorized,
    categorizedMovements,
    conflictCount: v.asInteger(body.conflictCount, fieldOf(path, 'conflictCount')),
    conflicts: v
      .asArray(body.conflicts, conflictsPath)
      .map((item, i) => parseConflict(v, item, `${conflictsPath}[${i}]`)),
    unmatched: v.asInteger(body.unmatched, fieldOf(path, 'unmatched')),
    error:
      failure === undefined || failure === null
        ? null
        : {
            code: v.asText(
              v.asObject(failure, fieldOf(path, 'error')).code,
              fieldOf(path, 'error.code'),
            ),
          },
  }
}

/** Maps `POST /api/category-rules/apply`, or throws ValidationError. */
export function parseApplyResult(raw: unknown): ApplyResult {
  return parseCategorization(applyChecks, raw, '')
}

/**
 * Maps the answer of a POST or a PATCH of a rule: the rule at the root and, always,
 * `categorization` with what its pass moved (feature 33). Without it the answer is
 * unreadable, as an apply answer without its list is.
 */
export function parseSavedRule(raw: unknown, v: Validators = createChecks): SavedRule {
  const rule = parseOne(v, raw, 'response')
  const body = v.asObject(raw, 'response')
  return { rule, result: parseCategorization(v, body.categorization, 'categorization') }
}

function parseSuggestedMovement(v: Validators, raw: unknown, path: string): SuggestedMovement {
  const movement = v.asObject(raw, path)
  return {
    movementId: v.asInteger(movement.movementId, `${path}.movementId`),
    description: v.asString(movement.description, `${path}.description`),
    bookingDate: v.asDateOnly(movement.bookingDate, `${path}.bookingDate`),
    amount: v.asDecimal(movement.amount, `${path}.amount`),
  }
}

function parseSuggestion(v: Validators, raw: unknown, path: string): SuggestedRule {
  const suggestion = v.asObject(raw, path)
  const movementCount = v.asInteger(suggestion.movementCount, `${path}.movementCount`)
  const movements = v
    .asArray(suggestion.movements, `${path}.movements`)
    .map((item, i) => parseSuggestedMovement(v, item, `${path}.movements[${i}]`))
  if (movements.length !== movementCount) {
    v.reject(`${path}.movements`, `a list of ${movementCount} movements`)
  }
  return {
    matchText: v.asText(suggestion.matchText, `${path}.matchText`),
    kind: v.asMember(suggestion.kind, CATEGORIZED_TYPES, `${path}.kind`),
    movementCount,
    movements,
    manualMatches: v.asInteger(suggestion.manualMatches, `${path}.manualMatches`),
  }
}

/**
 * Maps `GET /api/category-rules/suggestions`, or throws ValidationError. A suggestion
 * whose `movementCount` is not the length of its `movements` is rejected: the number
 * shown has to be the one that moves (feature 33, R12).
 */
export function parseSuggestions(raw: unknown): SuggestedRule[] {
  const v = suggestionsChecks
  return v.asArray(raw, 'response').map((item, i) => parseSuggestion(v, item, `[${i}]`))
}

/**
 * The body of the POST and of the PATCH, built field by field: a spread of an
 * object coming from the view could carry a property the contract answers 400 to.
 */
function ruleBody(changes: RuleChanges): RuleChanges {
  const body: RuleChanges = {}
  if (changes.matchText !== undefined) body.matchText = changes.matchText
  if (changes.categoryId !== undefined) body.categoryId = changes.categoryId
  return body
}

/** The JSON wire format of the two writes that carry a body. */
const withBody = (method: 'POST' | 'PATCH', body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Lists every rule, in the order the API sends them. Read only. */
export async function getRules(client: HttpClient = http): Promise<CategoryRule[]> {
  return parseRules(await client<unknown>(RULES_PATH))
}

/** The suggested rules, in the order the API sends them. Read only (feature 33). */
export async function getSuggestions(client: HttpClient = http): Promise<SuggestedRule[]> {
  return parseSuggestions(await client<unknown>(SUGGESTIONS_PATH))
}

/**
 * Creates a rule. Since feature 60 of the backend the same request runs the pass, and
 * the answer says what it moved (feature 33).
 */
export async function createRule(rule: NewRule, client: HttpClient = http): Promise<SavedRule> {
  const body = ruleBody(rule)
  return parseSavedRule(await client<unknown>(RULES_PATH, withBody('POST', body)), createChecks)
}

/**
 * Changes a rule. Only what changed travels, and an empty body never leaves (R8). Like
 * the POST, it runs the pass and answers with what it moved (feature 33).
 */
export async function updateRule(
  id: number,
  changes: RuleChanges,
  client: HttpClient = http,
): Promise<SavedRule> {
  const body = ruleBody(changes)
  if (Object.keys(body).length === 0) {
    updateChecks.reject('body', 'a change of matchText or categoryId')
  }
  return parseSavedRule(
    await client<unknown>(`${RULES_PATH}/${id}`, withBody('PATCH', body)),
    updateChecks,
  )
}

/** Deletes a rule. No body, and the 204 comes back as `undefined` (R9). */
export async function deleteRule(id: number, client: HttpClient = http): Promise<void> {
  await client<unknown>(`${RULES_PATH}/${id}`, { method: 'DELETE' })
}

/**
 * Runs the categorization pass. No body and no Content-Type on purpose: the backend
 * answers 400 to an empty body declared as JSON (same remedy as `runImport`).
 */
export async function applyRules(client: HttpClient = http): Promise<ApplyResult> {
  return parseApplyResult(await client<unknown>(APPLY_PATH, { method: 'POST' }))
}

// ─── The preview of a rule that does not exist yet (feature 34) ─────────────

/** A movement of the preview whose `rules` carry the rule not created yet (`ruleId: null`). */
function parsePreviewMovement(
  v: Validators,
  raw: unknown,
  path: string,
): { movement: PreviewMovement; isNewRule: boolean } {
  const item = v.asObject(raw, path)
  const rules = v.asArray(item.rules, `${path}.rules`).map((one, i) => {
    const rule = v.asObject(one, `${path}.rules[${i}]`)
    return rule.ruleId === null ? null : v.asInteger(rule.ruleId, `${path}.rules[${i}].ruleId`)
  })
  return {
    movement: {
      movementId: v.asInteger(item.movementId, `${path}.movementId`),
      description: v.asString(item.description, `${path}.description`),
      bookingDate: v.asDateOnly(item.bookingDate, `${path}.bookingDate`),
      amount: v.asDecimal(item.amount, `${path}.amount`),
      type: v.asMember(item.type, CATEGORIZED_TYPES, `${path}.type`),
    },
    isNewRule: rules.includes(null),
  }
}

/**
 * Maps `GET /api/category-rules/preview`, or throws ValidationError. Only the movements
 * the new rule would move are kept (`ruleId: null`); a list that does not have
 * `categorized` elements is rejected, as in `parseCategorization`.
 */
export function parseRulePreview(raw: unknown): RulePreview {
  const v = previewChecks
  const body = v.asObject(raw, 'response')
  const categorization = v.asObject(body.categorization, 'categorization')
  const categorized = v.asInteger(categorization.categorized, 'categorization.categorized')
  const listPath = 'categorization.categorizedMovements'
  const listed = v
    .asArray(categorization.categorizedMovements, listPath)
    .map((item, i) => parsePreviewMovement(v, item, `${listPath}[${i}]`))
  if (listed.length !== categorized) v.reject(listPath, `a list of ${categorized} movements`)
  return {
    matchText: v.asText(body.matchText, 'matchText'),
    categoryId: v.asInteger(body.categoryId, 'categoryId'),
    movements: listed.filter((one) => one.isNewRule).map((one) => one.movement),
  }
}

/**
 * What creating this rule would move, without creating it. Read only. Only `matchText`
 * (as typed: the backend normalizes it) and `categoryId` travel; any other parameter is
 * a 400. Throws ApiError (409 included) or ValidationError.
 */
export async function getRulePreview(
  rule: NewRule,
  client: HttpClient = http,
): Promise<RulePreview> {
  const params = new URLSearchParams()
  params.set('matchText', rule.matchText)
  params.set('categoryId', String(rule.categoryId))
  return parseRulePreview(await client<unknown>(`${PREVIEW_PATH}?${params.toString()}`))
}
