<template>
  <BaseDialog
    :open="open"
    :title="UNLINK_TITLE"
    dismissible
    data-test="unlink-confirm"
    @close="emit('cancel')"
  >
    <ul class="flex flex-col gap-1 pb-3 text-sm text-ink-body">
      <li v-for="leg in legs" :key="leg.movement.id" data-test="unlink-confirm-leg">
        {{ leg.side }} · {{ formatDate(leg.movement.bookingDate) }} ·
        {{ leg.movement.account.alias }} ·
        <span class="font-mono tabular-nums">{{ formatMoney(leg.movement.amount) }}</span>
      </li>
    </ul>
    <p class="pb-1 text-sm text-ink-body" data-test="unlink-confirm-consequence">
      {{ consequence }}
    </p>
    <p class="pb-2 text-sm text-ink-body" data-test="unlink-confirm-memory">
      {{ UNLINK_MEMORY }}
    </p>

    <template #footer>
      <BaseButton
        variant="secondary"
        data-autofocus
        data-test="unlink-cancel"
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <BaseButton data-test="unlink-continue" @click="emit('confirm')">Yes, unlink</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The question before unlinking: it names the two legs and says which will count
// again, and Cancel takes the focus. Adapted from the statement's ExcludeConfirmDialog —
// copied, because no feature imports from another (C5).
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'
import { formatDate, formatMoney } from '@/shared/money'

import { UNLINK_MEMORY, UNLINK_TITLE, unlinkConsequence } from '../pairs'
import type { TransferPair } from '../types'

const props = defineProps<{ open: boolean; pair: TransferPair }>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const legs = computed(() => [
  { side: 'Money out', movement: props.pair.expense },
  { side: 'Money in', movement: props.pair.income },
])

const consequence = computed(() => unlinkConsequence(props.pair))
</script>
