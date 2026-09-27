import { describe, it, expect, afterEach, vi } from 'vitest'

import { ValidationError } from '@/shared/errors'

import { setMovementCategory } from '../service'
import { EXPENSE, GROCERIES, changed, json, mockApi } from './fixtures'

// The barrier of R1 and C1: the body of the only write of this screen carries
// `categoryId` and nothing else. The statement shows confirmed movements too, so a
// `status` slipping in would quietly send them back to pending — hence the letter by
// letter reading of what travelled.
describe('setMovementCategory (R1, C1, C4)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('PATCHes the movement path with a body that is exactly {"categoryId":N}', async () => {
    const api = mockApi({ patch: json(changed(EXPENSE, { categoryId: 2, category: GROCERIES })) })

    const movement = await setMovementCategory(10, 2)

    expect(api.calls).toHaveLength(1)
    const [call] = api.patches()
    expect(call?.method).toBe('PATCH')
    expect(call?.path).toBe('/api/movements/10')
    expect(call?.contentType).toBe('application/json')
    expect(call?.rawBody).toBe('{"categoryId":2}')
    expect(movement.categoryId).toBe(2)
    expect(movement.category?.name).toBe('Groceries')
  })

  it('sends exactly {"categoryId":null} to remove the category', async () => {
    const api = mockApi({ patch: json(changed(EXPENSE, { categoryId: null, category: null })) })

    const movement = await setMovementCategory(10, null)

    expect(api.patches()[0]?.rawBody).toBe('{"categoryId":null}')
    expect(movement.category).toBeNull()
  })

  it('never lets a status travel, whatever the caller hands over', async () => {
    const api = mockApi({ patch: json(changed(EXPENSE, { categoryId: 2, category: GROCERIES })) })
    // A caller that tries to smuggle fields in: the signature only takes an id and a
    // categoryId, and the body is built inside the service, so nothing else can pass.
    const smuggled = { categoryId: 2, status: 'pending_review', amount: '1.00' }

    await setMovementCategory(10, smuggled.categoryId)

    const body = api.patches()[0]?.rawBody ?? ''
    expect(body).toBe('{"categoryId":2}')
    expect(body).not.toContain('status')
    expect(body).not.toContain('amount')
    expect(Object.keys(JSON.parse(body) as object)).toEqual(['categoryId'])
  })

  it('writes once per call and touches no other path', async () => {
    const api = mockApi({ patch: json(changed(EXPENSE, { categoryId: 2, category: GROCERIES })) })

    await setMovementCategory(10, 2)

    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'PATCH /api/movements/10',
    ])
  })

  it('validates the answer at the boundary: an id that is not an integer fails (C4)', async () => {
    mockApi({ patch: json(changed(EXPENSE, { id: 'ten' })) })

    await expect(setMovementCategory(10, 2)).rejects.toThrow(ValidationError)
    await expect(setMovementCategory(10, 2)).rejects.toThrow(
      'PATCH /api/movements/:id: response.id is not an integer',
    )
  })
})
