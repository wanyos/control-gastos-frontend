import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { CATEGORIES_PATH } from '@/shared/categories'

import { APPLY_PATH, RULES_PATH } from '../service'
import { useCategoryRulesStore } from '../store'
import {
  APPLY_OK,
  CATEGORY_TREE,
  CONFLICT_BODY,
  IBERDROLA,
  INCOME_MOVEMENT,
  MERCADONA,
  NOT_FOUND_BODY,
  SUPERMARKET,
  THREE_RULES,
  TWELVE_CATEGORIZED,
  TWO_RULES_MOVEMENT,
  answer,
  deferred,
  fakeClient,
  httpError,
  rejectWith,
  rule,
} from './fixtures'

const MOVEMENTS_TOUCHED = (calls: { path: string }[]): boolean =>
  calls.some((call) => call.path.startsWith('/api/movements'))

describe('useCategoryRulesStore (R4 … R13)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('the list (R7)', () => {
    it('loads the rules in the API order', async () => {
      const api = fakeClient({ [`GET ${RULES_PATH}`]: answer(THREE_RULES) })
      const store = useCategoryRulesStore()

      await store.load(api.client)

      expect(store.rules?.map((one) => one.id)).toEqual([7, 8, 9])
      expect(store.loadError).toBeNull()
    })

    it('never throws when the load fails, and keeps the failure', async () => {
      const api = fakeClient({ [`GET ${RULES_PATH}`]: rejectWith(httpError(500, CONFLICT_BODY)) })
      const store = useCategoryRulesStore()

      await expect(store.load(api.client)).resolves.toBeUndefined()
      expect(store.rules).toBeNull()
      expect(store.loadError).not.toBeNull()
    })

    it('asks for the categories once, and survives their failure', async () => {
      const api = fakeClient({ [`GET ${CATEGORIES_PATH}`]: answer(CATEGORY_TREE) })
      const store = useCategoryRulesStore()

      await store.loadCategories(api.client)
      await store.loadCategories(api.client)

      expect(api.count(CATEGORIES_PATH)).toBe(1)
      expect(store.categories).toHaveLength(3)

      setActivePinia(createPinia())
      const failing = fakeClient({ [`GET ${CATEGORIES_PATH}`]: rejectWith(new Error('boom')) })
      const other = useCategoryRulesStore()
      await other.loadCategories(failing.client)

      expect(other.categories).toBeNull()
      expect(other.categoriesFailed).toBe(true)
    })
  })

  describe('creating (R4, R5, R6)', () => {
    it('sends nothing when the text is too short (R4)', async () => {
      const api = fakeClient({})
      const store = useCategoryRulesStore()

      await expect(store.create({ matchText: 'ab', categoryId: 4 }, api.client)).resolves.toBe(
        false,
      )
      expect(api.calls).toEqual([])
    })

    it('creates the rule, keeps it for the notice and touches nothing else (R5)', async () => {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer([]),
        [`POST ${RULES_PATH}`]: answer(MERCADONA),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      const closed = await store.create({ matchText: 'Mercadona', categoryId: 4 }, api.client)

      expect(closed).toBe(true)
      expect(store.lastCreated?.matchText).toBe('mercadona')
      expect(store.rules?.map((one) => one.id)).toEqual([7])
      expect(api.count(APPLY_PATH)).toBe(0)
      expect(MOVEMENTS_TOUCHED(api.calls)).toBe(false)
      expect(store.saveMessage).toBeNull()
    })

    it('a second click while the first is in flight sends nothing (R5)', async () => {
      const pending = deferred()
      const api = fakeClient({ [`POST ${RULES_PATH}`]: pending.answer })
      const store = useCategoryRulesStore()

      const first = store.create({ matchText: 'mercadona', categoryId: 4 }, api.client)
      const second = store.create({ matchText: 'mercadona', categoryId: 4 }, api.client)

      expect(await second).toBe(false)
      pending.resolve(MERCADONA)
      expect(await first).toBe(true)
      expect(api.count(RULES_PATH)).toBe(1)
    })

    it('keeps the list untouched after a 409, and does not reload it (R6)', async () => {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`POST ${RULES_PATH}`]: rejectWith(httpError(409, CONFLICT_BODY)),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      const closed = await store.create({ matchText: 'mercadona', categoryId: 4 }, api.client)

      expect(closed).toBe(false)
      expect(store.saveMessage).toBe('Nothing was saved: another rule already uses that text.')
      expect(store.saveMessage).not.toContain(CONFLICT_BODY.message)
      expect(store.rules?.map((one) => one.id)).toEqual([7, 8, 9])
      expect(api.count(RULES_PATH)).toBe(2) // the first GET and the POST, no refresh
    })

    it('reloads the rules after a 404 and after an answer it could not read (R6)', async () => {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`POST ${RULES_PATH}`]: rejectWith(httpError(404, NOT_FOUND_BODY)),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      await store.create({ matchText: 'mercadona', categoryId: 4 }, api.client)

      expect(store.saveMessage).toBe('Nothing was saved: that category or rule no longer exists.')
      expect(api.calls.filter((call) => call.method === 'GET')).toHaveLength(2)

      const unreadable = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`POST ${RULES_PATH}`]: answer({ id: 'seven' }),
      })
      setActivePinia(createPinia())
      const other = useCategoryRulesStore()
      await other.load(unreadable.client)
      await other.create({ matchText: 'mercadona', categoryId: 4 }, unreadable.client)

      expect(other.saveMessage).toContain("the reply couldn't be read")
      expect(unreadable.calls.filter((call) => call.method === 'GET')).toHaveLength(2)
    })
  })

  describe('changing (R8)', () => {
    it('sends only what changed and replaces the row, touching no movement', async () => {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`PATCH ${RULES_PATH}/8`]: answer(rule(8, 'iberdrola', SUPERMARKET)),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      const closed = await store.update(8, { matchText: 'iberdrola', categoryId: 4 }, api.client)

      expect(closed).toBe(true)
      expect(api.of(`${RULES_PATH}/8`)[0]?.body).toEqual({ categoryId: 4 })
      expect(store.rules?.[1]?.category.id).toBe(4)
      expect(MOVEMENTS_TOUCHED(api.calls)).toBe(false)
    })

    it('sends nothing at all when nothing changed', async () => {
      const api = fakeClient({ [`GET ${RULES_PATH}`]: answer(THREE_RULES) })
      const store = useCategoryRulesStore()
      await store.load(api.client)
      const before = api.calls.length

      // Same text with capitals and accents is the same stored text.
      const closed = await store.update(8, { matchText: 'IBERDROLA', categoryId: 6 }, api.client)

      expect(closed).toBe(true)
      expect(api.calls).toHaveLength(before)
    })
  })

  describe('deleting (R9)', () => {
    it('drops the row and never touches a movement', async () => {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`DELETE ${RULES_PATH}/7`]: answer(undefined),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      await store.remove(7, api.client)

      expect(api.of(`${RULES_PATH}/7`).map((call) => call.method)).toEqual(['DELETE'])
      expect(store.rules?.map((one) => one.id)).toEqual([8, 9])
      expect(MOVEMENTS_TOUCHED(api.calls)).toBe(false)
    })

    it('takes a 404 as already gone: the row leaves and it says so', async () => {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`DELETE ${RULES_PATH}/7`]: rejectWith(httpError(404, NOT_FOUND_BODY)),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      await store.remove(7, api.client)

      expect(store.rules?.map((one) => one.id)).toEqual([8, 9])
      expect(store.deleteMessage).toBe('That rule no longer exists.')
      expect(store.deleteMessage).not.toContain(NOT_FOUND_BODY.message)
    })
  })

  describe('applying (R10, R11, R13)', () => {
    it('opening and closing the confirmation sends nothing (R10)', () => {
      const api = fakeClient({})
      const store = useCategoryRulesStore()

      store.openApply()
      expect(store.applyFlow).toEqual({ step: 'confirm' })

      store.closeApply()
      expect(store.applyFlow).toEqual({ step: 'closed' })
      expect(api.calls).toEqual([])
    })

    it('runs one pass, shows the figures and bumps applyRun (R11, R12)', async () => {
      const api = fakeClient({ [`POST ${APPLY_PATH}`]: answer(APPLY_OK) })
      const store = useCategoryRulesStore()

      store.openApply()
      await store.confirmApply(api.client)

      expect(api.count(APPLY_PATH)).toBe(1)
      expect(store.applyFlow).toMatchObject({ step: 'done' })
      expect(store.applyRun).toBe(1)
    })

    it('a second click while the pass runs adds no request, and the dialog will not close', async () => {
      const pending = deferred()
      const api = fakeClient({ [`POST ${APPLY_PATH}`]: pending.answer })
      const store = useCategoryRulesStore()

      const first = store.confirmApply(api.client)
      await store.confirmApply(api.client)
      store.closeApply()

      expect(store.applyFlow).toEqual({ step: 'applying' })
      pending.resolve(APPLY_OK)
      await first
      expect(api.count(APPLY_PATH)).toBe(1)
    })

    it('shows no figures when the 200 carries an error, and still bumps applyRun (R13)', async () => {
      const api = fakeClient({
        [`POST ${APPLY_PATH}`]: answer({ ...APPLY_OK, error: { code: 'RULES_PASS_FAILED' } }),
      })
      const store = useCategoryRulesStore()

      await store.confirmApply(api.client)

      expect(store.applyFlow).toEqual({
        step: 'failed',
        message:
          "The rules pass didn't finish. Some movements may already be categorized. The review queue has been reloaded.",
      })
      expect(store.applyRun).toBe(1)
    })

    it('bumps applyRun when the request itself fails (R14)', async () => {
      const api = fakeClient({ [`POST ${APPLY_PATH}`]: rejectWith(httpError(500, CONFLICT_BODY)) })
      const store = useCategoryRulesStore()

      await store.confirmApply(api.client)

      expect(store.applyFlow).toMatchObject({ step: 'failed' })
      expect(store.applyRun).toBe(1)
      expect((store.applyFlow as { message: string }).message).not.toContain(CONFLICT_BODY.message)
    })

    it('never sends anything about a movement, whatever it does', async () => {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`POST ${APPLY_PATH}`]: answer(APPLY_OK),
        [`DELETE ${RULES_PATH}/8`]: answer(undefined),
      })
      const store = useCategoryRulesStore()

      await store.load(api.client)
      await store.confirmApply(api.client)
      await store.remove(8, api.client)

      expect(MOVEMENTS_TOUCHED(api.calls)).toBe(false)
      expect(api.calls.every((call) => call.path.startsWith('/api/category-rules'))).toBe(true)
      expect(IBERDROLA.id).toBe(8)
    })
  })

  describe('the result of the last pass (feature 30)', () => {
    const UNREADABLE =
      'Something went wrong applying the rules. Some movements may already be categorized. The review queue has been reloaded.'

    it('keeps the categorized movements the server sent as the list of the result', async () => {
      const api = fakeClient({ [`POST ${APPLY_PATH}`]: answer(APPLY_OK) })
      const store = useCategoryRulesStore()
      expect(store.lastApply).toBeNull()

      await store.confirmApply(api.client)

      const kept = store.lastApply?.result.categorizedMovements ?? []
      expect(kept).toHaveLength(12)
      expect(kept.map((one) => one.movementId)).toEqual(
        TWELVE_CATEGORIZED.map((one) => one.movementId),
      )
      expect(kept[0]).toEqual(TWO_RULES_MOVEMENT)
      expect(kept[1]).toEqual(INCOME_MOVEMENT)
      expect(kept[1]?.categoryName).toBe('Nomina')
      expect(kept[0]?.rules.map((one) => one.matchText)).toEqual([
        'sintetico colmado',
        'colmado norte',
      ])
      expect(store.lastApply?.result.categorized).toBe(12)
      expect(store.lastApply?.at).toBeInstanceOf(Date)
    })

    it('keeps no result when the answer of the server does not follow the contract', async () => {
      const withoutList: Record<string, unknown> = { ...APPLY_OK }
      delete withoutList.categorizedMovements
      const oneShort = { ...APPLY_OK, categorizedMovements: TWELVE_CATEGORIZED.slice(1) }

      for (const body of [withoutList, oneShort]) {
        setActivePinia(createPinia())
        const api = fakeClient({ [`POST ${APPLY_PATH}`]: answer(body) })
        const store = useCategoryRulesStore()

        await store.confirmApply(api.client)

        expect(store.lastApply).toBeNull()
        expect(store.applyFlow).toEqual({ step: 'failed', message: UNREADABLE })
        expect(store.applyRun).toBe(1)
      }
    })

    it('drops the previous result when another pass is confirmed', async () => {
      const second = deferred()
      let posts = 0
      const api = fakeClient({
        [`POST ${APPLY_PATH}`]: (call) => {
          posts += 1
          return posts === 1 ? Promise.resolve(APPLY_OK) : second.answer(call)
        },
      })
      const store = useCategoryRulesStore()
      await store.confirmApply(api.client)
      expect(store.lastApply).not.toBeNull()

      const running = store.confirmApply(api.client)

      // The POST has left and has not answered yet: the old result is already gone.
      expect(api.count(APPLY_PATH)).toBe(2)
      expect(store.applyFlow).toEqual({ step: 'applying' })
      expect(store.lastApply).toBeNull()

      second.resolve({ ...APPLY_OK, categorized: 0, categorizedMovements: [] })
      await running
      expect(store.lastApply?.result.categorized).toBe(0)
    })

    it('keeps no result when the pass fails', async () => {
      const failing = fakeClient({
        [`POST ${APPLY_PATH}`]: rejectWith(httpError(500, CONFLICT_BODY)),
      })
      const store = useCategoryRulesStore()

      await store.confirmApply(failing.client)

      expect(store.applyFlow).toMatchObject({ step: 'failed' })
      expect(store.lastApply).toBeNull()

      // A 200 that carries an error brings the list of what it did write: not kept either.
      setActivePinia(createPinia())
      const halfDone = fakeClient({
        [`POST ${APPLY_PATH}`]: answer({ ...APPLY_OK, error: { code: 'RULES_PASS_FAILED' } }),
      })
      const other = useCategoryRulesStore()

      await other.confirmApply(halfDone.client)

      expect(other.applyFlow).toMatchObject({ step: 'failed' })
      expect(other.lastApply).toBeNull()
    })

    it('a new page load starts with no result and writes nothing to the browser storage', async () => {
      localStorage.clear()
      sessionStorage.clear()
      const api = fakeClient({ [`POST ${APPLY_PATH}`]: answer(APPLY_OK) })
      const store = useCategoryRulesStore()

      await store.confirmApply(api.client)

      expect(store.lastApply?.result.categorizedMovements).toHaveLength(12)
      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)

      // What a reload leaves: a store made from scratch.
      setActivePinia(createPinia())
      expect(useCategoryRulesStore().lastApply).toBeNull()
    })

    it('applying sends a single request and it is the POST without a body', async () => {
      const api = fakeClient({ [`POST ${APPLY_PATH}`]: answer(APPLY_OK) })
      const store = useCategoryRulesStore()

      store.openApply()
      await store.confirmApply(api.client)

      expect(api.calls).toEqual([
        { path: APPLY_PATH, method: 'POST', body: undefined, contentType: undefined },
      ])
    })

    it('Dismiss forgets the result', async () => {
      const api = fakeClient({ [`POST ${APPLY_PATH}`]: answer(APPLY_OK) })
      const store = useCategoryRulesStore()
      await store.confirmApply(api.client)
      expect(store.lastApply).not.toBeNull()

      store.dismissLastApply()

      expect(store.lastApply).toBeNull()
      // The dialog is not its business: it stays as it was.
      expect(store.applyFlow).toMatchObject({ step: 'done' })
      expect(api.calls).toHaveLength(1)
    })
  })
})
