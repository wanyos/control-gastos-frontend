<template>
  <div class="flex flex-col">
    <div
      class="hidden gap-x-4 border-b border-line-subtle pb-2 text-2xs font-semibold tracking-[0.08em] text-ink-muted uppercase md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto]"
      data-test="bill-columns"
    >
      <span
        v-for="column in BILL_COLUMNS"
        :key="column"
        :class="{ 'text-right': column === 'Per month' }"
      >
        {{ column }}
      </span>
      <span aria-hidden="true" />
    </div>

    <ul class="flex flex-col divide-y divide-line-subtle">
      <BillRow
        v-for="bill in split.charged"
        :key="bill.key"
        :bill="bill"
        :open="open.has(billKey(bill))"
        @update:open="emit('toggle', billKey(bill))"
      />
    </ul>

    <!-- Bills with no charges in the period: last, and folded on arrival (R9). -->
    <details
      v-if="split.uncharged.length > 0"
      class="mt-2 border-t border-line-subtle pt-3"
      data-test="bills-without-charges"
    >
      <summary
        class="cursor-pointer text-sm text-ink-muted"
        data-test="bills-without-charges-summary"
      >
        {{ noChargesSummary(split.uncharged.length, period) }}
      </summary>
      <ul class="flex flex-col divide-y divide-line-subtle">
        <BillRow
          v-for="bill in split.uncharged"
          :key="bill.key"
          :bill="bill"
          :open="open.has(billKey(bill))"
          @update:open="emit('toggle', billKey(bill))"
        />
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
// The bills as they come, those with charges in the period first and the rest folded
// at the end (R9). What is open is the view's: this list only says which was pressed.
import { computed } from 'vue'

import { BILL_COLUMNS, noChargesSummary, splitBills } from '../texts'
import type { Bill, Period } from '../types'
import BillRow from './BillRow.vue'

const props = defineProps<{
  bills: Bill[]
  period: Period
  /** The keys open on the screen: `bill:<key>`. */
  open: ReadonlySet<string>
}>()

const emit = defineEmits<{ toggle: [key: string] }>()

const billKey = (bill: Bill): string => `bill:${bill.key}`

const split = computed(() => splitBills(props.bills))
</script>
