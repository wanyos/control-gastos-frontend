import React from 'react';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** AccountCard — a single bank account / card summary row. */
export function AccountCard({ name, type = 'Cuenta corriente', last4, balance, currency = '€', color = 'var(--chart-3)', logo, interactive = true, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: 14,
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', boxShadow: interactive && hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        cursor: interactive ? 'pointer' : 'default', transition: 'box-shadow var(--dur-base)', ...style,
      }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        width: 42, height: 42, borderRadius: 'var(--radius-md)', background: color, color: '#fff',
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16,
      }}>
        {logo || name.slice(0, 1).toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: 'var(--text-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 1 }}>
          <span>{type}</span>
          {last4 && <span style={{ fontFamily: 'var(--font-mono)' }}>···· {last4}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 'var(--text-md)', color: balance < 0 ? 'var(--negative)' : 'var(--text-strong)', letterSpacing: '-0.01em' }}>
          {fmt(balance)} {currency}
        </div>
      </div>
    </div>
  );
}
