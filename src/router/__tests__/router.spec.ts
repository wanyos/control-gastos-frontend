import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { Link2 } from '@lucide/vue'

import StatementView from '@/features/statement/views/StatementView.vue'
import TransfersView from '@/features/transfers/views/TransfersView.vue'
import PlaceholderView from '@/shared/components/PlaceholderView.vue'

import { HOME_ROUTE_NAME, REVIEW_ROUTE_NAME, navEntries, routes } from '../index'

/** The Spanish labels the design system's Shell.jsx ships; none may survive the port. */
const DESIGN_SYSTEM_LABELS = [
  'Resumen',
  'Cuentas',
  'Movimientos',
  'Presupuestos',
  'Inversiones',
  'Metas de ahorro',
]

const newRouter = () => createRouter({ history: createMemoryHistory(), routes })

describe('router', () => {
  // The list grew with /rules in feature 17 (right below Review) and with /transfers in
  // feature 24 (right below Rules).
  it('declares the seven navigable routes with English paths', () => {
    const paths = routes.filter((route) => route.name).map((route) => route.path)

    expect(paths).toEqual([
      '/net-worth',
      '/review',
      '/rules',
      '/transfers',
      '/overview',
      '/movements',
      '/investments',
    ])
  })

  it('sends the root path to the net worth home', async () => {
    const router = newRouter()

    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe(HOME_ROUTE_NAME)
    expect(router.currentRoute.value.path).toBe('/net-worth')
  })

  it.each([
    '/net-worth',
    '/review',
    '/rules',
    '/transfers',
    '/overview',
    '/movements',
    '/investments',
  ])('resolves %s to a component', (path) => {
    const matched = newRouter().resolve(path).matched

    expect(matched).toHaveLength(1)
    expect(matched[0]?.components?.default).toBeTruthy()
  })

  it('mounts the transfers screen on /transfers, with the Link2 icon (feature 24)', () => {
    expect(newRouter().resolve('/transfers').matched[0]?.components?.default).toBe(TransfersView)
    expect(navEntries.find((entry) => entry.name === 'transfers')?.icon).toBe(Link2)
  })

  it('no longer resolves /import: importing lives in the topbar (feature 13)', () => {
    expect(newRouter().resolve('/import').matched).toEqual([])
    expect(routes.some((route) => route.name === 'import')).toBe(false)
  })

  // Feature 19 retired the placeholder: /movements is the statement, and it is still
  // not the review queue (the two screens never became one).
  it('mounts the statement on /movements, and it is not the review queue', () => {
    const review = newRouter().resolve('/review').matched[0]?.components?.default
    const movements = newRouter().resolve('/movements').matched[0]?.components?.default

    expect(review).toBeTruthy()
    expect(movements).toBe(StatementView)
    expect(movements).not.toBe(review)
    expect(movements).not.toBe(PlaceholderView)
  })

  it('does not resolve an unknown path to any component', () => {
    expect(newRouter().resolve('/nope').matched).toEqual([])
  })

  it('exposes one navigation entry per navigable route, in sidebar order', () => {
    expect(navEntries.map((entry) => entry.name)).toEqual([
      HOME_ROUTE_NAME,
      REVIEW_ROUTE_NAME,
      'rules',
      'transfers',
      'overview',
      'movements',
      'investments',
    ])
    expect(navEntries.map((entry) => entry.label)).toEqual([
      'Net Worth',
      'Review',
      'Rules',
      'Transfers',
      'Overview',
      'Movements',
      'Investments',
    ])
    for (const entry of navEntries) {
      expect(entry.icon, `${entry.name} has no icon`).toBeTruthy()
    }
  })

  it('leaves no Spanish label or path behind from the design system', () => {
    const surface = [
      ...navEntries.map((entry) => entry.label),
      ...routes.map((route) => route.path),
      ...routes.map((route) => String(route.name ?? '')),
    ].join(' ')

    for (const label of DESIGN_SYSTEM_LABELS) {
      expect(surface).not.toContain(label)
    }
  })
})
