import React from 'react';

/** ProgressBar — track + fill for budgets and goals. */
export function ProgressBar({ value = 0, max = 100, color = 'var(--brand)', height = 8, showLabel = false, label, style }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const over = value > max;
  const fill = over ? 'var(--negative)' : color;
  return (
    <div style={{ ...style }}>
      {(showLabel || label) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>{label}</span>
          {showLabel && <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: over ? 'var(--negative)' : 'var(--text-body)' }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{ height, background: 'var(--neutral-200)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: fill, borderRadius: 'var(--radius-pill)', transition: 'width var(--dur-slow) var(--ease-out)' }} />
      </div>
    </div>
  );
}
