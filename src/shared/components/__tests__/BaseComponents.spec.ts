import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseBadge from '../BaseBadge.vue'
import BaseButton from '../BaseButton.vue'
import BaseCard from '../BaseCard.vue'
import BaseCheckbox from '../BaseCheckbox.vue'
import BaseInput from '../BaseInput.vue'
import BaseSelect from '../BaseSelect.vue'
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

describe('BaseInput (feature 15)', () => {
  it('ties its label to the field and emits what the user types', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '', label: 'Search' } })

    const input = wrapper.get('input')
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(wrapper.get('label').text()).toBe('Search')
    expect(input.attributes('type')).toBe('text')

    await input.setValue('cafeteria')

    expect(wrapper.emitted('update:modelValue')).toEqual([['cafeteria']])
  })

  it('renders a date field and shows its hint', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '2026-08-01', label: 'From', type: 'date', hint: 'Booking date' },
    })

    expect(wrapper.get('input').attributes('type')).toBe('date')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('2026-08-01')
    expect(wrapper.text()).toContain('Booking date')
  })

  it('marks itself invalid for assistive technology and paints the hint as an error', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: 'x', label: 'Search', invalid: true, hint: 'Too long' },
    })

    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('input').classes()).toContain(cls('border', 'negative'))
    expect(wrapper.get('p').classes()).toContain(cls('text', 'negative'))
  })
})

describe('BaseSelect (feature 15)', () => {
  it('ties its label to the field, renders the slot and emits the chosen value', async () => {
    const wrapper = mount(BaseSelect, {
      props: { modelValue: '', label: 'Account' },
      slots: { default: '<option value="">All accounts</option><option value="3">N26</option>' },
    })

    const select = wrapper.get('select')
    expect(wrapper.get('label').attributes('for')).toBe(select.attributes('id'))
    expect(wrapper.findAll('option')).toHaveLength(2)

    await select.setValue('3')

    expect(wrapper.emitted('update:modelValue')).toEqual([['3']])
  })

  it('disables itself and shows why when told to', () => {
    const wrapper = mount(BaseSelect, {
      props: { modelValue: '', label: 'Category', disabled: true, hint: 'Categories unavailable' },
    })

    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Categories unavailable')
  })

  it('hides the label without losing it, so a row can repeat the field (feature 16)', () => {
    const wrapper = mount(BaseSelect, {
      props: { modelValue: '', label: 'Category', labelHidden: true },
    })

    const label = wrapper.get('label')
    expect(label.text()).toBe('Category')
    expect(label.classes()).toContain(cls('sr', 'only'))
    expect(label.attributes('for')).toBe(wrapper.get('select').attributes('id'))
  })
})

describe('BaseCheckbox (feature 15)', () => {
  it('shows its label and emits the new state', async () => {
    const wrapper = mount(BaseCheckbox, { props: { modelValue: false, label: 'Uncategorized' } })

    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('checkbox')
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(wrapper.text()).toBe('Uncategorized')

    await input.setValue(true)

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('reflects the model without owning it', () => {
    const wrapper = mount(BaseCheckbox, { props: { modelValue: true, label: 'Uncategorized' } })

    expect((wrapper.get('input').element as HTMLInputElement).checked).toBe(true)
  })

  it('shows the in-between state when only some of the group is ticked (feature 16)', async () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: false, label: '', indeterminate: true },
    })

    const box = wrapper.get('input').element as HTMLInputElement
    expect(box.indeterminate).toBe(true)

    await wrapper.setProps({ indeterminate: false })
    expect(box.indeterminate).toBe(false)
  })

  it('takes a name of its own when the visible text is elsewhere (feature 16)', () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: false, label: '', ariaLabel: 'Select CAFETERÍA CENTRAL' },
    })

    expect(wrapper.get('input').attributes('aria-label')).toBe('Select CAFETERÍA CENTRAL')
  })

  it('can be switched off, and then emits nothing (feature 16)', async () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: false, label: 'Select all', disabled: true },
    })

    expect(wrapper.get('input').attributes('disabled')).toBeDefined()

    await wrapper.get('input').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
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
