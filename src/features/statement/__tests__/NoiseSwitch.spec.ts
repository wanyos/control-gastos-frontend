import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import NoiseSwitch from '../components/NoiseSwitch.vue'

const mountSwitch = (props: Record<string, unknown> = {}) =>
  mount(NoiseSwitch, { props: { modelValue: false, ...props } })

describe('NoiseSwitch (R1, R7, R8)', () => {
  it('is a single box with one label, and it starts off (R1)', () => {
    const noise = mountSwitch()

    expect(noise.findAll('input[type="checkbox"]')).toHaveLength(1)
    expect(noise.text()).toContain('Hide what does not count')
    expect(noise.get('input').element.checked).toBe(false)
  })

  it('does not decide anything: it asks to be turned on and off (R4)', async () => {
    const noise = mountSwitch()

    await noise.get('input').setValue(true)
    expect(noise.emitted('change')).toEqual([[true]])
    // It asked, and that is all: what it paints is still the prop it was given, which
    // only the URL writes (R4).
    expect(noise.props('modelValue')).toBe(false)

    const on = mountSwitch({ modelValue: true })
    expect(on.get('input').element.checked).toBe(true)
    await on.get('input').setValue(false)
    expect(on.emitted('change')).toEqual([[false]])
  })

  it('says how many movements are held back, next to the box (R7)', () => {
    expect(mountSwitch({ modelValue: true, hiddenCount: 34 }).text()).toContain(
      'Hiding 34 movements',
    )
    expect(
      mountSwitch({ modelValue: true, hiddenCount: 1 })
        .get('[data-test="statement-hidden-count"]')
        .text(),
    ).toBe('Hiding 1 movement')
  })

  it('says nothing at all with no number: off, or after a failed count (R9)', () => {
    expect(mountSwitch().find('[data-test="statement-hidden-count"]').exists()).toBe(false)
    expect(
      mountSwitch({ modelValue: true, hiddenCount: null })
        .find('[data-test="statement-hidden-count"]')
        .exists(),
    ).toBe(false)
  })

  it('never shows an amount of what is hidden: there is none to show (R8, C3)', () => {
    const text = mountSwitch({ modelValue: true, hiddenCount: 34 }).text()

    expect(text).not.toContain('€')
    expect(text).not.toMatch(/\d+[.,]\d\d/)
    expect(text).toBe('Hide what does not countHiding 34 movements')
  })
})
