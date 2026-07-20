// control·cuentas — lightweight SVG charts for the web UI kit
const { useState: useStateChart } = React;

/** Donut — categorical spend breakdown. data: [{name,value,color}] */
function Donut({ data, size = 168, thickness = 26, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const [hover, setHover] = useStateChart(null);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--neutral-200)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = frac * c;
          const seg = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={d.color} strokeWidth={hover === i ? thickness + 4 : thickness}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              style={{ transition: 'stroke-width .15s', cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', fontWeight: 600 }}>
          {hover != null ? data[hover].name : centerLabel}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600, color: 'var(--text-strong)', marginTop: 2 }}>
          {hover != null
            ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(data[hover].value) + ' €'
            : centerValue}
        </span>
      </div>
    </div>
  );
}

/** Bars — ingresos vs gastos grouped columns. data: [{m,in,out}] */
function Bars({ data, height = 180 }) {
  const max = Math.max(...data.flatMap((d) => [d.in, d.out]));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height, padding: '0 4px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
              <div title={`Ingresos ${d.in} €`} style={{ width: 12, height: `${(d.in / max) * 100}%`, background: 'var(--chart-1)', borderRadius: '3px 3px 0 0', transition: 'height .4s var(--ease-out)' }} />
              <div title={`Gastos ${d.out} €`} style={{ width: 12, height: `${(d.out / max) * 100}%`, background: 'var(--neutral-300)', borderRadius: '3px 3px 0 0', transition: 'height .4s var(--ease-out)' }} />
            </div>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.m}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
        <Legend color="var(--chart-1)" label="Ingresos" />
        <Legend color="var(--neutral-300)" label="Gastos" />
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
    </span>
  );
}

window.Donut = Donut;
window.Bars = Bars;
