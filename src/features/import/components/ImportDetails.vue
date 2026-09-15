<template>
  <div v-if="sections.length > 0" class="flex flex-col gap-3" data-test="import-details">
    <h3 v-if="hasThingsToCheck" class="text-base font-semibold text-ink-strong">Things to check</h3>

    <template v-for="section in sections" :key="section.id">
      <FinalPassAlerts v-if="section.id === 'final-passes'" :failures="failures" />

      <ReportSection
        v-else
        :id="section.id"
        :title="section.title"
        :count="section.count"
        :tone="section.id === 'imported-files' ? 'neutral' : 'warning'"
      >
        <BalanceMismatchList v-if="section.id === 'mismatches'" :report="report" />
        <UnreadLineList v-else-if="section.id === 'unread'" :report="report" />
        <AmbiguousTransferList
          v-else-if="section.id === 'transfers'"
          :transfers="report.transfers"
        />
        <CategoryConflictList
          v-else-if="section.id === 'conflicts'"
          :categorization="report.categorization"
        />
        <ImportedFileList v-else :report="report" />
      </ReportSection>
    </template>
  </div>
</template>

<script setup lang="ts">
// The detail under the import summary (feature 14): what to check, in a fixed order,
// then the files that went in. Read only: no actions and no requests.
import { computed } from 'vue'

import { detailSections, finalPassFailures } from '../details'
import type { ImportReport } from '../types'
import AmbiguousTransferList from './AmbiguousTransferList.vue'
import BalanceMismatchList from './BalanceMismatchList.vue'
import CategoryConflictList from './CategoryConflictList.vue'
import FinalPassAlerts from './FinalPassAlerts.vue'
import ImportedFileList from './ImportedFileList.vue'
import ReportSection from './ReportSection.vue'
import UnreadLineList from './UnreadLineList.vue'

const props = defineProps<{ report: ImportReport }>()

const sections = computed(() => detailSections(props.report))
const failures = computed(() => finalPassFailures(props.report))
const hasThingsToCheck = computed(() =>
  sections.value.some((section) => section.id !== 'imported-files'),
)
</script>
