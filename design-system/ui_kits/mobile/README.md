# Mobile app — UI kit

Phone recreation of the control·cuentas mobile app, in a device frame. Open `index.html`.

**Screens (bottom tab bar):**
- **Inicio** — green *saldo total* hero, quick actions, horizontally-scrolling cuentas, recent movimientos.
- **Cuentas** — `AccountCard` list.
- **Movimientos** — full transaction list.
- **Presupuestos** — `CategoryBar` budgets.

**Interactive:** bottom tab navigation; quick-action *Añadir* jumps to movimientos.

**Files:** `Mobile.jsx` (all screens + data + tab bar). DS primitives come from `_ds_bundle.js` (`window.ControlCuentasDesignSystem_7df875`).
