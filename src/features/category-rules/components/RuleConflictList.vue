<template>
  <div class="flex flex-col gap-2" data-test="rule-conflicts">
    <p class="text-sm text-ink-muted">{{ CONFLICTS_SENTENCE }}</p>
    <ul class="flex flex-col gap-2">
      <li
        v-for="conflict in conflicts"
        :key="conflict.movementId"
        class="flex flex-col gap-1 rounded-md bg-surface-sunken px-3 py-2 text-sm"
        data-test="rule-conflict"
      >
        <span class="flex flex-wrap gap-x-2 text-ink-body">
          <span>{{ formatDate(conflict.bookingDate) }}</span>
          <span aria-hidden="true">·</span>
          <span lang="es" class="break-words" data-test="conflict-description">
            {{ conflict.description }}
          </span>
        </span>
        <ul class="flex flex-col gap-0.5 pl-3">
          <li
            v-for="match in conflict.matches"
            :key="match.ruleId"
            class="text-ink-muted"
            data-test="conflict-rule"
          >
            <span lang="es" class="font-mono text-ink-strong">“{{ match.matchText }}”</span>
            →
            <span lang="es" class="text-ink-body">{{ match.categoryName }}</span>
          </li>
        </ul>
      </li>
    </ul>
    <p v-if="notListed > 0" class="text-sm text-ink-muted" data-test="conflicts-more">
      and {{ notListed }} more not listed
    </p>
  </div>
</template>

<script setup lang="ts">
// Every conflict the pass reported, not the first ten as the import report does
// (decisions.md 🔴 6): seeing them is the point here, and the dialog body scrolls.
// Read only — no control resolves anything from the web (C1).
import { computed } from 'vue'

import { formatDate } from '@/shared/money'

import type { RuleConflict } from '../types'

const CONFLICTS_SENTENCE =
  'These movements match rules for different categories, so they were left without one.'

const props = defineProps<{
  conflicts: RuleConflict[]
  /** What the backend counted; it may be larger than the list it sent. */
  conflictCount: number
}>()

const notListed = computed(() => Math.max(0, props.conflictCount - props.conflicts.length))
</script>
