# Web dashboard — UI kit

Full desktop recreation of the control·cuentas personal-finance dashboard. Open `index.html`.

**Shell:** dark sticky `Sidebar` (248px) + translucent `TopBar` (search, notifications, *Nuevo movimiento*, avatar).

**Views (sidebar-switchable):**
- **Resumen** — 4 KPI `StatCard`s, *Ingresos vs. gastos* bar chart, *Gastos por categoría* donut + legend, recent `TransactionRow`s, cuentas + próximos pagos.
- **Cuentas** — patrimonio KPIs + all `AccountCard`s.
- **Movimientos** — filters + full transaction list.
- **Presupuestos** — `CategoryBar` budget tracking.
- *Inversiones / Metas* — placeholder mocks.

**Interactive:** sidebar navigation, *Nuevo movimiento* modal (gasto/ingreso toggle, importe, categoría, cuenta), donut hover.

**Files:** `data.js` (mock data) · `charts.jsx` (Donut, Bars) · `Shell.jsx` (Sidebar, TopBar) · `Views.jsx` · `App.jsx` (shell + modal). DS primitives come from `_ds_bundle.js` (`window.ControlCuentasDesignSystem_7df875`).
