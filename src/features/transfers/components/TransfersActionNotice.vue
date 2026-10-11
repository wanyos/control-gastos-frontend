<template>
  <p v-if="error" class="text-sm text-negative" data-test="transfers-action-error">{{ error }}</p>

  <p
    v-else-if="summary"
    class="flex flex-wrap items-center gap-2 text-sm text-positive"
    data-test="transfers-action-summary"
  >
    {{ summary }}
    <BaseButton
      v-if="undoable"
      variant="secondary"
      size="sm"
      :disabled="busy"
      data-test="transfers-action-undo"
      @click="emit('undo')"
    >
      Undo
    </BaseButton>
  </p>
</template>

<script setup lang="ts">
// One fixed line over the lists: what the last write did, with an Undo that has no
// countdown — it lives until the next write or until you leave the screen — or why a
// write failed. Never both at once: the error wins.
// The Undo is the bare word in a bordered button: with an icon it read as a reload
// (feature 27). Staying in view on a scrolled page is the view's job, not this one's.
//
// Copied from `statement/components/StatementActionNotice.vue` so this feature imports
// nothing from another one (C5).
import BaseButton from '@/shared/components/BaseButton.vue'

defineProps<{
  /** What the last successful write did. */
  summary?: string | null
  /** The English sentence of a failed write; it wins over the summary (R13). */
  error?: string | null
  /** False once there is nothing left to put back. */
  undoable?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{ undo: [] }>()
</script>
