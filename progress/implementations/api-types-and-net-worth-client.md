# Informe de implementación — Feature 7 `api-types-and-net-worth-client`

- **Fecha:** 2026-09-12
- **Agente:** implementer
- **Flujo:** simple (la feature **no** es SDD; el contrato es el `intent` +
  `acceptance` de `feature_list.json`)
- **Fuente de verdad del contrato:** `../gastos-backend/docs/api-contract.md`
  → `### GET /api/net-worth` (líneas 1063-1190). **Leído, no editado**; no se
  tocó nada del backend.

---

## Qué se hizo

1. **Tipos propios** de la respuesta de `GET /api/net-worth`, escritos leyendo
   el contrato, con el producto modelado como **unión discriminada por `type`**.
2. **Servicio tipado** `getNetWorth()` sobre el cliente HTTP existente
   (`src/services/http.ts`), con **mapeo/validación en la frontera**.
3. **Proxy `/api` → `http://localhost:3000`** en `vite.config.ts`.
4. **Resolución del choque proxy ↔ `appConfig.apiUrl`**: `loadConfig` admite
   base *root-relative* y los `.env` pasan a `/`.
5. **Tests unitarios** con la frontera HTTP (`fetch`) mockeada.
6. **Documentación** de la decisión y su trade-off en `docs/stack.md`.

## Archivos creados

| Archivo | Qué contiene |
|---|---|
| `src/features/net-worth/types.ts` | Los tipos propios. `DecimalString` (`:7`) y `DateOnly` (`:10`); `NetWorthAccount` (`:15`), `NetWorthAccounts` (`:24`); `MarketProduct` (`:40`), `DepositProduct` (`:52`), `SavingsAccountProduct` (`:63`) y la unión `InvestmentProduct` (`:72`); `NetWorthIssueReason` como enum cerrado (`:75`), `NetWorthIssue` (`:77`), `NetWorthInvestments` (`:85`) y `NetWorth` (`:91`). |
| `src/features/net-worth/service.ts` | `NET_WORTH_PATH` (`:27`), las guardas de frontera (`:47`-`:114`), `parseProduct` con la discriminación por `type` (`:138`), `parseNetWorth` (`:204`) y `getNetWorth()` (`:218`). |
| `src/features/net-worth/__tests__/service.spec.ts` | 11 tests con `globalThis.fetch` mockeado (sin backend real). |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/shared/config.ts` | `currentOrigin()` (`:15`); `loadConfig(raw, origin)` con el origen inyectable (`:30`-`:33`); rama de base relativa y fail-fast si no hay origen (`:47`-`:68`). |
| `src/shared/__tests__/config.spec.ts` | Dos tests nuevos: resolución de `/` contra el origen (`:26`) y `ConfigError` si no hay origen (`:35`). |
| `vite.config.ts` | Bloque `server.proxy` (`:20`-`:29`): `/api` → `http://localhost:3000` con `changeOrigin`. |
| `.env.development`, `.env.test`, `.env.production`, `.env.example` | `VITE_API_URL=/` (+ comentario explicando las dos formas admitidas). |
| `docs/stack.md` | Sección nueva *Acceso a la API en desarrollo: proxy + base relativa*; tabla de `VITE_API_URL` actualizada; nota de ADR-004 revisada (por qué se sigue sin librería de schemas). |
| `progress/current.md` | Bitácora de la sesión. |

---

## Decisiones y por qué

### D1 — El choque proxy ↔ `appConfig.apiUrl` (el punto delicado)

**Problema.** `createHttp` construye la URL con `new URL(path, config.apiUrl)` y
`loadConfig` exigía una URL **absoluta**. Con `VITE_API_URL=http://localhost:3000`
el navegador llama directo al backend, el proxy de Vite **no llega a
intervenir** y, como el backend no tiene CORS, la llamada falla.

**Decisión.** `VITE_API_URL` admite dos formas y los `.env` committeados usan la
relativa:

- empieza por `/` → se resuelve contra `location.origin` ⇒ petición
  **same-origin** ⇒ el proxy la reenvía;
- si no, debe ser una URL absoluta parseable (comportamiento anterior intacto).

`apiUrl` sigue siendo **siempre una URL absoluta ya resuelta**, así que
**`src/services/http.ts` no se tocó** y el criterio "un solo cliente HTTP" se
cumple por construcción.

