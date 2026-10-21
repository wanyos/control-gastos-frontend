<template>
  <BaseDialog
    :open="open"
    :title="mode === 'create' ? CREATE_TITLE : EDIT_TITLE"
    dismissible
    data-test="account-dialog"
    @close="onCancel"
  >
    <div class="flex flex-col gap-4 pb-2">
      <p class="text-sm text-ink-muted" data-test="account-hint">{{ ACCOUNT_HINT }}</p>

      <BaseInput
        v-model="draft.name"
        :label="FIELD_LABELS.name"
        :invalid="problems.name !== undefined"
        :hint="problems.name"
        lang="es"
        data-test="account-name"
      />
      <BaseInput
        v-model="draft.bank"
        :label="FIELD_LABELS.bank"
        :invalid="problems.bank !== undefined"
        :hint="problems.bank"
        data-test="account-bank"
      />
      <BaseInput
        v-model="draft.accountNumber"
        :label="FIELD_LABELS.accountNumber"
        data-test="account-number"
      />
      <BaseSelect
        :model-value="draft.type"
        :label="FIELD_LABELS.type"
        :hint="problems.type"
        data-test="account-type"
        @update:model-value="setType"
      >
        <option value="">{{ CHOOSE_TYPE }}</option>
        <option v-for="type in OWN_ACCOUNT_TYPES" :key="type" :value="type">
          {{ TYPE_LABELS[type] }}
        </option>
      </BaseSelect>
      <div class="grid grid-cols-2 gap-3">
        <BaseInput
          v-model="draft.openedAt"
          type="date"
          :label="FIELD_LABELS.openedAt"
          data-test="account-opened"
        />
        <BaseInput
          v-model="draft.closedAt"
          type="date"
          :label="FIELD_LABELS.closedAt"
          :invalid="problems.closedAt !== undefined"
          :hint="problems.closedAt"
          data-test="account-closed"
        />
      </div>
      <TextListField
        v-model="draft.texts"
        :label="FIELD_LABELS.texts"
        :item-label="TEXT_ITEM"
        :add-label="ADD_TEXT"
        :problems="problems.texts"
      />

      <p v-if="message" class="text-sm text-negative" data-test="account-error">{{ message }}</p>
    </div>

    <template #footer>
      <BaseButton variant="secondary" data-test="account-cancel" @click="onCancel">
        {{ CANCEL }}
      </BaseButton>
      <BaseButton :disabled="!canSave" :loading="busy" data-test="account-save" @click="onSave">
        {{ SAVE }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The account window, the same to add a row and to change one (R5, R6). Dumb: it keeps
// what is typed, says next to each field what the contract would reject (R10), and
// hands the whole draft up; who decides what travels is the store.
import { computed, ref, watch } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'

import TextListField from './TextListField.vue'
import {
  ACCOUNT_HINT,
  ADD_TEXT,
  CANCEL,
  CHOOSE_TYPE,
  CREATE_TITLE,
  EDIT_TITLE,
  FIELD_LABELS,
  OWN_ACCOUNT_TYPES,
  SAVE,
  TEXT_ITEM,
  TYPE_LABELS,
  draftProblems,
  emptyDraft,
  hasProblems,
} from '../texts'
import type { OwnAccountDraft } from '../types'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    initial: OwnAccountDraft
    busy?: boolean
    /** The sentence of a failed save; the window stays open with it (R11). */
    message?: string | null
  }>(),
  { busy: false, message: null },
)

const emit = defineEmits<{ save: [OwnAccountDraft]; cancel: [] }>()

const draft = ref<OwnAccountDraft>(emptyDraft())

/**
 * Only opening the window fills it: a failed save keeps what was typed, even when the
 * table is read again behind it (R11).
 */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.value = { ...props.initial, texts: [...props.initial.texts] }
  },
  { immediate: true },
)

function setType(value: string): void {
  const type = OWN_ACCOUNT_TYPES.find((one) => one === value)
  draft.value.type = type ?? ''
}

const problems = computed(() => draftProblems(draft.value))

const canSave = computed(() => !hasProblems(problems.value) && !props.busy)

function onSave(): void {
  if (!canSave.value) return
  emit('save', { ...draft.value, texts: [...draft.value.texts] })
}

function onCancel(): void {
  emit('cancel')
}
</script>
