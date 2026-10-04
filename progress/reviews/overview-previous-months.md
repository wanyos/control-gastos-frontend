## Review — 2026-10-04

**Veredicto:** CHANGES_REQUESTED

El código y los tests están bien: no pido ningún cambio de comportamiento. Lo que
bloquea son dos textos que han quedado falsos o con una palabra sin aprobar.

### Cambios requeridos

1. `src/features/overview/__tests__/OverviewView.spec.ts:144` — el título
   «paints nothing below the block of the month (C6)» dice lo contrario de lo que el
   test afirma dos líneas más abajo (`blocks.at(-1)` es `previous-months`). Es una
   línea que sigue describiendo lo de antes (checklist 3c). Hay que cambiar el título
   para que diga lo que comprueba (que debajo de la parte del mes va
   `previous-months` y que el enlace al extracto es el penúltimo hijo).
   **Antes tiene que ampliarlo el leader:** `design.md` §7 cierra la lista a cinco
   aserciones y dice que cualquier otro cambio en un test de la F25 es un rechazo; el
   implementer hizo bien en no tocarlo. Cambiar un título no cambia ninguna aserción,
   pero la lista la aprobó el humano (C2, marcada «← REVISAR»): el leader decide si
   basta con anotarlo en §7 o si se lo dice.
2. `progress/implementations/overview-previous-months.md:76`, `:292` y `:343` — «el
   doble de la API» nombra `mockBackend` de `__tests__/fixtures.ts` con una palabra
   que no está en la tabla de `CLAUDE.md` ni en `docs/vocabulary.md` (checklist 3d).
   Comprobado que es nueva: `git grep -n -i "doble de la API\|el doble de" -- docs
   progress/implementations` fuera de este informe no da ninguna coincidencia.
   Sustituir por la descripción literal (`mockBackend` de `fixtures.ts`).

### Los otros dos títulos de la F25: se quedan

- `OverviewView.spec.ts:218` «an empty month is only its sentence (R9)» y
  `e2e/overview.spec.ts:300` «a month after the last data says so, and shows nothing
  else»: los dos siguen afirmando solo cosas de la parte del mes (la lista de
  `overview-*` que no se pinta, intacta), y `design.md` §7, último párrafo, y el punto
  ⚙️4 de la hoja dicen expresamente que R9 de la F25 «habla de la parte del mes». No
  los exijo. Si el leader amplía §7 para el punto 1, sale gratis renombrarlos en la
  misma pasada.

### Para el leader (no son del implementer)

- `docs/roadmap.md:365` y `:40` («⬜ La tira del año… Es lo siguiente»): hoy son
  verdad, la feature sigue `in_progress`; pasan a ser falsas al cerrarla. Además «la
  tira del año» es un nombre corto sin aprobar (también en
  `docs/intent-e8-draft.md:143` y `feature_list.json:1084`, anteriores a esta
  feature): al reescribir esas dos líneas, descripción literal.
- `docs/roadmap.md:383` («tres lecturas `GET /api/movements`»): está dentro del
  párrafo fechado «F25 cerrada el 2026-10-02». Como historia de la F25 es cierto;
  leído como descripción de la pantalla de hoy, no (ahora son cuatro). No es del
  implementer; se resuelve al escribir el párrafo de cierre de la F26.
- `./init.sh --checks 26` solo imprime las tres últimas líneas de cada comando, y en
  Vitest son `Start at` y `Duration`: la salida no enseña cuántos tests ejecutó cada
  check. Lo comprobé lanzando yo los diez comandos (abajo). Es del motor del harness,
  no de este proyecto.
- T15 sigue en `[ ]` a propósito (no es del implementer; el informe lo dice en «Prueba
  real» del Lote D). No la he ejecutado ni la exijo. Es también lo que pide C4 bis.

### Comprobado sin hallazgos

Cada línea: qué lancé y qué salió.

- **`./init.sh`** → exit 0. `Type check OK`, `pnpm lint:oxlint:check` OK,
  `pnpm format:check` OK, `Test Files 104 passed (104)`, `Tests 1703 passed (1703)`,
  `E2E smoke verde (chromium)`.
- **`pnpm type-check`** (`vue-tsc --build`) → exit 0. **`pnpm build`** → exit 0,
  `2076 modules transformed`.
