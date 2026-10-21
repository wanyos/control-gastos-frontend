<template>
  <ul class="flex flex-col gap-3" data-test="ownership-list">
    <DoubtfulOwnershipRow
      v-for="movement in movements"
      :key="movement.id"
      :movement="movement"
      :busy="busy"
      @answer="(decision) => emit('answer', movement.id, decision)"
    />
  </ul>
</template>

<script setup lang="ts">
// The doubtful movements of own money, in the order received (feature 35).
import type { Movement } from '@/shared/movements'

import DoubtfulOwnershipRow from './DoubtfulOwnershipRow.vue'

defineProps<{
  movements: Movement[]
  busy?: boolean
}>()

const emit = defineEmits<{ answer: [id: number, decision: 'mine' | 'not_mine'] }>()
</script>
