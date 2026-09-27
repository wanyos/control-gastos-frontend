<template>
  <p v-if="error" class="text-sm text-negative" data-test="statement-action-error">{{ error }}</p>

  <p
    v-else-if="summary"
    class="flex flex-wrap items-center gap-2 text-sm text-positive"
    data-test="statement-action-summary"
  >
    {{ summary }}
    <BaseButton
      v-if="undoable"
      variant="ghost"
      size="sm"
      :disabled="busy"
      data-test="statement-action-undo"
      @click="emit('undo')"
    >
      <template #icon><Undo2 :size="14" aria-hidden="true" /></template>
      Undo
    </BaseButton>
  </p>
</template>

<script setup lang="ts">
// One fixed line over the list and under the figures: what the last write did, with an
// Undo that has NO countdown — it lives until the next write, until the month or a
// filter changes, or until you leave the screen (decisions.md 🔴 4) — or why a write
// failed. Never both at once: the error wins.
//
// Copied from `review/components/ActionNotice.vue` (design §7.3) so the statement keeps
// importing nothing from another feature; the one difference is `undoable`: after an
// undo the sentence stays and the button goes, because nothing is redone.
import { Undo2 } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'

defineProps<{
  /** What the last successful write did, e.g. `Categorized as Groceries`. */
  summary?: string | null
  /** The English sentence of a failed write; it wins over the summary (R14). */
  error?: string | null
  /** False once there is nothing left to put back. */
  undoable?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{ undo: [] }>()
</script>
