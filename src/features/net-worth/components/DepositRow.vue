<template>
  <li class="flex items-start justify-between gap-4 py-3.5" data-test="deposit-row">
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          class="text-base font-semibold"
          :class="isCancelled ? 'text-ink-muted' : 'text-ink-strong'"
          data-test="deposit-name"
        >
          {{ deposit.name }}
        </span>
        <BaseBadge size="sm" :tone="badge.tone" data-test="deposit-status">
          {{ badge.label }}
        </BaseBadge>
      </div>
      <div
        class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
        :class="isCancelled ? 'text-ink-muted' : 'text-ink-body'"
        data-test="deposit-facts"
      >
        <span data-test="deposit-bank">{{ bankLabel(deposit.bank) }}</span>
        <span v-for="fact in facts" :key="fact" data-test="deposit-fact">{{ fact }}</span>
      </div>
      <p
        v-if="extra"
        class="mt-1 text-xs"
        :class="isCancelled ? 'text-ink-muted' : 'text-warning'"
        data-test="deposit-extra"
      >
        {{ extra }}
      </p>
      <RouterLink v-if="link" :to="link" class="mt-1 inline-block text-xs" data-test="deposit-link">
        See in Movements
      </RouterLink>
    </div>
    <span
      class="text-right text-sm whitespace-nowrap"
      :class="[EARNED_TONES[earned.tone], earned.tone === 'positive' ? FIGURE : '']"
      data-test="deposit-earned"
    >
      {{ earned.text }}
    </span>
  </li>
</template>

<script setup lang="ts">
// One deposit of the Deposits part (feature 38): its data, why it is or is not in
// the total, and the way to its maturity month in Movements.
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { bankLabel } from '@/shared/banks'
import BaseBadge from '@/shared/components/BaseBadge.vue'

import { depositFacts, earnedCell, extraLine, movementsLink, statusBadge } from '../deposits'
import type { DepositEarning } from '../types'

const props = defineProps<{
  deposit: DepositEarning
}>()

// Full literal class names: Tailwind scans source as text (docs/stack.md).
const EARNED_TONES = {
  positive: 'text-positive',
  muted: 'text-ink-muted',
  warning: 'text-warning',
} as const
const FIGURE = 'font-mono font-semibold tabular-nums'

const isCancelled = computed(() => props.deposit.status === 'cancelled')
const badge = computed(() => statusBadge(props.deposit.status))
const facts = computed(() => depositFacts(props.deposit))
const earned = computed(() => earnedCell(props.deposit))
const extra = computed(() => extraLine(props.deposit))
const link = computed(() => movementsLink(props.deposit))
</script>
