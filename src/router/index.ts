import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ArrowLeftRight, ChartLine, FileUp, LayoutDashboard, Wallet } from '@lucide/vue'
import type { LucideIcon } from '@lucide/vue'

import NetWorthView from '@/features/net-worth/views/NetWorthView.vue'
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

/**
 * Routes double as the navigation model: `meta.label` and `meta.icon` are the
 * single source of truth for the sidebar entries and the topbar title, so a
 * route and its navigation entry can never drift apart.
 *
 * Array order is sidebar order. Every route but the home one renders the shared
 * placeholder: the shell is navigable end to end before the views exist.
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
    path: '/overview',
    name: 'overview',
    component: PlaceholderView,
    meta: { label: 'Overview', icon: LayoutDashboard },
  },
  {
    path: '/movements',
    name: 'movements',
    component: PlaceholderView,
    meta: { label: 'Movements', icon: ArrowLeftRight },
  },
  {
    path: '/investments',
    name: 'investments',
    component: PlaceholderView,
    meta: { label: 'Investments', icon: ChartLine },
  },
  {
    path: '/import',
    name: 'import',
    component: PlaceholderView,
    meta: { label: 'Import', icon: FileUp },
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
