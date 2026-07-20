export interface TagProps {
  children: React.ReactNode;
  /** Dot color — use a --chart-* token to match the category. */
  color?: string;
  removable?: boolean;
  onRemove?: () => void;
  style?: React.CSSProperties;
}

/** Category chip with a leading color dot (Comida, Vivienda, …). */
export function Tag(props: TagProps): JSX.Element;
