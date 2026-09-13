# Review — feature 9 `net-worth-view`

**Veredicto:** APPROVED

- **Fecha:** 2026-09-12
- **Agente:** reviewer
- **Contrastado contra:** `specs/net-worth-view/{decisions,requirements,design,tasks}.md`, `feature_list.json` (intent + acceptance de la 9), `docs/{specs,verification,conventions,architecture,stack}.md`, `CHECKPOINTS.md`, `../gastos-backend/docs/api-contract.md` §`GET /api/net-worth` (solo lectura), `progress/implementation/net-worth-view.md`, `git diff` + `git status`.
- **Método de trazabilidad:** leídos los tests uno a uno (no la tabla del informe) y comprobado que cada aserción falla si se rompe el requisito.

## Trazabilidad requirements ↔ tests (SDD)

- R1: [x] `NetWorthView.spec.ts:52` (exactamente 1 `fetch` a `/api/net-worth` al montar, con store/service/http reales); `store.spec.ts:26` (`load()` guarda el `NetWorth`).
- R2: [x] `NetWorthView.spec.ts:59` (`fetch` pendiente → `net-worth-loading` existe y no hay bloques A/B/E); `store.spec.ts:40` (`isLoading` true durante, false después).
- R3: [x] `store.spec.ts:55` (HTTP 500 → `AppError`, `code === API_HTTP`, mensaje `HTTP 500: boom`, `load()` no relanza); `store.spec.ts:70` (rechazo no-Error → `UNKNOWN`); `NetWorthView.spec.ts:70` (título fijo + `message` del error, sin bloques); `:82` (deriva de contrato → `ValidationError` en pantalla).
- R4: [x] `NetWorthView.spec.ts:90` — fixture inconsistente (`total: "999.99"`, partes = 39.924,05): bloque A muestra `999,99 €`. Una suma en cliente lo pondría rojo. Grep: `NetWorthView.vue:17` usa `netWorth.total` directamente.
- R5: [x] `sentence.spec.ts:17-110` textos exactos (normal, ejemplo aprobado con `38,3 %`, singular, sin checking, checking ≤ 0, banco solo con huecos, total ≤ 0, base vacía, sin crecimiento); `NetWorthView.spec.ts:118` frase dentro del bloque A.
- R6: [x] `money.spec.ts:70` (`1.234,56 €`, regresión CLDR), `:74` (`-5,00 €`, `0,00 €`), `:80` (más allá de `Number`), `:90` (`38,3 %`), todos con U+00A0; `NetWorthView.spec.ts:126` (todo `money`/`share` con `font-mono` + `tabular-nums`, clases compuestas en runtime).
- R7: [x] `breakdown.spec.ts:26` (pertenencia por `type` y orden de 4 grupos), `:46` (importes exactos), `:59` (grupo vacío omitido); `NetWorthView.spec.ts:138` (labels, `38,3 %`, `width: 38.3%`), `:156` (sin % ni barra con total ≤ 0).
- R8: [x] `breakdown.spec.ts:85` (suma de grupos === total en céntimos, ambos repartos), `:92` (cada id en exactamente un grupo), `:162` (la fixture cuadra y pasa `parseNetWorth`).
- R9: [x] `NetWorthView.spec.ts:97` (aviso con `39.924,05 €` y `999,99 €`, grupos sin corregir), `:112` (ausente con la coherente).
- R10: [x] `NetWorthView.spec.ts:171` (un único badge, dentro de `Checking accounts`), `:181` (sin checking no aparece).
- R11: [x] `breakdown.spec.ts:125` (5 slugs → nombres, orden por importe), `:144` (empate por label), `:155` (slug desconocido); `NetWorthView.spec.ts:193` (filas por banco, N26 negativo con barra 0%).
- R12: [x] `NetWorthView.spec.ts:211` (5 fichas, filas = cuentas + productos, `Valued …`, `Matured …`, `As of …` generados con `formatDate`); `issues.spec.ts:49` (etiquetas de tipo); `money.spec.ts:103,108` (en-GB, UTC, sin corrimiento).
- R13: [x] `NetWorthView.spec.ts:237` (hueco `No valuation`, sin `money` ni `0,00 €`), `:247` (banco solo con hueco: ficha sí, fila no); `breakdown.spec.ts:102` (fuera de todo grupo; quitarlo no cambia nada), `:115`.
- R14: [x] `issues.spec.ts:8,14,27` (texto exacto por `reason`), `:41` (`valuedAt: null`); `NetWorthView.spec.ts:259` (3 avisos con su texto), `:273` (0 avisos, sin panel).
- R15: [x] `NetWorthView.spec.ts:282` (sin términos en español, con los 5 títulos en inglés); `issues.spec.ts:49`.
- C1: [x] `NetWorthView.spec.ts:302` (solo `net-worth-block-a|b|e`, en ese orden).

