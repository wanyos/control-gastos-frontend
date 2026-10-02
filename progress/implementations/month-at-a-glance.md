# Implementación — Feature 25 `month-at-a-glance`

- **Fecha:** 2026-10-02
- **Spec:** `specs/25-month-at-a-glance/` (aprobado el 2026-10-02, con mediana en vez de media)
- **Estado en `feature_list.json`:** `in_progress` (no se marca `done`: falta el reviewer y la T19)
- **Tasks:** T0–T18 `[x]`. **T19 sin hacer a propósito**: es la comprobación con el humano
  delante y no es del implementer.
- **Commits:** ninguno.

## T0 — Comprobaciones previas

- **(a) Euros enteros desde el string.** `new Intl.NumberFormat('es-ES', { style: 'currency',
  currency: 'EUR', useGrouping: 'always', maximumFractionDigits: 0 }).format("4003.89")` da
  `4.004 €` (Node 24.18): `"161.82"` → `162 €`, `"0.00"` → `0 €`, `"1413.63"` → `1.414 €`,
  `"90071992547409.93"` → `90.071.992.547.410 €` (más allá de 2^53, así que no pasa por
  `number`). El espacio antes de `€` es U+00A0. Redondea la mitad hacia fuera del cero
  (`"0.50"` → `1 €`, `"2.50"` → `3 €`).
- **(b) Color de la barra.** Los ocho `chart-*` tienen ya su línea `contrast:` sobre
  `surface-sunken` en `theme-dark.css` (líneas 66–73). Se usa `bg-chart-4`. **No hizo falta
  ninguna línea `contrast:` nueva**: todos los pares de la pantalla ya estaban medidos.
- **(c) Icono.** `LayoutDashboard` sigue siendo el de la ruta `overview`; lo fija un test nuevo.

## De dónde salen las cifras de las fixtures

El spec pide que las fixtures sean los `totals` reales. No estaban guardadas en ningún archivo
del repo, así que las leí del backend local con **solo `GET /api/movements`** (33 peticiones
con `pageSize=1`, cero escrituras), imprimiendo únicamente `totals` y `pagination.total`:
ningún concepto, nombre ni cuenta real ha entrado en el repo. Esto fue una lectura manual
puntual; **ningún test ni e2e llama a `:3000`**.

Coinciden con lo que el spec cita: agosto de 2026 `2590.26 / 4003.89 / -1413.63` (70), los
dos centrales del gasto `2819.35` y `3115.81` → `2967.58`, entrada `2950.00`, último dato
`2026-09-11`, sin categoría de agosto `3036.33` (48).

## Archivos

### Nuevos

- `src/features/overview/types.ts`
- `src/features/overview/service.ts` — `getMonthFigures`, `getUncategorizedSpending`,
  `getLatestBookingDate`. Solo `getMovements`; ninguna acepta método ni cuerpo.
- `src/features/overview/reading.ts` — lo puro y todos los textos.
- `src/features/overview/store.ts` — `useOverviewStore`.
- `src/features/overview/views/OverviewView.vue`
- `src/features/overview/components/{MonthSentence,MonthFiguresGrid,UsualLine,UncategorizedLine}.vue`
- `src/features/overview/__tests__/{fixtures.ts,service.spec.ts,reading.spec.ts,store.spec.ts,components.spec.ts,OverviewView.spec.ts}`
- `e2e/overview.spec.ts`

### Modificados (previstos por el spec)

- `src/shared/money.ts` — se **añade** `formatMoneyWhole` y su formateador. Nada existente cambia.
- `src/shared/__tests__/money.spec.ts` — un `describe` nuevo al final; ningún test anterior tocado.
- `src/features/import/store.ts` — un import y una llamada en el `finally` de `start`:
  `void useOverviewStore().refreshIfLoaded(client)`.
- `src/features/import/__tests__/store.spec.ts` — tres tests nuevos (cargado → recarga, tras un
  200 y tras un 503; no cargado → nada) y una fixture local. Ningún test anterior tocado.
- `src/router/index.ts` — `/overview` monta `OverviewView`. Mismo `path`, `name`, etiqueta,
  icono y posición.
- `src/router/__tests__/router.spec.ts` — un test nuevo. Las listas exhaustivas no cambian.
- `docs/architecture.md`, `docs/stack.md`, `specs/25-month-at-a-glance/tasks.md`.

### Modificado y NO previsto por el spec

- **`src/shared/components/__tests__/AppShell.spec.ts`** (feature 8) — el test
  `renders the routed view inside the shell` usaba `/overview` como ejemplo de ruta con
  placeholder y buscaba `[data-test="placeholder"]` con el texto `Overview`. Con R1 esa ruta
  deja de ser un placeholder, así que el test fallaba. Cambio mínimo: ahora usa
  `/investments` (la única ruta que sigue siendo placeholder) y espera `Investments`. Sigue
  probando lo mismo —que la vista enrutada se pinta dentro del `main` del shell—. No está en
  la lista de C5 (`statement`, `net-worth`, `review`, `transfers`, `category-rules`), pero
  tampoco estaba previsto en `design.md` §2.

