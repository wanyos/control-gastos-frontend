# expenses-by-category — implementación

## Lote A — implementación

Tasks T1–T6 de `specs/37-expenses-by-category/tasks.md`, marcadas `[x]`. No se ha escrito
nada en la base de datos ni en carpetas de datos del humano: todo lo ejecutado contra el
backend real fueron `GET`.

### Archivos modificados / creados

Todos nuevos, todos dentro de la cabecera `Archivos:` del Lote A
(`src/features/expenses-by-category/`):

- `types.ts`, `service.ts`, `reading.ts`, `store.ts`
- `components/PeriodPicker.vue`, `components/CategoryGroup.vue`,
  `components/CategoryLine.vue`, `components/LineMovements.vue`
- `views/ExpensesByCategoryView.vue`
- `__tests__/fixtures.ts`, `__tests__/reading.spec.ts`, `__tests__/service.spec.ts`,
  `__tests__/store.spec.ts`, `__tests__/CategoryLine.spec.ts`,
  `__tests__/ExpensesByCategoryView.spec.ts`

Fuera del código: `specs/37-expenses-by-category/tasks.md` (las `[x]` de T1–T6) y
`progress/current.md` (una línea con el estado del lote).

No se ha tocado `src/shared/`, `src/features/overview/`, `src/features/statement/`
(`MonthNav` y `months.ts` se importan tal cual), el router, `src/features/monthly-cost/`,
`e2e/`, `docs/` ni `feature_list.json`.

### Decisiones tomadas

Dentro de lo que deja el spec, sin requirements nuevos:

- **Lo que se reutiliza:** `formatMoney`, `formatPercent`, `formatDate`, `sharePermille`,
  `toCents`, `sumAmounts` y `fromCents` de `@/shared/money`; `createValidators` de
  `@/shared/validation`; `ApiError`/`ValidationError`/`toAppError` de `@/shared/errors`;
  `BaseCard`, `BaseButton`, `BaseBadge`, `BaseSelect`, `StatCard` y `ShareBar` de
  `@/shared/components`; `MonthNav`, `currentMonth` y `formatMonthLabel` de
  `features/statement`. De Overview no se importa nada (la frase es un `<p>` propio con el
  mismo estilo que `MonthSentence`, como pide design §5).
- **Lectura de la dirección (R6):** `periodFromRouteQuery` acepta `?month=YYYY-MM` con o sin
  `compare` (sin él, `previous-month`) y `?year=YYYY` solo. Cae en «mes en curso contra el
  mes anterior» si llegan `month` y `year` a la vez, un `compare` desconocido, un `compare`
  junto a `year` o cualquier valor mal formado.
- **Comprobación de sumas (R15):** en `parseExpensesByCategory`, en céntimos: cada bloque
  contra la suma de sus líneas y la raíz contra `fixed + variable`. `comparedAmount` y
  `difference` no se comprueban (design §3); hay un test que lo deja fijado.
- **`period.month` / `period.year`:** se validan como `YYYY-MM` / `YYYY` o `null`, con un
  validador local (`asNullableMatch`) porque `createValidators` no trae uno con patrón. No
  se ha tocado `src/shared/validation.ts`.
- **Columnas alineadas:** la cabecera de columnas de `CategoryGroup` y cada fila de
  `CategoryLine` comparten la misma rejilla, una constante `LINE_COLUMNS` en `reading.ts`
  (una por modo: en año lleva la columna `A month`). Por debajo de `md` la fila se parte en
  varias líneas (`flex-wrap`) y la cabecera de columnas se oculta. Las dos primeras
  columnas de la cabecera (nombre y barra) van sin texto: design §6 no da ninguno.
- **Colores de la diferencia** (`text-negative` si sube, `text-positive` si baja,
  `text-ink-muted` si es 0): una constante `DIFFERENCE_CLASSES` en `reading.ts` para no
  repetirla en la línea y en el bloque. Barras: `bg-chart-1` en `Fixed`, `bg-chart-3` en
  `Variable`, `bg-chart-4` en la línea sin categoría. Todos los pares token/fondo usados ya
  tenían su línea `contrast:` en `theme-dark.css` (lo miré con
  `grep -n "contrast:" src/assets/theme-dark.css`); no hizo falta tocarlo.
