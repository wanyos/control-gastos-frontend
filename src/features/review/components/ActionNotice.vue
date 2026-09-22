<template>
  <p v-if="error" class="text-sm text-negative" data-test="action-error">{{ error }}</p>

  <p
    v-else-if="summary"
    class="flex flex-wrap items-center gap-2 text-sm text-positive"
    data-test="action-summary"
  >
    {{ summary }}
    <BaseButton
      variant="ghost"
      size="sm"
      :disabled="busy"
      data-test="action-undo"
      @click="emit('undo')"
    >
      <template #icon><Undo2 :size="14" aria-hidden="true" /></template>
      Undo
    </BaseButton>
  </p>
</template>

<script setup lang="ts">
// One line over the list: what the last action did, with an Undo that has no
// countdown — it lives until the next action or until you leave the screen
// (decisions.md 🔴 5) — or why an action failed. Never both at once.
import { Undo2 } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'

defineProps<{
  /** What the last successful action did, e.g. `3 movements confirmed`. */
  summary?: string | null
  /** The English sentence of a failed action; it wins over the summary. */
  error?: string | null
  busy?: boolean
}>()

const emit = defineEmits<{ undo: [] }>()
</script>
