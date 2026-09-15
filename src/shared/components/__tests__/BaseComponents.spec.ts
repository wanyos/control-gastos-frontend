import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseBadge from '../BaseBadge.vue'
import BaseButton from '../BaseButton.vue'
import BaseCard from '../BaseCard.vue'
import BaseSpinner from '../BaseSpinner.vue'
import ShareBar from '../ShareBar.vue'
import StatCard from '../StatCard.vue'

// Class names are composed at runtime: a literal in a spec would end up in the
// production CSS, because Tailwind scans src/ as text (docs/stack.md).
const cls = (...parts: string[]) => parts.join('-')

describe('BaseCard', () => {
  it('renders title, subtitle slot, action slot and body', () => {
    const wrapper = mount(BaseCard, {
      props: { title: 'By bank' },
      slots: { default: '<p>body</p>', subtitle: '<b>12 €</b>', action: '<i>act</i>' },
    })

    expect(wrapper.get('h2').text()).toBe('By bank')
    expect(wrapper.get('b').text()).toBe('12 €')
    expect(wrapper.get('i').text()).toBe('act')
    expect(wrapper.get('p').text()).toBe('body')
  })

  it('renders no header without title or action', () => {
    const wrapper = mount(BaseCard, { slots: { default: 'only body' } })

    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.text()).toBe('only body')
  })
})

describe('BaseBadge', () => {
  it('uses the soft tone utilities and an optional dot', () => {
    const wrapper = mount(BaseBadge, {
      props: { tone: 'warning', dot: true },
      slots: { default: 'Warning' },
    })

    expect(wrapper.text()).toBe('Warning')
    expect(wrapper.classes()).toContain(cls('bg', 'warning', 'subtle'))
    expect(wrapper.get('span > span').classes()).toContain(cls('bg', 'warning'))
  })

  it('defaults to a neutral badge without dot', () => {
    const wrapper = mount(BaseBadge, { slots: { default: 'x' } })

    expect(wrapper.find('span > span').exists()).toBe(false)
    expect(wrapper.classes()).toContain(cls('bg', 'surface', 'sunken'))
  })
})

describe('StatCard', () => {
  it('shows the label and the formatted value in mono tabular figures', () => {
    const wrapper = mount(StatCard, {
      props: { label: 'Net worth', value: '1.234,56 €' },
      slots: { default: 'sentence' },
    })

    const money = wrapper.get('[data-test="money"]')
    expect(wrapper.text()).toContain('Net worth')
    expect(money.text()).toBe('1.234,56 €')
    expect(money.classes()).toEqual(
      expect.arrayContaining([cls('font', 'mono'), cls('tabular', 'nums')]),
    )
    expect(wrapper.text()).toContain('sentence')
  })
})

describe('ShareBar', () => {
  it.each([
    [383, '38.3%'],
    [0, '0%'],
    [1000, '100%'],
    [-50, '0%'],
    [1200, '100%'],
  ])('permille %i fills %s of the track', (permille, width) => {
    const wrapper = mount(ShareBar, { props: { permille, fillClass: cls('bg', 'chart', '1') } })

    const fill = wrapper.get('[data-test="share-bar-fill"]')
    expect((fill.element as HTMLElement).style.width).toBe(width)
    expect(fill.classes()).toContain(cls('bg', 'chart', '1'))
  })
})

describe('BaseButton (feature 13)', () => {
  it.each([
    ['primary', [cls('bg', 'brand'), cls('text', 'ink', 'on', 'brand')]],
    ['secondary', [cls('bg', 'surface', 'card'), cls('border', 'line', 'default')]],
    ['ghost', [cls('bg', 'transparent'), cls('text', 'ink', 'muted')]],
  ] as const)('paints the %s variant with semantic tokens', (variant, classes) => {
    const wrapper = mount(BaseButton, { props: { variant }, slots: { default: 'Import' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.classes()).toEqual(expect.arrayContaining([...classes]))
    expect(wrapper.text()).toBe('Import')
  })

  it('shows its icon slot and is enabled by default', () => {
    const wrapper = mount(BaseButton, {
      slots: { default: 'Import', icon: '<svg data-test="icon" />' },
    })

    expect(wrapper.find('[data-test="icon"]').exists()).toBe(true)
    expect(wrapper.attributes('disabled')).toBeUndefined()
    expect(wrapper.attributes('aria-busy')).toBeUndefined()
  })

  it('while loading swaps the icon for a spinner, disables itself and is busy, without dimming', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      slots: { default: 'Importing…', icon: '<svg data-test="icon" />' },
    })

    expect(wrapper.find('[data-test="icon"]').exists()).toBe(false)
    expect(wrapper.findComponent(BaseSpinner).exists()).toBe(true)
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.classes().join(' ')).not.toContain(cls('opacity', '50'))
    expect(wrapper.text()).toBe('Importing…')
  })

  it('dims when disabled without loading', () => {
    const wrapper = mount(BaseButton, { props: { disabled: true }, slots: { default: 'Go' } })

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes().join(' ')).toContain(cls('opacity', '50'))
  })
})

describe('BaseSpinner (feature 13)', () => {
  it('is decorative by default and stops turning with reduced motion', () => {
    const wrapper = mount(BaseSpinner)

    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([cls('animate', 'spin'), `motion-reduce:${cls('animate', 'none')}`]),
    )
    expect((wrapper.element as HTMLElement).style.width).toBe('14px')
  })

  it('is a status with its label when it has one', () => {
    const wrapper = mount(BaseSpinner, { props: { label: 'Loading', size: 20 } })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.text()).toBe('Loading')
  })
})
