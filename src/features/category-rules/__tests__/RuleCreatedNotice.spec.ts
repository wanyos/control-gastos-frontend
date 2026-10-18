import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import RuleCreatedNotice from '../components/RuleCreatedNotice.vue'
import { parseSavedRule } from '../service'
import { ACADEMY_CREATED, ACADEMY_RULE, ACADEMY_UNFINISHED, NOTHING_MOVED, saved } from './fixtures'

const UNFINISHED =
  'Not all of its movements could be moved; the rest will move the next time you create or change a rule.'

describe('RuleCreatedNotice (feature 33)', () => {
  it('says how many movements the new rule categorized and offers no Apply rules now', () => {
    const wrapper = mount(RuleCreatedNotice, {
      props: { saved: parseSavedRule(ACADEMY_CREATED) },
    })

    expect(wrapper.get('[data-test="rule-created-line"]').text()).toBe(
      'Rule “academia ficticia norte” → Educación created: 3 movements categorized.',
    )
    expect(wrapper.find('[data-test="apply-rules-now"]').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Apply rules now')
    expect(wrapper.find('[data-test="rule-created-unfinished"]').exists()).toBe(false)

    const none = mount(RuleCreatedNotice, {
      props: { saved: parseSavedRule(saved(ACADEMY_RULE, NOTHING_MOVED)) },
    })
    expect(none.get('[data-test="rule-created-line"]').text()).toBe(
      'Rule “academia ficticia norte” → Educación created: no movements were categorized.',
    )
  })

  it('adds the unfinished sentence when the pass of the new rule did not finish', () => {
    const wrapper = mount(RuleCreatedNotice, {
      props: { saved: parseSavedRule(ACADEMY_UNFINISHED) },
    })

    expect(wrapper.get('[data-test="rule-created-line"]').text()).toBe(
      'Rule “academia ficticia norte” → Educación created: 1 movement categorized.',
    )
    expect(wrapper.get('[data-test="rule-created-unfinished"]').text()).toBe(UNFINISHED)
    // The Spanish message of the backend is never painted.
    expect(wrapper.text()).not.toContain('La pasada se cortó')
  })
})
