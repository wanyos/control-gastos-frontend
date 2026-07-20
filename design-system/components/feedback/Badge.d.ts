import * as React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  /** Semantic color. @default 'neutral' */
  tone?: 'neutral' | 'brand' | 'positive' | 'negative' | 'warning' | 'info';
  /** Fill style. @default 'soft' */
  variant?: 'solid' | 'soft' | 'outline';
  /** Leading status dot. */
  dot?: boolean;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

/**
 * Compact status / category label.
 * @startingPoint section="Feedback" subtitle="Badges & status pills" viewport="700x160"
 */
export function Badge(props: BadgeProps): JSX.Element;
