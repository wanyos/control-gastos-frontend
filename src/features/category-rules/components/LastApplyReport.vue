<template>
  <BaseCard data-test="last-apply">
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <p class="text-sm font-semibold text-ink-strong" data-test="last-apply-headline">
            {{ headline }}
          </p>
          <p class="font-mono text-sm tabular-nums text-ink-muted" data-test="last-apply-figures">
            {{ figures }}
          </p>
        </div>

        <BaseButton
          variant="ghost"
          size="sm"
          data-test="last-apply-dismiss"
          @click="emit('dismiss')"
        >
          Dismiss
        </BaseButton>
      </div>

      <div v-if="hasMovements || hasConflicts" class="flex flex-wrap gap-2">
        <BaseButton
          v-if="hasMovements"
          variant="secondary"
          size="sm"
          :aria-expanded="showsMovements"
          data-test="last-apply-show-movements"
          @click="showsMovements = !showsMovements"
        >
          {{ showsMovements ? 'Hide the movements' : `Show the ${movementsLabel}` }}
        </BaseButton>
        <BaseButton
          v-if="hasConflicts"
          variant="secondary"
          size="sm"
          :aria-expanded="showsConflicts"
          data-test="last-apply-show-conflicts"
          @click="showsConflicts = !showsConflicts"
        >
          {{ showsConflicts ? 'Hide the conflicts' : `Show the ${conflictsLabel}` }}
        </BaseButton>
      </div>

      <CategorizedMovementList
        v-if="hasMovements && showsMovements"
        :movements="report.result.categorizedMovements"
      />

      <RuleConflictList
        v-if="hasConflicts && showsConflicts"
        :conflicts="report.result.conflicts"
        :conflict-count="report.result.conflictCount"
      />
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
// What the last rules pass did, left in view after its dialog is closed: how many
// movements it categorized and at what time, which ones, and the conflicts (feature
// 30). Rules and Review paint this same component. It reads no store and writes
// nothing: the two lists start folded, each behind its own button.
import { computed, ref } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import { formatClock } from '@/shared/money'

import CategorizedMovementList from './CategorizedMovementList.vue'
import RuleConflictList from './RuleConflictList.vue'
import { lastApplyFigures, lastApplyHeadline } from '../rules'
import type { LastApply } from '../types'

const props = defineProps<{ report: LastApply }>()

const emit = defineEmits<{ dismiss: [] }>()

const showsMovements = ref(false)
const showsConflicts = ref(false)

const headline = computed(() =>
  lastApplyHeadline(props.report.result.categorized, formatClock(props.report.at)),
)
const figures = computed(() => lastApplyFigures(props.report.result))

const hasMovements = computed(() => props.report.result.categorized > 0)
const hasConflicts = computed(() => props.report.result.conflicts.length > 0)

const movementsLabel = computed(() => {
  const count = props.report.result.categorized
  return `${count} ${count === 1 ? 'movement' : 'movements'}`
})
const conflictsLabel = computed(() => {
  const count = props.report.result.conflictCount
  return `${count} ${count === 1 ? 'conflict' : 'conflicts'}`
})
</script>
