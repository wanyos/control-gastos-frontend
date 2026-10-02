import { ref } from 'vue'
import { defineStore } from 'pinia'

import { toAppError } from '@/shared/errors'
import { needsReload } from '@/shared/movements'

import {
  LINKED_NOTICE,
  LINK_UNDONE_NOTICE,
  RELINKED_NOTICE,
  linkProblem,
  transferWriteError,
  unlinkedNotice,
} from './pairs'
import { getAmbiguousGroups, getTransferPairs, linkMovements, unlinkPair } from './service'
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
 */
export const useTransfersStore = defineStore('transfers', () => {
  const pairs = ref<TransferPair[]>([])
  const pairsStatus = ref<ListStatus>('loading')
  const groups = ref<AmbiguousGroup[]>([])
  const groupsStatus = ref<ListStatus>('loading')

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

  /** The two reads, in parallel and apart: one failing leaves the other alone (R14). */
  async function load(): Promise<void> {
    notice.value = { ...NO_NOTICE }
    pendingUnlink.value = null
    choices.value = {}
    await Promise.all([fetchPairs(false), fetchGroups(false)])
  }

  const retryPairs = (): Promise<void> => fetchPairs(false)
  const retryGroups = (): Promise<void> => fetchGroups(false)

  /**
   * After every write both lists are asked for again, never patched by hand: only the
   * backend knows what an unlink or a link did to the doubtful groups. Quiet, so the
   * lists do not blink.
   */
  async function reloadBoth(): Promise<void> {
    choices.value = {}
    await Promise.all([fetchPairs(true), fetchGroups(true)])
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
      await reloadBoth()
    } catch (rejection) {
      const failure = toAppError(rejection)
      notice.value = { summary: null, error: transferWriteError(failure, gesture), undo: null }
      if (needsReload(failure)) await reloadBoth()
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

  /** Runs the inverse of the last write. Nothing is offered after it: no redo (R7). */
  async function undo(): Promise<void> {
    const last = notice.value.undo
    if (!last || busy.value) return
    if (last.kind === 'relink') {
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
    choices,
    pendingUnlink,
    busy,
    notice,
    load,
    retryPairs,
    retryGroups,
    reloadBoth,
    requestUnlink,
    cancelUnlink,
    confirmUnlink,
    choose,
    link,
    undo,
  }
})
