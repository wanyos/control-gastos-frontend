import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { toAppError } from '@/shared/errors'
import { needsReload } from '@/shared/movements'
import type { Movement } from '@/shared/movements'

import {
  ANSWER_UNDONE_NOTICE,
  LINKED_NOTICE,
  LINK_UNDONE_NOTICE,
  MINE_NOTICE,
  NOT_MINE_NOTICE,
  RELINKED_NOTICE,
  linkProblem,
  transferWriteError,
  unlinkedNotice,
} from './pairs'
import {
  countDoubtfulOwnership,
  getAmbiguousGroups,
  getDoubtfulOwnership,
  getTransferPairs,
  linkMovements,
  setOwnershipDecision,
  unlinkPair,
} from './service'
import type {
  AmbiguousGroup,
  Gesture,
  LinkChoice,
  ListStatus,
  Notice,
  TransferPair,
  Undo,
} from './types'

const NO_NOTICE: Notice = { summary: null, error: null, undo: null }

/**
 * The transfers screen: the linked pairs, the doubtful groups, and the only two writes
 * of the feature. Nothing is ever linked or unlinked by itself: every write starts in
 * an action the view calls from a click (C7). Actions never throw: a failure lives in
 * the notice or in the status of its list.
 *
 * Feature 35 adds a third list, the doubtful movements of own money, the number the
 * sidebar shows next to `Transfers`, and the answer about one of them (with its Undo).
 * The same rule holds: no answer leaves without a click, and one write at a time.
 */
