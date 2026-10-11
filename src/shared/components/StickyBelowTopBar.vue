<template>
  <div
    ref="block"
    class="sticky top-[var(--topbar-h)] z-[var(--z-sticky)] -my-2 bg-surface-app py-2"
    data-test="sticky-below-top-bar"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
// Keeps its slot in view right under the top bar once the page is scrolled; at rest it
// sits where it is written. The background is opaque, so the screen must not render it
// empty. The padding and the negative margin cancel out: nothing moves at rest.
import { nextTick, onMounted, onUpdated, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  /**
   * CSS selector of the one row the last action touched, or null. If that row is
   * still on the page and ends up under this block, the page moves up just enough.
   */
  keepClearOf?: string | null
}>()

const block = useTemplateRef<HTMLElement>('block')

/** True from the moment a measure is asked for until it is taken: one measure per frame. */
let waiting = false

/**
 * Measured when the block appears, when the row to keep clear changes and every time
 * what the slot shows is rendered again (a second action on the same row changes the
 * sentence, not the selector). Never on scroll: afterwards rows pass under the block.
 */
async function keepRowClear(): Promise<void> {
  if (waiting) return
  waiting = true
  await nextTick()
  await new Promise<void>((done) => requestAnimationFrame(() => done()))
  waiting = false

  const own = block.value
  const row = props.keepClearOf ? document.querySelector(props.keepClearOf) : null
  if (!own || !row) return

  const blockBox = own.getBoundingClientRect()
  const rowBox = row.getBoundingClientRect()
  const overlap = blockBox.bottom - rowBox.top
  // A row that ends above the block is off the top of the window, not under the block.
  if (overlap <= 0 || rowBox.bottom <= blockBox.top) return
  // Rows have fractional heights and the browser keeps the page at a whole pixel: asked
  // for 48.0625 px it moves 48 and leaves the row 0.0625 px under the block. Rounded up,
  // the row ends less than one pixel below the block instead.
  window.scrollBy({ top: -Math.ceil(overlap) })
}

onMounted(keepRowClear)
onUpdated(keepRowClear)
watch(() => props.keepClearOf, keepRowClear)
</script>
