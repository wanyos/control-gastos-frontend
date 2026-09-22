import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { API_NETWORK, ApiError, ValidationError, toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import {
  UNDO_PARTIAL,
  actionErrorMessage,
  actionSummary,
  eligibleForCategory,
  findCategory,
  needsReload,
  undoPlan,
} from './actions'
import { EMPTY_FILTERS, PAGE_SIZE, QUEUE_STATUS, hasActiveFilters, toQuery } from './filters'
import { getCategories, getMovements, updateMovement, updateMovements } from './service'
import type {
  Category,
  LastAction,
  Movement,
  MovementChanges,
  MovementPage,
  ReviewFilters,
} from './types'

export { PAGE_SIZE }

export const OUT_OF_RANGE_NOTICE = 'That page no longer exists. Showing the first page.'

export interface ReviewErrorText {
  message: string
  /** `clear` offers Clear filters, `retry` offers Try again (design.md §7). */
  action: 'clear' | 'retry'
}

/**
 * The English sentence for a failed load. The backend's own `message` is never
 * painted: it comes in Spanish and names database ids.
 */
export function reviewErrorMessage(error: AppError, page: number): ReviewErrorText {
  if (error instanceof ApiError && error.status === 404) {
    return { message: 'That account or category no longer exists.', action: 'clear' }
  }
  if (error instanceof ApiError && error.status === 400) {
    return page > 1
      ? { message: OUT_OF_RANGE_NOTICE, action: 'retry' }
      : { message: 'The backend rejected these filters.', action: 'clear' }
  }
  if (error instanceof ValidationError) {
    return { message: "The server answered, but the list couldn't be read.", action: 'retry' }
  }
  if (error.code === API_NETWORK) {
    return { message: "Couldn't reach the server.", action: 'retry' }
  }
  return { message: 'Something went wrong loading the list.', action: 'retry' }
}

/** A 400 on a page past the last one with matches: the contract's out-of-range answer. */
const isRejectedRequest = (error: AppError): boolean =>
  error instanceof ApiError && error.status === 400

/**
 * The review queue: filters, page, the loaded page of data, the category tree and
 * the sidebar's pending count. Actions never throw: a failure lives in `error` and
 * the view paints it (docs/architecture.md, net-worth's pattern).
 */
export const useReviewStore = defineStore('review', () => {
  const filters = ref<ReviewFilters>({ ...EMPTY_FILTERS })
  const page = ref(1)
  /** Null when never loaded or when the last load failed. */
  const result = ref<MovementPage | null>(null)
  const isLoading = ref(false)
  const error = ref<AppError | null>(null)
  /** A sentence about something the store did on its own, e.g. going back to page 1. */
  const notice = ref<string | null>(null)
  const categories = ref<Category[] | null>(null)
  const categoriesFailed = ref(false)
  /** Null when unknown or when the count query failed: the sidebar then shows nothing. */
  const pendingCount = ref<number | null>(null)

  // --- Feature 16: selection and actions ---
  /** An array, not a Set: the order is kept and it is plain to read in a test. */
  const selectedIds = ref<number[]>([])
  /** One action at a time: a second click must not start a second request (R11). */
  const isActing = ref(false)
  const actionError = ref<AppError | null>(null)
  /** The English sentence for a failed action, never the backend's own message. */
  const actionMessage = ref<string | null>(null)
  /** What the last successful action did, and how to put it back (R13). */
  const lastAction = ref<LastAction | null>(null)

  // Only the latest request may write the state: with search-as-you-type the
  // answers can arrive out of order (same guard as import's checkRun).
  let loadRun = 0
  let categoriesRequested = false

  function adoptPage(loaded: MovementPage): void {
    result.value = loaded
    // The bare queue is the pending count: no extra request for the sidebar (R2).
    if (!hasActiveFilters(filters.value)) {
      pendingCount.value = loaded.pagination.total
    }
  }

  async function fetchPage(client?: HttpClient): Promise<void> {
    const run = ++loadRun
    isLoading.value = true
    error.value = null
    try {
      const loaded = await getMovements(toQuery(filters.value, page.value), client)
      if (run !== loadRun) return
      adoptPage(loaded)
    } catch (rejection) {
      if (run !== loadRun) return
      result.value = null
      error.value = toAppError(rejection)
    } finally {
      if (run === loadRun) isLoading.value = false
    }
  }

  /**
   * Loads the current filters and page. A rejected request on a page past the end
   * (the filter narrowed the queue) is retried once on page 1, never twice.
   */
  async function load(client?: HttpClient): Promise<void> {
    notice.value = null
    // A new list is a new context: what was ticked, and the last action, are gone (R3).
    clearSelection()
    await fetchPage(client)

    const failure = error.value
    if (failure && page.value > 1 && isRejectedRequest(failure)) {
      page.value = 1
      await fetchPage(client)
      if (error.value === null) notice.value = OUT_OF_RANGE_NOTICE
    }
  }

  /** A filter change always goes back to page 1: page 3 of the old filter may not exist. */
  async function apply(next: ReviewFilters, client?: HttpClient): Promise<void> {
    filters.value = { ...next }
    page.value = 1
    await load(client)
  }

  async function goToPage(next: number, client?: HttpClient): Promise<void> {
    page.value = Math.max(1, Math.trunc(next))
    await load(client)
  }

  /** Asked once per session; a failure disables the selector and leaves the screen alive (R7). */
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

  /**
   * The sidebar number: `pagination.total` of the smallest possible query. There is
   * no count endpoint, and a failure leaves it unknown instead of shouting (R1).
   */
  async function refreshPendingCount(client?: HttpClient): Promise<void> {
    try {
      const counted = await getMovements({ status: QUEUE_STATUS, page: 1, pageSize: 1 }, client)
      pendingCount.value = counted.pagination.total
    } catch {
      pendingCount.value = null
    }
  }

  // ─── Selection (R1, R2, R3) ───────────────────────────────────────────────

  function toggleSelection(id: number): void {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter((selected) => selected !== id)
      : [...selectedIds.value, id]
  }

  /** Exactly the loaded page: at most PAGE_SIZE ids, half the contract's cap (R2). */
  function selectPage(selected: boolean): void {
    selectedIds.value = selected
      ? (result.value?.movements ?? []).map((movement) => movement.id)
      : []
  }

  function clearSelection(): void {
    selectedIds.value = []
    lastAction.value = null
    actionError.value = null
    actionMessage.value = null
  }

  /** The movements of the loaded page that are ticked, in the order the API sent them. */
  const selection = computed<Movement[]>(() =>
    (result.value?.movements ?? []).filter((movement) => selectedIds.value.includes(movement.id)),
  )

  // ─── Actions (R4 … R14) ───────────────────────────────────────────────────

  /**
   * Asks for the current page again after a change, without the spinner and without
   * blanking what is on screen: `pagination` and `totals` are the backend's, never a
   * sum made here (R10). Returns the failure, or null when it worked or when a newer
   * request took over.
   */
  async function refreshQuietly(client?: HttpClient): Promise<AppError | null> {
    const run = ++loadRun
    try {
      const loaded = await getMovements(toQuery(filters.value, page.value), client)
      if (run === loadRun) adoptPage(loaded)
      return null
    } catch (rejection) {
      return run === loadRun ? toAppError(rejection) : null
    }
  }

  /** Emptying the last page makes it vanish: fall back to page 1, as `load` does. */
  async function refreshAfterAction(client?: HttpClient): Promise<void> {
    const failure = await refreshQuietly(client)
    if (failure && page.value > 1 && isRejectedRequest(failure)) {
      page.value = 1
      if ((await refreshQuietly(client)) === null) notice.value = OUT_OF_RANGE_NOTICE
    }
  }

  /**
   * Puts the movements the API gave back into the list: still pending, they are
   * replaced (or come back, after an undo); no longer pending, they leave the queue
   * and the sidebar count follows them (R10).
   */
  function applyUpdated(movements: Movement[]): void {
    const loaded = result.value
    if (!loaded) return
    const step = (delta: number): void => {
      if (pendingCount.value !== null) pendingCount.value = Math.max(0, pendingCount.value + delta)
    }
    for (const movement of movements) {
      const at = loaded.movements.findIndex((row) => row.id === movement.id)
      if (movement.status === QUEUE_STATUS) {
        if (at === -1) {
          loaded.movements.push(movement)
          step(1)
        } else {
          loaded.movements[at] = movement
        }
      } else if (at !== -1) {
        loaded.movements.splice(at, 1)
        step(-1)
      }
    }
    // A row that is no longer on the list cannot stay ticked.
    const visible = new Set(loaded.movements.map((row) => row.id))
    selectedIds.value = selectedIds.value.filter((id) => visible.has(id))
  }

  /** One lane for every action: a second click while one is in flight does nothing (R11). */
  async function runAction(work: () => Promise<void>): Promise<void> {
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

  /** A failed action never claims more than it knows: only a sure all-or-nothing keeps the list (R12). */
  async function reportFailure(rejection: unknown, client?: HttpClient): Promise<void> {
    const failure = toAppError(rejection)
    actionError.value = failure
    actionMessage.value = actionErrorMessage(failure)
    if (needsReload(failure)) await refreshAfterAction(client)
  }

  const nameOf = (categoryId: number | null): string | undefined =>
    findCategory(categories.value, categoryId)?.name

  /** Runs a change over `movements` and records how to undo it. One request, always. */
  async function write(
    movements: Movement[],
    changes: MovementChanges,
    send: () => Promise<Movement[]>,
    client?: HttpClient,
  ): Promise<void> {
    const undo = undoPlan(movements, changes)
    try {
      const updated = await send()
      applyUpdated(updated)
      lastAction.value = {
        summary: actionSummary(updated.length, changes, nameOf(changes.categoryId ?? null)),
        undo,
      }
      await refreshAfterAction(client)
    } catch (rejection) {
      await reportFailure(rejection, client)
    }
  }

  const rowOf = (id: number): Movement | undefined =>
    result.value?.movements.find((movement) => movement.id === id)

  /** The category of one row: chosen in the select, saved on its own (R4). */
  async function categorizeOne(
    id: number,
    categoryId: number | null,
    client?: HttpClient,
  ): Promise<void> {
    const row = rowOf(id)
    if (!row) return
    await runAction(() =>
      write(
        [row],
        { categoryId },
        async () => [await updateMovement(id, { categoryId }, client)],
        client,
      ),
    )
  }

  async function confirmOne(id: number, client?: HttpClient): Promise<void> {
    const row = rowOf(id)
    if (!row) return
    await runAction(() =>
      write(
        [row],
        { status: 'confirmed' },
        async () => [await updateMovement(id, { status: 'confirmed' }, client)],
        client,
      ),
    )
  }

  async function confirmSelected(client?: HttpClient): Promise<void> {
    const rows = selection.value
    if (rows.length === 0) return
    await runAction(() =>
      write(
        rows,
        { status: 'confirmed' },
        async () =>
          (await updateMovements({ ids: rows.map((row) => row.id), status: 'confirmed' }, client))
            .movements,
        client,
      ),
    )
  }

  /**
   * The category goes only to the selected movements that accept it: the contract is
   * all or nothing, so one neutral would tumble the whole request (R7).
   */
  async function categorizeSelected(categoryId: number | null, client?: HttpClient): Promise<void> {
    const kind =
      categoryId === null ? null : (findCategory(categories.value, categoryId)?.kind ?? null)
    if (categoryId !== null && kind === null) return
    const rows = eligibleForCategory(selection.value, kind)
    if (rows.length === 0) return
    await runAction(() =>
      write(
        rows,
        { categoryId },
        async () =>
          (await updateMovements({ ids: rows.map((row) => row.id), categoryId }, client)).movements,
        client,
      ),
    )
  }

  /**
   * Puts the last action back, one request per group of movements that shared the
   * same previous value. A failure stops there and reloads: between groups the state
   * may already be half undone, and the screen must not lie about it (R14).
   */
  async function undoLast(client?: HttpClient): Promise<void> {
    const action = lastAction.value
    if (!action) return
    await runAction(async () => {
      for (const group of action.undo) {
        try {
          const done = await updateMovements({ ids: group.ids, ...group.changes }, client)
          applyUpdated(done.movements)
        } catch (rejection) {
          actionError.value = toAppError(rejection)
          actionMessage.value = UNDO_PARTIAL
          await refreshAfterAction(client)
          return
        }
      }
      // Nothing is redone: the undone action stops being the last one.
      lastAction.value = null
      await refreshAfterAction(client)
    })
  }

  return {
    filters,
    page,
    result,
    isLoading,
    error,
    notice,
    categories,
    categoriesFailed,
    pendingCount,
    selectedIds,
    selection,
    isActing,
    actionError,
    actionMessage,
    lastAction,
    toggleSelection,
    selectPage,
    clearSelection,
    categorizeOne,
    confirmOne,
    confirmSelected,
    categorizeSelected,
    undoLast,
    load,
    apply,
    goToPage,
    loadCategories,
    refreshPendingCount,
  }
})
