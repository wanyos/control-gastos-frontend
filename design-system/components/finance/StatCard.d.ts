import * as React from 'react';

export interface StatCardProps {
  /** Uppercase eyebrow label (e.g. "Saldo total"). */
  label: string;
  /** Number (auto-formatted es-ES) or preformatted string. */
  value: number | string;
  /** Currency suffix. @default '€' */
  currency?: string;
  /** Percent change; sign drives the green/red arrow. */
  delta?: number;
  /** Caption next to the delta (e.g. "vs. mes anterior"). */
  deltaLabel?: string;
  /** Lucide icon node shown top-right. */
  icon?: React.ReactNode;
  /** Icon accent color. @default brand */
  accent?: string;
  style?: React.CSSProperties;
}

/**
 * Headline metric tile — the core dashboard KPI. Tabular mono figures.
 * @startingPoint section="Finanzas" subtitle="KPI metric tiles" viewport="700x200"
 */
export function StatCard(props: StatCardProps): JSX.Element;
