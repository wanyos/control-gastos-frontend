<template>
  <BaseCard :title="label" data-test="bank-card">
    <template v-if="amount !== null" #subtitle>
      <span class="font-mono tabular-nums" data-test="money">{{ formatMoney(amount) }}</span>
    </template>
    <div class="flex flex-col gap-2.5">
      <AccountCard
        v-for="row in rows"
        :key="row.key"
        :name="row.name"
        :type-label="row.typeLabel"
        :amount="row.amount"
        :last4="row.last4"
        :detail="row.detail"
        :initial="initial"
        :tile-class="tileClass"
      />
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
// Block E card of one bank: its accounts first, then its products by type and name.
import { computed } from 'vue'

import BaseCard from '@/shared/components/BaseCard.vue'
import { formatDate, formatMoney } from '@/shared/money'

import { holdingTypeLabel } from '../issues'
import type {
  DateOnly,
  DecimalString,
  InvestmentProduct,
  InvestmentProductType,
  NetWorthAccount,
} from '../types'
import AccountCard from './AccountCard.vue'

const props = defineProps<{
  label: string
  /** Same figure as the bank row of the breakdown; `null` if it has no row. */
  amount: DecimalString | null
  asOf: DateOnly
  accounts: NetWorthAccount[]
  products: InvestmentProduct[]
  tileClass: string
}>()

interface Row {
  key: string
  name: string
  typeLabel: string
  amount: DecimalString | null
  last4?: string
  detail?: string
}

// Order of design.md §7.
const PRODUCT_ORDER: readonly InvestmentProductType[] = [
  'fund',
  'etf',
  'managed_portfolio',
  'savings_account',
  'deposit',
]

const initial = computed(() => props.label.slice(0, 1).toUpperCase())

function productDetail(product: InvestmentProduct): string | undefined {
  if (product.type === 'deposit') {
    const verb = product.matured ? 'Matured' : 'Matures'
    return `${verb} ${formatDate(product.maturityDate)}`
  }
  return product.valuedAt === null ? undefined : `Valued ${formatDate(product.valuedAt)}`
}

const rows = computed<Row[]>(() => {
  const accountRows = props.accounts.map((account): Row => ({
    key: `account-${account.id}`,
    name: account.alias,
    typeLabel: holdingTypeLabel(account.type),
    amount: account.balance,
    last4: account.iban.slice(-4),
    detail: `As of ${formatDate(props.asOf)}`,
  }))
  const productRows = [...props.products]
    .sort(
      (a, b) =>
        PRODUCT_ORDER.indexOf(a.type) - PRODUCT_ORDER.indexOf(b.type) ||
        a.name.localeCompare(b.name),
    )
    .map((product): Row => ({
      key: `product-${product.id}`,
      name: product.name,
      typeLabel: holdingTypeLabel(product.type),
      amount: product.value,
      detail: productDetail(product),
    }))
  return [...accountRows, ...productRows]
})
</script>
