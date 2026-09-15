<template>
  <div class="flex flex-col gap-2" data-test="category-conflicts">
    <p class="text-sm text-ink-muted">{{ CONFLICTS_SENTENCE }}</p>
    <ul class="flex flex-col gap-2">
      <li
        v-for="conflict in visible.conflicts"
        :key="conflict.movementId"
        class="flex flex-col gap-1 rounded-md bg-surface-sunken px-3 py-2 text-sm"
        data-test="category-conflict"
      >
        <span class="flex flex-wrap gap-x-2 text-ink-body">
          <span>{{ formatDate(conflict.bookingDate) }}</span>
          <span>·</span>
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
            <span lang="es" class="text-ink-strong">“{{ match.matchText }}”</span>
            →
            <span lang="es" class="text-ink-body">{{ match.categoryName }}</span>
          </li>
        </ul>
      </li>
    </ul>
    <p v-if="visible.more !== null" class="text-sm text-ink-muted" data-test="conflicts-more">
      {{ visible.more }}
    </p>
  </div>
</template>

<script setup lang="ts">
// Movements left without a category because several rules matched: read only.
import { computed } from 'vue'

import { formatDate } from '@/shared/money'

import { CONFLICTS_SENTENCE, visibleConflicts } from '../details'
import type { Categorization } from '../types'

const props = defineProps<{ categorization: Categorization }>()

const visible = computed(() => visibleConflicts(props.categorization))
</script>