- **`./init.sh --checks 26`** → exit 0, **11 de 11 en verde**. Los diez comandos de
  Vitest lanzados uno a uno: checks 1, 3, 4, 7 y 9 `1 passed | 18 skipped (19)`; 2, 5
  y 6 `1 passed | 30 skipped (31)`; 8 `1 passed | 24 skipped (25)`; 10 `85 passed
  (85)` en 4 archivos. Check 11: `3 passed`. Ninguno salió en verde sin ejecutar nada.
  Los 11 coinciden con la tabla 🧪 de la hoja (10 filas, una con dos tests).
- **La reposición de la T5** (`previousMonthsFunctions.spec.ts`, leído entero contra
  la T5): `vitest run` → `44 passed (44)`; `grep -c "^  it("` → 44. Cubre (a) 24
  meses de `2026-09` a `2024-10`, dos cambios de año, `[]` con `null`; (b) los dos
  periodos; (c) `11527.15` y `null`; (d) agosto `225`/`347` `negative` y única
  marcada, enero `270`/`164` `positive`, julio de 2025 `192`/`1000`, septiembre
  `incomplete` sin anchos ni signo, los cinco meses `empty` con `totals: null`, el mes
  a `0.00` `complete` con anchos `0` y `zero`, `null` si falta un mes, y el fuente sin
  `Number(`, `parseFloat`, `parseInt`, `Math.`; (e) los cuatro casos de R11 con texto
  literal; (f) `leftOutLine` y `notShownLine` en sus dos sentidos y `dataEndsLine`.
  Los 20 nombres de test que la trazabilidad del Lote A atribuye a R1–R6, R9–R13 y C3
  están en el archivo con ese nombre exacto (`grep -qF` de cada uno: 20 de 20).
- **Pares de rutas que solo cambian en mayúsculas:** `(git ls-files; git ls-files
  --others --exclude-standard) | tr 'A-Z' 'a-z' | sort | uniq -d` → ninguna línea.
  `ls src/features/overview/__tests__/` lista por separado `PreviousMonths.spec.ts` y
  `previousMonthsFunctions.spec.ts`.
- **Tests de la F25:** `git diff -U0 -- …/OverviewView.spec.ts` → exactamente las
  cuatro aserciones de `design.md` §7 (último hijo `previous-months` y penúltimo
  `overview-statement-link`; quitadas `api.months()` y `api.calls` longitud 2; 15→27
  dos veces) más las dos desestructuraciones `{ api, wrapper }` → `{ wrapper }`.
  `e2e/overview.spec.ts`, segundo test: solo `2` → `27` y su comentario. Ninguna
  debilita nada: lo que afirmaban las dos líneas quitadas sigue en `store.spec.ts`,
  que no cambia. `git diff --stat a68df91 --` sobre `reading.ts`, los cuatro
  componentes y los cuatro specs de la F25, `src/features/statement`,
  `src/features/import`, `src/shared`, `src/router`, `src/assets`, `package.json` y
  `pnpm-lock.yaml` → vacío. Textos y orden de la parte del mes: los afirma letra por
  letra «the part of the month is letter by letter what it was (C2)», en verde.
- **Nada sale a `localhost:3000` desde los unitarios:** `vitest run
  src/features/overview` con un script cargado por `NODE_OPTIONS=--require` que
  apunta cada llamada al `fetch` real → `236 passed`, **0 llamadas reales**; el mismo
  script, probado antes contra un puerto cerrado, sí apuntó la llamada. **Desde el
  e2e no lo he observado en el backend:** lo que hay es el código (`page.route
  ('**/api/**', stop)` aborta todo lo no previsto y un rango de varios meses distinto
  del previsto) y las aserciones del propio test (`watch.aborted` vacío, único método
  `GET`), en verde.
- **Solo lectura:** `service.ts` no acepta método ni cuerpo; tests de C1 en los tres
  niveles, en verde.
- **Lo ahorrado, una petición y ninguna suma aquí:** `git grep -n
  "getPeriodTotals\|loadPeriod("` en `src` sin tests → una llamada, en `store.ts`
  (`loadPeriod`); `service.ts` hace un solo `getMovements` con `from` del primer mes y
  `to` del último. `grep -n -E "reduce\(|sumAmounts|Number\(|parseFloat|\+="` sobre
  `previousMonths.ts`, `store.ts`, la vista y los dos componentes → sin coincidencias.
  El test del check 9 afirma que la única petición de varios meses es
  `from=2024-10-01&to=2026-08-31&pageSize=1`.
