import { describe, it, expect, afterEach, vi } from 'vitest'

import { ValidationError } from '@/shared/errors'

import { setMovementsExcluded, setMovementCategory } from '../service'
import {
  EXPENSE,
  EXPENSE_SAME_DAY,
  GROCERIES,
  bulkResult,
  changed,
  excluded,
  json,
  mockApi,
} from './fixtures'

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

// The barrier of R1 and C1 for the gesture that moves the figures. It writes on MANY
// movements at once and the statement shows confirmed ones too, so a `status` or a
// `categoryId` slipping in would be a mess of N movements, not of one (design §1, §3).
describe('setMovementsExcluded (R1, C1, C6)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const TWO = bulkResult([excluded(EXPENSE), excluded(EXPENSE_SAME_DAY)])

  it('PATCHes the list path with a body that is exactly {"ids":[…],"excludedFromTotals":true}', async () => {
    const api = mockApi({ bulkPatch: json(TWO) })

    const result = await setMovementsExcluded([10, 11], true)

    expect(api.calls).toHaveLength(1)
    const [call] = api.patches()
    expect(call?.method).toBe('PATCH')
    expect(call?.path).toBe('/api/movements')
    expect(call?.contentType).toBe('application/json')
    expect(call?.rawBody).toBe('{"ids":[10,11],"excludedFromTotals":true}')
    expect(result.updated).toBe(2)
    expect(result.movements.every((movement) => movement.excludedFromTotals)).toBe(true)
  })

  it('sends exactly {"ids":[…],"excludedFromTotals":false} to put them back', async () => {
    const api = mockApi({
      bulkPatch: json(bulkResult([excluded(EXPENSE, false), excluded(EXPENSE_SAME_DAY, false)])),
    })

    const result = await setMovementsExcluded([10, 11], false)

    expect(api.patches()[0]?.rawBody).toBe('{"ids":[10,11],"excludedFromTotals":false}')
    expect(result.movements.every((movement) => movement.excludedFromTotals)).toBe(false)
  })

  it('goes through the bulk request even for one single movement (design §2)', async () => {
    const api = mockApi({ bulkPatch: json(bulkResult([excluded(EXPENSE)])) })

    await setMovementsExcluded([10], true)

    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toEqual(['PATCH /api/movements'])
    expect(api.patches()[0]?.rawBody).toBe('{"ids":[10],"excludedFromTotals":true}')
  })

  it('never lets a status or a categoryId travel, whatever the caller hands over', async () => {
    const api = mockApi({ bulkPatch: json(TWO) })
    // A caller that tries to smuggle fields in: the signature only takes ids and a
    // boolean, and the body is built inside the service, so nothing else can pass.
    const smuggled = {
      ids: [10, 11],
      excludedFromTotals: true,
      status: 'pending_review',
      categoryId: 2,
      amount: '1.00',
      note: 'hello',
    }

    await setMovementsExcluded(smuggled.ids, smuggled.excludedFromTotals)

    const body = api.patches()[0]?.rawBody ?? ''
    expect(body).toBe('{"ids":[10,11],"excludedFromTotals":true}')
    expect(body).not.toContain('status')
    expect(body).not.toContain('categoryId')
    expect(body).not.toContain('amount')
    expect(body).not.toContain('note')
    expect(Object.keys(JSON.parse(body) as object)).toEqual(['ids', 'excludedFromTotals'])
  })

  it('never lets a non-boolean mark leave the frontend: nothing is sent at all', async () => {
    const api = mockApi({ bulkPatch: json(TWO) })
    // The contract answers 400 to `null`, `"true"`, `0` and `1`, and converts nothing;
    // `changesBody` copies the mark only when it is a literal boolean, so a body with
    // no change at all is rejected here, before the network (design §3).
    for (const notABoolean of [null, 'true', 'false', 0, 1]) {
      await expect(
        setMovementsExcluded([10, 11], notABoolean as unknown as boolean),
      ).rejects.toThrow(ValidationError)
    }

    expect(api.calls).toHaveLength(0)
  })

  it('refuses an empty selection and more than 200 ids before the network', async () => {
    const api = mockApi({ bulkPatch: json(TWO) })

    await expect(setMovementsExcluded([], true)).rejects.toThrow(ValidationError)
    await expect(
      setMovementsExcluded(
        Array.from({ length: 201 }, (_item, index) => index + 1),
        true,
      ),
    ).rejects.toThrow('PATCH /api/movements: ids is not between 1 and 200 movements')

    expect(api.calls).toHaveLength(0)
  })

  it('validates the answer at the boundary: a mark that is not a boolean fails (C6)', async () => {
    mockApi({ bulkPatch: json(bulkResult([changed(EXPENSE, { excludedFromTotals: 'true' })])) })

    await expect(setMovementsExcluded([10], true)).rejects.toThrow(
      'PATCH /api/movements: movements[0].excludedFromTotals is not a boolean',
    )
  })

  it('validates the answer at the boundary: a movement WITHOUT the field fails (T2)', async () => {
    const { excludedFromTotals: _gone, ...withoutTheField } = EXPENSE
    mockApi({ bulkPatch: json(bulkResult([withoutTheField])) })

    await expect(setMovementsExcluded([10], true)).rejects.toThrow(ValidationError)
    await expect(setMovementsExcluded([10], true)).rejects.toThrow(
      'PATCH /api/movements: movements[0].excludedFromTotals is not a boolean',
    )
  })
})
