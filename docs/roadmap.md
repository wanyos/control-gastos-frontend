# Roadmap — por dónde va el frontend

> **Para qué sirve este archivo:** para saber en dos minutos **dónde estás**,
> **qué viene después** y **por qué en ese orden**. Es el mapa del recorrido
> completo, no el detalle de ninguna parada.
>
> **Última revisión:** 2026-08-11.

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

Y hay un dato que condiciona todo lo que viene: **el backend va muy por delante**
y su contrato ya cambió sin que este proyecto lo consuma (ver E1).

---

## El recorrido en etapas

Leyenda: ✅ hecho · 🟡 a medias · ⬜ sin empezar · ⚠️ hecho con deuda

| # | Etapa | Estado | Features |
|---|---|---|---|
| E0 | **Cimientos** — arranque, errores, config, cliente HTTP | ✅ | F1, F2 |
| E1 | **El aspecto** — Tailwind, tokens del diseño, smoke e2e | ✅ | F3, F4, F5, F6 |
| E2 | **Ponerse al día con el contrato** — tipos propios a partir de la API real | ⬜ | *sin feature* |
| E3 | **La pantalla que dispara la ingesta** — aviso de «N nuevos» + botón importar | ⬜ | *sin features* |
| E4 | **Revisar antes de confirmar** — la pantalla de lo importado pendiente | ⬜ | *sin features* |
| E5 | **El extracto** — tabla con filtros y búsqueda, la que sustituye al Excel | ⬜ | *sin features* |
| E6 | **Los dashboards** — ingresos vs gastos, saldo por cuenta, patrimonio | ⬜ | *sin features* |
| E7 | **Que esto se vea desde algún sitio** — despliegue y acceso | ⬜ | *sin etapa hasta hoy* |

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

### E2 — Ponerse al día con el contrato ⬜ ← **el siguiente**

> 🔴 **Deuda heredada del backend:** `/api/expenses*` **ya no existe** (404). El
> contrato vigente son `Account`, `Category` y `Movement`, en
> `../gastos-backend/docs/api-contract.md`. Nadie lo consume todavía, así que el
> breaking change no ha roto nada — **pero la primera feature que llame a la API
> tiene que partir del contrato nuevo**, no de lo que se recordaba.

Alcance previsto: leer el contrato, definir **los tipos propios** de este
proyecto a partir de él (no se comparten con el backend, ver
[`docs/related-projects.md`](./related-projects.md)) y dejar el cliente HTTP
tipado contra ellos.

### E3 — La pantalla que dispara la ingesta ⬜

Es la razón de ser de la idea nº 1 y **el backend ya tiene los dos endpoints**:
`GET /api/ingesta/pending` (el aviso de «N nuevos» al abrir) y
`POST /api/ingesta/process` (el botón). Separadas a propósito: detectar es
barato y automático; importar es explícito y revisado.

### E4 — Revisar antes de confirmar ⬜

Todo lo que importe el backend nace en estado `pending_review`. Esta pantalla es
la que lo confirma o lo corrige.

> ⚠️ **Bloqueada por el backend:** hoy **nada** pasa un movimiento de
> `pending_review` a `confirmed` — no existe el endpoint. Es un cabo suelto
> abierto en `../gastos-backend/docs/roadmap.md` (E6). **Esta etapa no se puede
> planificar hasta que exista.**

### E5 — El extracto ⬜

La tabla tipo extracto con búsqueda y filtros por fecha, cuenta, categoría,
forma de pago y texto: la vista que de verdad sustituye al Excel.

> ⚠️ **Bloqueada por el backend:** `GET /api/movements` es hoy un listado plano
> **sin filtros, sin rango de fechas y sin paginación**. Con años de movimientos
> no vale. Cabo suelto abierto en el roadmap del backend (E7).

### E6 — Los dashboards ⬜

Ingresos vs gastos del mes, saldo por cuenta, patrimonio total y su evolución,
reparto por categoría, comparativa entre meses. Depende de que el backend exponga
los agregados (su etapa E7), no solo listados.

### E7 — Que esto se vea desde algún sitio ⬜

**Ninguna etapa lo cubría hasta hoy.** La app es web y se usa desde varios
ordenadores; en algún momento deja de ser `localhost`. Dónde se sirve el build,
contra qué URL de API, y cómo se controla el acceso a una aplicación que enseña
datos bancarios reales. No es urgente; es que no estaba.

---

## Cabos sueltos con dueño

| # | Cabo suelto | Lo resuelve |
|---|---|---|
| 1 | Los tipos de este proyecto todavía no existen; el contrato del backend cambió y nadie lo consume | **E2** |
| 2 | `src/features/` está vacía: la convención de una carpeta por feature no se ha estrenado | **E3**, la primera que la use |
| 3 | Nada confirma un movimiento importado — **falta el endpoint en el backend** | backend E6, luego **E4** |
| 4 | No se pueden filtrar ni paginar los movimientos — **falta en el backend** | backend E7, luego **E5** |

> Los cabos 3 y 4 **no son tuyos**: son del backend. Están aquí porque bloquean
> etapas de este proyecto y la regla de oro del workspace dice que el backend va
> primero. Si aparecen aquí antes de estar resueltos allí, la feature nace mal.

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
