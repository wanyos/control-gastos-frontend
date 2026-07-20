import React from 'react';

/** Select — native dropdown styled to match the system. */
export function Select({ label, hint, error, options = [], value, onChange, placeholder, id, style, ...rest }) {
  const selId = id || `cc-sel-${Math.random().toString(36).slice(2, 8)}`;
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label htmlFor={selId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <select
          id={selId} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            appearance: 'none', WebkitAppearance: 'none', width: '100%', height: 42,
            padding: '0 38px 0 12px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)',
            color: value ? 'var(--text-strong)' : 'var(--text-faint)', background: 'var(--surface-card)',
            border: `1px solid ${error ? 'var(--negative)' : focused ? 'var(--border-brand)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)', boxShadow: focused ? '0 0 0 3px var(--ring-brand)' : 'var(--shadow-xs)',
            cursor: 'pointer', outline: 'none', transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)', ...style,
          }}
          {...rest}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </div>
      {(hint || error) && <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--negative)' : 'var(--text-muted)' }}>{error || hint}</span>}
    </div>
  );
}
