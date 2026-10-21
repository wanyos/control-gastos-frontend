import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { ApiError, toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import {
  createOwnAccount,
  getHolderNames,
  getOwnAccounts,
  putHolderNames,
  updateOwnAccount,
} from './service'
import {
  changesOf,
  cleanList,
  draftProblems,
  hasProblems,
  listProblems,
  namesSaveErrorMessage,
  newAccountBody,
  saveErrorMessage,
} from './texts'
import type { LoadState, OwnAccount, OwnAccountDraft } from './types'

export type AccountDialog = { mode: 'create' } | { mode: 'edit'; account: OwnAccount }

const statusOf = (error: AppError): number | undefined =>
  error instanceof ApiError ? error.status : undefined

/**
 * The table of own accounts and the forms of the holder's name (feature 36). Asked
 * again on every visit, and the table read again after every save, so it shows the
 * backend's order and texts as the backend kept them. Imports no other store, and no
 * other feature imports this one.
 */
export const useOwnAccountsStore = defineStore('own-accounts', () => {
  const accounts = ref<OwnAccount[] | null>(null)
  const loadState = ref<LoadState>('idle')
  const loadError = ref<AppError | null>(null)

  const names = ref<string[] | null>(null)
  const namesState = ref<LoadState>('idle')
  const namesError = ref<AppError | null>(null)

  const dialog = ref<AccountDialog | null>(null)
  const namesDialogOpen = ref(false)
  const isSaving = ref(false)
  /** The sentence of a failed save of a row, shown in the account window (R11). */
  const saveMessage = ref<string | null>(null)
  /** The sentence of a failed save of the forms of the name, shown in its window (R14). */
  const namesSaveMessage = ref<string | null>(null)

  // Only the latest read may keep its answer: a retry can overtake a slow first read.
  let tableRun = 0
  let namesRun = 0

  /** Reads the table. Never throws: a failure stays in `loadError` (R4). */
  async function load(client?: HttpClient): Promise<void> {
    const current = ++tableRun
    loadState.value = 'loading'
    loadError.value = null
    try {
      const read = await getOwnAccounts(client)
      if (current !== tableRun) return
      accounts.value = read
      loadState.value = 'loaded'
    } catch (rejection) {
      if (current !== tableRun) return
      accounts.value = null
      loadError.value = toAppError(rejection)
      loadState.value = 'failed'
    }
  }

  /** Reads the forms of the name, on their own: a failure here leaves the table alone (R12). */
  async function loadNames(client?: HttpClient): Promise<void> {
    const current = ++namesRun
    namesState.value = 'loading'
    namesError.value = null
    try {
      const read = await getHolderNames(client)
      if (current !== namesRun) return
      names.value = read
      namesState.value = 'loaded'
    } catch (rejection) {
      if (current !== namesRun) return
      names.value = null
      namesError.value = toAppError(rejection)
      namesState.value = 'failed'
    }
  }

  function openCreate(): void {
    saveMessage.value = null
    dialog.value = { mode: 'create' }
  }

  function openEdit(account: OwnAccount): void {
    saveMessage.value = null
    dialog.value = { mode: 'edit', account }
  }

  function closeDialog(): void {
    saveMessage.value = null
    dialog.value = null
  }

  /** Sends the POST or the PATCH of the open window. True when it is done (R5-R7, R9, R11). */
  async function saveAccount(draft: OwnAccountDraft, client?: HttpClient): Promise<boolean> {
    const open = dialog.value
    if (open === null || isSaving.value) return false
    if (hasProblems(draftProblems(draft))) return false
    const changes = open.mode === 'edit' ? changesOf(open.account, draft) : null
    if (changes !== null && Object.keys(changes).length === 0) {
      closeDialog()
      return true
    }
    isSaving.value = true
    saveMessage.value = null
    try {
      if (open.mode === 'edit' && changes !== null) {
        await updateOwnAccount(open.account.id, changes, client)
      } else {
        await createOwnAccount(newAccountBody(draft), client)
      }
      closeDialog()
      await load(client)
      return true
    } catch (rejection) {
      const error = toAppError(rejection)
      // Only a 400 guarantees nothing was written and the table is as it was; after a 404
      // the row is gone, and anything else may have written.
      if (statusOf(error) !== 400) await load(client)
      // The sentence is chosen after the second read: it only says the table shows what
      // the server has if that read worked.
      saveMessage.value = saveErrorMessage(error, loadState.value !== 'failed')
      return false
    } finally {
      isSaving.value = false
    }
  }

  function openNames(): void {
    namesSaveMessage.value = null
    namesDialogOpen.value = true
  }

  function closeNames(): void {
    namesSaveMessage.value = null
    namesDialogOpen.value = false
  }

  /** Sends the whole list; the block shows only what came back (R13, R14). */
  async function saveNames(list: string[], client?: HttpClient): Promise<boolean> {
    if (isSaving.value) return false
    if (listProblems(list).some((problem) => problem !== null)) return false
    isSaving.value = true
    namesSaveMessage.value = null
    try {
      const saved = await putHolderNames(cleanList(list), client)
      names.value = saved
      namesState.value = 'loaded'
      namesError.value = null
      closeNames()
      return true
    } catch (rejection) {
      const error = toAppError(rejection)
      // With a 400 the contract keeps the previous list; anything else may have written.
      if (statusOf(error) !== 400) await loadNames(client)
      // Chosen after the second read, as in `saveAccount`.
      namesSaveMessage.value = namesSaveErrorMessage(error, namesState.value !== 'failed')
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    accounts,
    loadState,
    loadError,
    names,
    namesState,
    namesError,
    dialog,
    namesDialogOpen,
    isSaving,
    saveMessage,
    namesSaveMessage,
    load,
    loadNames,
    openCreate,
    openEdit,
    closeDialog,
    saveAccount,
    openNames,
    closeNames,
    saveNames,
  }
})
