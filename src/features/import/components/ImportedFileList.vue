<template>
  <ul class="flex flex-col gap-2" data-test="imported-files">
    <li
      v-for="(row, index) in rows"
      :key="index"
      class="flex flex-col gap-1 rounded-md bg-surface-sunken px-3 py-2 text-sm"
      :data-kind="row.kind"
      data-test="imported-file"
    >
      <FileHeadingLine :file="row.file" />

      <template v-if="row.kind === 'statement'">
        <span class="font-mono text-ink-strong tabular-nums" data-test="imported-counts">
          {{ row.counts }}
        </span>
        <span v-if="row.newAccount !== null" class="flex flex-wrap items-center gap-2">
          <BaseBadge size="sm" tone="positive" data-test="new-account">New account</BaseBadge>
          <span class="text-ink-body" data-test="new-account-alias">{{ row.newAccount }}</span>
        </span>
        <span
          v-for="note in row.notes"
          :key="note"
          class="text-ink-muted"
          data-test="imported-note"
        >
          {{ note }}
        </span>
      </template>

      <template v-else>
        <span v-if="row.product !== null" class="flex flex-wrap items-center gap-2">
          <span class="text-ink-body" data-test="imported-product">
            {{ row.product }} · {{ row.typeLabel }}
          </span>
          <BaseBadge v-if="row.isNew" size="sm" tone="positive" data-test="new-product">
            New product
          </BaseBadge>
        </span>
        <span v-if="row.valueAsOf !== null" class="text-ink-muted" data-test="imported-value-as-of">
          {{ row.valueAsOf }}
        </span>
      </template>
    </li>
  </ul>
</template>

<script setup lang="ts">
// Files that went in: movements per statement, or the product and its value date,
// marking the accounts and products this run created.
import { computed } from 'vue'

import BaseBadge from '@/shared/components/BaseBadge.vue'

import { importedFileRows } from '../details'
import type { ImportReport } from '../types'
import FileHeadingLine from './FileHeadingLine.vue'

const props = defineProps<{ report: ImportReport }>()

const rows = computed(() => importedFileRows(props.report))
</script>