- **Selector de periodo:** dos botones `Month`/`Year` (`aria-pressed`); en mes, el
  desplegable `Compare with` y `MonthNav` sin cambios; en año, flechas
  `Previous`/`Next` con `aria-label` `Previous year`/`Next year` (las mismas palabras que
  usa `MonthNav` para el mes) y `Next` deshabilitado en el año en curso. Esos dos textos y
  el `aria-label="Period"` del grupo de botones no están en la tabla de design §6: van
  escritos en el componente, como hace `MonthNav`.
- **Cuál es el modo en pantalla:** la columna `A month` se decide por la respuesta
  (`period.year !== null`), no por la dirección, para que no se pinte una columna vacía
  mientras llega la respuesta de otro modo.
- **Prueba de la pantalla y «cliente HTTP inyectado» (T6):** la vista llama a
  `store.load(query)` sin cliente, como el resto de pantallas, así que su test sustituye
  `fetch` (`mockBackend` de `fixtures.ts`, igual que en `monthly-cost` y `overview`) y el
  cliente real del proyecto corre por encima. La inyección del cliente se prueba en
  `service.spec.ts` (`getExpensesByCategory(query, client)`). El router es en memoria
  (`createMemoryHistory`). «Hoy» se fija con `vi.useFakeTimers({ toFake: ['Date'] })` al
  20-09-2026.

### Trazabilidad (solo SDD)

R1 y R2 son del Lote B (router y e2e).

- R3 → `opens on the current month with fixed and variable, the total and the difference with the previous month`, `asks a month with its comparison and a year without one, with no method and no body`
- R4 → `switching to a year shows the year and the monthly average of each category`, `switching mode keeps the year of the month and comes back to the current month`, `asks a month with its comparison and a year without one, with no method and no body`
- R5 → `asks the same month last year when that comparison is chosen`, `asks a month with its comparison and a year without one, with no method and no body`
- R6 → `reads the period from the address and falls back to the current month`, `keeps only the answer of the latest load`, `asks the same month last year when that comparison is chosen` (comprueba la query de la dirección)
- R7 → `shows the sentence before any figure`, `builds the sentence for a closed period, a period in progress and an empty one`, `names a month, a whole year and part of a year`, `says there was no spending in an empty period`
- R8 → `shows the total exactly as the backend sent it`, `opens on the current month with fixed and variable, the total and the difference with the previous month`, `maps every field of the response`
- R9 → `opens on the current month with fixed and variable, the total and the difference with the previous month`, `says there was no spending in an empty period`
- R10 → `draws the bar as the share of the period total`, `writes the difference with its sign`
- R11 → `shows the monthly average only in a year`, `switching to a year shows the year and the monthly average of each category`
- R12 → `marks a new category and one that is gone apart from the rest`
- R13 → `opens a category and lists its movements with date, description and amount`, `a gone category has no movements to open`, `expanding a category lists its movements of the period`
- R14 → `says how many movements have no category and how much of the spending they are`, `counts the movements with no category and their share of the spending`
- R15 → `rejects a response whose groups do not add up to the total`, `rejects a response that does not have the contract shape`, `shows the total exactly as the backend sent it` (la parte de «una respuesta que no suma no se enseña»)
- R16 → `says the backend failed and asks again on Try again`, `keeps a failure in error and Try again asks the same period`, `says what failed in words`

Además de los nombres que pide `tasks.md`, hay dos tests de apoyo en `store.spec.ts`
(`starts idle, with nothing read`, `does nothing on Try again before any load`).

Antes de dar los tests por buenos, cambié a propósito `formatDifference` para que no
pusiera el `+` y lancé `pnpm exec vitest run src/features/expenses-by-category`: salieron
`4 failed | 25 passed (29)`. Restauré el archivo y volvieron a salir `29 passed (29)`.

Las partes de unidad de los `checks` de la F37 (las que no dependen del router ni del
e2e del Lote B) las lancé una a una con su `grep -qF … && pnpm exec vitest run … -t "…"`:
las 14 salieron con código 0.

### Documentos actualizados

