<template>
  <li class="flex flex-col gap-2 py-3" data-test="bill-row" :data-key="bill.key">
    <div
      class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1.5 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto] md:items-center"
    >
      <div class="flex min-w-0 flex-col md:order-1">
        <span class="text-sm font-semibold text-ink-strong" data-test="bill-title">
          {{ billTitle(bill.key) }}
        </span>
        <span class="truncate text-xs text-ink-muted" :title="bill.name" data-test="bill-name">
          {{ bill.name }}
        </span>
      </div>

      <span
        class="text-right font-mono text-sm font-semibold text-ink-strong tabular-nums md:order-6"
        data-test="bill-monthly-cost"
      >
        {{ formatMoney(bill.monthlyCost) }}
      </span>

      <!-- Below md, one wrapped line under the name; from md up, its own columns. -->
      <div class="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:contents">
        <span class="text-ink-body md:order-2 md:text-sm" data-test="bill-periodicity">
          {{ periodicityLabel(bill.periodicity) }}
        </span>
        <span class="text-ink-body md:order-3 md:text-sm" data-test="bill-usual">
          <span class="font-mono tabular-nums">{{ formatMoney(bill.usualAmount) }}</span
          >{{ usualSuffix(bill.periodicity) }}
        </span>
        <span class="text-ink-muted md:order-4 md:text-sm" data-test="bill-last-date">
          {{ formatDate(bill.lastDate) }}
        </span>
        <span class="flex flex-col items-start gap-0.5 md:order-5" data-test="bill-change">
          <BaseBadge
            v-if="change.kind === 'up'"
            tone="negative"
            size="sm"
            data-test="bill-increase"
          >
            <span class="font-mono tabular-nums">{{ change.text }}</span>
          </BaseBadge>
          <span v-else class="text-ink-muted md:text-sm" data-test="bill-change-text">
            {{ change.text }}
          </span>
          <span v-if="change.was" class="text-2xs text-ink-muted" data-test="bill-was">
            {{ change.was }}
          </span>
        </span>
      </div>

      <BaseButton
        variant="secondary"
        size="sm"
        class="col-span-2 justify-self-start md:order-7 md:col-span-1"
        :aria-expanded="open ? 'true' : 'false'"
        data-test="bill-toggle"
        @click="open = !open"
      >
        {{ open ? HIDE_CHARGES : SHOW_CHARGES }}
      </BaseButton>
    </div>

    <ChargeList
      v-if="open"
      :heading="chargesHeading('bill', bill.charges.length)"
      :charges="bill.charges"
    />
  </li>
</template>

<script setup lang="ts">
// One bill: its name, how often it is charged, what it usually charges, the last
// charge, how it changed and what it costs a month (R6, R7, R8). Its charges open below
// the row (R10). `open` is the parent's when it binds it, local otherwise.
import { computed } from 'vue'

import BaseBadge from '@/shared/components/BaseBadge.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import { formatDate, formatMoney } from '@/shared/money'

import {
  HIDE_CHARGES,
  SHOW_CHARGES,
  billTitle,
  changeView,
  chargesHeading,
  periodicityLabel,
  usualSuffix,
} from '../texts'
import type { Bill } from '../types'
import ChargeList from './ChargeList.vue'

const props = defineProps<{ bill: Bill }>()
const open = defineModel<boolean>('open', { default: false })

const change = computed(() => changeView(props.bill))
</script>
