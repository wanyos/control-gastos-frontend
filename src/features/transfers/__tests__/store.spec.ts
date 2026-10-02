import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { AMBIGUOUS_TRANSFERS_PATH, TRANSFERS_PATH } from '@/shared/transfers'

import { useTransfersStore } from '../store'
import {
  AMBIGUOUS,
  BACKEND_MESSAGES,
  CONFLICT_BODY,
  FINE_100,
  FINE_100_ID,
  FOUR_PAIRS,
  GROUP_OF_3,
  GROUP_OF_4,
  GOOD_1,
  NOT_FOUND_BODY,
  SERVER_ERROR_BODY,
  TRANSFERS,
  VALIDATION_BODY,
  ambiguous,
  deferred,
  json,
  linked,
  marked,
  mockApi,
  networkDown,
  noContent,
} from './fixtures'

const BOTH_READS = [`GET ${TRANSFERS}`, `GET ${AMBIGUOUS}`]

async function loaded(answers: Parameters<typeof mockApi>[0]) {
  const api = mockApi({ pairs: json(FOUR_PAIRS), ...answers })
  const store = useTransfersStore()
  await store.load()
  return { api, store }
}

const fineOf = (store: ReturnType<typeof useTransfersStore>) => {
  const fine = store.pairs.find((pair) => pair.transferId === FINE_100_ID)
  if (!fine) throw new Error('the fine is not in the list')
  return fine
}

