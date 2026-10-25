<template>
  <ul
    class="flex flex-col gap-1 rounded-md bg-surface-sunken px-3 py-2.5"
    data-test="line-movements"
  >
    <li
      v-for="movement in movements"
      :key="movement.id"
      class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 text-sm"
      data-test="line-movement"
    >
      <span class="text-ink-muted" data-test="line-movement-date">
        {{ formatDate(movement.bookingDate) }}
      </span>
      <span
        class="truncate text-ink-body"
        :title="movement.description"
        data-test="line-movement-description"
      >
        {{ movement.description }}
      </span>
      <span
        class="text-right font-mono text-ink-strong tabular-nums"
        data-test="line-movement-amount"
      >
        {{ formatMoney(movement.amount) }}
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
// The movements of one line in the period asked, in the order they come (R13).
import { formatDate, formatMoney } from '@/shared/money'

import type { LineMovement } from '../types'

defineProps<{ movements: LineMovement[] }>()
</script>
