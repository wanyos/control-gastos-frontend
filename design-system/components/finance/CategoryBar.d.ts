import * as React from 'react';

export interface CategoryBarProps {
  /** Category name (Comida, Vivienda…). */
  category: string;
  /** Bar color — a --chart-* token. */
  color?: string;
  /** Amount spent. */
  spent: number;
  /** Budget cap; omit to hide the progress track. Over-budget turns red. */
  budget?: number;
  currency?: string;
  /** Lucide icon node. */
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Spending category row with amount and budget progress. */
export function CategoryBar(props: CategoryBarProps): JSX.Element;
