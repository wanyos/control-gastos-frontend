import { describe, it, expect } from 'vitest'

import { ValidationError } from '@/shared/errors'

import {
  APPLY_PATH,
  PREVIEW_PATH,
  RULES_PATH,
  SUGGESTIONS_PATH,
  applyRules,
  createRule,
  deleteRule,
  getRulePreview,
  getRules,
  getSuggestions,
  parseApplyResult,
  parseRule,
  parseRulePreview,
  parseRules,
  parseSavedRule,
  parseSuggestions,
  updateRule,
} from '../service'
import {
  ACADEMY_CREATED,
  ACADEMY_MOVED,
  ACADEMY_RULE,
  ACADEMY_SUGGESTION,
  APPLY_OK,
  IBERDROLA,
  INCOME_MOVEMENT,
  MERCADONA,
  PREVIEW_NEW_RULE_MOVED,
  PREVIEW_NONE,
  PREVIEW_TWO,
  SUGGESTIONS,
  SUPERMARKET_SUGGESTION,
  THREE_RULES,
  TWO_RULES_MOVEMENT,
  answer,
  fakeClient,
  saved,
} from './fixtures'

describe('category-rules service (R5, R8, R9, R11, C2)', () => {
  describe('reading', () => {
    it('getRules does one GET and keeps the API order', async () => {
      const api = fakeClient({ [`GET ${RULES_PATH}`]: answer(THREE_RULES) })

      const rules = await getRules(api.client)

      expect(api.calls).toEqual([
        { path: RULES_PATH, method: 'GET', body: undefined, contentType: undefined },
      ])
      expect(rules.map((one) => one.id)).toEqual([7, 8, 9])
      expect(rules[1]?.category.name).toBe('Suministros')
    })

    it('names the failing field when a rule does not match the contract', () => {
      expect(() => parseRules([{ ...MERCADONA, matchText: '' }])).toThrow(
        `GET ${RULES_PATH}: [0].matchText is not a non-empty string`,
      )
      expect(() => parseRules([{ ...MERCADONA, category: null }])).toThrow(
        `GET ${RULES_PATH}: [0].category is not an object`,
      )
      expect(() => parseRules({ rules: [] })).toThrow(`GET ${RULES_PATH}: response is not an array`)
      expect(() => parseRule({ ...MERCADONA, categoryId: '4' })).toThrow(ValidationError)
    })
  })

  describe('creating', () => {
    it('sends exactly matchText and categoryId, as JSON', async () => {
      const api = fakeClient({ [`POST ${RULES_PATH}`]: answer(saved(MERCADONA)) })

      const created = await createRule({ matchText: 'mercadona', categoryId: 4 }, api.client)

      const call = api.calls[0]
      expect(call?.method).toBe('POST')
      expect(call?.path).toBe(RULES_PATH)
      expect(call?.contentType).toBe('application/json')
      expect(Object.keys(call?.body as object)).toEqual(['matchText', 'categoryId'])
      expect(call?.body).toEqual({ matchText: 'mercadona', categoryId: 4 })
      expect(created.rule.id).toBe(7)
    })

    it('never lets a stray property travel', async () => {
      const api = fakeClient({ [`POST ${RULES_PATH}`]: answer(saved(MERCADONA)) })
      const smuggled = { matchText: 'mercadona', categoryId: 4, id: 99, status: 'confirmed' }

      await createRule(smuggled as { matchText: string; categoryId: number }, api.client)

      expect(Object.keys(api.calls[0]?.body as object)).toEqual(['matchText', 'categoryId'])
    })
  })

  describe('what a create or a change moved (feature 33)', () => {
    it('reads the rule and what its pass moved from the answer of a create', async () => {
      const api = fakeClient({ [`POST ${RULES_PATH}`]: answer(ACADEMY_CREATED) })

      const created = await createRule(
        { matchText: 'academia ficticia norte', categoryId: 12 },
        api.client,
      )

      expect(created.rule).toEqual({
        id: 31,
        matchText: 'academia ficticia norte',
        categoryId: 12,
        category: { id: 12, name: 'Educación', kind: 'expense', parentId: null },
        createdAt: ACADEMY_RULE.createdAt,
        updatedAt: ACADEMY_RULE.updatedAt,
      })
      expect(created.result.categorized).toBe(3)
      expect(created.result.categorizedMovements.map((one) => one.movementId)).toEqual([
        405, 437, 466,
      ])
      expect(created.result.categorizedMovements[0]?.rules).toEqual([
        { ruleId: 31, matchText: 'academia ficticia norte' },
      ])
      expect(created.result.unmatched).toBe(214)
      expect(created.result.error).toBeNull()

      // The PATCH answers the same shape.
      const patch = fakeClient({ [`PATCH ${RULES_PATH}/31`]: answer(ACADEMY_CREATED) })
      const changed = await updateRule(31, { categoryId: 12 }, patch.client)
      expect(changed.result.categorizedMovements).toHaveLength(ACADEMY_MOVED.length)

      // A pass that broke halfway: what it moved, and only the code of the error.
      const half = parseSavedRule({
        ...ACADEMY_CREATED,
        categorization: {
          ...(ACADEMY_CREATED.categorization as object),
          error: { code: 'RULES_PASS_FAILED', message: 'La pasada se cortó' },
        },
      })
      expect(half.result.error).toEqual({ code: 'RULES_PASS_FAILED' })
      expect(JSON.stringify(half)).not.toContain('La pasada se cortó')
    })

    it('rejects a create answer without categorization', async () => {
      const api = fakeClient({ [`POST ${RULES_PATH}`]: answer(MERCADONA) })

      await expect(
        createRule({ matchText: 'mercadona', categoryId: 4 }, api.client),
      ).rejects.toThrow(`POST ${RULES_PATH}: categorization is not an object`)

      expect(() =>
        parseSavedRule({ ...ACADEMY_CREATED, categorization: { ...APPLY_OK, categorized: 4 } }),
      ).toThrow(
        `POST ${RULES_PATH}: categorization.categorizedMovements is not a list of 4 movements`,
      )
      const patch = fakeClient({ [`PATCH ${RULES_PATH}/8`]: answer(IBERDROLA) })
      await expect(updateRule(8, { categoryId: 6 }, patch.client)).rejects.toThrow(
        `PATCH ${RULES_PATH}/:id: categorization is not an object`,
      )
    })
  })

  describe('the suggested rules (feature 33)', () => {
    it('reads the suggested rules of the contract', async () => {
      const api = fakeClient({ [`GET ${SUGGESTIONS_PATH}`]: answer(SUGGESTIONS) })

      const list = await getSuggestions(api.client)

      expect(api.calls).toEqual([
        { path: SUGGESTIONS_PATH, method: 'GET', body: undefined, contentType: undefined },
      ])
      expect(list.map((one) => one.matchText)).toEqual([
        'supermercado inventado',
        'academia ficticia norte',
        'cooperativa sintetica',
      ])
      expect(list[0]).toEqual({
        ...SUPERMARKET_SUGGESTION,
        kind: 'expense',
        movements: SUPERMARKET_SUGGESTION.movements,
      })
      expect(list[2]?.kind).toBe('income')
      expect(list[0]?.manualMatches).toBe(2)
      expect(parseSuggestions([])).toEqual([])
    })

    it('rejects a suggested rule whose count does not match its movements', () => {
      expect(() => parseSuggestions([{ ...ACADEMY_SUGGESTION, movementCount: 4 }])).toThrow(
        `GET ${SUGGESTIONS_PATH}: [0].movements is not a list of 4 movements`,
      )
      const withoutManual: Record<string, unknown> = { ...ACADEMY_SUGGESTION }
      delete withoutManual.manualMatches
      expect(() => parseSuggestions([withoutManual])).toThrow(
        `GET ${SUGGESTIONS_PATH}: [0].manualMatches is not an integer`,
      )
      expect(() => parseSuggestions([{ ...ACADEMY_SUGGESTION, kind: 'neutral' }])).toThrow(
        `GET ${SUGGESTIONS_PATH}: [0].kind is not one of income | expense`,
      )
      expect(() => parseSuggestions({ suggestions: [] })).toThrow(
        `GET ${SUGGESTIONS_PATH}: response is not an array`,
      )
    })
  })

  describe('changing', () => {
    it('sends only the field that changed', async () => {
      const api = fakeClient({ [`PATCH ${RULES_PATH}/8`]: answer(saved(IBERDROLA)) })

      await updateRule(8, { categoryId: 6 }, api.client)

      expect(api.calls[0]?.path).toBe(`${RULES_PATH}/8`)
      expect(api.calls[0]?.method).toBe('PATCH')
      expect(api.calls[0]?.body).toEqual({ categoryId: 6 })
    })

    it('sends both when both changed', async () => {
      const api = fakeClient({ [`PATCH ${RULES_PATH}/8`]: answer(saved(IBERDROLA)) })

      await updateRule(8, { matchText: 'iberdrola', categoryId: 6 }, api.client)

      expect(api.calls[0]?.body).toEqual({ matchText: 'iberdrola', categoryId: 6 })
    })

    it('refuses an empty body before the network: the contract answers 400 to it', async () => {
      const api = fakeClient({})

      await expect(updateRule(8, {}, api.client)).rejects.toThrow(
        `PATCH ${RULES_PATH}/:id: body is not a change of matchText or categoryId`,
      )
      expect(api.calls).toEqual([])
    })
  })

  describe('deleting', () => {
    it('does one DELETE with no body and takes the empty 204 answer', async () => {
      const api = fakeClient({ [`DELETE ${RULES_PATH}/7`]: answer(undefined) })

      await expect(deleteRule(7, api.client)).resolves.toBeUndefined()
      expect(api.calls).toEqual([
        { path: `${RULES_PATH}/7`, method: 'DELETE', body: undefined, contentType: undefined },
      ])
    })
  })

  describe('applying', () => {
    it('sends exactly { method: POST }: no body, no Content-Type (R11)', async () => {
      const api = fakeClient({ [`POST ${APPLY_PATH}`]: answer(APPLY_OK) })

      const result = await applyRules(api.client)

      expect(api.calls).toEqual([
        { path: APPLY_PATH, method: 'POST', body: undefined, contentType: undefined },
      ])
      expect(result.categorized).toBe(12)
      expect(result.unmatched).toBe(5)
      expect(result.conflicts[0]?.matches).toHaveLength(2)
      expect(result.conflicts[0]?.matches[1]?.categoryName).toBe('Suministros')
    })

    it('reads a missing, a null and a real error the same way', () => {
      expect(parseApplyResult(APPLY_OK).error).toBeNull()
      expect(parseApplyResult({ ...APPLY_OK, error: null }).error).toBeNull()
      expect(
        parseApplyResult({ ...APPLY_OK, error: { code: 'RULES_PASS_FAILED', message: 'falló' } })
          .error,
      ).toEqual({ code: 'RULES_PASS_FAILED' })
    })

    it('keeps nothing of the backend message, not even in the parsed result', () => {
      const parsed = parseApplyResult({
        ...APPLY_OK,
        error: { code: 'RULES_PASS_FAILED', message: 'La pasada falló a mitad' },
      })

      expect(JSON.stringify(parsed)).not.toContain('La pasada falló')
    })

    // ─── The list of what was categorized (feature 30) ───────────────────────

    /** The answer of the contract: two movements, the first with two rules. */
    const CONTRACT_ANSWER = {
      ...APPLY_OK,
      categorized: 2,
      categorizedMovements: [TWO_RULES_MOVEMENT, INCOME_MOVEMENT],
    }

    const withFirst = (changes: Record<string, unknown>) => ({
      ...CONTRACT_ANSWER,
      categorizedMovements: [{ ...TWO_RULES_MOVEMENT, ...changes }, INCOME_MOVEMENT],
    })

    it('reads the movements the apply answer says it categorized', () => {
      expect(parseApplyResult(CONTRACT_ANSWER).categorizedMovements).toEqual([
        {
          movementId: 198,
          description: 'COMPRA SINTETICO COLMADO NORTE',
          bookingDate: '2026-08-11',
          amount: '41.37',
          type: 'expense',
          categoryId: 4,
          categoryName: 'Supermercado',
          rules: [
            { ruleId: 3, matchText: 'sintetico colmado' },
            { ruleId: 12, matchText: 'colmado norte' },
          ],
        },
        {
          movementId: 203,
          description: 'ABONO SINTETICO TALLER EJEMPLO',
          bookingDate: '2026-08-12',
          amount: '1318.64',
          type: 'income',
          categoryId: 9,
          categoryName: 'Nomina',
          rules: [{ ruleId: 9, matchText: 'taller ejemplo' }],
        },
      ])

      // The order is the one of the answer, never a sort made here.
      const backwards = parseApplyResult({
        ...CONTRACT_ANSWER,
        categorizedMovements: [INCOME_MOVEMENT, TWO_RULES_MOVEMENT],
      })
      expect(backwards.categorizedMovements.map((one) => one.movementId)).toEqual([203, 198])

      const none = parseApplyResult({ ...APPLY_OK, categorized: 0, categorizedMovements: [] })
      expect(none.categorizedMovements).toEqual([])
    })

    it('rejects an apply answer without the list of categorized movements', () => {
      const withoutList: Record<string, unknown> = { ...APPLY_OK }
      delete withoutList.categorizedMovements
      expect(Object.keys(withoutList)).not.toContain('categorizedMovements')

      expect(() => parseApplyResult(withoutList)).toThrow(ValidationError)
      expect(() => parseApplyResult(withoutList)).toThrow(
        `POST ${APPLY_PATH}: categorizedMovements is not an array`,
      )
      expect(() => parseApplyResult({ ...APPLY_OK, categorizedMovements: null })).toThrow(
        `POST ${APPLY_PATH}: categorizedMovements is not an array`,
      )
    })

    it('rejects an apply answer whose list does not have as many movements as categorized', () => {
      const short = { ...CONTRACT_ANSWER, categorized: 3 }
      expect(() => parseApplyResult(short)).toThrow(ValidationError)
      expect(() => parseApplyResult(short)).toThrow(
        `POST ${APPLY_PATH}: categorizedMovements is not a list of 3 movements`,
      )

      expect(() =>
        parseApplyResult({
          ...APPLY_OK,
          categorized: 0,
          categorizedMovements: [TWO_RULES_MOVEMENT],
        }),
      ).toThrow(`POST ${APPLY_PATH}: categorizedMovements is not a list of 0 movements`)
    })

    it('names the failing field of a categorized movement it cannot read', () => {
      expect(() => parseApplyResult(withFirst({ amount: 41.37 }))).toThrow(
        `POST ${APPLY_PATH}: categorizedMovements[0].amount is not a decimal string with two decimals`,
      )
      expect(() => parseApplyResult(withFirst({ type: 'neutral' }))).toThrow(
        `POST ${APPLY_PATH}: categorizedMovements[0].type is not one of income | expense`,
      )
      expect(() => parseApplyResult(withFirst({ bookingDate: '' }))).toThrow(
        `POST ${APPLY_PATH}: categorizedMovements[0].bookingDate is not a YYYY-MM-DD date`,
      )
      expect(() =>
        parseApplyResult(withFirst({ rules: [{ ruleId: '3', matchText: 'sintetico colmado' }] })),
      ).toThrow(`POST ${APPLY_PATH}: categorizedMovements[0].rules[0].ruleId is not an integer`)
    })

    it('names the failing field of a result it cannot read', () => {
      expect(() => parseApplyResult({ ...APPLY_OK, categorized: '12' })).toThrow(
        `POST ${APPLY_PATH}: categorized is not an integer`,
      )
      expect(() =>
        parseApplyResult({
          ...APPLY_OK,
          conflicts: [{ ...APPLY_OK.conflicts[0], bookingDate: '' }],
        }),
      ).toThrow(`POST ${APPLY_PATH}: conflicts[0].bookingDate is not a YYYY-MM-DD date`)
      expect(() => parseApplyResult({ ...APPLY_OK, error: { message: 'boom' } })).toThrow(
        `POST ${APPLY_PATH}: error.code is not a non-empty string`,
      )
    })
  })
})

