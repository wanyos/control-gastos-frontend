# Informe de implementación — feature 9 `net-worth-view`

- **Fecha:** 2026-09-12
- **Agente:** implementer
- **Spec:** `specs/09-net-worth-view/` (aprobado por el humano el 2026-09-12)
- **Estado en `feature_list.json`:** `in_progress` (sin tocar). A la espera del `reviewer`.
- **Commits:** ninguno.

## Tareas cerradas

Las 15 de `specs/09-net-worth-view/tasks.md`, en orden, todas `[x]`.

| Task | Resultado |
|---|---|
| T0 | Línea base verde. **El smoke se pone rojo sin backend** (ver §E2E). Aplicada la solución aprobada. |
| T1 | `ES2023.Intl` en `tsconfig.app.json:11` y también en `tsconfig.vitest.json:13` (el type-check de tests lo pidió). |
| T2 | `src/shared/money.ts` + `src/shared/__tests__/money.spec.ts` (16 tests). |
| T3 | `src/features/net-worth/__tests__/fixtures.ts`: coherente, inconsistente (`total: "999.99"`) y base vacía. |
| T4 | `src/features/net-worth/breakdown.ts` + `breakdown.spec.ts` (12 tests). |
| T5 | `src/features/net-worth/sentence.ts` + `sentence.spec.ts` (9 tests). |
| T6 | `src/features/net-worth/issues.ts` + `issues.spec.ts` (5 tests). |
| T7 | `src/features/net-worth/store.ts` + `store.spec.ts` (5 tests). |
| T8 | `BaseCard`, `BaseBadge`, `StatCard`, `ShareBar` en `src/shared/components/` + `BaseComponents.spec.ts` (10 tests). |
| T9 | `AccountCard`, `BreakdownList`, `DataWarnings`, `BankCard` en `src/features/net-worth/components/`. |
| T10 | `NetWorthView.vue` real; fuera el placeholder y su `TODO(feat-9)`. |
| T11 | `NetWorthView.spec.ts` (21 tests). |
| T12 | `AppShell.spec.ts` ajustado (Pinia + `fetch` pendiente; placeholder comprobado en `/overview`). |
| T13 | `docs/conventions.md` y `docs/stack.md`. |
| T14 | Gate completo verde, grep de conversiones, comprobación contra el backend real. |

## Trazabilidad `R<n>` ↔ test

| R | Tests |
|---|---|
| R1 | `NetWorthView.spec.ts:52` *requests the net worth exactly once on mount*; `store.spec.ts:26` *load() fetches the net worth once and keeps it* |
| R2 | `NetWorthView.spec.ts:59` *shows a loading state and no blocks while the request is pending*; `store.spec.ts:40` *is loading while the request is in flight* |
| R3 | `store.spec.ts:55` *keeps the ApiError instance…* (`API_HTTP`, no relanza); `store.spec.ts:70` *normalizes a non-Error rejection* (`UNKNOWN`); `NetWorthView.spec.ts:70` *shows the store error message and no blocks*; `NetWorthView.spec.ts:82` *contract drift (ValidationError)* |
| R4 | `NetWorthView.spec.ts:90` *shows the API total as is, never a client-side sum* (fixture inconsistente → `999,99 €`) |
| R5 | `sentence.spec.ts:17-110` (normal, ejemplo aprobado `38,3 %`, 1 banco, sin `checking`, `checking` ≤ 0, banco solo con huecos, total ≤ 0, base vacía, sin crecimiento); `NetWorthView.spec.ts:118` *sentence inside block A* |
| R6 | `money.spec.ts:70` *groups thousands even with 4 digits* (regresión CLDR); `:74` `-5,00 €` / `0,00 €`; `:80` más allá de `Number`; `:90` `38,3 %`; `NetWorthView.spec.ts:126` *paints every figure in mono tabular numbers* |
| R7 | `breakdown.spec.ts:26` pertenencia por `type`; `:46` importes exactos; `:59` grupo vacío omitido; `NetWorthView.spec.ts:138` filas, % y `width: 38.3%`; `:156` sin % ni barras con total ≤ 0 |
| R8 | `breakdown.spec.ts:85` *adds up exactly to total in both breakdowns*; `:92` *every valued account and product in exactly one group*; `:162` las fixtures cuadran y pasan `parseNetWorth` |
| R9 | `NetWorthView.spec.ts:97` aviso con `39.924,05 €` y `999,99 €`, sin corregir; `:112` ausente con la coherente |
| R10 | `NetWorthView.spec.ts:171` badge solo en la fila `Checking accounts`; `:181` sin `checking` no aparece |
| R11 | `breakdown.spec.ts:125` cinco slugs → nombres y orden por importe; `:144` empate por label; `:155` slug desconocido; `NetWorthView.spec.ts:193` filas por banco (incluye N26 negativo con barra `0%`) |
| R12 | `NetWorthView.spec.ts:211` nº de fichas y filas, `Valued …` del fondo, `Matured …` del depósito, `As of …` de la cuenta (esperados con `formatDate`); `issues.spec.ts:49` etiquetas de tipo; `money.spec.ts:103,108` fechas en-GB sin corrimiento |
| R13 | `NetWorthView.spec.ts:237` hueco `No valuation` sin `0,00 €`; `:247` banco solo con hueco: ficha sí, fila de reparto no; `breakdown.spec.ts:102` fuera de todo grupo e importes iguales sin él; `:115` |
| R14 | `issues.spec.ts:8,14,27` texto exacto por `reason`; `NetWorthView.spec.ts:259` 3 avisos; `:273` 0 avisos y sin panel |
| R15 | `NetWorthView.spec.ts:282` sin `Patrimonio`/`Cuenta`/`Saldo`/`Depósito`/`Fondo`/`Aviso`/`Vencido`, con los títulos en inglés; `issues.spec.ts:49` |
| C1 | `NetWorthView.spec.ts:302` solo `net-worth-block-a`, `-b`, `-e` |
| C2 | `git diff --quiet package.json pnpm-lock.yaml` → sin cambios |
| C3 | `e2e/app-boot.spec.ts` verde en `./init.sh`, sin backend y en modo CI (ver §E2E) |
| C4 | Solo alias semánticos (grep sin hex ni paleta de serie en los `.vue` nuevos); `src/assets/styles/` sin tocar (`styles.spec.ts` verde) |
| C5 | Comprobado contra el backend real (ver §Verificación) |
| C6 | Ver §Verificación |