`git grep -n "expenses-by-category\|ExpensesByCategory" -- . ':!progress' ':!specs'` solo
devuelve `feature_list.json` (el `intent` y los `checks` de la propia F37). Este lote solo
crea archivos nuevos: no renombra ni cambia nada que esté documentado. Los documentos que
la feature vuelve falsos (`docs/guia-de-uso.md`, `docs/architecture.md`, `docs/stack.md`)
son la T11 del Lote B.

### Prueba real (si la feature lee datos de fuera)

Con el backend en `:3000`, lancé desde una carpeta temporal fuera del repo (ya borrada) un
test que llamaba a `getExpensesByCategory` con el cliente real (`createHttp`) y pasaba la
respuesta por `periodSentence` y `uncategorizedText`. Solo `GET`. Solo recuentos:

| Periodo pedido | Resultado | Líneas fijo / variable | Movimientos | Línea sin categoría | `change` |
|---|---|---|---|---|---|
| `2026-09`, `previous-month` | se lee, las sumas cuadran | 5 / 8 | 44 | no hay | 13 `null` |
| `2026-09`, `same-month-last-year` | se lee | 5 / 8 | 44 | no hay | 11 `null`, 2 `new` |
| `2026-10`, `previous-month` | se lee | 5 / 8 | 16 | no hay | 9 `null`, 4 `gone` |
| `2025` | se lee, `months` 12/12, `monthlyAmount` en las 14 líneas | 5 / 9 | 426 | no hay | 14 `null` |
| `2026` (en curso) | se lee, `months` 10/10 | 5 / 9 | 398 | no hay | 14 `null` |
| `2019` (sin datos) | se lee, vacío | 0 / 0 | 0 | no hay | — |

Las seis respuestas tienen la forma del contrato y pasan la comprobación de sumas de R15.
Con los datos reales de hoy **no hay ninguna línea sin categoría**, así que el camino de
R14 con movimientos sin categoría solo está probado con datos inventados. La pantalla en
navegador contra el backend real no la he abierto: la ruta todavía no existe (es la T7 del
Lote B).

### Último ./init.sh

`./init.sh` → código de salida 0. Últimas líneas:

