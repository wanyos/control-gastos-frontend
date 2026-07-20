export interface ProgressBarProps {
  value: number;
  /** @default 100 */
  max?: number;
  /** Fill color (a --chart-* or --brand). Auto-turns red when value>max. */
  color?: string;
  height?: number;
  /** Show a % readout above the track. */
  showLabel?: boolean;
  label?: string;
  style?: React.CSSProperties;
}

/** Track + fill for budgets (presupuesto) and savings goals (metas). */
export function ProgressBar(props: ProgressBarProps): JSX.Element;
