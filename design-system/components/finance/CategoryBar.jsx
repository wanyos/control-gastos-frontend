import React from 'react';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

/** CategoryBar — spending category with amount and budget progress. */
export function CategoryBar({ category, color = 'var(--chart-1)', spent, budget, currency = '€', icon, style }) {
  const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
  const over = budget && spent > budget;
  return (
    <div style={{ ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: 'var(--surface-sunken)', color }}>
          {icon || <span style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />}
        </span>
        <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-strong)', fontSize: 'var(--text-sm)' }}>{category}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-strong)' }}>
          {fmt(spent)} {currency}
          {budget != null && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> / {fmt(budget)}</span>}
        </span>
      </div>
      {budget != null && (
        <div style={{ height: 6, background: 'var(--neutral-200)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: over ? 'var(--negative)' : color, borderRadius: 'var(--radius-pill)', transition: 'width var(--dur-slow) var(--ease-out)' }} />
        </div>
      )}
    </div>
  );
}
