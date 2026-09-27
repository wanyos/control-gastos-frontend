import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { getAccounts } from '@/shared/accounts'
import { getCategories } from '@/shared/categories'
import { toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { getMovements, needsReload } from '@/shared/movements'

import {
  UNDONE_SUMMARY,
  actionSummary,
  findCategoryName,
  hasCategoryFilter,
  matchesCategoryFilter,
  writeErrorMessage,
} from './actions'
import { EMPTY_FILTERS, monthQuery } from './filters'
import type { StatementFilters } from './filters'
import { currentMonth, groupByDay, shiftMonth } from './months'
import type { MonthKey } from './months'
import { setMovementCategory } from './service'
import type { AccountSummary, Category, DayGroup, Movement, MovementPage } from './types'

/** What the last successful write did, and how to put it back (R11, R12). */
export interface StatementAction {
  /** English sentence already built: `Categorized as Groceries`. */
  summary: string
  movementId: number
  previousCategoryId: number | null
}

/**
 * The statement: the month on screen and what the API answered for it. Since feature 21
 * it also writes, but only ONE thing: the category of one movement, through
 * `setMovementCategory`, the single place where that body is built (R1, C1). No action
 * throws: a failure lives in `error` / `actionMessage` and the view paints it
 * (net-worth's pattern).
 */
export const useStatementStore = defineStore('statement', () => {
  const month = ref<MonthKey>(currentMonth())
  /** The four filters that narrow the month on screen (feature 20, R1). */
  const filters = ref<StatementFilters>({ ...EMPTY_FILTERS })
  /** Null while never loaded, or when the last load of a month failed. */
  const result = ref<MovementPage | null>(null)
  /** The movements of pages 2..n the user brought with `Load more`, in order (R13). */
  const extra = ref<Movement[]>([])
  /** The last page of this month already on screen. */
  const page = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref<AppError | null>(null)
  /** Every account there is, asked once per session; null while unknown (R14). */
  const accounts = ref<AccountSummary[] | null>(null)
  const accountsFailed = ref(false)
  /** The whole category tree, asked once per session; null while unknown (R14). */
  const categories = ref<Category[] | null>(null)
  const categoriesFailed = ref(false)

  // --- Feature 21: correcting a category from the statement ---
  /** The row whose category editor is open, or null: only one at a time (C2). */
  const editingId = ref<number | null>(null)
  /** One write at a time: a second click while one is in flight does nothing (C2). */
  const isActing = ref(false)
  const actionError = ref<AppError | null>(null)
  /** The English sentence of a failed write, never the backend's own message (R14). */
  const actionMessage = ref<string | null>(null)
  const lastAction = ref<StatementAction | null>(null)
  /**
   * The sentence of the last successful write, shown over the list (R11). It outlives
   * `lastAction` by one step: after an undo the sentence says `Change undone` and there
   * is nothing left to put back, so the button goes and the line stays.
   */
  const actionNotice = ref<string | null>(null)

  // Only the latest request may write the state: the arrows are clicked faster than
  // the network answers, and September must never show July's figures (R15).
  let loadRun = 0
  let accountsRequested = false
  let categoriesRequested = false

  /** The whole month on screen, grouped by day in the order the API sent it (R8). */
  const days = computed<DayGroup[]>(() =>
    groupByDay([...(result.value?.movements ?? []), ...extra.value]),
  )

  /** Rows on screen right now: the first page plus whatever `Load more` added. */
  const shown = computed(() => (result.value?.movements.length ?? 0) + extra.value.length)

  /** True while this month still has pages nobody asked for. */
  const hasMore = computed(() => {
    const pagination = result.value?.pagination
    return pagination ? page.value < pagination.totalPages : false
  })

  /**
   * Loads a month with the filters it is looked at through, from scratch. Whatever
   * `Load more` had brought goes with it: that list belonged to the previous filter (R3).
   */
  async function show(
    next: MonthKey,
    nextFilters: StatementFilters = filters.value,
    client?: HttpClient,
  ): Promise<void> {
    const run = ++loadRun
    month.value = next
    filters.value = nextFilters
    isLoading.value = true
    error.value = null
    extra.value = []
    page.value = 0
    // A new month or a new filter is a new context: the open editor and the Undo of
    // the last write go with it (R13).
    forgetAction()
    try {
      const loaded = await getMovements(monthQuery(next, nextFilters), client)
      if (run !== loadRun) return
      result.value = loaded
      page.value = loaded.pagination.page
    } catch (rejection) {
      if (run !== loadRun) return
      result.value = null
      error.value = toAppError(rejection)
    } finally {
      if (run === loadRun) isLoading.value = false
    }
  }

  /** The two arrows: one month back or forward, keeping the filters put (R12). */
  function shift(delta: number, client?: HttpClient): Promise<void> {
    return show(shiftMonth(month.value, delta), filters.value, client)
  }

  /** A filter changed: same month, first page again (R3). */
  function applyFilters(next: StatementFilters, client?: HttpClient): Promise<void> {
    return show(month.value, next, client)
  }

  /**
   * Brings the next page of the SAME month and appends it. `pagination.total` and
   * `totals` stay the first page's: they belong to the month, not to the page (R13).
   */
  async function loadMore(client?: HttpClient): Promise<void> {
    if (isLoading.value || isLoadingMore.value || !hasMore.value) return
    const run = loadRun
    const next = page.value + 1
    isLoadingMore.value = true
    error.value = null
    try {
      const loaded = await getMovements(monthQuery(month.value, filters.value, next), client)
      if (run !== loadRun) return
      extra.value = [...extra.value, ...loaded.movements]
      page.value = next
    } catch (rejection) {
      if (run !== loadRun) return
      error.value = toAppError(rejection)
    } finally {
      if (run === loadRun) isLoadingMore.value = false
    }
  }

  // ─── Correcting a category (feature 21: R1 … R15) ─────────────────────────

  /** The open editor and the last action, forgotten: nothing here survives a reload. */
  function forgetAction(): void {
    editingId.value = null
    lastAction.value = null
    actionNotice.value = null
    actionError.value = null
    actionMessage.value = null
  }

  /** One row at a time in edit mode: opening one closes the previous (C2). */
  function openEditor(id: number): void {
    editingId.value = id
  }

  function closeEditor(): void {
    editingId.value = null
  }

  /** The row as it is on screen, wherever `Load more` left it. */
  const rowOf = (id: number): Movement | undefined =>
    result.value?.movements.find((movement) => movement.id === id) ??
    extra.value.find((movement) => movement.id === id)

  /**
   * Puts the movement the API gave back in the place of the old row (R7), and takes it
   * out when it no longer belongs under the active category filter (R8). `totals` and
   * `pagination` are NEVER touched here: they are the backend's (R10).
   */
  function adoptUpdated(updated: Movement): void {
    const gone = hasCategoryFilter(filters.value) && !matchesCategoryFilter(updated, filters.value)
    const rows = result.value?.movements
    const at = rows?.findIndex((row) => row.id === updated.id) ?? -1
    if (rows && at !== -1) {
      if (gone) rows.splice(at, 1)
      else rows[at] = updated
      return
    }
    const also = extra.value.findIndex((row) => row.id === updated.id)
    if (also === -1) return
    if (gone) extra.value = extra.value.filter((row) => row.id !== updated.id)
    else extra.value = extra.value.map((row) => (row.id === updated.id ? updated : row))
  }

  /**
   * Asks for the month again after a write, without the spinner and without blanking
   * what is on screen: `totals` and `pagination.total` are the backend's, never a sum
   * made here (R9, R10). Only the first page is asked for; whatever `Load more` had
   * brought and page 1 now carries is dropped, so no row shows up twice.
   */
  async function refreshQuietly(client?: HttpClient): Promise<void> {
    const run = ++loadRun
    try {
      const loaded = await getMovements(monthQuery(month.value, filters.value, 1), client)
      if (run !== loadRun) return
      result.value = loaded
      page.value = loaded.pagination.page
      const onPageOne = new Set(loaded.movements.map((row) => row.id))
      extra.value = extra.value.filter((row) => !onPageOne.has(row.id))
    } catch {
      // The write did go through; the figures will be right at the next movement.
    }
  }

  /** One lane for every write: a second click while one is in flight does nothing (C2). */
  async function runWrite(work: () => Promise<void>): Promise<void> {
    if (isActing.value) return
    isActing.value = true
    actionError.value = null
    actionMessage.value = null
    try {
      await work()
    } finally {
      isActing.value = false
    }
  }

  /**
   * The only write of this screen: the category of one row, saved as it is chosen (R1).
   * It works the same on a confirmed movement as on a pending one — the body carries
   * the category and nothing else, so no status can change (R6).
   */
  async function write(
    id: number,
    categoryId: number | null,
    summary: (updated: Movement) => string,
    client?: HttpClient,
  ): Promise<void> {
    const row = rowOf(id)
    if (!row) return
    const previousCategoryId = row.categoryId
    await runWrite(async () => {
      try {
        const updated = await setMovementCategory(id, categoryId, client)
        adoptUpdated(updated)
        editingId.value = null
        actionNotice.value = summary(updated)
        lastAction.value = {
          summary: actionNotice.value,
          movementId: id,
          previousCategoryId,
        }
        if (hasCategoryFilter(filters.value)) await refreshQuietly(client)
      } catch (rejection) {
        const failure = toAppError(rejection)
        // The screen could be lying: reload the month instead of claiming nothing
        // happened (R15). The reload goes FIRST because it forgets the last action
        // (R13) — including any sentence — and then the failure is painted.
        if (needsReload(failure)) await show(month.value, filters.value, client)
        actionError.value = failure
        actionMessage.value = writeErrorMessage(failure)
      }
    })
  }

  function categorize(id: number, categoryId: number | null, client?: HttpClient): Promise<void> {
    return write(
      id,
      categoryId,
      // The name comes from the movement the API gave back, which embeds its category;
      // the tree is only the fallback when the answer carries none.
      (updated) =>
        actionSummary(
          categoryId,
          updated.category?.name ?? findCategoryName(categories.value, categoryId),
        ),
      client,
    )
  }

  /** Puts the last write back with one request, and stops being the last one (R12). */
  async function undoLast(client?: HttpClient): Promise<void> {
    const action = lastAction.value
    if (!action) return
    await write(action.movementId, action.previousCategoryId, () => UNDONE_SUMMARY, client)
    // Nothing is redone: a successful undo leaves no action behind, only its sentence.
    if (actionError.value === null && lastAction.value?.summary === UNDONE_SUMMARY) {
      lastAction.value = null
    }
  }

  /**
   * The lists that fill the two selects, one request each per session. A failure only
   * switches its own select off: the rest of the screen keeps working (R15).
   */
  async function loadAccounts(client?: HttpClient): Promise<void> {
    if (accountsRequested) return
    accountsRequested = true
    try {
      accounts.value = await getAccounts(client)
    } catch {
      accounts.value = null
      accountsFailed.value = true
    }
  }

  async function loadCategories(client?: HttpClient): Promise<void> {
    if (categoriesRequested) return
    categoriesRequested = true
    try {
      categories.value = await getCategories(client)
    } catch {
      categories.value = null
      categoriesFailed.value = true
    }
  }

  return {
    month,
    filters,
    result,
    extra,
    page,
    isLoading,
    isLoadingMore,
    error,
    accounts,
    accountsFailed,
    categories,
    categoriesFailed,
    editingId,
    isActing,
    actionError,
    actionMessage,
    lastAction,
    actionNotice,
    days,
    shown,
    hasMore,
    show,
    shift,
    applyFilters,
    loadMore,
    loadAccounts,
    loadCategories,
    openEditor,
    closeEditor,
    categorize,
    undoLast,
  }
})
