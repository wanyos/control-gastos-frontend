import React from 'react';

function fmt(n) {
  const s = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
  return (n < 0 ? '−' : '+') + s;
}

/** TransactionRow — one movement: merchant, date, category, amount. */
export function TransactionRow({ merchant, date, category, categoryColor = 'var(--chart-6)', amount, currency = '€', icon, pending = false, style }) {
  const [hover, setHover] = React.useState(false);
  const positive = amount >= 0;
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px',
        borderRadius: 'var(--radius-md)', background: hover ? 'var(--surface-hover)' : 'transparent',
        transition: 'background var(--dur-fast)', ...style,
      }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        width: 38, height: 38, borderRadius: '50%', background: 'var(--surface-sunken)', color: categoryColor,
      }}>
        {icon || <span style={{ width: 10, height: 10, borderRadius: '50%', background: categoryColor }} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: 'var(--text-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{merchant}</span>
          {pending && <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--amber-600)', background: 'var(--warning-subtle)', padding: '1px 6px', borderRadius: 'var(--radius-pill)' }}>Pendiente</span>}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1, display: 'flex', gap: 6 }}>
          {category && <span>{category}</span>}
          <span>·</span>
          <span>{date}</span>
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
        fontSize: 'var(--text-base)', letterSpacing: '-0.01em',
        color: positive ? 'var(--positive)' : 'var(--text-strong)',
      }}>
        {fmt(amount)} {currency}
      </div>
    </div>
  );
}
