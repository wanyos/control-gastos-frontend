import React from 'react';

/** Switch — on/off toggle. */
export function Switch({ checked = false, onChange, disabled = false, label, size = 'md' }) {
  const w = size === 'sm' ? 36 : 44;
  const h = size === 'sm' ? 20 : 24;
  const knob = h - 6;
  const toggle = () => { if (!disabled && onChange) onChange(!checked); };

  const control = (
    <span
      role="switch" aria-checked={checked} tabIndex={disabled ? -1 : 0}
      onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
      style={{
        display: 'inline-flex', alignItems: 'center', width: w, height: h, flex: 'none',
        background: checked ? 'var(--brand)' : 'var(--neutral-300)',
        borderRadius: 'var(--radius-pill)', padding: 3, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--dur-base) var(--ease-out)', opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        width: knob, height: knob, borderRadius: '50%', background: '#fff',
        boxShadow: 'var(--shadow-sm)', transform: `translateX(${checked ? w - knob - 6 : 0}px)`,
        transition: 'transform var(--dur-base) var(--ease-out)',
      }} />
    </span>
  );

  if (!label) return control;
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {control}
      <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-body)' }}>{label}</span>
    </label>
  );
}