## Decisiones y desviaciones

1. **El enlace al extracto no lleva la clase de color en un hijo** (design §7 lo pedía).
   Esa utilidad (`text-ink-link`) es uno de los «contaminantes» que vigila
   `src/assets/__tests__/tailwind-sources.spec.ts`: el test exige que **no** aparezca en `src/`.
   Usarla obligaba a editar un test de la feature 5. No hace falta: `base.css` ya pinta todo
   `a` con `--ink-link`, que es justo el color que se quería, y el par
   `--ink-link on --surface-app` ya está medido. El enlace queda con el color de enlace sin
   ninguna utilidad de color.
2. **El borde del 25 % se decide sobre el porcentaje redondeado a una décima**, tal como
   dice design §5 (`|permille| <= 250`). Consecuencia: «un céntimo más es `more`» (T7) se
   cumple con medianas pequeñas (test: `25.00` vs `20.00` → `usual`; `25.01` → 25,05 % →
   `more`), pero con una mediana de 1.000 € hacen falta 50 céntimos para pasar de 25,0 % a
   25,1 %. La etiqueta siempre concuerda con el porcentaje que se lee al lado. Si se quiere
   el corte exacto en céntimos, es un cambio de una línea en `compareWithUsual`, pero
   contradice la fórmula del diseño: no lo he hecho.
3. **`N` = 0 dentro del tipo `Comparison`.** El tipo del diseño no admite una mediana nula,
   así que con cero meses de referencia `buildComparison` devuelve `months: 0` y las dos
   comparaciones sin porcentaje ni veredicto, y `MonthFiguresGrid` **no pinta** `UsualLine`
   (R10 pide `N` ≥ 1). La leyenda dice `No earlier months to compare with.`
4. **El gasto sin categoría se pide siempre que el mes no esté vacío** (design §6, literal),
   también si el gasto del mes es 0; en ese caso la línea no se pinta (R12).
5. **Salir de la pantalla no dispara lecturas.** El `watch` de `route.query` se ignora si la
   ruta ya no es la de la vista: sin eso, ir de `/overview?month=…` a otra pantalla pedía el
   mes en curso de camino. Hay test.
6. **Una respuesta que llega tarde se guarda solo si es de la misma visita.** Además del
   contador de carrera (C4), `reset()` cierra la «visita»: una respuesta que empezó antes de
   un `reset` (p. ej. antes de una importación) no entra en `figuresByMonth` (C3).
7. **`retryComparison` pide solo los meses que faltaban**; los que llegaron se conservan.
8. **Textos de carga y de error del núcleo**: `loadingMonthLine` del extracto y los tres de
   `overviewErrorMessage` del diseño. Mientras se lee lo de sin categoría no se pinta nada
   (el spec no da texto para ese estado y no he inventado uno).
9. **La vista lleva un `h1` `Overview` y una línea de descripción encima de la navegación**,
   como `StatementView`. La frase sigue siendo el primer contenido **bajo** la navegación y
   va antes que cualquier cifra (R4, con test de orden).

## Incoherencia del spec que conviene saber antes de la T19

`tasks.md` T19, paso 6, dice que febrero de 2024 «dice `1 previous month with data`». R11 y
`decisions.md` 🔴 4 fijan otro texto para `N` = 1:
`Your usual month is the only previous month with data.` He implementado el de R11. En la
comprobación con el humano se verá ese, no el de la T19.

## Sugerencias fuera de scope (no aplicadas)

- `StatementView` tiene el mismo `watch` de `route.query` sin guarda: al salir del extracto
  hacia otra pantalla pide el mes en curso una vez de más.
- `docs/stack.md` decía «los **ocho** specs de `e2e/`» cuando ya eran diez; lo he dejado en
  once al añadir el nuevo, pero la frase siguiente («el smoke… era el único que le faltaba»)
  es histórica.

## Trazabilidad

- **R1** → `router.spec.ts` › `mounts the month at a glance on /overview, not the placeholder (feature 25)`;
  `e2e/overview.spec.ts` (entra por la barra lateral).
- **R2** → `OverviewView.spec.ts` › `opens %s on the current month with no error` (sin `month`,
  `2026-13`, `nope`).
- **R3** → `OverviewView.spec.ts` › `an arrow pushes the new month, and back returns to the one before`,
  `the month picker jumps to any month through the URL too`; e2e (recarga y atrás).
- **R4** → `reading.spec.ts` › `monthSentence (R4)` (los ocho casos, literales);
  `OverviewView.spec.ts` › `reads the sentence first, right under the month nav and before any figure`.
- **R5** → `service.spec.ts` › `asks for the month exactly as the statement does, with no filters`;
  `components.spec.ts` › `formats the backend strings letter by letter…`, `does not recompute the savings…`;
  `OverviewView.spec.ts` › `paints the three figures of the backend to the cent, and the rate`;
  e2e paso (d) (mismas cifras en el extracto).
- **R6** → `reading.spec.ts` › `savingsRatePermille`; `components.spec.ts` ›
  `shows a positive rate with one decimal in a month of savings`.
