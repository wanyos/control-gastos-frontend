import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default 'primary' */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Size. @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Icon node rendered before the label (e.g. a Lucide <i data-lucide>). */
  iconLeft?: React.ReactNode;
  /** Icon node rendered after the label. */
  iconRight?: React.ReactNode;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  /** Show spinner and disable. @default false */
  loading?: boolean;
}

/**
 * Primary action control. Use `primary` for the single key action per view,
 * `secondary` for adjacent actions, `ghost` for low-emphasis, `danger` for destructive.
 *
 * @startingPoint section="Forms" subtitle="Buttons in every variant & size" viewport="700x220"
 */
export function Button(props: ButtonProps): JSX.Element;