// Feature 34: what creating a rule would move, without creating it.
describe('the preview of a rule not created yet (feature 34)', () => {
  it('asks the preview with only matchText and categoryId', async () => {
    const api = fakeClient({ [`GET ${PREVIEW_PATH}`]: answer(PREVIEW_TWO) })

    await getRulePreview({ matchText: 'Academia Ficticia Norte', categoryId: 12 }, api.client)

    expect(api.calls).toHaveLength(1)
    const [call] = api.calls
    expect(call?.method).toBe('GET')
    expect(call?.body).toBeUndefined()
    const url = new URL(call?.path ?? '', 'http://localhost')
    expect(url.pathname).toBe(PREVIEW_PATH)
    // The text as typed: the backend normalizes it. Nothing else travels.
    expect([...url.searchParams.keys()]).toEqual(['matchText', 'categoryId'])
    expect(url.searchParams.get('matchText')).toBe('Academia Ficticia Norte')
    expect(url.searchParams.get('categoryId')).toBe('12')
  })

  it('keeps only the movements of the new rule from a preview', () => {
    const preview = parseRulePreview(PREVIEW_TWO)

    expect(preview.matchText).toBe('academia ficticia norte')
    expect(preview.categoryId).toBe(12)
    // The third one moves by another rule: not this one's.
    expect(preview.movements).toEqual(
      PREVIEW_NEW_RULE_MOVED.map((one) => ({
        movementId: one.movementId,
        description: one.description,
        bookingDate: one.bookingDate,
        amount: one.amount,
        type: one.type,
      })),
    )
    expect(parseRulePreview(PREVIEW_NONE).movements).toEqual([])
  })

  it('rejects a preview whose list does not add up', () => {
    const short = {
      ...PREVIEW_TWO,
      categorization: { ...PREVIEW_TWO.categorization, categorized: 4 },
    }
    expect(() => parseRulePreview(short)).toThrow(ValidationError)
    expect(() => parseRulePreview(short)).toThrow(
      'GET /api/category-rules/preview: categorization.categorizedMovements',
    )
    expect(() => parseRulePreview({ matchText: 'x', categoryId: 12 })).toThrow(ValidationError)
    const badRule = {
      ...PREVIEW_TWO,
      categorization: {
        ...PREVIEW_TWO.categorization,
        categorized: 1,
        categorizedMovements: [
          { ...PREVIEW_NEW_RULE_MOVED[0], rules: [{ ruleId: 'new', matchText: 'x' }] },
        ],
      },
    }
    expect(() => parseRulePreview(badRule)).toThrow('rules[0].ruleId')
  })
})
