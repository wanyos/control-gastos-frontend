<template>
  <BaseDialog
    :open="open"
    :title="NAMES_DIALOG_TITLE"
    dismissible
    data-test="names-dialog"
    @close="onCancel"
  >
    <div class="flex flex-col gap-4 pb-2">
      <p class="text-sm text-ink-muted" data-test="names-dialog-hint">{{ NAMES_HINT }}</p>

      <TextListField
        v-model="list"
        :label="NAMES_TITLE"
        :item-label="FORM_ITEM"
        :add-label="ADD_FORM"
        :problems="problems"
      />

      <p v-if="message" class="text-sm text-negative" data-test="names-error">{{ message }}</p>
    </div>

    <template #footer>
      <BaseButton variant="secondary" data-test="names-cancel" @click="onCancel">
        {{ CANCEL }}
      </BaseButton>
      <BaseButton :disabled="!canSave" :loading="busy" data-test="names-save" @click="onSave">
        {{ SAVE }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The window of the forms of the holder's name: the whole list, one field per form
// (R13). Saving an empty list deletes them all, with no further question. Dumb: it hands
// the list up as typed; the store drops the blank fields and sends it.
import { computed, ref, watch } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'

import TextListField from './TextListField.vue'
import {
  ADD_FORM,
  CANCEL,
  FORM_ITEM,
  NAMES_DIALOG_TITLE,
  NAMES_HINT,
  NAMES_TITLE,
  SAVE,
  listProblems,
} from '../texts'

const props = withDefaults(
  defineProps<{
    open: boolean
    initial: string[]
    busy?: boolean
    /** The sentence of a failed save; the window stays open with it (R14). */
    message?: string | null
  }>(),
  { busy: false, message: null },
)

const emit = defineEmits<{ save: [string[]]; cancel: [] }>()

const list = ref<string[]>([])

/**
 * Only opening the window fills it: a failed save keeps what was typed, even when the
 * list is read again behind it (R14).
 */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    list.value = [...props.initial]
  },
  { immediate: true },
)

const problems = computed(() => listProblems(list.value))

const canSave = computed(() => !props.busy && problems.value.every((problem) => problem === null))

function onSave(): void {
  if (!canSave.value) return
  emit('save', [...list.value])
}

function onCancel(): void {
  emit('cancel')
}
</script>
