<template>
  <div class="flex flex-col gap-6">
    <p v-if="store.isLoading" class="text-sm text-ink-muted" data-test="net-worth-loading">
      Loading your net worth…
    </p>

    <BaseCard
      v-else-if="store.error"
      title="Couldn't load your net worth"
      data-test="net-worth-error"
    >
      <p class="text-sm text-ink-body">{{ store.error.message }}</p>
    </BaseCard>

    <template v-else-if="netWorth">
      <section data-test="net-worth-block-a">
        <StatCard label="Net worth" :value="formatMoney(netWorth.total)">
          <p class="text-sm text-ink-muted" data-test="summary-sentence">{{ sentence }}</p>
        </StatCard>
      </section>

      <DataWarnings :issues="netWorth.investments.issues" />

      <section class="grid grid-cols-1 gap-6 md:grid-cols-2" data-test="net-worth-block-b">
        <BaseCard title="By type" data-test="nature-breakdown">
          <BreakdownList
            :groups="natureGroups"
            :fills="NATURE_FILLS"
            :total="netWorth.total"
            :mismatch-sum="mismatchOf(natureGroups)"
            idle-group-id="checking"
            row-test="nature-row"
          />
        </BaseCard>
        <BaseCard title="By bank" data-test="bank-breakdown">
          <BreakdownList
            :groups="bankGroups"
            :fills="bankFills"
            :total="netWorth.total"
            :mismatch-sum="mismatchOf(bankGroups)"
            row-test="bank-row"
          />
        </BaseCard>
      </section>

      <section class="flex flex-col gap-4" data-test="net-worth-block-e">
        <h2 class="font-display text-lg font-bold text-ink-strong">Details</h2>
        <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          <BankCard
            v-for="bank in banks"
            :key="bank"
            :label="bankLabel(bank)"
            :amount="bankAmounts.get(bank) ?? null"
            :as-of="netWorth.asOf"
            :accounts="netWorth.accounts.accounts.filter((account) => account.bank === bank)"
            :products="netWorth.investments.products.filter((product) => product.bank === bank)"
            :tile-class="bankFills[bank] ?? BANK_FILLS[0]"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'

import BaseCard from '@/shared/components/BaseCard.vue'
import StatCard from '@/shared/components/StatCard.vue'
import { formatMoney, toCents } from '@/shared/money'

import { bankLabel, groupByBank, groupByNature, sumOfGroups } from '../breakdown'
import type { BreakdownGroup, NatureGroupId } from '../breakdown'
import BankCard from '../components/BankCard.vue'
import BreakdownList from '../components/BreakdownList.vue'
import DataWarnings from '../components/DataWarnings.vue'
import { buildSummarySentence } from '../sentence'
import { useNetWorthStore } from '../store'
import type { DecimalString } from '../types'

// Full literal class names: Tailwind scans source as text (docs/stack.md).
const NATURE_FILLS: Record<NatureGroupId, string> = {
  checking: 'bg-chart-1',
  savings: 'bg-chart-2',
  market: 'bg-chart-3',
  deposits: 'bg-chart-4',
}
const BANK_FILLS = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
  'bg-chart-6',
  'bg-chart-7',
  'bg-chart-8',
] as const

const store = useNetWorthStore()

onMounted(() => {
  void store.load()
})

const netWorth = computed(() => store.netWorth)

const natureGroups = computed(() => (netWorth.value ? groupByNature(netWorth.value) : []))
const bankGroups = computed(() => (netWorth.value ? groupByBank(netWorth.value) : []))

const sentence = computed(() =>
  netWorth.value ? buildSummarySentence(netWorth.value, natureGroups.value) : '',
)

/** Bank slugs with a card: breakdown order first, then banks that only hold gaps. */
const banks = computed(() => {
  if (!netWorth.value) return []
  const ordered = bankGroups.value.map((group) => group.id)
  const rest = new Set<string>()
  for (const product of netWorth.value.investments.products) {
    if (!ordered.includes(product.bank)) rest.add(product.bank)
  }
  return [...ordered, ...[...rest].sort((a, b) => bankLabel(a).localeCompare(bankLabel(b)))]
})

const bankFills = computed<Record<string, string>>(() =>
  Object.fromEntries(
    banks.value.map((bank, index) => [bank, BANK_FILLS[index % BANK_FILLS.length] ?? '']),
  ),
)

const bankAmounts = computed(
  () => new Map(bankGroups.value.map((group) => [group.id, group.amount])),
)

/** The groups' exact sum when it does not match the API total; never corrects either. */
function mismatchOf(groups: BreakdownGroup[]): DecimalString | null {
  if (!netWorth.value) return null
  const sum = sumOfGroups(groups)
  return toCents(sum) === toCents(netWorth.value.total) ? null : sum
}
</script>