**Coherencia con el fail-fast.** No se relaja nada: base relativa sin origen
(SSR / Node puro) → `ConfigError`; valor que no es ni URL ni ruta absoluta →
`ConfigError` con el mismo prefijo de mensaje de antes. Sigue ocurriendo al
importar `appConfig`, antes de montar la app.

**Alternativa descartada:** apuntar `VITE_API_URL` al propio dev server
(`http://localhost:5173`). No tocaba `config.ts`, pero ata la config a un puerto
concreto: si el 5173 está ocupado, Vite arranca en el 5174 y **todas** las
llamadas se van al servidor equivocado sin un error claro. La base relativa no
puede desincronizarse del puerto real.

**Coste aceptado:** `AppConfig.apiUrl` deja de ser literalmente lo que pone el
`.env` (se resuelve), y un despliegue con la API en **otro** origen tiene que
escribir la URL absoluta y habilitar CORS. Documentado en `docs/stack.md`.

**Efecto en los paths:** la base es el **origen** de la API, no `…/api`; los
servicios piden rutas absolutas con el prefijo incluido (`'/api/net-worth'`).
Es lo que ya asumían los tests de `http.spec.ts` (una base con path se ignora al
resolver una ruta absoluta), así que no se rompió ninguno.

**`.env.test` y `.env.production` también pasan a `/`:** en test jsdom aporta el
origen, y en producción el plan documentado (`docs/related-projects.md`) es
servir la app desde el mismo origen que la API. El e2e de humo sigue verde en
los dos modos (la puerta de `./init.sh` corre el modo dev).

### D2 — Unión discriminada por `type`, con `Account` reducido al del contrato

`InvestmentProduct = MarketProduct | DepositProduct | SavingsAccountProduct`,
discriminada por `type`. Así **un `null` nunca es ambiguo**: un `savings_account`
ni siquiera tiene la propiedad `marketValue` (el test lo comprueba), y el `value`
de un `deposit` no es nullable porque un depósito vale su `principal` mientras
vive. `MarketProductType` agrupa los tres tipos que fluctúan.

El `NetWorthAccount` tipa **exactamente** los seis campos que la respuesta de
patrimonio devuelve (`id`, `iban`, `bank`, `alias`, `type`, `balance`), no el
modelo `Account` completo del contrato: lo que no viaja en esta respuesta no se
tipa aquí.

### D3 — Importes como `DecimalString`, nunca `number`

Alias `DecimalString = string` (documentado) en todos los importes. El parser
**rechaza** un número donde el contrato promete string decimal: nada convierte a
`Number`, así que no se puede perder un céntimo. Nullable **solo** donde el
contrato lo permite: `value`, `marketValue`, `uninvestedCash`, `valuedAt` (y el
`valuedAt` de un issue).

### D4 — Validación en la frontera en vez de `as NetWorth`

El servicio no castea el JSON: `parseNetWorth` recorre la respuesta y lanza
`ValidationError` (el subtipo que ADR-003 dejó preparado para esto) con la ruta
del campo que falla (`investments.products[0].type is not one of …`). Coherente
con ADR-002 ("el service mapea la respuesta a los tipos del frontend") y con el
"no devolver el JSON crudo a la UI" de `docs/architecture.md`. **Sin
dependencias nuevas**: la revisión de ADR-004 (¿librería de schemas ahora que se
consume la API?) se resuelve "todavía no" y queda anotada en `docs/stack.md`.

### D5 — Cliente inyectable, no un cliente nuevo

`getNetWorth(client: HttpClient = http)`. Por defecto usa el cliente compartido
ligado a `appConfig`; el parámetro existe para que el futuro store se pueda
testear sin tocar globales. **No se creó ningún `fetch` nuevo**: los tests
mockean `globalThis.fetch` y dejan correr el `http` real, así que también
verifican la URL que se construye.

### D6 — Alcance: solo patrimonio

No se tipó `/api/overview` ni `/api/investments/overview`. No salía gratis: sus
respuestas son bastante mayores (períodos, `valuation`/`previousValuation`/
`change`, `periodGain` con su propio enum `excluded`) y ninguna pantalla las usa
todavía, así que se habrían desfasado antes de estrenarse — justo lo que pedía
evitar el `que_no_quiero`.

