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
| E1 | **El aspecto** — Tailwind, tokens del diseño, smoke e2e, tema oscuro | ✅ | F3, F4, F5, F6, F10 |
| E2 | **Tipos y cliente tipado** — tipos propios a partir del contrato + proxy | ✅ | F7 |
| E3 | **Shell de la aplicación** — sidebar, topbar, rutas base | ✅ | F8 |
| E4 | **Vista de Patrimonio** — la primera pantalla, contra GET /api/net-worth | ✅ | F9 |
| E5 | **La pantalla que dispara la ingesta** — aviso de «N nuevos» + botón importar | ✅ | F13, F14 |
| E6 | **Revisar antes de confirmar** — la pantalla de lo importado pendiente | ✅ | F15, F16, F17 |
| E7 | **El extracto** — tabla con filtros y búsqueda: el histórico completo | ⬜ | *sin features* |
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
Desde el 2026-09-13 (F10) la app es **solo oscura**: el tema redefine los tokens
semánticos en `src/assets/theme-dark.css`, así que todo componente que use alias
semánticos sale oscuro (regla en `docs/conventions.md`).

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

### E3 — Shell de la aplicación ✅

Sidebar + topbar + `RouterView` portados del design system a Vue3, textos en
inglés. Cerrada el 2026-09-12 por la F8: shell en `src/shared/components/`,
rutas en `src/router/index.ts` (`/` → `/net-worth`; placeholders `/overview`,
`/movements`, `/investments`, `/import`), Lucide vía `@lucide/vue`, `index.html`
con `lang="en"`. Sin página 404 todavía.

### E4 — Vista de Patrimonio ✅

La primera pantalla contra `GET /api/net-worth`. Bloque A (cifra total y
frase interpretada), bloque B (reparto por naturaleza y por banco) y bloque
E (detalle por banco y producto). Avisos de `investments.issues`. Portar
`StatCard`, `AccountCard`, `Card` y `Badge` del design system. Barras
horizontales, no donut. Cerrada el 2026-09-12 por la F9: cifras y porcentajes
en es-ES (`1.234,56 €`, `38,3 %`), fechas en-GB (`12 Sept 2026`), 4 grupos por
tipo, total leído de la API. Spec en `specs/09-net-worth-view/`. «Desde cuándo hay
dato» queda fuera: la API no lo trae (cabo 4).

> Los bloques C (cascada) y D (evolución) esperan a que el backend exponga
> patrimonio a una fecha o como serie histórica.

### E5 — La pantalla que dispara la ingesta ✅

Es la razón de ser de la idea nº 1 y **el backend ya tiene los dos endpoints**:
`GET /api/ingestion/pending` (el aviso de «N nuevos» al abrir) y
`POST /api/import` (el botón). Separadas a propósito: detectar es barato y
automático; importar es explícito y revisado.

> Corregido el 2026-09-15: el botón **no** es `POST /api/ingestion/process`, que
> desde la feature «import» del backend solo descarga y copia. `POST /api/import`
> es síncrono (sin progreso por archivo) y devuelve el informe completo.
> Decisiones del humano: progreso por fases, botón en la barra superior (se
> retira `/import` de la sidebar) y aviso incluido. Features **F13**
> `import-dialog` y **F14** `import-report-details`, ambas SDD.
>
> **F13 cerrada el 2026-09-15:** botón y aviso en la barra, modal por fases y
> resumen; probada contra el backend real (un archivo ya importado → 35
> duplicados). **F14 cerrada el mismo día:** detalle plegable de lo que conviene
> revisar (fallos de pasadas finales, descuadres, líneas no leídas, traspasos por
> emparejar, conflictos de reglas, archivos importados); solo lectura. Resolver
> traspasos y conflictos desde la web queda para etapas posteriores.

### E6 — Revisar antes de confirmar ✅

Todo lo que importe el backend nace en estado `pending_review`. Esta pantalla es
la que lo confirma o lo corrige. El endpoint `PATCH /api/movements/:id` ya
existe (feature 37 del backend).

