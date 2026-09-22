// Categorization rules data access (feature 17): the four writes the contract
// allows on a rule, plus the on-demand pass. Every body is built field by field, so
// nothing but `matchText` and `categoryId` can ever travel, and the apply goes with
// no body at all. Per ADR-002 the raw responses are mapped to the frontend types
// with the shared boundary checks, so a contract drift surfaces as a
// ValidationError naming the failing field.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { CATEGORY_KINDS } from '@/shared/categories'
import { createValidators } from '@/shared/validation'
import type { Validators } from '@/shared/validation'

import type {
  ApplyResult,
  CategoryRule,
  NewRule,
  RuleCategory,
  RuleChanges,
  RuleConflict,
  RuleMatch,
} from './types'

/** Paths are absolute so they resolve against the API origin (see docs/stack.md). */
export const RULES_PATH = '/api/category-rules'
export const APPLY_PATH = '/api/category-rules/apply'

const listChecks = createValidators(`GET ${RULES_PATH}`)
const createChecks = createValidators(`POST ${RULES_PATH}`)
const updateChecks = createValidators(`PATCH ${RULES_PATH}/:id`)
const applyChecks = createValidators(`POST ${APPLY_PATH}`)

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

/**
 * Maps `POST /api/category-rules/apply`, or throws ValidationError. Only the `code`
 * of a failed pass is kept: its `message` comes in Spanish and nothing paints it (R13).
 */
export function parseApplyResult(raw: unknown): ApplyResult {
  const v = applyChecks
  const body = v.asObject(raw, 'response')
  const failure = body.error
  return {
    categorized: v.asInteger(body.categorized, 'categorized'),
    conflictCount: v.asInteger(body.conflictCount, 'conflictCount'),
    conflicts: v
      .asArray(body.conflicts, 'conflicts')
      .map((item, i) => parseConflict(v, item, `conflicts[${i}]`)),
    unmatched: v.asInteger(body.unmatched, 'unmatched'),
    error:
      failure === undefined || failure === null
        ? null
        : { code: v.asText(v.asObject(failure, 'error').code, 'error.code') },
  }
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

/** Creates a rule. It categorizes nothing by itself: that is the apply pass (R5). */
export async function createRule(rule: NewRule, client: HttpClient = http): Promise<CategoryRule> {
  const body = ruleBody(rule)
  return parseRule(await client<unknown>(RULES_PATH, withBody('POST', body)), createChecks)
}

/** Changes a rule. Only what changed travels, and an empty body never leaves (R8). */
export async function updateRule(
  id: number,
  changes: RuleChanges,
  client: HttpClient = http,
): Promise<CategoryRule> {
  const body = ruleBody(changes)
  if (Object.keys(body).length === 0) {
    updateChecks.reject('body', 'a change of matchText or categoryId')
  }
  return parseRule(
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