describe('transfers store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loading (R2, R8, R14)', () => {
    it('asks for each list once and keeps the backend order', async () => {
      const { api, store } = await loaded({ ambiguous: json(ambiguous(GROUP_OF_3)) })

      expect([...api.log()].sort()).toEqual([...BOTH_READS].sort())
      expect(store.pairsStatus).toBe('ready')
      expect(store.groupsStatus).toBe('ready')
      expect(store.pairs.map((pair) => pair.transferId)).toEqual(
        FOUR_PAIRS.pairs.map((pair) => pair.transferId),
      )
      expect(store.groups.map((group) => group.key)).toEqual(['812-840-841'])
      // Nothing is picked beforehand and nothing was written (C7).
      expect(store.choices).toEqual({})
      expect(api.writes()).toEqual([])
    })

    it('a failed read of the pairs leaves the doubtful groups ready, and retries alone', async () => {
      let attempt = 0
      const { api, store } = await loaded({
        pairs: () => {
          attempt += 1
          return attempt === 1 ? json(SERVER_ERROR_BODY, 500)() : json(FOUR_PAIRS)()
        },
        ambiguous: json(ambiguous(GROUP_OF_3)),
      })

      expect(store.pairsStatus).toBe('error')
      expect(store.groupsStatus).toBe('ready')
      expect(store.groups).toHaveLength(1)

      await store.retryPairs()

      expect(store.pairsStatus).toBe('ready')
      expect(store.pairs).toHaveLength(4)
      expect(api.reads(TRANSFERS)).toBe(2)
      expect(api.reads(AMBIGUOUS)).toBe(1)
    })

    it('a failed read of the doubtful groups leaves the pairs ready, and retries alone', async () => {
      let attempt = 0
      const { api, store } = await loaded({
        ambiguous: () => {
          attempt += 1
          return attempt === 1 ? networkDown() : json(ambiguous(GROUP_OF_3))()
        },
      })

      expect(store.groupsStatus).toBe('error')
      expect(store.pairsStatus).toBe('ready')
      expect(store.pairs).toHaveLength(4)

      await store.retryGroups()

      expect(store.groupsStatus).toBe('ready')
      expect(api.reads(AMBIGUOUS)).toBe(2)
      expect(api.reads(TRANSFERS)).toBe(1)
    })
  })

  describe('unlinking (R5, R6, R7, R13)', () => {
    it('asking opens the question and sends nothing; cancelling closes it', async () => {
      const { api, store } = await loaded({ unlink: noContent })

      store.requestUnlink(fineOf(store))

      expect(store.pendingUnlink?.transferId).toBe(FINE_100_ID)
      expect(api.writes()).toEqual([])

      store.cancelUnlink()
      await store.confirmUnlink()

      expect(store.pendingUnlink).toBeNull()
      expect(api.writes()).toEqual([])
    })

    it('a 204 reloads both lists and offers Undo', async () => {
      const { api, store } = await loaded({ unlink: noContent })
      store.requestUnlink(fineOf(store))

      await store.confirmUnlink()

      expect(api.writes()).toEqual([
        { method: 'DELETE', path: `${TRANSFERS}/${FINE_100_ID}`, rawBody: undefined },
      ])
      expect(api.reads(TRANSFERS)).toBe(2)
      expect(api.reads(AMBIGUOUS)).toBe(2)
      expect(store.pendingUnlink).toBeNull()
      expect(store.notice).toEqual({
        summary: 'Pair unlinked. Its two movements count in your totals again.',
        error: null,
        undo: { kind: 'relink', expenseId: 33339, incomeId: 24377 },
      })
      // The reload is quiet: the lists never went back to loading.
      expect(store.pairsStatus).toBe('ready')
      expect(store.busy).toBe(false)
    })

    it('the notice follows the marks of the pair: it never says a marked leg counts again', async () => {
      const cases = [
        [
          marked(FINE_100, true, false),
          'Pair unlinked. One movement counts in your totals again; the other stays out because you marked it as not counted.',
        ],
        [
          marked(FINE_100, true, true),
          'Pair unlinked. Neither counts in your totals: you marked both as not counted.',
        ],
      ] as const
      const seen: (string | null)[] = []

      for (const [fine] of cases) {
        vi.restoreAllMocks()
        setActivePinia(createPinia())
        const { store } = await loaded({
          pairs: json({ pairs: [GOOD_1, fine] }),
          unlink: noContent,
        })
        store.requestUnlink(fineOf(store))
        await store.confirmUnlink()
        seen.push(store.notice.summary)
      }

      expect(seen).toEqual(cases.map(([, sentence]) => sentence))
    })

    it('Undo links that same pair again, expense first, and offers nothing after', async () => {
      const { api, store } = await loaded({ unlink: noContent, link: json(linked('again'), 201) })
      store.requestUnlink(fineOf(store))
      await store.confirmUnlink()

      await store.undo()

      expect(api.writes().at(-1)).toEqual({
        method: 'POST',
        path: TRANSFERS,
        rawBody: '{"movementIds":[33339,24377]}',
      })
      expect(api.reads(TRANSFERS)).toBe(3)
      expect(api.reads(AMBIGUOUS)).toBe(3)
      expect(store.notice).toEqual({ summary: 'Pair linked again.', error: null, undo: null })

      // Nothing left to undo: a second call sends nothing.
      await store.undo()
      expect(api.writes()).toHaveLength(2)
    })

    it('a 404 says the pair was already unlinked and reloads', async () => {
      const { api, store } = await loaded({ unlink: json(NOT_FOUND_BODY, 404) })
      store.requestUnlink(fineOf(store))

      await store.confirmUnlink()

      expect(store.notice).toEqual({
        summary: null,
        error: 'That pair was already unlinked. Reloading.',
        undo: null,
      })
      expect(api.reads(TRANSFERS)).toBe(2)
      expect(api.reads(AMBIGUOUS)).toBe(2)
    })

    it('a network failure says nothing changed and does not reload', async () => {
      const { api, store } = await loaded({ unlink: networkDown })
      store.requestUnlink(fineOf(store))

      await store.confirmUnlink()

      expect(store.notice.error).toBe("Couldn't reach the server. Nothing changed.")
      expect(api.reads(TRANSFERS)).toBe(1)
      expect(store.pairs).toHaveLength(4)
    })

    it('a failed Undo says so in English and reloads when it could have written', async () => {
      const { api, store } = await loaded({ unlink: noContent, link: json(CONFLICT_BODY, 409) })
      store.requestUnlink(fineOf(store))
      await store.confirmUnlink()

      await store.undo()

      expect(store.notice).toEqual({
        summary: null,
        error: 'One of those movements is already in a pair. Nothing changed. Reloading.',
        undo: null,
      })
      expect(api.reads(TRANSFERS)).toBe(3)
    })
  })

  describe('linking (R10, R11, R12, R13, C7)', () => {
    const withGroups = (answers: Parameters<typeof mockApi>[0] = {}) =>
      loaded({ ambiguous: json(ambiguous(GROUP_OF_3, GROUP_OF_4)), ...answers })

    const KEY_3 = '812-840-841'
    const KEY_4 = '901-902-903-904'

    it('keeps at most one pick per column, and each group apart', async () => {
      const { store } = await withGroups()

      store.choose(KEY_3, 'in', 840)
      store.choose(KEY_3, 'in', 841)
      store.choose(KEY_4, 'out', 902)

      expect(store.choices).toEqual({
        [KEY_3]: { outId: null, inId: 841 },
        [KEY_4]: { outId: 902, inId: null },
      })
    })

    it('a valid choice sends the POST, reloads, empties the choices and offers Undo', async () => {
      const { api, store } = await withGroups({ link: json(linked('made-by-hand'), 201) })
      store.choose(KEY_3, 'out', 812)
      store.choose(KEY_3, 'in', 841)
      store.choose(KEY_4, 'out', 901)

      await store.link(KEY_3)

      expect(api.writes()).toEqual([
        { method: 'POST', path: TRANSFERS, rawBody: '{"movementIds":[812,841]}' },
      ])
      expect(api.reads(TRANSFERS)).toBe(2)
      expect(api.reads(AMBIGUOUS)).toBe(2)
      expect(store.choices).toEqual({})
      expect(store.notice).toEqual({
        summary: 'Linked as a transfer. These two movements no longer count in your totals.',
        error: null,
        undo: { kind: 'unlink', transferId: 'made-by-hand' },
      })
    })

    it('Undo unlinks with the transferId the 201 gave', async () => {
      const { api, store } = await withGroups({
        link: json(linked('made by/hand'), 201),
        unlink: noContent,
      })
      store.choose(KEY_3, 'out', 812)
      store.choose(KEY_3, 'in', 840)
      await store.link(KEY_3)

      await store.undo()

      expect(api.writes().at(-1)).toEqual({
        method: 'DELETE',
        path: `${TRANSFERS}/made%20by%2Fhand`,
        rawBody: undefined,
      })
      expect(store.notice).toEqual({ summary: 'Link undone.', error: null, undo: null })
      expect(api.reads(TRANSFERS)).toBe(3)
    })

    it('an invalid choice sends no request at all', async () => {
      const { api, store } = await withGroups({ link: json(linked('never'), 201) })

      // Nothing picked, one column only, same account, unknown group.
      await store.link(KEY_3)
      store.choose(KEY_3, 'out', 812)
      await store.link(KEY_3)
      store.choose(KEY_4, 'out', 901)
      store.choose(KEY_4, 'in', 904)
      await store.link(KEY_4)
      await store.link('no-such-group')

      expect(api.writes()).toEqual([])
      expect(api.log()).toHaveLength(2)
      expect(store.notice).toEqual({ summary: null, error: null, undo: null })
    })

    it('a 409 says one is already in a pair and reloads', async () => {
      const { api, store } = await withGroups({ link: json(CONFLICT_BODY, 409) })
      store.choose(KEY_3, 'out', 812)
      store.choose(KEY_3, 'in', 840)

      await store.link(KEY_3)

      expect(store.notice).toEqual({
        summary: null,
        error: 'One of those movements is already in a pair. Nothing changed. Reloading.',
        undo: null,
      })
      expect(api.reads(TRANSFERS)).toBe(2)
      expect(api.reads(AMBIGUOUS)).toBe(2)
      expect(store.choices).toEqual({})
    })

    it('a 400 says nothing changed and does NOT reload: the choice stays', async () => {
      const { api, store } = await withGroups({ link: json(VALIDATION_BODY, 400) })
      store.choose(KEY_3, 'out', 812)
      store.choose(KEY_3, 'in', 840)

      await store.link(KEY_3)

      expect(store.notice.error).toBe('Nothing changed. The server rejected that pair.')
      expect(api.reads(TRANSFERS)).toBe(1)
      expect(api.reads(AMBIGUOUS)).toBe(1)
      expect(store.choices[KEY_3]).toEqual({ outId: 812, inId: 840 })
    })

    it('a 500 promises a reload instead of saying nothing happened', async () => {
      const { api, store } = await withGroups({ link: json(SERVER_ERROR_BODY, 500) })
      store.choose(KEY_3, 'out', 812)
      store.choose(KEY_3, 'in', 840)

      await store.link(KEY_3)

      expect(store.notice.error).toBe(
        'Something went wrong. Reloading to show what really happened.',
      )
      expect(api.reads(TRANSFERS)).toBe(2)
    })

    it('never puts a backend message in the notice', async () => {
      for (const [body, status] of [
        [NOT_FOUND_BODY, 404],
        [CONFLICT_BODY, 409],
        [VALIDATION_BODY, 400],
        [SERVER_ERROR_BODY, 500],
      ] as const) {
        vi.restoreAllMocks()
        setActivePinia(createPinia())
        const { store } = await withGroups({ link: json(body, status) })
        store.choose(KEY_3, 'out', 812)
        store.choose(KEY_3, 'in', 840)

        await store.link(KEY_3)

        expect(store.notice.error).not.toBeNull()
        for (const message of BACKEND_MESSAGES) {
          expect(store.notice.error).not.toContain(message)
        }
      }
    })
  })

  describe('one write at a time, and only these writes (R15, C1)', () => {
    it('while a write is in flight a second one does not leave', async () => {
      const slow = deferred()
      const { api, store } = await loaded({
        ambiguous: json(ambiguous(GROUP_OF_3)),
        unlink: slow.answer,
        link: json(linked('never'), 201),
      })
      store.requestUnlink(fineOf(store))

      const first = store.confirmUnlink()
      expect(store.busy).toBe(true)

      // A link, an unlink of another pair and an undo, all while busy.
      store.choose('812-840-841', 'out', 812)
      store.choose('812-840-841', 'in', 840)
      await store.link('812-840-841')
      store.requestUnlink(store.pairs[0]!)
      await store.confirmUnlink()
      await store.undo()

      expect(store.pendingUnlink).toBeNull()
      expect(api.writes()).toHaveLength(1)

      slow.resolve(new Response(null, { status: 204 }))
      await first

      expect(store.busy).toBe(false)
      expect(api.writes()).toHaveLength(1)
    })

    it('uses no method but GET, POST and DELETE and no path outside the two shared ones', async () => {
      const { api, store } = await loaded({
        ambiguous: json(ambiguous(GROUP_OF_3)),
        unlink: noContent,
        link: json(linked('made-by-hand'), 201),
      })

      // Every gesture of the screen, once: unlink, its undo, link, its undo, retries.
      store.requestUnlink(fineOf(store))
      await store.confirmUnlink()
      await store.undo()
      store.choose('812-840-841', 'out', 812)
      store.choose('812-840-841', 'in', 840)
      await store.link('812-840-841')
      await store.undo()
      await store.retryPairs()
      await store.retryGroups()

      expect(api.writes()).toHaveLength(4)
      expect([...new Set(api.calls.map((call) => call.method))].sort()).toEqual([
        'DELETE',
        'GET',
        'POST',
      ])
      const of = (method: string) => api.calls.filter((call) => call.method === method)
      expect([...new Set(of('GET').map((call) => call.path))].sort()).toEqual(
        [TRANSFERS_PATH, AMBIGUOUS_TRANSFERS_PATH].sort(),
      )
      expect(of('POST').map((call) => call.path)).toEqual([TRANSFERS_PATH, TRANSFERS_PATH])
      expect(
        of('POST').map((call) => Object.keys(JSON.parse(call.rawBody ?? '{}') as object)),
      ).toEqual([['movementIds'], ['movementIds']])
      expect(of('DELETE').map((call) => call.path)).toEqual([
        `${TRANSFERS_PATH}/${FINE_100_ID}`,
        `${TRANSFERS_PATH}/made-by-hand`,
      ])
      expect(of('DELETE').map((call) => call.rawBody)).toEqual([undefined, undefined])
      // Nothing but the two ids ever travels: no amount, category, status or mark.
      const bodies = api.calls.map((call) => call.rawBody ?? '').join(' ')
      for (const field of ['amount', 'categoryId', 'status', 'excludedFromTotals', 'note']) {
        expect(bodies).not.toContain(field)
      }
    })
  })
})
