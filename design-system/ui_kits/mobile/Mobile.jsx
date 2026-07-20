// control·cuentas — mobile app screens
const NS_M = window.ControlCuentasDesignSystem_7df875;
const m_eur2 = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
const MI = ({ n, s = 18, c }) => <i data-lucide={n} style={{ width: s, height: s, color: c }}></i>;

const MDATA = {
  total: 18244.93,
  accounts: [
    { name: 'BBVA Nómina', type: 'Corriente', last4: '4471', balance: 3204.18, color: 'var(--chart-3)', logo: 'B' },
    { name: 'Sabadell Ahorro', type: 'Ahorro', last4: '8820', balance: 9860.55, color: 'var(--chart-2)', logo: 'S' },
    { name: 'Revolut', type: 'Digital', last4: '1133', balance: 642.40, color: 'var(--chart-8)', logo: 'R' },
    { name: 'Inversiones', type: 'Cartera', last4: '—', balance: 5050.20, color: 'var(--chart-4)', logo: 'I' },
  ],
  tx: [
    { merchant: 'Nómina ACME', category: 'Ingresos', categoryColor: 'var(--chart-1)', date: 'Hoy · 09:01', amount: 2100, icon: 'banknote' },
    { merchant: 'Mercadona', category: 'Comida', categoryColor: 'var(--chart-6)', date: 'Hoy · 14:32', amount: -42.18, icon: 'shopping-cart' },
    { merchant: 'Endesa Luz', category: 'Vivienda', categoryColor: 'var(--chart-4)', date: 'Ayer', amount: -78.40, icon: 'home', pending: true },
    { merchant: 'Netflix', category: 'Suscrip.', categoryColor: 'var(--chart-7)', date: '3 oct', amount: -13.99, icon: 'repeat' },
    { merchant: 'Cabify', category: 'Transporte', categoryColor: 'var(--chart-8)', date: '3 oct', amount: -9.80, icon: 'car' },
    { merchant: 'Spotify', category: 'Suscrip.', categoryColor: 'var(--chart-7)', date: '1 oct', amount: -10.99, icon: 'repeat' },
  ],
  cats: [
    { name: 'Vivienda', color: 'var(--chart-4)', spent: 950, budget: 1000, icon: 'home' },
    { name: 'Comida', color: 'var(--chart-6)', spent: 420, budget: 600, icon: 'utensils' },
    { name: 'Ocio', color: 'var(--chart-5)', spent: 310, budget: 250, icon: 'party-popper' },
  ],
};

function StatusBar() {
  return (
    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: '#fff' }}>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>9:41</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <MI n="signal" s={15} /><MI n="wifi" s={15} /><MI n="battery-full" s={17} />
      </span>
    </div>
  );
}

function HomeScreen({ onAdd }) {
  const { Badge } = NS_M;
  return (
    <div>
      <div style={{ background: 'linear-gradient(165deg,#0E7C55 0%,#075C3F 100%)', padding: '0 0 26px', borderRadius: '0 0 26px 26px' }}>
        <StatusBar />
        <div style={{ padding: '6px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: 14 }}>Hola, Lucía</span>
            <span style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><MI n="bell" s={18} /></span>
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Saldo total · 5 cuentas</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 40, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginTop: 6 }}>
              {m_eur2(MDATA.total)} <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: 24 }}>€</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,0.16)', color: '#B8FBDD' }}>▲ 4,2% este mes</span>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', color: '#fff' }}>+528,40 €</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[['plus', 'Añadir', onAdd], ['arrow-left-right', 'Enviar'], ['target', 'Presup.'], ['piggy-bank', 'Meta']].map(([ic, lb, fn], i) => (
            <button key={i} onClick={fn} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 0', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              <span style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: '50%', background: 'var(--green-50)', color: 'var(--brand)', alignItems: 'center', justifyContent: 'center' }}><MI n={ic} s={18} /></span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-body)' }}>{lb}</span>
            </button>
          ))}
        </div>

        <SectionHead title="Tus cuentas" link="Ver todas" />
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, margin: '0 -18px', padding: '0 18px 6px' }}>
          {MDATA.accounts.map((a, i) => (
            <div key={i} style={{ flex: 'none', width: 150, padding: 14, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)' }}>
              <span style={{ display: 'inline-flex', width: 34, height: 34, borderRadius: 'var(--radius-md)', background: a.color, color: '#fff', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{a.logo}</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 600, color: a.balance < 0 ? 'var(--negative)' : 'var(--text-strong)', marginTop: 4 }}>{(a.balance < 0 ? '−' : '') + m_eur2(a.balance)} €</div>
            </div>
          ))}
        </div>

        <SectionHead title="Movimientos" link="Ver todos" />
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', padding: 4 }}>
          {MDATA.tx.slice(0, 5).map((t, i) => <TxRow key={i} t={t} />)}
        </div>
      </div>
    </div>
  );
}

