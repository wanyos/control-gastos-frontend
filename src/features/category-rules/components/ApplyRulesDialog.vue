<template>
  <BaseDialog
    :open="flow.step !== 'closed'"
    :title="title"
    :dismissible="flow.step !== 'applying'"
    data-test="apply-dialog"
    @close="emit('close')"
  >
    <template v-if="flow.step === 'confirm'">
      <div class="flex flex-col gap-2 pb-2 text-sm text-ink-body" data-test="apply-confirm">
        <p>Only pending movements without a category are touched.</p>
        <p>Confirmed and already categorized movements are never changed.</p>
        <p class="text-negative">This can't be undone from the app.</p>
      </div>
    </template>

    <p
      v-else-if="flow.step === 'applying'"
      class="flex items-center gap-2 pb-2 text-sm text-ink-body"
      data-test="apply-running"
    >
      <BaseSpinner />
      Applying your rules…
    </p>

    <ApplyResult v-else-if="flow.step === 'done'" :result="flow.result" />

    <p
      v-else-if="flow.step === 'failed'"
      class="pb-2 text-sm text-negative"
      data-test="apply-error"
    >
      {{ flow.message }}
    </p>

    <template v-if="flow.step !== 'applying'" #footer>
      <template v-if="flow.step === 'confirm'">
        <BaseButton
          variant="secondary"
          data-autofocus
          data-test="apply-cancel"
          @click="emit('close')"
        >
          Cancel
        </BaseButton>
        <BaseButton data-test="apply-confirmed" @click="emit('confirm')">Apply rules</BaseButton>
      </template>
      <BaseButton v-else variant="secondary" data-test="apply-close" @click="emit('close')">
        Close
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The four steps of applying the rules: ask, run, and show what happened or why it
// did not. It always asks first — a rules pass writes on many movements at once and
// the API cannot undo it (decisions.md 🔴 4) — and while it runs the dialog has no
// way out: a second click must not start a second pass (R11).
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'
import BaseSpinner from '@/shared/components/BaseSpinner.vue'

import ApplyResult from './ApplyResult.vue'
import type { ApplyFlow } from '../types'

const props = defineProps<{ flow: ApplyFlow }>()

const emit = defineEmits<{ confirm: []; close: [] }>()

const TITLES: Record<ApplyFlow['step'], string> = {
  closed: '',
  confirm: 'Apply your rules?',
  applying: 'Applying your rules…',
  done: 'Rules applied',
  failed: "The rules pass didn't finish",
}

const title = computed(() => TITLES[props.flow.step])
</script>
