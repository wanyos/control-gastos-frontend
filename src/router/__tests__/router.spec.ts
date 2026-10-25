import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ChartBar, Landmark, LayoutDashboard, Link2 } from '@lucide/vue'

import ExpensesByCategoryView from '@/features/expenses-by-category/views/ExpensesByCategoryView.vue'
import OverviewView from '@/features/overview/views/OverviewView.vue'
import OwnAccountsView from '@/features/own-accounts/views/OwnAccountsView.vue'
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
  // feature 24 (right below Rules), with /monthly-cost in feature 32 (right below Overview),
  // and with /own-accounts in feature 36 (right below Transfers). Feature 37 put
  // /expenses-by-category in the place of /monthly-cost, which it removed.
  it('declares the nine navigable routes with English paths', () => {
    const paths = routes.filter((route) => route.name).map((route) => route.path)

    expect(paths).toEqual([
      '/net-worth',
      '/review',
      '/rules',
      '/transfers',
      '/own-accounts',
      '/overview',
      '/expenses-by-category',
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
    '/own-accounts',
    '/overview',
    '/expenses-by-category',
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

  // Feature 25 retired the placeholder of /overview. Same entry, same icon, same place;
  // the home is still the net worth.
  it('mounts the month at a glance on /overview, not the placeholder (feature 25)', () => {
    const overview = newRouter().resolve('/overview').matched[0]?.components?.default

    expect(overview).toBe(OverviewView)
    expect(overview).not.toBe(PlaceholderView)
    expect(navEntries.find((entry) => entry.name === 'overview')).toMatchObject({
      label: 'Overview',
      icon: LayoutDashboard,
    })
    expect(HOME_ROUTE_NAME).toBe('net-worth')
  })

  it('lists Expenses by category in the menu right below Overview', () => {
    expect(newRouter().resolve('/expenses-by-category').matched[0]?.components?.default).toBe(
      ExpensesByCategoryView,
    )
    const names = navEntries.map((entry) => entry.name)
    expect(names.indexOf('expenses-by-category')).toBe(names.indexOf('overview') + 1)
    expect(navEntries.find((entry) => entry.name === 'expenses-by-category')).toEqual({
      name: 'expenses-by-category',
      label: 'Expenses by category',
      icon: ChartBar,
    })
  })

  // Feature 37 removed the screen of feature 32: no entry, no route, and its old address
  // is treated like any unknown one.
  it('no longer lists Monthly cost and sends its old address to the net worth home', async () => {
    expect(navEntries.some((entry) => entry.label === 'Monthly cost')).toBe(false)
    expect(navEntries.some((entry) => entry.name === 'monthly-cost')).toBe(false)
    expect(routes.some((route) => route.name === 'monthly-cost')).toBe(false)

    const router = newRouter()
    await router.push('/monthly-cost')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe(HOME_ROUTE_NAME)
    expect(router.currentRoute.value.path).toBe('/net-worth')
  })

  it('lists My accounts in the menu right below Transfers', () => {
    expect(newRouter().resolve('/own-accounts').matched[0]?.components?.default).toBe(
      OwnAccountsView,
    )
    const names = navEntries.map((entry) => entry.name)
    expect(names.indexOf('own-accounts')).toBe(names.indexOf('transfers') + 1)
    expect(navEntries.find((entry) => entry.name === 'own-accounts')).toEqual({
      name: 'own-accounts',
      label: 'My accounts',
      icon: Landmark,
    })
  })

  it('no longer resolves /import: importing lives in the topbar (feature 13)', async () => {
    const router = newRouter()
    await router.push('/import')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe(HOME_ROUTE_NAME)
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

  it('sends an unknown path to the net worth home instead of a blank screen (2026-10-16)', async () => {
    const router = newRouter()
    await router.push('/nope/at/all')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe(HOME_ROUTE_NAME)
  })

  it('exposes one navigation entry per navigable route, in sidebar order', () => {
    expect(navEntries.map((entry) => entry.name)).toEqual([
      HOME_ROUTE_NAME,
      REVIEW_ROUTE_NAME,
      'rules',
      'transfers',
      'own-accounts',
      'overview',
      'expenses-by-category',
      'movements',
      'investments',
    ])
    expect(navEntries.map((entry) => entry.label)).toEqual([
      'Net Worth',
      'Review',
      'Rules',
      'Transfers',
      'My accounts',
      'Overview',
      'Expenses by category',
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
