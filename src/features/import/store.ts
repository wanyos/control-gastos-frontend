import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { useNetWorthStore } from '@/features/net-worth/store'
import type { HttpClient } from '@/services/http'
import { ValidationError, toAppError } from '@/shared/errors'

import { getPendingFiles, isDriveError, runImport } from './service'
import type { FailureKind, ImportFlow, PendingFiles } from './types'

/**
 * The Drive import: the pending files the topbar announces and the dialog's state
 * machine (specs/13-import-dialog/design.md §5). Actions never throw: failures live
 * in `flow`, and a failed pending query leaves `pending` at null.
 */
export const useImportStore = defineStore('import', () => {
  /** Null when unknown or when the last query failed. */
  const pending = ref<PendingFiles | null>(null)
  const flow = ref<ImportFlow>({ step: 'closed' })
  const isImporting = computed(() => flow.value.step === 'importing')

  // Only the latest check may move `flow`: one that answers after Cancel or a
  // reopen is stale. `pending` is still updated, it is true whoever asked.
  let checkRun = 0

  const failureKind = (error: unknown): FailureKind => (isDriveError(error) ? 'drive' : 'server')

  async function refreshPending(client?: HttpClient): Promise<void> {
    try {
      pending.value = await getPendingFiles(client)
    } catch {
      pending.value = null
    }
  }

  async function check(client?: HttpClient): Promise<void> {
    const run = ++checkRun
    flow.value = { step: 'checking' }
    try {
      const result = await getPendingFiles(client)
      pending.value = result
      if (run !== checkRun || flow.value.step !== 'checking') return
      flow.value =
        result.totalPending > 0 ? { step: 'confirm', pending: result } : { step: 'upToDate' }
    } catch (rejection) {
      pending.value = null
      if (run !== checkRun || flow.value.step !== 'checking') return
      flow.value = {
        step: 'checkFailed',
        kind: failureKind(rejection),
        error: toAppError(rejection),
      }
    }
  }

  async function open(client?: HttpClient): Promise<void> {
    if (flow.value.step !== 'closed') return
    await check(client)
  }

  async function start(client?: HttpClient): Promise<void> {
    const current = flow.value
    if (current.step !== 'confirm') return
    // Set synchronously, before the first await: a second call sees `importing` and leaves.
    flow.value = { step: 'importing', fileCount: current.pending.totalPending }
    try {
      flow.value = { step: 'finished', report: await runImport(client) }
    } catch (rejection) {
      const error = toAppError(rejection)
      flow.value =
        error instanceof ValidationError
          ? { step: 'reportUnreadable', error }
          : { step: 'importFailed', kind: failureKind(rejection), error }
    } finally {
      void refreshPending(client)
      const netWorthStore = useNetWorthStore()
      if (netWorthStore.netWorth !== null) {
        void netWorthStore.load(client)
      }
    }
  }

  function close(): void {
    if (flow.value.step === 'importing') return
    checkRun++
    flow.value = { step: 'closed' }
  }

  async function retry(client?: HttpClient): Promise<void> {
    const step = flow.value.step
    if (step !== 'checkFailed' && step !== 'importFailed') return
    await check(client)
  }

  return { pending, flow, isImporting, refreshPending, open, start, close, retry }
})
