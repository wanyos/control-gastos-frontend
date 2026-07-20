import React from 'react';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** StatCard — headline metric with label and delta. The core dashboard tile. */
export function StatCard({ label, value, currency = '€', delta, deltaLabel, icon, accent = 'var(--brand)', style }) {
  const dir = delta == null ? 0 : delta >= 0 ? 1 : -1;
  const deltaColor = dir > 0 ? 'var(--positive)' : dir < 0 ? 'var(--negative)' : 'var(--text-muted)';
  const displayValue = typeof value === 'number' ? fmt(value) : value;

  return (
    <div style={{
      background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 18, ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
        {icon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--green-50)', color: accent }}>{icon}</span>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums lining-nums',
        fontSize: 'var(--text-3xl)', fontWeight: 600, color: 'var(--text-strong)',
        letterSpacing: '-0.02em', marginTop: 10, lineHeight: 1,
      }}>
        {displayValue}<span style={{ color: 'var(--text-faint)', fontWeight: 500, fontSize: '0.6em', marginLeft: 4 }}>{currency}</span>
      </div>
      {delta != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--text-xs)', fontWeight: 700, color: deltaColor, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {dir !== 0 && <span>{dir > 0 ? '▲' : '▼'}</span>}{Math.abs(delta)}%
          </span>
          {deltaLabel && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