## E2E de humo (🔴6)

**T0 confirmó el rojo.** Con una vista provisional que llamaba a `load()` y el
backend "parado", el smoke falló con
`Failed to load resource: the server responded with a status of 502 (Bad Gateway)`.

Cómo se simuló "parado" sin tocar procesos ajenos: al empezar ya había un
backend en `:3000` y un dev server en `:5173` que no arranqué yo, así que no los
paré. Lancé el mismo smoke con una config temporal de Playwright + Vite en el
scratchpad de la sesión (fuera del repo) que sirve la app en `:5199` con el
proxy `/api` apuntando a un puerto cerrado (`:3999`). Mismo código, mismo spec.

**Cambio aplicado (el aprobado, único cambio en `e2e/`):**
`e2e/app-boot.spec.ts:25` declara `NET_WORTH_SAMPLE`, una respuesta pequeña y
coherente con el contrato (una cuenta `checking` de 1500.00, sin productos;
totales que cuadran), y `e2e/app-boot.spec.ts:47` la sirve con
`page.route('**/api/net-worth', …)` antes de `page.goto('/')`. Son 15 líneas
(las ~10 previstas más el formato del objeto). No se añadió ninguna aserción de
la vista ni se filtraron errores de consola: el smoke sigue probando el
arranque real.

**Por qué no bastaba con `./init.sh`:** la puerta reutiliza el dev server que
ya esté en `:5173` (`reuseExistingServer`). Hoy ese servidor tiene backend
detrás, así que `./init.sh` habría pasado igual sin el cambio: el rojo solo se
ve sin backend, y por eso se comprobó aparte. Tras el cambio, el smoke pasa en
los tres modos: sin backend (`:5199`), `./init.sh` y `CI=true` contra el build
de producción (`E2E_PREVIEW_PORT=8099`).

## Decisiones de implementación (dentro del spec) y su porqué

1. **Guarda de tipo en vez de cast para formatear strings.**
   `Intl.NumberFormat#format` con `ES2023.Intl` acepta `` `${number}` ``, no
   `string`. `isNumericLiteral` (`src/shared/money.ts:35`) es un type predicate
   que valida el formato antes de formatear: sin `as`, como pedía design §3.
2. **`tsconfig.vitest.json` también lleva `ES2023.Intl`** (`lib: ["ES2023.Intl"]`).
   Design §1 lo dejaba a revisar: el type-check de tests fallaba al importar
   `money.ts`. Se añadió solo esa entrada para no alterar el resto de su lib.
3. **Redondeo "half-up" = mitad lejos de cero** en `sharePermille`
   (`money.ts:66`): un grupo negativo con resto de mitad redondea hacia fuera
   (`-382.50/1000` → `-383`). Es el significado de `HALF_UP` en finanzas. Solo
   afecta al % mostrado de un grupo negativo (su barra ya es 0).
