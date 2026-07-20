import * as React from 'react';

export interface AccountCardProps {
  /** Bank / account name. */
  name: string;
  /** Account kind label. @default 'Cuenta corriente' */
  type?: string;
  /** Last 4 digits, shown masked. */
  last4?: string;
  /** Balance number (auto es-ES, red if negative). */
  balance: number;
  currency?: string;
  /** Accent / logo-tile color. */
  color?: string;
  /** Custom logo node (overrides the initial). */
  logo?: React.ReactNode;
  interactive?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** Bank account / card summary row with masked number and balance. */
export function AccountCard(props: AccountCardProps): JSX.Element;
