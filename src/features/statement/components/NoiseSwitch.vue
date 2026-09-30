<template>
  <div class="flex flex-wrap items-center justify-between gap-3" data-test="statement-noise-switch">
    <BaseCheckbox
      :model-value="modelValue"
      label="Hide what does not count"
      :disabled="disabled"
      @update:model-value="emit('change', $event)"
    />

    <p
      v-if="hiddenCount !== null"
      class="text-sm text-ink-muted"
      data-test="statement-hidden-count"
    >
      {{ hiddenCountLine(hiddenCount) }}
    </p>
  </div>
</template>

<script setup lang="ts">
// One switch for the two families of noise — what you marked and the paired transfer
// legs — because they are the same idea to whoever reads a month, and telling them
// apart is already done row by row with the `Not counted` and `Transfer` labels of the
// F22 (decisions.md 🔴 1). It is dumb: it keeps no state, hides nothing itself (the
// backend does, R2) and only says what the store handed it.
//
// The line beside it is a COUNT and never an amount: with `excluded=only` or
// `transfer=only` the three figures come back at `"0.00"` by construction, so the «how
// much» does not exist in any response, and computing it here is the invented
// arithmetic this screen has spent five features avoiding (R8, C3). Null means the
// switch is off or the extra read failed, and then nothing at all is painted (R9).
import BaseCheckbox from '@/shared/components/BaseCheckbox.vue'

import { hiddenCountLine } from '../filters'

withDefaults(
  defineProps<{
    /** The switch as the URL says it is: the view owns it, this does not (R4). */
    modelValue: boolean
    /** How many movements are held back, or null to say nothing (R7, R9). */
    hiddenCount?: number | null
    disabled?: boolean
  }>(),
  { hiddenCount: null, disabled: false },
)

const emit = defineEmits<{ change: [boolean] }>()
</script>
