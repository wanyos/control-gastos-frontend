# Roadmap — por dónde va el frontend

> **Para qué sirve este archivo:** para saber en dos minutos **dónde estás**,
> **qué viene después** y **por qué en ese orden**. Es el mapa del recorrido
> completo, no el detalle de ninguna parada.
>
> **Última revisión:** 2026-09-12.

## Este documento frente a los otros

| Documento | Responde a | Alcance temporal |
|---|---|---|
| `../docs/ideas.md` (workspace) | ¿Qué quiero que haga la app? | Producto, sin fecha |
| **`docs/roadmap.md`** (este) | **¿Por dónde voy y qué falta?** | **Todo el recorrido** |
| [`feature_list.json`](../feature_list.json) | ¿Qué hace exactamente la feature N? | Una feature |
| [`progress/current.md`](../progress/current.md) | ¿En qué quedó la última sesión? | Una sesión |
| [`progress/history.md`](../progress/history.md) | ¿Qué pasó y cuándo? | Bitácora, append-only |

**Regla de convivencia:** este archivo **no repite** el contenido de los otros,
enlaza a ellos. Si una etapa necesita más de cinco líneas aquí, es que su sitio
es el `intent` de una feature.

---

## Dónde estás ahora mismo 📍

**Tienes los cimientos y el aspecto, pero todavía no hay aplicación.** Las seis
features cerradas son infraestructura: arranque, cliente HTTP, Tailwind, tokens
del diseño y un smoke e2e. **Ninguna pantalla, ninguna llamada real a la API,
cero features de producto.**

El backend va muy por delante (45 features cerradas) y **ya tiene todo lo que
la primera pantalla necesita**: `GET /api/net-worth`, `GET /api/accounts`,
`GET /api/overview`, `GET /api/investments/overview`, filtros y paginación de
movimientos, confirmación de movimientos y reglas de categorización. La
conexión backend→frontend se hace ahora.

---

## El recorrido en etapas

Leyenda: ✅ hecho · 🟡 a medias · ⬜ sin empezar · ⚠️ hecho con deuda

| # | Etapa | Estado | Features |
|---|---|---|---|
| E0 | **Cimientos** — arranque, errores, config, cliente HTTP | ✅ | F1, F2 |
| E1 | **El aspecto** — Tailwind, tokens del diseño, smoke e2e | ✅ | F3, F4, F5, F6 |
| E2 | **Tipos y cliente tipado** — tipos propios a partir del contrato + proxy | ✅ | F7 |
| E3 | **Shell de la aplicación** — sidebar, topbar, rutas base | ⬜ ← | F8 |
| E4 | **Vista de Patrimonio** — la primera pantalla, contra GET /api/net-worth | ⬜ | F9 |
| E5 | **La pantalla que dispara la ingesta** — aviso de «N nuevos» + botón importar | ⬜ | *sin features* |
| E6 | **Revisar antes de confirmar** — la pantalla de lo importado pendiente | ⬜ | *sin features* |
| E7 | **El extracto** — tabla con filtros y búsqueda, la que sustituye al Excel | ⬜ | *sin features* |
| E8 | **Los dashboards** — ingresos vs gastos, saldo por cuenta, patrimonio | ⬜ | *sin features* |
| E9 | **Que esto se vea desde algún sitio** — despliegue y acceso | ⬜ | *sin etapa hasta hoy* |

### E0 — Cimientos ✅

Vue 3 + TypeScript, router, manejo de errores
([`src/shared/errors.ts`](../src/shared/errors.ts)), configuración por entorno
([`src/shared/config.ts`](../src/shared/config.ts)) y el cliente HTTP
([`src/services/http.ts`](../src/services/http.ts)) que consumirán todas las
features. `src/features/` está creada y **vacía**.

### E1 — El aspecto ✅

Tailwind configurado, los tokens del diseño cargados como CSS
([`src/assets/styles/tokens/`](../src/assets/styles/tokens/)), el
[`design-system/`](../design-system/) con sus fichas, la lista blanca de fuentes
que Tailwind escanea, y un e2e que comprueba que la app monta de verdad.

### E2 — Tipos y cliente tipado ✅

Leer el contrato del backend (`../gastos-backend/docs/api-contract.md`),
definir **los tipos propios** de este proyecto a partir de él (no se comparten
con el backend, ver [`docs/related-projects.md`](./related-projects.md)),
dejar el cliente HTTP tipado contra ellos y configurar el proxy de Vite para
desarrollo. Cerrada el 2026-09-12 por la F7: tipos de `GET /api/net-worth`
en `src/features/net-worth/`, servicio sobre `src/services/http.ts`, proxy de
`/api` en `vite.config.ts` y `VITE_API_URL=/` (base relativa admitida en
`loadConfig`, trade-off en [`docs/stack.md`](./stack.md)). Cierra el cabo
suelto 1 y, de paso, el 2.

### E3 — Shell de la aplicación ⬜ ← **el siguiente**