4. **Los dos `Number(` de `money.ts` no tocan importes:** `:77` convierte un
   permille ya redondeado (entero pequeño) y `:111` los componentes año/mes/día
   de una fecha. Ningún `Number(`/`parseFloat`/`parseInt`/`toFixed` sobre un
   importe en `src/`.
5. **El aviso de descuadre se calcula en la vista** (`NetWorthView.vue:136`,
   `mismatchOf`, comparando en céntimos) y se pasa a `BreakdownList` como
   `mismatchSum`. Así el componente es tonto. Con la fixture inconsistente
   salen **dos** avisos, uno por reparto, porque R9 aplica a "un reparto".
6. **Badge `Idle money` en tono `neutral`.** El spec no fija el tono; `warning`
   se descartó para no confundirlo con los avisos de honestidad del dato, que ya
   lo usan.
7. **Orden y color de las fichas del bloque E:** mismo orden que el reparto por
   banco y, detrás, los bancos que solo tienen huecos (por label). El color del
   tile es el `bg-chart-N` de su posición, igual que su barra. Dentro de la
   ficha, los productos van en el orden de la tabla de design §7 (`fund`,
   `etf`, `managed_portfolio`, `savings_account`, `deposit`) y después por nombre.
8. **`issueMessage` con `valuedAt: null` en `stale_valuation` /
   `matured_not_closed`:** el contrato siempre manda fecha en esos dos casos,
   pero el tipo admite `null`. Si llega `null` se quita la cláusula de la fecha
   en vez de inventar una (`issues.ts:24`); tiene test propio (`issues.spec.ts:41`).
9. **`BaseCard` admite un slot `subtitle`** además de la prop, para que el
   importe del banco en la ficha vaya en `font-mono tabular-nums` (R6).
10. **Comentarios de portado en `<script>`, no en `<template>`.** Un comentario
    HTML en la raíz del template convierte el componente en fragment y rompe el
    paso de atributos (`data-test` no llegaba a `BaseBadge`/`BaseCard`). Lo
    detectó `BaseComponents.spec.ts`.
11. **Sondas de `tailwind-sources.spec.ts` sustituidas**
    (`src/assets/__tests__/tailwind-sources.spec.ts:32` y `:35`). La vista
    aprobada usa `bg-chart-3` (colores de barra) y `bg-negative-subtle` (badge
    de descuadre), así que esas dos sondas dejaron de ser válidas: el propio test
    falla pidiendo "replace this probe". Se cambiaron por `text-ink-link` y
    `rounded-2xl`, que solo cita `docs/stack.md` y no usa `src/`. **No estaba
    en la lista de archivos de design §1**; es mantenimiento forzado por el
    diseño aprobado y el test sigue vigilando lo mismo.
12. **NBSP en tests con `String.fromCharCode(0xa0)`**, no con la secuencia de
    escape unicode: las herramientas de edición de esta sesión la convertían en
    el carácter literal, indistinguible de un espacio en el diff.
13. **`items-start` en la rejilla de fichas** (`NetWorthView.vue:48`): visto en
    navegador, una ficha corta se estiraba hasta la altura de su vecina.

## Archivos tocados

**Creados**
- `src/shared/money.ts:40-111` — `toCents`, `fromCents`, `sumAmounts`, `sharePermille`, `formatMoney`, `formatPercent`, `formatDate`; formateadores en `:17-32`.
- `src/shared/components/BaseCard.vue:2` (slot `subtitle` en `:9`), `BaseBadge.vue:30` (`TONES`), `StatCard.vue:16` (`data-test="money"`), `ShareBar.vue:23` (ancho acotado).
- `src/features/net-worth/store.ts:12` (`useNetWorthStore`), `:18` (`load`), `:25` (`toAppError`).
- `src/features/net-worth/breakdown.ts:46` (`bankLabel`), `:54` (`classify`), `:101` (`groupByNature`), `:112` (`groupByBank`), `:132` (`sumOfGroups`).
- `src/features/net-worth/sentence.ts:10` (`countBanks`), `:17` (`buildSummarySentence`).
- `src/features/net-worth/issues.ts:17` (`holdingTypeLabel`), `:21` (`issueMessage`).
- `src/features/net-worth/components/AccountCard.vue:22` (hueco), `:59`; `BreakdownList.vue:22` (idle), `:41` (barra), `:51` (descuadre); `DataWarnings.vue:2`; `BankCard.vue:69` (`productDetail`), `:77` (filas).
- Tests: `src/shared/__tests__/money.spec.ts`, `src/shared/components/__tests__/BaseComponents.spec.ts`, `src/features/net-worth/__tests__/{fixtures,breakdown.spec,sentence.spec,issues.spec,store.spec,NetWorthView.spec}.ts`.

