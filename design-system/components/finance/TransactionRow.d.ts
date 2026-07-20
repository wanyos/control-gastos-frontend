import * as React from 'react';

export interface TransactionRowProps {
  /** Merchant / payee name. */
  merchant: string;
  /** Human date string (e.g. "Hoy · 14:32"). */
  date: string;
  /** Category label. */
  category?: string;
  /** Category dot color — a --chart-* token. */
  categoryColor?: string;
  /** Signed number: positive = ingreso (green), negative = gasto. */
  amount: number;
  currency?: string;
  /** Lucide icon node; falls back to a category dot. */
  icon?: React.ReactNode;
  /** Show the "Pendiente" badge. */
  pending?: boolean;
  style?: React.CSSProperties;
}

/** One transaction line — merchant, category, date, signed amount. Row-hover highlight. */
export function TransactionRow(props: TransactionRowProps): JSX.Element;