## Tasks completas (SDD)

- T0–T14: [x] las 15 marcadas `[x]` en `specs/net-worth-view/tasks.md`, contrastadas con el código y el diff.

## Criterios de aceptación (feature_list.json)

- [x] `/net-worth` renderiza bloques A, B y E → `NetWorthView.spec.ts:302`.
- [x] Bloque A con `total` tal cual + frase → `:90`, `:118`, `sentence.spec.ts`.
- [x] Bloque B por naturaleza (4 grupos aprobados) y por banco, sumando el total, sin nada fuera → `breakdown.spec.ts:85,92`, `NetWorthView.spec.ts:138,193`.
- [x] Bloque E con `valuedAt` → `:211`. «Desde cuándo hay dato» fuera por decisión del humano (decisions.md, 2026-09-12): no lo sirve el contrato.
- [x] `value: null` como hueco, fuera de sumas → `:237`, `breakdown.spec.ts:102`.
- [x] Issues como avisos en inglés → `issues.spec.ts`, `NetWorthView.spec.ts:259`.
- [x] Textos en inglés → `:282`.
- [x] Formato fijado en decisions.md (es-ES, no la propuesta en-US) y aplicado con `font-mono tabular-nums` → `money.spec.ts`, `NetWorthView.spec.ts:126`.
- [x] Card, Badge, StatCard, AccountCard portados a SFC Vue3 (+ ShareBar) → `BaseComponents.spec.ts` y los specs de la vista.
- [x] Errores desde el store (`ApiError`/`toAppError`) → `store.spec.ts:55,70`; `NetWorthView.vue:12` pinta `store.error.message`.
- [x] E2e de humo sigue pasando (con la excepción aprobada en el punto rojo 6) → ver §E2e.
- [x] type-check, lint, test:unit, `./init.sh` verdes → ver §Evidencia.
- [x] Con backend en :3000, cifra total = `curl` → comprobado por el reviewer (ver §Evidencia).

## Decisiones del humano (decisions.md)

- [x] Importes desde el string exacto con `es-ES` + `useGrouping: 'always'` (`src/shared/money.ts:16-20`, `:81`); porcentajes es-ES con un decimal (`:21-26`, `:90`).
- [x] Sumas en céntimos `bigint` (`toCents` `:40`, `sumAmounts` `:58`); porcentaje redondeado una sola vez, half-up, en `bigint` (`:66`). Grep: sin `parseFloat`/`parseInt`/`toFixed` en código; los dos `Number(` (`:77` permille entero, `:111` componentes de fecha) no tocan importes.
- [x] Fechas en-GB con `timeZone: 'UTC'` sobre `Date.UTC` (`:27-32`, `:105`).
- [x] Total del bloque A = `total` de la respuesta, sin recalcular (`NetWorthView.vue:17`).
- [x] Aviso si los grupos no cuadran, con las dos cifras y sin corregir (`NetWorthView.vue:136`, `BreakdownList.vue:48-58`).
- [x] `value: null` → `No valuation`, fuera de sumas (`breakdown.ts` `classify`, `AccountCard.vue:22`).
- [x] 4 grupos (`breakdown.ts` `NATURE_ORDER`/`NATURE_LABELS`) e «idle money» = `checking` (`NetWorthView.vue:31`).
- [x] Frase aprobada con los casos de borde de design §6 (`sentence.ts:17`); comprobada en vivo: `As of 12 Sept 2026, you have 88.850,64 € across 5 banks. 31,6 % of it is idle in checking accounts.`
- [x] Barras CSS horizontales, sin librería; bloques C y D fuera.