function MovScreen() {
  return (
    <div style={{ padding: '0 18px' }}>
      <ScreenHead title="Movimientos" />
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 4 }}>
        {MDATA.tx.map((t, i) => <TxRow key={i} t={t} />)}
      </div>
    </div>
  );
}

function PresScreen() {
  const { CategoryBar } = NS_M;
  return (
    <div style={{ padding: '0 18px' }}>
      <ScreenHead title="Presupuestos" />
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {MDATA.cats.map((c, i) => <CategoryBar key={i} category={c.name} color={c.color} spent={c.spent} budget={c.budget} icon={<MI n={c.icon} s={15} />} />)}
      </div>
    </div>
  );
}

function CuentasScreen() {
  const { AccountCard } = NS_M;
  return (
    <div style={{ padding: '0 18px' }}>
      <ScreenHead title="Cuentas" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MDATA.accounts.map((a, i) => <AccountCard key={i} name={a.name} type={a.type} last4={a.last4} balance={a.balance} color={a.color} logo={a.logo} />)}
      </div>
    </div>
  );
}

function TxRow({ t }) {
  const pos = t.amount >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px' }}>
      <span style={{ display: 'inline-flex', width: 38, height: 38, borderRadius: '50%', background: 'var(--surface-sunken)', color: t.categoryColor, alignItems: 'center', justifyContent: 'center', flex: 'none' }}><MI n={t.icon} s={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.merchant}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.category} · {t.date}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 14, color: pos ? 'var(--positive)' : 'var(--text-strong)' }}>{(pos ? '+' : '−') + m_eur2(t.amount)} €</span>
    </div>
  );
}

function SectionHead({ title, link }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 12px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
      {link && <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>{link}</a>}
    </div>
  );
}
function ScreenHead({ title }) {
  return <div style={{ padding: '52px 0 16px' }}><h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h1></div>;
}

const TABS = [['home', 'Inicio'], ['wallet', 'Cuentas'], ['arrow-left-right', 'Movim.'], ['target', 'Presup.']];

function TabBar({ active, onChange, onAdd }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 76, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 14 }}>
      {TABS.map(([ic, lb], i) => {
        const on = active === i;
        return (
          <button key={i} onClick={() => onChange(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: on ? 'var(--brand)' : 'var(--text-faint)', fontFamily: 'var(--font-sans)' }}>
            <MI n={ic} s={21} />
            <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 500 }}>{lb}</span>
          </button>
        );
      })}
    </div>
  );
}

function MobileApp() {
  const [tab, setTab] = React.useState(0);
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  let screen;
  if (tab === 0) screen = <HomeScreen onAdd={() => setTab(2)} />;
  else if (tab === 1) screen = <CuentasScreen />;
  else if (tab === 2) screen = <MovScreen />;
  else screen = <PresScreen />;
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: 'var(--surface-app)', borderRadius: 44, overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '10px solid #0B1116' }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 86 }}>{screen}</div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

window.CC_MobileApp = MobileApp;
