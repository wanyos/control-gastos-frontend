<template>
  <p
    class="flex flex-wrap items-center gap-x-2 text-sm text-positive"
    data-test="rule-created-notice"
  >
    <span data-test="rule-created-line">{{ ruleCreatedLine(saved) }}</span>
    <span v-if="saved.result.error" class="text-ink-strong" data-test="rule-created-unfinished">
      {{ UNFINISHED_MOVE }}
    </span>
  </p>
</template>

<script setup lang="ts">
// One line after a rule is created, kept in view under the top bar: the rule, its
// category and how many movements creating it moved (feature 33). Creating already
// runs the pass, so the line offers nothing to apply (R13).
import { UNFINISHED_MOVE, ruleCreatedLine } from '../rules'
import type { SavedRule } from '../types'

defineProps<{ saved: SavedRule }>()
</script>