- **Mes incompleto:** `buildMonthRows` usa `monthState` importado de `reading.ts` (el
  de la F25); solo los meses `complete` entran en `scaleTop` y llevan anchos y signo;
  `summedPeriod` acaba en el mes anterior si `latest` no es el último día. Tests: «an
  incomplete month does not set the scale…», check 5 y el e2e.
- **Datos personales:** los archivos nuevos solo llevan totales, recuentos y fechas;
  el único movimiento de las respuestas imitadas es `MOVEMENT <id>` con `1.00`. Los
  cinco meses añadidos a `MONTHS` del e2e son totales que ya estaban en `fixtures.ts`.
- **Vocabulario:** en documentos, comentarios y tests nuevos no hay ningún nombre
  corto para este bloque (se le llama «los meses de debajo del mes» o por su título
  de pantalla). Lo único, el punto 2 de arriba.
- **Documentos:** `git grep` de «tres lecturas», «three reads», «nothing below»,
  «year strip», «previousMonths.spec» fuera de `progress/` y `specs/` → solo lo ya
  dicho arriba. `docs/architecture.md` y `docs/stack.md` describen lo que hay.
- **SDD:** hoja con sus bloques y 6 puntos en 🔴, cada uno con alternativa; 15
  requisitos, dicho en la hoja; procedencia de R1–R15 y C1–C9; tasks T1–T14 en `[x]`.
  R1–R15 con test (trazabilidad del Lote D contrastada con los cinco specs leídos).
- **CHECKPOINTS:** C1, C2 (una sola `in_progress`), C3 (sin dependencias nuevas; `grep`
  de `console.`, `debugger`, `TODO`, `.only(`, `.skip(` en lo nuevo → nada; líneas
  `contrast:` de `chart-5` y `chart-8` sobre `surface-sunken` y `surface-card` ya en
  `theme-dark.css`), C4, C5 (`git status` tras el build: nada fuera de lo esperado),
  C6 (el contrato no cambia), C7. C8 no aplica todavía: no hay resumen de cierre
  hasta aprobar.

## Review — 2026-10-04 (segunda pasada)

**Veredicto:** APPROVED
Comprobado: acceptance/requirements ↔ tests, arquitectura, convenciones,
verificación, CHECKPOINTS C1-C8. Checks: 11 de 11 en verde.
Sin hallazgos.
Resumen de cierre: `progress/summaries/overview-previous-months.md`.

Los dos cambios pedidos, comprobados:

- **Títulos.** `git diff -U0` de `OverviewView.spec.ts` y `e2e/overview.spec.ts`:
  respecto a la primera pasada solo cambian las tres líneas de título (y, en el e2e,
  el parámetro `async ({ page })` partido en tres líneas por el formato). Ninguna
  aserción distinta. `git grep` de los tres títulos antiguos fuera de `progress/` y
  `specs/` → sin coincidencias (exit 1). `design.md` §7 recoge los tres cambios.
- **«el doble de la API».** `git grep -n -i` en todo el repositorio, más los archivos
  nuevos: solo queda en la primera pasada de este mismo archivo, donde se cita el
  hallazgo. Las líneas 76, 292 y 343 del informe dicen ahora `mockBackend` de
  `fixtures.ts`.
- **Repetido:** `./init.sh` exit 0 (104 archivos, 1.703 tests, lint, formato, e2e
  chromium); `pnpm type-check` exit 0; `pnpm build` exit 0; `./init.sh --checks 26`
  exit 0, 11 de 11. Los diez comandos de Vitest, uno a uno: cada check de nombre
  ejecutó 1 test (`1 passed | 18/30/24 skipped`), el 10 ejecutó 85; el 11, `3 passed`.
  Rutas que solo cambian en mayúsculas: ninguna. Archivos de la F25 protegidos por C2,
  idénticos a `a68df91`.

Las citas de los títulos antiguos que quedan (`design.md` §7, la primera pasada de
este archivo, el informe de implementación y
`progress/implementations/month-at-a-glance.md:147` y `:176`) son registro fechado y
no inducen a error: la tabla de §7 da el título antiguo y el nuevo de cada uno.

La T15 sigue en `[ ]` a propósito: la hace el leader con el humano delante.