---

## Cobertura de los criterios de `acceptance`

| Criterio | Dónde se cumple | Test |
|---|---|---|
| Tipos propios de la respuesta (asOf, total, accounts, investments) | `src/features/net-worth/types.ts:91` | `maps the contract example into the frontend types` |
| Forma del producto según su `type` | `types.ts:40,52,63,72`; `service.ts:138` | `discriminates each product by its type, with the fields of that type` |
| Importes string decimal, nunca number; nullables según contrato | `types.ts:7`; `service.ts:87` | `keeps every amount as the decimal string the API sent, never a number`, `keeps a product without valuation as null instead of zero` |
| Otros endpoints: opcional, no hecho | D6 de este informe | — |
| Servicio tipado que reutiliza `services/http.ts` y expone `getNetWorth()` | `service.ts:218` | `requests the net worth path against the configured API base` |
| Proxy `/api` → `localhost:3000` en `vite.config.ts` | `vite.config.ts:20` | Verificación manual (abajo) |
| En `pnpm dev` la petición sale contra el origen del dev server y no da CORS | `.env.development` + `config.ts:47` | Verificación manual contra el backend real (abajo) |
| Decisión `VITE_API_URL` coherente con `loadConfig` y documentada | `config.ts:30`; `docs/stack.md` | `resolves a root-relative base against the page origin`, `fails fast when the base is relative and there is no origin` |
| Tests unitarios con HTTP mockeado | `src/features/net-worth/__tests__/service.spec.ts` | 11 tests, sin backend |
| type-check / lint / test:unit / init.sh en verde | — | ver abajo |
| No hay un segundo cliente HTTP | `service.ts:7` importa `http`; no hay `fetch(` en `src/features/` | — |

Caminos de error cubiertos (no solo el feliz): payload con importe numérico,
producto con `type` desconocido, error HTTP 500 que sale como `ApiError`, y base
de datos vacía (listas vacías y totales a `"0.00"`).

---

## Cómo se verificó

Todo lo que sigue está **reejecutado en esta sesión** (regla del proyecto: no se
afirma nada sin comprobarlo), no copiado de una ejecución anterior.

### Puerta automática

```
pnpm run type-check  → vue-tsc --build, sin errores (exit 0)
pnpm run lint        → oxlint + eslint, sin errores (exit 0)
pnpm run test:unit   → Test Files 7 passed (7) | Tests 62 passed (62)
pnpm run build       → vue-tsc + vite build, ✓ built in 187ms
                       (index.js 87.84 kB / gzip 34.31 kB)
```

`bash ./init.sh`, completo y verde:

```
── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (9 features)
[OK]    Specs presentes para features sdd con estado no-pending

── 4. Type checking (tsc) ──────────────────────────────
[OK]    Type check OK (tsc sin errores)

── 5. Ejecutando tests ─────────────────────────────────
 Test Files  7 passed (7)
      Tests  62 passed (62)
[OK]    Todos los tests pasan

── 6. E2E smoke (chromium) ─────────────────────────────
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

De los 62 tests unitarios, 11 son de `getNetWorth` (frontera `fetch` mockeada,
sin backend) y 2 nuevos de `loadConfig` (base relativa y su fail-fast).

### Prueba real contra el backend (el criterio del proxy y del CORS)

Backend arrancado en `:3000` (con su Postgres en Docker) y `pnpm dev` en
`:5173`. En un **navegador real**, llamando al propio servicio
(`getNetWorth()`, no un `curl` paralelo):

> **Quién ejecutó esto y cómo, para que sea reproducible.** La pasada del
> navegador la ejecutó el **leader**, no el implementer ni el reviewer: ninguno
> de los dos tiene navegador. Se hizo con un script temporal de Playwright
> (`chromium` de `@playwright/test`, lanzado desde la raíz del proyecto para que
> resuelva `node_modules`, y **borrado después**: no queda en el repo). El
> script abre `http://localhost:5173/`, importa el módulo real por el grafo de
> Vite (`await import('/src/features/net-worth/service.ts')`), llama a
> `getNetWorth()` y escucha los eventos `console` y `request` de la página para
> poder afirmar lo del CORS y lo del origen. Se repite cambiando el script si
> hace falta; **no hay test automatizado que lo cubra**, y anotarlo así es
> justamente lo que permite no confundir esta evidencia con la puerta de
> `./init.sh`.

