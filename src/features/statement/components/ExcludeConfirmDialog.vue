<template>
  <BaseDialog
    :open="open"
    :title="title"
    dismissible
    data-test="statement-exclude-confirm"
    @close="emit('cancel')"
  >
    <p class="pb-2 text-sm text-ink-body" data-test="statement-exclude-confirm-body">
      It is all or nothing: either every movement changes or none of them does.
    </p>

    <template #footer>
      <BaseButton
        variant="secondary"
        data-autofocus
        data-test="statement-exclude-cancel"
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <BaseButton data-test="statement-exclude-continue" @click="emit('confirm')">
        Yes, continue
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The extra question the exclusion asks from STATEMENT_BULK_THRESHOLD movements up
// (R13). It names the exact number, and Cancel takes the focus: the safe answer is the
// one under the finger. A copy of `review/components/BulkConfirmDialog.vue` with this
// screen's two sentences — the statement imports nothing from another feature.
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'

import { countOf } from '../actions'

const props = defineProps<{
  open: boolean
  /** How many movements are really going to change, never how many are ticked (R2). */
  count: number
  /** What is about to happen: taking them out of the figures, or putting them back. */
  excluded: boolean
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const title = computed(() =>
  props.excluded
    ? `Exclude ${countOf(props.count)} from totals?`
    : `Put ${countOf(props.count)} back in totals?`,
)
</script>
