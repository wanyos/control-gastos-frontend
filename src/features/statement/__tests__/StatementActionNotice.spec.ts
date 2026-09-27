import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import StatementActionNotice from '../components/StatementActionNotice.vue'

const mountNotice = (props: Record<string, unknown> = {}) => mount(StatementActionNotice, { props })

describe('StatementActionNotice (R11, R14, C2)', () => {
  it('says what the last write did and offers Undo with no countdown (R11)', () => {
    const notice = mountNotice({ summary: 'Categorized as Groceries', undoable: true })

    expect(notice.get('[data-test="statement-action-summary"]').text()).toContain(
      'Categorized as Groceries',
    )
    expect(notice.get('[data-test="statement-action-undo"]').text()).toContain('Undo')
    // No countdown anywhere: no seconds, no timer, no "dismissing in".
    expect(notice.text()).not.toMatch(/\d+\s*s/)
  })

  it('shows nothing at all while nothing has happened', () => {
    const notice = mountNotice()

    expect(notice.find('[data-test="statement-action-summary"]').exists()).toBe(false)
    expect(notice.find('[data-test="statement-action-error"]').exists()).toBe(false)
  })

  it('the error wins over the summary: never both at once (R14)', () => {
    const notice = mountNotice({
      summary: 'Categorized as Groceries',
      error: "Nothing changed. That movement doesn't accept that category.",
      undoable: true,
    })

    expect(notice.get('[data-test="statement-action-error"]').text()).toBe(
      "Nothing changed. That movement doesn't accept that category.",
    )
    expect(notice.find('[data-test="statement-action-summary"]').exists()).toBe(false)
    expect(notice.find('[data-test="statement-action-undo"]').exists()).toBe(false)
  })

  it('keeps the sentence and drops the button once there is nothing to put back (R12)', () => {
    const notice = mountNotice({ summary: 'Change undone', undoable: false })

    expect(notice.get('[data-test="statement-action-summary"]').text()).toBe('Change undone')
    expect(notice.find('[data-test="statement-action-undo"]').exists()).toBe(false)
  })

  it('the Undo waits while a write is in flight (C2)', () => {
    const notice = mountNotice({
      summary: 'Categorized as Groceries',
      undoable: true,
      busy: true,
    })

    expect(notice.get('[data-test="statement-action-undo"]').attributes('disabled')).toBeDefined()
  })

  it('asks to undo when the button is pressed', async () => {
    const notice = mountNotice({ summary: 'Category removed', undoable: true })

    await notice.get('[data-test="statement-action-undo"]').trigger('click')

    expect(notice.emitted('undo')).toHaveLength(1)
  })
})
