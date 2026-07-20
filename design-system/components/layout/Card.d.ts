import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card title (display font). */
  title?: string;
  subtitle?: string;
  /** Node in the header's top-right (e.g. a Select or IconButton). */
  action?: React.ReactNode;
  /** Footer band node. */
  footer?: React.ReactNode;
  /** Inner padding in px. @default 20 */
  padding?: number;
  /** Lift + shadow on hover for clickable cards. */
  interactive?: boolean;
}

/**
 * Base surface container. Compose everything else inside it.
 * @startingPoint section="Layout" subtitle="Card surface with header/footer" viewport="700x260"
 */
export function Card(props: CardProps): JSX.Element;
