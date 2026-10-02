<template>
  <ul class="flex flex-col gap-3" data-test="transfer-pair-list">
    <TransferPairRow
      v-for="pair in pairs"
      :key="pair.transferId"
      :pair="pair"
      :busy="busy"
      @unlink="emit('unlink', pair)"
    />
  </ul>
</template>

<script setup lang="ts">
// Every pair, in the order received: nothing is sorted, filtered or hidden here (R2).
import type { TransferPair } from '../types'
import TransferPairRow from './TransferPairRow.vue'

defineProps<{ pairs: TransferPair[]; busy?: boolean }>()

const emit = defineEmits<{ unlink: [pair: TransferPair] }>()
</script>
