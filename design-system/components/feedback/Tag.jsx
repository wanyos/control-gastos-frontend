import React from 'react';

/** Tag — category chip with a leading color dot. */
export function Tag({ children, color = 'var(--chart-1)', removable = false, onRemove, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)',
      color: 'var(--text-body)', background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)', ...style,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />
      {children}
      {removable && (
        <button type="button" onClick={onRemove} aria-label="Quitar" style={{
          border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)',
          display: 'inline-flex', padding: 0, marginLeft: 1,
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      )}
    </span>
  );
}