**Modificados**
- `src/features/net-worth/views/NetWorthView.vue` — vista real: estados `:3`/`:10`, bloque A `:16`, avisos `:22`, bloque B `:24`, bloque E `:46`, mapas de color `:82`/`:88`, `load()` al montar `:101`, `mismatchOf` `:136`.
- `src/shared/components/__tests__/AppShell.spec.ts:16` (Pinia), `:28` (`fetch` pendiente), `:58` (`/overview`).
- `src/assets/__tests__/tailwind-sources.spec.ts:32`, `:35` (sondas).
- `e2e/app-boot.spec.ts:25`, `:47`.
- `tsconfig.app.json:11`, `tsconfig.vitest.json:13`.
- `docs/conventions.md:211` (formato decidido) y la línea de «Pendientes»; `docs/stack.md:24` (`ES2023.Intl`) y la nota del smoke en *E2E en cada modo*.
- `specs/09-net-worth-view/tasks.md` (T0–T14 `[x]`), `progress/current.md`.

**No tocados:** `service.ts`, `types.ts`, `src/services/http.ts`,
`src/router/index.ts`, `src/assets/styles/`, `design-system/`, `package.json`,
`pnpm-lock.yaml`, nada de `../gastos-backend`.

## Verificación

Última pasada, todo sobre el código final:

| Comando | Resultado |
|---|---|
| `pnpm type-check` | exit 0 |
| `pnpm lint` | exit 0 (oxlint + eslint, sin avisos) |
| `pnpm test:unit` | **16 archivos / 158 tests** verdes (80 de antes + 78 nuevos) |
| `pnpm build` | exit 0 — JS 118,31 kB (45,14 kB gzip), CSS 23,09 kB |
| `bash ./init.sh` | exit 0 — type-check, 158 tests, **E2E smoke verde (chromium)**, «Entorno listo» |
| Smoke sin backend (`:5199`, proxy a puerto cerrado) | 1 passed |
| Smoke en modo CI (`CI=true E2E_PREVIEW_PORT=8099`) | 1 passed |
| `git diff --quiet package.json pnpm-lock.yaml` | sin cambios |

Salida resumida del último `./init.sh`:

```
[OK]    feature_list.json válido (9 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
 Test Files  16 passed (16)
      Tests  158 passed (158)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Contra el backend real (C5): sí se verificó.** No arranqué el backend: ya
estaba en `:3000` al empezar, y el dev server en `:5173` servía el código de
este repo. Con un script temporal de Playwright (scratchpad, fuera del repo)
en Chromium sobre `http://localhost:5173/net-worth`:

- `curl http://localhost:3000/api/net-worth` → `total: "88850.64"`.
- Bloque A muestra `88.850,64 €` = `Intl es-ES` del `total` → **coinciden**.
- La única petición salió a `http://localhost:5173/api/net-worth` (por el proxy).
- **Cero** errores y avisos de consola, cero `pageerror`.
- Frase: `As of 12 Sept 2026, you have 88.850,64 € across 5 banks. 31,6 % of it is idle in checking accounts.`
- Por tipo: 28.061,72 + 15.497,52 + 15.291,40 + 30.000,00 = 88.850,64 → **sin aviso de descuadre**.
- 5 fichas de banco, 10 filas (4 cuentas + 6 productos, igual que la API), 0 avisos (la base real no trae `issues`).
- Captura revisada a ojo: tokens del design system, cifras en mono, barras en los colores de chart.

## Sugerencias fuera de alcance (NO aplicadas)

- **`e2e/app-boot.spec.ts` sin salto de línea final**, de antes de esta feature
  (Prettier lo marca). No se tocó para no ensanchar el diff de `e2e/`.
- **La puerta `./init.sh` no detecta la dependencia del backend** si ya hay un
  dev server en `:5173` con backend detrás (reutiliza el servidor). Valdría un
  modo de smoke que arranque su propio servidor.
- **Provocar un aviso real** (un producto sin valoración) y verlo en pantalla:
  la base de hoy no trae `issues` (ya figura en decisions.md como consecuencia
  para el humano).
- **Datos en español en la UI:** nombres como `Depósito a 3 meses` o
  `Fondo Inversión inmobiliario` salen tal cual (R15 lo manda así). Si molesta,
  es cosa de los datos, no de la vista.
- **Accesibilidad de las barras:** `ShareBar` es `aria-hidden` porque el % ya
  va en texto; roles/aria siguen en «Pendientes» de `docs/conventions.md`.
- **El ejemplo de `GET /api/net-worth` del contrato del backend no cuadra**
  (heredado, ya en decisions.md): corregirlo en una sesión del backend.
