import React from 'react';

const tones = {
  neutral:  { solid: ['var(--neutral-700)', '#fff'], soft: ['var(--neutral-100)', 'var(--neutral-700)'] },
  brand:    { solid: ['var(--brand)', '#fff'],        soft: ['var(--green-50)', 'var(--green-700)'] },
  positive: { solid: ['var(--positive)', '#fff'],     soft: ['var(--positive-subtle)', 'var(--green-700)'] },
  negative: { solid: ['var(--negative)', '#fff'],     soft: ['var(--negative-subtle)', 'var(--red-700)'] },
  warning:  { solid: ['var(--warning)', '#fff'],      soft: ['var(--warning-subtle)', 'var(--amber-600)'] },
  info:     { solid: ['var(--info)', '#fff'],         soft: ['var(--info-subtle)', 'var(--blue-600)'] },
};

/** Badge — compact status / category label. */
export function Badge({ children, tone = 'neutral', variant = 'soft', dot = false, size = 'md', style }) {
  const t = tones[tone] || tones.neutral;
  const isSolid = variant === 'solid';
  const isOutline = variant === 'outline';
  const [bg, fg] = isSolid ? t.solid : t.soft;
  const pad = size === 'sm' ? '2px 7px' : '3px 9px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: pad,
      fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 'var(--text-2xs)' : 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)', lineHeight: 1.4, whiteSpace: 'nowrap',
      borderRadius: 'var(--radius-pill)',
      background: isOutline ? 'transparent' : bg,
      color: isOutline ? t.soft[1] : fg,
      border: isOutline ? `1px solid ${t.soft[1]}` : '1px solid transparent',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: isSolid ? fg : t.solid[0] }} />}
      {children}
    </span>
  );
}
