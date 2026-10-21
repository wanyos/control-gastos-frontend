// Frontend types of the table of own accounts and the forms of the holder's name
// (feature 36). The service maps `/api/own-accounts` to these; `createdAt` and
// `updatedAt` are not read: the screen does not show them.

import type { DateOnly } from '@/features/net-worth/types'

export type { DateOnly } from '@/features/net-worth/types'

export type OwnAccountType = 'checking' | 'savings' | 'investment' | 'deposit' | 'crypto' | 'other'

/** One row of `GET /api/own-accounts`. */
export interface OwnAccount {
  id: number
  name: string
  bank: string
  accountNumber: string | null
  type: OwnAccountType
  openedAt: DateOnly | null
  closedAt: DateOnly | null
  /** As they were written, in the order they were saved. */
  texts: string[]
}

/** What the account window holds while typing: every field as the input gives it. */
export interface OwnAccountDraft {
  name: string
  bank: string
  /** '' = none. */
  accountNumber: string
  type: OwnAccountType | ''
  /** '' = none, else YYYY-MM-DD from <input type="date">. */
  openedAt: string
  closedAt: string
  /** May hold blank fields; `cleanList` drops them. */
  texts: string[]
}

/** The body of `POST /api/own-accounts`. */
export interface NewOwnAccount {
  name: string
  bank: string
  type: OwnAccountType
  accountNumber?: string
  openedAt?: string
  closedAt?: string
  texts?: string[]
}

/** The body of `PATCH /api/own-accounts/:id`: only what changed travels. */
export type OwnAccountChanges = Partial<{
  name: string
  bank: string
  type: OwnAccountType
  accountNumber: string | null
  openedAt: string | null
  closedAt: string | null
  texts: string[]
}>

export type LoadState = 'idle' | 'loading' | 'loaded' | 'failed'
