import * as React from 'react';

export interface SelectOption { value: string; label: string; }

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  /** Options as strings or {value,label} objects. */
  options: Array<string | SelectOption>;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

/** Styled native dropdown — periodo, cuenta, categoría filters. */
export function Select(props: SelectProps): JSX.Element;
