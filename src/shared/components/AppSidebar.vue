<template>
  <aside
    class="sticky top-0 flex h-screen w-[var(--sidebar-w)] shrink-0 flex-col bg-surface-inverse px-4 py-5 text-ink-on-dark"
  >
    <div class="flex items-center gap-3 px-2 pt-1 pb-6">
      <span
        class="font-display text-lg font-extrabold tracking-tight text-ink-on-dark"
        data-test="wordmark"
      >
        control<span class="text-accent">·</span>accounts
      </span>
    </div>

    <nav class="flex flex-col gap-1" aria-label="Main">
      <RouterLink
        v-for="entry in navEntries"
        :key="entry.name"
        v-slot="{ href, isExactActive, navigate }"
        :to="{ name: entry.name }"
        custom
      >
        <a
          :href="href"
          :aria-current="isExactActive ? 'page' : undefined"
          class="block rounded-md transition-colors"
          :class="isExactActive ? 'bg-accent/15' : 'hover:bg-ink-on-dark/5'"
          @click="navigate"
        >
          <!-- The colors live on this span, not on the anchor: the design
               system's base.css paints every `a` with --ink-link from outside
               Tailwind's layers, so a text utility on the anchor would lose. -->
          <span
            class="flex items-center gap-3 px-3 py-2 text-sm"
            :class="isExactActive ? 'font-semibold text-accent' : 'font-medium text-ink-on-dark/70'"
          >
            <component :is="entry.icon" :size="17" aria-hidden="true" />
            {{ entry.label }}
          </span>
        </a>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { navEntries } from '@/router'
</script>

<style scoped>
/* Same reason as the colors above, and here no utility can win: base.css
   underlines `a:hover` from outside Tailwind's layers. Scoped selectors
   outrank it without touching src/assets/styles/. */
nav a:hover {
  text-decoration: none;
}
</style>
