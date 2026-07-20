import React from 'react';

const sizes = {
  sm: { fontSize: 'var(--text-sm)', padding: '0 12px', height: 32, gap: 6, radius: 'var(--radius-sm)' },
  md: { fontSize: 'var(--text-base)', padding: '0 16px', height: 40, gap: 8, radius: 'var(--radius-md)' },
  lg: { fontSize: 'var(--text-md)', padding: '0 22px', height: 48, gap: 8, radius: 'var(--radius-md)' },
};

const variants = {
  primary: {
    background: 'var(--brand)', color: 'var(--brand-on)', border: '1px solid var(--brand)',
    boxShadow: 'var(--shadow-xs)',
  },
  secondary: {
    background: 'var(--surface-card)', color: 'var(--text-strong)', border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-xs)',
  },
  ghost: {
    background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent',
  },
  danger: {
    background: 'var(--negative)', color: '#fff', border: '1px solid var(--negative)',
    boxShadow: 'var(--shadow-xs)',
  },
};

/**
 * Button — primary action control for control·cuentas.
 */
export function Button({
  children, variant = 'primary', size = 'md', iconLeft, iconRight,
  fullWidth = false, loading = false, disabled = false, type = 'button', onClick, style, ...rest
}) {
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  const isDisabled = disabled || loading;

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: s.gap, height: s.height, padding: s.padding, fontSize: s.fontSize,
    fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)',
    lineHeight: 1, borderRadius: s.radius, cursor: isDisabled ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : 'auto', whiteSpace: 'nowrap',
    transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
    opacity: isDisabled ? 0.5 : 1, userSelect: 'none', ...v, ...style,
  };

  const onDown = (e) => { if (!isDisabled) e.currentTarget.style.transform = 'scale(0.97)'; };
  const onUp = (e) => { e.currentTarget.style.transform = 'scale(1)'; };
  const onEnter = (e) => {
    if (isDisabled) return;
    if (variant === 'primary') e.currentTarget.style.background = 'var(--brand-hover)';
    else if (variant === 'danger') e.currentTarget.style.background = 'var(--red-600)';
    else if (variant === 'secondary') e.currentTarget.style.background = 'var(--surface-hover)';
    else e.currentTarget.style.background = 'var(--surface-hover)';
  };
  const onLeave = (e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.background = v.background;
  };

  return (
    <button
      type={type} disabled={isDisabled} onClick={onClick} style={base}
      onMouseDown={onDown} onMouseUp={onUp} onMouseEnter={onEnter} onMouseLeave={onLeave}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', display: 'inline-block', animation: 'cc-spin 0.6s linear infinite',
    }}>
      <style>{`@keyframes cc-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
