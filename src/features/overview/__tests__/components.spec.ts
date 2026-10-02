import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import MonthFiguresGrid from '../components/MonthFiguresGrid.vue'
import MonthSentence from '../components/MonthSentence.vue'
import UncategorizedLine from '../components/UncategorizedLine.vue'
import UsualLine from '../components/UsualLine.vue'
import { buildComparison, priorMonths } from '../reading'
import { figuresOf } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

const AUGUST = figuresOf('2026-08')
const AUGUST_COMPARISON = buildComparison(AUGUST, priorMonths('2026-08').map(figuresOf))

describe('MonthSentence (R4)', () => {
  it('paints the sentence it is given, as it is', () => {
    const wrapper = mount(MonthSentence, { props: { text: 'No movements in October 2026.' } })

    expect(wrapper.get('[data-test="overview-sentence"]').text()).toBe(
      'No movements in October 2026.',
    )
  })
})

describe('MonthFiguresGrid (R5–R8, R10)', () => {
  const values = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('[data-test="money"]').map((node) => node.text())

  it('formats the backend strings letter by letter, in the order in / out / savings / rate', () => {
    const wrapper = mount(MonthFiguresGrid, {
      props: { totals: AUGUST.totals, state: 'complete', comparison: null },
    })

    expect(values(wrapper)).toEqual([
      eur('2.590,26'),
      eur('4.003,89'),
      eur('-1.413,63'),
      `-54,6${NBSP}%`,
    ])
    expect(wrapper.find('[data-test="overview-usual"]').exists()).toBe(false)
  })

  it('does not recompute the savings: a net that does not add up is painted as it came', () => {
    const wrapper = mount(MonthFiguresGrid, {
      props: {
        totals: { income: '100.00', expense: '40.00', net: '75.00' },
        state: 'complete',
        comparison: null,
      },
    })

    expect(values(wrapper)[2]).toBe(eur('75,00'))
    expect(values(wrapper)[3]).toBe(`75,0${NBSP}%`)
  })

  it('shows a positive rate with one decimal in a month of savings (R6)', () => {
    const wrapper = mount(MonthFiguresGrid, {
      props: { totals: figuresOf('2026-01').totals, state: 'complete', comparison: null },
    })

    expect(values(wrapper)[3]).toBe(`39,2${NBSP}%`)
    expect(wrapper.find('[data-test="overview-rate-note"]').exists()).toBe(false)
  })

  it('puts a dash and the reason when the month is incomplete (R8)', () => {
    const wrapper = mount(MonthFiguresGrid, {
      props: { totals: figuresOf('2026-09').totals, state: 'incomplete', comparison: null },
    })

    expect(values(wrapper)[3]).toBe('—')
    expect(wrapper.get('[data-test="overview-rate-note"]').text()).toBe(
      'Not shown: the month is incomplete.',
    )
  })

  it('puts a dash and the reason when nothing came in (R7)', () => {
    const wrapper = mount(MonthFiguresGrid, {
      props: {
        totals: { income: '0.00', expense: '966.84', net: '-966.84' },
        state: 'complete',
        comparison: null,
      },
    })

    expect(values(wrapper)[3]).toBe('—')
    expect(wrapper.get('[data-test="overview-rate-note"]').text()).toBe(
      'No income this month, so there is no savings rate.',
    )
  })

  it('stands the usual month under Money in and Money out only (R10)', () => {
    const wrapper = mount(MonthFiguresGrid, {
      props: { totals: AUGUST.totals, state: 'complete', comparison: AUGUST_COMPARISON },
    })

    expect(wrapper.findAll('[data-test="overview-usual"]')).toHaveLength(2)
    expect(wrapper.get('[data-test="overview-in"] [data-test="overview-verdict"]').text()).toBe(
      'About usual',
    )
    expect(wrapper.get('[data-test="overview-out"] [data-test="overview-verdict"]').text()).toBe(
      'More than usual',
    )
    expect(wrapper.find('[data-test="overview-net"] [data-test="overview-usual"]').exists()).toBe(
      false,
    )
  })

  it('stands nothing when there was no earlier month to compare with (R10)', () => {
    const comparison = buildComparison(figuresOf('2024-01'), [])
    const wrapper = mount(MonthFiguresGrid, {
      props: { totals: figuresOf('2024-01').totals, state: 'complete', comparison },
    })

    expect(wrapper.find('[data-test="overview-usual"]').exists()).toBe(false)
  })
})

describe('UsualLine (R10)', () => {
  it.each([
    ['usual', 'About usual'],
    ['more', 'More than usual'],
    ['less', 'Less than usual'],
  ] as const)('labels a %s verdict as %s', (verdict, label) => {
    const wrapper = mount(UsualLine, {
      props: { comparison: { usual: '2950.00', differencePermille: 100, verdict } },
    })

    expect(wrapper.get('[data-test="overview-verdict"]').text()).toBe(label)
  })

  it('has no label against a usual month of zero, only the figure', () => {
    const wrapper = mount(UsualLine, {
      props: { comparison: { usual: '0.00', differencePermille: null, verdict: null } },
    })

    expect(wrapper.find('[data-test="overview-verdict"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="overview-usual-text"]').text()).toBe(
      `Your usual month is ${eur('0,00')}`,
    )
  })
})

describe('UncategorizedLine (R12, R14)', () => {
  it('paints the line and a bar as wide as the share', () => {
    const wrapper = mount(UncategorizedLine, {
      props: { load: 'ready', uncategorized: { amount: '3036.33', count: 48 }, expense: '4003.89' },
    })

    expect(wrapper.get('[data-test="overview-uncategorized-line"]').text()).toBe(
      `${eur('3.036,33')} of this month's ${eur('4.003,89')} spending has no category yet (75,8${NBSP}%, 48 movements).`,
    )
    expect(wrapper.get('[data-test="share-bar-fill"]').attributes('style')).toContain(
      'width: 75.8%',
    )
  })

  it('says everything has a category, with no bar', () => {
    const wrapper = mount(UncategorizedLine, {
      props: { load: 'ready', uncategorized: { amount: '0.00', count: 0 }, expense: '4003.89' },
    })

    expect(wrapper.get('[data-test="overview-uncategorized-line"]').text()).toBe(
      "All of this month's spending has a category.",
    )
    expect(wrapper.find('[data-test="share-bar-fill"]').exists()).toBe(false)
  })

  it('says it could not check, instead of keeping quiet', () => {
    const wrapper = mount(UncategorizedLine, {
      props: { load: 'error', uncategorized: null, expense: '4003.89' },
    })

    expect(wrapper.get('[data-test="overview-uncategorized-error"]').text()).toBe(
      "Couldn't check how much of this spending has a category.",
    )
  })

  it('paints nothing while it is still being read', () => {
    const wrapper = mount(UncategorizedLine, {
      props: { load: 'loading', uncategorized: null, expense: '4003.89' },
    })

    expect(wrapper.find('[data-test="overview-uncategorized"]').exists()).toBe(false)
  })
})
