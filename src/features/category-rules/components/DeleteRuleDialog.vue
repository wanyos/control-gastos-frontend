<template>
  <BaseDialog
    :open="open"
    :title="`Delete the rule “${matchText}”?`"
    dismissible
    data-test="delete-rule-dialog"
    @close="emit('cancel')"
  >
    <p class="pb-2 text-sm text-ink-body" data-test="delete-rule-body">
      Movements it already categorized keep their category.
    </p>

    <template #footer>
      <BaseButton
        variant="secondary"
        data-autofocus
        data-test="delete-cancel"
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <BaseButton :loading="busy" data-test="delete-confirm" @click="emit('confirm')">
        Delete
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// Deleting a rule changes no movement (the contract says so), and the dialog says it
// out loud: the fear here is "will this un-categorize what it categorized?" (R9).
// Cancel takes the focus: the safe answer is the one under the finger.
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'

defineProps<{ open: boolean; matchText: string; busy?: boolean }>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>
