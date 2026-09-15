<template>
  <p class="flex flex-wrap items-baseline gap-x-2" data-test="file-heading">
    <span class="font-mono text-sm break-all text-ink-body" data-test="file-heading-name">
      {{ file.name }}
    </span>
    <span class="text-xs text-ink-muted" data-test="file-heading-origin">
      {{ file.bank }} · {{ file.year }}
    </span>
  </p>
</template>

<script setup lang="ts">
// The file a group of report rows belongs to: name, readable bank and year.
import type { FileHeading } from '../details'

defineProps<{ file: FileHeading }>()
</script>
