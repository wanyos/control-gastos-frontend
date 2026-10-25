<template>
  <div class="flex flex-col gap-3" data-test="period-picker">
    <div class="flex flex-wrap items-end gap-3">
      <div class="flex gap-1.5" role="group" aria-label="Period" data-test="period-mode">
        <BaseButton
          v-for="option in MODES"
          :key="option.mode"
          :variant="query.mode === option.mode ? 'primary' : 'secondary'"
          size="sm"
          :aria-pressed="query.mode === option.mode ? 'true' : 'false'"
          :data-test="`period-mode-${option.mode}`"
          @click="emit('change', switchMode(query, option.mode))"
        >
          {{ option.label }}
        </BaseButton>
      </div>

      <div v-if="query.mode === 'month'" class="w-56" data-test="period-compare">
        <BaseSelect
          :label="COMPARE_LABEL"
          :model-value="query.compare"
          @update:model-value="onCompare"
        >
          <option v-for="option in COMPARE_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </BaseSelect>
      </div>
    </div>

    <MonthNav
      v-if="query.mode === 'month'"
      :month="query.month"
      @change="(month) => onMonth(month)"
    />

    <div v-else class="flex flex-wrap items-end gap-3" data-test="period-year-nav">
      <BaseButton
        variant="secondary"
        size="sm"
        aria-label="Previous year"
        data-test="period-year-prev"
        @click="onYear(-1)"
      >
        <template #icon><ChevronLeft :size="15" aria-hidden="true" /></template>
        Previous
      </BaseButton>
      <p
        class="min-w-24 text-center font-display text-base font-bold text-ink-strong"
        data-test="period-year-label"
      >
        {{ query.year }}
      </p>
      <BaseButton
        variant="secondary"
        size="sm"
        aria-label="Next year"
        :disabled="query.year >= currentMonth().slice(0, 4)"
        data-test="period-year-next"
        @click="onYear(1)"
      >
        Next
        <ChevronRight :size="15" aria-hidden="true" />
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// Month or year, and which period (R4–R6). It loads nothing: it emits the period and the
// view writes it in the address, the single source of what is on screen. A month reuses
// the statement's nav as it is.
import { ChevronLeft, ChevronRight } from '@lucide/vue'

import MonthNav from '@/features/statement/components/MonthNav.vue'
import { currentMonth } from '@/features/statement/months'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'

import { COMPARE_LABEL, COMPARE_OPTIONS, MODE_MONTH, MODE_YEAR, switchMode } from '../reading'
import type { CompareMonth, MonthKey, PeriodMode, PeriodQuery } from '../types'

const props = defineProps<{ query: PeriodQuery }>()

const emit = defineEmits<{ change: [PeriodQuery] }>()

const MODES: ReadonlyArray<{ mode: PeriodMode; label: string }> = [
  { mode: 'month', label: MODE_MONTH },
  { mode: 'year', label: MODE_YEAR },
]

function onMonth(month: MonthKey): void {
  if (props.query.mode === 'month') emit('change', { ...props.query, month })
}

function onCompare(value: string): void {
  const option = COMPARE_OPTIONS.find((candidate) => candidate.value === value)
  if (props.query.mode === 'month' && option) {
    const compare: CompareMonth = option.value
    emit('change', { ...props.query, compare })
  }
}

function onYear(delta: number): void {
  if (props.query.mode === 'year') {
    emit('change', { mode: 'year', year: String(Number(props.query.year) + delta) })
  }
}
</script>
