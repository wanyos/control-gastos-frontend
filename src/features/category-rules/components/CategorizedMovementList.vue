<template>
  <ul class="flex max-h-96 flex-col gap-2 overflow-y-auto" data-test="last-apply-movements">
    <li
      v-for="movement in movements"
      :key="movement.movementId"
      class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 rounded-md bg-surface-sunken px-3 py-2 text-sm"
      data-test="last-apply-movement"
    >
      <div class="flex min-w-0 flex-col gap-1">
        <span class="flex flex-wrap gap-x-2 text-ink-body">
          <span data-test="last-apply-movement-date">{{ formatDate(movement.bookingDate) }}</span>
          <span aria-hidden="true">·</span>
          <span lang="es" class="break-words" data-test="last-apply-movement-description">
            {{ movement.description }}
          </span>
        </span>
        <ul v-if="movement.rules.length > 0" class="flex flex-col gap-0.5 pl-3">
          <li
            v-for="rule in movement.rules"
            :key="rule.ruleId"
            lang="es"
            class="font-mono text-ink-strong"
            data-test="last-apply-movement-rule"
          >
            “{{ rule.matchText }}”
          </li>
        </ul>
      </div>

      <span class="flex shrink-0 items-baseline gap-3">
        <span lang="es" class="text-ink-body" data-test="last-apply-movement-category">
          {{ movement.categoryName }}
        </span>
        <span class="font-mono tabular-nums text-ink-strong" data-test="last-apply-movement-amount">
          {{ formatMoney(signedAmount(movement)) }}
        </span>
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
// The movements a rules pass just categorized, as the apply answer lists them and in
// its order: date, description, the rules that matched, the category that was written
// and the amount (feature 30). Read only — to change one, it is looked up in Review.
import { formatDate, formatMoney } from '@/shared/money'

import { signedAmount } from '../rules'
import type { CategorizedMovement } from '../types'

defineProps<{ movements: CategorizedMovement[] }>()
</script>
