// Frontend-owned types for GET /api/net-worth (feature 7).
// Written from ../gastos-backend/docs/api-contract.md, the single source of
// truth. Nothing is shared with the backend: when the contract changes, these
// types change here and TypeScript points at every broken call site.

/** A monetary amount exactly as the API sends it: decimal string, two decimals. */
export type DecimalString = string

/** A date-only value, `YYYY-MM-DD`: no time, no timezone. */
export type DateOnly = string

export type AccountType = 'checking' | 'savings'

/** An account as it appears inside the net worth response (a subset of `Account`). */
export interface NetWorthAccount {
  id: number
  iban: string
  bank: string
  alias: string
  type: AccountType
  balance: DecimalString
}

export interface NetWorthAccounts {
  total: DecimalString
  accounts: NetWorthAccount[]
}

/** Product types that fluctuate: valued from their latest `Valuation`. */
export type MarketProductType = 'fund' | 'etf' | 'managed_portfolio'

export type InvestmentProductType = MarketProductType | 'deposit' | 'savings_account'

interface InvestmentProductBase {
  id: number
  bank: string
  name: string
}

export interface MarketProduct extends InvestmentProductBase {
  type: MarketProductType
  /** `marketValue` + `uninvestedCash`, or `null` when there is no valuation yet. */
  value: DecimalString | null
  marketValue: DecimalString | null
  /** `null` means "not reported", never zero. */
  uninvestedCash: DecimalString | null
  /** Date of the valuation used, `null` when none was found. */
  valuedAt: DateOnly | null
  stale: boolean
}

export interface DepositProduct extends InvestmentProductBase {
  type: 'deposit'
  /** Equals `principal`: a deposit is worth its principal while it lives. */
  value: DecimalString
  principal: DecimalString
  /** Informative only: the gain is realized at maturity, so it is never summed. */
  expectedGain: DecimalString
  maturityDate: DateOnly
  matured: boolean
}

export interface SavingsAccountProduct extends InvestmentProductBase {
  type: 'savings_account'
  /** Balance of the latest snapshot, or `null` when there is none. */
  value: DecimalString | null
  valuedAt: DateOnly | null
  stale: boolean
}

/** Discriminated by `type`, so a `null` is never ambiguous. */
export type InvestmentProduct = MarketProduct | DepositProduct | SavingsAccountProduct

/** Closed enum: why a piece of the net worth is incomplete, old or double counted. */
export type NetWorthIssueReason = 'no_valuation' | 'stale_valuation' | 'matured_not_closed'

export interface NetWorthIssue {
  productId: number
  name: string
  reason: NetWorthIssueReason
  /** `null` for `no_valuation`; the date of the photo (or the maturity date) otherwise. */
  valuedAt: DateOnly | null
}

export interface NetWorthInvestments {
  total: DecimalString
  products: InvestmentProduct[]
  issues: NetWorthIssue[]
}

export interface NetWorth {
  asOf: DateOnly
  total: DecimalString
  accounts: NetWorthAccounts
  investments: NetWorthInvestments
}
