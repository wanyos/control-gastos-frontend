import { describe, it, expect } from 'vitest'

import { API_HTTP, API_NETWORK, ApiError, ValidationError } from '@/shared/errors'

import {
  BIZUM_LABEL,
  BIZUM_SENTENCE,
  DOUBTFUL_LOAD_ERROR,
  LINKED_NOTICE,
  NO_DOUBTFUL_SENTENCE,
  NO_PAIRS_SENTENCE,
  PAIRS_LOAD_ERROR,
  RELINKED_NOTICE,
  SAME_ACCOUNT_SENTENCE,
  UNLINK_MEMORY,
  UNLINK_TITLE,
  groupKey,
  linkProblem,
  mentionsBizum,
  transferWriteError,
  unlinkConsequence,
  unlinkedNotice,
} from '../pairs'
import { parseAmbiguousGroups, parseTransferPairs } from '../service'
import type { Gesture, TransferPair } from '../types'
import {
  BACKEND_MESSAGES,
  FINE_100,
  FINE_50,
  GOOD_1,
  GOOD_PAIRS,
  GROUP_OF_4,
  ambiguous,
  marked,
} from './fixtures'

const pairOf = (raw: Record<string, unknown>): TransferPair => {
  const [pair] = parseTransferPairs({ pairs: [raw] })
  if (!pair) throw new Error('fixture did not parse')
  return pair
}

const withDescriptions = (expense: string, income: string): TransferPair => {
  const pair = pairOf(GOOD_1)
  return {
    ...pair,
    expense: { ...pair.expense, description: expense },
    income: { ...pair.income, description: income },
  }
}

describe('mentionsBizum (R4)', () => {
  it('is true for the two real fines', () => {
    expect(mentionsBizum(pairOf(FINE_100))).toBe(true)
    expect(mentionsBizum(pairOf(FINE_50))).toBe(true)
  })

  it('is false for the three real good pairs', () => {
    expect(GOOD_PAIRS.map((raw) => mentionsBizum(pairOf(raw)))).toEqual([false, false, false])
  })

  it('ignores case and looks at either leg', () => {
    expect(mentionsBizum(withDescriptions('bizum a alguien', 'INGRESO'))).toBe(true)
    expect(mentionsBizum(withDescriptions('TRANSF', 'Pago BiZuM recibido'))).toBe(true)
    expect(mentionsBizum(withDescriptions('ENVIO BIZUM', 'TRANSF'))).toBe(true)
  })

  it('needs the whole word: BIZ without UM is not a Bizum', () => {
    expect(mentionsBizum(withDescriptions('PAGO BIZ SERVICIOS', 'BIZCOCHOS UM'))).toBe(false)
  })
})

describe('linkProblem (R10, R11)', () => {
  const [group] = parseAmbiguousGroups(ambiguous(GROUP_OF_4))
  if (!group) throw new Error('fixture did not parse')

  it('is incomplete with nothing, with one column, or with an id that is not in the group', () => {
    expect(linkProblem(group, undefined)).toBe('incomplete')
    expect(linkProblem(group, { outId: null, inId: null })).toBe('incomplete')
    expect(linkProblem(group, { outId: 901, inId: null })).toBe('incomplete')
    expect(linkProblem(group, { outId: null, inId: 903 })).toBe('incomplete')
    expect(linkProblem(group, { outId: 999, inId: 903 })).toBe('incomplete')
    // Two of the same column can never count as a pair.
    expect(linkProblem(group, { outId: 901, inId: 902 })).toBe('incomplete')
  })

  it('says same account when both legs live in one account', () => {
    expect(linkProblem(group, { outId: 901, inId: 904 })).toBe('same-account')
  })

  it('is null for one of each column from different accounts', () => {
    expect(linkProblem(group, { outId: 901, inId: 903 })).toBeNull()
    expect(linkProblem(group, { outId: 902, inId: 904 })).toBeNull()
  })
})

describe('unlinkConsequence (R5)', () => {
  it('says both count again when neither leg is marked', () => {
    expect(unlinkConsequence(pairOf(FINE_100))).toBe(
      'Both movements will count in your totals again.',
    )
  })

  it('says which leg stays out when one is marked as not counted', () => {
    expect(unlinkConsequence(pairOf(marked(FINE_100, true, false)))).toBe(
      'The money in leg will count in your totals again. The money out leg stays out because you marked it as not counted.',
    )
    expect(unlinkConsequence(pairOf(marked(FINE_100, false, true)))).toBe(
      'The money out leg will count in your totals again. The money in leg stays out because you marked it as not counted.',
    )
  })

  it('says neither counts when both are marked', () => {
    expect(unlinkConsequence(pairOf(marked(FINE_100, true, true)))).toBe(
      'Neither will count in your totals: you marked both as not counted.',
    )
  })
})

