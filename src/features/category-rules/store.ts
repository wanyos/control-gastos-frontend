import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { getCategories } from '@/shared/categories'
import type { Category, CategoryKind } from '@/shared/categories'
import { ApiError, toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'
import { getMovements } from '@/shared/movements'

import {
  applyErrorMessage,
  canPreview,
  deleteErrorMessage,
  isMatchTextTooShort,
  needsRulesReload,
  normalizeMatchText,
  previewErrorMessage,
  previewQuery,
  ruleErrorMessage,
  wroteNothing,
} from './rules'
import { applyRules, createRule, deleteRule, getRules, getSuggestions, updateRule } from './service'
import type {
  ApplyFlow,
  CategoryRule,
  LastApply,
  MatchPreview,
  NewRule,
  RuleChanges,
  SavedRule,
  SuggestedRule,
} from './types'

/**
 * The categorization rules: the list, the dialogs' state, the on-demand pass and,
 * since feature 33, the suggested rules. Actions never throw: a failure lives in a
 * message the view paints (the net-worth pattern). Nothing here touches the review
 * queue or the month of Movements — they watch `applyRun` instead, so the dependency
 * stays one way (design.md §1).
 */
export const useCategoryRulesStore = defineStore('category-rules', () => {
  /** Null when never loaded or when the last load failed. */
  const rules = ref<CategoryRule[] | null>(null)
  const isLoading = ref(false)
  const loadError = ref<AppError | null>(null)

  const categories = ref<Category[] | null>(null)
  const categoriesFailed = ref(false)

  /** One save at a time: a second click must not start a second request (R5). */
  const isSaving = ref(false)
  /** The English sentence of a failed save, shown inside the dialog (R6). */
  const saveMessage = ref<string | null>(null)
  /** The English sentence of a failed (or already gone) delete (R9). */
  const deleteMessage = ref<string | null>(null)
  /** The rule the last successful create made, and what it moved: the line in view. */
  const lastCreated = ref<SavedRule | null>(null)

  /** What the match preview of the open dialog is showing (feature 18). */
  const preview = ref<MatchPreview>({ step: 'idle' })

  const applyFlow = ref<ApplyFlow>({ step: 'closed' })
  /**
   * Goes up when an apply ends, whatever the outcome, and since feature 33 when a
   * create or a change may have moved movements: Review and Movements watch it.
   */
  const applyRun = ref(0)
  /**
   * What the last pass that finished without an error did, and when (feature 30).
   * Memory of the page only: nothing writes it to the browser storage or to the URL,
   * so after a reload nothing is shown as «just categorized».
   */
  const lastApply = ref<LastApply | null>(null)

  // ─── The suggested rules (feature 33) ───────────────────────────────────
  /** Null when never loaded or when the last load failed. */
  const suggestions = ref<SuggestedRule[] | null>(null)
  const suggestionsLoading = ref(false)
  const suggestionsError = ref<AppError | null>(null)
  /** The failed create of one suggestion, painted in its own row (R10). */
  const suggestionFailure = ref<{ matchText: string; message: string } | null>(null)

  let categoriesRequested = false
  let suggestionsRequested = false
  /** Goes up with every load, so an answer that is no longer the last one is dropped. */
  let suggestionsToken = 0

  async function load(client?: HttpClient): Promise<void> {
    isLoading.value = true
    loadError.value = null
    try {
      rules.value = await getRules(client)
    } catch (rejection) {
      rules.value = null
      loadError.value = toAppError(rejection)
    } finally {
      isLoading.value = false
    }
  }

  /** Asked once per session; a failure leaves the screen alive with no choices to offer. */
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

  /** After a failure that could have written something, the list is asked for again (R6). */
  async function reportSaveFailure(rejection: unknown, client?: HttpClient): Promise<void> {
    const failure = toAppError(rejection)
    saveMessage.value = ruleErrorMessage(failure)
    if (needsRulesReload(failure)) await load(client)
  }

  function replace(saved: CategoryRule): void {
    const list = rules.value
    if (!list) return
    const at = list.findIndex((one) => one.id === saved.id)
    if (at === -1) list.push(saved)
    else list[at] = saved
  }

  /** What was saved is the result of the box, on Rules and on Review (R5). */
  function keepResult(saved: SavedRule, cause: 'create' | 'update'): void {
    lastApply.value = { at: new Date(), result: saved.result, cause, rule: saved.rule }
  }

  /**
   * The POST itself. Its pass may move movements, so Review and Movements are told
   * whenever that may have happened: a saved rule, or a failure that is not one of
   * those where the contract guarantees nothing was written (R14).
   */
  async function postRule(rule: NewRule, client?: HttpClient): Promise<AppError | null> {
    saveMessage.value = null
    deleteMessage.value = null
    lastCreated.value = null
    try {
      const saved = await createRule(
        { matchText: rule.matchText, categoryId: rule.categoryId },
        client,
      )
      replace(saved.rule)
      lastCreated.value = saved
      keepResult(saved, 'create')
      applyRun.value += 1
      return null
    } catch (rejection) {
      const failure = toAppError(rejection)
      if (!wroteNothing(failure)) applyRun.value += 1
      return failure
    }
  }

  /**
   * Creates a rule. Since feature 33 the backend also runs the pass with it: what it
   * moved is kept for the box and for the line in view. A pass that broke halfway
   * still saved the rule, so the dialog may close. Returns true when it may close.
   */
  async function create(rule: NewRule, client?: HttpClient): Promise<boolean> {
    if (isSaving.value) return false
    if (isMatchTextTooShort(rule.matchText)) return false
    isSaving.value = true
    try {
      const failure = await postRule(rule, client)
      if (failure === null) return true
      await reportSaveFailure(failure, client)
      return false
    } finally {
      isSaving.value = false
    }
  }

  /** What actually changed, comparing the typed text already normalized (R8). */
  function changesOf(current: CategoryRule, next: NewRule): RuleChanges {
    const changes: RuleChanges = {}
    const matchText = normalizeMatchText(next.matchText)
    if (matchText !== current.matchText) changes.matchText = next.matchText
    if (next.categoryId !== current.categoryId) changes.categoryId = next.categoryId
    return changes
  }

  /** Changes a rule. Nothing changed means no request at all, and no movement is touched. */
  async function update(id: number, next: NewRule, client?: HttpClient): Promise<boolean> {
    if (isSaving.value) return false
    if (isMatchTextTooShort(next.matchText)) return false
    const current = (rules.value ?? []).find((one) => one.id === id)
    const changes = current ? changesOf(current, next) : { ...next }
    if (Object.keys(changes).length === 0) return true
    isSaving.value = true
    saveMessage.value = null
    deleteMessage.value = null
    lastCreated.value = null
    try {
      const saved = await updateRule(id, changes, client)
      replace(saved.rule)
      keepResult(saved, 'update')
      applyRun.value += 1
      await refreshSuggestions(client)
      return true
    } catch (rejection) {
      const failure = toAppError(rejection)
      await reportSaveFailure(failure, client)
      if (!wroteNothing(failure)) {
        applyRun.value += 1
        await refreshSuggestions(client)
      }
      return false
    } finally {
      isSaving.value = false
    }
  }

  const forget = (id: number): void => {
    if (rules.value) rules.value = rules.value.filter((one) => one.id !== id)
  }

  /** Deletes a rule. Movements it already categorized keep their category (R9). */
  async function remove(id: number, client?: HttpClient): Promise<void> {
    if (isSaving.value) return
    isSaving.value = true
    deleteMessage.value = null
    saveMessage.value = null
    lastCreated.value = null
    try {
      await deleteRule(id, client)
      forget(id)
      await refreshSuggestions(client)
    } catch (rejection) {
      const failure = toAppError(rejection)
      deleteMessage.value = deleteErrorMessage(failure)
      // A 404 means it was already gone: the row must leave the list anyway.
      if (failure instanceof ApiError && failure.status === 404) forget(id)
      else if (needsRulesReload(failure)) await load(client)
      if (!wroteNothing(failure)) await refreshSuggestions(client)
    } finally {
      isSaving.value = false
    }
  }

  function dismissCreated(): void {
    lastCreated.value = null
  }

  // ─── The match preview (feature 18: R1, R2, R8, R10) ──────────────────────
  // Read only: the single call it makes is a GET of the movements list.

  /**
   * Goes up with every preview asked for and with every clear, so an answer that is
   * no longer the last one can be recognised and dropped (R8). The keystrokes arrive
   * faster than the network, so «the last one wins» has to be explicit.
   */
  let previewToken = 0

  /** Forgets the count: the next dialog must not inherit the one of the previous. */
  function clearPreview(): void {
    previewToken += 1
    preview.value = { step: 'idle' }
  }

  /**
   * How many pending movements without a category contain this text, and five of
   * them. Never throws and never blocks anything: a failed count still lets the rule
   * be saved (R10). Below the floor or above the ceiling of the contract nothing
   * travels (R2).
   */
  async function previewMatches(
    text: string,
    kind: CategoryKind,
    client?: HttpClient,
  ): Promise<void> {
    if (!canPreview(text)) {
      clearPreview()
      return
    }
    previewToken += 1
    const token = previewToken
    preview.value = { step: 'loading', text }
    try {
      const page = await getMovements(previewQuery(text, kind), client)
      if (token !== previewToken) return
      preview.value = { step: 'ready', text, total: page.pagination.total, samples: page.movements }
    } catch (rejection) {
      if (token !== previewToken) return
      preview.value = { step: 'failed', text, message: previewErrorMessage(toAppError(rejection)) }
    }
  }

  // ─── Applying the rules (R10, R11, R13) ───────────────────────────────────

  function openApply(): void {
    if (applyFlow.value.step === 'applying') return
    applyFlow.value = { step: 'confirm' }
  }

  /** Takes the result of the last pass off Rules and off Review (feature 30). */
  function dismissLastApply(): void {
    lastApply.value = null
  }

  /** While the pass runs the dialog cannot be dismissed: it is a mass write (R11). */
  function closeApply(): void {
    if (applyFlow.value.step === 'applying') return
    applyFlow.value = { step: 'closed' }
  }

  /** One pass at a time: a second click while one is in flight does nothing (R11). */
  async function confirmApply(client?: HttpClient): Promise<void> {
    if (applyFlow.value.step === 'applying') return
    applyFlow.value = { step: 'applying' }
    lastCreated.value = null
    // The result on screen is about the pass before this one: it goes first (feature 30).
    lastApply.value = null
    let failure: AppError | null = null
    try {
      const result = await applyRules(client)
      if (result.error) {
        applyFlow.value = { step: 'failed', message: applyErrorMessage(result.error) }
      } else {
        lastApply.value = { at: new Date(), result, cause: 'apply', rule: null }
        applyFlow.value = { step: 'done', result }
      }
    } catch (rejection) {
      failure = toAppError(rejection)
      applyFlow.value = { step: 'failed', message: applyErrorMessage(failure) }
    } finally {
      // Whatever happened, the queue may have changed: Review reloads on this (R14).
      applyRun.value += 1
    }
    if (failure === null || !wroteNothing(failure)) await refreshSuggestions(client)
  }

  // ─── The suggested rules (feature 33) ─────────────────────────────────────

  /** Read only. A failure leaves no list, and the view offers Try again (R12). */
  async function loadSuggestions(client?: HttpClient): Promise<void> {
    suggestionsRequested = true
    suggestionsToken += 1
    const token = suggestionsToken
    suggestionsLoading.value = true
    suggestionsError.value = null
    try {
      const list = await getSuggestions(client)
      if (token !== suggestionsToken) return
      suggestions.value = list
    } catch (rejection) {
      if (token !== suggestionsToken) return
      suggestions.value = null
      suggestionsError.value = toAppError(rejection)
    } finally {
      if (token === suggestionsToken) suggestionsLoading.value = false
    }
  }

  /** Changing, deleting or applying may change what is suggested: asked again if shown (R15). */
  async function refreshSuggestions(client?: HttpClient): Promise<void> {
    if (suggestionsRequested) await loadSuggestions(client)
  }

  /**
   * Creates the rule of a suggestion with the category chosen in its row: its text as
   * it came, untouched (R4). On success the suggestion leaves the list at once and the
   * list is asked for again (R7). A rejection, or a request that never arrived, leaves
   * everything as it was and asks for nothing else (R10).
   */
  async function createFromSuggestion(
    suggestion: SuggestedRule,
    categoryId: number,
    client?: HttpClient,
  ): Promise<boolean> {
    if (isSaving.value) return false
    isSaving.value = true
    suggestionFailure.value = null
    try {
      const failure = await postRule({ matchText: suggestion.matchText, categoryId }, client)
      if (failure === null) {
        const list = suggestions.value
        if (list) suggestions.value = list.filter((one) => one.matchText !== suggestion.matchText)
        await loadSuggestions(client)
        return true
      }
      suggestionFailure.value = {
        matchText: suggestion.matchText,
        message: ruleErrorMessage(failure),
      }
      if (!wroteNothing(failure)) {
        await load(client)
        await loadSuggestions(client)
      }
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    rules,
    isLoading,
    loadError,
    categories,
    categoriesFailed,
    isSaving,
    saveMessage,
    deleteMessage,
    lastCreated,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    suggestionFailure,
    applyFlow,
    applyRun,
    lastApply,
    preview,
    load,
    loadCategories,
    create,
    update,
    remove,
    dismissCreated,
    openApply,
    confirmApply,
    closeApply,
    dismissLastApply,
    previewMatches,
    clearPreview,
    loadSuggestions,
    createFromSuggestion,
  }
})
