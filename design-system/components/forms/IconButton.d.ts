import * as React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (also used as tooltip). */
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

/** Square single-icon button. Pass a Lucide icon as the child. */
export function IconButton(props: IconButtonProps): JSX.Element;
