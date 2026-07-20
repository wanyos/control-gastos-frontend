import React from 'react';

/**
 * Input — labeled text field with optional prefix/suffix, hint and error.
 */
export function Input({
  label, hint, error, prefix, suffix, id, size = 'md', style, containerStyle, ...rest
}) {
  const inputId = id || `cc-in-${Math.random().toString(36).slice(2, 8)}`;
  const [focused, setFocused] = React.useState(false);
  const h = size === 'sm' ? 36 : size === 'lg' ? 48 : 42;

  const wrap = {
    display: 'flex', alignItems: 'center', gap: 8, height: h,
    padding: '0 12px', background: 'var(--surface-card)',
    border: `1px solid ${error ? 'var(--negative)' : focused ? 'var(--border-brand)' : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-md)',
    boxShadow: focused ? '0 0 0 3px var(--ring-brand)' : 'var(--shadow-xs)',
    transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
    ...containerStyle,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={inputId} style={{
          fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)',
        }}>{label}</label>
      )}
      <div style={wrap}>
        {prefix && <span style={{ color: 'var(--text-muted)', display: 'inline-flex', fontSize: 'var(--text-base)' }}>{prefix}</span>}
        <input
          id={inputId}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-strong)',
            minWidth: 0, ...style,
          }}
          {...rest}
        />
        {suffix && <span style={{ color: 'var(--text-muted)', display: 'inline-flex', fontSize: 'var(--text-sm)' }}>{suffix}</span>}
      </div>
      {(hint || error) && (
        <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--negative)' : 'var(--text-muted)' }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
