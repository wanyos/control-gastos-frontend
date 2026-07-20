import React from 'react';

/** Card — base surface container with optional header & footer. */
export function Card({ children, title, subtitle, action, footer, padding = 20, interactive = false, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: interactive && hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow var(--dur-base), transform var(--dur-base)',
        transform: interactive && hover ? 'translateY(-1px)' : 'none',
        cursor: interactive ? 'pointer' : 'default', overflow: 'hidden', ...style,
      }}
      {...rest}
    >
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, padding: `16px ${padding}px 0`,
        }}>
          <div>
            {title && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
      {footer && <div style={{ padding: `12px ${padding}px`, borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}>{footer}</div>}
    </div>
  );
}
