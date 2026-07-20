// control·cuentas — web app shell + add-movement modal
const NS_APP = window.ControlCuentasDesignSystem_7df875;

function AddModal({ open, onClose }) {
  const { Button, Input, Select } = NS_APP;
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 400, background: 'var(--surface-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'cc-fade .15s var(--ease-out)',
    }}>
      <style>{`@keyframes cc-fade{from{opacity:0}to{opacity:1}}@keyframes cc-pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 440, maxWidth: '100%', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)', padding: 24, animation: 'cc-pop .2s var(--ease-out)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Nuevo movimiento</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <i data-lucide="x" style={{ width: 20, height: 20 }}></i>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={tabBtn(true)}>Gasto</button>
            <button style={tabBtn(false)}>Ingreso</button>
          </div>
          <Input label="Concepto" placeholder="Ej. Compra Mercadona" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Importe" prefix="€" placeholder="0,00" inputMode="decimal" />
            <Select label="Categoría" options={['Comida', 'Vivienda', 'Transporte', 'Ocio', 'Suscripciones']} defaultValue="Comida" />
          </div>
          <Select label="Cuenta" options={['BBVA Nómina', 'Sabadell Ahorro', 'Revolut']} defaultValue="BBVA Nómina" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onClose}>Guardar movimiento</Button>
        </div>
      </div>
    </div>
  );
}
function tabBtn(active) {
  return {
    flex: 1, height: 38, borderRadius: 'var(--radius-md)', cursor: 'pointer',
    fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 'var(--text-sm)',
    border: `1px solid ${active ? 'var(--brand)' : 'var(--border-default)'}`,
    background: active ? 'var(--green-50)' : 'var(--surface-card)',
    color: active ? 'var(--brand-hover)' : 'var(--text-body)',
  };
}

function App() {
  const [active, setActive] = React.useState('resumen');
  const [modal, setModal] = React.useState(false);
  const V = window.CC_VIEWS;
  const titles = { resumen: 'Resumen', cuentas: 'Cuentas', movimientos: 'Movimientos', presupuestos: 'Presupuestos', inversiones: 'Inversiones', metas: 'Metas de ahorro' };

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  let view;
  if (active === 'resumen') view = <V.ResumenView />;
  else if (active === 'cuentas') view = <V.CuentasView />;
  else if (active === 'movimientos') view = <V.MovimientosView />;
  else if (active === 'presupuestos') view = <V.PresupuestosView />;
  else if (active === 'inversiones') view = <V.PlaceholderView title="Inversiones" icon="line-chart" />;
  else view = <V.PlaceholderView title="Metas de ahorro" icon="piggy-bank" />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-app)' }}>
      <window.Sidebar active={active} onNavigate={setActive} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <window.TopBar title={titles[active]} onAdd={() => setModal(true)} />
        <main style={{ padding: 28, maxWidth: 'var(--container-max)', width: '100%' }}>{view}</main>
      </div>
      <AddModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
}

window.CC_App = App;
