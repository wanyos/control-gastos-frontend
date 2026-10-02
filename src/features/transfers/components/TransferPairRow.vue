<template>
  <li
    class="flex flex-col gap-3 rounded-lg border border-line-subtle bg-surface-card p-4 shadow-sm"
    data-test="transfer-pair"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <ul class="flex min-w-0 flex-1 flex-col gap-2">
        <li
          v-for="leg in legs"
          :key="leg.movement.id"
          class="flex items-start gap-3"
          data-test="pair-leg"
        >
          <span class="w-20 shrink-0 pt-0.5 text-xs text-ink-muted" data-test="pair-leg-side">
            {{ leg.side }}
          </span>
          <div class="min-w-0 flex-1">
            <p
              lang="es"
              class="text-sm font-semibold break-words text-ink-strong"
              data-test="pair-leg-description"
            >
              {{ leg.movement.description }}
            </p>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
              <span data-test="pair-leg-date">{{ formatDate(leg.movement.bookingDate) }}</span>
              <span aria-hidden="true">·</span>
              <span data-test="pair-leg-account">{{ leg.movement.account.alias }}</span>
            </p>
          </div>
          <span
            class="shrink-0 font-mono text-sm text-ink-strong tabular-nums"
            data-test="pair-leg-amount"
          >
            {{ formatMoney(leg.movement.amount) }}
          </span>
        </li>
      </ul>

      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="busy"
        data-test="pair-unlink"
        @click="emit('unlink')"
      >
        Unlink
      </BaseButton>
    </div>

    <p
      v-if="isBizum"
      class="flex flex-wrap items-center gap-2 text-sm text-ink-muted"
      data-test="pair-bizum"
    >
      <BaseBadge tone="warning" size="sm" data-test="pair-bizum-badge">{{ BIZUM_LABEL }}</BaseBadge>
      <span data-test="pair-bizum-note">{{ BIZUM_SENTENCE }}</span>
    </p>
  </li>
</template>

<script setup lang="ts">
// One linked pair: its two legs, money out first, and the way to unlink it. The Bizum
// label states what a leg says, not a verdict, and it changes nothing else: the pair
// stays where the backend put it (R4).
import { computed } from 'vue'

import BaseBadge from '@/shared/components/BaseBadge.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import { formatDate, formatMoney } from '@/shared/money'

import { BIZUM_LABEL, BIZUM_SENTENCE, mentionsBizum } from '../pairs'
import type { TransferPair } from '../types'

const props = defineProps<{ pair: TransferPair; busy?: boolean }>()

const emit = defineEmits<{ unlink: [] }>()

const legs = computed(() => [
  { side: 'Money out', movement: props.pair.expense },
  { side: 'Money in', movement: props.pair.income },
])

const isBizum = computed(() => mentionsBizum(props.pair))
</script>