export const useTransfersStore = defineStore('transfers', () => {
  const pairs = ref<TransferPair[]>([])
  const pairsStatus = ref<ListStatus>('loading')
  const groups = ref<AmbiguousGroup[]>([])
  const groupsStatus = ref<ListStatus>('loading')
  /** Feature 35: the doubtful movements of own money, at most 200 (design §4). */
  const ownership = ref<Movement[]>([])
  const ownershipStatus = ref<ListStatus>('loading')
  /** How many there are in total, for the sidebar. Null while unknown. */
  const doubtfulCount = ref<number | null>(null)

  /** What is picked in each group, by group key. Empty at load and after every reload. */
  const choices = ref<Record<string, LinkChoice>>({})
  /** The pair the confirmation dialog is asking about, or null when it is closed. */
  const pendingUnlink = ref<TransferPair | null>(null)
  /** One write at a time. */
  const busy = ref(false)
  const notice = ref<Notice>({ ...NO_NOTICE })

  // Each list drops an answer that is no longer its last request.
  let pairsRun = 0
  let groupsRun = 0
  let ownershipRun = 0

  async function fetchPairs(quiet: boolean): Promise<void> {
    pairsRun += 1
    const run = pairsRun
    if (!quiet) pairsStatus.value = 'loading'
    try {
      const loaded = await getTransferPairs()
      if (run !== pairsRun) return
      pairs.value = loaded
      pairsStatus.value = 'ready'
    } catch {
      if (run !== pairsRun) return
      pairs.value = []
      pairsStatus.value = 'error'
    }
  }

  async function fetchGroups(quiet: boolean): Promise<void> {
    groupsRun += 1
    const run = groupsRun
    if (!quiet) groupsStatus.value = 'loading'
    try {
      const loaded = await getAmbiguousGroups()
      if (run !== groupsRun) return
      groups.value = loaded
      groupsStatus.value = 'ready'
    } catch {
      if (run !== groupsRun) return
      groups.value = []
      groupsStatus.value = 'error'
    }
  }

  /**
   * The doubtful movements of own money (feature 35, R3). Every answer also sets the
   * sidebar number (R12); a failure leaves it as it was: the number does not vanish
   * because the screen failed.
   */
  async function fetchOwnership(quiet: boolean): Promise<void> {
    ownershipRun += 1
    const run = ownershipRun
    if (!quiet) ownershipStatus.value = 'loading'
    try {
      const loaded = await getDoubtfulOwnership()
      if (run !== ownershipRun) return
      ownership.value = loaded.movements
      ownershipStatus.value = 'ready'
      doubtfulCount.value = loaded.total
    } catch {
      if (run !== ownershipRun) return
      ownership.value = []
      ownershipStatus.value = 'error'
    }
  }

  /** The three reads, in parallel and apart: one failing leaves the others alone (R14, R5). */
  async function load(): Promise<void> {
    notice.value = { ...NO_NOTICE }
    pendingUnlink.value = null
    choices.value = {}
    await Promise.all([fetchPairs(false), fetchGroups(false), fetchOwnership(false)])
  }

  const retryPairs = (): Promise<void> => fetchPairs(false)
  const retryGroups = (): Promise<void> => fetchGroups(false)
  const retryOwnership = (): Promise<void> => fetchOwnership(false)

  /**
   * After every write the three lists are asked for again, never patched by hand: only
   * the backend knows what an unlink or a link did to the doubtful groups, and a
   * movement that becomes a leg of a transfer stops being doubtful (contract). Quiet, so
   * the lists do not blink.
   */
  async function reloadLists(): Promise<void> {
    choices.value = {}
    await Promise.all([fetchPairs(true), fetchGroups(true), fetchOwnership(true)])
  }

  /**
   * After an import (2026-10-16): the detection may have linked pairs and left new
   * doubtful groups, so a list that was already on screen is asked for again. The
   * initial `loading` means the screen was never opened: nothing is read then.
   */
  async function reloadIfLoaded(): Promise<void> {
    const loaded = (status: ListStatus) => status !== 'loading'
    await Promise.all([
      loaded(pairsStatus.value) ? fetchPairs(true) : Promise.resolve(),
      loaded(groupsStatus.value) ? fetchGroups(true) : Promise.resolve(),
      loaded(ownershipStatus.value) ? fetchOwnership(true) : Promise.resolve(),
    ])
  }

  /**
   * The sidebar number (feature 35, R12): `pagination.total` of the smallest query. A
   * failure leaves it unknown, and then nothing is painted (R11). It only reads.
   */
  async function refreshDoubtfulCount(client?: HttpClient): Promise<void> {
    try {
      doubtfulCount.value = await countDoubtfulOwnership(client)
    } catch {
      doubtfulCount.value = null
    }
  }

  async function write(
    gesture: Gesture,
    action: () => Promise<{ summary: string; undo: Undo | null }>,
  ): Promise<void> {
    if (busy.value) return
    busy.value = true
    notice.value = { ...NO_NOTICE }
    try {
      const done = await action()
      notice.value = { summary: done.summary, error: null, undo: done.undo }
      await reloadLists()
    } catch (rejection) {
      const failure = toAppError(rejection)
      notice.value = { summary: null, error: transferWriteError(failure, gesture), undo: null }
      if (needsReload(failure)) await reloadLists()
    } finally {
      busy.value = false
    }
  }

  function requestUnlink(pair: TransferPair): void {
    if (busy.value) return
    pendingUnlink.value = pair
  }

  function cancelUnlink(): void {
    pendingUnlink.value = null
  }

  /** Unlinks the pair the dialog asked about, and offers to link it back (R6). */
  async function confirmUnlink(): Promise<void> {
    const pair = pendingUnlink.value
    if (!pair || busy.value) return
    pendingUnlink.value = null
    await write('unlink', async () => {
      await unlinkPair(pair.transferId)
      return {
        summary: unlinkedNotice(pair),
        undo: { kind: 'relink', expenseId: pair.expense.id, incomeId: pair.income.id },
      }
    })
  }

  /** Picks one movement of one column of one group; the other column is kept. */
  function choose(key: string, side: 'out' | 'in', id: number): void {
    const current = choices.value[key] ?? { outId: null, inId: null }
    choices.value = {
      ...choices.value,
      [key]: side === 'out' ? { ...current, outId: id } : { ...current, inId: id },
    }
  }

  /**
   * Links the two picked movements of a group. The choice is checked again here: the
   * disabled button is not the only barrier, and an invalid choice sends nothing (R11).
   */
  async function link(key: string): Promise<void> {
    const group = groups.value.find((one) => one.key === key)
    const choice = choices.value[key]
    if (!group || !choice || linkProblem(group, choice) !== null) return
    const { outId, inId } = choice
    if (outId === null || inId === null) return
    await write('link', async () => {
      const transferId = await linkMovements(outId, inId)
      return { summary: LINKED_NOTICE, undo: { kind: 'unlink', transferId } }
    })
  }

  /**
   * Answers whether ONE doubtful movement is yours (feature 35, R6, R7): only from a click
   * on `It's mine` or `Not mine`. Offers to undo it.
   */
  async function answerOwnership(id: number, decision: 'mine' | 'not_mine'): Promise<void> {
    await write('ownership', async () => {
      await setOwnershipDecision(id, decision)
      return {
        summary: decision === 'mine' ? MINE_NOTICE : NOT_MINE_NOTICE,
        undo: { kind: 'ownership', movementId: id },
      }
    })
  }

  /** Runs the inverse of the last write. Nothing is offered after it: no redo (R7). */
  async function undo(): Promise<void> {
    const last = notice.value.undo
    if (!last || busy.value) return
    if (last.kind === 'ownership') {
      // Feature 35, R8: the same movement goes back to what the backend recognises.
      await write('undo-ownership', async () => {
        await setOwnershipDecision(last.movementId, null)
        return { summary: ANSWER_UNDONE_NOTICE, undo: null }
      })
    } else if (last.kind === 'relink') {
      await write('relink', async () => {
        await linkMovements(last.expenseId, last.incomeId)
        return { summary: RELINKED_NOTICE, undo: null }
      })
    } else {
      await write('undo-link', async () => {
        await unlinkPair(last.transferId)
        return { summary: LINK_UNDONE_NOTICE, undo: null }
      })
    }
  }

  return {
    pairs,
    pairsStatus,
    groups,
    groupsStatus,
    ownership,
    ownershipStatus,
    doubtfulCount,
    choices,
    pendingUnlink,
    busy,
    notice,
    load,
    retryPairs,
    retryGroups,
    retryOwnership,
    reloadLists,
    reloadIfLoaded,
    refreshDoubtfulCount,
    requestUnlink,
    cancelUnlink,
    confirmUnlink,
    choose,
    link,
    answerOwnership,
    undo,
  }
})