describe('unlinkedNotice (R6)', () => {
  it('says both count again when neither leg is marked', () => {
    expect(unlinkedNotice(pairOf(FINE_100))).toBe(
      'Pair unlinked. Its two movements count in your totals again.',
    )
  })

  it('says one stays out when one leg is marked, whichever it is', () => {
    const one =
      'Pair unlinked. One movement counts in your totals again; the other stays out because you marked it as not counted.'

    expect(unlinkedNotice(pairOf(marked(FINE_100, true, false)))).toBe(one)
    expect(unlinkedNotice(pairOf(marked(FINE_100, false, true)))).toBe(one)
  })

  it('says neither counts when both are marked', () => {
    expect(unlinkedNotice(pairOf(marked(FINE_100, true, true)))).toBe(
      'Pair unlinked. Neither counts in your totals: you marked both as not counted.',
    )
  })
})

describe('groupKey', () => {
  it('joins the ids sorted, whatever order they came in', () => {
    expect(groupKey([841, 812, 840])).toBe('812-840-841')
    expect(groupKey([9, 10])).toBe('9-10')
  })
})

describe('transferWriteError (R13)', () => {
  const http = (status: number, message: string) =>
    new ApiError(`HTTP ${status}: ${message}`, API_HTTP, { status })
  const [notFound, conflict, rejected, broken] = BACKEND_MESSAGES as [
    string,
    string,
    string,
    string,
  ]

  it('400: nothing changed', () => {
    expect(transferWriteError(http(400, rejected), 'link')).toBe(
      'Nothing changed. The server rejected that pair.',
    )
  })

  it('404 reads differently when unlinking and when linking', () => {
    expect(transferWriteError(http(404, notFound), 'unlink')).toBe(
      'That pair was already unlinked. Reloading.',
    )
    expect(transferWriteError(http(404, notFound), 'undo-link')).toBe(
      'That pair was already unlinked. Reloading.',
    )
    expect(transferWriteError(http(404, notFound), 'link')).toBe(
      'One of those movements no longer exists. Nothing changed. Reloading.',
    )
    expect(transferWriteError(http(404, notFound), 'relink')).toBe(
      'One of those movements no longer exists. Nothing changed. Reloading.',
    )
  })

  it('409 when linking: one of them is already in a pair', () => {
    expect(transferWriteError(http(409, conflict), 'link')).toBe(
      'One of those movements is already in a pair. Nothing changed. Reloading.',
    )
    expect(transferWriteError(http(409, conflict), 'relink')).toBe(
      'One of those movements is already in a pair. Nothing changed. Reloading.',
    )
  })

  it('network: the server was not reached', () => {
    const down = new ApiError('Network request failed: /api/transfers', API_NETWORK)

    expect(transferWriteError(down, 'unlink')).toBe("Couldn't reach the server. Nothing changed.")
  })

  it('an unreadable answer and a 500 promise a reload, not that nothing happened', () => {
    const generic = 'Something went wrong. Reloading to show what really happened.'

    expect(transferWriteError(new ValidationError('POST /api/transfers: x'), 'link')).toBe(generic)
    expect(transferWriteError(http(500, broken), 'unlink')).toBe(generic)
  })

  it('never carries a word of the backend message', () => {
    const gestures: Gesture[] = ['unlink', 'link', 'relink', 'undo-link']
    for (const gesture of gestures) {
      for (const status of [400, 404, 409, 500]) {
        for (const message of BACKEND_MESSAGES) {
          expect(transferWriteError(http(status, message), gesture)).not.toContain(message)
        }
      }
    }
  })
})

describe('the fixed sentences (R4, R5, R6, R7, R9, R11, R12, R14)', () => {
  it('are these, letter by letter', () => {
    expect(BIZUM_LABEL).toBe('Bizum')
    expect(BIZUM_SENTENCE).toBe(
      'A Bizum usually comes from another person, not from one of your accounts.',
    )
    expect(UNLINK_TITLE).toBe('Unlink this pair?')
    expect(UNLINK_MEMORY).toBe("The next import won't pair these two again.")
    expect(RELINKED_NOTICE).toBe('Pair linked again.')
    expect(LINKED_NOTICE).toBe(
      'Linked as a transfer. These two movements no longer count in your totals.',
    )
    expect(SAME_ACCOUNT_SENTENCE).toBe(
      'Both movements are in the same account. Pick one from another account.',
    )
    expect(NO_DOUBTFUL_SENTENCE).toBe(
      "No doubtful transfers. When an import finds money that looks like a transfer between your accounts but can't tell which movements go together, the group shows up here.",
    )
    expect(NO_PAIRS_SENTENCE).toBe('No linked transfers yet.')
    expect(PAIRS_LOAD_ERROR).toBe("Couldn't load the linked pairs.")
    expect(DOUBTFUL_LOAD_ERROR).toBe("Couldn't load the doubtful transfers.")
  })
})
