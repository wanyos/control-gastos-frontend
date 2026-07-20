import React from 'react';

const palette = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-6)', 'var(--chart-7)'];

/** Avatar — user initials or image. */
export function Avatar({ name = '', src, size = 36, color, style }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const bg = color || palette[(name.charCodeAt(0) || 0) % palette.length];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%', flex: 'none', overflow: 'hidden',
      background: src ? 'var(--neutral-200)' : bg, color: '#fff',
      fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)',
      fontSize: size * 0.4, letterSpacing: '0.01em', ...style,
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  );
}
