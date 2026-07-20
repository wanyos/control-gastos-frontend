import React from 'react';

/** Checkbox — labeled boolean with brand check. */
export function Checkbox({ checked = false, onChange, disabled = false, label, indeterminate = false }) {
  const toggle = () => { if (!disabled && onChange) onChange(!checked); };
  const active = checked || indeterminate;
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <span
        role="checkbox" aria-checked={indeterminate ? 'mixed' : checked} tabIndex={disabled ? -1 : 0}
        onClick={toggle} onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); toggle(); } }}
        style={{
          width: 18, height: 18, borderRadius: 'var(--radius-xs)', flex: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'var(--brand)' : 'var(--surface-card)',
          border: `1px solid ${active ? 'var(--brand)' : 'var(--border-default)'}`,
          color: '#fff', transition: 'background var(--dur-fast), border-color var(--dur-fast)',
        }}
      >
        {indeterminate
          ? <span style={{ width: 9, height: 2, background: '#fff', borderRadius: 1 }} />
          : checked && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
      </span>
      {label && <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}
