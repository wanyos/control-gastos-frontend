import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseBadge from '../BaseBadge.vue'
import BaseCard from '../BaseCard.vue'
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
