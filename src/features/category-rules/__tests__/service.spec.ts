import { describe, it, expect } from 'vitest'

import { ValidationError } from '@/shared/errors'

import {
  APPLY_PATH,
  RULES_PATH,
  applyRules,
  createRule,
  deleteRule,
  getRules,
  parseApplyResult,
  parseRule,
  parseRules,
  updateRule,
} from '../service'
import { APPLY_OK, IBERDROLA, MERCADONA, THREE_RULES, answer, fakeClient } from './fixtures'

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
      const api = fakeClient({ [`POST ${RULES_PATH}`]: answer(MERCADONA) })

      const created = await createRule({ matchText: 'mercadona', categoryId: 4 }, api.client)

      const call = api.calls[0]
      expect(call?.method).toBe('POST')
      expect(call?.path).toBe(RULES_PATH)
      expect(call?.contentType).toBe('application/json')
      expect(Object.keys(call?.body as object)).toEqual(['matchText', 'categoryId'])
      expect(call?.body).toEqual({ matchText: 'mercadona', categoryId: 4 })
      expect(created.id).toBe(7)
    })

    it('never lets a stray property travel', async () => {
      const api = fakeClient({ [`POST ${RULES_PATH}`]: answer(MERCADONA) })
      const smuggled = { matchText: 'mercadona', categoryId: 4, id: 99, status: 'confirmed' }

      await createRule(smuggled as { matchText: string; categoryId: number }, api.client)

      expect(Object.keys(api.calls[0]?.body as object)).toEqual(['matchText', 'categoryId'])
    })
  })

  describe('changing', () => {
    it('sends only the field that changed', async () => {
      const api = fakeClient({ [`PATCH ${RULES_PATH}/8`]: answer(IBERDROLA) })

      await updateRule(8, { categoryId: 6 }, api.client)

      expect(api.calls[0]?.path).toBe(`${RULES_PATH}/8`)
      expect(api.calls[0]?.method).toBe('PATCH')
      expect(api.calls[0]?.body).toEqual({ categoryId: 6 })
    })

    it('sends both when both changed', async () => {
      const api = fakeClient({ [`PATCH ${RULES_PATH}/8`]: answer(IBERDROLA) })

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