```
 Test Files  131 passed (131)
      Tests  2114 passed (2114)
[OK]    Todos los tests pasan
── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 26 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[INFO]  Ejecutando: pnpm type-check
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)
── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Los comandos que pidió el leader, después del último cambio de código:

- `pnpm type-check` → `vue-tsc --build`, código 0, sin salida de errores. (La primera
  pasada dio un `TS2322` en `service.ts`, el tipo de vuelta de `asNullableMatch`;
  corregido.)
- `pnpm lint` → `oxlint . --fix`, código 0; `git status` después no muestra ningún
  archivo cambiado fuera de los de este lote. `pnpm lint:oxlint:check` → código 0.
- `pnpm format:check` → `All matched files use Prettier code style!`, código 0.
- `pnpm test:unit` → `Test Files 131 passed (131)`, `Tests 2114 passed (2114)`, código 0.
- `pnpm build-only` → `built`, código 0. En el CSS generado están las dos rejillas de
  `LINE_COLUMNS` (`grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) 7rem 7rem 7rem 10rem`
  y la de año, con `6rem` de más).

### Último ./init.sh --checks (si la feature tiene checks)

No lo he lanzado entero: varios `checks` de la F37 dependen del router, del borrado de
`Monthly cost` y del e2e, que son del Lote B, y tienen que salir en rojo hasta entonces.
Las partes de unidad de este lote, una a una, salieron en verde (ver «Trazabilidad»).

### Sugerencias fuera de scope (NO aplicadas)

- `createValidators` (`src/shared/validation.ts`) no trae un validador «texto con patrón o
  `null`»; aquí se ha escrito uno local de cuatro líneas. Si otra feature lo necesita,
  podría subirse a `shared`.

## Lote B — implementación

Tasks T7–T12 de `specs/37-expenses-by-category/tasks.md`, marcadas `[x]`. No se ha escrito
nada en la base de datos ni en carpetas de datos del humano: la prueba real hizo solo `GET`
(cualquier otro método se abortaba en el navegador, y no hubo ninguno).

No he tocado el código del Lote A: al integrarlo no encontré ningún fallo en él.

### Archivos modificados / creados / borrados

Todos dentro de la cabecera `Archivos:` del Lote B:

- `src/router/index.ts` — fuera `MonthlyCostView`, `ReceiptEuro` y la ruta `/monthly-cost`;
  dentro `/expenses-by-category` (`name: 'expenses-by-category'`, `ExpensesByCategoryView`,
  `label: 'Expenses by category'`, `icon: ChartBar`) justo después de `overview`.
  Comentario de cabecera del array actualizado.
- `src/router/__tests__/router.spec.ts` — listas de rutas, nombres y etiquetas cambiadas;
  quitado `lists Monthly cost in the menu right below Overview`; añadidos
  `lists Expenses by category in the menu right below Overview` y
  `no longer lists Monthly cost and sends its old address to the net worth home`.
- `e2e/expenses-by-category.spec.ts` — nuevo, tres tests.
- Borrados con `git rm` (quedan en el índice como borrados): `src/features/monthly-cost/`
  entera (16 archivos) y `e2e/monthly-cost.spec.ts`.
- `docs/guia-de-uso.md`, `docs/architecture.md`, `docs/stack.md` (ver «Documentos
  actualizados»).

Fuera del código: `specs/37-expenses-by-category/tasks.md` (las `[x]` de T7–T12) y
`progress/current.md` (una línea con el estado del lote).

### Decisiones tomadas

- **«Hoy» en el e2e:** se fija con `page.clock.setFixedTime` (Playwright 1.63), para que el
  mes con que abre la pantalla no dependa del día en que se lance la suite. El primer test
  usa el 20-09-2026 (mes en curso, frase `So far in …`); el del año usa el 20-01-2026 y
  pulsa `Previous` una vez para llegar a diciembre de 2025, de modo que `Year` pide 2025,
  un año cerrado. Así el test no depende de qué `to` manda el backend para el año en curso.
- **Respuestas del e2e:** el patrón de `e2e/own-accounts-table.spec.ts`: la primera ruta
  aborta y apunta cualquier `/api` no prevista; se contestan `ingestion/pending`,
  `net-worth`, cualquier `GET /api/movements` (los números del menú) y
  `GET /api/expenses-by-category` solo para `month=…&compare=previous-month` y
  `year=2025`. Cada test comprueba al final que no se abortó nada, que no salió ningún
  método distinto de `GET`, y que no hubo errores de página ni de consola. Datos con la
  forma del contrato y las cifras del ejemplo del contrato (las mismas del `fixtures.ts`
  del Lote A); descripciones inventadas (`RECIBO /ALQUILER FICTICIO`,
  `ESTACION SERVICIO INVENTADA`, `COMPRA SIN CATEGORIA INVENTADA`…).
- **Comprobación de que los tests fallan cuando deben:** cambié a propósito la etiqueta
  del menú a `Spending` en `src/router/index.ts`: `router.spec.ts` dio
  `2 failed | 19 passed (21)` y el e2e `3 failed`. Después añadí a propósito una ruta
  `/monthly-cost` con etiqueta `Monthly cost`: `no longer lists Monthly cost …` falló
  (`1 failed`) y `the old Monthly cost address opens the net worth` falló (`1 failed`).
  Restauré el archivo las dos veces y volvieron a pasar.
- **Comentarios:** donde el spec dice que `/monthly-cost` «cae en la ruta comodín», los
  comentarios y `docs/architecture.md` lo describen literalmente («se trata como cualquier
  dirección que no existe»), porque «comodín» no está en `docs/vocabulary.md`.

### Trazabilidad (solo SDD)

Lo del Lote A sigue igual (ver su sección). Lo que añade este lote:

- R1 → `lists Expenses by category in the menu right below Overview`, `exposes one navigation entry per navigable route, in sidebar order`, `reaches Expenses by category from the menu, sees the month and opens a category` (e2e)
- R2 → `no longer lists Monthly cost and sends its old address to the net worth home`, `the old Monthly cost address opens the net worth` (e2e)
- R3 → `reaches Expenses by category from the menu, sees the month and opens a category` (e2e: una sola lectura, `?month=2026-09&compare=previous-month`, solo `GET`)
- R4 → `switches to a year and sees the monthly average of each category` (e2e: `?year=2025` sin `compare`)
- R9 → `reaches Expenses by category from the menu, sees the month and opens a category` (e2e: `Fixed` y después `Variable`, líneas en orden)
- R11 → `switches to a year and sees the monthly average of each category` (e2e: columna `A month` y una media por línea)
- R13 → `reaches Expenses by category from the menu, sees the month and opens a category` (e2e: fecha, concepto e importe; la línea `Gone` sin botón)

### Documentos actualizados

Antes de borrar (T8), `grep -rn "monthly-cost\|MonthlyCost\|recurring-expenses" src e2e`
solo devolvía líneas de `src/features/monthly-cost/`, `e2e/monthly-cost.spec.ts`,
`src/router/index.ts` y `src/router/__tests__/router.spec.ts`.

Después lancé
`git grep -n -i "monthly cost\|monthly-cost\|MonthlyCost\|recurring-expenses\|ReceiptEuro\|useMonthlyCostStore\|getRecurringExpenses" -- . ':!progress' ':!specs' ':!feature_list.json'`.
Lo corregido:

- `docs/guia-de-uso.md`: la fila de la tabla de errores (ahora `Expenses by category`,
  `Something went wrong loading your spending.`); la lista del menú; la fila del mapa de la
  aplicación; la sección `## 2b. Monthly cost` entera, sustituida por
  `## 2b. Expenses by category` con 11 pasos de «Qué probar», «Lo que no hace o hace a
  medias» y el mismo aviso que la de la F32 (probada con datos inventados, sin abrir
  todavía contra los datos reales); las menciones de `It's mine` (tabla de `Transfers`),
  de la lista de pantallas que vuelven a pedir sus datos (`My accounts`) y de los gastos
  recurrentes al final.
