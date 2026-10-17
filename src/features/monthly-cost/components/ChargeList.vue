<template>
  <div
    class="flex flex-col gap-1.5 rounded-md bg-surface-sunken px-3 py-2.5"
    data-test="charge-list"
  >
    <p class="text-xs font-semibold text-ink-muted" data-test="charge-list-heading">
      {{ heading }}
    </p>
    <ul v-if="charges.length > 0" class="flex flex-col gap-1">
      <li
        v-for="charge in charges"
        :key="charge.id"
        class="grid grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-3 text-sm"
        data-test="charge"
      >
        <span class="text-ink-muted" data-test="charge-date">{{
          formatDate(charge.bookingDate)
        }}</span>
        <span class="text-right font-mono text-ink-strong tabular-nums" data-test="charge-amount">
          {{ formatMoney(charge.amount) }}
        </span>
        <span
          class="truncate text-ink-body"
          :title="charge.description"
          data-test="charge-description"
        >
          {{ charge.description }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// The charges of one entry, as they come: newest first (R10, R12).
import { formatDate, formatMoney } from '@/shared/money'

import type { Charge } from '../types'

defineProps<{
  heading: string
  charges: Charge[]
}>()
</script>