- **R7** → `components.spec.ts` › `puts a dash and the reason when nothing came in`;
  `OverviewView.spec.ts` › `a complete month with no income has a dash for the rate, and says why`.
- **R8** → `reading.spec.ts` › `monthState (R8, R9)`; `service.spec.ts` ›
  `reads the date of the newest movement…`, `answers null when the base has no movements`;
  `store.spec.ts` › `an incomplete month asks for no previous month`;
  `OverviewView.spec.ts` › `an incomplete month shows its figures, a dash for the rate and no comparison`.
- **R9** → `store.spec.ts` › `an empty month reads only the core`;
  `OverviewView.spec.ts` › `an empty month is only its sentence`; e2e (segundo test).
- **R10** → `reading.spec.ts` › `medianAmount (R10, C2)`, `compareWithUsual and buildComparison (R10)`,
  `the texts of the comparison`; `components.spec.ts` › `stands the usual month under Money in and Money out only`,
  `UsualLine`; `OverviewView.spec.ts` › `says whether each figure was a usual one, against the median`.
- **R11** → `reading.spec.ts` › `says how many months it compared with, and that it is worked out here`;
  `OverviewView.spec.ts` › leyendas con 12, 5, 1 y 0 meses.
- **R12** → `service.spec.ts` › `asks for the uncategorized spending with the two scopes that match the count`;
  `reading.spec.ts` › `uncategorizedLine (R12)`; `components.spec.ts` › `UncategorizedLine`;
  `OverviewView.spec.ts` › `says how much of the spending has no category, with its bar`,
  `a month whose spending is zero has no uncategorized line`.
- **R13** → `reading.spec.ts` › `overviewErrorMessage (R13)`; `store.spec.ts` ›
  `a failed read of … is an error of the core, and retry repeats it`;
  `OverviewView.spec.ts` › `a failed month shows our own sentence and Try again…`,
  `never paints the message of the backend`.
- **R14** → `store.spec.ts` › `one failed previous month leaves the figures and no comparison at all`,
  `a failed uncategorized read leaves everything else ready`; `OverviewView.spec.ts` ›
  `a failed previous month keeps the month and says there is no comparison`,
  `a failed uncategorized read says so in its place, and the rest stays`.
- **R15** → `OverviewView.spec.ts` › `links to the statement of the same month, with no other filter`;
  e2e paso (d).
- **C1** → `service.spec.ts` y `store.spec.ts` › `only ever sends GET…`; `OverviewView.spec.ts` ›
  `a whole visit only ever sends GET to /api/movements`; e2e (`aborted` vacío y solo `GET`).
- **C2** → `reading.spec.ts` › `never goes through a float…`, `rounds half a cent once, away from zero`;
  `money.spec.ts` › `formatMoneyWhole (feature 25)`.
- **C3** → `store.spec.ts` › `one visit (C3)`; `OverviewView.spec.ts` › `entering the screen again reads again…`;
  `import/__tests__/store.spec.ts` › los tres tests de la feature 25.
- **C4** → `store.spec.ts` › `when the month changes before the answer, the old answer paints nothing`,
  `a late failure of the old month does not turn the new one into an error`.
- **C5** → `router.spec.ts` (listas intactas, `/` → `net-worth`).
- **C6** → `OverviewView.spec.ts` › `paints nothing below the block of the month`.
- **«average» en ningún texto** → `reading.spec.ts` › `the word the comparison was renamed away from`
  (los textos construidos y todos los `.ts` / `.vue` de la carpeta).

## Red: nada sale a `:3000`

- **Unitarios:** todos los specs nuevos montan `mockBackend` (espía de `fetch`), que **rechaza**
  cualquier cosa que no sea `GET /api/movements`. Los tests nuevos del store de `import` usan su
  `mockApi`, que rechaza lo no previsto. `AppShell.spec.ts` ya dejaba `fetch` pendiente para
  siempre, así que montar la vista real en `/overview` (test del botón Import) no sale a red.
- **E2E:** red de seguridad `**/api/**` que aborta y **apunta** lo abortado; la lista acaba
  vacía y todos los métodos de la sesión son `GET`.

## Verificación

`./init.sh` (2026-10-02), nueve pasos, salida 0:

```
── 4. Type checking (tsc)        [OK] Type check OK (tsc sin errores)
── 5. Lint (oxlint, sin --fix)   [OK] Lint OK (oxlint sin errores)
── 6. Formato (prettier --check) [OK] Formato OK (Prettier sin diferencias)
── 7. Ejecutando tests           Test Files 99 passed (99) · Tests 1575 passed (1575)
                                 [OK] Todos los tests pasan
── 8. E2E smoke (chromium)       [OK] E2E smoke verde (chromium)
── 9. Resumen                    [OK] Entorno listo. Puedes empezar a trabajar.
```

- `pnpm type-check` (vue-tsc): sin errores.
- `pnpm build`: `✓ built` — CSS 32,31 kB (7,37 gzip), JS 284,25 kB (87,80 gzip).
- Sin dependencias nuevas; el backend no se ha tocado; ninguna escritura.

## Lo que queda

- Reviewer.
- **T19** con el humano delante (solo lectura).
