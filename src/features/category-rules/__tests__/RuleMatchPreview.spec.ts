import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseMovementPage } from '@/shared/movements'
import type { Movement } from '@/shared/movements'

import RuleMatchPreview from '../components/RuleMatchPreview.vue'
import type { MatchPreview } from '../types'
import { movement, movementPage } from './fixtures'

// The four states of the preview block (feature 18). Read only: it paints numbers
// and movements, and offers no control at all.

const samplesOf = (descriptions: string[]): Movement[] =>
  parseMovementPage(movementPage(descriptions.map((one, i) => movement(10 + i, one)))).movements

const SIX = samplesOf([
  'COMPRA MERCADONA VALENCIA',
  'COMPRA TARJ. MERCADONA',
  'MERCADONA ALBORAYA',
  'MERCADONA GANDIA',
  'MERCADONA XATIVA',
  'MERCADONA SUECA',
])

const ready = (total: number, samples: Movement[] = SIX.slice(0, 2)): MatchPreview => ({
  step: 'ready',
  text: 'mercadona',
  total,
  samples,
})

const paint = (preview: MatchPreview) => mount(RuleMatchPreview, { props: { preview } })

describe('RuleMatchPreview (R3, R4, R5, R6, R9, R10)', () => {
  it('shows nothing at all while there is nothing to say', () => {
    const wrapper = paint({ step: 'idle' })

    expect(wrapper.find('[data-test="rule-preview"]').exists()).toBe(false)
  })

  it('says it is counting, without hiding anything else (R9)', () => {
    const wrapper = paint({ step: 'loading', text: 'mercadona' })

    expect(wrapper.get('[data-test="rule-preview-loading"]').text()).toContain('Counting')
    expect(wrapper.find('[data-test="rule-preview-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="rule-preview-sample"]').exists()).toBe(false)
  })

  it('reads the count in a sentence about what is pending and uncategorized (R3)', () => {
    expect(paint(ready(34)).get('[data-test="rule-preview-count"]').text()).toBe(
      '34 pending movements without a category contain this text.',
    )
    expect(paint(ready(1)).get('[data-test="rule-preview-count"]').text()).toBe(
      '1 pending movement without a category contains this text.',
    )
  })

  it('shows each example with its date, its description and its amount (R4)', () => {
    const wrapper = paint(ready(34))

    const rows = wrapper.findAll('[data-test="rule-preview-sample"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('COMPRA MERCADONA VALENCIA')
    expect(rows[0]?.text()).toContain('31 Jul 2026')
    expect(rows[0]?.text()).toContain('-45,37')
  })

  it('never shows more than five examples (R4)', () => {
    const wrapper = paint(ready(34, SIX))

    expect(wrapper.findAll('[data-test="rule-preview-sample"]')).toHaveLength(5)
  })

  it('warns when the text matches too many, and still shows them (R5)', () => {
    const wrapper = paint(ready(51))

    expect(wrapper.get('[data-test="rule-preview-warning"]').text()).toBe(
      'That is a lot — check the examples below before you save.',
    )
    expect(wrapper.findAll('[data-test="rule-preview-sample"]')).toHaveLength(2)
  })

  it('says nothing about breadth just below the limit (R5)', () => {
    expect(paint(ready(50)).find('[data-test="rule-preview-warning"]').exists()).toBe(false)
  })

  it('says clearly when nothing matches (R6)', () => {
    const wrapper = paint(ready(0, []))

    expect(wrapper.get('[data-test="rule-preview-warning"]').text()).toBe(
      'Nothing pending without a category contains this text right now.',
    )
    expect(wrapper.find('[data-test="rule-preview-sample"]').exists()).toBe(false)
  })

  it('admits the number is an estimate, right under it', () => {
    expect(paint(ready(34)).get('[data-test="rule-preview-note"]').text()).toBe(
      'Estimate: what a pass would look at today, not what it will change.',
    )
  })

  it('shows the English sentence of a failed count, and no number (R10)', () => {
    const wrapper = paint({
      step: 'failed',
      text: 'mercadona',
      message: "Couldn't reach the server, so the count is unknown.",
    })

    expect(wrapper.get('[data-test="rule-preview-error"]').text()).toBe(
      "Couldn't reach the server, so the count is unknown.",
    )
    expect(wrapper.find('[data-test="rule-preview-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="rule-preview-sample"]').exists()).toBe(false)
  })

  it('offers no control: it only looks (C1)', () => {
    const wrapper = paint(ready(34))

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(false)
  })
})
