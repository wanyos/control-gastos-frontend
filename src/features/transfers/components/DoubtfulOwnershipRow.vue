<template>
  <li
    class="flex flex-col gap-3 rounded-lg border border-line-subtle bg-surface-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
    data-test="ownership-row"
    :data-movement-id="movement.id"
  >
    <div class="flex min-w-0 flex-col gap-1">
      <span class="text-xs text-ink-muted">
        <span data-test="ownership-date">{{ formatDate(movement.bookingDate) }}</span>
        <span aria-hidden="true"> · </span>
        <span data-test="ownership-account">{{ accountLabel(movement.account) }}</span>
      </span>
      <span
        lang="es"
        class="break-words text-sm font-semibold text-ink-strong"
        data-test="ownership-description"
      >
        {{ movement.description }}
      </span>
      <span class="text-xs text-ink-muted" data-test="ownership-reason">{{ reason }}</span>
    </div>

    <div class="flex shrink-0 flex-col items-end gap-2">
      <span
        class="font-mono text-base font-semibold tabular-nums"
        :class="movement.type === 'income' ? 'text-positive' : 'text-ink-strong'"
        data-test="ownership-amount"
      >
        {{ amount }}
      </span>
      <div class="flex gap-2">
        <BaseButton
          size="sm"
          :disabled="busy"
          :aria-label="`It's mine: ${movement.description}`"
          data-test="ownership-mine"
          @click="emit('answer', 'mine')"
        >
          It's mine
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="sm"
          :disabled="busy"
          :aria-label="`Not mine: ${movement.description}`"
          data-test="ownership-not-mine"
          @click="emit('answer', 'not_mine')"
        >
          Not mine
        </BaseButton>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
// One doubtful movement of own money (feature 35): when, where, what, why it is
// doubtful, how much, and the two answers. One click answers; there is no question
// before it (decisions.md 🔴 1). No business logic: the store decides what is sent.
import { computed } from 'vue'

import { accountLabel } from '@/shared/accounts'
import BaseButton from '@/shared/components/BaseButton.vue'
import { formatDate, formatMoney } from '@/shared/money'
import type { Movement } from '@/shared/movements'

import { ownershipReason } from '../pairs'

const props = defineProps<{
  movement: Movement
  /** A write of the screen is in flight: neither answer can be pressed (R10). */
  busy?: boolean
}>()

const emit = defineEmits<{ answer: [decision: 'mine' | 'not_mine'] }>()

const reason = computed(() => ownershipReason(props.movement))

/** The API always sends a positive amount; the sign comes from `type`. */
const amount = computed(() =>
  formatMoney(
    props.movement.type === 'expense' ? `-${props.movement.amount}` : props.movement.amount,
  ),
)
</script>
