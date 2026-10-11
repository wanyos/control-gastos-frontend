import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import TransfersActionNotice from '../components/TransfersActionNotice.vue'

const noticeOf = (props: Record<string, unknown> = {}) => mount(TransfersActionNotice, { props })

describe('TransfersActionNotice (R6, R7, R12, R13)', () => {
  it('says what the last write did and offers Undo with no countdown', async () => {
    const notice = noticeOf({ summary: 'Pair unlinked.', undoable: true })

    expect(notice.get('[data-test="transfers-action-summary"]').text()).toContain('Pair unlinked.')
    expect(notice.text()).not.toMatch(/\d+\s*s/)

    await notice.get('[data-test="transfers-action-undo"]').trigger('click')
    expect(notice.emitted('undo')).toHaveLength(1)
  })

  it('keeps the sentence and drops the button once there is nothing to put back', () => {
    const notice = noticeOf({ summary: 'Pair linked again.', undoable: false })

    expect(notice.get('[data-test="transfers-action-summary"]').text()).toBe('Pair linked again.')
    expect(notice.find('[data-test="transfers-action-undo"]').exists()).toBe(false)
  })

  it('the error wins over the summary: never both at once', () => {
    const notice = noticeOf({
      summary: 'Pair unlinked.',
      error: 'Nothing changed.',
      undoable: true,
    })

    expect(notice.get('[data-test="transfers-action-error"]').text()).toBe('Nothing changed.')
    expect(notice.find('[data-test="transfers-action-summary"]').exists()).toBe(false)
    expect(notice.find('[data-test="transfers-action-undo"]').exists()).toBe(false)
  })

  it('shows nothing while nothing has happened, and the Undo waits while busy', () => {
    expect(noticeOf().text()).toBe('')
    expect(
      noticeOf({ summary: 'x', undoable: true, busy: true })
        .get('[data-test="transfers-action-undo"]')
        .attributes('disabled'),
    ).toBeDefined()
  })

  it('the Undo button shows the word Undo with a border and no icon', () => {
    const undo = noticeOf({ summary: 'Pair unlinked.', undoable: true }).get(
      '[data-test="transfers-action-undo"]',
    )

    expect(undo.text()).toBe('Undo')
    expect(undo.find('svg').exists()).toBe(false)
    // The `secondary` look of BaseButton: a visible edge on a card-coloured fill. Composed
    // at runtime: Tailwind reads the specs as text too (docs/stack.md).
    expect(undo.classes()).toEqual(
      expect.arrayContaining([
        ['border', 'line', 'default'].join('-'),
        ['bg', 'surface', 'card'].join('-'),
      ]),
    )
    expect(undo.classes()).not.toContain(['bg', 'transparent'].join('-'))
  })
})
