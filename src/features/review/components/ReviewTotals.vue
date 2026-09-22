<template>
  <div class="flex flex-wrap items-baseline gap-x-6 gap-y-2" data-test="review-totals">
    <p class="text-sm text-ink-muted" data-test="totals-matches">
      {{ pagination.total }} {{ pagination.total === 1 ? 'movement' : 'movements' }}
    </p>

    <p class="flex items-baseline gap-2 text-sm">
      <span class="text-ink-muted">In</span>
      <span class="font-mono font-semibold tabular-nums text-ink-strong" data-test="totals-in">
        {{ formatMoney(totals.income) }}
      </span>
    </p>
    <p class="flex items-baseline gap-2 text-sm">
      <span class="text-ink-muted">Out</span>
      <span class="font-mono font-semibold tabular-nums text-ink-strong" data-test="totals-out">
        {{ formatMoney(totals.expense) }}
      </span>
    </p>
    <p class="flex items-baseline gap-2 text-sm">
      <span class="text-ink-muted">Net</span>
      <span
        class="font-mono font-semibold tabular-nums"
        :class="isNetNegative ? 'text-negative' : 'text-positive'"
        data-test="totals-net"
      >
        {{ formatMoney(totals.net) }}
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
// The four figures the API computed over ALL the matches of the filter. None of
// them is ever derived from the loaded page: the page only holds 100 rows (R9).
import { computed } from 'vue'

import { formatMoney, toCents } from '@/shared/money'

import type { Pagination, Totals } from '../types'

const props = defineProps<{ pagination: Pagination; totals: Totals }>()

const isNetNegative = computed(() => toCents(props.totals.net) < 0n)
</script>