## E2e (punto rojo 6)

- [x] `git diff e2e/`: único cambio = `NET_WORTH_SAMPLE` (`e2e/app-boot.spec.ts:25-35`) + `page.route('**/api/net-worth', ...)` (`:47`). Ninguna aserción tocada; `pageErrors` y `consoleErrors` siguen exigiendo `[]` (`:81-82`).
- [x] La muestra cuadra: cuenta 1500.00 = `accounts.total` 1500.00; `investments.total` 0.00 sin productos; `total` 1500.00.
- **Cómo lo verifiqué sin backend.** En :3000 hay un backend y en :5173 un dev server ajenos; `./init.sh` reutiliza este último, así que no vale como prueba. Configs temporales en el scratchpad de sesión (fuera del repo) lanzan `vite preview` del `dist/` recién construido con `pnpm build` en **:8199 con `--strictPort`**, `reuseExistingServer: false` y el proxy `/api` apuntado a **:3999** (puerto cerrado, comprobado).
  - Smoke real del repo (`e2e/app-boot.spec.ts`) → **1 passed**.
  - Control: la misma spec copiada sin la línea `page.route` → **1 failed**, `consoleErrors` recoge `Failed to load resource: ... 502 (Bad Gateway)`. El verde lo da la muestra y la red de errores de consola sigue viva.
  - Sonda extra con la muestra: el bloque A pinta `1.500,00 €`, sin `net-worth-error` ni `breakdown-mismatch` (la muestra pasa `parseNetWorth`; si no, la vista mostraría un error sin tocar la consola y el smoke seguiría verde).

## Cambios fuera de la lista de design.md

- [x] `tsconfig.vitest.json:13`, `lib: []` → `["ES2023.Intl"]`: justificado. design §1 lo dejaba «a revisar»; sin él el type-check de tests no tipa `Intl.NumberFormat#format` con string al importar `money.ts`. Documentado en `docs/stack.md:24`. `vue-tsc --build` verde.
- [x] `src/assets/__tests__/tailwind-sources.spec.ts:31-37`: justificado y **no debilitado**. La vista usa ahora `bg-chart-3` y `bg-negative-subtle`, así que la autocomprobación del propio test (`is still a meaningful probe`) obligaba a sustituirlas. Las nuevas, `text-ink-link` (`--color-ink-link` en `src/assets/main.css:89`) y `rounded-2xl` (utilidad válida de Tailwind), son utilidades reales que un escaneo ensanchado emitiría, se citan solo fuera de `src/` (`docs/stack.md:139,158,163`) y no se usan dentro (`AppSidebar.vue:30` menciona `--ink-link`, que el regex no casa). Siguen 5 sondas y la aserción sobre el bundle real.

## Arquitectura (docs/architecture.md)

- [x] Vista → store → service: sin `fetch(` en `.vue`; `useNetWorthStore` (`src/features/net-worth/store.ts:12`) guarda estado y llama a `getNetWorth()`.
- [x] Store mínimo (`netWorth`, `isLoading`, `error`, `load`); derivaciones en funciones puras (`breakdown.ts`, `sentence.ts`, `issues.ts`).
- [x] Componentes tontos: `BreakdownList`, `BankCard`, `AccountCard`, `DataWarnings` reciben props; el descuadre se calcula en la vista.
- [x] Organización por feature; lo transversal (`money.ts`, componentes base) en `src/shared/`.
- [x] Sin tocar `service.ts`/`types.ts` (F7), `src/router/`, `src/services/http.ts`, `src/assets/styles/`, `design-system/`. Backend sin cambios (`git status` limpio allí). `AppShell.spec.ts` sigue verde con el shell de la F8.

