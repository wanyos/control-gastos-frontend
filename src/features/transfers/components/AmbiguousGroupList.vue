<template>
  <ul class="flex flex-col gap-3" data-test="doubtful-group-list">
    <AmbiguousGroupCard
      v-for="group in groups"
      :key="group.key"
      :group="group"
      :choice="choices[group.key]"
      :busy="busy"
      @choose="(side, id) => emit('choose', group.key, side, id)"
      @link="emit('link', group.key)"
    />
  </ul>
</template>

<script setup lang="ts">
// The doubtful groups, in the order received; each keeps its own choice.
import type { AmbiguousGroup, LinkChoice } from '../types'
import AmbiguousGroupCard from './AmbiguousGroupCard.vue'

defineProps<{
  groups: AmbiguousGroup[]
  choices: Record<string, LinkChoice>
  busy?: boolean
}>()

const emit = defineEmits<{
  choose: [key: string, side: 'out' | 'in', id: number]
  link: [key: string]
}>()
</script>
