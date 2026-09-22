<template>
  <BaseDialog
    :open="open"
    :title="title"
    dismissible
    data-test="bulk-confirm"
    @close="emit('cancel')"
  >
    <p class="pb-2 text-sm text-ink-body" data-test="bulk-confirm-body">
      It is all or nothing: either every movement changes or none of them does.
    </p>

    <template #footer>
      <BaseButton
        variant="secondary"
        data-autofocus
        data-test="bulk-cancel"
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <BaseButton data-test="bulk-continue" @click="emit('confirm')">Yes, continue</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The extra question a bulk action asks from BULK_CONFIRM_THRESHOLD movements up
// (R8). It names the action and the exact number, and Cancel takes the focus: the
// safe answer is the one under the finger.
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'

import { countOf } from '../actions'

const props = defineProps<{
  open: boolean
  count: number
  /** What is about to happen: confirming, or applying (or removing) a category. */
  action: 'confirm' | 'category'
  /** The name of the category, absent when it is being removed. */
  categoryName?: string
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const title = computed(() => {
  if (props.action === 'confirm') return `Confirm ${countOf(props.count)}?`
  return props.categoryName === undefined
    ? `Remove the category from ${countOf(props.count)}?`
    : `Apply "${props.categoryName}" to ${countOf(props.count)}?`
})
</script>