> ✅ **Desbloqueada el 2026-09-18** por la feature 47 del backend
> (`movements-review-bulk`): `GET /api/movements` filtra además por `categoryId`,
> `uncategorized=true` y `q` (trozo de la descripción, sin mayúsculas ni tildes),
> y `PATCH /api/movements` aplica `status` y/o `categoryId` a una lista de hasta
> 200 ids, todo o nada, devolviendo los movimientos ya cambiados. La variante «por
> filtro» se descartó, y para crear reglas se usa `POST /api/category-rules`.
>
> Parte 2 del traspaso hecha: **F15** `review-queue` (la cola con filtros,
> búsqueda y totales, solo lectura) y **F16** `review-actions` (categorizar y
> confirmar, uno a uno y en bloque). Emparejar traspasos ambiguos y resolver
> conflictos de reglas queda para una feature posterior.
>
> **F15 cerrada el 2026-09-20:** `/review` con la cola, filtros en la URL,
> búsqueda por descripción, 100 por página y contador en la sidebar. Probada
> contra el backend real: 1.607 pendientes, 1.379 sin categoría y la búsqueda
> encontrando con y sin tildes, todo igual que la API. **F16 cerrada el
> 2026-09-22:** categorizar y confirmar uno a uno y en bloque (hasta la página
> entera), con deshacer y la cola y el contador al día sin recargar. Probada
> contra el backend real sobre un solo movimiento: categorizar, confirmar y
> deshacer, la cola bajando de 1.607 a 1.606 y volviendo.
>
> **F17 cerrada el 2026-09-22:** crear reglas desde un movimiento, la pantalla `Rules`
> (`/rules`) para verlas, cambiarlas y borrarlas, y aplicarlas sobre lo pendiente con
> `POST /api/category-rules/apply` bajo confirmación, viendo todos los conflictos sin
> resolverlos. Es lo que hace que categorizar sirva para las próximas importaciones.
> Probada contra el backend real: la regla `tulotero` → Ocio, creada desde Review y
> aplicada, dio «5 movements categorized · 1372 still without a matching rule ·
> 1 conflict» y la API confirmó esos mismos cinco movimientos. Spec en
> `specs/17-category-rules/`.
>
> Con la F17 la E6 queda cerrada. Emparejar traspasos ambiguos y resolver los
> conflictos de reglas desde la web siguen fuera: son features posteriores.

### E7 — El extracto ⬜

La tabla tipo extracto con búsqueda y filtros por fecha, cuenta, categoría y
texto: la vista del histórico completo, confirmados incluidos.

> ✅ **Servida por el backend, comprobado el 2026-09-22.** `GET /api/movements`
> filtra por `accountId`, `from`, `to`, `type` y `status` (feature 36 del backend) y,
> desde su feature 47, también por `categoryId`, `uncategorized` y `q` (trozo del
> concepto, sin mayúsculas ni tildes). La F15 ya usa los seis contra el backend real,
> así que esta etapa no está bloqueada por nada.
>
> **Filtro por forma de pago: no existe ni va a existir.** `Movement.paymentMethod`
> se quedó sin fuente y el histórico del Excel está descartado (decisión del humano,
> 2026-09-22: no se va a hacer nada con él). Esta etapa no debe prometerlo.

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
| 4 | La ficha de Patrimonio no puede decir «desde cuándo hay dato»: `GET /api/net-worth` no trae la fecha del primer dato por producto | backend, luego **E4** |
| 5 | El ejemplo JSON de `GET /api/net-worth` en el contrato del backend no cuadra (`investments.total`) — defecto de documentación, no de datos | backend |
| ~~6~~ | ~~`GET /api/ingestion/pending` cuenta también los archivos sin parser, así que el aviso «N new files» no bajaría a 0~~ | ✅ **retirado el 2026-09-15**: el humano confirma que todos los bancos tienen parser (Revolut incluido) y en Drive no hay PDFs, así que todo lo pendiente es importable |

> Los cabos 3, 4 y 5 **no son tuyos**: son del backend. Está aquí porque bloquea bloques
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
