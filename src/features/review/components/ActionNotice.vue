<template>
  <p v-if="error" class="text-sm text-negative" data-test="action-error">{{ error }}</p>

  <p
    v-else-if="summary"
    class="flex flex-wrap items-center gap-2 text-sm text-positive"
    data-test="action-summary"
  >
    {{ summary }}
    <BaseButton
      variant="secondary"
      size="sm"
      :disabled="busy"
      data-test="action-undo"
      @click="emit('undo')"
    >
      Undo
    </BaseButton>
  </p>
</template>

<script setup lang="ts">
// One line over the list: what the last action did, with an Undo that has no
// countdown — it lives until the next action or until you leave the screen
// (decisions.md 🔴 5) — or why an action failed. Never both at once.
// The Undo is the bare word in a bordered button: with an icon it read as a reload
// (feature 27). Staying in view on a scrolled page is the view's job, not this one's.
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
