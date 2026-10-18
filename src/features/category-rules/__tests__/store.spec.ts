import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import { CATEGORIES_PATH } from '@/shared/categories'
import { ValidationError } from '@/shared/errors'

import LastApplyReport from '../components/LastApplyReport.vue'
import RuleCreatedNotice from '../components/RuleCreatedNotice.vue'
import { UNFINISHED_MOVE } from '../rules'
import { APPLY_PATH, RULES_PATH, SUGGESTIONS_PATH, parseApplyResult } from '../service'
import { useCategoryRulesStore } from '../store'
import {
  ACADEMY_CREATED,
  ACADEMY_MOVED,
  ACADEMY_SUGGESTION,
  ACADEMY_UNFINISHED,
  APPLY_OK,
  COOPERATIVE_SUGGESTION,
  SUGGESTIONS,
  SUPERMARKET_SUGGESTION,
  VALIDATION_BODY,
  networkError,
  saved,
  unreadable as unreadableReply,
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
        [`POST ${RULES_PATH}`]: answer(saved(MERCADONA)),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      const closed = await store.create({ matchText: 'Mercadona', categoryId: 4 }, api.client)

      expect(closed).toBe(true)
      expect(store.lastCreated?.rule.matchText).toBe('mercadona')
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
      pending.resolve(saved(MERCADONA))
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
        [`PATCH ${RULES_PATH}/8`]: answer(saved(rule(8, 'iberdrola', SUPERMARKET))),
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

  // ─── Suggested rules, and what a saved rule moved (feature 33) ────────────

  describe('suggested rules and what creating or changing a rule moved (feature 33)', () => {
    const CREATE = `POST ${RULES_PATH}`
    const SUGGESTED = `GET ${SUGGESTIONS_PATH}`

    /** The answers of `GET /api/category-rules/suggestions`, one per call, the last repeated. */
    const inTurn =
      (...bodies: unknown[]) =>
      () => {
        const body = bodies.length > 1 ? bodies.shift() : bodies[0]
        return Promise.resolve(body)
      }

    /** A store with the rules and the suggestions already on screen. */
    async function ready(answers: Parameters<typeof fakeClient>[0]) {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [SUGGESTED]: answer(SUGGESTIONS),
        ...answers,
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)
      await store.loadSuggestions(api.client)
      return { api, store }
    }

    const academyOf = (store: ReturnType<typeof useCategoryRulesStore>) => {
      const found = store.suggestions?.find((one) => one.matchText === ACADEMY_SUGGESTION.matchText)
      if (!found) throw new Error('the academy suggestion is not on the list')
      return found
    }

    it('creating a rule leaves its result in the box and in the line of the created rule', async () => {
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [CREATE]: answer(ACADEMY_CREATED),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      const closed = await store.create(
        { matchText: 'academia ficticia norte', categoryId: 12 },
        api.client,
      )

      expect(closed).toBe(true)
      expect(store.lastCreated?.rule.id).toBe(31)
      expect(store.lastCreated?.result.categorized).toBe(3)
      expect(store.lastApply?.cause).toBe('create')
      expect(store.lastApply?.rule?.matchText).toBe('academia ficticia norte')
      expect(store.lastApply?.rule?.category.name).toBe('Educación')
      expect(store.lastApply?.at).toBeInstanceOf(Date)
      expect(store.lastApply?.result.categorizedMovements.map((one) => one.movementId)).toEqual(
        ACADEMY_MOVED.map((one) => one.movementId),
      )
      expect(store.rules?.map((one) => one.id)).toEqual([7, 8, 9, 31])
      // The pass ran inside the POST: nothing else was asked for.
      expect(api.count(APPLY_PATH)).toBe(0)
      expect(MOVEMENTS_TOUCHED(api.calls)).toBe(false)
    })

    it('only one create travels at a time from the suggestions', async () => {
      const pending = deferred()
      const { api, store } = await ready({ [CREATE]: pending.answer })
      const [supermarket] = store.suggestions ?? []
      if (!supermarket) throw new Error('no suggestions')

      const first = store.createFromSuggestion(academyOf(store), 12, api.client)
      const second = store.createFromSuggestion(supermarket, 4, api.client)
      const fromDialog = store.create({ matchText: 'kiosco de prueba', categoryId: 4 }, api.client)

      expect(store.isSaving).toBe(true)
      expect(await second).toBe(false)
      expect(await fromDialog).toBe(false)
      pending.resolve(ACADEMY_CREATED)
      expect(await first).toBe(true)
      expect(api.calls.filter((call) => call.method === 'POST')).toHaveLength(1)
      expect(api.of(RULES_PATH).find((call) => call.method === 'POST')?.body).toEqual({
        matchText: 'academia ficticia norte',
        categoryId: 12,
      })
    })

    it('drops the used suggestion and asks for the list again after the rule is created', async () => {
      const again = deferred()
      let asked = 0
      const { api, store } = await ready({
        [CREATE]: answer(ACADEMY_CREATED),
        [SUGGESTED]: (call) => {
          asked += 1
          return asked === 1 ? Promise.resolve(SUGGESTIONS) : again.answer(call)
        },
      })

      const running = store.createFromSuggestion(academyOf(store), 12, api.client)
      await flushPromises()

      // The POST answered and the list is being asked for again: the used one is gone already.
      expect(api.count(SUGGESTIONS_PATH)).toBe(2)
      expect(store.suggestions?.map((one) => one.matchText)).toEqual([
        'supermercado inventado',
        'cooperativa sintetica',
      ])

      again.resolve([COOPERATIVE_SUGGESTION])
      expect(await running).toBe(true)
      expect(store.suggestions?.map((one) => one.matchText)).toEqual(['cooperativa sintetica'])
    })

    it('keeps the unused suggestions after a rule is created from another', async () => {
      const { api, store } = await ready({
        [CREATE]: answer(ACADEMY_CREATED),
        [SUGGESTED]: inTurn(SUGGESTIONS, [SUPERMARKET_SUGGESTION, COOPERATIVE_SUGGESTION]),
      })
      const before = store.suggestions?.filter(
        (one) => one.matchText !== ACADEMY_SUGGESTION.matchText,
      )

      await store.createFromSuggestion(academyOf(store), 12, api.client)

      expect(store.suggestions).toEqual(before)
      expect(store.suggestions?.map((one) => one.matchText)).toEqual([
        'supermercado inventado',
        'cooperativa sintetica',
      ])
      expect(store.suggestions?.[0]?.movements).toHaveLength(4)
      expect(store.suggestionFailure).toBeNull()
    })

    it('a rejected create from a suggestion leaves the suggestions the rules and the result as they were', async () => {
      const cases = [
        [
          httpError(400, VALIDATION_BODY),
          'Nothing was saved: the text needs at least 3 letters or digits.',
        ],
        [
          httpError(404, NOT_FOUND_BODY),
          'Nothing was saved: that category or rule no longer exists.',
        ],
        [httpError(409, CONFLICT_BODY), 'Nothing was saved: another rule already uses that text.'],
        [networkError(), "Couldn't reach the server. Nothing was saved."],
      ] as const

      for (const [failure, sentence] of cases) {
        setActivePinia(createPinia())
        const { api, store } = await ready({ [CREATE]: rejectWith(failure) })
        const result = {
          at: new Date(2026, 9, 18, 10, 42),
          result: parseApplyResult(APPLY_OK),
          cause: 'apply' as const,
          rule: null,
        }
        store.lastApply = result
        const suggestionsBefore = JSON.stringify(store.suggestions)
        const rulesBefore = JSON.stringify(store.rules)
        const callsBefore = api.calls.length

        const created = await store.createFromSuggestion(academyOf(store), 12, api.client)

        expect(created).toBe(false)
        // The only request was that POST.
        expect(api.calls.slice(callsBefore).map((call) => `${call.method} ${call.path}`)).toEqual([
          CREATE,
        ])
        expect(JSON.stringify(store.suggestions)).toBe(suggestionsBefore)
        expect(JSON.stringify(store.rules)).toBe(rulesBefore)
        expect(store.lastApply).toEqual(result)
        expect(store.lastCreated).toBeNull()
        expect(store.applyRun).toBe(0)
        expect(store.suggestionFailure).toEqual({
          matchText: 'academia ficticia norte',
          message: sentence,
        })
        // The sentence of the dialog is not where a row failure goes.
        expect(store.saveMessage).toBeNull()
      }
    })

    it('a create whose pass did not finish keeps the rule and says the rest will move later', async () => {
      const { api, store } = await ready({
        [CREATE]: answer(ACADEMY_UNFINISHED),
        [SUGGESTED]: inTurn(SUGGESTIONS, [SUPERMARKET_SUGGESTION, COOPERATIVE_SUGGESTION]),
      })

      const created = await store.createFromSuggestion(academyOf(store), 12, api.client)

      expect(created).toBe(true)
      expect(store.rules?.map((one) => one.id)).toEqual([7, 8, 9, 31])
      expect(store.lastCreated?.result.error).toEqual({ code: 'RULES_PASS_FAILED' })
      expect(store.lastApply?.result.error).toEqual({ code: 'RULES_PASS_FAILED' })
      expect(store.lastApply?.result.categorizedMovements).toHaveLength(1)
      expect(store.suggestions?.map((one) => one.matchText)).not.toContain(
        'academia ficticia norte',
      )
      expect(store.applyRun).toBe(1)

      // What the box and the line paint with it.
      const kept = store.lastCreated
      const report = store.lastApply
      if (!kept || !report) throw new Error('nothing kept')
      expect(mount(RuleCreatedNotice, { props: { saved: kept } }).text()).toContain(UNFINISHED_MOVE)
      expect(mount(LastApplyReport, { props: { report } }).text()).toContain(UNFINISHED_MOVE)
    })

    it('creating or changing a rule makes Review and Movements ask again', async () => {
      const serverDown = httpError(500, CONFLICT_BODY)
      let posts = 0
      let patches = 0
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [CREATE]: () => {
          posts += 1
          if (posts === 1) return Promise.resolve(ACADEMY_CREATED)
          if (posts === 2) return Promise.reject(serverDown)
          return Promise.reject(httpError(409, CONFLICT_BODY))
        },
        [`PATCH ${RULES_PATH}/8`]: () => {
          patches += 1
          if (patches === 1) return Promise.resolve(saved(rule(8, 'iberdrola', SUPERMARKET)))
          if (patches === 2) return Promise.reject(unreadableReply())
          return Promise.reject(networkError())
        },
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)
      const create = () =>
        store.create({ matchText: 'academia ficticia norte', categoryId: 12 }, api.client)
      const change = (categoryId: number) =>
        store.update(8, { matchText: 'iberdrola', categoryId }, api.client)

      await create()
      expect(store.applyRun).toBe(1)
      await change(4)
      expect(store.applyRun).toBe(2)
      // A 500 may have saved the rule and moved movements.
      await create()
      expect(store.applyRun).toBe(3)
      // An answer that could not be read, too. (The 500 reloaded the list: rule 8 is in 6 again.)
      await change(4)
      expect(store.applyRun).toBe(4)
      // A rejection and a request that never arrived wrote nothing: nobody asks again.
      await create()
      await change(4)
      expect(store.applyRun).toBe(4)
    })

    it('changing deleting or applying rules asks for the suggestions again', async () => {
      const { api, store } = await ready({
        [`PATCH ${RULES_PATH}/8`]: answer(saved(rule(8, 'iberdrola', SUPERMARKET))),
        [`DELETE ${RULES_PATH}/9`]: answer(undefined),
        [`POST ${APPLY_PATH}`]: answer(APPLY_OK),
        [`PATCH ${RULES_PATH}/7`]: rejectWith(httpError(409, CONFLICT_BODY)),
      })
      expect(api.count(SUGGESTIONS_PATH)).toBe(1)

      await store.update(8, { matchText: 'iberdrola', categoryId: 4 }, api.client)
      expect(api.count(SUGGESTIONS_PATH)).toBe(2)

      await store.remove(9, api.client)
      expect(api.count(SUGGESTIONS_PATH)).toBe(3)

      await store.confirmApply(api.client)
      expect(api.count(SUGGESTIONS_PATH)).toBe(4)

      // A rejected change wrote nothing: the list is not asked for.
      await store.update(7, { matchText: 'mercadona', categoryId: 6 }, api.client)
      expect(api.count(SUGGESTIONS_PATH)).toBe(4)

      // A screen that never asked for the suggestions does not start asking.
      setActivePinia(createPinia())
      const other = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`PATCH ${RULES_PATH}/8`]: answer(saved(rule(8, 'iberdrola', SUPERMARKET))),
        [`POST ${APPLY_PATH}`]: answer(APPLY_OK),
      })
      const fresh = useCategoryRulesStore()
      await fresh.load(other.client)
      await fresh.update(8, { matchText: 'iberdrola', categoryId: 4 }, other.client)
      await fresh.confirmApply(other.client)
      expect(other.count(SUGGESTIONS_PATH)).toBe(0)
    })

    it('a suggestion load that fails or does not follow the contract leaves no list', async () => {
      const notAddingUp = [{ ...ACADEMY_SUGGESTION, movementCount: 4 }]
      let asked = 0
      const api = fakeClient({
        [SUGGESTED]: () => {
          asked += 1
          if (asked === 1) return Promise.resolve(SUGGESTIONS)
          if (asked === 2) return Promise.reject(httpError(500, CONFLICT_BODY))
          return Promise.resolve(notAddingUp)
        },
      })
      const store = useCategoryRulesStore()

      await store.loadSuggestions(api.client)
      expect(store.suggestions).toHaveLength(3)

      await store.loadSuggestions(api.client)
      expect(store.suggestions).toBeNull()
      expect(store.suggestionsError).not.toBeNull()
      expect(store.suggestionsLoading).toBe(false)

      await store.loadSuggestions(api.client)
      expect(store.suggestions).toBeNull()
      expect(store.suggestionsError).toBeInstanceOf(ValidationError)
    })

    it('changing a rule leaves its result in the box', async () => {
      const moved = {
        categorized: 2,
        categorizedMovements: ACADEMY_MOVED.slice(0, 2),
        conflictCount: 0,
        conflicts: [],
        unmatched: 37,
      }
      const api = fakeClient({
        [`GET ${RULES_PATH}`]: answer(THREE_RULES),
        [`PATCH ${RULES_PATH}/8`]: answer(saved(rule(8, 'iberdrola', SUPERMARKET), moved)),
      })
      const store = useCategoryRulesStore()
      await store.load(api.client)

      const closed = await store.update(8, { matchText: 'iberdrola', categoryId: 4 }, api.client)

      expect(closed).toBe(true)
      expect(store.lastApply?.cause).toBe('update')
      expect(store.lastApply?.rule?.id).toBe(8)
      expect(store.lastApply?.rule?.category.name).toBe('Supermercado')
      expect(store.lastApply?.result.categorized).toBe(2)
      // Only a create leaves the line of the created rule.
      expect(store.lastCreated).toBeNull()
    })
  })
})