## Convenciones (docs/conventions.md)

- [x] Textos de UI, nombres y comentarios en inglés; imports vendor → `@/` → relativos; `import type`.
- [x] Solo alias semánticos (grep sin hex ni paleta de serie en los `.vue`/`.ts` nuevos); clases de color en mapas literales (`NetWorthView.vue:82-97`, `BaseBadge.vue:30`).
- [x] Errores vía `AppError`/`toAppError`/`ValidationError`, sin strings lanzados.
- [x] SFC `<template>` → `<script setup lang="ts">`, sin `<style>`.
- [x] Sin `console.log` ni TODOs; el `TODO(feat-9)` del placeholder se retiró.

## Verificación (docs/verification.md)

- [x] Solo se mockea la frontera HTTP (`fetch`); store, service, parser y componentes corren de verdad.
- [x] Tests con salida concreta (textos exactos, importes, anchos, recuentos), con caminos de error y de borde.

## Evidencia ejecutada por el reviewer

| Comando | Resultado |
|---|---|
| `pnpm type-check` | exit 0 |
| `pnpm lint` | exit 0, sin cambios en el árbol tras el `--fix` |
| `pnpm test:unit` | 16 archivos / 158 tests verdes |
| `pnpm build` | exit 0 (JS 118,31 kB, CSS 23,09 kB) |
| `bash ./init.sh` | exit 0, e2e chromium verde, «Entorno listo» |
| Smoke sin backend (preview :8199, proxy a :3999) | 1 passed; control sin `page.route` → 1 failed (502 en consola) |
| `git diff --quiet package.json pnpm-lock.yaml` | sin cambios |
| `curl :3000/api/net-worth` frente a Chromium en `:5173/net-worth` | `total "88850.64"` → bloque A `88.850,64 €`, sin descuadre, 0 errores de consola |

## CHECKPOINTS.md

- [x] C1 — Arnés completo: archivos base y docs presentes; `./init.sh` exit 0.
- [x] C2 — Estado coherente: solo la 9 en `in_progress`; las `done` pasan sus tests; `progress/current.md` describe la sesión activa (su «Próximo paso» está desfasado, ver notas).
- [x] C3 — Arquitectura: estructura conforme; sin dependencias nuevas; sin logs de debug ni TODOs; convenciones respetadas.
- [x] C4 — Verificación real: 78 tests nuevos, camino feliz + error + bordes; todo verde.
- [x] C5 — Sesión: sin archivos sospechosos sin trackear (los scripts de revisión viven en el scratchpad, fuera del repo). La entrada en `progress/history.md` y el paso a `done` corresponden al cierre tras este veredicto.
- [x] C6 — Proyectos hermanos: consume `GET /api/net-worth` tal como lo tipó la F7; no inventa endpoints; el defecto del ejemplo del contrato queda anotado para el backend.
- [x] C7 — SDD: 4 archivos en `specs/net-worth-view/`; 15 R en EARS con procedencia completa; 0 puntos rojos abiertos; tasks `[x]`; cada R con test.
- [x] C8 — Resumen de cierre escrito.

## Resumen de cierre

- Escrito en `progress/summaries/net-worth-view.md` → sí

## Cambios requeridos

Ninguno. Notas **no bloqueantes**:

1. Las cifras dentro de prosa (frase del bloque A; texto del descuadre en `BreakdownList.vue:55`) no van en `font-mono`. Es lo que fija design §8 (frase en `text-ink-muted`) y R6 se verifica sobre los nodos `money`/`share`. Aceptado.
2. `progress/current.md` arrastra un «Próximo paso» anterior a la F8 y `progress/history.md` aún no tiene las F7–F9: limpieza del leader al cerrar la sesión.
3. `./init.sh` no detecta una dependencia del backend si reutiliza un dev server de :5173 con backend detrás (sugerencia del implementer); valdría un modo de smoke con servidor propio.
4. Pendientes del humano ya anotados en decisions.md: provocar un aviso real en pantalla y corregir el ejemplo del contrato en el backend.
