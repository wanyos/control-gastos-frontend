import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import {
  ArrowLeftRight,
  ChartLine,
  LayoutDashboard,
  ListChecks,
  Wallet,
  WandSparkles,
} from '@lucide/vue'
import type { LucideIcon } from '@lucide/vue'

import NetWorthView from '@/features/net-worth/views/NetWorthView.vue'
import RulesView from '@/features/category-rules/views/RulesView.vue'
import ReviewView from '@/features/review/views/ReviewView.vue'
import StatementView from '@/features/statement/views/StatementView.vue'
import PlaceholderView from '@/shared/components/PlaceholderView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Sidebar label and topbar title. Only navigable routes carry it. */
    label?: string
    /** Sidebar icon, imported one by one so the icon set stays tree-shaken. */
    icon?: LucideIcon
  }
}

export const HOME_ROUTE_NAME = 'net-worth'

/** The sidebar needs it to know which entry carries the pending count (feature 15). */
export const REVIEW_ROUTE_NAME = 'review'

/**
 * Routes double as the navigation model: `meta.label` and `meta.icon` are the
 * single source of truth for the sidebar entries and the topbar title, so a
 * route and its navigation entry can never drift apart.
 *
 * Array order is sidebar order. The routes without a view yet render the shared
 * placeholder: the shell is navigable end to end before the views exist. `/movements`
 * is the statement since feature 19 — the whole history month by month, a different
 * screen from `/review`, which is the queue of what is still pending.
 */
export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: HOME_ROUTE_NAME } },
  {
    path: '/net-worth',
    name: HOME_ROUTE_NAME,
    component: NetWorthView,
    meta: { label: 'Net Worth', icon: Wallet },
  },
  {
    path: '/review',
    name: REVIEW_ROUTE_NAME,
    component: ReviewView,
    meta: { label: 'Review', icon: ListChecks },
  },
  {
    path: '/rules',
    name: 'rules',
    component: RulesView,
    meta: { label: 'Rules', icon: WandSparkles },
  },
  {
    path: '/overview',
    name: 'overview',
    component: PlaceholderView,
    meta: { label: 'Overview', icon: LayoutDashboard },
  },
  {
    path: '/movements',
    name: 'movements',
    component: StatementView,
    meta: { label: 'Movements', icon: ArrowLeftRight },
  },
  {
    path: '/investments',
    name: 'investments',
    component: PlaceholderView,
    meta: { label: 'Investments', icon: ChartLine },
  },
]

export interface NavEntry {
  name: string
  label: string
  icon: LucideIcon
}

/** What the sidebar lists: every named route that declares a label and an icon. */
export const navEntries: NavEntry[] = routes.flatMap((route) =>
  route.name && route.meta?.label && route.meta.icon
    ? [{ name: String(route.name), label: route.meta.label, icon: route.meta.icon }]
    : [],
)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
