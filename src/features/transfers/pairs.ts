// Everything pure of the transfers screen (feature 24): the one signal, the check
// before linking, and every sentence the screen says. The sentences are written here,
// in English, and the backend's own `message` never reaches any of them.

import { API_NETWORK, ApiError } from '@/shared/errors'
import type { AppError } from '@/shared/errors'

import type { AmbiguousGroup, Gesture, LinkChoice, TransferPair } from './types'

export const BIZUM_LABEL = 'Bizum'
export const BIZUM_SENTENCE =
  'A Bizum usually comes from another person, not from one of your accounts.'

export const UNLINK_TITLE = 'Unlink this pair?'
export const UNLINK_MEMORY = "The next import won't pair these two again."

export const RELINKED_NOTICE = 'Pair linked again.'
export const LINKED_NOTICE =
  'Linked as a transfer. These two movements no longer count in your totals.'
export const LINK_UNDONE_NOTICE = 'Link undone.'

export const SAME_ACCOUNT_SENTENCE =
  'Both movements are in the same account. Pick one from another account.'

export const NO_DOUBTFUL_SENTENCE =
  "No doubtful transfers. When an import finds money that looks like a transfer between your accounts but can't tell which movements go together, the group shows up here."
export const NO_PAIRS_SENTENCE = 'No linked transfers yet.'

export const PAIRS_LOAD_ERROR = "Couldn't load the linked pairs."
export const DOUBTFUL_LOAD_ERROR = "Couldn't load the doubtful transfers."

const BIZUM = /bizum/i

/**
 * States a fact, not a verdict: one of the two legs is a Bizum. Nothing else is
 * looked at — no route, no dates, no amount, no list of names (design §6).
 */
export function mentionsBizum(pair: TransferPair): boolean {
  return BIZUM.test(pair.expense.description) || BIZUM.test(pair.income.description)
}

/** The key of a group that has no id of its own: its movement ids, sorted. */
export function groupKey(ids: readonly number[]): string {
  return [...ids].sort((a, b) => a - b).join('-')
}

export type LinkProblem = 'incomplete' | 'same-account'

/**
 * Why this choice cannot be linked, or null when it can. Type and amount are not
 * checked: one column per type and one amount per group already guarantee them.
 */
export function linkProblem(
  group: AmbiguousGroup,
  choice: LinkChoice | undefined,
): LinkProblem | null {
  const out = group.out.find((one) => one.id === choice?.outId)
  const into = group.in.find((one) => one.id === choice?.inId)
  if (!out || !into) return 'incomplete'
  if (out.accountId === into.accountId) return 'same-account'
  return null
}

/**
 * What the notice says once a pair is unlinked. It reads the same marks as the dialog
 * (`unlinkConsequence`), so the two can never contradict each other (R6).
 */
export function unlinkedNotice(pair: TransferPair): string {
  const marked = [pair.expense, pair.income].filter((leg) => leg.excludedFromTotals).length
  if (marked === 2) {
    return 'Pair unlinked. Neither counts in your totals: you marked both as not counted.'
  }
  if (marked === 1) {
    return 'Pair unlinked. One movement counts in your totals again; the other stays out because you marked it as not counted.'
  }
  return 'Pair unlinked. Its two movements count in your totals again.'
}

/** What unlinking does to the totals: a leg marked as not counted stays out (contract). */
export function unlinkConsequence(pair: TransferPair): string {
  const outMarked = pair.expense.excludedFromTotals
  const inMarked = pair.income.excludedFromTotals
  if (outMarked && inMarked) {
    return 'Neither will count in your totals: you marked both as not counted.'
  }
  if (outMarked) {
    return 'The money in leg will count in your totals again. The money out leg stays out because you marked it as not counted.'
  }
  if (inMarked) {
    return 'The money out leg will count in your totals again. The money in leg stays out because you marked it as not counted.'
  }
  return 'Both movements will count in your totals again.'
}

/** The English sentence of a failed write; `gesture` only tells a DELETE from a POST. */
export function transferWriteError(error: AppError, gesture: Gesture): string {
  if (error instanceof ApiError) {
    if (error.code === API_NETWORK) return "Couldn't reach the server. Nothing changed."
    const deleting = gesture === 'unlink' || gesture === 'undo-link'
    if (error.status === 400) return 'Nothing changed. The server rejected that pair.'
    if (error.status === 404) {
      return deleting
        ? 'That pair was already unlinked. Reloading.'
        : 'One of those movements no longer exists. Nothing changed. Reloading.'
    }
    if (error.status === 409 && !deleting) {
      return 'One of those movements is already in a pair. Nothing changed. Reloading.'
    }
  }
  return 'Something went wrong. Reloading to show what really happened.'
}
