// control·cuentas — web views
const NS_V = window.ControlCuentasDesignSystem_7df875;
const D = window.CC_DATA;
const eur0 = (n) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n) + ' €';
const eur2 = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
const Icon = ({ n, s = 16 }) => <i data-lucide={n} style={{ width: s, height: s }}></i>;

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{children}</h2>
      {action}
    </div>
  );
}

function ResumenView() {
  const { StatCard, Card, AccountCard, TransactionRow, CategoryBar, Select } = NS_V;
  const donutData = D.categories.map((c) => ({ name: c.name, value: c.spent, color: c.color }));
  const totalSpent = D.categories.reduce((s, c) => s + c.spent, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {D.kpis.map((k, i) => (
          <StatCard key={i} label={k.label} value={k.value} delta={k.delta} deltaLabel={k.deltaLabel} accent={k.accent} icon={<Icon n={k.icon} />} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <Card title="Ingresos vs. gastos" subtitle="Últimos 6 meses" action={<Select options={['6 meses', '12 meses']} defaultValue="6 meses" style={{ width: 130, height: 34 }} />}>
          <window.Bars data={D.flow} />
        </Card>
        <Card title="Gastos por categoría" subtitle={D.month}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <window.Donut data={donutData} centerLabel="Total" centerValue={eur0(totalSpent)} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {D.categories.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
                  <span style={{ color: 'var(--text-body)', flex: 1 }}>{c.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-strong)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>{eur0(c.spent)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card title="Movimientos recientes" action={<a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--brand)' }}>Ver todos</a>} padding={10}>
          {D.transactions.slice(0, 6).map((t, i) => (
            <TransactionRow key={i} merchant={t.merchant} category={t.category} categoryColor={t.categoryColor} date={t.date} amount={t.amount} pending={t.pending} icon={<Icon n={t.icon} />} />
          ))}
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Tus cuentas" padding={12}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {D.accounts.slice(0, 3).map((a, i) => (
                <AccountCard key={i} name={a.name} type={a.type} last4={a.last4} balance={a.balance} color={a.color} logo={a.logo} interactive={false} style={{ boxShadow: 'none', border: '1px solid var(--border-subtle)' }} />
              ))}
            </div>
          </Card>
          <Card title="Próximos pagos" padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {D.upcoming.map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', color: 'var(--text-muted)', alignItems: 'center', justifyContent: 'center' }}><Icon n="calendar" s={15} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-strong)' }}>{u.merchant}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{u.date}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>{eur2(Math.abs(u.amount))}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CuentasView() {
  const { AccountCard, StatCard } = NS_V;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <StatCard label="Patrimonio neto" value={D.totalBalance} delta={4.2} deltaLabel="vs. mes anterior" icon={<Icon n="wallet" />} />
        <StatCard label="Activos" value={18757.33} delta={3.1} icon={<Icon n="arrow-up-right" />} />
        <StatCard label="Deuda" value={512.40} delta={-8.0} accent="var(--negative)" icon={<Icon n="credit-card" />} />
      </div>
      <SectionTitle>Todas las cuentas</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {D.accounts.map((a, i) => (
          <AccountCard key={i} name={a.name} type={a.type} last4={a.last4} balance={a.balance} color={a.color} logo={a.logo} />
        ))}
      </div>
    </div>
  );
}

function MovimientosView() {
  const { Card, TransactionRow, Select, Tag } = NS_V;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select options={['Todas las cuentas', 'BBVA Nómina', 'Revolut']} defaultValue="Todas las cuentas" style={{ width: 190, height: 38 }} />
        <Select options={['Este mes', 'Últimos 3 meses', 'Este año']} defaultValue="Este mes" style={{ width: 170, height: 38 }} />
        <Tag color="var(--chart-6)" removable>Comida</Tag>
        <Tag color="var(--chart-7)" removable>Suscripciones</Tag>
      </div>
      <Card padding={10}>
        {D.transactions.map((t, i) => (
          <TransactionRow key={i} merchant={t.merchant} category={t.category} categoryColor={t.categoryColor} date={t.date} amount={t.amount} pending={t.pending} icon={<Icon n={t.icon} />} />
        ))}
      </Card>
    </div>
  );
}

function PresupuestosView() {
  const { Card, CategoryBar } = NS_V;
  const totalBudget = D.categories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = D.categories.reduce((s, c) => s + c.spent, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Presupuesto del mes" subtitle={`${eur0(totalSpent)} de ${eur0(totalBudget)} gastado`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 4 }}>
          {D.categories.map((c, i) => (
            <CategoryBar key={i} category={c.name} color={c.color} spent={c.spent} budget={c.budget} icon={<Icon n={c.icon} />} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function PlaceholderView({ title, icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '80px 0', color: 'var(--text-muted)' }}>
      <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'var(--green-50)', color: 'var(--brand)', alignItems: 'center', justifyContent: 'center' }}><Icon n={icon} s={26} /></span>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-strong)' }}>{title}</div>
      <div style={{ fontSize: 'var(--text-sm)' }}>Esta sección es una maqueta. El resumen tiene el contenido completo.</div>
    </div>
  );
}

window.CC_VIEWS = { ResumenView, CuentasView, MovimientosView, PresupuestosView, PlaceholderView };
