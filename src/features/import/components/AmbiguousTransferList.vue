<template>
  <div class="flex flex-col gap-2" data-test="ambiguous-transfers">
    <p class="text-sm text-ink-muted">{{ TRANSFERS_SENTENCE }}</p>
    <ul class="flex flex-col gap-2">
      <li
        v-for="(group, index) in visible.groups"
        :key="index"
        class="flex flex-col gap-1 rounded-md bg-surface-sunken px-3 py-2"
        data-test="ambiguous-group"
      >
        <span
          class="font-mono text-sm font-semibold text-ink-strong tabular-nums"
          data-test="ambiguous-amount"
        >
          {{ formatMoney(group.amount) }}
        </span>
        <ul class="flex flex-col gap-1">
          <li
            v-for="movement in group.movements"
            :key="movement.id"
            class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-body"
            data-test="ambiguous-movement"
          >
            <span>{{ formatDate(movement.bookingDate) }}</span>
            <span>·</span>
            <span>{{ movement.accountAlias }}</span>
            <BaseBadge size="sm" tone="neutral" data-test="ambiguous-direction">
              {{ directionLabel(movement.type) }}
            </BaseBadge>
            <span lang="es" class="break-words" data-test="ambiguous-description">
              {{ movement.description }}
            </span>
          </li>
        </ul>
      </li>
    </ul>
    <p v-if="visible.more !== null" class="text-sm text-ink-muted" data-test="ambiguous-more">
      {{ visible.more }}
    </p>
  </div>
</template>

<script setup lang="ts">
// Movements that could be transfers but could not be paired: read only, nothing to resolve here.
import { computed } from 'vue'

import BaseBadge from '@/shared/components/BaseBadge.vue'
import { formatDate, formatMoney } from '@/shared/money'

import { TRANSFERS_SENTENCE, directionLabel, visibleAmbiguous } from '../details'
import type { TransferDetection } from '../types'

const props = defineProps<{ transfers: TransferDetection }>()

const visible = computed(() => visibleAmbiguous(props.transfers))
</script>
