<template>
  <div class="flex flex-col gap-3" data-test="pending-list">
    <component
      :is="isFolded ? 'details' : 'section'"
      v-for="bank in pending.banks"
      :key="bank.bank"
      data-test="pending-bank"
    >
      <summary v-if="isFolded" class="cursor-pointer text-base font-semibold text-ink-strong">
        {{ bankLabel(bank.bank) }} · {{ plural(fileCount(bank), 'file') }}
      </summary>
      <h3 v-else class="text-base font-semibold text-ink-strong">{{ bankLabel(bank.bank) }}</h3>
      <div
        v-for="year in bank.years"
        :key="year.year"
        class="mt-1.5 flex flex-col gap-0.5 pl-3"
        data-test="pending-year"
      >
        <span class="text-sm text-ink-muted">{{ year.year }}</span>
        <ul class="flex flex-col gap-0.5">
          <li
            v-for="file in year.pending"
            :key="file.fileId"
            class="font-mono text-sm break-all text-ink-body"
            data-test="pending-file"
          >
            {{ file.name }}
          </li>
        </ul>
      </div>
    </component>
  </div>
</template>

<script setup lang="ts">
// Pending files grouped bank → year → file. Past 8 files every bank folds into a
// closed <details> with its count, so a long list does not push the actions away.
import { computed } from 'vue'

import { bankLabel } from '@/shared/banks'

import { plural } from '../summary'
import type { PendingBank, PendingFiles } from '../types'

const UNFOLDED_MAX = 8

const props = defineProps<{ pending: PendingFiles }>()

const fileCount = (bank: PendingBank) =>
  bank.years.reduce((total, year) => total + year.pending.length, 0)

const isFolded = computed(
  () => props.pending.banks.reduce((total, bank) => total + fileCount(bank), 0) > UNFOLDED_MAX,
)
</script>
