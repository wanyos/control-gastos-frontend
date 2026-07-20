export interface AvatarProps {
  /** Full name — initials are derived, color is seeded from it. */
  name?: string;
  /** Optional image URL. */
  src?: string;
  /** Pixel diameter. @default 36 */
  size?: number;
  /** Override the auto background. */
  color?: string;
  style?: React.CSSProperties;
}

/** Circular user avatar — initials fallback with seeded color. */
export function Avatar(props: AvatarProps): JSX.Element;
