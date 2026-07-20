import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the control. */
  label?: string;
  /** Helper text below the field. */
  hint?: string;
  /** Error message — turns the field red and replaces the hint. */
  error?: string;
  /** Leading adornment (icon or text, e.g. a € sign). */
  prefix?: React.ReactNode;
  /** Trailing adornment. */
  suffix?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/** Labeled text input with prefix/suffix, hint and error states. */
export function Input(props: InputProps): JSX.Element;
