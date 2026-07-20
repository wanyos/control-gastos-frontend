import React from 'react';

const sizes = { sm: 32, md: 40, lg: 48 };

/**
 * IconButton — square button holding a single icon.
 */
export function IconButton({
  children, variant = 'secondary', size = 'md', label, disabled = false, onClick, style, ...rest
}) {
  const dim = sizes[size] || sizes.md;
  const v = {
    primary: { background: 'var(--brand)', color: '#fff', border: '1px solid var(--brand)' },
    secondary: { background: 'var(--surface-card)', color: 'var(--text-body)', border: '1px solid var(--border-default)' },
    ghost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
  }[variant];

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: dim, height: dim, borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast)',
    opacity: disabled ? 0.5 : 1, ...v, ...style,
  };

  const hover = (e, on) => {
    if (disabled) return;
    if (variant === 'primary') e.currentTarget.style.background = on ? 'var(--brand-hover)' : 'var(--brand)';
    else e.currentTarget.style.background = on ? 'var(--surface-hover)' : v.background;
  };

  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} style={base}
      onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)} {...rest}
    >
      {children}
    </button>
  );
}
