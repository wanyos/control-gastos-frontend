<template>
  <div class="flex flex-col gap-3" data-test="unread-lines">
    <section
      v-for="group in groups"
      :key="`${group.file.bank}/${group.file.year}/${group.file.name}`"
      class="flex flex-col gap-1.5"
      data-test="unread-group"
    >
      <FileHeadingLine :file="group.file" />
      <ul class="flex flex-col gap-1 rounded-md bg-surface-sunken px-3 py-2">
        <li
          v-for="row in group.rows"
          :key="row.row"
          class="flex gap-2 text-sm"
          data-test="unread-line"
        >
          <span class="shrink-0 font-mono text-ink-strong tabular-nums">Line {{ row.row }}</span>
          <span lang="es" class="break-words text-ink-body" data-test="unread-reason">
            {{ row.reason }}
          </span>
        </li>
        <li v-if="group.more !== null" class="text-sm text-ink-muted" data-test="unread-more">
          {{ group.more }}
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Lines of each file that could not be read: the first five, then how many more.
import { computed } from 'vue'

import { unreadLineGroups } from '../details'
import type { ImportReport } from '../types'
import FileHeadingLine from './FileHeadingLine.vue'

const props = defineProps<{ report: ImportReport }>()

const groups = computed(() => unreadLineGroups(props.report))
</script>
