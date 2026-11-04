// Frontend-owned types for GET /api/investments/gains (feature 40). Written from
// ../gastos-backend/docs/api-contract.md, the single source of truth. Nothing is shared
// with the backend.

import type { DateOnly, DecimalString } from '@/shared/movements'

export type { DateOnly, DecimalString }

/** Closed enum: no account ever comes in this read (R11). */
export type InvestmentType = 'fund' | 'etf' | 'managed_portfolio' | 'deposit'

/** Why a figure is `null`; closed list of the contract. */
export type GainsReason =
  | 'no_photo'
  | 'gain_not_reported'
  | 'gain_percent_not_reported'
  | 'maturity_not_found'
  | 'ambiguous'
  | 'below_principal'
  | 'missing_conditions'

/** A percent as the backend sends it ("4.07", "0.9", "-1.20"): never padded nor rounded here. */
export type PercentText = string

export interface DepositConditions {
  principal: DecimalString | null
  interestRate: PercentText | null
  expectedGain: DecimalString | null
  maturityDate: DateOnly | null
}

export interface GainsProduct {
  id: number
  bank: string
  name: string
  type: InvestmentType
  openedAt: DateOnly | null
  closedAt: DateOnly | null
  invested: DecimalString | null
  currentValue: DecimalString | null
  gain: DecimalString | null
  gainPercent: PercentText | null
  valuedAt: DateOnly | null
  reason: GainsReason | null
  /** Only on fund, etf and managed_portfolio (`null` allowed); absent on a deposit. Not shown. */
  uninvestedCash?: DecimalString | null
  /** Only on a deposit. */
  conditions?: DepositConditions
}

export interface ClosedGainsProduct extends GainsProduct {
  closedOn: DateOnly
}

export interface ExcludedFromTotal {
  productId: number
  name: string
  reason: GainsReason
}

export interface GainsTotal {
  gain: DecimalString
  invested: DecimalString
  gainPercent: PercentText | null
  excluded: ExcludedFromTotal[]
}

export interface InvestmentGains {
  asOf: DateOnly
  total: GainsTotal
  live: GainsProduct[]
  closed: ClosedGainsProduct[]
}
