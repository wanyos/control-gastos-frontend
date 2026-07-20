export interface CheckboxProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  /** Render the mixed/partial state. */
  indeterminate?: boolean;
}

/** Boolean checkbox with brand-green check; supports indeterminate. */
export function Checkbox(props: CheckboxProps): JSX.Element;