Sidebar + topbar + `RouterView` portados del design system a Vue3, textos en
inglés. Rutas reales en `src/router/index.ts`: `/net-worth` como home, el
resto como placeholders, todas con nombre en inglés. Instalar Lucide. `index.html` con título y
`lang="en"`. Estrena `src/features/`.

### E4 — Vista de Patrimonio ⬜

La primera pantalla contra `GET /api/net-worth`. Bloque A (cifra total y
frase interpretada), bloque B (reparto por naturaleza y por banco) y bloque
E (detalle por banco y producto). Avisos de `investments.issues`. Portar
`StatCard`, `AccountCard`, `Card` y `Badge` del design system. Barras
horizontales, no donut. Formato de moneda en-US (`€12,480.55`).

> Los bloques C (cascada) y D (evolución) esperan a que el backend exponga
> patrimonio a una fecha o como serie histórica.

### E5 — La pantalla que dispara la ingesta ⬜

Es la razón de ser de la idea nº 1 y **el backend ya tiene los dos endpoints**:
`GET /api/ingestion/pending` (el aviso de «N nuevos» al abrir) y
`POST /api/ingestion/process` (el botón). Separadas a propósito: detectar es
barato y automático; importar es explícito y revisado.

### E6 — Revisar antes de confirmar ⬜

Todo lo que importe el backend nace en estado `pending_review`. Esta pantalla es
la que lo confirma o lo corrige. El endpoint `PATCH /api/movements/:id` ya
existe (feature 37 del backend).

### E7 — El extracto ⬜

La tabla tipo extracto con búsqueda y filtros por fecha, cuenta, categoría,
forma de pago y texto: la vista que de verdad sustituye al Excel.

> 🟡 **Parcialmente servida por el backend, comprobado el 2026-09-12.**
> `GET /api/movements` ya filtra por `accountId`, `from`, `to`, `type` y
> `status`, y pagina con `page`/`pageSize` (feature 36 del backend). **Le
> faltan los dos filtros que esta vista más necesita**: por **categoría** y la
> **búsqueda por texto del concepto**. Están anotados como pendientes en la E7
> del roadmap del backend. El de **forma de pago no va a existir**:
> `Movement.paymentMethod` se quedó sin fuente al descartar el Excel
> (`../../docs/ideas.md` §6), así que esta etapa **no debe prometerlo**.

### E8 — Los dashboards ⬜

Ingresos vs gastos del mes, saldo por cuenta, patrimonio total y su evolución,
reparto por categoría, comparativa entre meses. El backend ya expone los
agregados: `GET /api/overview`, `GET /api/investments/overview`,
`GET /api/net-worth`.

### E9 — Que esto se vea desde algún sitio ⬜

**Ninguna etapa lo cubría hasta hoy.** La app es web y se usa desde varios
ordenadores; en algún momento deja de ser `localhost`. Dónde se sirve el build,
contra qué URL de API, y cómo se controla el acceso a una aplicación que enseña
datos bancarios reales. No es urgente; es que no estaba.

---

## Cabos sueltos con dueño

| # | Cabo suelto | Lo resuelve |
|---|---|---|
| ~~1~~ | ~~Los tipos de este proyecto todavía no existen; el contrato del backend cambió y nadie lo consume~~ | ✅ **cerrado por la F7** |
| ~~2~~ | ~~`src/features/` está vacía: la convención de una carpeta por feature no se ha estrenado~~ | ✅ **cerrado por la F7**: la estrenó `src/features/net-worth/`, no la F8 como se previó |
| 3 | Cascada y evolución de Patrimonio necesitan histórico del backend (`GET /api/net-worth?asOf=` o serie) | backend, luego **E4** bloques C y D |

> El cabo 3 **no es tuyo**: es del backend. Está aquí porque bloquea bloques
> de la vista de Patrimonio y la regla de oro del workspace dice que el backend
> va primero. Si aparece aquí antes de estar resuelto allí, la feature nace mal.

---

## La regla que manda en este proyecto

**El backend es dueño del contrato y va primero.** Si hace falta un endpoint que
`../gastos-backend/docs/api-contract.md` no tiene, **se para**: se anota como
dependencia del backend en [`progress/current.md`](../progress/current.md) y se
implementa allí, en su propia sesión. Detalle en
[`docs/related-projects.md`](./related-projects.md).

---

## Cómo se mantiene este archivo

1. **Se lee al empezar** la sesión, después de `progress/current.md`
   ([`AGENTS.md`](../AGENTS.md) §1).
2. **Se actualiza al cerrar** una feature, en el mismo paso en que se vacía
   `current.md` ([`AGENTS.md`](../AGENTS.md) §5): cambiar el estado de su etapa y
   tachar el cabo suelto que haya resuelto. Normalmente son **dos líneas**.
3. **No crece.** Si una etapa necesita más de cinco líneas, su sitio es el
   `intent` de una feature, no aquí.