- devolvió `asOf: "2026-09-12"`, `total: "90162.46"` — **string, no number**;
- 4 cuentas que suman `accounts.total: "28061.72"`;
- 7 productos, en este orden de `type`: `savings_account`,
  `managed_portfolio`, `deposit`, `etf`, `fund`, `deposit`, `fund` — es decir,
  los tres constructores de la unión discriminada (incluido `deposit` dos veces
  y `fund` dos veces) se ejercitan con datos reales;
- `appConfig.apiUrl` resolvió a `http://localhost:5173/` y la petición salió a
  `http://localhost:5173/api/net-worth`: **por el proxy, no directa a `:3000`**;
- **cero errores de consola**, ningún CORS.

Comprobación de que el proxy no altera el dato, reejecutada aquí:

```
curl http://localhost:3000/api/net-worth   → 200
curl http://localhost:5173/api/net-worth   → 200
cmp de los dos cuerpos                     → IDENTICAL BYTES
```

Y que los tipos coinciden con lo que la API devuelve **hoy**, no solo con el
ejemplo del contrato: el payload real se pasó por `parseNetWorth` en un spec
temporal (`vitest run`, 1 passed, fichero ya borrado) → **parsea sin
`ValidationError`**, con `asOf`, `total`, 4 cuentas y 7 productos.

> Nota honesta sobre la cobertura: la base real devolvió
> `investments.issues: []` y `investments.total: "62100.74"`. El camino de
> `issues` (los tres `reason`) está cubierto **solo** por el ejemplo del
> contrato en el test unitario, no por datos reales; hoy no hay forma de
> provocarlo sin tocar la base del backend.

### Nota sobre otros archivos modificados en el árbol

`git status` muestra también `docs/related-projects.md`, `docs/roadmap.md` y el
alta de las features 7-9 en `feature_list.json`: son del paso de documentación
**previo** (el leader, antes de implementar), no de esta implementación. De la
feature 7 son los archivos de las dos tablas de arriba.

### Revisión contra `docs/conventions.md` y `docs/architecture.md`

Repasado el código escrito contra las dos fuentes: **no se encontró ningún
incumplimiento ni ningún bug**, así que no se corrigió nada en esta pasada.
Comprobado en concreto: `fetch(` aparece en `src/` **una sola vez**
(`src/services/http.ts:43`) — no hay segundo cliente; `import type` en todos los
imports de tipos (`verbatimModuleSyntax`); orden de imports vendor → `@/` →
relativos; identificadores, comentarios y nombres de fichero en inglés y
contenido de `progress/` en español; tests co-localizados en
`src/features/net-worth/__tests__/`; el service mapea y no guarda estado
(ADR-002), y lanza `ValidationError` / deja pasar `ApiError` (ADR-003); cero
dependencias nuevas.

---

## Sugerencias fuera de alcance (NO aplicadas)

1. **`vite.config.ts` no pasa `prettier --check`** — y ya no pasaba antes de
   este cambio (`pnpm format` solo formatea `src/`). Sugerencia: ampliar el
   script `format` a los ficheros de configuración de la raíz, en su propia
   tarea de mantenimiento.
2. **Store Pinia + composable de patrimonio**: esta feature es solo capa de
   datos; el estado (`loading`/`error`) es de la feature 9 (`net-worth-view`).
3. **Tipar `/api/overview` e `/api/investments/overview`** cuando su pantalla
   exista (ver D6).
4. **`expectedGain` / `maturityDate` de un `deposit` se tipan no-nullables**
   porque el contrato los presenta siempre presentes para ese tipo, aunque en el
   modelo de datos del backend sean columnas nullables (lo son para los otros
   cuatro tipos de producto). Si algún día el backend serializa `null` ahí, el
   parser lo cazará con un `ValidationError` claro en vez de mentir.

---

## Estado final en `feature_list.json`

La feature 7 sigue en **`in_progress`**. **No se marca `done`**: lo hará el
leader tras el veredicto del `reviewer` y con su
`progress/summaries/api-types-and-net-worth-client.md` escrito.
