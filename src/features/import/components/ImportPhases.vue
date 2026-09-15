<template>
  <ol class="flex flex-col gap-3" data-test="import-phases">
    <li
      v-for="(phase, index) in phases"
      :key="index"
      class="flex items-start gap-3"
      :data-state="phase.state"
      data-test="import-phase"
    >
      <span class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center">
        <CircleCheck
          v-if="phase.state === 'done'"
          :size="16"
          class="text-positive"
          aria-hidden="true"
        />
        <BaseSpinner v-else-if="phase.state === 'current'" class="text-brand" />
        <Circle v-else :size="16" class="text-ink-faint" aria-hidden="true" />
      </span>
      <span class="flex flex-col gap-0.5">
        <span
          class="text-base font-semibold"
          :class="phase.state === 'pending' ? 'text-ink-muted' : 'text-ink-strong'"
        >
          {{ phase.label }}
        </span>
        <span v-if="phase.detail" class="text-sm text-ink-muted">{{ phase.detail }}</span>
      </span>
    </li>
  </ol>
</template>

<script setup lang="ts">
// The two phases of an import (Check Drive, Import files). Icons are decorative:
// the state is told by the text next to them.
import { Circle, CircleCheck } from '@lucide/vue'

import BaseSpinner from '@/shared/components/BaseSpinner.vue'

export interface Phase {
  label: string
  detail?: string
  state: 'done' | 'current' | 'pending'
}

defineProps<{ phases: Phase[] }>()
</script>
