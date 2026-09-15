<template>
  <section v-if="files.length > 0" class="flex flex-col gap-2" data-test="file-issues">
    <h3 class="text-base font-semibold text-ink-strong">Needs attention</h3>
    <ul class="flex flex-col gap-2">
      <li
        v-for="file in files"
        :key="`${file.bank}/${file.year}/${file.fileId}`"
        class="flex flex-col gap-1 rounded-md bg-surface-sunken px-3 py-2.5"
        data-test="file-issue"
      >
        <span class="text-xs text-ink-body">{{ bankLabel(file.bank) }} · {{ file.year }}</span>
        <span class="font-mono text-sm break-all text-ink-body" data-test="file-issue-name">
          {{ file.name }}
        </span>
        <span class="text-sm text-ink-body" data-test="file-issue-message">
          {{ fileIssueMessage(file) }}
        </span>
        <details v-if="fileIssueDetails(file) !== null" class="text-sm text-ink-muted">
          <summary class="cursor-pointer">Details</summary>
          <p lang="es" class="mt-1 break-words" data-test="file-issue-details">
            {{ fileIssueDetails(file) }}
          </p>
        </details>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// Files that did not go in, each with its English explanation and the backend's
// original (Spanish) message folded in Details.
import { bankLabel } from '@/shared/banks'

import { fileIssueDetails, fileIssueMessage } from '../fileMessages'
import type { FileReport } from '../types'

defineProps<{ files: FileReport[] }>()
</script>
