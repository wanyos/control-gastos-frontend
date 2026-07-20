export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Optional label rendered to the right. */
  label?: string;
  size?: 'sm' | 'md';
}

/** On/off toggle for settings (notificaciones, redondeo, etc.). */
export function Switch(props: SwitchProps): JSX.Element;
