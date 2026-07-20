// control·cuentas — web shell: Sidebar + TopBar
const NS_SHELL = window.ControlCuentasDesignSystem_7df875;

const NAV = [
  { id: 'resumen', label: 'Resumen', icon: 'layout-dashboard' },
  { id: 'cuentas', label: 'Cuentas', icon: 'wallet' },
  { id: 'movimientos', label: 'Movimientos', icon: 'arrow-left-right' },
  { id: 'presupuestos', label: 'Presupuestos', icon: 'target' },
  { id: 'inversiones', label: 'Inversiones', icon: 'line-chart' },
  { id: 'metas', label: 'Metas de ahorro', icon: 'piggy-bank' },
];

function Sidebar({ active, onNavigate }) {
  return (
    <aside style={{
      width: 'var(--sidebar-w)', flex: 'none', background: 'var(--surface-inverse)',
      color: 'var(--text-on-dark)', display: 'flex', flexDirection: 'column',
      padding: '20px 14px', position: 'sticky', top: 0, height: '100vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 22px' }}>
        <img src={(window.__resources && window.__resources.logoMark) || "../../assets/logo-mark-dark.svg"} width="30" height="30" alt="" />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#fff' }}>
          control<span style={{ color: 'var(--green-400)' }}>·</span>cuentas
        </span>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((n) => {
          const on = active === n.id;
          return (
            <button key={n.id} onClick={() => onNavigate(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px',
              border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', textAlign: 'left',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: on ? 600 : 500,
              background: on ? 'rgba(52,198,140,0.16)' : 'transparent',
              color: on ? 'var(--green-300)' : 'rgba(255,255,255,0.72)',
              transition: 'background .12s, color .12s',
            }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
            >
              <i data-lucide={n.icon} style={{ width: 17, height: 17 }}></i>{n.label}
            </button>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.6)' }}>Plan</div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#fff', marginTop: 2 }}>control·cuentas Plus</div>
      </div>
    </aside>
  );
}

function TopBar({ title, onAdd }) {
  const { Button, Avatar, IconButton } = NS_SHELL;
  return (
    <header style={{
      height: 'var(--topbar-h)', display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 28px', borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(247,249,251,0.85)', backdropFilter: 'saturate(140%) blur(8px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{title}</h1>
      <div style={{ flex: 1, maxWidth: 320, marginLeft: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-faint)' }}>
          <i data-lucide="search" style={{ width: 15, height: 15 }}></i>
          <span style={{ fontSize: 'var(--text-sm)' }}>Buscar movimiento…</span>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <IconButton label="Notificaciones" variant="ghost"><i data-lucide="bell" style={{ width: 18, height: 18 }}></i></IconButton>
        <Button variant="primary" iconLeft={<i data-lucide="plus" style={{ width: 16, height: 16 }}></i>} onClick={onAdd}>Nuevo movimiento</Button>
        <Avatar name="Lucía Romero" size={36} />
      </div>
    </header>
  );
}

window.Sidebar = Sidebar;
window.TopBar = TopBar;
window.CC_NAV = NAV;
