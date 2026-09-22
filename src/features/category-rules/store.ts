import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { HttpClient } from '@/services/http'
import { getCategories } from '@/shared/categories'
import type { Category } from '@/shared/categories'
import { ApiError, toAppError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import {
  applyErrorMessage,
  deleteErrorMessage,
  isMatchTextTooShort,
  needsRulesReload,
  normalizeMatchText,
  ruleErrorMessage,
} from './rules'
import { applyRules, createRule, deleteRule, getRules, updateRule } from './service'
import type { ApplyFlow, CategoryRule, NewRule, RuleChanges } from './types'

/**
 * The categorization rules: the list, the dialogs' state and the on-demand pass.
 * Actions never throw: a failure lives in a message the view paints (the net-worth
 * pattern). Nothing here touches the review queue — Review watches `applyRun`
 * instead, so the dependency stays one way (design.md §1).
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
  /** The rule the last successful create made: the notice over the queue (R5). */
  const lastCreated = ref<CategoryRule | null>(null)

  const applyFlow = ref<ApplyFlow>({ step: 'closed' })
  /** Goes up when an apply ends, whatever the outcome: Review watches it (R14). */
  const applyRun = ref(0)

  let categoriesRequested = false

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

  /**
   * Creates a rule and nothing else: it does not apply the rules and it does not
   * categorize the movement it was born from (R5, decisions.md 🔴 3 and 🔴 5).
   * Returns true when the dialog may close.
   */
  async function create(rule: NewRule, client?: HttpClient): Promise<boolean> {
    if (isSaving.value) return false
    if (isMatchTextTooShort(rule.matchText)) return false
    isSaving.value = true
    saveMessage.value = null
    deleteMessage.value = null
    lastCreated.value = null
    try {
      const created = await createRule(
        { matchText: rule.matchText, categoryId: rule.categoryId },
        client,
      )
      replace(created)
      lastCreated.value = created
      return true
    } catch (rejection) {
      await reportSaveFailure(rejection, client)
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
      replace(await updateRule(id, changes, client))
      return true
    } catch (rejection) {
      await reportSaveFailure(rejection, client)
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
    } catch (rejection) {
      const failure = toAppError(rejection)
      deleteMessage.value = deleteErrorMessage(failure)
      // A 404 means it was already gone: the row must leave the list anyway.
      if (failure instanceof ApiError && failure.status === 404) forget(id)
      else if (needsRulesReload(failure)) await load(client)
    } finally {
      isSaving.value = false
    }
  }

  function dismissCreated(): void {
    lastCreated.value = null
  }

  // ─── Applying the rules (R10, R11, R13) ───────────────────────────────────

  function openApply(): void {
    if (applyFlow.value.step === 'applying') return
    applyFlow.value = { step: 'confirm' }
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
    try {
      const result = await applyRules(client)
      applyFlow.value = result.error
        ? { step: 'failed', message: applyErrorMessage(result.error) }
        : { step: 'done', result }
    } catch (rejection) {
      applyFlow.value = { step: 'failed', message: applyErrorMessage(toAppError(rejection)) }
    } finally {
      // Whatever happened, the queue may have changed: Review reloads on this (R14).
      applyRun.value += 1
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
    applyFlow,
    applyRun,
    load,
    loadCategories,
    create,
    update,
    remove,
    dismissCreated,
    openApply,
    confirmApply,
    closeApply,
  }
})
