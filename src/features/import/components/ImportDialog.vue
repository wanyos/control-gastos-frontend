<template>
  <BaseDialog
    ref="dialogRef"
    :open="flow.step !== 'closed'"
    title="Import from Google Drive"
    :dismissible="!store.isImporting"
    @close="store.close()"
  >
    <!-- Mounted for as long as the dialog is open, so every phase change is announced. -->
    <p class="sr-only" aria-live="polite" data-test="import-live">{{ announcement }}</p>

    <div v-if="flow.step === 'checking'" data-test="import-step-checking">
      <ImportPhases
        :phases="[
          { label: CHECKING_TEXT, state: 'current' },
          { label: IMPORT_PHASE, state: 'pending' },
        ]"
      />
    </div>

    <div
      v-else-if="flow.step === 'upToDate'"
      class="flex flex-col gap-1"
      data-test="import-step-upToDate"
    >
      <p class="text-base font-semibold text-ink-strong">{{ UP_TO_DATE_TITLE }}</p>
      <p class="text-base text-ink-muted">{{ UP_TO_DATE_DETAIL }}</p>
    </div>

    <div
      v-else-if="flow.step === 'confirm'"
      class="flex flex-col gap-4"
      data-test="import-step-confirm"
    >
      <ImportPhases
        :phases="[
          { label: foundText(flow.pending.totalPending), state: 'done' },
          { label: IMPORT_PHASE, state: 'pending' },
        ]"
      />
      <PendingList :pending="flow.pending" />
      <p class="text-sm text-ink-muted">
        Files are moved to the processed folder in Drive once imported.
      </p>
    </div>

    <div v-else-if="flow.step === 'importing'" data-test="import-step-importing">
      <ImportPhases
        :phases="[
          { label: foundText(flow.fileCount), state: 'done' },
          {
            label: importingText(flow.fileCount),
            detail: 'This can take a few seconds.',
            state: 'current',
          },
        ]"
      />
    </div>

    <div
      v-else-if="flow.step === 'finished'"
      class="flex flex-col gap-5"
      data-test="import-step-finished"
    >
      <ImportSummary :report="flow.report" />
      <FileIssueList :files="issueFiles(flow.report)" />
    </div>

    <div
      v-else-if="flow.step === 'checkFailed' || flow.step === 'importFailed'"
      class="flex flex-col gap-1"
      :data-test="`import-step-${flow.step}`"
    >
      <p
        class="flex items-center gap-2 text-base font-semibold text-ink-strong"
        data-test="failure-title"
      >
        <TriangleAlert :size="18" class="shrink-0 text-negative" aria-hidden="true" />
        {{ failureTitle(flow.kind) }}
      </p>
      <p class="text-base text-ink-body" data-test="failure-detail">
        {{ flow.step === 'checkFailed' ? NOTHING_IMPORTED : MAY_HAVE_IMPORTED }}
      </p>
    </div>

    <div v-else-if="flow.step === 'reportUnreadable'" data-test="import-step-reportUnreadable">
      <p class="text-base text-ink-body">{{ REPORT_UNREADABLE_TEXT }}</p>
    </div>

    <template #footer>
      <BaseButton
        v-if="flow.step === 'checking'"
        variant="secondary"
        data-autofocus
        data-test="import-cancel"
        @click="store.close()"
      >
        Cancel
      </BaseButton>

      <template v-else-if="flow.step === 'confirm'">
        <BaseButton variant="secondary" data-test="import-cancel" @click="store.close()">
          Cancel
        </BaseButton>
        <BaseButton data-autofocus data-test="import-confirm" @click="store.start()">
          {{ importActionLabel(flow.pending.totalPending) }}
        </BaseButton>
      </template>

      <BaseButton
        v-else-if="flow.step === 'importing'"
        loading
        data-autofocus
        data-test="import-confirm"
      >
        {{ importActionLabel(flow.fileCount) }}
      </BaseButton>

      <template v-else-if="flow.step === 'checkFailed' || flow.step === 'importFailed'">
        <BaseButton variant="secondary" data-test="import-close" @click="store.close()">
          Close
        </BaseButton>
        <BaseButton data-autofocus data-test="import-retry" @click="store.retry()">
          Try again
        </BaseButton>
      </template>

      <BaseButton v-else data-autofocus data-test="import-close" @click="store.close()">
        Close
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The import dialog: one body and one footer per phase of the store's flow
// (specs/13-import-dialog/design.md §8). It never talks to the API itself.
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { TriangleAlert } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'

import { issueFiles } from '../fileMessages'
import { useImportStore } from '../store'
import {
  CHECKING_TEXT,
  REPORT_UNREADABLE_TEXT,
  UP_TO_DATE_DETAIL,
  UP_TO_DATE_TITLE,
  failureTitle,
  foundText,
  importActionLabel,
  importingText,
  phaseAnnouncement,
} from '../summary'
import FileIssueList from './FileIssueList.vue'
import ImportPhases from './ImportPhases.vue'
import ImportSummary from './ImportSummary.vue'
import PendingList from './PendingList.vue'

const IMPORT_PHASE = 'Import files'
const NOTHING_IMPORTED = 'Nothing has been imported.'
const MAY_HAVE_IMPORTED =
  'Some files may already have been imported. Trying again is safe: nothing is imported twice.'

const store = useImportStore()
const { flow } = storeToRefs(store)

const dialogRef = ref<InstanceType<typeof BaseDialog> | null>(null)

const announcement = computed(() => phaseAnnouncement(flow.value))

// The button that had the focus disappears when the phase changes: hand it to the new action.
watch(
  () => flow.value.step,
  async (step, previous) => {
    if (step === 'closed' || previous === 'closed') return
    await nextTick()
    dialogRef.value?.focusInitial()
  },
)
</script>