- `docs/architecture.md`: el bloque `monthly-cost/` del árbol, sustituido por
  `expenses-by-category/`; el párrafo «Lo que cuesta un mes solo lee…», sustituido por
  «El gasto por categoría solo lee, y solo comprueba sumas (feature #37)»; en el párrafo
  de la F36, `Monthly cost` → `Expenses by category`. Ningún ADR menciona `Monthly cost`
  (lo comprobé con el mismo `git grep`): no hay línea «Revisado el …» que añadir.
- `docs/stack.md`: la línea de la F32 se queda como historia y se añade la de la F37
  (`ChartBar`; sale `ReceiptEuro`). `grep -rn "ReceiptEuro" src` no devuelve nada.

Lo que queda tras corregir: en `docs/guia-de-uso.md` y `docs/architecture.md`, solo
frases que dicen que `Monthly cost` se quitó en la feature 37 (T11); en `src/router/`, los
dos tests de R2 y los comentarios que dicen lo mismo; en `docs/stack.md`, la línea de la
F32 como historia.

**Referencias vivas fuera de mis archivos (no las he tocado):**

- `docs/roadmap.md:54` — «… el frontend los enseña en la pantalla `Monthly cost`, feature 32.»
- `docs/roadmap.md:379` — «(`GET /api/recurring-expenses`); frontend, feature 32 (pantalla `Monthly cost`).»
- `feature_list.json` — los `checks` de la F32 (los vacía el leader al cerrar, según el encargo).

`tasks.md` dice que `docs/roadmap.md` lo lleva el leader. No he mirado `../docs/` (nivel
workspace).

### Prueba real (si la feature lee datos de fuera)

Con el backend local en `:3000` (respondió `200` a
`GET /api/expenses-by-category?month=2026-10&compare=previous-month`), arranqué el
servidor de desarrollo y abrí la pantalla en Chromium con un script de Playwright fuera
del repo (en la carpeta temporal de la sesión), que abortaba cualquier petición a `/api`
que no fuera `GET`. Sin fijar la fecha (hoy, 2026-10-25). Solo recuentos:

| Paso | Dirección | Error | Frase | Líneas fijo / variable | Columna `A month` | Etiquetas `New`/`Gone` | Botones `Show movements` |
|---|---|---|---|---|---|---|---|
| Desde el menú | `/expenses-by-category` | no | sí | 5 / 8 | 0 | 4 | 9 |
| `Previous` | `?month=2026-09&compare=previous-month` | no | sí | 5 / 8 | 0 | 0 | 13 |
| `Year` | `?year=2026` | no | sí | 5 / 9 | 14 | 0 | 14 |
| `Previous` (año) | `?year=2025` | no | sí | 5 / 9 | 14 | 0 | 14 |

Al abrir la primera línea del mes en curso salió 1 movimiento. `/monthly-cost` terminó en
`/net-worth`. Peticiones que no eran `GET`: 0. Errores de página o de consola: 0. Los
recuentos de líneas cuadran con los que midió el Lote A pidiendo al backend directamente.
Límite de la prueba: tras cada clic esperé a que hubiera frase o error y 300 ms más; los
recuentos cambian entre pasos, así que cada fila es de la respuesta nueva, pero no esperé
a una señal explícita de carga terminada. No he comparado el total con el `Money out` de
`Overview` (es el 📌 del humano). Al acabar paré el servidor de desarrollo.

### Último ./init.sh

Comandos lanzados después del último cambio de código. Los comentarios de `src/router/`
se retocaron después (solo texto); tras ese retoque relancé `pnpm format:check`,
`pnpm lint:oxlint:check` y `pnpm exec vitest run src/router`: los tres con código 0,
`Tests 21 passed (21)`.

- `pnpm type-check` → `vue-tsc --build`, código 0, sin errores.
- `pnpm lint` → `oxlint . --fix`, código 0; `git status` después no muestra cambios fuera
  de mis archivos. `pnpm lint:oxlint:check` → código 0.
- `pnpm format:check` → la primera vez falló por `e2e/expenses-by-category.spec.ts`; lo
  pasé por `prettier --write` y después: `All matched files use Prettier code style!`,
  código 0.
- `pnpm test:unit` → `Test Files 126 passed (126)`, `Tests 2077 passed (2077)`, código 0
  (el Lote A tenía 131/2114: salen los 6 archivos de tests de `monthly-cost`, y los de
  router cambian).
- `pnpm build` → código 0 (`✓ built`). `pnpm build-only` → código 0.
- `pnpm test:e2e --project=chromium e2e/expenses-by-category.spec.ts` → `3 passed (3.9s)`,
  código 0. El servidor de desarrollo escribe por consola un aviso de `vue-router`
  (`[VUE_ROUTER_R0100] Discarded invalid param(s) "pathMatch" when navigating`) al llevar
  `/monthly-cost` a `Net Worth`. Es un aviso del servidor de desarrollo, no un error de la
  página (el test comprueba que no hay errores de consola en el navegador). No he
  comprobado si salía igual antes de esta feature con cualquier otra dirección que no
  existe.

`./init.sh` → código de salida 0. Últimas líneas:

```
 Test Files  126 passed (126)
      Tests  2077 passed (2077)
[OK]    Todos los tests pasan
── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 26 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[INFO]  Ejecutando: pnpm type-check
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)
── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Último ./init.sh --checks (si la feature tiene checks)

`./init.sh --checks 37` → código de salida 0. Líneas de resultado:

```
── Checks de la feature ───────────────────────────────
[OK]        exit 0      (checks 1 a 7, una línea cada uno)
[INFO]  [8] Textos en inglés, en oscuro, y pnpm type-check, lint, test:unit, build e ./init.sh en verde.
[INFO]      $ pnpm type-check && pnpm lint:oxlint:check && pnpm format:check && pnpm test:unit && pnpm build-only && ./init.sh
[OK]        exit 0
[OK]        exit 0      (checks 9 a 14, una línea cada uno)
[OK]    Checks: 14 de 14 en verde.
```

No he tocado ningún `checks` de `feature_list.json`.

### Sugerencias fuera de scope (NO aplicadas)

- Los `checks` de la F32 en `feature_list.json` nombran tests que esta feature borra:
  `./init.sh --checks 32` fallará hasta que el leader los vacíe (ya previsto en
  `progress/current.md`). No lo he lanzado.

## Cierre

2026-10-25, tras la aprobación del reviewer.

### `./init.sh` (exit 0), final de la salida

```
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

[OK]    Todos los tests pasan

── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 26 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[INFO]  Ejecutando: pnpm type-check
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### `./init.sh --checks 37` (exit 0), final de la salida

```

[INFO]  [14] (añadido) El código de Monthly cost se borra entero.
[INFO]      $ ! test -e src/features/monthly-cost && ! test -e e2e/monthly-cost.spec.ts
[OK]        exit 0

[OK]    Checks: 14 de 14 en verde.
```
