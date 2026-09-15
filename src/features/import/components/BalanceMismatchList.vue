<template>
  <div class="flex flex-col gap-3" data-test="balance-mismatches">
    <section
      v-for="group in groups"
      :key="`${group.file.bank}/${group.file.year}/${group.file.name}`"
      class="flex flex-col gap-1.5"
      data-test="mismatch-group"
    >
      <FileHeadingLine :file="group.file" />
      <ul class="flex flex-col gap-2">
        <li
          v-for="(mismatch, index) in group.mismatches"
          :key="index"
          class="flex flex-col gap-1 rounded-md bg-surface-sunken px-3 py-2"
          data-test="balance-mismatch"
        >
          <span class="text-sm text-ink-body" data-test="mismatch-where">
            {{ mismatch.accountAlias }} · {{ formatDate(mismatch.date) }}
          </span>
          <span class="text-sm font-semibold text-ink-strong" data-test="mismatch-check">
            {{ checkLabel(mismatch.check).name }}
          </span>
          <span
            v-if="checkLabel(mismatch.check).explanation !== null"
            class="text-sm text-ink-muted"
            data-test="mismatch-explanation"
          >
            {{ checkLabel(mismatch.check).explanation }}
          </span>
          <dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
            <template v-for="figure in figures(mismatch)" :key="figure.label">
              <dt class="text-ink-muted">{{ figure.label }}</dt>
              <dd
                class="text-right font-mono text-ink-strong tabular-nums"
                :data-figure="figure.label"
                data-test="mismatch-figure"
              >
                {{ formatMoney(figure.amount) }}
              </dd>
            </template>
          </dl>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Balance mismatches grouped by file: where, which check and the three figures,
// stacked so they fit the dialog width.
import { computed } from 'vue'

import { formatDate, formatMoney } from '@/shared/money'

import { checkLabel, mismatchGroups } from '../details'
import type { BalanceMismatch, DecimalString, ImportReport } from '../types'
import FileHeadingLine from './FileHeadingLine.vue'

const props = defineProps<{ report: ImportReport }>()

const groups = computed(() => mismatchGroups(props.report))

const figures = (mismatch: BalanceMismatch): { label: string; amount: DecimalString }[] => [
  { label: 'Calculated', amount: mismatch.computed },
  { label: 'In file', amount: mismatch.fromFile },
  { label: 'Difference', amount: mismatch.difference },
]
</script>
