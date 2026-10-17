<template>
  <div class="flex flex-col gap-5" data-test="monthly-cost-view">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">{{ TITLE }}</h1>
      <p class="text-sm text-ink-muted">{{ SUBTITLE }}</p>
    </header>

    <p
      v-if="store.loadState === 'loading'"
      class="text-sm text-ink-muted"
      data-test="monthly-cost-loading"
    >
      {{ LOADING_LINE }}
    </p>

    <BaseCard v-if="failure">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="monthly-cost-error">{{ failure }}</p>
        <BaseButton
          variant="secondary"
          size="sm"
          data-test="monthly-cost-retry"
          @click="store.load()"
        >
          {{ RETRY }}
        </BaseButton>
      </div>
    </BaseCard>

    <template v-if="data">
      <StatCard
        :label="TOTAL_LABEL"
        :value="formatMoney(data.monthlyTotal)"
        data-test="monthly-cost-total"
      >
        <div class="flex flex-col gap-1">
          <p class="text-sm text-ink-muted" data-test="monthly-cost-period">
            {{ periodLine(data.period) }}
          </p>
          <p
            v-if="data.bills.length > 0"
            class="text-sm text-ink-body"
            data-test="monthly-cost-increased"
          >
            {{ increasedLine(increasedCount, data.bills.length) }}
          </p>
        </div>
      </StatCard>

      <p v-if="isEmpty(data)" class="text-sm text-ink-muted" data-test="monthly-cost-empty">
        {{ EMPTY_LINE }}
      </p>

      <template v-else-if="subtotals">
        <BaseCard data-test="bills-block">
          <div class="flex flex-col gap-3">
            <BlockHeading :title="BILLS_TITLE" :subtotal="subtotals.bills" />
            <BillList :bills="data.bills" :period="data.period" :open="open" @toggle="toggle" />
          </div>
        </BaseCard>

        <BaseCard data-test="people-block">
          <div class="flex flex-col gap-3">
            <BlockHeading :title="PEOPLE_TITLE" :subtotal="subtotals.people" />
            <ul class="flex flex-col">
              <GroupRow
                :title="PEOPLE_ROW"
                :monthly-cost="data.people.monthlyCost"
                :charges="data.people.charges"
                :open="open.has(PEOPLE_KEY)"
                data-test="people-row"
                @update:open="toggle(PEOPLE_KEY)"
              />
            </ul>
          </div>
        </BaseCard>

        <BaseCard data-test="variable-block">
          <div class="flex flex-col gap-3">
            <BlockHeading :title="VARIABLE_TITLE" :subtotal="subtotals.variable" />
            <ul class="flex flex-col divide-y divide-line-subtle">
              <GroupRow
                v-for="(entry, index) in data.variable"
                :key="index"
                :title="entry.categoryName ?? NO_CATEGORY"
                :monthly-cost="entry.monthlyCost"
                :charges="entry.charges"
                :open="open.has(variableKey(index))"
                data-test="variable-row"
                @update:open="toggle(variableKey(index))"
              />
            </ul>
          </div>
        </BaseCard>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
// What a month costs (feature 32). It only reads: one `GET /api/recurring-expenses` each
// time the screen is entered (R2), and again on Try again (R16). Every figure is the
// backend's except the block subtotals (R14).
import { computed, onMounted, ref } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import StatCard from '@/shared/components/StatCard.vue'
import { formatMoney } from '@/shared/money'

import BillList from '../components/BillList.vue'
import BlockHeading from '../components/BlockHeading.vue'
import GroupRow from '../components/GroupRow.vue'
import { useMonthlyCostStore } from '../store'
import {
  BILLS_TITLE,
  EMPTY_LINE,
  LOADING_LINE,
  NO_CATEGORY,
  PEOPLE_ROW,
  PEOPLE_TITLE,
  RETRY,
  SUBTITLE,
  TITLE,
  TOTAL_LABEL,
  VARIABLE_TITLE,
  blockSubtotals,
  increasedLine,
  isEmpty,
  monthlyCostErrorMessage,
  periodLine,
} from '../texts'

const PEOPLE_KEY = 'people'
const variableKey = (index: number): string => `variable:${index}`

const store = useMonthlyCostStore()

onMounted(() => {
  // Fresh on every visit: nothing is kept from the last one.
  void store.load()
})

/** What is open on the screen: `bill:<key>`, `people`, `variable:<index>`. Several at once. */
const open = ref<Set<string>>(new Set())

function toggle(key: string): void {
  const next = new Set(open.value)
  if (!next.delete(key)) next.add(key)
  open.value = next
}

const data = computed(() => (store.loadState === 'ready' ? store.data : null))

const subtotals = computed(() => (data.value ? blockSubtotals(data.value) : null))

const increasedCount = computed(
  () => data.value?.bills.filter((bill) => bill.hasIncreased).length ?? 0,
)

const failure = computed(() =>
  store.loadState === 'error' && store.error ? monthlyCostErrorMessage(store.error) : null,
)
</script>
